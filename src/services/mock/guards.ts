import { moduleAccess, type AccessContext } from '@/access';
import type { ModuleId } from '@/domain';
import { forbidden, notContracted } from '../errors';
import { MODULE_NAMES } from './names';

/** Garante que o módulo está disponível para o contexto (permissão + contrato). */
export function requireModule(ctx: AccessContext, moduleId: ModuleId): void {
  const access = moduleAccess(ctx, moduleId);
  if (access === 'no-permission') {
    throw forbidden(`Seu perfil não tem acesso a ${MODULE_NAMES[moduleId]}.`);
  }
  if (access === 'not-contracted') {
    throw notContracted(`${MODULE_NAMES[moduleId]} não está contratado.`);
  }
}

export const OUT_OF_SCOPE_MESSAGE = 'Este registro está fora do seu escopo de localização.';
