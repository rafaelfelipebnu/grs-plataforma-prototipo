import type { Id } from './common';

export interface Company {
  id: Id;
  /** Razão social fictícia. */
  legalName: string;
  /** Nome exibido no cabeçalho. */
  displayName: string;
  /** Sempre true neste protótipo: os dados são de demonstração. */
  isDemo: true;
}

/**
 * Estrutura organizacional (diretorias, áreas, equipes). É SEPARADA da
 * hierarquia física de localização (docs/02): o vínculo entre as duas é
 * feito por mapeamento explícito ({@link OrgLocationMapping}).
 */
export interface OrgUnit {
  id: Id;
  companyId: Id;
  parentId: Id | null;
  name: string;
}

/** Mapeamento explícito entre unidade organizacional e localização física. */
export interface OrgLocationMapping {
  orgUnitId: Id;
  locationId: Id;
}
