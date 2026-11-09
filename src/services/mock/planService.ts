import { can, hasCapability, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import {
  EFFECTIVENESS_LABEL,
  PLAN_STATUS_LABEL,
  type ActionPlan,
  type Id,
  type PlanAction,
  type PlanStatus,
  type Permission,
} from '@/domain';
import type { ActionIndicator, PendingWorkItem, PlanActionView, PlanCapabilities, PlanListItem, PlanService } from '../contracts';
import { ServiceError, forbidden, notContracted, notFound } from '../errors';
import { inScope, locationIndexOf, matchesQuery, paginate, simulateLatency, type ServiceRuntime } from '../internal';
import { OUT_OF_SCOPE_MESSAGE } from './guards';
import { reevaluateOccurrence, usersWithPermission } from './occurrenceService';

const MIN_TEXT = 5;
const FINAL_PLAN: PlanStatus[] = ['concluido', 'cancelado'];
const FINAL_ACTION: PlanAction['status'][] = ['concluida', 'cancelada'];

const validation = (message: string) => new ServiceError('VALIDATION', message);
const conflict = (message: string) => new ServiceError('CONFLICT', message);

function requireText(value: string | undefined, label: string): string {
  const text = (value ?? '').trim();
  if (text.length < MIN_TEXT) throw validation(`Informe ${label} (mínimo de ${MIN_TEXT} caracteres).`);
  return text;
}

const ROLE_PERMISSION: Record<'manage' | 'approve' | 'evaluate' | 'execute', Permission> = {
  manage: 'planos.manage',
  approve: 'planos.approve',
  evaluate: 'planos.evaluate',
  execute: 'planos.execute',
};

const fmt = (date: string) => date.split('-').reverse().join('/');

/**
 * Planos de Ação — capacidade compartilhada (D-011). Dona do plano, das ações,
 * do ciclo, das aprovações e da eficácia; os módulos criam, vinculam e
 * consultam. Nenhuma conclusão se propaga automaticamente: as ocorrências
 * vinculadas só têm a elegibilidade recalculada (DP-10a).
 */
export function createPlanService(rt: ServiceRuntime): PlanService {
  const contracted = (ctx: AccessContext) =>
    hasCapability(ctx.contract, 'ocorrencias-avancadas') || hasCapability(ctx.contract, 'rotinas') || hasCapability(ctx.contract, 'manutencao');

  const permissions = (ctx: AccessContext) => {
    const ok = contracted(ctx);
    return {
      contracted: ok,
      view: ok && can(ctx, 'planos.view'),
      manage: ok && can(ctx, 'planos.manage'),
      approve: ok && can(ctx, 'planos.approve'),
      evaluate: ok && can(ctx, 'planos.evaluate'),
      execute: ok && can(ctx, 'planos.execute'),
    };
  };

  const requireCapability = (ctx: AccessContext) => {
    if (!contracted(ctx)) throw notContracted('Planos de ação exigem Ocorrências Avançadas, Gestão de Rotinas ou Gestão de Manutenção contratada.');
    if (!can(ctx, 'planos.view')) throw forbidden('Seu perfil não acessa planos de ação.');
  };

  const userName = (db: Readonly<DemoDatabase>, userId: Id | 'sistema' | undefined): string => {
    if (!userId) return '—';
    if (userId === 'sistema') return 'Sistema';
    const user = db.users.find((u) => u.id === userId);
    return db.people.find((p) => p.id === user?.personId)?.name ?? 'Usuário';
  };

  const today = () => rt.now().toISOString().slice(0, 10);
  const isFinal = (p: ActionPlan) => FINAL_PLAN.includes(p.status);

  const flags = (p: ActionPlan): string[] => {
    const out: string[] = [];
    if (!isFinal(p) && p.dueDate < today()) out.push('Vencido');
    if (p.status === 'em-andamento' && p.actions.length > 0 && p.actions.every((a) => FINAL_ACTION.includes(a.status))) out.push('Todas as ações finalizadas');
    if (p.status === 'concluido' && p.effectiveness?.state === 'pendente' && p.evaluationDueDate && p.evaluationDueDate < today()) out.push('Avaliação atrasada');
    return out;
  };

  const item = (db: Readonly<DemoDatabase>, p: ActionPlan): PlanListItem => ({
    plan: p,
    locationPath: locationIndexOf(db).pathOf(p.locationId),
    responsibleName: userName(db, p.responsibleUserId),
    actionsDone: p.actions.filter((a) => a.status === 'concluida').length,
    actionsTotal: p.actions.filter((a) => a.status !== 'cancelada').length,
    flags: flags(p),
  });

  const load = (ctx: AccessContext, id: Id) => {
    requireCapability(ctx);
    const db = rt.store.getSnapshot();
    const plan = db.actionPlans.find((p) => p.id === id);
    if (!plan) throw notFound('Plano de ação não encontrado.');
    if (!inScope(ctx, plan.locationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return { db, plan };
  };

  const isResponsible = (ctx: AccessContext, p: ActionPlan) => can(ctx, 'planos.manage') && p.responsibleUserId === ctx.user.id;
  const requireResponsible = (ctx: AccessContext, p: ActionPlan) => {
    if (!isResponsible(ctx, p)) throw forbidden('Somente o responsável do plano realiza esta ação.');
  };

  /** Altera o plano, registra auditoria e reavalia as ocorrências vinculadas (DP-10a). */
  const mutate = (ctx: AccessContext, id: Id, action: string, fn: (p: ActionPlan, draft: DemoDatabase) => string | void) =>
    rt.store.mutate((draft) => {
      const p = draft.actionPlans.find((x) => x.id === id)!;
      const text = fn(p, draft);
      if (text) {
        p.history.push({ at: rt.now().toISOString(), actorUserId: ctx.user.id, text });
        draft.auditLog.push({ id: rt.newId('aud'), at: rt.now().toISOString(), actorUserId: ctx.user.id, moduleId: 'ocorrencias', action: `plano.${action}`, entityType: 'plano', entityId: p.id, summary: `${p.code}: ${text}` });
      }
      for (const link of p.links) {
        const o = draft.occurrences.find((x) => x.id === link.targetId);
        if (o) reevaluateOccurrence(rt, draft, o);
      }
    });

  const notify = (draft: DemoDatabase, p: ActionPlan, title: string, message: string, recipients: (Id | undefined)[], exclude: Id) => {
    const list = Array.from(new Set(recipients.filter((r): r is Id => Boolean(r) && r !== exclude)));
    if (!list.length) return;
    draft.notifications.push({
      id: rt.newId('n'),
      moduleId: 'ocorrencias',
      type: 'tarefa',
      severity: 'informativa',
      important: false,
      title,
      message,
      locationId: p.locationId,
      createdAt: rt.now().toISOString(),
      target: { kind: 'action-plan', id: p.id },
      readByUserIds: [],
      recipientUserIds: list,
    });
  };

  const hasRole = (db: Readonly<DemoDatabase>, userId: Id | undefined, role: keyof typeof ROLE_PERMISSION, locationId: Id) =>
    Boolean(userId) && usersWithPermission(db, ROLE_PERMISSION[role], locationId).includes(userId!);

  // ── Indicadores das ações ───────────────────────────────────────────

  const actionView = (ctx: AccessContext, db: Readonly<DemoDatabase>, p: ActionPlan, a: PlanAction): PlanActionView => {
    const indicators: ActionIndicator[] = [];
    const open = !FINAL_ACTION.includes(a.status);
    const deps = a.dependsOn.map((id) => p.actions.find((x) => x.id === id)).filter((x): x is PlanAction => Boolean(x));
    if (open && p.status === 'pausado') indicators.push({ kind: 'plano-pausado', label: 'Plano pausado' });
    if (open && deps.some((d) => d.status === 'cancelada')) indicators.push({ kind: 'dependencia-cancelada', label: 'Dependência cancelada — decisão necessária' });
    else if (open && deps.some((d) => d.status !== 'concluida')) indicators.push({ kind: 'bloqueada', label: 'Bloqueada por dependência' });
    if (open && a.dueDate < today()) indicators.push({ kind: 'atrasada', label: 'Atrasada' });

    let linkedRequest: PlanActionView['linkedRequest'];
    if (a.linkedRequestId) {
      const request = db.maintenanceRequests.find((r) => r.id === a.linkedRequestId);
      if (!request || !isModuleAvailable(ctx, 'manutencao') || !inScope(ctx, request.locationId)) linkedRequest = null;
      else {
        const order = request.workOrderId ? db.workOrders.find((o) => o.id === request.workOrderId) : undefined;
        linkedRequest = { id: request.id, code: request.code, status: request.status, workOrder: order ? { id: order.id, code: order.code, status: order.status } : undefined };
      }
      // DP-33 (D-011/D-012): indicadores próprios por desfecho; nunca concluem a ação.
      if (request && open) {
        const order = request.workOrderId ? db.workOrders.find((o) => o.id === request.workOrderId) : undefined;
        if (order?.status === 'encerrada') indicators.push({ kind: 'execucao-concluida', label: 'Execução vinculada concluída (OS encerrada)' });
        else if (order?.status === 'cancelada') indicators.push({ kind: 'os-cancelada', label: 'OS vinculada cancelada' });
        else if (request.status === 'rejeitada') indicators.push({ kind: 'solicitacao-rejeitada', label: 'Solicitação vinculada rejeitada' });
        else if (request.status === 'redirecionada') indicators.push({ kind: 'solicitacao-redirecionada', label: 'Solicitação vinculada redirecionada' });
        else if (request.status === 'resolvida-sem-os') indicators.push({ kind: 'solicitacao-resolvida-sem-os', label: 'Solicitação vinculada resolvida sem OS', provisional: true });
        else if (request.status === 'cancelada') indicators.push({ kind: 'solicitacao-cancelada', label: 'Solicitação vinculada cancelada', provisional: true });
        else if (request.status === 'duplicada') indicators.push({ kind: 'solicitacao-duplicada', label: 'Solicitação vinculada marcada como duplicada', provisional: true });
      }
    }

    const executor = can(ctx, 'planos.execute') && a.executorUserId === ctx.user.id;
    const responsible = isResponsible(ctx, p);
    const outcome = indicators.some((i) => i.kind.startsWith('execucao') || i.kind.startsWith('os-') || i.kind.startsWith('solicitacao-'));
    return {
      action: a,
      executorName: userName(db, a.executorUserId),
      dependsOn: deps.map((d) => ({ id: d.id, number: d.number, status: d.status })),
      indicators,
      linkedRequest,
      can: {
        start: executor && p.status === 'em-andamento' && a.status === 'pendente' && deps.every((d) => d.status === 'concluida'),
        conclude: executor && p.status === 'em-andamento' && a.status === 'em-execucao',
        cancel: responsible && (p.status === 'rascunho' || p.status === 'em-andamento') && open,
        reschedule: responsible && !isFinal(p) && open,
        resolveDependency: responsible && open && deps.some((d) => d.status === 'cancelada') && p.status !== 'pausado',
        linkRequest: (executor || responsible) && open && !a.linkedRequestId && isModuleAvailable(ctx, 'manutencao'),
        keepOpen: executor && open && outcome && !a.keptOpenReason,
      },
    };
  };

  const activationMissing = (p: ActionPlan): string[] => {
    const out: string[] = [];
    if (!p.dueDate) out.push('prazo global');
    if (!p.actions.some((a) => a.status !== 'cancelada')) out.push('ao menos uma ação com executor e prazo');
    return out;
  };

  const conclusionMissing = (p: ActionPlan): string[] => {
    const out: string[] = [];
    const open = p.actions.filter((a) => !FINAL_ACTION.includes(a.status));
    if (open.length) out.push(`${open.length} ação(ões) ainda não finalizada(s)`);
    if (!p.actions.some((a) => a.status === 'concluida')) out.push('ao menos uma ação concluída');
    if (!p.evaluatorUserId || !p.evaluationDueDate) out.push('avaliador e data prevista da avaliação de eficácia (obrigatórios na conclusão — D-013)');
    return out;
  };

  const capabilities = (ctx: AccessContext, p: ActionPlan): PlanCapabilities => {
    const responsible = isResponsible(ctx, p);
    const result = p.effectiveness?.result;
    return {
      edit: responsible && !isFinal(p),
      addAction: responsible && (p.status === 'rascunho' || p.status === 'em-andamento'),
      activate: responsible && p.status === 'rascunho',
      pause: responsible && p.status === 'em-andamento',
      resume: responsible && p.status === 'pausado',
      conclude: responsible && p.status === 'em-andamento',
      decideApproval: can(ctx, 'planos.approve') && p.status === 'aguardando-aprovacao' && p.approverUserId === ctx.user.id,
      cancel: responsible && !isFinal(p),
      reschedule: responsible && !isFinal(p),
      linkOccurrence: can(ctx, 'planos.manage') && can(ctx, 'ocorrencias.treat') && isModuleAvailable(ctx, 'ocorrencias') && p.status !== 'cancelado',
      evaluate: can(ctx, 'planos.evaluate') && p.status === 'concluido' && p.effectiveness?.state === 'pendente' && p.evaluatorUserId === ctx.user.id,
      decideEvaluation: can(ctx, 'planos.approve') && p.effectiveness?.state === 'aguardando-aprovacao' && p.evaluationApproverUserId === ctx.user.id,
      createRelated: can(ctx, 'planos.manage') && p.effectiveness?.state === 'avaliada' && (result === 'parcial' || result === 'ineficaz'),
    };
  };

  const findAction = (p: ActionPlan, actionId: Id) => {
    const a = p.actions.find((x) => x.id === actionId);
    if (!a) throw notFound('Ação não encontrada.');
    return a;
  };

  return {
    permissions,

    async list(ctx, query) {
      await simulateLatency(rt);
      requireCapability(ctx);
      const db = rt.store.getSnapshot();
      const list = db.actionPlans
        .filter((p) => inScope(ctx, p.locationId))
        .filter((p) => {
          if (query.status === 'ativos' && isFinal(p)) return false;
          if (query.status && query.status !== 'ativos' && p.status !== query.status) return false;
          if (query.mine && p.responsibleUserId !== ctx.user.id && !p.actions.some((a) => a.executorUserId === ctx.user.id)) return false;
          if (query.locationId && !locationIndexOf(db).isDescendantOrSelf(p.locationId, query.locationId)) return false;
          if (query.search?.trim() && !matchesQuery(query.search, p.code, p.title, p.objective)) return false;
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((p) => item(db, p));
      return paginate(list, query.page, query.pageSize ?? 10);
    },

    async get(ctx, id) {
      await simulateLatency(rt);
      const { db, plan: p } = load(ctx, id);
      const occurrencesVisible = isModuleAvailable(ctx, 'ocorrencias');
      return {
        ...item(db, p),
        actions: p.actions.map((a) => actionView(ctx, db, p, a)),
        links: p.links.map((l) => {
          const o = db.occurrences.find((x) => x.id === l.targetId);
          const visible = o && occurrencesVisible && inScope(ctx, o.locationId);
          return {
            occurrenceId: l.targetId,
            occurrence: visible ? { code: o.code, typeName: db.occurrenceTypes.find((t) => t.id === o.typeId)?.name ?? '', status: o.status } : null,
            referenceCode: o?.code ?? '—',
            linkedAt: l.linkedAt,
            linkedByName: userName(db, l.linkedByUserId),
            justification: l.justification,
          };
        }),
        history: [...p.history].reverse().map((h) => ({ at: h.at, actorName: userName(db, h.actorUserId), text: h.text })),
        relatedPlan: p.relatedPlanId ? (() => { const r = db.actionPlans.find((x) => x.id === p.relatedPlanId); return r ? { id: r.id, code: r.code } : undefined; })() : undefined,
        followUpPlans: db.actionPlans.filter((x) => x.relatedPlanId === p.id).map((x) => ({ id: x.id, code: x.code, status: x.status })),
        approverName: p.approverUserId ? userName(db, p.approverUserId) : undefined,
        evaluatorName: p.evaluatorUserId ? userName(db, p.evaluatorUserId) : undefined,
        evaluationApproverName: p.evaluationApproverUserId ? userName(db, p.evaluationApproverUserId) : undefined,
        originOccurrenceCode: p.origin.occurrenceId ? db.occurrences.find((o) => o.id === p.origin.occurrenceId)?.code : undefined,
        activationMissing: p.status === 'rascunho' ? activationMissing(p) : [],
        conclusionMissing: p.status === 'em-andamento' ? conclusionMissing(p) : [],
        can: capabilities(ctx, p),
      };
    },

    peopleOptions(ctx, locationId, role) {
      if (!permissions(ctx).view) return [];
      const db = rt.store.getSnapshot();
      return usersWithPermission(db, ROLE_PERMISSION[role], locationId)
        .filter((id) => db.users.find((u) => u.id === id)?.profileId !== 'admin-corporativo' || id === ctx.user.id)
        .map((userId) => ({ userId, name: userName(db, userId) }));
    },

    requestOptions(ctx) {
      if (!isModuleAvailable(ctx, 'manutencao')) return [];
      return rt.store
        .getSnapshot()
        .maintenanceRequests.filter((r) => inScope(ctx, r.locationId))
        .map((r) => ({ id: r.id, code: r.code, title: r.title }));
    },

    occurrenceOptions(ctx) {
      if (!isModuleAvailable(ctx, 'ocorrencias')) return [];
      const db = rt.store.getSnapshot();
      return db.occurrences
        .filter((o) => inScope(ctx, o.locationId))
        .map((o) => ({ id: o.id, code: o.code, typeName: db.occurrenceTypes.find((t) => t.id === o.typeId)?.name ?? '', status: o.status }));
    },

    async create(ctx, input) {
      await simulateLatency(rt);
      requireCapability(ctx);
      if (!can(ctx, 'planos.manage')) throw forbidden('Seu perfil não cria planos de ação.');
      const db = rt.store.getSnapshot();
      const errors: string[] = [];
      if (input.title.trim().length < MIN_TEXT) errors.push(`Informe o título (mínimo de ${MIN_TEXT} caracteres).`);
      if (input.objective.trim().length < MIN_TEXT) errors.push(`Descreva o objetivo (mínimo de ${MIN_TEXT} caracteres).`);
      if (!input.locationId || !inScope(ctx, input.locationId)) errors.push('Informe um local no seu escopo (o local define quem vê o plano).');
      if (!input.dueDate) errors.push('Informe o prazo global.');
      if (input.locationId && !hasRole(db, input.responsibleUserId, 'manage', input.locationId)) errors.push('Selecione um responsável com permissão de planos no local.');
      if (input.approvalMode === 'final' && (!input.approverUserId || !hasRole(db, input.approverUserId, 'approve', input.locationId))) errors.push('Selecione o aprovador do plano.');
      if (input.evaluatorUserId && !hasRole(db, input.evaluatorUserId, 'evaluate', input.locationId)) errors.push('Avaliador sem permissão de avaliar eficácia no local.');
      const occurrence = input.occurrenceId ? db.occurrences.find((o) => o.id === input.occurrenceId) : undefined;
      if (input.occurrenceId) {
        if (!occurrence || !inScope(ctx, occurrence.locationId)) errors.push('Ocorrência inválida.');
        else if (!can(ctx, 'ocorrencias.treat')) errors.push('Criar plano vinculado à ocorrência exige a permissão de tratar a ocorrência.');
        else if (occurrence.status === 'concluida' && (input.linkJustification ?? '').trim().length < MIN_TEXT) {
          errors.push('Ocorrência concluída: informe a justificativa do vínculo (DP-08).');
        }
      }
      const previous = input.relatedPlanId ? db.actionPlans.find((p) => p.id === input.relatedPlanId) : undefined;
      if (input.relatedPlanId) {
        const r = previous?.effectiveness?.result;
        if (!previous || previous.effectiveness?.state !== 'avaliada' || (r !== 'parcial' && r !== 'ineficaz')) {
          errors.push('Plano relacionado só pode ser criado a partir de plano com eficácia Parcial ou Ineficaz (DP-23).');
        }
      }
      if (errors.length) throw validation(errors.join(' '));
      let created!: ActionPlan;
      const now = rt.now().toISOString();
      rt.store.mutate((draft) => {
        draft.planCounter += 1;
        const code = `PA-${String(draft.planCounter).padStart(4, '0')}`;
        created = {
          id: rt.newId('pa'),
          code,
          title: input.title.trim(),
          objective: input.objective.trim(),
          origin: { module: occurrence ? 'ocorrencias' : 'direto', occurrenceId: occurrence?.id, byUserId: ctx.user.id, at: now },
          locationId: input.locationId,
          assetId: input.assetId || undefined,
          links: occurrence ? [{ kind: 'ocorrencia', targetId: occurrence.id, linkedAt: now, linkedByUserId: ctx.user.id, justification: input.linkJustification?.trim() || undefined }] : [],
          status: 'rascunho',
          responsibleUserId: input.responsibleUserId,
          dueDate: input.dueDate,
          approvalMode: input.approvalMode,
          approverUserId: input.approvalMode === 'final' ? input.approverUserId : undefined,
          evaluatorUserId: input.evaluatorUserId || undefined,
          evaluationDueDate: input.evaluationDueDate || undefined,
          evaluationApproverUserId: input.evaluationApproverUserId || undefined,
          relatedPlanId: previous?.id,
          actions: [],
          actionCounter: 0,
          pauses: [],
          createdAt: now,
          history: [
            {
              at: now,
              actorUserId: ctx.user.id,
              text: `Plano criado em Rascunho${occurrence ? ` a partir da ocorrência ${occurrence.code}` : ''}${previous ? ` como continuação do ${previous.code} (eficácia ${EFFECTIVENESS_LABEL[previous.effectiveness!.result!]})` : ''}.`,
            },
          ],
        };
        draft.actionPlans.push(created);
        if (occurrence) {
          const o = draft.occurrences.find((x) => x.id === occurrence.id)!;
          // Registro automático (DP-06); ocorrência concluída não é reaberta (DP-08).
          o.history.push({ at: now, actorUserId: 'sistema', kind: 'automatico', text: `Plano de ação ${code} vinculado${o.status === 'concluida' ? ' após a conclusão (sem reabertura)' : ''}.` });
          reevaluateOccurrence(rt, draft, o);
        }
        if (previous) {
          const prev = draft.actionPlans.find((x) => x.id === previous.id)!;
          prev.history.push({ at: now, actorUserId: ctx.user.id, text: `Plano relacionado ${code} criado a partir desta avaliação. Este plano permanece Concluído.` });
        }
        notify(draft, created, `Você é responsável pelo plano ${code}`, created.title, [created.responsibleUserId], ctx.user.id);
      });
      return created;
    },

    async addAction(ctx, planId, input) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (plan.status !== 'rascunho' && plan.status !== 'em-andamento') throw conflict(`Plano ${PLAN_STATUS_LABEL[plan.status]} não recebe novas ações.`);
      const description = requireText(input.description, 'a descrição da ação');
      if (!input.dueDate) throw validation('Informe o prazo da ação.');
      if (!hasRole(db, input.executorUserId, 'execute', plan.locationId)) throw validation('Selecione um executor com permissão no local do plano.');
      if (input.dependsOn.some((id) => !plan.actions.some((a) => a.id === id && a.status !== 'cancelada'))) throw validation('Dependência inválida.');
      mutate(ctx, planId, 'acao', (p, draft) => {
        p.actionCounter += 1;
        p.actions.push({ id: rt.newId('ac'), number: p.actionCounter, description, executorUserId: input.executorUserId, dueDate: input.dueDate, status: 'pendente', dependsOn: input.dependsOn, evidences: [] });
        if (p.status === 'em-andamento') notify(draft, p, `Nova ação no plano ${p.code}`, description, [input.executorUserId], ctx.user.id);
        return `Ação A${p.actionCounter} criada: ${description} (executor ${userName(draft, input.executorUserId)}, prazo ${fmt(input.dueDate)}${input.dependsOn.length ? `, depende de ${input.dependsOn.map((d) => `A${p.actions.find((a) => a.id === d)?.number}`).join(', ')}` : ''}).`;
      });
    },

    async activate(ctx, planId) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (plan.status !== 'rascunho') throw conflict('Só é possível ativar plano em Rascunho.');
      const missing = activationMissing(plan);
      if (missing.length) throw validation(`Para ativar, falta: ${missing.join('; ')}.`);
      mutate(ctx, planId, 'ativar', (p, draft) => {
        p.status = 'em-andamento';
        notify(draft, p, `Plano ${p.code} ativado`, 'Você tem ações atribuídas neste plano.', p.actions.map((a) => a.executorUserId), ctx.user.id);
        return 'Plano ativado: Em andamento.';
      });
    },

    async pause(ctx, planId, reason) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (plan.status !== 'em-andamento') throw conflict('Só é possível pausar plano Em andamento.');
      const text = requireText(reason, 'a justificativa da pausa');
      mutate(ctx, planId, 'pausar', (p) => {
        p.status = 'pausado';
        p.pauses.push({ startedAt: rt.now().toISOString(), reason: text, byUserId: ctx.user.id });
        return `Plano pausado (as ações mantêm seus status e não avançam). Justificativa: ${text}`;
      });
    },

    async resume(ctx, planId) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (plan.status !== 'pausado') throw conflict('O plano não está pausado.');
      mutate(ctx, planId, 'retomar', (p) => {
        p.status = 'em-andamento';
        const pause = p.pauses[p.pauses.length - 1];
        if (pause) pause.endedAt = rt.now().toISOString();
        return 'Plano retomado.';
      });
    },

    async conclude(ctx, planId) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (plan.status !== 'em-andamento') throw conflict('Só é possível concluir plano Em andamento.');
      const missing = conclusionMissing(plan);
      if (missing.length) throw validation(`Para concluir, falta: ${missing.join('; ')}.`);
      mutate(ctx, planId, plan.approvalMode === 'final' ? 'pedir-aprovacao' : 'concluir', (p, draft) => {
        if (p.approvalMode === 'final') {
          p.status = 'aguardando-aprovacao';
          notify(draft, p, `Aprovar conclusão do plano ${p.code}`, p.title, [p.approverUserId], ctx.user.id);
          return 'Conclusão enviada para aprovação final.';
        }
        p.status = 'concluido';
        p.concludedAt = rt.now().toISOString();
        p.effectiveness = { state: 'pendente' };
        notify(draft, p, `Avaliar eficácia do plano ${p.code}`, `Previsão: ${fmt(p.evaluationDueDate!)}.`, [p.evaluatorUserId], ctx.user.id);
        return 'Plano concluído. Eficácia pendente de avaliação.';
      });
    },

    async decideApproval(ctx, planId, approve, reason) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      if (!capabilities(ctx, plan).decideApproval) throw forbidden('Somente o aprovador do plano decide.');
      if (!approve) requireText(reason, 'o motivo da recusa');
      mutate(ctx, planId, approve ? 'aprovar' : 'recusar', (p, draft) => {
        if (approve) {
          p.status = 'concluido';
          p.concludedAt = rt.now().toISOString();
          p.effectiveness = { state: 'pendente' };
          notify(draft, p, `Plano ${p.code} aprovado e concluído`, 'Eficácia pendente de avaliação.', [p.responsibleUserId, p.evaluatorUserId], ctx.user.id);
          return `Conclusão aprovada${reason.trim() ? `: ${reason.trim()}` : ''}. Eficácia pendente de avaliação.`;
        }
        p.status = 'em-andamento';
        notify(draft, p, `Conclusão do plano ${p.code} recusada`, reason.trim(), [p.responsibleUserId], ctx.user.id);
        return `Conclusão recusada; plano volta a Em andamento. Motivo: ${reason.trim()}`;
      });
    },

    async cancel(ctx, planId, reason) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (isFinal(plan)) throw conflict('Plano já finalizado.');
      const text = requireText(reason, 'a justificativa do cancelamento');
      mutate(ctx, planId, 'cancelar', (p) => {
        const open = p.actions.filter((a) => !FINAL_ACTION.includes(a.status));
        for (const a of open) {
          a.status = 'cancelada';
          a.cancelReason = 'Plano cancelado.';
        }
        p.status = 'cancelado';
        p.cancelReason = text;
        return `Plano cancelado (${open.length} ação(ões) não finalizada(s) canceladas; concluídas preservadas). Justificativa: ${text}`;
      });
    },

    async reschedule(ctx, planId, dueDate, reason) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (isFinal(plan)) throw conflict('Plano já finalizado.');
      if (!dueDate || dueDate === plan.dueDate) throw validation('Informe um novo prazo.');
      const text = requireText(reason, 'o motivo da reprogramação');
      mutate(ctx, planId, 'reprogramar', (p) => {
        const old = p.dueDate;
        p.originalDueDate ??= old;
        p.dueDate = dueDate;
        return `Prazo global reprogramado: ${fmt(old)} → ${fmt(dueDate)}. Motivo: ${text}`;
      });
    },

    async setEvaluation(ctx, planId, input) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      requireResponsible(ctx, plan);
      if (isFinal(plan)) throw conflict('Plano já finalizado.');
      if (!hasRole(db, input.evaluatorUserId, 'evaluate', plan.locationId)) throw validation('Selecione um avaliador com permissão de avaliar eficácia no local.');
      if (!input.evaluationDueDate) throw validation('Informe a data prevista da avaliação.');
      if (input.evaluationApproverUserId && !hasRole(db, input.evaluationApproverUserId, 'approve', plan.locationId)) throw validation('Aprovador da avaliação sem permissão no local.');
      mutate(ctx, planId, 'avaliacao-config', (p, draft) => {
        p.evaluatorUserId = input.evaluatorUserId;
        p.evaluationDueDate = input.evaluationDueDate;
        p.evaluationApproverUserId = input.evaluationApproverUserId || undefined;
        return `Avaliação de eficácia definida: avaliador ${userName(draft, input.evaluatorUserId)}, previsão ${fmt(input.evaluationDueDate)}${input.evaluationApproverUserId ? `, aprovador ${userName(draft, input.evaluationApproverUserId)}` : ''}.`;
      });
    },

    async linkOccurrence(ctx, planId, occurrenceId, justification) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      if (!capabilities(ctx, plan).linkOccurrence) throw forbidden('Vincular exige a permissão de planos e a de tratar a ocorrência.');
      const o = db.occurrences.find((x) => x.id === occurrenceId);
      if (!o || !inScope(ctx, o.locationId)) throw validation('Ocorrência inválida.');
      if (plan.links.some((l) => l.targetId === occurrenceId)) throw conflict('A ocorrência já está vinculada a este plano.');
      if (o.status === 'concluida' && (justification ?? '').trim().length < MIN_TEXT) throw validation('Ocorrência concluída: informe a justificativa do vínculo (DP-08).');
      mutate(ctx, planId, 'vincular', (p, draft) => {
        const now = rt.now().toISOString();
        p.links.push({ kind: 'ocorrencia', targetId: o.id, linkedAt: now, linkedByUserId: ctx.user.id, justification: justification?.trim() || undefined });
        const occ = draft.occurrences.find((x) => x.id === o.id)!;
        occ.history.push({ at: now, actorUserId: 'sistema', kind: 'automatico', text: `Plano de ação ${p.code} vinculado${occ.status === 'concluida' ? ' após a conclusão (sem reabertura)' : ''}.` });
        return `Vinculado à ocorrência ${o.code}${justification?.trim() ? `. Justificativa: ${justification.trim()}` : ''}.`;
      });
    },

    async startAction(ctx, planId, actionId) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      const view = actionView(ctx, db, plan, findAction(plan, actionId));
      if (!view.can.start) {
        if (plan.status === 'pausado') throw conflict('Plano pausado: as ações não avançam até a retomada.');
        if (view.indicators.some((i) => i.kind === 'dependencia-cancelada' || i.kind === 'bloqueada')) throw conflict('Ação bloqueada: as dependências precisam estar concluídas.');
        throw forbidden('Somente o executor inicia a ação, com o plano Em andamento.');
      }
      mutate(ctx, planId, 'acao-iniciar', (p) => {
        const a = p.actions.find((x) => x.id === actionId)!;
        a.status = 'em-execucao';
        a.startedAt = rt.now().toISOString();
        return `Ação A${a.number} iniciada.`;
      });
    },

    async concludeAction(ctx, planId, actionId, input) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      const view = actionView(ctx, db, plan, findAction(plan, actionId));
      if (!view.can.conclude) throw plan.status === 'pausado' ? conflict('Plano pausado: as ações não avançam até a retomada.') : forbidden('Somente o executor conclui a ação em execução.');
      const notes = requireText(input.notes, 'o resultado da ação');
      mutate(ctx, planId, 'acao-concluir', (p, draft) => {
        const a = p.actions.find((x) => x.id === actionId)!;
        a.status = 'concluida';
        a.concludedAt = rt.now().toISOString();
        a.resultNotes = notes;
        a.evidences.push(...input.evidences);
        if (p.actions.every((x) => FINAL_ACTION.includes(x.status))) {
          notify(draft, p, `Todas as ações do plano ${p.code} finalizadas`, 'Avalie a conclusão do plano (não é automática).', [p.responsibleUserId], ctx.user.id);
        }
        return `Ação A${a.number} concluída${input.evidences.length ? ` com ${input.evidences.length} evidência(s)` : ''}. Concluir a ação não conclui o plano nem a ocorrência.`;
      });
    },

    async cancelAction(ctx, planId, actionId, reason) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      if (plan.status === 'pausado') throw conflict('Plano pausado: retome antes de cancelar ações (P-73).');
      if (!actionView(ctx, db, plan, findAction(plan, actionId)).can.cancel) throw forbidden('Somente o responsável do plano cancela ações não finalizadas.');
      const text = requireText(reason, 'a justificativa do cancelamento');
      mutate(ctx, planId, 'acao-cancelar', (p, draft) => {
        const a = p.actions.find((x) => x.id === actionId)!;
        a.status = 'cancelada';
        a.cancelReason = text;
        const dependents = p.actions.filter((x) => x.dependsOn.includes(a.id) && !FINAL_ACTION.includes(x.status));
        if (dependents.length) {
          notify(draft, p, `Dependência cancelada no plano ${p.code}`, `A${a.number} foi cancelada; ${dependents.map((d) => `A${d.number}`).join(', ')} aguarda(m) decisão.`, [p.responsibleUserId], ctx.user.id);
        }
        return `Ação A${a.number} cancelada. Justificativa: ${text}${dependents.length ? ` — ${dependents.map((d) => `A${d.number}`).join(', ')} fica(m) bloqueada(s) até decisão (DP-32).` : ''}`;
      });
    },

    async rescheduleAction(ctx, planId, actionId, dueDate, reason) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      const a0 = findAction(plan, actionId);
      if (!actionView(ctx, db, plan, a0).can.reschedule) throw forbidden('Somente o responsável reprograma ações não finalizadas.');
      if (!dueDate || dueDate === a0.dueDate) throw validation('Informe um novo prazo.');
      const text = requireText(reason, 'o motivo da reprogramação');
      mutate(ctx, planId, 'acao-reprogramar', (p) => {
        const a = p.actions.find((x) => x.id === actionId)!;
        const old = a.dueDate;
        a.originalDueDate ??= old;
        a.dueDate = dueDate;
        return `Prazo da ação A${a.number} reprogramado: ${fmt(old)} → ${fmt(dueDate)}. Motivo: ${text}`;
      });
    },

    async resolveDependency(ctx, planId, actionId, input) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      const a0 = findAction(plan, actionId);
      if (!actionView(ctx, db, plan, a0).can.resolveDependency) throw forbidden('Somente o responsável do plano decide sobre dependência cancelada.');
      const dep = plan.actions.find((x) => x.id === input.dependencyId);
      if (!dep || dep.status !== 'cancelada' || !a0.dependsOn.includes(dep.id)) throw validation('Selecione a dependência cancelada.');
      const text = requireText(input.justification, 'a justificativa');
      let replacement: PlanAction | undefined;
      if (input.mode === 'substituir') {
        replacement = plan.actions.find((x) => x.id === input.replacementId);
        if (!replacement || replacement.id === a0.id || replacement.status === 'cancelada' || a0.dependsOn.includes(replacement.id)) throw validation('Selecione uma ação substituta válida.');
        if (replacement.dependsOn.includes(a0.id)) throw validation('A substituição criaria dependência circular.');
      }
      mutate(ctx, planId, 'dependencia', (p) => {
        const a = p.actions.find((x) => x.id === actionId)!;
        a.dependsOn = a.dependsOn.filter((d) => d !== dep.id);
        if (replacement) a.dependsOn.push(replacement.id);
        return input.mode === 'remover'
          ? `Dependência de A${dep.number} (cancelada) removida da ação A${a.number}. Justificativa: ${text}`
          : `Dependência de A${dep.number} (cancelada) substituída por A${replacement!.number} na ação A${a.number}. Justificativa: ${text}`;
      });
    },

    async linkRequest(ctx, planId, actionId, requestId) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      if (!actionView(ctx, db, plan, findAction(plan, actionId)).can.linkRequest) throw forbidden('Somente executor ou responsável vinculam solicitação a ação aberta.');
      const request = db.maintenanceRequests.find((r) => r.id === requestId);
      if (!request || !inScope(ctx, request.locationId)) throw validation('Solicitação inválida.');
      mutate(ctx, planId, 'acao-solicitacao', (p) => {
        const a = p.actions.find((x) => x.id === actionId)!;
        a.linkedRequestId = request.id;
        return `Ação A${a.number} passa a referenciar a solicitação ${request.code}. O resultado da OS fica disponível na ação; encerrar a OS não conclui a ação (DP-33).`;
      });
    },

    async keepActionOpen(ctx, planId, actionId, reason) {
      await simulateLatency(rt);
      const { db, plan } = load(ctx, planId);
      if (!actionView(ctx, db, plan, findAction(plan, actionId)).can.keepOpen) throw forbidden('Somente o executor decide manter a ação aberta.');
      const text = requireText(reason, 'a justificativa');
      mutate(ctx, planId, 'acao-manter-aberta', (p) => {
        const a = p.actions.find((x) => x.id === actionId)!;
        a.keptOpenReason = text;
        return `Executor mantém a ação A${a.number} aberta após o desfecho da execução vinculada. Justificativa: ${text}`;
      });
    },

    async evaluate(ctx, planId, input) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      if (!capabilities(ctx, plan).evaluate) throw forbidden('Somente o avaliador definido avalia a eficácia de plano concluído.');
      const justification = input.result === 'eficaz' ? input.justification.trim() : requireText(input.justification, 'a justificativa (obrigatória para Parcial ou Ineficaz)');
      mutate(ctx, planId, 'avaliar', (p, draft) => {
        p.effectiveness = {
          state: p.evaluationApproverUserId ? 'aguardando-aprovacao' : 'avaliada',
          result: input.result,
          justification: justification || undefined,
          evaluatedByUserId: ctx.user.id,
          evaluatedAt: rt.now().toISOString(),
        };
        if (p.evaluationApproverUserId) notify(draft, p, `Aprovar avaliação de eficácia do plano ${p.code}`, EFFECTIVENESS_LABEL[input.result], [p.evaluationApproverUserId], ctx.user.id);
        else notify(draft, p, `Eficácia do plano ${p.code}: ${EFFECTIVENESS_LABEL[input.result]}`, justification, [p.responsibleUserId], ctx.user.id);
        return `Eficácia avaliada: ${EFFECTIVENESS_LABEL[input.result]}${justification ? `. ${justification}` : ''}${p.evaluationApproverUserId ? ' — aguardando aprovação da avaliação.' : '.'}`;
      });
    },

    async decideEvaluation(ctx, planId, approve, reason) {
      await simulateLatency(rt);
      const { plan } = load(ctx, planId);
      if (!capabilities(ctx, plan).decideEvaluation) throw forbidden('Somente o aprovador da avaliação decide.');
      if (!approve) requireText(reason, 'o motivo da recusa');
      mutate(ctx, planId, approve ? 'avaliacao-aprovar' : 'avaliacao-recusar', (p, draft) => {
        if (approve) {
          p.effectiveness!.state = 'avaliada';
          notify(draft, p, `Avaliação do plano ${p.code} aprovada`, EFFECTIVENESS_LABEL[p.effectiveness!.result!], [p.responsibleUserId, p.evaluatorUserId], ctx.user.id);
          return `Avaliação de eficácia aprovada (${EFFECTIVENESS_LABEL[p.effectiveness!.result!]}).`;
        }
        p.effectiveness = { state: 'pendente' };
        notify(draft, p, `Avaliação do plano ${p.code} recusada`, reason.trim(), [p.evaluatorUserId], ctx.user.id);
        return `Avaliação recusada; volta para o avaliador. Motivo: ${reason.trim()}`;
      });
    },

    // ── Consulta para outros módulos (somente leitura) ────────────────

    async pendingWork(ctx, filter) {
      await simulateLatency(rt);
      if (!permissions(ctx).view) return [];
      const db = rt.store.getSnapshot();
      const index = locationIndexOf(db);
      const out: PendingWorkItem[] = [];
      const lastAt = (p: ActionPlan) => p.history[p.history.length - 1]?.at ?? p.createdAt;
      for (const p of db.actionPlans.filter((x) => inScope(ctx, x.locationId) && (!filter.locationId || index.isDescendantOrSelf(x.locationId, filter.locationId)))) {
        const can = capabilities(ctx, p);
        const planFlags = flags(p);
        const base = { moduleId: 'ocorrencias' as const, title: `${p.code} — ${p.title}`, locationPath: index.pathOf(p.locationId), target: { kind: 'action-plan' as const, id: p.id } };
        if (can.decideApproval) out.push({ ...base, id: `pa-apr-${p.id}`, action: 'Aprovar conclusão do plano', since: lastAt(p), severity: 'media' });
        if (can.evaluate) {
          const late = planFlags.includes('Avaliação atrasada');
          out.push({ ...base, id: `pa-ava-${p.id}`, action: late ? 'Avaliar eficácia (atrasada)' : 'Avaliar eficácia', since: lastAt(p), severity: late ? 'alta' : 'media' });
        }
        if (can.decideEvaluation) out.push({ ...base, id: `pa-dav-${p.id}`, action: 'Decidir avaliação de eficácia', since: lastAt(p), severity: 'media' });
        if (can.conclude && planFlags.includes('Todas as ações finalizadas')) out.push({ ...base, id: `pa-con-${p.id}`, action: 'Concluir plano (ações finalizadas)', since: lastAt(p), severity: 'baixa' });
        for (const a of p.actions) {
          const view = actionView(ctx, db, p, a);
          const late = view.indicators.some((i) => i.kind === 'atrasada');
          if (view.can.resolveDependency) out.push({ ...base, id: `pa-dep-${a.id}`, action: `Decidir dependência cancelada (ação ${a.number})`, since: lastAt(p), severity: 'alta' });
          if (view.can.start || view.can.conclude) {
            out.push({ ...base, id: `pa-exe-${a.id}`, title: `${p.code} · ação ${a.number} — ${a.description}`, action: late ? 'Executar ação (atrasada)' : 'Executar ação', since: a.dueDate, severity: late ? 'alta' : 'media' });
          }
        }
      }
      return out;
    },
  };
}
