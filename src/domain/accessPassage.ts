import type { Id, ISODateString } from './common';

export type PassageDirection = 'entrada' | 'saida';
export type PassageResult = 'liberado' | 'negado';

export const PASSAGE_RESULT_LABEL: Record<PassageResult, string> = { liberado: 'Liberado', negado: 'Negado' };
export const PASSAGE_DIRECTION_LABEL: Record<PassageDirection, string> = { entrada: 'Entrada', saida: 'Saída' };

/**
 * Passagem registrada pelo Controle de Acesso (produto integrado — dados
 * simulados). O GRS apenas consulta e contextualiza.
 */
export interface AccessPassage {
  id: Id;
  /** Ausente quando a credencial não está associada a uma pessoa conhecida. */
  personId?: Id;
  credential: string;
  locationId: Id;
  deviceId?: Id;
  direction: PassageDirection;
  result: PassageResult;
  /** Motivo informado pela controladora em caso de negação. */
  reason?: string;
  occurredAt: ISODateString;
  source: 'controle-acesso';
}
