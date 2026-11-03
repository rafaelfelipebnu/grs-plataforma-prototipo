import type { Id, SourceSystem } from './common';

export type PersonType = 'colaborador' | 'terceiro' | 'visitante';

export const PERSON_TYPE_LABEL: Record<PersonType, string> = {
  colaborador: 'Colaborador',
  terceiro: 'Terceiro',
  visitante: 'Visitante',
};

/**
 * Pessoa proveniente de fonte integrada (nesta versão, Controle de Acesso —
 * integração simulada). O GRS consulta, não é dono do cadastro de pessoas.
 */
export interface Person {
  id: Id;
  name: string;
  personType: PersonType;
  jobTitle: string;
  orgUnitId?: Id;
  /** Localização de lotação/referência, usada para escopo de visibilidade. */
  referenceLocationId: Id;
  /** E-mail fictício em domínio reservado (.invalid). */
  email: string;
  source: SourceSystem;
  /** Identificador no sistema de origem. */
  externalRef: string;
}
