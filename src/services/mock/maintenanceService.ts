import { PROFILES, can, isModuleAvailable, resolveVisibleLocations, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import {
  MAINTENANCE_PRIORITY_LABEL,
  REDIRECT_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  WORK_ORDER_STATUS_LABEL,
  type AppNotification,
  type Id,
  type MaintenanceHistoryEntry,
  type MaintenanceRequest,
  type RequestStatus,
  type Severity,
  type WorkOrder,
  type WorkOrderStatus,
} from '@/domain';
import type {
  MaintenanceHistoryView,
  MaintenanceOverview,
  MaintenanceService,
  RequestListItem,
  RequestQuery,
  WorkOrderActions,
  WorkOrderListItem,
  WorkOrderQuery,
} from '../contracts';
import { ServiceError, forbidden, notFound } from '../errors';
import { inLocationFilter, inScope, locationIndexOf, matchesQuery, paginate, simulateLatency, type ServiceRuntime } from '../internal';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';

const MIN_TEXT = 5;
const ACTIVE_ORDER: WorkOrderStatus[] = ['aberta', 'planejada', 'em-execucao', 'suspensa', 'aguardando-encerramento'];
const CANCELLABLE: WorkOrderStatus[] = ['aberta', 'planejada', 'em-execucao', 'suspensa'];

const validation = (message: string) => new ServiceError('VALIDATION', message);
const conflict = (message: string) => new ServiceError('CONFLICT', message);

function requireText(value: string | undefined, label: string): string {
  const text = (value ?? '').trim();
  if (text.length < MIN_TEXT) throw validation(`Informe ${label} (mínimo de ${MIN_TEXT} caracteres).`);
  return text;
}

/**
 * Gestão de Manutenção — solicitação, triagem, OS e execução (etapa 5).
 * Manutenção é dona destes dados; a Central só é consultada (ativo e local).
 * Nenhuma mudança de status se propaga automaticamente entre solicitação e OS
 * (D-011/D-012): a solicitação apenas exibe a OS vinculada.
 */
export function createMaintenanceService(rt: ServiceRuntime): MaintenanceService {
  const permissions = (ctx: AccessContext) => {
    const available = isModuleAvailable(ctx, 'manutencao');
    return {
      request: available && can(ctx, 'manutencao.request'),
      triage: available && can(ctx, 'manutencao.manage'),
      manageOrders: available && can(ctx, 'manutencao.manage'),
      execute: available && can(ctx, 'manutencao.execute'),
    };
  };

  const userName = (db: Readonly<DemoDatabase>, userId: Id | 'sistema' | undefined): string => {
    if (!userId) return '—';
    if (userId === 'sistema') return 'Sistema';
    const user = db.users.find((u) => u.id === userId);
    return db.people.find((p) => p.id === user?.personId)?.name ?? 'Usuário';
  };

  const historyView = (db: Readonly<DemoDatabase>, entries: MaintenanceHistoryEntry[]): MaintenanceHistoryView[] =>
    [...entries].sort((a, b) => b.at.localeCompare(a.at)).map((h) => ({ at: h.at, actorName: userName(db, h.actorUserId), text: h.text }));

  /** Usuários de demonstração com a permissão e o local no escopo. */
  const usersWith = (db: Readonly<DemoDatabase>, permission: 'manutencao.manage' | 'manutencao.execute', locationId: Id): Id[] => {
    const index = locationIndexOf(db);
    return db.users
      .filter((u) => PROFILES[u.profileId].permissions.includes(permission))
      .filter((u) => {
        const visible = resolveVisibleLocations(u.scope, index);
        return visible === 'all' || visible.has(locationId);
      })
      .map((u) => u.id);
  };

  const notify = (
    draft: DemoDatabase,
    input: { title: string; message: string; recipientUserIds: Id[]; locationId: Id; target: AppNotification['target']; severity?: Severity; exclude?: Id },
  ) => {
    const recipients = Array.from(new Set(input.recipientUserIds.filter((id) => id !== input.exclude)));
    if (recipients.length === 0) return;
    draft.notifications.push({
      id: rt.newId('n'),
      moduleId: 'manutencao',
      type: 'tarefa',
      severity: input.severity ?? 'informativa',
      important: false,
      title: input.title,
      message: input.message,
      locationId: input.locationId,
      createdAt: rt.now().toISOString(),
      target: input.target,
      readByUserIds: [],
      recipientUserIds: recipients,
    });
  };

  const audit = (draft: DemoDatabase, ctx: AccessContext, action: string, entityType: string, entityId: Id, summary: string) => {
    draft.auditLog.push({ id: rt.newId('aud'), at: rt.now().toISOString(), actorUserId: ctx.user.id, moduleId: 'manutencao', action, entityType, entityId, summary });
  };

  const log = (ctx: AccessContext, text: string): MaintenanceHistoryEntry => ({ at: rt.now().toISOString(), actorUserId: ctx.user.id, text });

  // ── Visões ──────────────────────────────────────────────────────────

  const isOverdue = (o: WorkOrder): boolean => {
    if (!o.plannedDate || !ACTIVE_ORDER.includes(o.status) || o.status === 'aguardando-encerramento') return false;
    return new Date(`${o.plannedDate}T23:59:59`).getTime() < rt.now().getTime();
  };

  const requestItem = (db: Readonly<DemoDatabase>, r: MaintenanceRequest): RequestListItem => {
    const workOrder = r.workOrderId ? db.workOrders.find((o) => o.id === r.workOrderId) : undefined;
    return {
      request: r,
      asset: r.assetId ? db.assets.find((a) => a.id === r.assetId) : undefined,
      locationPath: locationIndexOf(db).pathOf(r.locationId),
      requesterName: userName(db, r.requesterUserId),
      workOrder,
      awaitingTriageDecision: r.status === 'convertida' && workOrder?.status === 'cancelada',
    };
  };

  const orderItem = (db: Readonly<DemoDatabase>, o: WorkOrder): WorkOrderListItem => ({
    order: o,
    asset: o.assetId ? db.assets.find((a) => a.id === o.assetId) : undefined,
    locationPath: locationIndexOf(db).pathOf(o.locationId),
    technicianName: o.technicianUserId ? userName(db, o.technicianUserId) : undefined,
    overdue: isOverdue(o),
    openImpediments: o.impediments.filter((i) => !i.handled).length,
  });

  const visibleRequests = (ctx: AccessContext, db: Readonly<DemoDatabase>) => db.maintenanceRequests.filter((r) => inScope(ctx, r.locationId));
  const visibleOrders = (ctx: AccessContext, db: Readonly<DemoDatabase>) => db.workOrders.filter((o) => inScope(ctx, o.locationId));

  const matchRequest = (db: Readonly<DemoDatabase>, ctx: AccessContext, r: MaintenanceRequest, q: RequestQuery) => {
    if (q.status === 'pendentes' && !['aberta', 'em-triagem'].includes(r.status)) return false;
    if (q.status && q.status !== 'pendentes' && r.status !== q.status) return false;
    if (q.mine && r.requesterUserId !== ctx.user.id) return false;
    if (q.locationId && (q.includeDescendants === false ? r.locationId !== q.locationId : !inLocationFilter(db, r.locationId, q.locationId))) return false;
    if (q.search?.trim()) {
      const asset = r.assetId ? db.assets.find((a) => a.id === r.assetId) : undefined;
      if (!matchesQuery(q.search, r.code, r.title, r.description, asset?.tag, asset?.name)) return false;
    }
    return true;
  };

  const matchOrder = (db: Readonly<DemoDatabase>, ctx: AccessContext, o: WorkOrder, q: WorkOrderQuery) => {
    if (q.status === 'ativas' && !ACTIVE_ORDER.includes(o.status)) return false;
    if (q.status && q.status !== 'ativas' && o.status !== q.status) return false;
    if (q.mine && o.technicianUserId !== ctx.user.id) return false;
    if (q.locationId && (q.includeDescendants === false ? o.locationId !== q.locationId : !inLocationFilter(db, o.locationId, q.locationId))) return false;
    if (q.search?.trim()) {
      const asset = o.assetId ? db.assets.find((a) => a.id === o.assetId) : undefined;
      if (!matchesQuery(q.search, o.code, o.title, o.description, asset?.tag, asset?.name)) return false;
    }
    return true;
  };

  const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

  // ── Guardas ─────────────────────────────────────────────────────────

  const loadRequest = (ctx: AccessContext, id: Id) => {
    requireModule(ctx, 'manutencao');
    const db = rt.store.getSnapshot();
    const request = db.maintenanceRequests.find((r) => r.id === id);
    if (!request) throw notFound('Solicitação não encontrada.');
    if (!inScope(ctx, request.locationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return { db, request };
  };

  const loadOrder = (ctx: AccessContext, id: Id) => {
    requireModule(ctx, 'manutencao');
    const db = rt.store.getSnapshot();
    const order = db.workOrders.find((o) => o.id === id);
    if (!order) throw notFound('Ordem de serviço não encontrada.');
    if (!inScope(ctx, order.locationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return { db, order };
  };

  const requireTriage = (ctx: AccessContext) => {
    if (!permissions(ctx).triage) throw forbidden('Seu perfil não faz triagem de solicitações.');
  };
  const requireManage = (ctx: AccessContext) => {
    if (!permissions(ctx).manageOrders) throw forbidden('Seu perfil não gerencia ordens de serviço.');
  };
  const requireAssignedTechnician = (ctx: AccessContext, order: WorkOrder) => {
    if (!permissions(ctx).execute) throw forbidden('Seu perfil não executa ordens de serviço.');
    if (order.technicianUserId !== ctx.user.id) throw forbidden('Somente o técnico atribuído executa esta OS.');
  };
  const requireTriaging = (request: MaintenanceRequest) => {
    if (request.status !== 'em-triagem') throw conflict('Assuma a triagem antes de decidir o destino da solicitação.');
  };
  const runningExecution = (order: WorkOrder) => order.executions.find((e) => e.status === 'em-andamento');

  const orderActions = (ctx: AccessContext, order: WorkOrder): WorkOrderActions => {
    const perm = permissions(ctx);
    const running = runningExecution(order);
    const assigned = perm.execute && order.technicianUserId === ctx.user.id;
    const mine = order.executions.find((e) => e.status === 'em-andamento' && e.technicianUserId === ctx.user.id);
    const concluded = order.executions.some((e) => e.status === 'concluida');
    const canSuspendState = order.status === 'planejada' || order.status === 'em-execucao';
    const suspendBlockedReason = canSuspendState && running ? 'Há execução em andamento: o técnico conclui o trabalho parcial (ou a execução é interrompida) antes da suspensão.' : undefined;
    const cancelBlockedReason = CANCELLABLE.includes(order.status) && running ? 'Há execução em andamento: conclua-a ou interrompa-a antes de cancelar a OS.' : undefined;
    return {
      plan: perm.manageOrders && (order.status === 'aberta' || order.status === 'planejada'),
      startExecution: assigned && (order.status === 'planejada' || order.status === 'em-execucao') && !running,
      myRunningExecutionId: mine?.id,
      registerImpediment: assigned && (order.status === 'planejada' || order.status === 'em-execucao'),
      submitForClosure: assigned && order.status === 'em-execucao' && !running && concluded,
      close: perm.manageOrders && order.status === 'aguardando-encerramento',
      returnToExecution: perm.manageOrders && order.status === 'aguardando-encerramento',
      suspend: perm.manageOrders && canSuspendState && !running,
      suspendBlockedReason: perm.manageOrders ? suspendBlockedReason : undefined,
      resume: perm.manageOrders && order.status === 'suspensa',
      cancel: perm.manageOrders && CANCELLABLE.includes(order.status) && !running,
      cancelBlockedReason: perm.manageOrders ? cancelBlockedReason : undefined,
      interruptExecution: perm.manageOrders && Boolean(running),
    };
  };

  const mutateRequest = (id: Id, fn: (r: MaintenanceRequest, draft: DemoDatabase) => void) =>
    rt.store.mutate((draft) => {
      const r = draft.maintenanceRequests.find((x) => x.id === id)!;
      fn(r, draft);
    });

  const mutateOrder = (id: Id, fn: (o: WorkOrder, draft: DemoDatabase) => void) =>
    rt.store.mutate((draft) => {
      const o = draft.workOrders.find((x) => x.id === id)!;
      fn(o, draft);
    });

  const requestTarget = (id: Id) => ({ kind: 'maintenance-request' as const, id });
  const orderTarget = (id: Id) => ({ kind: 'work-order' as const, id });

  /** Desfecho de triagem: muda o status, registra e avisa o solicitante. */
  const conclude = (ctx: AccessContext, request: MaintenanceRequest, status: RequestStatus, text: string, extra: (r: MaintenanceRequest) => void) => {
    mutateRequest(request.id, (r, draft) => {
      r.status = status;
      extra(r);
      r.history.push(log(ctx, text));
      audit(draft, ctx, `solicitacao.${status}`, 'solicitacao', r.id, `${r.code}: ${text}`);
      notify(draft, {
        title: `${r.code} — ${REQUEST_STATUS_LABEL[status]}`,
        message: `${r.title}. ${text}`,
        recipientUserIds: [r.requesterUserId],
        exclude: ctx.user.id,
        locationId: r.locationId,
        target: requestTarget(r.id),
      });
    });
  };

  return {
    permissions,

    async overview(ctx, filter) {
      await simulateLatency(rt);
      requireModule(ctx, 'manutencao');
      const db = rt.store.getSnapshot();
      const requests = visibleRequests(ctx, db).filter((r) => matchRequest(db, ctx, r, filter));
      const orders = visibleOrders(ctx, db).filter((o) => matchOrder(db, ctx, o, filter));
      const requestsByStatus = Object.fromEntries(Object.keys(REQUEST_STATUS_LABEL).map((s) => [s, 0])) as Record<RequestStatus, number>;
      for (const r of requests) requestsByStatus[r.status] += 1;
      const ordersByStatus = Object.fromEntries(Object.keys(WORK_ORDER_STATUS_LABEL).map((s) => [s, 0])) as Record<WorkOrderStatus, number>;
      for (const o of orders) ordersByStatus[o.status] += 1;
      const perm = permissions(ctx);
      const triageQueue = perm.triage
        ? requests
            .filter((r) => r.status === 'aberta' || r.status === 'em-triagem' || requestItem(db, r).awaitingTriageDecision)
            .sort(byNewest)
            .map((r) => requestItem(db, r))
        : [];
      const items = orders.sort(byNewest).map((o) => orderItem(db, o));
      return {
        requestsByStatus,
        ordersByStatus,
        overdueOrders: items.filter((i) => i.overdue).length,
        triageQueue,
        awaitingClosure: perm.manageOrders ? items.filter((i) => i.order.status === 'aguardando-encerramento') : [],
        withImpediments: perm.manageOrders ? items.filter((i) => i.openImpediments > 0) : [],
        myOrders: perm.execute ? items.filter((i) => i.order.technicianUserId === ctx.user.id && ACTIVE_ORDER.includes(i.order.status)) : [],
        myRequests: requests.filter((r) => r.requesterUserId === ctx.user.id).sort(byNewest).slice(0, 5).map((r) => requestItem(db, r)),
      } satisfies MaintenanceOverview;
    },

    // ── Solicitações ──────────────────────────────────────────────────

    async listRequests(ctx, query) {
      await simulateLatency(rt);
      requireModule(ctx, 'manutencao');
      const db = rt.store.getSnapshot();
      const list = visibleRequests(ctx, db)
        .filter((r) => matchRequest(db, ctx, r, query))
        .sort(byNewest)
        .map((r) => requestItem(db, r));
      return paginate(list, query.page, query.pageSize ?? 10);
    },

    async getRequest(ctx, id) {
      await simulateLatency(rt);
      const { db, request } = loadRequest(ctx, id);
      const perm = permissions(ctx);
      const item = requestItem(db, request);
      const isRequester = request.requesterUserId === ctx.user.id;
      return {
        ...item,
        history: historyView(db, request.history),
        duplicateOf: request.duplicateOfId ? db.maintenanceRequests.find((r) => r.id === request.duplicateOfId) : undefined,
        duplicates: db.maintenanceRequests.filter((r) => r.duplicateOfId === request.id && inScope(ctx, r.locationId)),
        cancelledWorkOrders: request.cancelledWorkOrderIds.map((oid) => db.workOrders.find((o) => o.id === oid)).filter((o): o is WorkOrder => Boolean(o)),
        triageName: request.triageUserId ? userName(db, request.triageUserId) : undefined,
        redirectDestination: request.redirect?.destinationId ? db.redirectDestinations.find((d) => d.id === request.redirect!.destinationId) : undefined,
        actions: {
          edit: perm.request && isRequester && request.status === 'aberta',
          cancel: perm.request && isRequester && request.status === 'aberta',
          startTriage: perm.triage && request.status === 'aberta',
          decide: perm.triage && request.status === 'em-triagem',
          resumeTriage: perm.triage && item.awaitingTriageDecision,
        },
      };
    },

    async createRequest(ctx, input) {
      await simulateLatency(rt);
      requireModule(ctx, 'manutencao');
      if (!permissions(ctx).request) throw forbidden('Seu perfil não abre solicitações de manutenção.');
      const db = rt.store.getSnapshot();
      const errors: string[] = [];
      if (input.title.trim().length < MIN_TEXT) errors.push(`Informe um título (mínimo de ${MIN_TEXT} caracteres).`);
      if (input.description.trim().length < MIN_TEXT) errors.push(`Descreva a necessidade (mínimo de ${MIN_TEXT} caracteres).`);
      if (!input.locationId) errors.push('Informe o local.');
      else if (!db.locations.some((l) => l.id === input.locationId)) errors.push('Local inválido.');
      else if (!inScope(ctx, input.locationId)) errors.push('O local está fora do seu escopo.');
      if (input.assetId) {
        const asset = db.assets.find((a) => a.id === input.assetId);
        if (!asset) errors.push('Ativo inválido.');
        else if (!inScope(ctx, asset.primaryLocationId)) errors.push('O ativo está fora do seu escopo.');
      }
      const occurrence = input.occurrenceId ? db.occurrences.find((o) => o.id === input.occurrenceId) : undefined;
      if (input.occurrenceId && (!occurrence || !inScope(ctx, occurrence.locationId) || !isModuleAvailable(ctx, 'ocorrencias'))) {
        errors.push('Ocorrência de origem inválida.');
      }
      if (errors.length) throw validation(errors.join(' '));
      let created!: MaintenanceRequest;
      rt.store.mutate((draft) => {
        draft.maintenanceCounters.request += 1;
        created = {
          id: rt.newId('sol'),
          code: `SOL-${String(draft.maintenanceCounters.request).padStart(4, '0')}`,
          title: input.title.trim(),
          description: input.description.trim(),
          locationId: input.locationId,
          assetId: input.assetId || undefined,
          perceivedPriority: input.perceivedPriority,
          origin: occurrence ? 'ocorrencia' : input.origin,
          occurrenceId: occurrence?.id,
          requesterUserId: ctx.user.id,
          createdAt: rt.now().toISOString(),
          status: 'aberta',
          cancelledWorkOrderIds: [],
          history: [
            log(
              ctx,
              `Solicitação aberta${occurrence ? ` a partir da ocorrência ${occurrence.code}` : input.origin === 'painel-ativo' ? ' a partir do painel 360º do ativo' : ''}. Prioridade percebida: ${MAINTENANCE_PRIORITY_LABEL[input.perceivedPriority]}.`,
            ),
          ],
        };
        draft.maintenanceRequests.push(created);
        if (occurrence) {
          // Registro automático na ocorrência (DP-06): não é trâmite humano; não muda status nem tempo de resposta.
          const o = draft.occurrences.find((x) => x.id === occurrence.id)!;
          o.history.push({ at: created.createdAt, actorUserId: 'sistema', kind: 'automatico', text: `Solicitação de manutenção ${created.code} aberta a partir desta ocorrência.` });
        }
        audit(draft, ctx, 'solicitacao.abrir', 'solicitacao', created.id, `${created.code} aberta: ${created.title}`);
        notify(draft, {
          title: `Nova solicitação ${created.code}`,
          message: `${created.title} — aguardando triagem.`,
          recipientUserIds: usersWith(draft, 'manutencao.manage', created.locationId),
          exclude: ctx.user.id,
          locationId: created.locationId,
          target: requestTarget(created.id),
          severity: input.perceivedPriority === 'critica' ? 'alta' : 'informativa',
        });
      });
      return created;
    },

    async editRequest(ctx, id, input) {
      await simulateLatency(rt);
      const { request } = loadRequest(ctx, id);
      if (request.requesterUserId !== ctx.user.id || !permissions(ctx).request) throw forbidden('Somente o solicitante edita a solicitação.');
      if (request.status !== 'aberta') throw conflict('A solicitação já entrou em triagem: a edição está restrita (DP-40).');
      const title = requireText(input.title, 'o título');
      const description = requireText(input.description, 'a descrição');
      const changes: string[] = [];
      if (title !== request.title) changes.push(`título: "${request.title}" → "${title}"`);
      if (description !== request.description) changes.push('descrição alterada');
      if (input.perceivedPriority !== request.perceivedPriority) {
        changes.push(`prioridade percebida: ${MAINTENANCE_PRIORITY_LABEL[request.perceivedPriority]} → ${MAINTENANCE_PRIORITY_LABEL[input.perceivedPriority]}`);
      }
      if (!changes.length) throw validation('Nenhuma alteração para salvar.');
      mutateRequest(id, (r, draft) => {
        Object.assign(r, { title, description, perceivedPriority: input.perceivedPriority });
        r.history.push(log(ctx, `Solicitação editada (${changes.join('; ')}).`));
        audit(draft, ctx, 'solicitacao.editar', 'solicitacao', r.id, `${r.code} editada`);
      });
    },

    async cancelRequest(ctx, id, reason) {
      await simulateLatency(rt);
      const { request } = loadRequest(ctx, id);
      if (request.requesterUserId !== ctx.user.id || !permissions(ctx).request) throw forbidden('Somente o solicitante cancela a solicitação.');
      if (request.status !== 'aberta') throw conflict('A solicitação já entrou em triagem: o cancelamento está restrito (DP-40).');
      const text = requireText(reason, 'o motivo do cancelamento');
      mutateRequest(id, (r, draft) => {
        r.status = 'cancelada';
        r.outcomeReason = text;
        r.history.push(log(ctx, `Solicitação cancelada pelo solicitante. Motivo: ${text}`));
        audit(draft, ctx, 'solicitacao.cancelar', 'solicitacao', r.id, `${r.code} cancelada`);
      });
    },

    async startTriage(ctx, id) {
      await simulateLatency(rt);
      const { request } = loadRequest(ctx, id);
      requireTriage(ctx);
      if (request.status !== 'aberta') throw conflict('Esta solicitação não está aguardando triagem.');
      mutateRequest(id, (r, draft) => {
        r.status = 'em-triagem';
        r.triageUserId = ctx.user.id;
        r.history.push(log(ctx, 'Triagem assumida.'));
        audit(draft, ctx, 'solicitacao.triagem', 'solicitacao', r.id, `${r.code}: triagem assumida`);
      });
    },

    async convertToWorkOrder(ctx, id, priority) {
      await simulateLatency(rt);
      const { request } = loadRequest(ctx, id);
      requireTriage(ctx);
      requireTriaging(request);
      let order!: WorkOrder;
      rt.store.mutate((draft) => {
        draft.maintenanceCounters.workOrder += 1;
        const now = rt.now().toISOString();
        order = {
          id: rt.newId('os'),
          code: `OS-${String(draft.maintenanceCounters.workOrder).padStart(4, '0')}`,
          title: request.title,
          description: request.description,
          locationId: request.locationId,
          assetId: request.assetId,
          requestIds: [request.id],
          priority,
          createdAt: now,
          createdByUserId: ctx.user.id,
          status: 'aberta',
          executions: [],
          suspensions: [],
          impediments: [],
          history: [{ at: now, actorUserId: ctx.user.id, text: `OS criada a partir da solicitação ${request.code}. Prioridade: ${MAINTENANCE_PRIORITY_LABEL[priority]}.` }],
        };
        draft.workOrders.push(order);
        const r = draft.maintenanceRequests.find((x) => x.id === request.id)!;
        r.status = 'convertida';
        r.definedPriority = priority;
        r.workOrderId = order.id;
        r.history.push(log(ctx, `Convertida na ${order.code}. Prioridade definida: ${MAINTENANCE_PRIORITY_LABEL[priority]}.`));
        audit(draft, ctx, 'solicitacao.converter', 'solicitacao', r.id, `${r.code} convertida em ${order.code}`);
        notify(draft, {
          title: `${r.code} — convertida em OS`,
          message: `${r.title}: ${order.code} criada.`,
          recipientUserIds: [r.requesterUserId],
          exclude: ctx.user.id,
          locationId: r.locationId,
          target: requestTarget(r.id),
        });
      });
      return order;
    },

    async resolveWithoutOrder(ctx, id, priority, reason) {
      await simulateLatency(rt);
      const { request } = loadRequest(ctx, id);
      requireTriage(ctx);
      requireTriaging(request);
      const text = requireText(reason, 'a justificativa');
      conclude(ctx, request, 'resolvida-sem-os', `Resolvida sem OS. Justificativa: ${text}`, (r) => {
        r.definedPriority = priority;
        r.outcomeReason = text;
      });
    },

    async rejectRequest(ctx, id, reason) {
      await simulateLatency(rt);
      const { request } = loadRequest(ctx, id);
      requireTriage(ctx);
      requireTriaging(request);
      const text = requireText(reason, 'a justificativa');
      conclude(ctx, request, 'rejeitada', `Rejeitada. Justificativa: ${text}`, (r) => {
        r.outcomeReason = text;
      });
    },

    async markDuplicate(ctx, id, originalId, reason) {
      await simulateLatency(rt);
      const { db, request } = loadRequest(ctx, id);
      requireTriage(ctx);
      requireTriaging(request);
      const original = db.maintenanceRequests.find((r) => r.id === originalId);
      if (!original || original.id === request.id || !inScope(ctx, original.locationId)) throw validation('Selecione a solicitação original.');
      if (original.status === 'duplicada' || original.status === 'cancelada') throw validation('A original não pode estar duplicada nem cancelada.');
      const text = requireText(reason, 'o motivo');
      conclude(ctx, request, 'duplicada', `Marcada como duplicada de ${original.code}. Motivo: ${text}`, (r) => {
        r.duplicateOfId = original.id;
        r.outcomeReason = text;
      });
      mutateRequest(original.id, (r) => {
        r.history.push(log(ctx, `${request.code} marcada como duplicada desta solicitação.`));
      });
    },

    async redirectRequest(ctx, id, input) {
      await simulateLatency(rt);
      const { db, request } = loadRequest(ctx, id);
      requireTriage(ctx);
      requireTriaging(request);
      const destination = input.destinationId ? db.redirectDestinations.find((d) => d.id === input.destinationId) : undefined;
      const destinationText = destination ? destination.name : (input.destinationText ?? '').trim();
      if (!destinationText) throw validation('Informe o destino externo.');
      const text = requireText(input.reason, 'o motivo');
      const kind = destination ? ` (${REDIRECT_KIND_LABEL[destination.kind]})` : ' (outro destino informado)';
      conclude(ctx, request, 'redirecionada', `Redirecionada para ${destinationText}${kind}. Motivo: ${text}`, (r) => {
        r.redirect = { destinationId: destination?.id, destinationText };
        r.outcomeReason = text;
      });
    },

    async resumeTriage(ctx, id, reason) {
      await simulateLatency(rt);
      const { db, request } = loadRequest(ctx, id);
      requireTriage(ctx);
      if (!requestItem(db, request).awaitingTriageDecision) throw conflict('A triagem só é retomada quando a OS vinculada foi cancelada (DP-50).');
      const text = requireText(reason, 'o motivo');
      mutateRequest(id, (r, draft) => {
        const cancelled = draft.workOrders.find((o) => o.id === r.workOrderId);
        if (r.workOrderId) r.cancelledWorkOrderIds.push(r.workOrderId);
        r.workOrderId = undefined;
        r.status = 'em-triagem';
        r.triageUserId = ctx.user.id;
        r.history.push(log(ctx, `Triagem retomada após o cancelamento da ${cancelled?.code ?? 'OS'}. Motivo: ${text}`));
        audit(draft, ctx, 'solicitacao.retomar-triagem', 'solicitacao', r.id, `${r.code}: triagem retomada`);
      });
    },

    duplicateCandidates(ctx, id) {
      const db = rt.store.getSnapshot();
      const request = db.maintenanceRequests.find((r) => r.id === id);
      if (!request) return [];
      return visibleRequests(ctx, db)
        .filter((r) => r.id !== id && r.status !== 'duplicada' && r.status !== 'cancelada')
        .sort((a, b) => {
          const score = (r: MaintenanceRequest) => (request.assetId && r.assetId === request.assetId ? 2 : 0) + (r.locationId === request.locationId ? 1 : 0);
          return score(b) - score(a) || byNewest(a, b);
        });
    },

    redirectDestinations(ctx) {
      if (!isModuleAvailable(ctx, 'manutencao')) return [];
      return rt.store.getSnapshot().redirectDestinations;
    },

    // ── Ordens de serviço ─────────────────────────────────────────────

    async listWorkOrders(ctx, query) {
      await simulateLatency(rt);
      requireModule(ctx, 'manutencao');
      const db = rt.store.getSnapshot();
      const list = visibleOrders(ctx, db)
        .filter((o) => matchOrder(db, ctx, o, query))
        .sort(byNewest)
        .map((o) => orderItem(db, o));
      return paginate(list, query.page, query.pageSize ?? 10);
    },

    async getWorkOrder(ctx, id) {
      await simulateLatency(rt);
      const { db, order } = loadOrder(ctx, id);
      const end = order.closure?.at ?? order.cancellation?.at ?? rt.now().toISOString();
      const totalMs = Math.max(0, new Date(end).getTime() - new Date(order.createdAt).getTime());
      const suspendedMs = order.suspensions.reduce((sum, s) => sum + Math.max(0, new Date(s.endedAt ?? end).getTime() - new Date(s.startedAt).getTime()), 0);
      return {
        ...orderItem(db, order),
        requests: order.requestIds.map((rid) => db.maintenanceRequests.find((r) => r.id === rid)).filter((r): r is MaintenanceRequest => Boolean(r)),
        executions: order.executions.map((execution) => ({ execution, technicianName: userName(db, execution.technicianUserId) })),
        history: historyView(db, order.history),
        actions: orderActions(ctx, order),
        time: { totalMs, suspendedMs, netMs: Math.max(0, totalMs - suspendedMs) },
        createdByName: userName(db, order.createdByUserId),
      };
    },

    technicianOptions(ctx, locationId) {
      if (!permissions(ctx).manageOrders) return [];
      const db = rt.store.getSnapshot();
      return usersWith(db, 'manutencao.execute', locationId)
        .map((userId) => {
          const user = db.users.find((u) => u.id === userId)!;
          const person = db.people.find((p) => p.id === user.personId);
          return { userId, name: person?.name ?? user.login, jobTitle: person?.jobTitle ?? '' };
        })
        .filter((t) => db.users.find((u) => u.id === t.userId)?.profileId !== 'admin-corporativo');
    },

    async planWorkOrder(ctx, id, input) {
      await simulateLatency(rt);
      const { db, order } = loadOrder(ctx, id);
      requireManage(ctx);
      if (order.status !== 'aberta' && order.status !== 'planejada') throw conflict('Só é possível planejar OS Aberta ou Planejada.');
      if (!input.plannedDate) throw validation('Informe a data prevista.');
      if (!usersWith(db, 'manutencao.execute', order.locationId).includes(input.technicianUserId)) throw validation('Selecione um técnico com acesso ao local da OS.');
      const replanned = order.status === 'planejada';
      const techName = userName(db, input.technicianUserId);
      mutateOrder(id, (o, draft) => {
        const previousTech = o.technicianUserId;
        o.status = 'planejada';
        o.technicianUserId = input.technicianUserId;
        o.plannedDate = input.plannedDate;
        o.history.push(log(ctx, `${replanned ? 'Replanejada' : 'Planejada'}: técnico ${techName}, data prevista ${input.plannedDate.split('-').reverse().join('/')}.`));
        audit(draft, ctx, 'os.planejar', 'os', o.id, `${o.code} ${replanned ? 'replanejada' : 'planejada'}`);
        if (previousTech !== input.technicianUserId) {
          notify(draft, {
            title: `${o.code} atribuída a você`,
            message: `${o.title} — previsão ${input.plannedDate.split('-').reverse().join('/')}.`,
            recipientUserIds: [input.technicianUserId],
            exclude: ctx.user.id,
            locationId: o.locationId,
            target: orderTarget(o.id),
          });
        }
      });
    },

    async startExecution(ctx, id) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireAssignedTechnician(ctx, order);
      if (order.status !== 'planejada' && order.status !== 'em-execucao') throw conflict(`OS ${WORK_ORDER_STATUS_LABEL[order.status]} não pode iniciar execução.`);
      if (runningExecution(order)) throw conflict('Já existe execução em andamento nesta OS.');
      mutateOrder(id, (o, draft) => {
        const first = o.status === 'planejada';
        o.executions.push({ id: rt.newId('ex'), technicianUserId: ctx.user.id, startedAt: rt.now().toISOString(), status: 'em-andamento', evidences: [] });
        o.status = 'em-execucao';
        o.history.push(log(ctx, first ? 'Execução iniciada. OS em execução.' : 'Nova execução iniciada.'));
        audit(draft, ctx, 'os.iniciar-execucao', 'os', o.id, `${o.code}: execução iniciada`);
      });
    },

    async concludeExecution(ctx, id, input) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireAssignedTechnician(ctx, order);
      const execution = order.executions.find((e) => e.status === 'em-andamento' && e.technicianUserId === ctx.user.id);
      if (!execution) throw conflict('Você não tem execução em andamento nesta OS.');
      const notes = requireText(input.workNotes, 'o trabalho realizado');
      const names = input.evidenceNames.map((n) => n.trim()).filter(Boolean);
      mutateOrder(id, (o, draft) => {
        const e = o.executions.find((x) => x.id === execution.id)!;
        const now = rt.now().toISOString();
        e.status = 'concluida';
        e.endedAt = now;
        e.workNotes = notes;
        e.evidences.push(...names.map((name) => ({ id: rt.newId('ev'), name, at: now, byUserId: ctx.user.id })));
        o.history.push(log(ctx, `Execução concluída pelo técnico${names.length ? ` com ${names.length} evidência(s)` : ''}. A OS continua aberta até o encerramento pelo gestor (DP-47).`));
        audit(draft, ctx, 'os.concluir-execucao', 'os', o.id, `${o.code}: execução concluída`);
      });
    },

    async registerImpediment(ctx, id, description) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireAssignedTechnician(ctx, order);
      if (order.status !== 'planejada' && order.status !== 'em-execucao') throw conflict('Impedimento só pode ser registrado em OS Planejada ou Em execução.');
      const text = requireText(description, 'a descrição do impedimento');
      mutateOrder(id, (o, draft) => {
        o.impediments.push({ id: rt.newId('imp'), at: rt.now().toISOString(), byUserId: ctx.user.id, description: text, handled: false });
        o.history.push(log(ctx, `Impedimento registrado pelo técnico: ${text}`));
        audit(draft, ctx, 'os.impedimento', 'os', o.id, `${o.code}: impedimento registrado`);
        notify(draft, {
          title: `Impedimento na ${o.code}`,
          message: `${text} — avalie a suspensão da OS.`,
          recipientUserIds: usersWith(draft, 'manutencao.manage', o.locationId),
          exclude: ctx.user.id,
          locationId: o.locationId,
          target: orderTarget(o.id),
          severity: 'media',
        });
      });
    },

    async submitForClosure(ctx, id) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireAssignedTechnician(ctx, order);
      if (!orderActions(ctx, order).submitForClosure) throw conflict('Conclua ao menos uma execução (sem execução em andamento) antes de enviar para encerramento.');
      mutateOrder(id, (o, draft) => {
        o.status = 'aguardando-encerramento';
        o.history.push(log(ctx, 'Trabalho finalizado pelo técnico. OS enviada para encerramento.'));
        audit(draft, ctx, 'os.enviar-encerramento', 'os', o.id, `${o.code}: aguardando encerramento`);
        notify(draft, {
          title: `${o.code} aguardando encerramento`,
          message: `${o.title} — valide o resultado e encerre.`,
          recipientUserIds: usersWith(draft, 'manutencao.manage', o.locationId),
          exclude: ctx.user.id,
          locationId: o.locationId,
          target: orderTarget(o.id),
        });
      });
    },

    async closeWorkOrder(ctx, id, note) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireManage(ctx);
      if (order.status !== 'aguardando-encerramento') throw conflict('Só é possível encerrar OS Aguardando encerramento.');
      const text = requireText(note, 'a validação do resultado');
      mutateOrder(id, (o, draft) => {
        o.status = 'encerrada';
        o.closure = { at: rt.now().toISOString(), byUserId: ctx.user.id, note: text };
        o.history.push(log(ctx, `OS encerrada pelo gestor. Validação: ${text}`));
        audit(draft, ctx, 'os.encerrar', 'os', o.id, `${o.code} encerrada`);
        const requesters = o.requestIds.map((rid) => draft.maintenanceRequests.find((r) => r.id === rid)?.requesterUserId).filter((u): u is Id => Boolean(u));
        notify(draft, {
          title: `${o.code} encerrada`,
          message: `${o.title} — o trabalho foi validado e a OS encerrada.`,
          recipientUserIds: [...requesters, ...(o.technicianUserId ? [o.technicianUserId] : [])],
          exclude: ctx.user.id,
          locationId: o.locationId,
          target: orderTarget(o.id),
        });
      });
    },

    async returnToExecution(ctx, id, reason) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireManage(ctx);
      if (order.status !== 'aguardando-encerramento') throw conflict('Só é possível devolver OS Aguardando encerramento.');
      const text = requireText(reason, 'o motivo da devolução');
      mutateOrder(id, (o, draft) => {
        o.status = 'em-execucao';
        o.history.push(log(ctx, `Encerramento recusado; OS devolvida para execução. Motivo: ${text}`));
        audit(draft, ctx, 'os.devolver', 'os', o.id, `${o.code} devolvida para execução`);
        notify(draft, {
          title: `${o.code} devolvida para execução`,
          message: text,
          recipientUserIds: o.technicianUserId ? [o.technicianUserId] : [],
          exclude: ctx.user.id,
          locationId: o.locationId,
          target: orderTarget(o.id),
          severity: 'media',
        });
      });
    },

    async suspendWorkOrder(ctx, id, reason) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireManage(ctx);
      if (order.status !== 'planejada' && order.status !== 'em-execucao') throw conflict('Só é possível suspender OS Planejada ou Em execução.');
      if (runningExecution(order)) throw conflict('Há execução em andamento: não é possível suspender (DP-48).');
      const text = requireText(reason, 'a justificativa da suspensão');
      mutateOrder(id, (o, draft) => {
        o.suspensions.push({ startedAt: rt.now().toISOString(), reason: text, authorizedByUserId: ctx.user.id, previousStatus: o.status as 'planejada' | 'em-execucao' });
        o.status = 'suspensa';
        for (const imp of o.impediments) imp.handled = true;
        o.history.push(log(ctx, `OS suspensa (autorizada pelo gestor). Justificativa: ${text}`));
        audit(draft, ctx, 'os.suspender', 'os', o.id, `${o.code} suspensa`);
        notify(draft, {
          title: `${o.code} suspensa`,
          message: text,
          recipientUserIds: o.technicianUserId ? [o.technicianUserId] : [],
          exclude: ctx.user.id,
          locationId: o.locationId,
          target: orderTarget(o.id),
        });
      });
    },

    async resumeWorkOrder(ctx, id) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireManage(ctx);
      if (order.status !== 'suspensa') throw conflict('A OS não está suspensa.');
      mutateOrder(id, (o, draft) => {
        const current = o.suspensions[o.suspensions.length - 1]!;
        current.endedAt = rt.now().toISOString();
        current.resumedByUserId = ctx.user.id;
        o.status = current.previousStatus;
        o.history.push(log(ctx, `OS retomada (volta para ${WORK_ORDER_STATUS_LABEL[current.previousStatus]}).`));
        audit(draft, ctx, 'os.retomar', 'os', o.id, `${o.code} retomada`);
        notify(draft, {
          title: `${o.code} retomada`,
          message: o.title,
          recipientUserIds: o.technicianUserId ? [o.technicianUserId] : [],
          exclude: ctx.user.id,
          locationId: o.locationId,
          target: orderTarget(o.id),
        });
      });
    },

    async cancelWorkOrder(ctx, id, reason) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireManage(ctx);
      if (!CANCELLABLE.includes(order.status)) throw conflict(`OS ${WORK_ORDER_STATUS_LABEL[order.status]} não pode ser cancelada.`);
      if (runningExecution(order)) throw conflict('Há execução em andamento: conclua-a ou interrompa-a antes de cancelar (DP-51).');
      const text = requireText(reason, 'a justificativa do cancelamento');
      const hadPartialWork = order.executions.length > 0;
      mutateOrder(id, (o, draft) => {
        const now = rt.now().toISOString();
        const open = o.suspensions.find((s) => !s.endedAt);
        if (open) open.endedAt = now;
        o.status = 'cancelada';
        o.cancellation = { at: now, byUserId: ctx.user.id, reason: text, hadPartialWork };
        o.history.push(log(ctx, `OS cancelada ${hadPartialWork ? 'com trabalho parcial preservado' : 'sem execução'}. Justificativa: ${text}`));
        audit(draft, ctx, 'os.cancelar', 'os', o.id, `${o.code} cancelada`);
        for (const rid of o.requestIds) {
          const r = draft.maintenanceRequests.find((x) => x.id === rid);
          if (!r) continue;
          // DP-50: a solicitação NÃO é cancelada; mantém o histórico e aguarda decisão da triagem.
          r.history.push({ at: now, actorUserId: 'sistema', text: `A ${o.code} foi cancelada. A solicitação continua "Convertida em OS" até a triagem decidir (retomar a triagem é manual).` });
          notify(draft, {
            title: `${o.code} cancelada — ${r.code}`,
            message: `A OS que atendia sua solicitação foi cancelada. Justificativa: ${text}`,
            recipientUserIds: [r.requesterUserId, ...usersWith(draft, 'manutencao.manage', r.locationId)],
            exclude: ctx.user.id,
            locationId: r.locationId,
            target: requestTarget(r.id),
            severity: 'media',
          });
        }
      });
    },

    async interruptExecution(ctx, id, reason) {
      await simulateLatency(rt);
      const { order } = loadOrder(ctx, id);
      requireManage(ctx);
      const running = runningExecution(order);
      if (!running) throw conflict('Não há execução em andamento.');
      const text = requireText(reason, 'a justificativa da interrupção');
      mutateOrder(id, (o, draft) => {
        const e = o.executions.find((x) => x.id === running.id)!;
        e.status = 'interrompida';
        e.endedAt = rt.now().toISOString();
        e.interruption = { byUserId: ctx.user.id, reason: text };
        o.history.push(log(ctx, `Execução interrompida (hipótese demonstrativa P-51). Trabalho parcial preservado. Justificativa: ${text}`));
        audit(draft, ctx, 'os.interromper-execucao', 'os', o.id, `${o.code}: execução interrompida`);
        notify(draft, {
          title: `Execução interrompida na ${o.code}`,
          message: text,
          recipientUserIds: [e.technicianUserId],
          exclude: ctx.user.id,
          locationId: o.locationId,
          target: orderTarget(o.id),
          severity: 'media',
        });
      });
    },

    async forAsset(ctx, assetId) {
      await simulateLatency(rt);
      requireModule(ctx, 'manutencao');
      const db = rt.store.getSnapshot();
      return {
        requests: visibleRequests(ctx, db).filter((r) => r.assetId === assetId).sort(byNewest).map((r) => requestItem(db, r)),
        orders: visibleOrders(ctx, db).filter((o) => o.assetId === assetId).sort(byNewest).map((o) => orderItem(db, o)),
      };
    },
  };
}
