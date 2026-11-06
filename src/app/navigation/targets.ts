import { isModuleAvailable, type AccessContext } from '@/access';
import type { NavTarget } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { Services } from '@/services';

export const paths = {
  asset: (id: string) => `/central/ativos/${id}`,
  device: (id: string) => `/central/dispositivos/${id}`,
  location: (id: string) => `/central?local=${encodeURIComponent(id)}`,
  event: (id: string) => `/security-hub/eventos/${id}`,
  person: (id: string) => `/pessoas/${id}`,
  search: (q: string) => `/busca?q=${encodeURIComponent(q)}`,
  maintenanceRequest: (id: string) => `/manutencao/solicitacoes/${id}`,
  workOrder: (id: string) => `/manutencao/os/${id}`,
};

/**
 * Resolve o destino correto de uma notificação ou resultado de busca,
 * considerando o módulo proprietário e o que o usuário pode acessar.
 * Retorna null se não houver destino acessível.
 */
export function resolveTargetPath(target: NavTarget, access: AccessContext, services: Services): string | null {
  switch (target.kind) {
    case 'asset':
      return paths.asset(target.id);
    case 'device':
      return paths.device(target.id);
    case 'location':
      return paths.location(target.id);
    case 'person':
      return paths.person(target.id);
    case 'module':
      return MODULES[target.moduleId].basePath;
    case 'maintenance-request':
      return paths.maintenanceRequest(target.id);
    case 'work-order':
      return paths.workOrder(target.id);
    case 'event': {
      const info = services.events.routingInfo(access, target.id);
      if (!info) return null;
      if (info.securityRelevant && isModuleAvailable(access, 'security-hub')) return paths.event(target.id);
      // Sem Security Hub: abre o contexto do ativo/dispositivo afetado.
      if (isModuleAvailable(access, 'central')) {
        if (info.assetId) return paths.asset(info.assetId);
        if (info.deviceId) return paths.device(info.deviceId);
      }
      return paths.event(target.id);
    }
  }
}
