import type { ModuleId } from './common';

/**
 * Capacidades contratáveis. Os módulos da sidebar são capacidades;
 * "ocorrencias-avancadas" é capacidade adicional (docs/06) que habilita,
 * entre outros, planos de ação.
 */
export type CapabilityId = ModuleId | 'ocorrencias-avancadas';

/**
 * Perfis comerciais (decisão do usuário em 03/11/2026) — conceito separado dos
 * perfis de acesso. Representam módulos/capacidades contratados.
 */
export type CommercialPlanId = 'essencial' | 'operacional' | 'integrado' | 'personalizado';

export interface CommercialPlan {
  id: CommercialPlanId;
  name: string;
  description: string;
  /**
   * Capacidades do plano. A composição de Essencial/Operacional/Integrado ainda
   * NÃO foi definida: os valores atuais são provisórios (ver decisoes-evolucao.md).
   * Personalizado usa a lista escolhida no contrato.
   */
  capabilities: CapabilityId[];
  compositionConfirmed: boolean;
}

/** Contrato do cliente de demonstração. */
export interface Contract {
  planId: CommercialPlanId;
  /** Capacidades efetivas (para Personalizado, escolhidas livremente). */
  capabilities: CapabilityId[];
}
