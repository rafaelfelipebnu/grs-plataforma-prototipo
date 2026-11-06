import { can, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import {
  CONDITION_LABEL,
  PERIOD_MINUTES,
  type Asset,
  type Criticality,
  type Id,
  type OperationalCondition,
  type OperationalEvent,
} from '@/domain';
import type {
  Asset360,
  AssetInput,
  AssetListItem,
  CentralIndicators,
  CentralService,
  HistoryItem,
  ImportPreview,
  ImportRow,
  LocationEventItem,
  LocationFilter,
} from '../contracts';
import { ServiceError, forbidden, notFound } from '../errors';
import {
  SEVERITY_RANK,
  canAcknowledgeEvent,
  canSeeEvent,
  hasSecurityClassification,
  inScope,
  isSecurityRelevant,
  locationIndexOf,
  matchesQuery,
  normalize,
  simulateLatency,
  type ServiceRuntime,
} from '../internal';
import { buildAssetSummary, deviceScopeLocationId, isDeviceVisible, resolveResponsibility } from './assetService';
import { computeMembership } from './groupLogic';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';
import { MODULE_NAMES } from './names';

const CONDITION_RANK: Record<OperationalCondition, number> = { critico: 4, indisponivel: 3, atencao: 2, normal: 1 };
const CRITICALITY_RANK: Record<Criticality, number> = { alta: 3, media: 2, baixa: 1 };
const MIN_REASON = 5;

function paginate<T>(items: T[], page = 1, pageSize = 10) {
  const size = Math.max(1, pageSize);
  const last = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), last);
  return { items: items.slice((current - 1) * size, current * size), total: items.length, page: current, pageSize: size };
}

/** Similaridade simples de nomes para sinalizar possíveis duplicidades (não bloqueia). */
function similarNames(a: string, b: string): boolean {
  const na = normalize(a).replace(/[^a-z0-9 ]/g, ' ');
  const nb = normalize(b).replace(/[^a-z0-9 ]/g, ' ');
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  const common = [...wa].filter((w) => wb.has(w)).length;
  return common >= 2 && common / Math.min(wa.size, wb.size) >= 0.6;
}

export function createCentralService(rt: ServiceRuntime): CentralService {
  /** Pré-condições: Central disponível e local do filtro no escopo. */
  const prepare = (ctx: AccessContext, filter: LocationFilter = {}) => {
    requireModule(ctx, 'central');
    if (filter.locationId && !inScope(ctx, filter.locationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    const db = rt.store.getSnapshot();
    const index = locationIndexOf(db);
    const includeDescendants = filter.includeDescendants !== false;
    /** Local pertence ao recorte (escopo + filtro). */
    const inFilter = (locationId: Id | undefined): boolean => {
      if (!locationId || !inScope(ctx, locationId)) return false;
      if (!filter.locationId) return true;
      return includeDescendants ? index.isDescendantOrSelf(locationId, filter.locationId) : locationId === filter.locationId;
    };
    return { db, index, inFilter };
  };

  const requireManage = (ctx: AccessContext) => {
    if (!can(ctx, 'central.manage')) throw forbidden('Seu perfil não pode alterar o cadastro da Central.');
  };

  const requireReason = (reason: string) => {
    if (reason.trim().length < MIN_REASON) throw new ServiceError('VALIDATION', 'Informe o motivo da alteração (mínimo de 5 caracteres).');
  };

  const activeEventsFor = (ctx: AccessContext, db: Readonly<DemoDatabase>) =>
    db.events.filter((e) => e.status === 'ativo' && canSeeEvent(ctx, e));

  const toListItem = (db: Readonly<DemoDatabase>, ctx: AccessContext, asset: Asset, active: OperationalEvent[]): AssetListItem => ({
    asset,
    classificationName: db.classifications.find((c) => c.id === asset.classificationId)?.name ?? '—',
    locationPath: locationIndexOf(db).pathOf(asset.primaryLocationId),
    deviceCount: db.devices.filter((d) => d.assetId === asset.id && isDeviceVisible(ctx, db, d)).length,
    activeAlerts: active.filter((e) => e.assetId === asset.id).length,
  });

  const toEventItem = (ctx: AccessContext, db: Readonly<DemoDatabase>, event: OperationalEvent): LocationEventItem => ({
    event,
    locationPath: locationIndexOf(db).pathOf(event.locationId),
    securityRelevant: isSecurityRelevant(event),
    canAcknowledge: canAcknowledgeEvent(ctx, event),
  });

  const indicatorsFor = (ctx: AccessContext, db: Readonly<DemoDatabase>, assets: Asset[], inFilter: (id?: Id) => boolean): CentralIndicators => {
    const devices = db.devices.filter((d) => inFilter(deviceScopeLocationId(db, d)));
    const withDevice = assets.filter((a) => db.devices.some((d) => d.assetId === a.id)).length;
    const complete = assets.filter((a) => a.classificationId && a.primaryLocationId && resolveResponsibility(db, a).personId).length;
    const byCriticality: Record<Criticality, number> = { alta: 0, media: 0, baixa: 0 };
    for (const a of assets) byCriticality[a.criticality] += 1;
    return {
      totalAssets: assets.length,
      withDevicePercent: assets.length ? Math.round((withDevice / assets.length) * 100) : 0,
      notNormal: assets.filter((a) => a.condition !== 'normal').length,
      byCriticality,
      devices: {
        total: devices.length,
        confirmed: devices.filter((d) => d.locationStatus === 'confirmada').length,
        suggested: devices.filter((d) => d.locationStatus === 'sugerida').length,
        unidentified: devices.filter((d) => d.locationStatus === 'nao_identificada').length,
      },
      discoveredIncorporated: devices.filter((d) => d.origin === 'descoberta' && d.locationStatus === 'confirmada' && d.assetId).length,
      duplicatesAvoided: db.centralStats.duplicatesAvoided,
      completenessPercent: assets.length ? Math.round((complete / assets.length) * 100) : 100,
      activeAlerts: activeEventsFor(ctx, db).filter((e) => inFilter(e.locationId)).length,
    };
  };

  const validateInput = (ctx: AccessContext, db: Readonly<DemoDatabase>, input: AssetInput, excludeId?: Id) => {
    const errors: string[] = [];
    if (!input.tag.trim()) errors.push('Informe a tag.');
    if (!input.name.trim()) errors.push('Informe o nome.');
    if (!db.classifications.some((c) => c.id === input.classificationId)) errors.push('Selecione uma classificação válida.');
    if (!input.primaryLocationId) errors.push('A localização principal é obrigatória.');
    else if (!inScope(ctx, input.primaryLocationId)) errors.push('A localização principal está fora do seu escopo.');
    if (input.servedLocationIds.some((l) => !db.locations.some((x) => x.id === l))) errors.push('Local atendido inválido.');
    if (!['baixa', 'media', 'alta'].includes(input.criticality)) errors.push('Criticidade inválida.');
    if (input.dependsOnAssetIds.includes(excludeId ?? '__')) errors.push('Um ativo não pode depender de si mesmo.');
    const tagConflict = db.assets.find((a) => a.id !== excludeId && normalize(a.tag) === normalize(input.tag));
    if (tagConflict) {
      errors.push(
        inScope(ctx, tagConflict.primaryLocationId)
          ? `A tag ${input.tag} já pertence a ${tagConflict.tag} · ${tagConflict.name}.`
          : `A tag ${input.tag} já está em uso por um ativo fora do seu escopo.`,
      );
    }
    if (errors.length) throw new ServiceError('VALIDATION', errors.join(' '));
  };

  const historyFor = (db: Readonly<DemoDatabase>, assetId: Id, ctx: AccessContext): HistoryItem[] => {
    const userName = (id: string) => {
      if (id === 'sistema') return 'Sistema (simulação)';
      const user = db.users.find((u) => u.id === id);
      return db.people.find((p) => p.id === user?.personId)?.name ?? id;
    };
    const assetEvents = db.events.filter((e) => e.assetId === assetId && canSeeEvent(ctx, e));
    const items: HistoryItem[] = [
      ...db.auditLog
        .filter((a) => a.entityId === assetId || assetEvents.some((e) => e.id === a.entityId) || (a.entityType === 'dispositivo' && db.devices.find((d) => d.id === a.entityId)?.assetId === assetId))
        .map((a) => ({ id: a.id, at: a.at, actorName: userName(a.actorUserId), moduleId: a.moduleId, action: a.action, summary: a.summary })),
      ...db.groupHistory
        .filter((h) => h.assetId === assetId)
        .map((h) => ({
          id: h.id,
          at: h.at,
          actorName: userName(h.actorUserId),
          moduleId: 'central' as const,
          action: h.action,
          summary: `${db.groups.find((g) => g.id === h.groupId)?.name ?? 'Grupo'}: ${h.summary}`,
        })),
      ...assetEvents.map((e) => ({
        id: `ev-${e.id}`,
        at: e.occurredAt,
        actorName: e.source === 'controle-acesso' ? 'Controle de Acesso' : MODULE_NAMES[e.source],
        moduleId: e.source === 'controle-acesso' ? ('security-hub' as const) : e.source,
        action: 'evento.ocorrer',
        summary: `Evento ${e.code}: ${e.title}`,
      })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at));
  };

  const parseCsv = (csv: string): { columns: string[]; rows: Record<string, string>[] } => {
    const lines = csv.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { columns: [], rows: [] };
    const sep = lines[0]!.includes(';') ? ';' : ',';
    const columns = lines[0]!.split(sep).map((c) => normalize(c));
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(sep);
      return Object.fromEntries(columns.map((c, i) => [c, (cells[i] ?? '').trim()]));
    });
    return { columns, rows };
  };

  const service: CentralService = {
    async overview(ctx, filter) {
      await simulateLatency(rt);
      const { db, index, inFilter } = prepare(ctx, filter);
      const assets = db.assets.filter((a) => inFilter(a.primaryLocationId));
      const active = activeEventsFor(ctx, db);
      const location = filter.locationId ? index.get(filter.locationId) : undefined;
      const childBases = filter.locationId
        ? index.childrenOf(filter.locationId).filter((c) => inScope(ctx, c.id))
        : index.all().filter((l) => inScope(ctx, l.id) && (!l.parentId || !inScope(ctx, l.parentId)));
      return {
        location,
        path: filter.locationId ? index.pathOf(filter.locationId) : [],
        responsible: location?.responsiblePersonId ? db.people.find((p) => p.id === location.responsiblePersonId) : undefined,
        indicators: indicatorsFor(ctx, db, assets, inFilter),
        attentionAssets: assets
          .filter((a) => a.condition !== 'normal')
          .sort((a, b) => CONDITION_RANK[b.condition] - CONDITION_RANK[a.condition] || CRITICALITY_RANK[b.criticality] - CRITICALITY_RANK[a.criticality])
          .slice(0, 6)
          .map((a) => toListItem(db, ctx, a, active)),
        attentionEvents: active
          .filter((e) => inFilter(e.locationId))
          .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.occurredAt.localeCompare(a.occurredAt))
          .slice(0, 6)
          .map((e) => toEventItem(ctx, db, e)),
        children: (filter.includeDescendants === false ? [] : childBases)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          .map((child) => {
            const subtree = index.subtreeIds(child.id);
            const childAssets = assets.filter((a) => subtree.has(a.primaryLocationId));
            return {
              location: child,
              assets: childAssets.length,
              notNormal: childAssets.filter((a) => a.condition !== 'normal').length,
              activeAlerts: active.filter((e) => subtree.has(e.locationId)).length,
            };
          }),
      };
    },

    async listAssets(ctx, q) {
      await simulateLatency(rt);
      const { db, inFilter } = prepare(ctx, q);
      const active = activeEventsFor(ctx, db);
      const group = q.groupId ? db.groups.find((g) => g.id === q.groupId) : undefined;
      const groupMembers = group ? new Set(computeMembership(db, group).members.map((m) => m.asset.id)) : undefined;
      const filtered = db.assets.filter((a) => {
        if (!inFilter(a.primaryLocationId)) return false;
        if (q.criticality && a.criticality !== q.criticality) return false;
        if (q.condition && a.condition !== q.condition) return false;
        if (q.classificationId) {
          let cls = db.classifications.find((c) => c.id === a.classificationId);
          let match = false;
          while (cls) {
            if (cls.id === q.classificationId) {
              match = true;
              break;
            }
            const parent = cls.parentId;
            cls = parent ? db.classifications.find((c) => c.id === parent) : undefined;
          }
          if (!match) return false;
        }
        const hasDevice = db.devices.some((d) => d.assetId === a.id);
        if (q.withDevice === 'com' && !hasDevice) return false;
        if (q.withDevice === 'sem' && hasDevice) return false;
        if (groupMembers && !groupMembers.has(a.id)) return false;
        if (q.search?.trim() && !matchesQuery(q.search, a.tag, a.name, a.description)) return false;
        return true;
      });
      filtered.sort((a, b) =>
        q.sort === 'condicao'
          ? CONDITION_RANK[b.condition] - CONDITION_RANK[a.condition] || a.tag.localeCompare(b.tag)
          : q.sort === 'criticidade'
            ? CRITICALITY_RANK[b.criticality] - CRITICALITY_RANK[a.criticality] || a.tag.localeCompare(b.tag)
            : a.tag.localeCompare(b.tag),
      );
      const page = paginate(filtered, q.page, q.pageSize);
      return { ...page, items: page.items.map((a) => toListItem(db, ctx, a, active)) };
    },

    async listDevices(ctx, q) {
      await simulateLatency(rt);
      const { db, index, inFilter } = prepare(ctx, q);
      const monitor = isModuleAvailable(ctx, 'monitor');
      const filtered = db.devices
        .filter(
          (d) =>
            inFilter(deviceScopeLocationId(db, d)) &&
            (!q.locationStatus || d.locationStatus === q.locationStatus) &&
            (!q.search?.trim() || matchesQuery(q.search, d.name, d.deviceType, d.manufacturer, d.model, d.protocol)),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      const page = paginate(filtered, q.page, q.pageSize);
      return {
        ...page,
        items: page.items.map((device) => {
          const locId = device.locationStatus === 'confirmada' ? device.locationId : device.suggestedLocationId;
          const asset = device.assetId ? db.assets.find((a) => a.id === device.assetId) : undefined;
          return {
            device,
            locationPath: locId ? index.pathOf(locId) : [],
            asset: asset && inScope(ctx, asset.primaryLocationId) ? asset : undefined,
            health: monitor ? db.deviceHealth.find((h) => h.deviceId === device.id) : undefined,
            dataPointCount: db.dataPoints.filter((p) => p.deviceId === device.id).length,
          };
        }),
      };
    },

    async listDataPoints(ctx, q) {
      await simulateLatency(rt);
      const { db, index, inFilter } = prepare(ctx, q);
      requireModule(ctx, 'monitor');
      const devices = new Map(db.devices.filter((d) => inFilter(deviceScopeLocationId(db, d))).map((d) => [d.id, d]));
      const filtered = db.dataPoints
        .filter((p) => {
          const device = devices.get(p.deviceId);
          if (!device) return false;
          if (q.status && p.status !== q.status) return false;
          const asset = device.assetId ? db.assets.find((a) => a.id === device.assetId) : undefined;
          return !q.search?.trim() || matchesQuery(q.search, p.name, device.name, asset?.tag, asset?.name);
        })
        .sort((a, b) => {
          const order = { critico: 0, alerta: 1, sem_leitura: 2, normal: 3 } as const;
          return order[a.status] - order[b.status] || a.name.localeCompare(b.name, 'pt-BR');
        });
      const page = paginate(filtered, q.page, q.pageSize);
      return {
        ...page,
        items: page.items.map((point) => {
          const device = devices.get(point.deviceId)!;
          const asset = device.assetId ? db.assets.find((a) => a.id === device.assetId) : undefined;
          const locId = deviceScopeLocationId(db, device);
          return { point, device, asset, locationPath: locId ? index.pathOf(locId) : [] };
        }),
      };
    },

    async listEvents(ctx, q) {
      await simulateLatency(rt);
      const { db, inFilter } = prepare(ctx, q);
      const start = q.period ? new Date(rt.now().getTime() - PERIOD_MINUTES[q.period] * 60_000).toISOString() : undefined;
      const filtered = db.events
        .filter(
          (e) =>
            canSeeEvent(ctx, e) &&
            inFilter(e.locationId) &&
            (!q.assetId || e.assetId === q.assetId) &&
            (!q.source || e.source === q.source) &&
            (!q.category || e.category === q.category) &&
            (!q.severities?.length || q.severities.includes(e.severity)) &&
            (!q.status || e.status === q.status) &&
            (!start || e.occurredAt >= start),
        )
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      const page = paginate(filtered, q.page, q.pageSize);
      return { ...page, items: page.items.map((e) => toEventItem(ctx, db, e)) };
    },

    async getAsset360(ctx, id) {
      await simulateLatency(rt);
      const { db, index } = prepare(ctx);
      const asset = db.assets.find((a) => a.id === id);
      if (!asset) throw notFound('Ativo não encontrado.');
      if (!inScope(ctx, asset.primaryLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      const summary = buildAssetSummary(ctx, db, asset);

      // Fatores de impacto operacional (o índice consolidado ainda não foi definido — Q-04).
      const direct = db.assets.filter((a) => a.relationships.some((r) => r.type === 'depende-de' && r.targetAssetId === asset.id));
      const seen = new Set<Id>([asset.id, ...direct.map((a) => a.id)]);
      const indirect: Asset[] = [];
      const queue = [...direct];
      while (queue.length) {
        const current = queue.shift()!;
        for (const dep of db.assets.filter((a) => a.relationships.some((r) => r.type === 'depende-de' && r.targetAssetId === current.id))) {
          if (seen.has(dep.id)) continue;
          seen.add(dep.id);
          indirect.push(dep);
          queue.push(dep);
        }
      }
      const visible = (a: Asset) => inScope(ctx, a.primaryLocationId);

      return {
        ...summary,
        groups: db.groups
          .filter((g) => !g.scopeLocationId || inScope(ctx, g.scopeLocationId))
          .map((group) => {
            const m = computeMembership(db, group);
            const member = m.members.find((x) => x.asset.id === id);
            const excepted = m.excepted.some((x) => x.asset.id === id);
            return { group, viaRules: Boolean(member?.ruleIds.length), manual: Boolean(member?.manual), excepted };
          })
          .filter((l) => l.viaRules || l.manual || l.excepted),
        events: db.events
          .filter((e) => e.assetId === id && canSeeEvent(ctx, e))
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
          .map((e) => toEventItem(ctx, db, e)),
        impact: {
          servedLocations: asset.servedLocationIds.map((l) => index.get(l)).filter((l): l is NonNullable<typeof l> => Boolean(l)),
          directDependents: direct.filter(visible),
          indirectDependents: indirect.filter(visible),
          securitySystemsAffected: [...direct, ...indirect].filter((a) => visible(a) && hasSecurityClassification(db, a.classificationId)),
        },
        history: historyFor(db, id, ctx),
        canManage: can(ctx, 'central.manage'),
      } satisfies Asset360;
    },

    classifications() {
      return rt.store.getSnapshot().classifications;
    },

    assignablePeople(ctx) {
      const db = rt.store.getSnapshot();
      return db.people
        .filter((p) => p.personType === 'colaborador' && inScope(ctx, p.referenceLocationId))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },

    assetOptions(ctx) {
      return rt.store
        .getSnapshot()
        .assets.filter((a) => inScope(ctx, a.primaryLocationId))
        .sort((a, b) => a.tag.localeCompare(b.tag));
    },

    checkDuplicates(ctx, input, excludeId) {
      const db = rt.store.getSnapshot();
      const tag = input.tag.trim();
      const tagConflict = tag ? db.assets.find((a) => a.id !== excludeId && normalize(a.tag) === normalize(tag)) : undefined;
      const similar =
        input.name.trim() && input.primaryLocationId
          ? db.assets.filter(
              (a) =>
                a.id !== excludeId &&
                a.id !== tagConflict?.id &&
                a.primaryLocationId === input.primaryLocationId &&
                inScope(ctx, a.primaryLocationId) &&
                similarNames(a.name, input.name),
            )
          : [];
      // Tag em uso fora do escopo: informa o conflito sem expor dados do ativo.
      const visibleConflict = tagConflict && inScope(ctx, tagConflict.primaryLocationId);
      return { tagConflict: visibleConflict ? tagConflict : undefined, tagTakenOutOfScope: Boolean(tagConflict && !visibleConflict), similar };
    },

    async createAsset(ctx, input) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      requireManage(ctx);
      const db = rt.store.getSnapshot();
      validateInput(ctx, db, input);
      const now = rt.now().toISOString();
      const asset: Asset = {
        id: rt.newId('a'),
        tag: input.tag.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description.trim(),
        classificationId: input.classificationId,
        primaryLocationId: input.primaryLocationId,
        servedLocationIds: input.servedLocationIds,
        criticality: input.criticality,
        condition: 'normal',
        conditionSource: { kind: 'manual' },
        conditionUpdatedAt: now,
        directResponsiblePersonId: input.directResponsiblePersonId || undefined,
        relationships: input.dependsOnAssetIds.map((targetAssetId) => ({ type: 'depende-de' as const, targetAssetId })),
        registeredFrom: 'central',
      };
      rt.store.mutate((draft) => {
        draft.assets.push(asset);
        draft.auditLog.push({ id: rt.newId('aud'), at: now, actorUserId: ctx.user.id, moduleId: 'central', action: 'ativo.criar', entityType: 'ativo', entityId: asset.id, summary: `Ativo ${asset.tag} cadastrado na Central.` });
      });
      return asset;
    },

    async updateAsset(ctx, id, input, reason) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      requireManage(ctx);
      requireReason(reason);
      const db = rt.store.getSnapshot();
      const current = db.assets.find((a) => a.id === id);
      if (!current) throw notFound('Ativo não encontrado.');
      if (!inScope(ctx, current.primaryLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      validateInput(ctx, db, input, id);
      const now = rt.now().toISOString();
      const changes: string[] = [];
      if (current.name !== input.name.trim()) changes.push('nome');
      if (current.primaryLocationId !== input.primaryLocationId) changes.push('localização principal');
      if (current.criticality !== input.criticality) changes.push('criticidade');
      if (current.classificationId !== input.classificationId) changes.push('classificação');
      if ((current.directResponsiblePersonId ?? '') !== (input.directResponsiblePersonId ?? '')) changes.push('responsável');
      if (JSON.stringify([...current.servedLocationIds].sort()) !== JSON.stringify([...input.servedLocationIds].sort())) changes.push('locais atendidos');
      if (JSON.stringify(current.relationships.map((r) => r.targetAssetId).sort()) !== JSON.stringify([...input.dependsOnAssetIds].sort())) changes.push('relacionamentos');
      rt.store.mutate((draft) => {
        const a = draft.assets.find((x) => x.id === id)!;
        Object.assign(a, {
          tag: input.tag.trim().toUpperCase(),
          name: input.name.trim(),
          description: input.description.trim(),
          classificationId: input.classificationId,
          primaryLocationId: input.primaryLocationId,
          servedLocationIds: input.servedLocationIds,
          criticality: input.criticality,
          directResponsiblePersonId: input.directResponsiblePersonId || undefined,
          relationships: input.dependsOnAssetIds.map((targetAssetId) => ({ type: 'depende-de' as const, targetAssetId })),
        });
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: ctx.user.id,
          moduleId: 'central',
          action: 'ativo.editar',
          entityType: 'ativo',
          entityId: id,
          summary: `Cadastro alterado (${changes.join(', ') || 'descrição'}). Motivo: ${reason.trim()}`,
        });
      });
      return rt.store.getSnapshot().assets.find((a) => a.id === id)!;
    },

    async setCondition(ctx, id, condition, reason) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      requireManage(ctx);
      requireReason(reason);
      const db = rt.store.getSnapshot();
      const current = db.assets.find((a) => a.id === id);
      if (!current) throw notFound('Ativo não encontrado.');
      if (!inScope(ctx, current.primaryLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      if (current.condition === condition) throw new ServiceError('VALIDATION', 'Selecione uma condição diferente da atual.');
      const now = rt.now().toISOString();
      rt.store.mutate((draft) => {
        const a = draft.assets.find((x) => x.id === id)!;
        a.condition = condition;
        a.conditionSource = { kind: 'manual' };
        a.conditionUpdatedAt = now;
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: ctx.user.id,
          moduleId: 'central',
          action: 'ativo.condicao',
          entityType: 'ativo',
          entityId: id,
          summary: `Condição alterada de ${CONDITION_LABEL[current.condition]} para ${CONDITION_LABEL[condition]} (manual). Motivo: ${reason.trim()}`,
        });
      });
      return rt.store.getSnapshot().assets.find((a) => a.id === id)!;
    },

    async registerDuplicateAvoided(ctx, detail) {
      requireModule(ctx, 'central');
      rt.store.mutate((draft) => {
        draft.centralStats.duplicatesAvoided += 1;
        draft.auditLog.push({ id: rt.newId('aud'), at: rt.now().toISOString(), actorUserId: ctx.user.id, moduleId: 'central', action: 'ativo.duplicidade-evitada', entityType: 'ativo', entityId: 'n/a', summary: detail });
      });
    },

    previewImport(ctx, csv) {
      requireModule(ctx, 'central');
      requireManage(ctx);
      const db = rt.store.getSnapshot();
      const { columns, rows } = parseCsv(csv);
      const required = ['tag', 'nome', 'classificacao', 'local', 'criticidade'];
      const missing = required.filter((c) => !columns.includes(c));
      const seenTags = new Map<string, number>();
      const result: ImportRow[] = rows.map((values, i) => {
        const line = i + 2;
        const errors: string[] = missing.length ? [`Colunas obrigatórias ausentes: ${missing.join(', ')}.`] : [];
        const warnings: string[] = [];
        const cls = db.classifications.find((c) => normalize(c.name) === normalize(values.classificacao ?? '') || c.id === values.classificacao);
        const loc = db.locations.find((l) => normalize(l.code) === normalize(values.local ?? '') || normalize(l.name) === normalize(values.local ?? ''));
        const critRaw = normalize(values.criticidade ?? '');
        const criticality = (['baixa', 'media', 'alta'] as const).find((c) => c === critRaw);
        const responsible = values.responsavel
          ? db.people.find((p) => normalize(p.externalRef) === normalize(values.responsavel!) || normalize(p.email) === normalize(values.responsavel!))
          : undefined;
        if (!values.tag) errors.push('Tag não informada.');
        if (!values.nome) errors.push('Nome não informado.');
        if (!cls) errors.push(`Classificação "${values.classificacao ?? ''}" não encontrada.`);
        if (!loc) errors.push(`Local "${values.local ?? ''}" não encontrado.`);
        else if (!inScope(ctx, loc.id)) errors.push(`Local "${values.local}" fora do seu escopo.`);
        if (!criticality) errors.push(`Criticidade "${values.criticidade ?? ''}" inválida (use baixa, média ou alta).`);
        if (values.responsavel && !responsible) warnings.push(`Responsável "${values.responsavel}" não encontrado; será herdado da localização.`);
        const tagKey = normalize(values.tag ?? '');
        if (tagKey) {
          if (seenTags.has(tagKey)) errors.push(`Tag repetida no arquivo (linha ${seenTags.get(tagKey)}).`);
          else seenTags.set(tagKey, line);
        }
        const existing = tagKey ? db.assets.find((a) => normalize(a.tag) === tagKey) : undefined;
        // Duplicidade fora do escopo: bloqueia a linha sem expor o ativo existente.
        const duplicateOf = existing && inScope(ctx, existing.primaryLocationId) ? existing : undefined;
        if (existing && !duplicateOf) errors.push('Tag já em uso por um ativo fora do seu escopo.');
        const similar =
          loc && values.nome ? db.assets.filter((a) => a.id !== duplicateOf?.id && a.primaryLocationId === loc.id && similarNames(a.name, values.nome!)) : [];
        if (similar.length) warnings.push(`Possível duplicidade com ${similar.map((s) => s.tag).join(', ')}.`);
        const input: AssetInput | undefined =
          errors.length === 0 && cls && loc && criticality
            ? {
                tag: values.tag!,
                name: values.nome!,
                description: values.descricao ?? '',
                classificationId: cls.id,
                primaryLocationId: loc.id,
                servedLocationIds: [],
                criticality,
                directResponsiblePersonId: responsible?.id,
                dependsOnAssetIds: [],
              }
            : undefined;
        return {
          line,
          values,
          input,
          errors,
          warnings,
          duplicateOf,
          similar,
          defaultAction: errors.length || duplicateOf || similar.length ? 'ignorar' : 'importar',
        };
      });
      return {
        columns,
        rows: result,
        validCount: result.filter((r) => r.input && !r.duplicateOf).length,
        errorCount: result.filter((r) => r.errors.length > 0).length,
        duplicateCount: result.filter((r) => r.duplicateOf || r.similar.length).length,
      } satisfies ImportPreview;
    },

    async applyImport(ctx, preview, decisions) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      requireManage(ctx);
      const created: Asset[] = [];
      let skipped = 0;
      let duplicatesAvoided = 0;
      const now = rt.now().toISOString();
      for (const row of preview.rows) {
        const action = decisions[row.line] ?? row.defaultAction;
        if (action !== 'importar' || !row.input || row.duplicateOf) {
          skipped += 1;
          if (row.duplicateOf || row.similar.length) duplicatesAvoided += 1;
          continue;
        }
        // Revalida no momento de aplicar (os dados podem ter mudado desde a prévia).
        try {
          validateInput(ctx, rt.store.getSnapshot(), row.input);
        } catch {
          skipped += 1;
          continue;
        }
        const asset: Asset = {
          id: rt.newId('a'),
          tag: row.input.tag.trim().toUpperCase(),
          name: row.input.name.trim(),
          description: row.input.description.trim(),
          classificationId: row.input.classificationId,
          primaryLocationId: row.input.primaryLocationId,
          servedLocationIds: [],
          criticality: row.input.criticality,
          condition: 'normal',
          conditionSource: { kind: 'manual' },
          conditionUpdatedAt: now,
          directResponsiblePersonId: row.input.directResponsiblePersonId,
          relationships: [],
          registeredFrom: 'central',
        };
        rt.store.mutate((draft) => {
          draft.assets.push(asset);
          draft.auditLog.push({ id: rt.newId('aud'), at: now, actorUserId: ctx.user.id, moduleId: 'central', action: 'ativo.importar', entityType: 'ativo', entityId: asset.id, summary: `Ativo ${asset.tag} criado por importação em lote (linha ${row.line}).` });
        });
        created.push(asset);
      }
      if (duplicatesAvoided > 0) {
        rt.store.mutate((draft) => {
          draft.centralStats.duplicatesAvoided += duplicatesAvoided;
        });
      }
      return { created, skipped, duplicatesAvoided };
    },
  };
  return service;
}
