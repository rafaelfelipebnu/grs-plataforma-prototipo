import { PROFILES, can, isModuleAvailable, resolveVisibleLocations, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import {
  OCCURRENCE_ORIGIN_LABEL,
  OCCURRENCE_PRIORITIES,
  OCCURRENCE_PRIORITY_LABEL,
  type Id,
  type Occurrence,
  type OccurrenceHistoryEntry,
  type OccurrencePriority,
  type OccurrenceType,
  type Permission,
  type ActionPlan,
} from '@/domain';
import type {
  ConclusionCheck,
  ConclusionInput,
  OccurrenceActions,
  OccurrenceBatchResult,
  OccurrenceListItem,
  OccurrencePanelColumn,
  OccurrenceQuery,
  OccurrenceService,
} from '../contracts';
import { ServiceError, forbidden, notFound } from '../errors';
import { canSeeEvent, inLocationFilter, inScope, locationIndexOf, matchesQuery, paginate, simulateLatency, type ServiceRuntime } from '../internal';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';

const MIN_TEXT = 5;
const DAY_MS = 86_400_000;
const PRIORITY_RANK: Record<OccurrencePriority, number> = { critica: 0, alta: 1, media: 2, baixa: 3, planejada: 4 };

const validation = (message: string) => new ServiceError('VALIDATION', message);
const conflict = (message: string) => new ServiceError('CONFLICT', message);

function requireText(value: string | undefined, label: string): string {
  const text = (value ?? '').trim();
  if (text.length < MIN_TEXT) throw validation(`Informe ${label} (mínimo de ${MIN_TEXT} caracteres).`);
  return text;
}

const hasTypeConditions = (t: OccurrenceType) =>
  t.conclusion.requireEvidence || t.conclusion.requireJustification || t.conclusion.criterion !== 'manual' || t.conclusion.requirePlan !== 'nao-exige';
const hasAttachment = (o: Occurrence) => o.proceedings.some((p) => p.attachments.length > 0);

/** Planos vinculados à ocorrência (qualquer origem, inclusive vinculados depois — DP-10a). */
export function linkedPlans(db: Readonly<DemoDatabase>, occurrenceId: Id): ActionPlan[] {
  return db.actionPlans.filter((p) => p.links.some((l) => l.kind === 'ocorrencia' && l.targetId === occurrenceId));
}

const STARTED: ActionPlan['status'][] = ['em-andamento', 'aguardando-aprovacao', 'pausado', 'concluido'];

/**
 * Exigência de plano (DP-10, D-010; DP-10a, D-013):
 * - "exige plano iniciado": ≥ 1 plano Em andamento, Aguardando aprovação, Pausado ou Concluído;
 * - "exige plano concluído": ≥ 1 plano e todos os não cancelados Concluídos (Rascunho bloqueia);
 * - plano Cancelado nunca satisfaz; eficácia não é condição.
 */
export function planRequirementMet(t: OccurrenceType, plans: ActionPlan[]): { met: boolean; detail: string } | null {
  const mode = t.conclusion.requirePlan;
  if (mode === 'nao-exige') return null;
  const active = plans.filter((p) => p.status !== 'cancelado');
  if (mode === 'exige-iniciado') {
    const met = plans.some((p) => STARTED.includes(p.status));
    return { met, detail: met ? 'há plano iniciado' : plans.length ? 'nenhum plano iniciado (Rascunho e Cancelado não contam)' : 'nenhum plano vinculado' };
  }
  const pending = active.filter((p) => p.status !== 'concluido');
  const met = active.length > 0 && pending.length === 0;
  return {
    met,
    detail: met ? 'todos os planos não cancelados concluídos' : active.length === 0 ? 'nenhum plano não cancelado vinculado' : `${pending.length} plano(s) ainda não concluído(s), inclusive em Rascunho`,
  };
}

/**
 * Regra de conclusão = regra atual do produto + condições configuradas no tipo
 * (DP-04). A regra fica na camada de serviço para valer igualmente no
 * detalhe e em lote (DP-04a).
 */
export function conclusionCheck(o: Occurrence, t: OccurrenceType, plans: ActionPlan[] = []): ConclusionCheck {
  const conditions: ConclusionCheck['conditions'] = [
    { label: 'Ao menos um trâmite registrado', origin: 'regra-atual', state: o.proceedings.length > 0 ? 'atendida' : 'pendente' },
    { label: 'Não estar em pausa (retome antes de concluir)', origin: 'regra-atual', state: o.status === 'em-pausa' ? 'pendente' : 'atendida' },
  ];
  if (t.conclusion.requireEvidence) {
    conditions.push({ label: 'Evidência anexada (em trâmite ou na conclusão)', origin: 'tipo', state: hasAttachment(o) ? 'atendida' : 'na-conclusao' });
  }
  if (t.conclusion.requireJustification) conditions.push({ label: 'Justificativa de conclusão', origin: 'tipo', state: 'na-conclusao' });
  const plan = planRequirementMet(t, plans);
  if (plan) {
    const label = t.conclusion.requirePlan === 'exige-iniciado' ? 'Plano de ação iniciado' : 'Planos de ação concluídos';
    conditions.push({ label: `${label} (${plan.detail})`, origin: 'tipo', state: plan.met ? 'atendida' : 'pendente' });
  }
  if (t.conclusion.criterion === 'aprovacao') {
    conditions.push({ label: o.approvalRequest ? 'Aprovação da conclusão (pedido aguardando decisão)' : 'Aprovação da conclusão', origin: 'tipo', state: 'pendente' });
  }
  return {
    conditions,
    baseMet: o.status === 'em-andamento' && o.proceedings.length > 0,
    typeMet: (!t.conclusion.requireEvidence || hasAttachment(o)) && (!plan || plan.met),
    requiresApproval: t.conclusion.criterion === 'aprovacao',
  };
}

/** Usuários de demonstração com a permissão e o local no escopo. */
export function usersWithPermission(db: Readonly<DemoDatabase>, permission: Permission, locationId: Id): Id[] {
  const index = locationIndexOf(db);
  return db.users
    .filter((u) => PROFILES[u.profileId].permissions.includes(permission))
    .filter((u) => {
      const visible = resolveVisibleLocations(u.scope, index);
      return visible === 'all' || visible.has(locationId);
    })
    .map((u) => u.id);
}

/**
 * Reavalia a elegibilidade de conclusão (D-013, ressalva da DP-10a: recalcular
 * e comunicar quando mudar). Passagem para elegível → N3 no sino de quem pode
 * concluir (uma vez por destinatário e por ciclo). Perda da elegibilidade →
 * registro automático no histórico. Ocorrência concluída não é alterada.
 */
export function reevaluateOccurrence(rt: ServiceRuntime, draft: DemoDatabase, o: Occurrence): void {
  if (o.status === 'concluida') return;
  const t = draft.occurrenceTypes.find((x) => x.id === o.typeId)!;
  const check = conclusionCheck(o, t, linkedPlans(draft, o.id));
  const eligible = hasTypeConditions(t) && check.baseMet && check.typeMet;
  const at = rt.now().toISOString();
  if (eligible && !o.eligible) {
    o.history.push({ at, actorUserId: 'sistema', kind: 'automatico', text: 'Passou a atender às condições verificáveis de conclusão do tipo (N3 enviada).' });
    const recipients = usersWithPermission(draft, 'ocorrencias.conclude', o.locationId);
    if (recipients.length) {
      draft.notifications.push({
        id: rt.newId('n'),
        moduleId: 'ocorrencias',
        type: 'tarefa',
        severity: 'informativa',
        important: false,
        title: `${o.code} pode ser concluída`,
        message: `${t.name}: atende às condições configuradas${check.requiresApproval ? ' — a conclusão depende de aprovação' : ''}. A conclusão continua sendo um ato humano.`,
        locationId: o.locationId,
        createdAt: at,
        target: { kind: 'occurrence', id: o.id },
        readByUserIds: [],
        recipientUserIds: recipients,
      });
    }
  } else if (!eligible && o.eligible && o.status === 'em-andamento') {
    const pending = check.conditions.filter((c) => c.origin === 'tipo' && c.state === 'pendente').map((c) => c.label);
    o.history.push({ at, actorUserId: 'sistema', kind: 'automatico', text: `Deixou de atender às condições de conclusão${pending.length ? `: ${pending.join('; ')}` : ''}.` });
  }
  o.eligible = eligible;
}

/** Gestão de Ocorrências — produto existente preservado + ciclo aprovado (D-009, D-010, D-013). */
export function createOccurrenceService(rt: ServiceRuntime): OccurrenceService {
  const permissions = (ctx: AccessContext) => {
    const available = isModuleAvailable(ctx, 'ocorrencias');
    return {
      register: available && can(ctx, 'ocorrencias.register'),
      treat: available && can(ctx, 'ocorrencias.treat'),
      conclude: available && can(ctx, 'ocorrencias.conclude'),
      exception: available && can(ctx, 'ocorrencias.exception'),
      configure: available && can(ctx, 'ocorrencias.configure'),
    };
  };

  const userName = (db: Readonly<DemoDatabase>, userId: Id | 'sistema' | undefined): string => {
    if (!userId) return '—';
    if (userId === 'sistema') return 'Sistema';
    const user = db.users.find((u) => u.id === userId);
    return db.people.find((p) => p.id === user?.personId)?.name ?? 'Usuário';
  };

  const usersWith = usersWithPermission;

  const typeOf = (db: Readonly<DemoDatabase>, o: Occurrence) => db.occurrenceTypes.find((t) => t.id === o.typeId)!;

  const item = (db: Readonly<DemoDatabase>, o: Occurrence): OccurrenceListItem => ({
    occurrence: o,
    type: typeOf(db, o),
    asset: o.assetId ? db.assets.find((a) => a.id === o.assetId) : undefined,
    locationPath: locationIndexOf(db).pathOf(o.locationId),
    registeredByName: userName(db, o.registeredByUserId),
    awaitingApproval: Boolean(o.approvalRequest),
  });

  const visible = (ctx: AccessContext, db: Readonly<DemoDatabase>) => db.occurrences.filter((o) => inScope(ctx, o.locationId));
  const byPriorityThenRecent = (a: Occurrence, b: Occurrence) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt.localeCompare(a.createdAt);
  const byRecent = (a: Occurrence, b: Occurrence) => b.createdAt.localeCompare(a.createdAt);
  const concludedRecently = (o: Occurrence) => o.status === 'concluida' && !!o.conclusion && rt.now().getTime() - new Date(o.conclusion.at).getTime() <= DAY_MS;

  const matches = (db: Readonly<DemoDatabase>, o: Occurrence, q: OccurrenceQuery) => {
    if (q.status === 'abertas' && o.status === 'concluida') return false;
    if (q.status && q.status !== 'abertas' && o.status !== q.status) return false;
    if (q.priority && o.priority !== q.priority) return false;
    if (q.typeId && o.typeId !== q.typeId) return false;
    if (q.origin && o.origin !== q.origin) return false;
    if (q.locationId && (q.includeDescendants === false ? o.locationId !== q.locationId : !inLocationFilter(db, o.locationId, q.locationId))) return false;
    if (q.search?.trim()) {
      const asset = o.assetId ? db.assets.find((a) => a.id === o.assetId) : undefined;
      if (!matchesQuery(q.search, o.code, o.description, typeOf(db, o).name, asset?.tag, asset?.name)) return false;
    }
    return true;
  };

  const load = (ctx: AccessContext, id: Id) => {
    requireModule(ctx, 'ocorrencias');
    const db = rt.store.getSnapshot();
    const occurrence = db.occurrences.find((o) => o.id === id);
    if (!occurrence) throw notFound('Ocorrência não encontrada.');
    if (!inScope(ctx, occurrence.locationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return { db, occurrence, type: typeOf(db, occurrence) };
  };

  const requirePerm = (ctx: AccessContext, key: 'register' | 'treat' | 'conclude' | 'exception', message: string) => {
    if (!permissions(ctx)[key]) throw forbidden(message);
  };

  const entry = (actor: Id | 'sistema', kind: OccurrenceHistoryEntry['kind'], text: string): OccurrenceHistoryEntry => ({ at: rt.now().toISOString(), actorUserId: actor, kind, text });

  const audit = (draft: DemoDatabase, ctx: AccessContext, action: string, o: Occurrence, summary: string) => {
    draft.auditLog.push({ id: rt.newId('aud'), at: rt.now().toISOString(), actorUserId: ctx.user.id, moduleId: 'ocorrencias', action, entityType: 'ocorrencia', entityId: o.id, summary: `${o.code}: ${summary}` });
  };

  const notify = (draft: DemoDatabase, o: Occurrence, input: { title: string; message: string; recipients: Id[]; exclude?: Id }) => {
    const recipients = Array.from(new Set(input.recipients.filter((id) => id !== input.exclude)));
    if (!recipients.length) return;
    draft.notifications.push({
      id: rt.newId('n'),
      moduleId: 'ocorrencias',
      type: 'tarefa',
      severity: 'informativa',
      important: false,
      title: input.title,
      message: input.message,
      locationId: o.locationId,
      createdAt: rt.now().toISOString(),
      target: { kind: 'occurrence', id: o.id },
      readByUserIds: [],
      recipientUserIds: recipients,
    });
  };

  const reevaluate = (draft: DemoDatabase, o: Occurrence) => reevaluateOccurrence(rt, draft, o);

  /** Altera a ocorrência e reavalia a elegibilidade (N3). */
  const mutate = (id: Id, fn: (o: Occurrence, draft: DemoDatabase) => void) =>
    rt.store.mutate((draft) => {
      const o = draft.occurrences.find((x) => x.id === id)!;
      fn(o, draft);
      reevaluate(draft, o);
    });

  const addHumanProceeding = (o: Occurrence, ctx: AccessContext, text: string, attachments: string[]) => {
    const now = rt.now().toISOString();
    o.proceedings.push({ id: rt.newId('tr'), at: now, byUserId: ctx.user.id, text, attachments });
    if (o.status === 'sem-tratamento') {
      o.status = 'em-andamento';
      o.firstProceedingAt = now;
      o.history.push(entry(ctx.user.id, 'acao', 'Primeiro trâmite registrado: ocorrência Em andamento (tempo de resposta encerrado).'));
    }
  };

  const checkOf = (db: Readonly<DemoDatabase>, o: Occurrence, t: OccurrenceType) => conclusionCheck(o, t, linkedPlans(db, o.id));

  const actionsFor = (db: Readonly<DemoDatabase>, ctx: AccessContext, o: Occurrence, t: OccurrenceType): OccurrenceActions => {
    const perm = permissions(ctx);
    const check = checkOf(db, o, t);
    const requester = o.approvalRequest?.byUserId;
    return {
      proceed: perm.treat && o.status !== 'concluida',
      changePriority: perm.treat && (o.status === 'sem-tratamento' || o.status === 'em-andamento'),
      pause: perm.treat && o.status === 'em-andamento',
      resume: perm.treat && o.status === 'em-pausa',
      conclude: perm.conclude && check.baseMet && !check.requiresApproval,
      requestApproval: perm.conclude && check.baseMet && check.requiresApproval && !o.approvalRequest,
      decideApproval: perm.conclude && Boolean(o.approvalRequest) && requester !== ctx.user.id,
      decideApprovalBlockedReason:
        perm.conclude && o.approvalRequest && requester === ctx.user.id ? 'Você pediu a aprovação: outra pessoa com permissão de concluir decide (P-61).' : undefined,
      concludeWithException: perm.exception && check.baseMet && hasTypeConditions(t),
      openMaintenanceRequest: isModuleAvailable(ctx, 'manutencao') && can(ctx, 'manutencao.request') && o.status !== 'concluida',
    };
  };

  /** Valida a conclusão; devolve o motivo de impedimento ou null. */
  const blockReason = (db: Readonly<DemoDatabase>, o: Occurrence, t: OccurrenceType, input: ConclusionInput | null): string | null => {
    if (o.status === 'concluida') return 'já concluída';
    if (o.status === 'em-pausa') return 'em pausa: retome antes de concluir (DP-04a)';
    if (o.status === 'sem-tratamento' || o.proceedings.length === 0) return 'sem trâmite registrado';
    const plan = planRequirementMet(t, linkedPlans(db, o.id));
    if (plan && !plan.met) return `o tipo ${t.conclusion.requirePlan === 'exige-iniciado' ? 'exige plano de ação iniciado' : 'exige planos de ação concluídos'}: ${plan.detail}`;
    if (t.conclusion.criterion === 'aprovacao') return 'o tipo exige aprovação da conclusão';
    if (t.conclusion.requireJustification && (!input || (input.justification ?? '').trim().length < MIN_TEXT)) {
      return input ? `informe a justificativa de conclusão (mínimo de ${MIN_TEXT} caracteres)` : 'o tipo exige justificativa: conclua individualmente';
    }
    if (t.conclusion.requireEvidence && !hasAttachment(o) && !(input && input.evidenceNames.length)) {
      return input ? 'o tipo exige evidência: anexe ao menos uma' : 'o tipo exige evidência: anexe em um trâmite';
    }
    return null;
  };

  const finishConclusion = (o: Occurrence, ctx: AccessContext, input: ConclusionInput, extra?: Partial<NonNullable<Occurrence['conclusion']>>) => {
    o.status = 'concluida';
    o.conclusion = {
      at: rt.now().toISOString(),
      byUserId: ctx.user.id,
      justification: input.justification?.trim() || undefined,
      evidenceNames: input.evidenceNames,
      ...extra,
    };
    o.approvalRequest = undefined;
  };

  const pausedMs = (o: Occurrence) => {
    const end = o.conclusion?.at ?? rt.now().toISOString();
    return o.pauses.reduce((sum, p) => sum + Math.max(0, new Date(p.endedAt ?? end).getTime() - new Date(p.startedAt).getTime()), 0);
  };

  return {
    permissions,

    types(ctx) {
      if (!isModuleAvailable(ctx, 'ocorrencias')) return [];
      return rt.store.getSnapshot().occurrenceTypes;
    },

    async panel(ctx, filter) {
      await simulateLatency(rt);
      requireModule(ctx, 'ocorrencias');
      const db = rt.store.getSnapshot();
      const list = visible(ctx, db).filter((o) => matches(db, o, filter));
      const pending = list.filter((o) => o.status !== 'concluida').sort(byRecent);
      const pendingByPriority = Object.fromEntries(OCCURRENCE_PRIORITIES.map((p) => [p, pending.filter((o) => o.priority === p).map((o) => item(db, o))])) as Record<
        OccurrencePriority,
        OccurrenceListItem[]
      >;
      const col = (fn: (o: Occurrence) => boolean) => list.filter(fn).sort(byPriorityThenRecent).slice(0, 100).map((o) => item(db, o));
      return {
        pendingByPriority,
        byStatus: {
          'sem-tratamento': col((o) => o.status === 'sem-tratamento'),
          'em-andamento': col((o) => o.status === 'em-andamento'),
          'em-pausa': col((o) => o.status === 'em-pausa'),
          'concluidas-24h': col(concludedRecently),
        },
      };
    },

    async list(ctx, query) {
      await simulateLatency(rt);
      requireModule(ctx, 'ocorrencias');
      const db = rt.store.getSnapshot();
      const list = visible(ctx, db).filter((o) => matches(db, o, query)).sort(byRecent).map((o) => item(db, o));
      return paginate(list, query.page, query.pageSize ?? 10);
    },

    async get(ctx, id) {
      await simulateLatency(rt);
      const { db, occurrence: o, type: t } = load(ctx, id);
      const sourceEvent = o.sourceEventId ? db.events.find((e) => e.id === o.sourceEventId) : undefined;
      const requests = db.maintenanceRequests.filter((r) => r.occurrenceId === o.id);
      const canSeeRequests = isModuleAvailable(ctx, 'manutencao');
      const linked = canSeeRequests ? requests.filter((r) => inScope(ctx, r.locationId)) : [];
      const paused = pausedMs(o);
      const created = new Date(o.createdAt).getTime();
      return {
        ...item(db, o),
        proceedings: [...o.proceedings].reverse().map((p) => ({ proceeding: p, authorName: userName(db, p.byUserId) })),
        history: [...o.history].reverse().map((h) => ({ at: h.at, actorName: userName(db, h.actorUserId), kind: h.kind, text: h.text })),
        check: checkOf(db, o, t),
        linkedPlans: linkedPlans(db, o.id).map((p) => ({ id: p.id, code: p.code, title: p.title, status: p.status })),
        actions: actionsFor(db, ctx, o, t),
        involvedPeople: o.involvedPersonIds.map((pid) => db.people.find((p) => p.id === pid)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
        sourceEvent: sourceEvent && canSeeEvent(ctx, sourceEvent) ? sourceEvent : undefined,
        linkedRequests: linked.map((r) => ({ id: r.id, code: r.code, title: r.title, status: r.status })),
        hiddenLinkedRequests: requests.length - linked.length,
        times: {
          responseMs: o.firstProceedingAt ? new Date(o.firstProceedingAt).getTime() - created : undefined,
          solutionMs: o.conclusion ? new Date(o.conclusion.at).getTime() - created - paused : undefined,
          pausedMs: paused,
        },
        approvalRequestedByName: o.approvalRequest ? userName(db, o.approvalRequest.byUserId) : undefined,
        conclusionByName: o.conclusion ? userName(db, o.conclusion.byUserId) : undefined,
        approvedByName: o.conclusion?.approvedByUserId ? userName(db, o.conclusion.approvedByUserId) : undefined,
        exceptionAuthorizedByName: o.conclusion?.exception ? userName(db, o.conclusion.exception.authorizedByUserId) : undefined,
      };
    },

    async register(ctx, input) {
      await simulateLatency(rt);
      requireModule(ctx, 'ocorrencias');
      requirePerm(ctx, 'register', 'Seu perfil não registra ocorrências.');
      const db = rt.store.getSnapshot();
      const errors: string[] = [];
      const type = db.occurrenceTypes.find((t) => t.id === input.typeId);
      if (!type) errors.push('Selecione o tipo de ocorrência.');
      if (!input.locationId) errors.push('Selecione o local físico.');
      else if (!inScope(ctx, input.locationId)) errors.push('O local está fora do seu escopo.');
      if (input.description.trim().length < MIN_TEXT) errors.push(`Descreva a ocorrência (mínimo de ${MIN_TEXT} caracteres).`);
      const occurredAt = new Date(input.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) errors.push('Informe a data e o horário da ocorrência.');
      else if (occurredAt.getTime() > rt.now().getTime() + 60_000) errors.push('A data da ocorrência não pode estar no futuro.');
      if (input.assetId) {
        const asset = db.assets.find((a) => a.id === input.assetId);
        if (!asset || !inScope(ctx, asset.primaryLocationId)) errors.push('Ativo inválido ou fora do seu escopo.');
      }
      const event = input.sourceEventId ? db.events.find((e) => e.id === input.sourceEventId) : undefined;
      if (input.sourceEventId && (!event || !canSeeEvent(ctx, event))) errors.push('Evento de origem inválido.');
      if (errors.length) throw validation(errors.join(' '));
      let created!: Occurrence;
      rt.store.mutate((draft) => {
        draft.occurrenceCounter += 1;
        const now = rt.now().toISOString();
        const origin = event ? 'evento' : 'usuario';
        const suggested = type!.defaultPriority !== input.priority ? ` (prioridade padrão do tipo: ${OCCURRENCE_PRIORITY_LABEL[type!.defaultPriority]})` : '';
        created = {
          id: rt.newId('oc'),
          code: `OC-${String(draft.occurrenceCounter).padStart(4, '0')}`,
          typeId: type!.id,
          locationId: input.locationId,
          assetId: input.assetId || undefined,
          description: input.description.trim(),
          occurredAt: occurredAt.toISOString(),
          createdAt: now,
          priority: input.priority,
          origin,
          sourceEventId: event?.id,
          registeredByUserId: ctx.user.id,
          involvedPersonIds: input.involvedPersonIds,
          status: 'sem-tratamento',
          proceedings: [],
          pauses: [],
          eligible: false,
          history: [
            {
              at: now,
              actorUserId: ctx.user.id,
              kind: 'acao',
              text: `Ocorrência registrada — ${OCCURRENCE_ORIGIN_LABEL[origin]}${event ? ` ${event.code}` : ''}. Prioridade ${OCCURRENCE_PRIORITY_LABEL[input.priority]}${suggested}.`,
            },
            ...(type!.monitored ? [{ at: now, actorUserId: 'sistema' as const, kind: 'automatico' as const, text: 'Tipo monitorado: exibida em "Ocorrências em aberto" no Monitoramento (notificação existente, simulada).' }] : []),
          ],
        };
        draft.occurrences.push(created);
        audit(draft, ctx, 'ocorrencia.registrar', created, `registrada (${type!.name})`);
      });
      return created;
    },

    async addProceeding(ctx, id, input) {
      await simulateLatency(rt);
      const { occurrence } = load(ctx, id);
      requirePerm(ctx, 'treat', 'Seu perfil não trata ocorrências.');
      if (occurrence.status === 'concluida') throw conflict('Ocorrência concluída não recebe trâmites.');
      const text = requireText(input.text, 'a descrição do trâmite');
      mutate(id, (o, draft) => {
        addHumanProceeding(o, ctx, text, input.attachments);
        audit(draft, ctx, 'ocorrencia.tramite', o, 'trâmite registrado');
      });
    },

    async addProceedingBatch(ctx, ids, text) {
      await simulateLatency(rt);
      requireModule(ctx, 'ocorrencias');
      requirePerm(ctx, 'treat', 'Seu perfil não trata ocorrências.');
      const description = requireText(text, 'a descrição do trâmite');
      const result: OccurrenceBatchResult = { done: [], kept: [] };
      const db = rt.store.getSnapshot();
      for (const id of ids) {
        const o = db.occurrences.find((x) => x.id === id);
        if (!o || !inScope(ctx, o.locationId)) continue;
        if (o.status === 'concluida') {
          result.kept.push({ id, code: o.code, reason: 'já concluída' });
          continue;
        }
        mutate(id, (draft, d) => {
          addHumanProceeding(draft, ctx, description, []);
          audit(d, ctx, 'ocorrencia.tramite-lote', draft, 'trâmite em lote');
        });
        result.done.push({ id, code: o.code });
      }
      return result;
    },

    async changePriority(ctx, id, priority) {
      await simulateLatency(rt);
      const { occurrence } = load(ctx, id);
      requirePerm(ctx, 'treat', 'Seu perfil não trata ocorrências.');
      if (occurrence.status === 'em-pausa') throw conflict('Em pausa a prioridade não pode ser alterada: retome antes (DP-03).');
      if (occurrence.status === 'concluida') throw conflict('Ocorrência concluída.');
      if (occurrence.priority === priority) throw validation('Selecione uma prioridade diferente da atual.');
      mutate(id, (o, draft) => {
        o.history.push(entry(ctx.user.id, 'acao', `Prioridade alterada: ${OCCURRENCE_PRIORITY_LABEL[o.priority]} → ${OCCURRENCE_PRIORITY_LABEL[priority]}.`));
        o.priority = priority;
        audit(draft, ctx, 'ocorrencia.prioridade', o, 'prioridade alterada');
      });
    },

    async pause(ctx, id, reason) {
      await simulateLatency(rt);
      const { occurrence } = load(ctx, id);
      requirePerm(ctx, 'treat', 'Seu perfil não trata ocorrências.');
      if (occurrence.status !== 'em-andamento') throw conflict('Só é possível pausar ocorrência Em andamento.');
      const text = requireText(reason, 'a justificativa da pausa');
      mutate(id, (o, draft) => {
        o.status = 'em-pausa';
        o.pauses.push({ startedAt: rt.now().toISOString(), reason: text, byUserId: ctx.user.id });
        o.history.push(entry(ctx.user.id, 'acao', `Ocorrência pausada. Justificativa: ${text}`));
        if (o.approvalRequest) {
          o.approvalRequest = undefined;
          o.history.push(entry('sistema', 'automatico', 'Pedido de aprovação de conclusão cancelado pela pausa: será preciso pedir de novo após retomar (DP-13).'));
        }
        audit(draft, ctx, 'ocorrencia.pausar', o, 'pausada');
      });
    },

    async resume(ctx, id) {
      await simulateLatency(rt);
      const { occurrence } = load(ctx, id);
      requirePerm(ctx, 'treat', 'Seu perfil não trata ocorrências.');
      if (occurrence.status !== 'em-pausa') throw conflict('A ocorrência não está em pausa.');
      mutate(id, (o, draft) => {
        const pause = o.pauses[o.pauses.length - 1]!;
        pause.endedAt = rt.now().toISOString();
        pause.resumedByUserId = ctx.user.id;
        o.status = 'em-andamento';
        o.history.push(entry(ctx.user.id, 'acao', 'Ocorrência retomada: contagem da pausa encerrada.'));
        audit(draft, ctx, 'ocorrencia.retomar', o, 'retomada');
      });
    },

    async conclude(ctx, id, input) {
      await simulateLatency(rt);
      const { occurrence, type } = load(ctx, id);
      requirePerm(ctx, 'conclude', 'Seu perfil não conclui ocorrências.');
      const reason = blockReason(rt.store.getSnapshot(), occurrence, type, input);
      if (reason) throw (occurrence.status === 'em-pausa' || occurrence.status === 'concluida' ? conflict : validation)(`Não é possível concluir: ${reason}.`);
      mutate(id, (o, draft) => {
        finishConclusion(o, ctx, input);
        o.history.push(entry(ctx.user.id, 'acao', `Ocorrência concluída${input.justification?.trim() ? `. Justificativa: ${input.justification.trim()}` : ''}${input.evidenceNames.length ? ` (${input.evidenceNames.length} evidência(s))` : ''}.`));
        audit(draft, ctx, 'ocorrencia.concluir', o, 'concluída');
      });
    },

    async concludeBatch(ctx, ids) {
      await simulateLatency(rt);
      requireModule(ctx, 'ocorrencias');
      requirePerm(ctx, 'conclude', 'Seu perfil não conclui ocorrências.');
      const db = rt.store.getSnapshot();
      const result: OccurrenceBatchResult = { done: [], kept: [] };
      for (const id of ids) {
        const o = db.occurrences.find((x) => x.id === id);
        if (!o || !inScope(ctx, o.locationId)) continue;
        const reason = blockReason(db, o, typeOf(db, o), null);
        if (reason) {
          result.kept.push({ id, code: o.code, reason });
          continue;
        }
        mutate(id, (draft, d) => {
          finishConclusion(draft, ctx, { evidenceNames: [] });
          draft.history.push(entry(ctx.user.id, 'acao', 'Ocorrência concluída em lote.'));
          audit(d, ctx, 'ocorrencia.concluir-lote', draft, 'concluída em lote');
        });
        result.done.push({ id, code: o.code });
      }
      return result;
    },

    async requestApproval(ctx, id, input) {
      await simulateLatency(rt);
      const { occurrence, type } = load(ctx, id);
      requirePerm(ctx, 'conclude', 'Seu perfil não conclui ocorrências.');
      if (type.conclusion.criterion !== 'aprovacao') throw conflict('O tipo não exige aprovação: conclua diretamente.');
      if (occurrence.approvalRequest) throw conflict('Já existe pedido de aprovação aguardando decisão.');
      if (!checkOf(rt.store.getSnapshot(), occurrence, type).baseMet) throw conflict('A ocorrência precisa estar Em andamento, com ao menos um trâmite.');
      if (type.conclusion.requireJustification && (input.justification ?? '').trim().length < MIN_TEXT) throw validation('Informe a justificativa de conclusão.');
      if (type.conclusion.requireEvidence && !hasAttachment(occurrence) && !input.evidenceNames.length) throw validation('O tipo exige evidência: anexe ao menos uma.');
      mutate(id, (o, draft) => {
        o.approvalRequest = { at: rt.now().toISOString(), byUserId: ctx.user.id, justification: input.justification?.trim() || undefined, evidenceNames: input.evidenceNames };
        o.history.push(entry(ctx.user.id, 'automatico', 'Conclusão solicitada: aguardando aprovação (pendência; a ocorrência continua Em andamento).'));
        audit(draft, ctx, 'ocorrencia.pedir-aprovacao', o, 'aprovação de conclusão solicitada');
        notify(draft, o, {
          title: `Aprovar conclusão de ${o.code}`,
          message: `${userName(draft, ctx.user.id)} pediu a aprovação da conclusão.`,
          recipients: usersWith(draft, 'ocorrencias.conclude', o.locationId),
          exclude: ctx.user.id,
        });
      });
    },

    async decideApproval(ctx, id, approve, reason) {
      await simulateLatency(rt);
      const { occurrence } = load(ctx, id);
      requirePerm(ctx, 'conclude', 'Seu perfil não aprova conclusões.');
      const request = occurrence.approvalRequest;
      if (!request) throw conflict('Não há pedido de aprovação pendente.');
      if (request.byUserId === ctx.user.id) throw forbidden('Quem pediu a aprovação não pode decidi-la (P-61).');
      if (!approve) requireText(reason, 'o motivo da recusa');
      mutate(id, (o, draft) => {
        if (approve) {
          const byUserId = request.byUserId;
          finishConclusion(o, ctx, { justification: request.justification, evidenceNames: request.evidenceNames }, { byUserId, approvedByUserId: ctx.user.id });
          o.history.push(entry(ctx.user.id, 'acao', `Conclusão aprovada${reason.trim() ? `: ${reason.trim()}` : ''}. Ocorrência concluída.`));
        } else {
          o.approvalRequest = undefined;
          o.history.push(entry(ctx.user.id, 'acao', `Conclusão recusada. Motivo: ${reason.trim()}. A ocorrência continua Em andamento.`));
        }
        audit(draft, ctx, approve ? 'ocorrencia.aprovar-conclusao' : 'ocorrencia.recusar-conclusao', o, approve ? 'conclusão aprovada' : 'conclusão recusada');
        notify(draft, o, {
          title: `${o.code}: conclusão ${approve ? 'aprovada' : 'recusada'}`,
          message: approve ? 'A ocorrência foi concluída.' : `Motivo: ${reason.trim()}`,
          recipients: [request.byUserId],
          exclude: ctx.user.id,
        });
      });
    },

    async concludeWithException(ctx, id, justification) {
      await simulateLatency(rt);
      const { occurrence, type } = load(ctx, id);
      requirePerm(ctx, 'exception', 'Seu perfil não autoriza exceção de conclusão.');
      const check = checkOf(rt.store.getSnapshot(), occurrence, type);
      // A exceção não dispensa a DP-04a nem a regra atual do produto (D-013).
      if (occurrence.status === 'em-pausa') throw conflict('Em pausa: retome antes de concluir. A exceção não dispensa a DP-04a.');
      if (!check.baseMet) throw conflict('A exceção só dispensa condições do tipo: a ocorrência precisa estar Em andamento, com ao menos um trâmite.');
      if (!hasTypeConditions(type)) throw conflict('O tipo não tem condições configuradas: conclua normalmente.');
      const text = requireText(justification, 'a justificativa da exceção');
      const dispensed = check.conditions.filter((c) => c.origin === 'tipo').map((c) => c.label.replace(/ \(.*\)$/, ''));
      mutate(id, (o, draft) => {
        finishConclusion(o, ctx, { evidenceNames: [] }, { exception: { dispensed, authorizedByUserId: ctx.user.id, justification: text } });
        o.history.push(entry(ctx.user.id, 'acao', `Concluída com exceção autorizada. Condições dispensadas: ${dispensed.join('; ')}. Justificativa: ${text}`));
        audit(draft, ctx, 'ocorrencia.concluir-excecao', o, 'concluída com exceção');
      });
    },

    requestPrefill(ctx, id) {
      if (!isModuleAvailable(ctx, 'ocorrencias')) return null;
      const db = rt.store.getSnapshot();
      const o = db.occurrences.find((x) => x.id === id);
      if (!o || !inScope(ctx, o.locationId)) return null;
      return { id: o.id, code: o.code, typeName: typeOf(db, o).name, description: o.description, locationId: o.locationId, assetId: o.assetId };
    },

    eventPrefill(ctx, eventId) {
      const db = rt.store.getSnapshot();
      const event = db.events.find((e) => e.id === eventId);
      if (!event || !canSeeEvent(ctx, event)) return null;
      return { event, locationId: event.locationId, assetId: event.assetId };
    },

    async hubSummary(ctx, filter) {
      await simulateLatency(rt);
      requireModule(ctx, 'ocorrencias');
      const db = rt.store.getSnapshot();
      const list = visible(ctx, db).filter((o) => matches(db, o, filter));
      const counts: Record<OccurrencePanelColumn, number> = {
        'sem-tratamento': list.filter((o) => o.status === 'sem-tratamento').length,
        'em-andamento': list.filter((o) => o.status === 'em-andamento').length,
        'em-pausa': list.filter((o) => o.status === 'em-pausa').length,
        'concluidas-24h': list.filter(concludedRecently).length,
      };
      return {
        open: list
          .filter((o) => o.status !== 'concluida')
          .sort(byPriorityThenRecent)
          .slice(0, filter.limit ?? 5)
          .map((o) => item(db, o)),
        counts,
      };
    },
  };
}
