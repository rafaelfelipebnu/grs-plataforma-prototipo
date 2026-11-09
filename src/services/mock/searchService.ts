import { can, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import {
  LOCATION_LEVEL_LABEL,
  OCCURRENCE_STATUS_LABEL,
  PERSON_TYPE_LABEL,
  PLAN_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  ROUTINE_STATUS_LABEL,
  WORK_ORDER_STATUS_LABEL,
  type Location,
} from '@/domain';
import type {
  MaintenanceService,
  OccurrenceService,
  PlanService,
  RoutineService,
  SearchCoverage,
  SearchResult,
  SearchResultType,
  SearchService,
} from '../contracts';
import {
  canSeeEvent,
  inScope,
  locationIndexOf,
  matchesQuery,
  normalize,
  simulateLatency,
  type ServiceRuntime,
} from '../internal';
import { isDeviceVisible } from './assetService';

/** Serviços dos módulos especialistas consultados pela busca (cada um aplica suas regras). */
export interface SearchModuleServices {
  occurrences: OccurrenceService;
  maintenance: MaintenanceService;
  plans: PlanService;
  routines: RoutineService;
}

type Found = SearchResult & { key: string };

interface Provider {
  type: SearchResultType;
  allowed: (ctx: AccessContext) => boolean;
  run: (ctx: AccessContext, db: Readonly<DemoDatabase>, query: string) => Found[] | Promise<Found[]>;
}

/** Quantidade consultada por tipo em cada módulo (a busca mostra os mais relevantes). */
const MODULE_PAGE = 50;

/** Relevância simples: identificador exato > início > contém. */
function score(query: string, key: string, title: string): number {
  const q = normalize(query);
  const k = normalize(key);
  const t = normalize(title);
  if (k === q) return 0;
  if (k.startsWith(q) || t.startsWith(q)) return 1;
  return 2;
}

function locationLabel(db: Readonly<DemoDatabase>, locationId: string | undefined): string {
  if (!locationId) return '';
  return tail(locationIndexOf(db).pathOf(locationId));
}

const tail = (path: Location[]) =>
  path
    .slice(-2)
    .map((l) => l.name)
    .join(' › ');

/** Consulta a um módulo que pode recusar (contrato, perfil): sem acesso, nenhum resultado. */
async function safely<T>(run: () => Promise<T[]>): Promise<T[]> {
  try {
    return await run();
  } catch {
    return [];
  }
}

/**
 * Busca global. Cada tipo de resultado é fornecido pelo módulo proprietário:
 * os cadastros mestres vêm da Central; ocorrências, solicitações, OS, planos e
 * execuções são consultados nos próprios módulos, que aplicam permissões e escopo.
 */
function providers(modules: SearchModuleServices): Provider[] {
  return [
    {
      type: 'asset',
      allowed: (ctx) => isModuleAvailable(ctx, 'central'),
      run: (ctx, db, q) =>
        db.assets
          .filter((a) => inScope(ctx, a.primaryLocationId))
          .filter((a) => {
            const cls = db.classifications.find((c) => c.id === a.classificationId)?.name;
            return matchesQuery(q, a.tag, a.name, a.description, cls);
          })
          .map((a) => ({
            key: a.tag,
            type: 'asset',
            id: a.id,
            title: `${a.tag} · ${a.name}`,
            subtitle: locationLabel(db, a.primaryLocationId),
            moduleId: 'central',
            target: { kind: 'asset', id: a.id },
          })),
    },
    {
      type: 'device',
      allowed: (ctx) => isModuleAvailable(ctx, 'central'),
      run: (ctx, db, q) =>
        db.devices
          .filter((d) => isDeviceVisible(ctx, db, d))
          .filter((d) => matchesQuery(q, d.name, d.deviceType, d.manufacturer, d.model, d.protocol))
          .map((d) => ({
            key: d.name,
            type: 'device',
            id: d.id,
            title: d.name,
            subtitle: `${d.deviceType} · ${d.protocol}${d.locationId ? ` · ${locationLabel(db, d.locationId)}` : ''}`,
            moduleId: 'central',
            target: { kind: 'device', id: d.id },
          })),
    },
    {
      type: 'location',
      allowed: (ctx) => isModuleAvailable(ctx, 'central'),
      run: (ctx, db, q) =>
        db.locations
          .filter((l) => inScope(ctx, l.id))
          .filter((l) => matchesQuery(q, l.name, l.code))
          .map((l) => ({
            key: l.code,
            type: 'location',
            id: l.id,
            title: l.name,
            subtitle: `${LOCATION_LEVEL_LABEL[l.level]} · ${l.code}`,
            moduleId: 'central',
            target: { kind: 'location', id: l.id },
          })),
    },
    {
      type: 'person',
      allowed: (ctx) => can(ctx, 'pessoas.view'),
      run: (ctx, db, q) =>
        db.people
          .filter((p) => inScope(ctx, p.referenceLocationId))
          .filter((p) => matchesQuery(q, p.name, p.jobTitle, p.externalRef))
          .map((p) => ({
            key: p.externalRef,
            type: 'person',
            id: p.id,
            title: p.name,
            subtitle: `${PERSON_TYPE_LABEL[p.personType]} · ${p.jobTitle} · Fonte: Controle de Acesso`,
            moduleId: 'pessoas',
            target: { kind: 'person', id: p.id },
          })),
    },
    {
      type: 'event',
      allowed: (ctx) => isModuleAvailable(ctx, 'security-hub') || isModuleAvailable(ctx, 'monitor'),
      run: (ctx, db, q) =>
        db.events
          .filter((e) => canSeeEvent(ctx, e))
          .filter((e) => matchesQuery(q, e.code, e.title, e.description))
          .map((e) => ({
            key: e.code,
            type: 'event',
            id: e.id,
            title: e.title,
            subtitle: `${e.code} · ${locationLabel(db, e.locationId)}`,
            moduleId: 'security-hub',
            target: { kind: 'event', id: e.id },
          })),
    },
    {
      type: 'occurrence',
      allowed: (ctx) => isModuleAvailable(ctx, 'ocorrencias'),
      run: (ctx, _db, q) =>
        safely(async () =>
          (await modules.occurrences.list(ctx, { search: q, pageSize: MODULE_PAGE })).items.map(({ occurrence: o, type, locationPath }) => ({
            key: o.code,
            type: 'occurrence',
            id: o.id,
            title: `${o.code} — ${type.name}`,
            subtitle: `${OCCURRENCE_STATUS_LABEL[o.status]} · ${tail(locationPath)}`,
            moduleId: 'ocorrencias',
            target: { kind: 'occurrence', id: o.id },
          })),
        ),
    },
    {
      type: 'request',
      allowed: (ctx) => isModuleAvailable(ctx, 'manutencao'),
      run: (ctx, _db, q) =>
        safely(async () =>
          (await modules.maintenance.listRequests(ctx, { search: q, pageSize: MODULE_PAGE })).items.map(({ request: r, locationPath }) => ({
            key: r.code,
            type: 'request',
            id: r.id,
            title: `${r.code} — ${r.title}`,
            subtitle: `${REQUEST_STATUS_LABEL[r.status]} · ${tail(locationPath)}`,
            moduleId: 'manutencao',
            target: { kind: 'maintenance-request', id: r.id },
          })),
        ),
    },
    {
      type: 'work-order',
      allowed: (ctx) => isModuleAvailable(ctx, 'manutencao'),
      run: (ctx, _db, q) =>
        safely(async () =>
          (await modules.maintenance.listWorkOrders(ctx, { search: q, pageSize: MODULE_PAGE })).items.map(({ order: o, locationPath }) => ({
            key: o.code,
            type: 'work-order',
            id: o.id,
            title: `${o.code} — ${o.title}`,
            subtitle: `${WORK_ORDER_STATUS_LABEL[o.status]} · ${tail(locationPath)}`,
            moduleId: 'manutencao',
            target: { kind: 'work-order', id: o.id },
          })),
        ),
    },
    {
      type: 'action-plan',
      allowed: (ctx) => modules.plans.permissions(ctx).view,
      run: (ctx, _db, q) =>
        safely(async () =>
          (await modules.plans.list(ctx, { search: q, pageSize: MODULE_PAGE })).items.map(({ plan: p, locationPath }) => ({
            key: p.code,
            type: 'action-plan',
            id: p.id,
            title: `${p.code} — ${p.title}`,
            subtitle: `${PLAN_STATUS_LABEL[p.status]} · ${tail(locationPath)}`,
            moduleId: 'ocorrencias',
            target: { kind: 'action-plan', id: p.id },
          })),
        ),
    },
    {
      type: 'routine-execution',
      allowed: (ctx) => isModuleAvailable(ctx, 'rotinas'),
      run: (ctx, _db, q) =>
        safely(async () =>
          (await modules.routines.listExecutions(ctx, { search: q, pageSize: MODULE_PAGE })).items.map(({ execution: e, routine, plan }) => ({
            key: e.code,
            type: 'routine-execution',
            id: e.id,
            title: `${e.code} — ${routine.name}`,
            subtitle: `${ROUTINE_STATUS_LABEL[e.status]} · ${plan.name}`,
            moduleId: 'rotinas',
            target: { kind: 'routine-execution', id: e.id },
          })),
        ),
    },
  ];
}

const LABELS: Record<SearchResultType, string> = {
  asset: 'Ativos',
  device: 'Dispositivos',
  location: 'Locais',
  person: 'Pessoas',
  event: 'Eventos e alertas',
  occurrence: 'Ocorrências',
  request: 'Solicitações',
  'work-order': 'Ordens de serviço',
  'action-plan': 'Planos de ação',
  'routine-execution': 'Execuções de rotina',
};

export const SEARCH_TYPE_LABEL: Record<SearchResultType, string> = LABELS;

export function createSearchService(rt: ServiceRuntime, modules: SearchModuleServices): SearchService {
  const list = providers(modules);
  return {
    async search(ctx, query, options = {}) {
      await simulateLatency(rt);
      if (normalize(query).length < 2) return [];
      const db = rt.store.getSnapshot();
      const limit = options.limitPerType ?? Number.POSITIVE_INFINITY;
      const active = list.filter((p) => (!options.types || options.types.includes(p.type)) && p.allowed(ctx));
      const groups = await Promise.all(active.map((p) => Promise.resolve(p.run(ctx, db, query))));
      return groups.flatMap((found) =>
        found
          .sort((a, b) => score(query, a.key, a.title) - score(query, b.key, b.title) || a.title.localeCompare(b.title, 'pt-BR'))
          .slice(0, limit)
          .map(({ key: _key, ...result }) => result),
      );
    },

    coverage(ctx): SearchCoverage[] {
      return list.map((p) => ({ type: p.type, label: LABELS[p.type], allowed: p.allowed(ctx) }));
    },
  };
}
