import type { Id } from './common';

/**
 * Níveis da hierarquia física. A documentação cita como exemplo
 * Unidade → Prédio → Setor → Sala; "área" e "andar" são níveis adicionais
 * usados nos dados de demonstração (provisório, ver decisoes-evolucao.md).
 */
export type LocationLevel = 'unidade' | 'predio' | 'area' | 'andar' | 'setor' | 'sala';

export const LOCATION_LEVEL_LABEL: Record<LocationLevel, string> = {
  unidade: 'Unidade',
  predio: 'Prédio',
  area: 'Área',
  andar: 'Andar',
  setor: 'Setor',
  sala: 'Sala',
};

/**
 * Entidade unificada "Localização" — cadastro único, de propriedade da
 * Central de Ativos e Ambientes. Nenhum outro módulo mantém cadastro de locais.
 */
export interface Location {
  id: Id;
  companyId: Id;
  parentId: Id | null;
  level: LocationLevel;
  code: string;
  name: string;
  /** Responsável pela localização; ativos podem herdar este responsável. */
  responsiblePersonId?: Id;
}
