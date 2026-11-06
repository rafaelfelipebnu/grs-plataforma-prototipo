import { LocationIndex, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import type { Id, Location, ModuleId, OperationalEvent } from '@/domain';
import type { DemoStore } from './store';

/** Dependências compartilhadas pelas implementações mock. */
export interface ServiceRuntime {
  store: DemoStore;
  /** Atraso simulado de rede (ms). 0 em testes. */
  latencyMs: number;
  now: () => Date;
  newId: (prefix: string) => Id;
}

export async function simulateLatency(runtime: ServiceRuntime): Promise<void> {
  if (runtime.latencyMs <= 0) return;
  const jitter = Math.round(runtime.latencyMs * 0.4 * Math.random());
  await new Promise((resolve) => setTimeout(resolve, runtime.latencyMs + jitter));
}

const indexCache = new WeakMap<readonly Location[], LocationIndex>();

/** Índice de localização memoizado por versão da coleção. */
export function locationIndexOf(db: Readonly<DemoDatabase>): LocationIndex {
  let index = indexCache.get(db.locations);
  if (!index) {
    index = new LocationIndex(db.locations);
    indexCache.set(db.locations, index);
  }
  return index;
}

/** Normaliza texto para busca (minúsculas, sem acentos). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesQuery(query: string, ...fields: Array<string | undefined>): boolean {
  const q = normalize(query);
  if (!q) return false;
  const terms = q.split(/\s+/);
  const haystack = normalize(fields.filter(Boolean).join(' '));
  return terms.every((term) => haystack.includes(term));
}

/** Fontes cujos eventos pertencem ao domínio de segurança. */
const SECURITY_SOURCES = new Set(['security-hub', 'controle-acesso']);

/**
 * Um evento é relevante para o Security Hub quando vem de fonte de segurança
 * ou quando outro módulo informou contexto de impacto em segurança.
 */
export function isSecurityRelevant(event: OperationalEvent): boolean {
  return SECURITY_SOURCES.has(event.source) || Boolean(event.securityContext);
}

/** Módulo responsável pelo evento (Controle de Acesso é apresentado via Security Hub). */
export function eventOwnerModule(event: OperationalEvent): ModuleId {
  return event.source === 'controle-acesso' ? 'security-hub' : event.source;
}

export function canSeeEvent(ctx: AccessContext, event: OperationalEvent): boolean {
  if (!inScope(ctx, event.locationId)) return false;
  if (isSecurityRelevant(event) && isModuleAvailable(ctx, 'security-hub')) return true;
  return isModuleAvailable(ctx, eventOwnerModule(event));
}

/** Raízes de classificação que caracterizam sistemas de segurança (contexto do Hub). */
export const SECURITY_CLASSIFICATION_ROOTS = ['cls-incendio', 'cls-seg'];

export function hasSecurityClassification(db: Readonly<DemoDatabase>, classificationId: Id): boolean {
  let current = db.classifications.find((c) => c.id === classificationId);
  const guard = new Set<Id>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    if (SECURITY_CLASSIFICATION_ROOTS.includes(current.id)) return true;
    const parentId = current.parentId;
    current = parentId ? db.classifications.find((c) => c.id === parentId) : undefined;
  }
  return false;
}

/**
 * Ativos relevantes para segurança: sistemas de segurança (por classificação)
 * e os ativos dos quais eles dependem, direta ou indiretamente.
 * Ex.: SIS-INC-01 (incêndio) depende de BMB-014 → a bomba é relevante.
 */
export function securityRelevantAssetIds(db: Readonly<DemoDatabase>): Set<Id> {
  const relevant = new Set(db.assets.filter((a) => hasSecurityClassification(db, a.classificationId)).map((a) => a.id));
  const queue = Array.from(relevant);
  while (queue.length > 0) {
    const currentId = queue.pop();
    const asset = db.assets.find((a) => a.id === currentId);
    for (const rel of asset?.relationships ?? []) {
      if (rel.type === 'depende-de' && !relevant.has(rel.targetAssetId)) {
        relevant.add(rel.targetAssetId);
        queue.push(rel.targetAssetId);
      }
    }
  }
  return relevant;
}

export const SEVERITY_RANK: Record<OperationalEvent['severity'], number> = {
  critica: 4,
  alta: 3,
  media: 2,
  baixa: 1,
  informativa: 0,
};

/** O local pertence ao filtro (filtro inclui descendentes). Sem filtro, sempre verdadeiro. */
export function inLocationFilter(db: Readonly<DemoDatabase>, locationId: Id | undefined, filterLocationId: Id | undefined): boolean {
  if (!filterLocationId) return true;
  if (!locationId) return false;
  return locationIndexOf(db).isDescendantOrSelf(locationId, filterLocationId);
}

export function inScope(ctx: AccessContext, locationId: Id | undefined): boolean {
  if (!locationId) return false;
  return ctx.visibleLocationIds === 'all' || ctx.visibleLocationIds.has(locationId);
}

/**
 * Quem pode reconhecer o alerta:
 * - alerta relevante para segurança: perfil com reconhecimento no Security Hub;
 * - alerta técnico do Monitor: perfil que configura o monitoramento (P-41, provisório).
 */
export function canAcknowledgeEvent(ctx: AccessContext, event: OperationalEvent): boolean {
  if (event.status !== 'ativo') return false;
  if (isSecurityRelevant(event) && ctx.permissions.has('hub.events.acknowledge') && isModuleAvailable(ctx, 'security-hub')) return true;
  return event.source === 'monitor' && ctx.permissions.has('monitor.manage') && isModuleAvailable(ctx, 'monitor');
}

/**
 * Contexto de segurança de um sinal sobre o ativo: o próprio ativo é sistema
 * de segurança, ou sistemas de segurança dependem dele (direta ou indiretamente).
 */
export function securityContextFor(db: Readonly<DemoDatabase>, assetId: Id | undefined): string | undefined {
  if (!assetId) return undefined;
  const asset = db.assets.find((a) => a.id === assetId);
  if (!asset) return undefined;
  if (hasSecurityClassification(db, asset.classificationId)) return `${asset.name} (${asset.tag}) é sistema de segurança.`;
  const affected: string[] = [];
  const seen = new Set<Id>([assetId]);
  const queue = [assetId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const dep of db.assets.filter((a) => a.relationships.some((r) => r.type === 'depende-de' && r.targetAssetId === current))) {
      if (seen.has(dep.id)) continue;
      seen.add(dep.id);
      queue.push(dep.id);
      if (hasSecurityClassification(db, dep.classificationId)) affected.push(`${dep.name} (${dep.tag})`);
    }
  }
  return affected.length ? `Afeta ${affected.join(', ')}.` : undefined;
}

export function paginate<T>(items: T[], page = 1, pageSize = 10) {
  const size = Math.max(1, pageSize);
  const last = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), last);
  return { items: items.slice((current - 1) * size, current * size), total: items.length, page: current, pageSize: size };
}

/** A classificação é uma das indicadas ou descendente delas. */
export function classificationWithinAny(db: Readonly<DemoDatabase>, classificationId: Id, ancestorIds: Id[]): boolean {
  let current = db.classifications.find((c) => c.id === classificationId);
  const guard = new Set<Id>();
  while (current && !guard.has(current.id)) {
    if (ancestorIds.includes(current.id)) return true;
    guard.add(current.id);
    const parentId = current.parentId;
    current = parentId ? db.classifications.find((c) => c.id === parentId) : undefined;
  }
  return false;
}
