import type {
  AccessScope,
  CapabilityId,
  Contract,
  DemoUser,
  Id,
  ModuleId,
  Permission,
  Person,
  Profile,
} from '@/domain';
import type { LocationIndex } from './locationIndex';
import { hasCapability, isModuleContracted } from './plans';
import { PROFILES } from './profiles';

/**
 * Contexto de acesso usado por TODOS os serviços para filtrar dados e
 * autorizar ações. Equivale ao que um backend real extrairia do token.
 */
export interface AccessContext {
  user: DemoUser;
  person: Person | undefined;
  profile: Profile;
  permissions: ReadonlySet<Permission>;
  /** 'all' = escopo corporativo; caso contrário, conjunto de locais visíveis. */
  visibleLocationIds: ReadonlySet<Id> | 'all';
  contract: Contract;
}

export function resolveVisibleLocations(scope: AccessScope, index: LocationIndex): ReadonlySet<Id> | 'all' {
  if (scope.kind === 'corporativo') return 'all';
  const visible = new Set<Id>();
  for (const root of scope.rootLocationIds) {
    for (const id of index.subtreeIds(root)) visible.add(id);
  }
  return visible;
}

export function buildAccessContext(
  user: DemoUser,
  person: Person | undefined,
  contract: Contract,
  index: LocationIndex,
): AccessContext {
  const profile = PROFILES[user.profileId];
  return {
    user,
    person,
    profile,
    permissions: new Set(profile.permissions),
    visibleLocationIds: resolveVisibleLocations(user.scope, index),
    contract,
  };
}

export function can(ctx: AccessContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}

export function isLocationVisible(ctx: AccessContext, locationId: Id | undefined): boolean {
  if (!locationId) return false;
  return ctx.visibleLocationIds === 'all' || ctx.visibleLocationIds.has(locationId);
}

export function hasContractedCapability(ctx: AccessContext, capability: CapabilityId): boolean {
  return hasCapability(ctx.contract, capability);
}

export const MODULE_VIEW_PERMISSION: Record<ModuleId, Permission> = {
  'security-hub': 'hub.view',
  central: 'central.view',
  monitor: 'monitor.view',
  rotinas: 'rotinas.view',
  manutencao: 'manutencao.view',
  ocorrencias: 'ocorrencias.view',
  riscos: 'riscos.view',
};

/**
 * Situação de acesso a um módulo:
 * - 'no-permission': o perfil não tem acesso (módulo não aparece no menu);
 * - 'not-contracted': perfil teria acesso, mas o cliente não contratou
 *   (módulo aparece bloqueado, com explicação de valor e sem dados);
 * - 'available': acesso liberado.
 */
export type ModuleAccess = 'available' | 'not-contracted' | 'no-permission';

export function moduleAccess(ctx: AccessContext, moduleId: ModuleId): ModuleAccess {
  if (!can(ctx, MODULE_VIEW_PERMISSION[moduleId])) return 'no-permission';
  if (!isModuleContracted(ctx.contract, moduleId)) return 'not-contracted';
  return 'available';
}

export function isModuleAvailable(ctx: AccessContext, moduleId: ModuleId): boolean {
  return moduleAccess(ctx, moduleId) === 'available';
}
