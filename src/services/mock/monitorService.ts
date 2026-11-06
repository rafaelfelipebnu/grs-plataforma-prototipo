import { can, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import { genericNetworkDevice, SIMULATED_NETWORK } from '@/data/seed/network';
import {
  PROTOCOL_LIST,
  type CommunicationStatus,
  type Connector,
  type DataPoint,
  type Device,
  type DiscoveryCandidate,
  type Id,
  type MonitoringRule,
  type OperationalEvent,
} from '@/domain';
import type {
  CandidateView,
  HistoryItem,
  LocationEventItem,
  MonitorDeviceItem,
  MonitorPointItem,
  MonitorService,
  RuleInput,
  RuleItem,
} from '../contracts';
import { ServiceError, forbidden, notFound } from '../errors';
import {
  SEVERITY_RANK,
  canAcknowledgeEvent,
  canSeeEvent,
  classificationWithinAny,
  inScope,
  isSecurityRelevant,
  locationIndexOf,
  matchesQuery,
  normalize,
  paginate,
  simulateLatency,
  type ServiceRuntime,
} from '../internal';
import { deviceScopeLocationId, isDeviceVisible } from './assetService';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';
import { evaluatePoint, parseValue, pointHistory } from './monitorLogic';

const MIN_REASON = 5;
const POINT_ORDER = { critico: 0, alerta: 1, sem_leitura: 2, normal: 3 } as const;
const COMM_ORDER: Record<CommunicationStatus, number> = { offline: 0, instavel: 1, online: 2 };

/**
 * Sugestões explicáveis da descoberta. Correspondência com ativo: ativo na
 * localização sugerida, da classificação sugerida (ou descendente).
 */
export function suggestFor(db: Readonly<DemoDatabase>, hint: { classificationId?: Id; classificationReason?: string; locationId?: Id; locationReason?: string }) {
  const reasons: string[] = [];
  if (hint.classificationId && hint.classificationReason) reasons.push(`Classificação: ${hint.classificationReason}`);
  if (hint.locationId && hint.locationReason) reasons.push(`Localização: ${hint.locationReason}`);
  let assetId: Id | undefined;
  if (hint.classificationId && hint.locationId) {
    const match = db.assets.find((a) => a.primaryLocationId === hint.locationId && classificationWithinAny(db, a.classificationId, [hint.classificationId!]));
    if (match) {
      assetId = match.id;
      reasons.push(`Correspondência: ${match.tag} está na localização sugerida e tem a classificação sugerida.`);
    }
  }
  if (reasons.length === 0) reasons.push('Sem pistas suficientes: classificação, localização e associação precisam ser informadas pelo revisor.');
  return { classificationId: hint.classificationId, locationId: hint.locationId, assetId, reasons };
}

export function createMonitorService(rt: ServiceRuntime): MonitorService {
  const prepare = (ctx: AccessContext) => {
    requireModule(ctx, 'monitor');
    return rt.store.getSnapshot();
  };

  const requireManage = (ctx: AccessContext) => {
    if (!can(ctx, 'monitor.manage')) throw forbidden('Seu perfil pode consultar o Monitor, mas não configurar o monitoramento.');
  };

  const requireReason = (reason: string) => {
    if (reason.trim().length < MIN_REASON) throw new ServiceError('VALIDATION', 'Informe o motivo (mínimo de 5 caracteres).');
  };

  const audit = (draft: DemoDatabase, ctx: AccessContext, action: string, entityType: string, entityId: Id, summary: string) =>
    draft.auditLog.push({ id: rt.newId('aud'), at: rt.now().toISOString(), actorUserId: ctx.user.id, moduleId: 'monitor', action, entityType, entityId, summary });

  const connectorOf = (db: Readonly<DemoDatabase>, d: Device) => db.connectors.find((c) => c.id === d.connectorId);
  const paused = (db: Readonly<DemoDatabase>, d: Device) => connectorOf(db, d)?.active === false;

  const toDeviceItem = (ctx: AccessContext, db: Readonly<DemoDatabase>, device: Device): MonitorDeviceItem => {
    const locId = deviceScopeLocationId(db, device);
    const asset = device.assetId ? db.assets.find((a) => a.id === device.assetId) : undefined;
    return {
      device,
      connector: connectorOf(db, device),
      health: db.deviceHealth.find((h) => h.deviceId === device.id),
      asset: asset && inScope(ctx, asset.primaryLocationId) ? asset : undefined,
      locationPath: locId ? locationIndexOf(db).pathOf(locId) : [],
      dataPointCount: db.dataPoints.filter((p) => p.deviceId === device.id).length,
      collectionPaused: paused(db, device),
    };
  };

  const toPointItem = (ctx: AccessContext, db: Readonly<DemoDatabase>, point: DataPoint): MonitorPointItem | undefined => {
    const device = db.devices.find((d) => d.id === point.deviceId);
    if (!device || !isDeviceVisible(ctx, db, device)) return undefined;
    const asset = device.assetId ? db.assets.find((a) => a.id === device.assetId) : undefined;
    const locId = deviceScopeLocationId(db, device);
    return {
      point,
      device,
      asset: asset && inScope(ctx, asset.primaryLocationId) ? asset : undefined,
      locationPath: locId ? locationIndexOf(db).pathOf(locId) : [],
      rules: db.monitoringRules.filter((r) => r.pointId === point.id),
      collectionPaused: paused(db, device),
    };
  };

  const toEventItem = (ctx: AccessContext, db: Readonly<DemoDatabase>, event: OperationalEvent): LocationEventItem => ({
    event,
    locationPath: locationIndexOf(db).pathOf(event.locationId),
    securityRelevant: isSecurityRelevant(event),
    canAcknowledge: canAcknowledgeEvent(ctx, event),
  });

  const visibleConnectors = (ctx: AccessContext, db: Readonly<DemoDatabase>) => db.connectors.filter((c) => inScope(ctx, c.unitLocationId));

  const findPoint = (ctx: AccessContext, pointId: Id) => {
    const db = prepare(ctx);
    const point = db.dataPoints.find((p) => p.id === pointId);
    if (!point) throw notFound('Ponto de dado não encontrado.');
    const item = toPointItem(ctx, db, point);
    if (!item) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return { db, point, item };
  };

  const toCandidateView = (db: Readonly<DemoDatabase>, c: DiscoveryCandidate): CandidateView => {
    const user = c.decision ? db.users.find((u) => u.id === c.decision!.byUserId) : undefined;
    return {
      candidate: c,
      connector: db.connectors.find((x) => x.id === c.connectorId)!,
      suggestedLocationPath: c.suggestions.locationId ? locationIndexOf(db).pathOf(c.suggestions.locationId) : [],
      suggestedAsset: c.suggestions.assetId ? db.assets.find((a) => a.id === c.suggestions.assetId) : undefined,
      suggestedClassification: c.suggestions.classificationId ? db.classifications.find((x) => x.id === c.suggestions.classificationId) : undefined,
      decidedByName: user ? db.people.find((p) => p.id === user.personId)?.name : undefined,
    };
  };

  const validateRule = (ctx: AccessContext, db: Readonly<DemoDatabase>, input: RuleInput) => {
    const errors: string[] = [];
    if (input.name.trim().length < 3) errors.push('Informe o nome da regra (mínimo de 3 caracteres).');
    const point = db.dataPoints.find((p) => p.id === input.pointId);
    if (!point) errors.push('Selecione o ponto de dado.');
    else if (!toPointItem(ctx, db, point)) errors.push('O ponto está fora do seu escopo.');
    const threshold = parseValue(input.threshold);
    if (threshold === '') errors.push('Informe o limite.');
    if ((input.operator === 'maior' || input.operator === 'menor') && typeof threshold !== 'number') errors.push('Use um limite numérico para "maior que" e "menor que".');
    if (errors.length) throw new ServiceError('VALIDATION', errors.join(' '));
    return threshold;
  };

  const ruleItem = (ctx: AccessContext, db: Readonly<DemoDatabase>, rule: MonitoringRule): RuleItem | undefined => {
    const point = db.dataPoints.find((p) => p.id === rule.pointId);
    const item = point ? toPointItem(ctx, db, point) : undefined;
    if (!point || !item) return undefined;
    return {
      rule,
      point,
      device: item.device,
      asset: item.asset,
      locationPath: item.locationPath,
      activeAlert: db.events.find((e) => e.ruleId === rule.id && e.status === 'ativo'),
    };
  };

  return {
    async overview(ctx) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const devices = db.devices.filter((d) => isDeviceVisible(ctx, db, d));
      const communication: Record<CommunicationStatus, number> = { online: 0, instavel: 0, offline: 0 };
      for (const d of devices) {
        const h = db.deviceHealth.find((x) => x.deviceId === d.id);
        if (h) communication[h.communication] += 1;
      }
      const points = db.dataPoints.map((p) => toPointItem(ctx, db, p)).filter((x): x is MonitorPointItem => Boolean(x));
      const connectors = visibleConnectors(ctx, db);
      return {
        connectors: { total: connectors.length, active: connectors.filter((c) => c.active).length },
        communication,
        devicesTotal: devices.length,
        pointsOutOfNormal: points.filter((p) => p.point.status !== 'normal').length,
        pendingCandidates: db.discoveryCandidates.filter((c) => c.status === 'pendente' && connectors.some((x) => x.id === c.connectorId)).length,
        activeAlerts: db.events.filter((e) => e.source === 'monitor' && e.status === 'ativo' && canSeeEvent(ctx, e)).length,
        activeRules: db.monitoringRules.filter((r) => r.active && points.some((p) => p.point.id === r.pointId)).length,
        degradedDevices: devices
          .map((d) => toDeviceItem(ctx, db, d))
          .filter((d) => d.collectionPaused || (d.health && d.health.communication !== 'online'))
          .sort((a, b) => COMM_ORDER[a.health?.communication ?? 'online'] - COMM_ORDER[b.health?.communication ?? 'online']),
        abnormalPoints: points.filter((p) => p.point.status !== 'normal').sort((a, b) => POINT_ORDER[a.point.status] - POINT_ORDER[b.point.status]).slice(0, 8),
      };
    },

    async listConnectors(ctx) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const index = locationIndexOf(db);
      return visibleConnectors(ctx, db)
        .map((connector) => ({
          connector,
          unitName: index.get(connector.unitLocationId)?.name ?? '—',
          deviceCount: db.devices.filter((d) => d.connectorId === connector.id).length,
          pendingCandidates: db.discoveryCandidates.filter((c) => c.connectorId === connector.id && c.status === 'pendente').length,
          lastRun: db.discoveryRuns.filter((r) => r.connectorId === connector.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0],
        }))
        .sort((a, b) => a.connector.name.localeCompare(b.connector.name, 'pt-BR'));
    },

    async createConnector(ctx, input, reason) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      requireManage(ctx);
      requireReason(reason);
      const errors: string[] = [];
      if (input.name.trim().length < 3) errors.push('Informe o nome do conector (mínimo de 3 caracteres).');
      if (!PROTOCOL_LIST.includes(input.protocol)) errors.push('Selecione o protocolo.');
      const unit = locationIndexOf(db).get(input.unitLocationId);
      if (!unit || unit.parentId !== null) errors.push('Selecione a unidade onde o agente está instalado.');
      else if (!inScope(ctx, unit.id)) errors.push('A unidade está fora do seu escopo.');
      if (input.networkScope.trim().length < 4) errors.push('Informe a faixa de rede ou o endpoint.');
      if (/senha|password|token|secret/i.test(input.networkScope)) errors.push('Não informe credenciais: o protótipo não coleta segredos.');
      if (db.connectors.some((c) => normalize(c.name) === normalize(input.name))) errors.push('Já existe um conector com este nome.');
      if (errors.length) throw new ServiceError('VALIDATION', errors.join(' '));
      const connector: Connector = {
        id: rt.newId('conn'),
        name: input.name.trim(),
        protocol: input.protocol,
        unitLocationId: input.unitLocationId,
        networkScope: input.networkScope.trim(),
        active: true,
        simulated: true,
      };
      rt.store.mutate((draft) => {
        draft.connectors.push(connector);
        audit(draft, ctx, 'conector.criar', 'conector', connector.id, `Conector "${connector.name}" (${connector.protocol}) configurado. Motivo: ${reason.trim()}`);
      });
      return connector;
    },

    async setConnectorActive(ctx, id, active, reason) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      requireManage(ctx);
      requireReason(reason);
      const connector = db.connectors.find((c) => c.id === id);
      if (!connector) throw notFound('Conector não encontrado.');
      if (!inScope(ctx, connector.unitLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      if (connector.active === active) throw new ServiceError('CONFLICT', active ? 'O conector já está ativo.' : 'O conector já está desativado.');
      rt.store.mutate((draft) => {
        draft.connectors.find((c) => c.id === id)!.active = active;
        audit(draft, ctx, active ? 'conector.ativar' : 'conector.desativar', 'conector', id, `Conector "${connector.name}" ${active ? 'reativado' : 'desativado (coleta pausada)'}. Motivo: ${reason.trim()}`);
      });
      return rt.store.getSnapshot().connectors.find((c) => c.id === id)!;
    },

    async runDiscovery(ctx, connectorId) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      requireManage(ctx);
      const connector = db.connectors.find((c) => c.id === connectorId);
      if (!connector) throw notFound('Conector não encontrado.');
      if (!inScope(ctx, connector.unitLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      if (!connector.active) throw new ServiceError('VALIDATION', 'Ative o conector antes de executar a descoberta.');
      // Rede simulada: inventário fixo dos conectores de demonstração; conectores novos encontram um equipamento genérico.
      const network = SIMULATED_NETWORK[connectorId] ?? [genericNetworkDevice(connector.protocol, 1)];
      const known = new Set([
        ...db.discoveryCandidates.filter((c) => c.connectorId === connectorId).map((c) => c.address),
        ...db.devices.filter((d) => d.connectorId === connectorId && d.address).map((d) => d.address!),
      ]);
      const now = rt.now().toISOString();
      const runId = rt.newId('run');
      const candidates: DiscoveryCandidate[] = network
        .filter((n) => !known.has(n.address))
        .map((n) => ({
          id: rt.newId('cand'),
          connectorId,
          runId,
          discoveredAt: now,
          address: n.address,
          name: n.name,
          deviceType: n.deviceType,
          manufacturer: n.manufacturer,
          model: n.model,
          protocol: connector.protocol,
          metadata: n.metadata,
          points: n.points,
          suggestions: suggestFor(db, n.hint),
          status: 'pendente',
        }));
      const run = {
        id: runId,
        connectorId,
        byUserId: ctx.user.id,
        startedAt: now,
        found: network.length + db.devices.filter((d) => d.connectorId === connectorId && !d.address).length,
        newCandidates: candidates.length,
      };
      rt.store.mutate((draft) => {
        draft.discoveryRuns.push(run);
        draft.discoveryCandidates.push(...candidates);
        draft.connectors.find((c) => c.id === connectorId)!.lastDiscoveryAt = now;
        audit(
          draft,
          ctx,
          'descoberta.executar',
          'conector',
          connectorId,
          `Descoberta (somente leitura) em "${connector.name}": ${candidates.length} novo(s) dispositivo(s) aguardando revisão na Central.`,
        );
      });
      return { run, candidates };
    },

    async listRuns(ctx) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const ids = new Set(visibleConnectors(ctx, db).map((c) => c.id));
      return db.discoveryRuns
        .filter((r) => ids.has(r.connectorId))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map((r) => {
          const user = db.users.find((u) => u.id === r.byUserId);
          return {
            ...r,
            connectorName: db.connectors.find((c) => c.id === r.connectorId)?.name ?? r.connectorId,
            byName: db.people.find((p) => p.id === user?.personId)?.name ?? r.byUserId,
          };
        });
    },

    async listCandidates(ctx, q) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const ids = new Set(visibleConnectors(ctx, db).map((c) => c.id));
      return db.discoveryCandidates
        .filter((c) => ids.has(c.connectorId) && (!q.status || c.status === q.status) && (!q.connectorId || c.connectorId === q.connectorId))
        .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt) || a.name.localeCompare(b.name, 'pt-BR'))
        .map((c) => toCandidateView(db, c));
    },

    async listDevices(ctx, q) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const items = db.devices
        .filter((d) => isDeviceVisible(ctx, db, d))
        .map((d) => toDeviceItem(ctx, db, d))
        .filter(
          (i) =>
            (!q.communication || i.health?.communication === q.communication) &&
            (!q.connectorId || i.device.connectorId === q.connectorId) &&
            (!q.search?.trim() || matchesQuery(q.search, i.device.name, i.device.deviceType, i.device.protocol, i.asset?.tag, i.device.address)),
        )
        .sort((a, b) => COMM_ORDER[a.health?.communication ?? 'online'] - COMM_ORDER[b.health?.communication ?? 'online'] || a.device.name.localeCompare(b.device.name, 'pt-BR'));
      return paginate(items, q.page, q.pageSize);
    },

    async listPoints(ctx, q) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const items = db.dataPoints
        .map((p) => toPointItem(ctx, db, p))
        .filter((x): x is MonitorPointItem => Boolean(x))
        .filter((i) => (!q.status || i.point.status === q.status) && (!q.search?.trim() || matchesQuery(q.search, i.point.name, i.device.name, i.asset?.tag, i.asset?.name)))
        .sort((a, b) => POINT_ORDER[a.point.status] - POINT_ORDER[b.point.status] || a.point.name.localeCompare(b.point.name, 'pt-BR'));
      return paginate(items, q.page, q.pageSize);
    },

    async getPoint(ctx, pointId) {
      await simulateLatency(rt);
      const { db, point, item } = findPoint(ctx, pointId);
      return {
        ...item,
        history: pointHistory(db, point, rt.now()),
        activeAlerts: db.events
          .filter((e) => e.status === 'ativo' && e.ruleId && item.rules.some((r) => r.id === e.ruleId) && canSeeEvent(ctx, e))
          .map((e) => toEventItem(ctx, db, e)),
        canManageRules: can(ctx, 'monitor.manage'),
      };
    },

    async simulateReading(ctx, pointId, raw) {
      await simulateLatency(rt);
      const { point, item } = findPoint(ctx, pointId);
      if (item.collectionPaused) throw new ServiceError('VALIDATION', 'A coleta está pausada: o conector deste dispositivo está desativado.');
      const value = parseValue(raw);
      if (value === '') throw new ServiceError('VALIDATION', 'Informe o valor da leitura.');
      if (typeof point.value === 'number' && typeof value !== 'number') throw new ServiceError('VALIDATION', 'Este ponto recebe valores numéricos.');
      const now = rt.now().toISOString();
      let triggered: OperationalEvent[] = [];
      rt.store.mutate((draft) => {
        const p = draft.dataPoints.find((x) => x.id === pointId)!;
        p.value = value;
        p.updatedAt = now;
        triggered = evaluatePoint(rt, draft, pointId, ctx.user.id);
        draft.pointReadings.push({ pointId, at: now, value, status: p.status });
        const health = draft.deviceHealth.find((h) => h.deviceId === p.deviceId);
        if (health) {
          health.communication = 'online';
          health.lastSeenAt = now;
        }
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: 'sistema',
          moduleId: 'monitor',
          action: 'simulacao.leitura',
          entityType: 'dispositivo',
          entityId: p.deviceId,
          summary: `Leitura simulada: ${p.name} = ${String(value)}${p.unit ? ` ${p.unit}` : ''}.`,
        });
      });
      return { point: rt.store.getSnapshot().dataPoints.find((p) => p.id === pointId)!, triggered };
    },

    async listRules(ctx) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      return db.monitoringRules
        .map((r) => ruleItem(ctx, db, r))
        .filter((x): x is RuleItem => Boolean(x))
        .sort((a, b) => Number(b.rule.active) - Number(a.rule.active) || SEVERITY_RANK[b.rule.severity] - SEVERITY_RANK[a.rule.severity] || a.rule.name.localeCompare(b.rule.name, 'pt-BR'));
    },

    async createRule(ctx, input, reason) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      requireManage(ctx);
      requireReason(reason);
      const threshold = validateRule(ctx, db, input);
      const rule: MonitoringRule = {
        id: rt.newId('rule'),
        name: input.name.trim(),
        pointId: input.pointId,
        operator: input.operator,
        threshold,
        severity: input.severity,
        active: true,
        createdByUserId: ctx.user.id,
        createdAt: rt.now().toISOString(),
      };
      let triggered: OperationalEvent[] = [];
      rt.store.mutate((draft) => {
        draft.monitoringRules.push(rule);
        audit(draft, ctx, 'regra.criar', 'regra', rule.id, `Regra "${rule.name}" criada. Motivo: ${reason.trim()}`);
        triggered = evaluatePoint(rt, draft, rule.pointId, ctx.user.id);
      });
      return { rule: rt.store.getSnapshot().monitoringRules.find((r) => r.id === rule.id)!, triggered };
    },

    async updateRule(ctx, id, input, reason) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      requireManage(ctx);
      requireReason(reason);
      const current = db.monitoringRules.find((r) => r.id === id);
      if (!current || !ruleItem(ctx, db, current)) throw notFound('Regra não encontrada.');
      const threshold = validateRule(ctx, db, input);
      let triggered: OperationalEvent[] = [];
      rt.store.mutate((draft) => {
        const r = draft.monitoringRules.find((x) => x.id === id)!;
        const previousPoint = r.pointId;
        Object.assign(r, { name: input.name.trim(), pointId: input.pointId, operator: input.operator, threshold, severity: input.severity });
        audit(draft, ctx, 'regra.editar', 'regra', id, `Regra "${r.name}" alterada (${input.operator} ${String(threshold)}). Motivo: ${reason.trim()}`);
        if (previousPoint !== r.pointId) evaluatePoint(rt, draft, previousPoint, ctx.user.id);
        triggered = evaluatePoint(rt, draft, r.pointId, ctx.user.id);
      });
      return { rule: rt.store.getSnapshot().monitoringRules.find((r) => r.id === id)!, triggered };
    },

    async setRuleActive(ctx, id, active, reason) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      requireManage(ctx);
      requireReason(reason);
      const current = db.monitoringRules.find((r) => r.id === id);
      if (!current || !ruleItem(ctx, db, current)) throw notFound('Regra não encontrada.');
      if (current.active === active) throw new ServiceError('CONFLICT', active ? 'A regra já está ativa.' : 'A regra já está desativada.');
      let triggered: OperationalEvent[] = [];
      rt.store.mutate((draft) => {
        const r = draft.monitoringRules.find((x) => x.id === id)!;
        r.active = active;
        audit(draft, ctx, active ? 'regra.ativar' : 'regra.desativar', 'regra', id, `Regra "${r.name}" ${active ? 'ativada' : 'desativada'}. Motivo: ${reason.trim()}`);
        triggered = evaluatePoint(rt, draft, r.pointId, ctx.user.id);
      });
      return { rule: rt.store.getSnapshot().monitoringRules.find((r) => r.id === id)!, triggered };
    },

    async listAlerts(ctx, q) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const items = db.events
        .filter((e) => e.source === 'monitor' && canSeeEvent(ctx, e) && (!q.status || e.status === q.status))
        .sort((a, b) => (a.status === b.status ? 0 : a.status === 'ativo' ? -1 : 1) || SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.occurredAt.localeCompare(a.occurredAt));
      const page = paginate(items, q.page, q.pageSize);
      return { ...page, items: page.items.map((e) => toEventItem(ctx, db, e)) };
    },

    async history(ctx, q) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const userName = (id: string) => {
        if (id === 'sistema') return 'Sistema (simulação)';
        const user = db.users.find((u) => u.id === id);
        return db.people.find((p) => p.id === user?.personId)?.name ?? id;
      };
      /** Escopo do registro: conector → unidade; dispositivo → local; regra → ponto → dispositivo. */
      const entityLocation = (type: string, id: string): Id | undefined => {
        if (type === 'conector') return db.connectors.find((c) => c.id === id)?.unitLocationId;
        const deviceId = type === 'dispositivo' ? id : type === 'regra' ? db.dataPoints.find((p) => p.id === db.monitoringRules.find((r) => r.id === id)?.pointId)?.deviceId : undefined;
        const device = db.devices.find((d) => d.id === deviceId);
        return device ? deviceScopeLocationId(db, device) : undefined;
      };
      const items: HistoryItem[] = db.auditLog
        .filter((a) => a.moduleId === 'monitor' && inScope(ctx, entityLocation(a.entityType, a.entityId)))
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((a) => ({ id: a.id, at: a.at, actorName: userName(a.actorUserId), moduleId: 'monitor', action: a.action, summary: a.summary }));
      return paginate(items, q.page, q.pageSize ?? 15);
    },

    pointOptions(ctx) {
      const db = prepare(ctx);
      return db.dataPoints
        .map((p) => toPointItem(ctx, db, p))
        .filter((x): x is MonitorPointItem => Boolean(x))
        .map(({ point, device }) => ({ point, device }))
        .sort((a, b) => a.device.name.localeCompare(b.device.name, 'pt-BR') || a.point.name.localeCompare(b.point.name, 'pt-BR'));
    },
  };
}
