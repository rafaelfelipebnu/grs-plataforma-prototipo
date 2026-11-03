import { can, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import { LOCATION_LEVEL_LABEL, PERSON_TYPE_LABEL } from '@/domain';
import type { SearchCoverage, SearchResult, SearchResultType, SearchService } from '../contracts';
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

interface Provider {
  type: SearchResultType;
  label: string;
  implemented: boolean;
  allowed: (ctx: AccessContext) => boolean;
  run: (ctx: AccessContext, db: Readonly<DemoDatabase>, query: string) => Array<SearchResult & { key: string }>;
}

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
  const path = locationIndexOf(db).pathOf(locationId);
  return path
    .slice(-2)
    .map((l) => l.name)
    .join(' › ');
}

/**
 * Cada tipo de resultado é fornecido pelo módulo proprietário. Ocorrências e
 * solicitações/OS estão previstos na especificação e serão ligados quando os
 * respectivos módulos forem implementados (etapa 5).
 */
const PROVIDERS: Provider[] = [
  {
    type: 'asset',
    label: 'Ativos',
    implemented: true,
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
    label: 'Dispositivos',
    implemented: true,
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
    label: 'Locais',
    implemented: true,
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
    label: 'Pessoas',
    implemented: true,
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
    label: 'Eventos e alertas',
    implemented: true,
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
    label: 'Ocorrências',
    implemented: false,
    allowed: (ctx) => isModuleAvailable(ctx, 'ocorrencias'),
    run: () => [],
  },
  {
    type: 'request',
    label: 'Solicitações e OS',
    implemented: false,
    allowed: (ctx) => isModuleAvailable(ctx, 'manutencao'),
    run: () => [],
  },
];

export const SEARCH_TYPE_LABEL: Record<SearchResultType, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.type, p.label]),
) as Record<SearchResultType, string>;

export function createSearchService(rt: ServiceRuntime): SearchService {
  return {
    async search(ctx, query, options = {}) {
      await simulateLatency(rt);
      if (normalize(query).length < 2) return [];
      const db = rt.store.getSnapshot();
      const limit = options.limitPerType ?? Number.POSITIVE_INFINITY;
      const results: SearchResult[] = [];
      for (const provider of PROVIDERS) {
        if (options.types && !options.types.includes(provider.type)) continue;
        if (!provider.implemented || !provider.allowed(ctx)) continue;
        const found = provider
          .run(ctx, db, query)
          .sort((a, b) => score(query, a.key, a.title) - score(query, b.key, b.title) || a.title.localeCompare(b.title, 'pt-BR'))
          .slice(0, limit)
          .map(({ key: _key, ...result }) => result);
        results.push(...found);
      }
      return results;
    },

    coverage(ctx): SearchCoverage[] {
      return PROVIDERS.map((p) => ({ type: p.type, label: p.label, implemented: p.implemented, allowed: p.allowed(ctx) }));
    },
  };
}
