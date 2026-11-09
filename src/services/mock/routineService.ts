import { can, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import {
  ROUTINE_STATUS_LABEL,
  type ChecklistAnswer,
  type ChecklistItem,
  type Id,
  type RoutineExecution,
  type RoutineExecutionStatus,
} from '@/domain';
import type { AnswerInput, ExecutionDetail, ExecutionListItem, PendingWorkItem, RoutineService, SyncResult } from '../contracts';
import { ServiceError, forbidden, notFound } from '../errors';
import { inLocationFilter, inScope, locationIndexOf, matchesQuery, paginate, simulateLatency, type ServiceRuntime } from '../internal';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';
import { createIntegrationOccurrence, recordReinspectionResult, reevaluateOccurrence } from './occurrenceService';

const MIN_TEXT = 5;
const FINAL: RoutineExecutionStatus[] = ['concluida', 'incompleta', 'interrompida', 'nao-realizada', 'finalizado-parcialmente'];

const validation = (message: string) => new ServiceError('VALIDATION', message);
const conflict = (message: string) => new ServiceError('CONFLICT', message);

/** Conformidade da resposta pelo critério EXISTENTE (inclusive o corte da Nota). */
function conformity(item: ChecklistItem, value: string): boolean | null {
  if (item.answerType === 'texto') return null;
  if (value === 'nao-se-aplica') return null;
  if (item.answerType === 'nota') return Number(value) > (item.ncThreshold ?? 5);
  return value === 'conforme';
}

/**
 * Gestão de Rotinas — produto existente preservado. A Linha GRS acrescenta a
 * sugestão de vínculo após a sincronização (D-005) e a reinspeção pedida por
 * Ocorrências (D-006, D-013, DP-15). A geração de ocorrência por não
 * conformidade e por rotina não executada é comportamento EXISTENTE.
 */
export function createRoutineService(rt: ServiceRuntime): RoutineService {
  const permissions = (ctx: AccessContext) => {
    const available = isModuleAvailable(ctx, 'rotinas');
    return { view: available, manage: available && can(ctx, 'rotinas.manage'), execute: available && can(ctx, 'rotinas.execute') };
  };

  const userName = (db: Readonly<DemoDatabase>, userId?: Id) => {
    if (!userId) return undefined;
    const user = db.users.find((u) => u.id === userId);
    return db.people.find((p) => p.id === user?.personId)?.name ?? 'Usuário';
  };

  const planVisible = (ctx: AccessContext, db: Readonly<DemoDatabase>, planId: Id) => {
    const plan = db.routinePlans.find((p) => p.id === planId);
    return Boolean(plan && inScope(ctx, plan.locationId));
  };

  /** Score = percentual de checklists conformes (por ponto × checklist respondido). */
  const score = (e: RoutineExecution): number | null => {
    const results: boolean[] = [];
    for (const p of e.points) {
      const byChecklist = new Map<Id, ChecklistAnswer[]>();
      for (const a of p.answers) byChecklist.set(a.checklistId, [...(byChecklist.get(a.checklistId) ?? []), a]);
      for (const answers of byChecklist.values()) results.push(answers.every((a) => a.conforming !== false));
    }
    return results.length ? Math.round((results.filter(Boolean).length / results.length) * 100) : null;
  };

  const item = (db: Readonly<DemoDatabase>, e: RoutineExecution): ExecutionListItem => ({
    execution: e,
    routine: db.routines.find((r) => r.id === e.routineId)!,
    plan: db.routinePlans.find((p) => p.id === e.planId)!,
    operatorName: userName(db, e.operatorUserId),
    score: score(e),
    pointsDone: e.points.filter((p) => p.status !== 'pendente').length,
    pointsTotal: e.points.length,
    isReinspection: Boolean(e.reinspectionRequestId),
  });

  const load = (ctx: AccessContext, id: Id) => {
    requireModule(ctx, 'rotinas');
    const db = rt.store.getSnapshot();
    const e = db.routineExecutions.find((x) => x.id === id);
    if (!e) throw notFound('Execução de rotina não encontrada.');
    if (!planVisible(ctx, db, e.planId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return { db, e };
  };

  const now = () => rt.now().getTime();

  /** Regras existentes de início (referência 1.14.4). */
  const startBlock = (db: Readonly<DemoDatabase>, ctx: AccessContext, e: RoutineExecution): string | undefined => {
    if (e.status !== 'pendente' && e.status !== 'futura') return e.status === 'em-execucao' ? undefined : `Rotina ${ROUTINE_STATUS_LABEL[e.status]}.`;
    if (new Date(e.windowStart).getTime() > now()) return 'Essa rotina ainda não pode ser executada.';
    if (e.windowEnd && new Date(e.windowEnd).getTime() < now()) return 'Não é possível iniciar uma rotina cujo horário final já passou.';
    if (db.routineExecutions.some((x) => x.id !== e.id && x.status === 'em-execucao' && x.operatorUserId === ctx.user.id)) return 'Não é possível iniciar uma rotina com outra rotina em execução.';
    return undefined;
  };

  const audit = (draft: DemoDatabase, ctx: AccessContext, action: string, e: RoutineExecution, summary: string) => {
    draft.auditLog.push({ id: rt.newId('aud'), at: rt.now().toISOString(), actorUserId: ctx.user.id, moduleId: 'rotinas', action, entityType: 'execucao-rotina', entityId: e.id, summary: `${e.code}: ${summary}` });
  };

  /**
   * Efeitos da finalização no "servidor" (após a sincronização, quando
   * offline): ocorrências por não conformidade (existente) + sugestão de
   * vínculo (D-005) + resultado da reinspeção na ocorrência original (D-006).
   */
  const applySyncEffects = (draft: DemoDatabase, e: RoutineExecution): { generated: string[]; suggestions: number } => {
    const generated: string[] = [];
    let suggestions = 0;
    const request = e.reinspectionRequestId ? draft.reinspectionRequests.find((r) => r.id === e.reinspectionRequestId) : undefined;
    const original = request ? draft.occurrences.find((o) => o.id === request.occurrenceId) : undefined;
    for (const p of e.points) {
      const point = draft.controlPoints.find((cp) => cp.id === p.pointId)!;
      for (const a of p.answers) {
        if (a.conforming !== false) continue;
        const checklist = draft.checklists.find((c) => c.id === a.checklistId)!;
        const it = checklist.items.find((i) => i.id === a.itemId)!;
        // Regra existente: só gera com tipo de ocorrência no item E local físico no ponto.
        if (!it.occurrenceTypeId || !point.locationId) continue;
        const before = draft.occurrences.length;
        const o = createIntegrationOccurrence(rt, draft, {
          typeId: it.occurrenceTypeId,
          locationId: point.locationId,
          assetId: point.assetId,
          description: `Não conformidade no item "${it.description}" (${point.name})${a.observation ? `: ${a.observation.replace(/[.\s]+$/, '')}` : ''}.`,
          origin: 'nao-conformidade',
          sourceExecutionId: e.id,
          historyText: `Gerada automaticamente por não conformidade de checklist na execução ${e.code} (integração existente com Gestão de Rotinas)${a.attachments.length ? `; ${a.attachments.length} evidência(s)` : ''}.`,
          extraCandidate: original ? { candidateId: original.id, reason: `Gerada por reinspeção da ocorrência ${original.code}` } : undefined,
        });
        if (draft.occurrences.length > before) {
          generated.push(o.code);
          e.generatedOccurrenceIds.push(o.id);
          suggestions += (o.linkSuggestions ?? []).length;
        }
      }
    }
    if (request && original) {
      const answers = e.points.flatMap((p) => p.answers);
      // D-013: OK = execução sem nenhuma resposta Não Conforme (critério existente).
      const executed = e.status === 'concluida' || e.status === 'finalizado-parcialmente' || e.status === 'incompleta';
      if (executed && e.status === 'concluida') {
        const result = answers.some((a) => a.conforming === false) ? 'nao-ok' : 'ok';
        request.status = 'executada';
        request.result = result;
        request.resultAt = rt.now().toISOString();
        recordReinspectionResult(rt, draft, request, {
          result,
          executionCode: e.code,
          executorName: userName(draft, e.operatorUserId) ?? 'operador',
          evidences: answers.reduce((n, a) => n + a.attachments.length, 0),
          newOccurrenceCode: generated[0],
        });
      } else {
        // Incompleta / Finalizado Parcialmente: sem resultado conclusivo (P-86).
        request.status = 'executada';
        request.resultAt = undefined;
        original.history.push({ at: rt.now().toISOString(), actorUserId: 'sistema', kind: 'automatico', text: `Reinspeção ${e.code} finalizada como ${ROUTINE_STATUS_LABEL[e.status]}: sem resultado conclusivo (não conta como resultado).` });
      }
    }
    return { generated, suggestions };
  };

  const mutateExecution = (ctx: AccessContext, id: Id, action: string, fn: (e: RoutineExecution, draft: DemoDatabase) => string) =>
    rt.store.mutate((draft) => {
      const e = draft.routineExecutions.find((x) => x.id === id)!;
      audit(draft, ctx, action, e, fn(e, draft));
    });

  const requireOperator = (ctx: AccessContext, e: RoutineExecution) => {
    if (!permissions(ctx).execute) throw forbidden('Seu perfil não executa rotinas.');
    if (e.status !== 'em-execucao') throw conflict('A rotina não está em execução.');
    if (e.operatorUserId !== ctx.user.id) throw forbidden('A rotina está em execução por outro usuário.');
  };

  return {
    permissions,

    async overview(ctx) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      const db = rt.store.getSnapshot();
      const list = db.routineExecutions.filter((e) => planVisible(ctx, db, e.planId));
      const dayAgo = now() - 86_400_000;
      const today = Object.fromEntries(Object.keys(ROUTINE_STATUS_LABEL).map((s) => [s, 0])) as Record<RoutineExecutionStatus, number>;
      for (const e of list.filter((x) => new Date(x.windowStart).getTime() >= dayAgo)) today[e.status] += 1;
      return {
        today,
        pendingReinspections: db.reinspectionRequests.filter((r) => r.status === 'pendente' && inScope(ctx, db.occurrences.find((o) => o.id === r.occurrenceId)?.locationId)).length,
        pendingSync: list.filter((e) => e.sync === 'pendente').length,
        recent: list
          .filter((e) => e.status !== 'futura')
          .sort((a, b) => b.windowStart.localeCompare(a.windowStart))
          .slice(0, 6)
          .map((e) => item(db, e)),
      };
    },

    async listExecutions(ctx, query) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      const db = rt.store.getSnapshot();
      const list = db.routineExecutions
        .filter((e) => planVisible(ctx, db, e.planId))
        .filter((e) => (query.status ? e.status === query.status : true))
        .filter((e) => {
          const r = db.routines.find((x) => x.id === e.routineId)!;
          if (query.scheduled === 'sim' && !r.scheduled) return false;
          if (query.scheduled === 'nao' && r.scheduled) return false;
          if (query.search?.trim()) return matchesQuery(query.search, e.code, r.name, db.routinePlans.find((p) => p.id === e.planId)?.name);
          return true;
        })
        .sort((a, b) => b.windowStart.localeCompare(a.windowStart))
        .map((e) => item(db, e));
      return paginate(list, query.page, query.pageSize ?? 10);
    },

    async getExecution(ctx, id) {
      await simulateLatency(rt);
      const { db, e } = load(ctx, id);
      const index = locationIndexOf(db);
      const request = e.reinspectionRequestId ? db.reinspectionRequests.find((r) => r.id === e.reinspectionRequestId) : undefined;
      const occurrence = request ? db.occurrences.find((o) => o.id === request.occurrenceId) : undefined;
      const block = startBlock(db, ctx, e);
      return {
        ...item(db, e),
        points: e.points.map((p) => {
          const point = db.controlPoints.find((cp) => cp.id === p.pointId)!;
          const checklistIds = request?.checklistId && point.id === request.pointId ? [request.checklistId] : point.checklistIds;
          return {
            point,
            status: p.status,
            validatedBy: p.validatedBy,
            validationJustification: p.validationJustification,
            cancelReason: p.cancelReason,
            finishedAt: p.finishedAt,
            checklists: checklistIds.map((cid) => ({ checklist: db.checklists.find((c) => c.id === cid)!, answers: p.answers.filter((a) => a.checklistId === cid) })),
            locationPath: point.locationId ? index.pathOf(point.locationId) : [],
            asset: point.assetId ? db.assets.find((a) => a.id === point.assetId) : undefined,
          };
        }),
        generatedOccurrences: isModuleAvailable(ctx, 'ocorrencias')
          ? e.generatedOccurrenceIds
              .map((oid) => db.occurrences.find((o) => o.id === oid))
              .filter((o): o is NonNullable<typeof o> => Boolean(o && inScope(ctx, o.locationId)))
              .map((o) => ({ id: o.id, code: o.code, typeName: db.occurrenceTypes.find((t) => t.id === o.typeId)?.name ?? '' }))
          : [],
        reinspectionOf: occurrence ? { occurrenceId: occurrence.id, code: occurrence.code } : undefined,
        startBlockedReason: block,
        canStart: permissions(ctx).execute && (e.status === 'pendente' || e.status === 'futura') && !block,
        canWork: permissions(ctx).execute && e.status === 'em-execucao' && e.operatorUserId === ctx.user.id,
      } satisfies ExecutionDetail;
    },

    async catalog(ctx) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      const db = rt.store.getSnapshot();
      const index = locationIndexOf(db);
      return db.routinePlans
        .filter((p) => inScope(ctx, p.locationId))
        .map((plan) => ({
          plan,
          locationPath: index.pathOf(plan.locationId),
          points: db.controlPoints
            .filter((cp) => cp.planId === plan.id)
            .map((cp) => ({
              ...cp,
              checklistNames: cp.checklistIds.map((cid) => db.checklists.find((c) => c.id === cid)?.name ?? ''),
              locationName: cp.locationId ? index.get(cp.locationId)?.name : undefined,
              assetTag: cp.assetId ? db.assets.find((a) => a.id === cp.assetId)?.tag : undefined,
            })),
          routines: db.routines.filter((r) => r.planId === plan.id),
          checklists: db.checklists.filter((c) => c.planIds.includes(plan.id)),
        }));
    },

    async reinspections(ctx) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      const db = rt.store.getSnapshot();
      return db.reinspectionRequests
        .map((r) => ({ r, o: db.occurrences.find((x) => x.id === r.occurrenceId) }))
        .filter(({ o }) => o && inScope(ctx, o.locationId))
        .sort((a, b) => b.r.requestedAt.localeCompare(a.r.requestedAt))
        .map(({ r, o }) => {
          const source = o!.sourceExecutionId ? db.routineExecutions.find((e) => e.id === o!.sourceExecutionId) : undefined;
          const fromSource = source ? source.points.filter((p) => p.answers.some((a) => a.conforming === false)).map((p) => p.pointId) : [];
          const byContext = db.controlPoints.filter((cp) => (o!.assetId && cp.assetId === o!.assetId) || cp.locationId === o!.locationId).map((cp) => cp.id);
          return {
            request: r,
            occurrence: { id: o!.id, code: o!.code, typeName: db.occurrenceTypes.find((t) => t.id === o!.typeId)?.name ?? '', status: o!.status, locationId: o!.locationId, assetId: o!.assetId },
            requestedByName: userName(db, r.requestedByUserId) ?? '—',
            suggestedPointIds: Array.from(new Set([...fromSource, ...byContext])),
            executionCode: r.executionId ? db.routineExecutions.find((e) => e.id === r.executionId)?.code : undefined,
          };
        });
    },

    async programReinspection(ctx, requestId, input) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      if (!permissions(ctx).manage) throw forbidden('A reinspeção é programada pelo gestor de Rotinas.');
      const db = rt.store.getSnapshot();
      const request = db.reinspectionRequests.find((r) => r.id === requestId);
      if (!request) throw notFound('Pedido de reinspeção não encontrado.');
      if (request.status !== 'pendente') throw conflict('O pedido já foi programado ou encerrado.');
      const point = db.controlPoints.find((cp) => cp.id === input.pointId);
      if (!point || !planVisible(ctx, db, point.planId)) throw validation('Selecione o ponto de controle.');
      if (!db.checklists.some((c) => c.id === input.checklistId && c.active)) throw validation('Selecione o checklist.');
      const occurrence = db.occurrences.find((o) => o.id === request.occurrenceId)!;
      let created!: RoutineExecution;
      rt.store.mutate((draft) => {
        const at = rt.now().toISOString();
        const routineId = rt.newId('rt');
        // D-013: rotina NÃO AGENDADA, de execução ÚNICA, programada pelo gestor.
        draft.routines.push({ id: routineId, planId: point.planId, name: `Reinspeção — ${occurrence.code}`, scheduled: false, maxExecutions: 1, active: true, reinspectionRequestId: request.id });
        draft.routineCounter += 1;
        created = {
          id: rt.newId('re'),
          code: `EX-${String(draft.routineCounter).padStart(4, '0')}`,
          routineId,
          planId: point.planId,
          windowStart: at,
          status: 'pendente',
          points: [{ pointId: point.id, status: 'pendente', answers: [] }],
          sync: 'sincronizado',
          generatedOccurrenceIds: [],
          reinspectionRequestId: request.id,
        };
        draft.routineExecutions.push(created);
        const r = draft.reinspectionRequests.find((x) => x.id === request.id)!;
        Object.assign(r, { status: 'programada', pointId: point.id, checklistId: input.checklistId, routineId, executionId: created.id, scheduledByUserId: ctx.user.id });
        const o = draft.occurrences.find((x) => x.id === occurrence.id)!;
        o.history.push({ at, actorUserId: 'sistema', kind: 'automatico', text: `Reinspeção programada pela Gestão de Rotinas (${created.code}, ponto ${point.name}).` });
        audit(draft, ctx, 'reinspecao.programar', created, `reinspeção de ${occurrence.code} programada`);
      });
      return created;
    },

    async markReinspectionNotRealized(ctx, requestId, reason) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      if (!permissions(ctx).manage) throw forbidden('Somente o gestor de Rotinas encerra o pedido.');
      const db = rt.store.getSnapshot();
      const request = db.reinspectionRequests.find((r) => r.id === requestId);
      if (!request || (request.status !== 'pendente' && request.status !== 'programada')) throw conflict('O pedido não está aguardando execução.');
      const execution = request.executionId ? db.routineExecutions.find((e) => e.id === request.executionId) : undefined;
      if (execution && execution.status !== 'pendente') throw conflict('A reinspeção já foi iniciada.');
      if ((reason ?? '').trim().length < MIN_TEXT) throw validation('Informe o motivo (mínimo de 5 caracteres).');
      rt.store.mutate((draft) => {
        const r = draft.reinspectionRequests.find((x) => x.id === requestId)!;
        r.status = 'nao-realizada';
        if (r.executionId) draft.routineExecutions.find((e) => e.id === r.executionId)!.status = 'nao-realizada';
        const o = draft.occurrences.find((x) => x.id === r.occurrenceId)!;
        o.history.push({ at: rt.now().toISOString(), actorUserId: 'sistema', kind: 'automatico', text: `Reinspeção não realizada: pedido encerrado sem resultado (não atende "exige reinspeção"; é possível solicitar outra). Motivo: ${reason.trim()}` });
        reevaluateOccurrence(rt, draft, o);
      });
    },

    async checkMissed(ctx) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      if (!permissions(ctx).manage) throw forbidden('Ferramenta do gestor de Rotinas.');
      const db = rt.store.getSnapshot();
      const due = db.routineExecutions.filter((e) => planVisible(ctx, db, e.planId) && e.status === 'pendente' && e.windowEnd && new Date(e.windowEnd).getTime() < now() && db.routines.find((r) => r.id === e.routineId)?.scheduled);
      const missed: string[] = [];
      const generated: string[] = [];
      if (!due.length) return { missed, generatedOccurrences: generated };
      rt.store.mutate((draft) => {
        for (const d of due) {
          const e = draft.routineExecutions.find((x) => x.id === d.id)!;
          e.status = 'nao-realizada';
          missed.push(e.code);
          const routine = draft.routines.find((r) => r.id === e.routineId)!;
          const plan = draft.routinePlans.find((p) => p.id === e.planId)!;
          // Existente: só agendadas, com tipo de ocorrência configurado na rotina.
          if (routine.missedOccurrenceTypeId) {
            const o = createIntegrationOccurrence(rt, draft, {
              typeId: routine.missedOccurrenceTypeId,
              locationId: plan.locationId,
              description: `Rotina "${routine.name}" (${plan.name}) não executada no horário previsto.`,
              origin: 'rotina-nao-executada',
              sourceExecutionId: e.id,
              historyText: `Gerada automaticamente: rotina agendada não executada (${e.code}) — verificação periódica existente, simulada.`,
            });
            e.generatedOccurrenceIds.push(o.id);
            generated.push(o.code);
          }
          audit(draft, ctx, 'rotina.nao-realizada', e, 'rotina não executada');
        }
      });
      return { missed, generatedOccurrences: generated };
    },

    appState(ctx) {
      const db = rt.store.getSnapshot();
      const synced = db.routineExecutions.filter((e) => e.operatorUserId === ctx.user.id && e.finishedAt && e.sync === 'sincronizado').map((e) => e.finishedAt!);
      return {
        offline: db.demoSettings.routinesAppOffline,
        pendingSync: db.routineExecutions.filter((e) => e.operatorUserId === ctx.user.id && e.sync === 'pendente').length,
        lastSyncAt: synced.sort().at(-1),
        plans: db.routinePlans.filter((p) => p.active && inScope(ctx, p.locationId)),
      };
    },

    async setOffline(ctx, offline) {
      requireModule(ctx, 'rotinas');
      rt.store.mutate((draft) => {
        draft.demoSettings.routinesAppOffline = offline;
      });
    },

    async appRoutines(ctx, planId) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      const db = rt.store.getSnapshot();
      if (!planVisible(ctx, db, planId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      const executions = db.routineExecutions.filter((e) => e.planId === planId);
      const isScheduled = (e: RoutineExecution) => db.routines.find((r) => r.id === e.routineId)?.scheduled;
      return {
        scheduled: executions
          .filter((e) => isScheduled(e) && ['pendente', 'em-execucao', 'futura'].includes(e.status))
          .sort((a, b) => a.windowStart.localeCompare(b.windowStart))
          .map((e) => item(db, e)),
        unscheduled: db.routines
          .filter((r) => r.planId === planId && !r.scheduled && r.active)
          .map((routine) => {
            const own = executions.filter((e) => e.routineId === routine.id);
            const open = own.find((e) => e.status === 'pendente' || e.status === 'em-execucao' || e.status === 'nao-realizada');
            return { routine, execution: open ? item(db, open) : undefined, executionsCount: own.length };
          })
          .filter((u) => u.execution || !u.routine.maxExecutions || u.executionsCount < u.routine.maxExecutions),
        history: executions
          .filter((e) => FINAL.includes(e.status) && e.finishedAt && now() - new Date(e.finishedAt).getTime() <= 86_400_000)
          .map((e) => item(db, e)),
      };
    },

    async startExecution(ctx, executionId) {
      await simulateLatency(rt);
      const { db, e } = load(ctx, executionId);
      if (!permissions(ctx).execute) throw forbidden('Seu perfil não executa rotinas.');
      const block = startBlock(db, ctx, e);
      if (block) throw conflict(block);
      mutateExecution(ctx, executionId, 'rotina.iniciar', (x) => {
        x.status = 'em-execucao';
        x.operatorUserId = ctx.user.id;
        x.startedAt = rt.now().toISOString();
        return 'rotina iniciada';
      });
    },

    async startUnscheduled(ctx, routineId) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      if (!permissions(ctx).execute) throw forbidden('Seu perfil não executa rotinas.');
      const db = rt.store.getSnapshot();
      const routine = db.routines.find((r) => r.id === routineId);
      if (!routine || routine.scheduled || !planVisible(ctx, db, routine.planId)) throw notFound('Rotina não encontrada.');
      const count = db.routineExecutions.filter((e) => e.routineId === routineId).length;
      if (routine.maxExecutions && count >= routine.maxExecutions) throw conflict('Limite de execuções da rotina atingido ("Termina após X execuções").');
      if (db.routineExecutions.some((x) => x.status === 'em-execucao' && x.operatorUserId === ctx.user.id)) throw conflict('Não é possível iniciar uma rotina com outra rotina em execução.');
      let created!: RoutineExecution;
      rt.store.mutate((draft) => {
        draft.routineCounter += 1;
        const at = rt.now().toISOString();
        created = {
          id: rt.newId('re'),
          code: `EX-${String(draft.routineCounter).padStart(4, '0')}`,
          routineId,
          planId: routine.planId,
          windowStart: at,
          status: 'em-execucao',
          operatorUserId: ctx.user.id,
          startedAt: at,
          points: draft.controlPoints.filter((cp) => cp.planId === routine.planId && cp.active).map((cp) => ({ pointId: cp.id, status: 'pendente' as const, answers: [] })),
          sync: 'sincronizado',
          generatedOccurrenceIds: [],
        };
        draft.routineExecutions.push(created);
        audit(draft, ctx, 'rotina.iniciar', created, 'rotina não agendada iniciada');
      });
      return created;
    },

    async validatePoint(ctx, executionId, pointId, method, justification) {
      await simulateLatency(rt);
      const { e } = load(ctx, executionId);
      requireOperator(ctx, e);
      const p = e.points.find((x) => x.pointId === pointId);
      if (!p || p.status !== 'pendente') throw conflict('Ponto já verificado ou cancelado.');
      if (method === 'justificativa' && (justification ?? '').trim().length === 0) throw validation('Informe a justificativa (não aceita vazio nem só espaços).');
      mutateExecution(ctx, executionId, 'ponto.validar', (x, draft) => {
        const point = x.points.find((y) => y.pointId === pointId)!;
        point.validatedBy = method;
        point.validationJustification = method === 'justificativa' ? justification!.trim() : undefined;
        const cp = draft.controlPoints.find((c) => c.id === pointId)!;
        // Ponto sem checklist é concluído na verificação.
        if (!cp.checklistIds.length && !(x.reinspectionRequestId && draft.reinspectionRequests.find((r) => r.id === x.reinspectionRequestId)?.pointId === pointId)) {
          point.status = 'concluido';
          point.finishedAt = rt.now().toISOString();
        }
        return `ponto ${cp.name} verificado (${method})`;
      });
    },

    async answerPoint(ctx, executionId, pointId, answers) {
      await simulateLatency(rt);
      const { db, e } = load(ctx, executionId);
      requireOperator(ctx, e);
      const p = e.points.find((x) => x.pointId === pointId);
      if (!p || p.status !== 'pendente') throw conflict('Ponto já concluído ou cancelado.');
      if (!p.validatedBy) throw conflict('Verifique o ponto (QR Code, geolocalização ou justificativa) antes do checklist.');
      const point = db.controlPoints.find((c) => c.id === pointId)!;
      const request = e.reinspectionRequestId ? db.reinspectionRequests.find((r) => r.id === e.reinspectionRequestId) : undefined;
      const checklistIds = request?.checklistId && request.pointId === pointId ? [request.checklistId] : point.checklistIds;
      const errors: string[] = [];
      const result: ChecklistAnswer[] = [];
      for (const cid of checklistIds) {
        const checklist = db.checklists.find((c) => c.id === cid)!;
        for (const it of checklist.items) {
          const a = answers.find((x) => x.checklistId === cid && x.itemId === it.id) as AnswerInput | undefined;
          if (!a || !a.value.trim()) {
            errors.push(`"${it.description}" está sem resposta.`);
            continue;
          }
          const conforming = conformity(it, a.value);
          const nc = conforming === false;
          if (it.observation === 'obrigatorio' || (it.observation === 'nao-conforme' && nc)) {
            if (!a.observation?.trim()) errors.push(`Observação obrigatória em "${it.description}".`);
          }
          if (it.attachment === 'obrigatorio' || (it.attachment === 'nao-conforme' && nc)) {
            if (!a.attachments.length) errors.push(`Anexo obrigatório em "${it.description}".`);
          }
          result.push({ checklistId: cid, itemId: it.id, value: a.value, conforming, observation: a.observation?.trim() || undefined, attachments: a.attachments });
        }
      }
      if (errors.length) throw validation(errors.join(' '));
      mutateExecution(ctx, executionId, 'ponto.checklist', (x) => {
        const target = x.points.find((y) => y.pointId === pointId)!;
        target.answers = result;
        target.status = 'concluido';
        target.finishedAt = rt.now().toISOString();
        const ncs = result.filter((r) => r.conforming === false).length;
        return `checklist do ponto ${point.name} concluído${ncs ? ` com ${ncs} não conformidade(s)` : ''}`;
      });
    },

    async cancelPoint(ctx, executionId, pointId, reason) {
      await simulateLatency(rt);
      const { e } = load(ctx, executionId);
      requireOperator(ctx, e);
      const p = e.points.find((x) => x.pointId === pointId);
      if (!p || p.status !== 'pendente') throw conflict('Ponto já concluído ou cancelado.');
      if (!reason.trim()) throw validation('Informe o motivo do cancelamento.');
      mutateExecution(ctx, executionId, 'ponto.cancelar', (x) => {
        const target = x.points.find((y) => y.pointId === pointId)!;
        target.status = 'cancelado';
        target.cancelReason = reason.trim();
        return `ponto cancelado: ${reason.trim()}`;
      });
    },

    async finishExecution(ctx, executionId, justification) {
      await simulateLatency(rt);
      const { db, e } = load(ctx, executionId);
      requireOperator(ctx, e);
      const pending = e.points.filter((p) => p.status === 'pendente').length;
      const cancelled = e.points.filter((p) => p.status === 'cancelado').length;
      if (pending && !(justification ?? '').trim()) throw validation('Há pontos não lidos: informe a justificativa para finalizar a rotina.');
      // Existente: todos concluídos → Concluída; com cancelados → Finalizado Parcialmente; sem ler todos (com justificativa) → Incompleta.
      const status: RoutineExecutionStatus = pending ? 'incompleta' : cancelled ? 'finalizado-parcialmente' : 'concluida';
      const offline = db.demoSettings.routinesAppOffline;
      rt.store.mutate((draft) => {
        const x = draft.routineExecutions.find((y) => y.id === executionId)!;
        x.status = status;
        x.finishedAt = rt.now().toISOString();
        x.finishJustification = justification?.trim() || undefined;
        x.sync = offline ? 'pendente' : 'sincronizado';
        if (!offline) applySyncEffects(draft, x);
        audit(draft, ctx, 'rotina.finalizar', x, `finalizada como ${ROUTINE_STATUS_LABEL[status]}${offline ? ' (offline, aguardando sincronização)' : ''}`);
      });
      return { status, synced: !offline };
    },

    async sync(ctx) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      const db = rt.store.getSnapshot();
      if (db.demoSettings.routinesAppOffline) throw conflict('Sem conexão: volte a ficar online para sincronizar.');
      const pendingIds = db.routineExecutions.filter((e) => e.sync === 'pendente' && e.operatorUserId === ctx.user.id).map((e) => e.id);
      const result: SyncResult = { synced: [], generatedOccurrences: [], suggestions: 0 };
      if (!pendingIds.length) return result;
      rt.store.mutate((draft) => {
        for (const id of pendingIds) {
          const x = draft.routineExecutions.find((y) => y.id === id)!;
          x.sync = 'sincronizado';
          const effects = applySyncEffects(draft, x);
          result.synced.push(x.code);
          result.generatedOccurrences.push(...effects.generated);
          result.suggestions += effects.suggestions;
          audit(draft, ctx, 'rotina.sincronizar', x, 'sincronizada');
        }
      });
      return result;
    },

    // ── Consultas para outros módulos (somente leitura) ───────────────

    async hubSummary(ctx, filter) {
      await simulateLatency(rt);
      requireModule(ctx, 'rotinas');
      const db = rt.store.getSnapshot();
      const planLocation = (planId: Id) => db.routinePlans.find((p) => p.id === planId)?.locationId;
      const inFilter = (locationId: Id | undefined) => inLocationFilter(db, locationId, filter.locationId);
      const dayAgo = now() - 86_400_000;
      const list = db.routineExecutions.filter((e) => planVisible(ctx, db, e.planId) && inFilter(planLocation(e.planId)));
      const missed = list.filter((e) => e.status === 'nao-realizada' && new Date(e.windowEnd ?? e.windowStart).getTime() >= dayAgo);
      const pending = list.filter((e) => e.status === 'pendente');
      const running = list.filter((e) => e.status === 'em-execucao');
      const windowEnd = (e: RoutineExecution) => new Date(e.windowEnd ?? e.windowStart).getTime();
      const reinspections = db.reinspectionRequests.filter((r) => {
        if (r.status !== 'pendente') return false;
        const o = db.occurrences.find((x) => x.id === r.occurrenceId);
        return Boolean(o && inScope(ctx, o.locationId) && inFilter(o.locationId));
      });
      const ordered = [...missed.sort((a, b) => windowEnd(b) - windowEnd(a)), ...pending.sort((a, b) => windowEnd(a) - windowEnd(b)), ...running];
      return {
        items: ordered.slice(0, filter.limit ?? 5).map((e) => item(db, e)),
        counts: { pendentes: pending.length, emExecucao: running.length, naoRealizadas24h: missed.length, reinspecoesAProgramar: reinspections.length },
      };
    },

    async pendingWork(ctx, filter) {
      await simulateLatency(rt);
      if (!permissions(ctx).manage) return [];
      const db = rt.store.getSnapshot();
      const index = locationIndexOf(db);
      const out: PendingWorkItem[] = [];
      for (const r of db.reinspectionRequests.filter((x) => x.status === 'pendente')) {
        const o = db.occurrences.find((x) => x.id === r.occurrenceId);
        if (!o || !inScope(ctx, o.locationId) || !inLocationFilter(db, o.locationId, filter.locationId)) continue;
        out.push({
          id: `rot-rei-${r.id}`,
          moduleId: 'rotinas',
          action: 'Programar reinspeção',
          title: `Reinspeção da ocorrência ${o.code}`,
          locationPath: index.pathOf(o.locationId),
          since: r.requestedAt,
          severity: 'media',
          target: { kind: 'routine-reinspections' },
        });
      }
      return out;
    },

    async assetTimeline(ctx, assetId) {
      await simulateLatency(rt);
      if (!isModuleAvailable(ctx, 'rotinas')) return [];
      const db = rt.store.getSnapshot();
      const pointIds = new Set(db.controlPoints.filter((cp) => cp.assetId === assetId).map((cp) => cp.id));
      if (!pointIds.size) return [];
      return db.routineExecutions
        .filter((e) => planVisible(ctx, db, e.planId) && e.status !== 'futura' && e.status !== 'pendente')
        .filter((e) => e.points.some((p) => pointIds.has(p.pointId)))
        .map((e) => {
          const routine = db.routines.find((r) => r.id === e.routineId);
          const point = e.points.find((p) => pointIds.has(p.pointId));
          const nonConforming = point?.answers.some((a) => a.conforming === false);
          return {
            id: `${e.id}-asset`,
            at: e.finishedAt ?? e.startedAt ?? e.windowStart,
            actorName: userName(db, e.operatorUserId) ?? 'Sistema',
            moduleId: 'rotinas' as const,
            action: 'execucao',
            summary: `${e.code} — ${routine?.name ?? 'Rotina'}: ${ROUTINE_STATUS_LABEL[e.status]}${nonConforming ? ' · não conformidade no ponto do ativo' : ''}`,
            target: { kind: 'routine-execution' as const, id: e.id },
          };
        });
    },
  };
}
