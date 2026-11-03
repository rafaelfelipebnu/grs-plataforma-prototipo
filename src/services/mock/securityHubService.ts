import { can, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import {
  PERIOD_MINUTES,
  type Criticality,
  type Id,
  type Location,
  type OperationalCondition,
  type OperationalEvent,
  type Period,
  type Severity,
} from '@/domain';
import type {
  AccessPassageView,
  CameraView,
  CriticalAssetView,
  EventListItem,
  LocationStatusRow,
  Paged,
  PendingAction,
  SecurityHubService,
} from '../contracts';
import { forbidden } from '../errors';
import {
  SEVERITY_RANK,
  canSeeEvent,
  hasSecurityClassification,
  inLocationFilter,
  inScope,
  isSecurityRelevant,
  locationIndexOf,
  matchesQuery,
  securityRelevantAssetIds,
  simulateLatency,
  type ServiceRuntime,
} from '../internal';
import { deviceScopeLocationId, isDeviceVisible } from './assetService';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';

const CRITICALITY_RANK: Record<Criticality, number> = { alta: 3, media: 2, baixa: 1 };
const CONDITION_RANK: Record<OperationalCondition, number> = { critico: 4, indisponivel: 3, atencao: 2, normal: 1 };
const CAMERA_CLASSIFICATION = 'cls-cam';

function paginate<T>(items: T[], page = 1, pageSize = 10): Paged<T> {
  const safeSize = Math.max(1, pageSize);
  const lastPage = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  return { items: items.slice((safePage - 1) * safeSize, safePage * safeSize), total: items.length, page: safePage, pageSize: safeSize };
}

export function createSecurityHubService(rt: ServiceRuntime): SecurityHubService {
  const periodStart = (period: Period | undefined): string | undefined =>
    period ? new Date(rt.now().getTime() - PERIOD_MINUTES[period] * 60_000).toISOString() : undefined;

  /** Pré-condições comuns: Hub disponível e local do filtro dentro do escopo. */
  const prepare = (ctx: AccessContext, locationId?: Id) => {
    requireModule(ctx, 'security-hub');
    if (locationId && !inScope(ctx, locationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return rt.store.getSnapshot();
  };

  /** Eventos do Hub: relevantes para segurança, visíveis e no escopo. */
  const hubEvents = (ctx: AccessContext, db: Readonly<DemoDatabase>, locationId?: Id) =>
    db.events.filter((e) => isSecurityRelevant(e) && canSeeEvent(ctx, e) && inLocationFilter(db, e.locationId, locationId));

  const canAck = (ctx: AccessContext, e: OperationalEvent) =>
    e.status === 'ativo' && can(ctx, 'hub.events.acknowledge') && isModuleAvailable(ctx, 'security-hub');

  const pathOf = (db: Readonly<DemoDatabase>, id: Id) => locationIndexOf(db).pathOf(id);

  const ackDurationMinutes = (e: OperationalEvent) =>
    e.acknowledgedAt ? Math.max(0, (Date.parse(e.acknowledgedAt) - Date.parse(e.occurredAt)) / 60_000) : 0;

  return {
    async listEvents(ctx, q) {
      await simulateLatency(rt);
      const db = prepare(ctx, q.locationId);
      const start = periodStart(q.period);
      const minRank = q.minSeverity ? SEVERITY_RANK[q.minSeverity] : -1;
      const filtered = hubEvents(ctx, db, q.locationId).filter(
        (e) =>
          (!q.status || e.status === q.status) &&
          (!q.severities?.length || q.severities.includes(e.severity)) &&
          SEVERITY_RANK[e.severity] >= minRank &&
          (!q.categories?.length || q.categories.includes(e.category)) &&
          (!start || e.occurredAt >= start) &&
          (!q.search?.trim() || matchesQuery(q.search, e.code, e.title, e.description)),
      );
      filtered.sort((a, b) =>
        q.sort === 'severidade'
          ? SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.occurredAt.localeCompare(a.occurredAt)
          : b.occurredAt.localeCompare(a.occurredAt),
      );
      const page = paginate(filtered, q.page, q.pageSize);
      return {
        ...page,
        items: page.items.map((event): EventListItem => ({ event, locationPath: pathOf(db, event.locationId), canAcknowledge: canAck(ctx, event) })),
      };
    },

    async acknowledgeMany(ctx, ids) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      if (!can(ctx, 'hub.events.acknowledge')) throw forbidden('Você não tem permissão para reconhecer alertas.');
      const visible = new Map(hubEvents(ctx, db).map((e) => [e.id, e]));
      const toAck = ids.filter((id) => visible.get(id)?.status === 'ativo');
      if (toAck.length > 0) {
        const now = rt.now().toISOString();
        rt.store.mutate((draft) => {
          for (const id of toAck) {
            const e = draft.events.find((x) => x.id === id)!;
            e.status = 'reconhecido';
            e.acknowledgedByUserId = ctx.user.id;
            e.acknowledgedAt = now;
            draft.auditLog.push({
              id: rt.newId('aud'),
              at: now,
              actorUserId: ctx.user.id,
              moduleId: 'security-hub',
              action: 'evento.reconhecer',
              entityType: 'evento',
              entityId: id,
              summary: `Alerta ${e.code} reconhecido.`,
            });
          }
        });
      }
      return { acknowledged: toAck.length, skipped: ids.length - toAck.length };
    },

    async listAccess(ctx, q) {
      await simulateLatency(rt);
      const db = prepare(ctx, q.locationId);
      const start = periodStart(q.period);
      const showNames = can(ctx, 'pessoas.view');
      const people = new Map(db.people.map((p) => [p.id, p]));
      const inFilter = db.accessPassages.filter(
        (p) =>
          inScope(ctx, p.locationId) &&
          inLocationFilter(db, p.locationId, q.locationId) &&
          (!start || p.occurredAt >= start) &&
          (!q.direction || p.direction === q.direction) &&
          (!q.search?.trim() ||
            matchesQuery(q.search, p.credential, showNames && p.personId ? people.get(p.personId)?.name : undefined)),
      );
      const granted = inFilter.filter((p) => p.result === 'liberado').length;
      const denied = inFilter.length - granted;
      const filtered = inFilter
        .filter((p) => !q.result || p.result === q.result)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      const page = paginate(filtered, q.page, q.pageSize);
      return {
        ...page,
        granted,
        denied,
        items: page.items.map(
          (passage): AccessPassageView => ({
            passage,
            personId: showNames ? passage.personId : undefined,
            personName: showNames && passage.personId ? people.get(passage.personId)?.name : undefined,
            locationPath: pathOf(db, passage.locationId),
          }),
        ),
      };
    },

    async indicators(ctx, f) {
      await simulateLatency(rt);
      const db = prepare(ctx, f.locationId);
      const start = periodStart(f.period ?? '24h')!;
      const events = hubEvents(ctx, db, f.locationId);
      const active = events.filter((e) => e.status === 'ativo');
      const cameras = db.assets.filter(
        (a) => a.classificationId === CAMERA_CLASSIFICATION && inScope(ctx, a.primaryLocationId) && inLocationFilter(db, a.primaryLocationId, f.locationId),
      );
      const offlineCameras = cameras.filter((a) => {
        const device = db.devices.find((d) => d.assetId === a.id);
        return device && db.deviceHealth.find((h) => h.deviceId === device.id)?.communication === 'offline';
      });
      return {
        activeAlerts: active.length,
        criticalActive: active.filter((e) => e.severity === 'critica').length,
        activeAlarms: active.filter((e) => e.category === 'alarme').length,
        acknowledgedInPeriod: events.filter((e) => e.acknowledgedAt && e.acknowledgedAt >= start).length,
        deniedAccessInPeriod: db.accessPassages.filter(
          (p) => p.result === 'negado' && p.occurredAt >= start && inScope(ctx, p.locationId) && inLocationFilter(db, p.locationId, f.locationId),
        ).length,
        camerasWithoutSignal: offlineCameras.length,
      };
    },

    async cameras(ctx, f) {
      await simulateLatency(rt);
      const db = prepare(ctx, f.locationId);
      const activeEvents = hubEvents(ctx, db).filter((e) => e.status === 'ativo');
      const views = db.assets
        .filter((a) => a.classificationId === CAMERA_CLASSIFICATION && inScope(ctx, a.primaryLocationId) && inLocationFilter(db, a.primaryLocationId, f.locationId))
        .map((asset): CameraView => {
          const device = db.devices.find((d) => d.assetId === asset.id);
          const health = device ? db.deviceHealth.find((h) => h.deviceId === device.id) : undefined;
          return {
            asset,
            device,
            streamStatus: health?.communication ?? 'desconhecido',
            locationPath: pathOf(db, asset.primaryLocationId),
            activeEvents: activeEvents.filter((e) => e.assetId === asset.id || (device && e.deviceId === device.id)).length,
          };
        })
        .sort(
          (a, b) =>
            b.activeEvents - a.activeEvents ||
            Number(b.streamStatus === 'offline') - Number(a.streamStatus === 'offline') ||
            a.asset.tag.localeCompare(b.asset.tag),
        );
      return views.slice(0, f.limit ?? views.length);
    },

    async criticalAssets(ctx, f) {
      await simulateLatency(rt);
      const db = prepare(ctx, f.locationId);
      const relevant = securityRelevantAssetIds(db);
      const minRank = CRITICALITY_RANK[f.minCriticality ?? 'alta'];
      const visibleEvents = db.events.filter((e) => e.status === 'ativo' && canSeeEvent(ctx, e));
      const views = db.assets
        .filter(
          (a) =>
            relevant.has(a.id) &&
            CRITICALITY_RANK[a.criticality] >= minRank &&
            inScope(ctx, a.primaryLocationId) &&
            inLocationFilter(db, a.primaryLocationId, f.locationId),
        )
        .map(
          (asset): CriticalAssetView => ({
            asset,
            locationPath: pathOf(db, asset.primaryLocationId),
            activeEvents: visibleEvents.filter((e) => e.assetId === asset.id).length,
            securityDependents: db.assets.filter(
              (d) =>
                inScope(ctx, d.primaryLocationId) &&
                hasSecurityClassification(db, d.classificationId) &&
                d.relationships.some((r) => r.type === 'depende-de' && r.targetAssetId === asset.id),
            ),
          }),
        )
        .sort(
          (a, b) =>
            CONDITION_RANK[b.asset.condition] - CONDITION_RANK[a.asset.condition] ||
            CRITICALITY_RANK[b.asset.criticality] - CRITICALITY_RANK[a.asset.criticality] ||
            a.asset.tag.localeCompare(b.asset.tag),
        );
      return views.slice(0, f.limit ?? views.length);
    },

    async infrastructureHealth(ctx, f) {
      await simulateLatency(rt);
      const db = prepare(ctx, f.locationId);
      requireModule(ctx, 'monitor');
      const relevant = securityRelevantAssetIds(db);
      const devices = db.devices.filter(
        (d) =>
          d.assetId &&
          relevant.has(d.assetId) &&
          isDeviceVisible(ctx, db, d) &&
          inLocationFilter(db, deviceScopeLocationId(db, d), f.locationId),
      );
      const rows = devices
        .map((device) => ({ device, health: db.deviceHealth.find((h) => h.deviceId === device.id) }))
        .filter((r): r is { device: typeof r.device; health: NonNullable<typeof r.health> } => Boolean(r.health));
      const order = { offline: 0, instavel: 1, online: 2 } as const;
      const attention = rows
        .filter((r) => r.health.communication !== 'online')
        .sort((a, b) => order[a.health.communication] - order[b.health.communication])
        .slice(0, f.limit ?? 10)
        .map((r) => ({
          ...r,
          asset: db.assets.find((a) => a.id === r.device.assetId),
          locationPath: pathOf(db, deviceScopeLocationId(db, r.device) ?? ''),
        }));
      return {
        online: rows.filter((r) => r.health.communication === 'online').length,
        instavel: rows.filter((r) => r.health.communication === 'instavel').length,
        offline: rows.filter((r) => r.health.communication === 'offline').length,
        attention,
      };
    },

    async responseTime(ctx, f) {
      await simulateLatency(rt);
      const db = prepare(ctx, f.locationId);
      const start = periodStart(f.period ?? '7d')!;
      const acknowledged = hubEvents(ctx, db, f.locationId).filter((e) => e.acknowledgedAt && e.occurredAt >= start);
      const avg = (list: OperationalEvent[]) => list.reduce((sum, e) => sum + ackDurationMinutes(e), 0) / list.length;
      const severities: Severity[] = ['critica', 'alta', 'media', 'baixa', 'informativa'];
      return {
        averageMinutes: acknowledged.length ? avg(acknowledged) : null,
        acknowledgedCount: acknowledged.length,
        bySeverity: severities
          .map((severity) => {
            const list = acknowledged.filter((e) => e.severity === severity);
            return { severity, count: list.length, averageMinutes: list.length ? avg(list) : 0 };
          })
          .filter((r) => r.count > 0),
      };
    },

    async locationStatus(ctx, f) {
      await simulateLatency(rt);
      const db = prepare(ctx, f.locationId);
      const index = locationIndexOf(db);
      const visibleChildren = (id: Id) => index.childrenOf(id).filter((c) => inScope(ctx, c.id));
      const active = hubEvents(ctx, db).filter((e) => e.status === 'ativo');
      const relevant = securityRelevantAssetIds(db);
      const relevantNotNormal = db.assets.filter((a) => relevant.has(a.id) && a.condition !== 'normal' && inScope(ctx, a.primaryLocationId));

      const build = (location: Location, depth: number): LocationStatusRow => {
        const subtree = index.subtreeIds(location.id);
        const alerts = active.filter((e) => subtree.has(e.locationId));
        const maxSeverity = alerts.reduce<Severity | undefined>(
          (max, e) => (!max || SEVERITY_RANK[e.severity] > SEVERITY_RANK[max] ? e.severity : max),
          undefined,
        );
        return {
          location,
          activeAlerts: alerts.length,
          criticalAlerts: alerts.filter((e) => e.severity === 'critica').length,
          maxSeverity,
          assetsNotNormal: relevantNotNormal.filter((a) => subtree.has(a.primaryLocationId)).length,
          children: depth > 0 ? visibleChildren(location.id).map((c) => build(c, depth - 1)) : [],
        };
      };

      let bases: Location[];
      if (f.locationId) {
        const children = visibleChildren(f.locationId);
        bases = children.length > 0 ? children : [index.get(f.locationId)!];
      } else {
        bases = index.all().filter((l) => inScope(ctx, l.id) && (!l.parentId || !inScope(ctx, l.parentId)));
      }
      return bases.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((l) => build(l, 2));
    },

    async pendingActions(ctx, f) {
      await simulateLatency(rt);
      const db = prepare(ctx, f.locationId);
      const now = rt.now().getTime();
      const list = hubEvents(ctx, db, f.locationId)
        .filter((e) => e.status === 'ativo')
        .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.occurredAt.localeCompare(b.occurredAt))
        .map(
          (event): PendingAction => ({
            kind: 'reconhecer-alerta',
            event,
            locationPath: pathOf(db, event.locationId),
            ageMinutes: Math.max(0, Math.round((now - Date.parse(event.occurredAt)) / 60_000)),
          }),
        );
      return list.slice(0, f.limit ?? list.length);
    },
  };
}

