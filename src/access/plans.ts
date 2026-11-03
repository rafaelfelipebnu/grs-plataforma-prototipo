import type { CapabilityId, CommercialPlan, CommercialPlanId, Contract, ModuleId } from '@/domain';

/**
 * Capacidades incluídas em qualquer contrato. A ocorrência básica é
 * capacidade básica GRS (docs/06-gestao-de-ocorrencias.md).
 */
export const BASE_CAPABILITIES: CapabilityId[] = ['ocorrencias'];

/**
 * Perfis comerciais. A COMPOSIÇÃO de Essencial, Operacional e Integrado é
 * provisória (não definida nos documentos) — segue a estratégia
 * land-and-expand descrita em docs/00 apenas para viabilizar a demonstração.
 * Ver docs/decisoes-evolucao.md.
 */
export const COMMERCIAL_PLANS: Record<CommercialPlanId, CommercialPlan> = {
  essencial: {
    id: 'essencial',
    name: 'Essencial',
    description: 'Base de segurança integrada com cadastro compartilhado de ativos e ambientes.',
    capabilities: ['security-hub', 'central', 'ocorrencias'],
    compositionConfirmed: false,
  },
  operacional: {
    id: 'operacional',
    name: 'Operacional',
    description: 'Inclui a operação de rotinas e manutenção sobre a mesma base de ativos.',
    capabilities: ['security-hub', 'central', 'ocorrencias', 'rotinas', 'manutencao'],
    compositionConfirmed: false,
  },
  integrado: {
    id: 'integrado',
    name: 'Integrado',
    description:
      'Plataforma completa: monitoramento de infraestrutura, ocorrências avançadas e gestão de riscos.',
    capabilities: [
      'security-hub',
      'central',
      'monitor',
      'rotinas',
      'manutencao',
      'ocorrencias',
      'ocorrencias-avancadas',
      'riscos',
    ],
    compositionConfirmed: false,
  },
  personalizado: {
    id: 'personalizado',
    name: 'Personalizado',
    description: 'Combinação de módulos e capacidades definida para o cliente.',
    capabilities: [],
    compositionConfirmed: true,
  },
};

export const PLAN_ORDER: CommercialPlanId[] = ['essencial', 'operacional', 'integrado', 'personalizado'];

export const CAPABILITY_LABEL: Record<CapabilityId, string> = {
  'security-hub': 'Security Hub',
  central: 'Central de Ativos e Ambientes',
  monitor: 'Monitor de Infraestrutura',
  rotinas: 'Gestão de Rotinas',
  manutencao: 'Gestão de Manutenção',
  ocorrencias: 'Gestão de Ocorrências (básica)',
  'ocorrencias-avancadas': 'Ocorrências Avançadas',
  riscos: 'Gestão de Riscos',
};

/** Monta o contrato efetivo a partir do plano (e da escolha, se Personalizado). */
export function buildContract(planId: CommercialPlanId, customCapabilities: CapabilityId[] = []): Contract {
  const source = planId === 'personalizado' ? customCapabilities : COMMERCIAL_PLANS[planId].capabilities;
  const capabilities = Array.from(new Set<CapabilityId>([...BASE_CAPABILITIES, ...source]));
  return { planId, capabilities };
}

export function hasCapability(contract: Contract, capability: CapabilityId): boolean {
  return contract.capabilities.includes(capability);
}

export function isModuleContracted(contract: Contract, moduleId: ModuleId): boolean {
  return hasCapability(contract, moduleId);
}

/**
 * Plano de ação é capacidade adicional habilitada por Ocorrências Avançadas,
 * Gestão de Rotinas OU Gestão de Manutenção — não depende de Gestão de Riscos
 * (docs/06).
 */
export function hasActionPlanCapability(contract: Contract): boolean {
  return (
    hasCapability(contract, 'ocorrencias-avancadas') ||
    hasCapability(contract, 'rotinas') ||
    hasCapability(contract, 'manutencao')
  );
}
