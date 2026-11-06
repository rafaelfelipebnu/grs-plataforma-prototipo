import type { DemoDatabase } from '@/data/database';
import type { Asset, AssetGroup, GroupRule, Id } from '@/domain';
import { locationIndexOf } from '../internal';

/** A classificação é a própria ou descendente da indicada. */
export function classificationWithin(db: Readonly<DemoDatabase>, classificationId: Id, ancestorId: Id): boolean {
  let current = db.classifications.find((c) => c.id === classificationId);
  const guard = new Set<Id>();
  while (current && !guard.has(current.id)) {
    if (current.id === ancestorId) return true;
    guard.add(current.id);
    const parentId = current.parentId;
    current = parentId ? db.classifications.find((c) => c.id === parentId) : undefined;
  }
  return false;
}

/** Todos os critérios informados precisam ser atendidos. Regra sem critérios não associa nada. */
export function ruleMatches(db: Readonly<DemoDatabase>, rule: GroupRule, asset: Asset): boolean {
  const hasCriteria = Boolean(rule.classificationIds?.length || rule.criticalities?.length || rule.locationIds?.length);
  if (!hasCriteria) return false;
  const index = locationIndexOf(db);
  if (rule.classificationIds?.length && !rule.classificationIds.some((c) => classificationWithin(db, asset.classificationId, c))) return false;
  if (rule.criticalities?.length && !rule.criticalities.includes(asset.criticality)) return false;
  if (rule.locationIds?.length && !rule.locationIds.some((l) => index.isDescendantOrSelf(asset.primaryLocationId, l))) return false;
  if (rule.localScopeLocationId && !index.isDescendantOrSelf(asset.primaryLocationId, rule.localScopeLocationId)) return false;
  return true;
}

export interface MembershipEntry {
  asset: Asset;
  ruleIds: Id[];
  manual: boolean;
}

export interface ExceptedEntry {
  asset: Asset;
  /** Regras que incluiriam o ativo (exceção ativa). Vazio = exceção sem efeito atual. */
  ruleIds: Id[];
}

export interface Membership {
  members: MembershipEntry[];
  excepted: ExceptedEntry[];
}

/**
 * Associação efetiva = (regras ∪ inclusões manuais) − exceções.
 * Grupo local só considera ativos dentro da sua localização.
 * As regras são reavaliadas a cada consulta (associação dinâmica).
 */
export function computeMembership(db: Readonly<DemoDatabase>, group: Pick<AssetGroup, 'rules' | 'manualInclusions' | 'exceptions' | 'scopeLocationId'>): Membership {
  const index = locationIndexOf(db);
  const exceptions = new Set(group.exceptions.map((e) => e.assetId));
  const manual = new Set(group.manualInclusions.map((m) => m.assetId));
  const members: MembershipEntry[] = [];
  const excepted: ExceptedEntry[] = [];
  for (const asset of db.assets) {
    if (group.scopeLocationId && !index.isDescendantOrSelf(asset.primaryLocationId, group.scopeLocationId)) continue;
    const ruleIds = group.rules.filter((r) => ruleMatches(db, r, asset)).map((r) => r.id);
    const isManual = manual.has(asset.id);
    if (exceptions.has(asset.id)) {
      excepted.push({ asset, ruleIds });
      continue;
    }
    if (ruleIds.length > 0 || isManual) members.push({ asset, ruleIds, manual: isManual });
  }
  return { members, excepted };
}

export interface RulePreview {
  added: Asset[];
  removed: Asset[];
  /** Ativos que a nova regra incluiria, mas permanecem fora por exceção (conflito sinalizado). */
  keptOutByException: Asset[];
  /** Ativos que saem das regras mas permanecem por inclusão manual. */
  keptByManual: Asset[];
  totalAfter: number;
}

/** Prévia dos ativos afetados antes de alterar as regras (docs/02). */
export function previewRules(db: Readonly<DemoDatabase>, group: AssetGroup, nextRules: GroupRule[]): RulePreview {
  const before = computeMembership(db, group);
  const after = computeMembership(db, { ...group, rules: nextRules });
  const beforeIds = new Set(before.members.map((m) => m.asset.id));
  const afterIds = new Set(after.members.map((m) => m.asset.id));
  return {
    added: after.members.filter((m) => !beforeIds.has(m.asset.id)).map((m) => m.asset),
    removed: before.members.filter((m) => !afterIds.has(m.asset.id)).map((m) => m.asset),
    keptOutByException: after.excepted.filter((e) => e.ruleIds.length > 0).map((e) => e.asset),
    keptByManual: after.members.filter((m) => m.manual && m.ruleIds.length === 0 && before.members.some((b) => b.asset.id === m.asset.id && b.ruleIds.length > 0)).map((m) => m.asset),
    totalAfter: after.members.length,
  };
}
