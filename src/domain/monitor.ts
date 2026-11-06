import type { Id, ISODateString, Severity } from './common';
import type { DataPointStatus, Protocol } from './device';

/**
 * Domínio do Monitor de Infraestrutura (docs/07, PRD do Monitor).
 * Tudo aqui é simulado: nenhum equipamento real é conectado.
 */

/** Ponto de dado que o dispositivo expõe (o Monitor passa a coletar após a aprovação). */
export interface DiscoveredPoint {
  name: string;
  unit: string;
  value: number | string | boolean | null;
}

export type CandidateStatus = 'pendente' | 'aprovado' | 'rejeitado';

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  pendente: 'Aguardando revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

/**
 * Sugestões da descoberta — sempre explicáveis e nunca aplicadas sem
 * aprovação humana. Descoberta não confirma localização física.
 */
export interface CandidateSuggestions {
  classificationId?: Id;
  locationId?: Id;
  assetId?: Id;
  /** Por que cada sugestão foi feita (texto exibido ao revisor). */
  reasons: string[];
}

export interface CandidateDecision {
  byUserId: Id;
  at: ISODateString;
  reason: string;
  deviceId?: Id;
  assetId?: Id;
  createdAssetId?: Id;
}

/**
 * Dispositivo encontrado pela descoberta. Fica no inventário de descoberta
 * do Monitor até uma pessoa autorizada aprovar (cria o dispositivo na
 * Central) ou rejeitar.
 */
export interface DiscoveryCandidate {
  id: Id;
  connectorId: Id;
  runId: Id;
  discoveredAt: ISODateString;
  /** Endereço de rede/identificador no protocolo (fictício). */
  address: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  protocol: Protocol;
  metadata: Record<string, string>;
  points: DiscoveredPoint[];
  suggestions: CandidateSuggestions;
  status: CandidateStatus;
  decision?: CandidateDecision;
}

/** Execução de descoberta (somente leitura na rede simulada). */
export interface DiscoveryRun {
  id: Id;
  connectorId: Id;
  byUserId: Id;
  startedAt: ISODateString;
  /** Dispositivos respondendo na rede simulada. */
  found: number;
  /** Novos candidatos gerados (não conhecidos antes). */
  newCandidates: number;
}

export type RuleOperator = 'maior' | 'menor' | 'igual' | 'diferente';

export const RULE_OPERATOR_LABEL: Record<RuleOperator, string> = {
  maior: 'maior que',
  menor: 'menor que',
  igual: 'igual a',
  diferente: 'diferente de',
};

/**
 * Regra técnica de monitoramento sobre um ponto de dado. Operadores,
 * histerese, janelas, supressão e escalonamento ainda estão "a definir"
 * no PRD — a regra provisória é a comparação simples com um limite.
 */
export interface MonitoringRule {
  id: Id;
  name: string;
  pointId: Id;
  operator: RuleOperator;
  threshold: number | string;
  severity: Severity;
  active: boolean;
  createdByUserId: Id;
  createdAt: ISODateString;
  lastTriggeredAt?: ISODateString;
}

/** Leitura registrada de um ponto (histórico além da série sintética). */
export interface PointReading {
  pointId: Id;
  at: ISODateString;
  value: number | string | boolean | null;
  status: DataPointStatus;
}
