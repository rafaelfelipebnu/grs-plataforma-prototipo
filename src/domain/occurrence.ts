import type { Id, ISODateString } from './common';

/**
 * Gestão de Ocorrências — produto EXISTENTE (docs/referencias, seção 2),
 * preservado: quatro status, cinco prioridades, trâmites, pausar/retomar e
 * "Concluir" (D-008). Ciclo aprovado em D-009, D-010 e D-013
 * (docs/propostas/q02-ciclo-de-vida-da-ocorrencia.md).
 */

/** Status existentes (DP-01): nenhum status novo. */
export type OccurrenceStatus = 'sem-tratamento' | 'em-andamento' | 'em-pausa' | 'concluida';

export const OCCURRENCE_STATUS_LABEL: Record<OccurrenceStatus, string> = {
  'sem-tratamento': 'Sem tratamento',
  'em-andamento': 'Em andamento',
  'em-pausa': 'Em pausa',
  concluida: 'Concluída',
};

/** Prioridades existentes do produto (docs/06: valores exatos). */
export type OccurrencePriority = 'critica' | 'alta' | 'media' | 'baixa' | 'planejada';

export const OCCURRENCE_PRIORITY_LABEL: Record<OccurrencePriority, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  planejada: 'Planejada',
};

export const OCCURRENCE_PRIORITIES: OccurrencePriority[] = ['critica', 'alta', 'media', 'baixa', 'planejada'];

/**
 * Origem da ocorrência. "usuario" e "evento" são criadas no protótipo; as
 * demais representam integrações existentes do produto e aparecem só nos
 * dados de demonstração (simuladas).
 */
export type OccurrenceOrigin = 'usuario' | 'evento' | 'nao-conformidade' | 'rotina-nao-executada' | 'dispositivo';

export const OCCURRENCE_ORIGIN_LABEL: Record<OccurrenceOrigin, string> = {
  usuario: 'Registro por usuário',
  evento: 'Evento do Security Hub',
  'nao-conformidade': 'Não conformidade (Gestão de Rotinas)',
  'rotina-nao-executada': 'Rotina não executada (Gestão de Rotinas)',
  dispositivo: 'Dispositivo',
};

/** Critério de conclusão do tipo (docs/06; D-008 lê "encerramento" como conclusão). */
export type ConclusionCriterion = 'manual' | 'aprovacao';

export const CONCLUSION_CRITERION_LABEL: Record<ConclusionCriterion, string> = {
  manual: 'Manual',
  aprovacao: 'Por aprovação',
};

/**
 * Tipo de ocorrência. Campos existentes: nome, prioridade padrão, monitorado,
 * aviso sonoro, e-mails notificados. Condições de conclusão são parâmetros
 * opcionais da Linha GRS (docs/06, DP-04): sem configuração, vale a regra atual.
 * "Exige plano de ação" e "Exige reinspeção" entram com Planos de Ação e Rotinas.
 */
export interface OccurrenceType {
  id: Id;
  name: string;
  defaultPriority: OccurrencePriority;
  monitored: boolean;
  warningSound: boolean;
  notifiedEmails: string[];
  conclusion: {
    requireEvidence: boolean;
    requireJustification: boolean;
    criterion: ConclusionCriterion;
  };
}

/** Trâmite humano (texto e/ou anexos simulados). */
export interface Proceeding {
  id: Id;
  at: ISODateString;
  byUserId: Id;
  text: string;
  /** Nomes de arquivos simulados — nenhum arquivo é enviado. */
  attachments: string[];
}

/** Histórico: trâmites humanos e registros automáticos (DP-06: registro automático não é trâmite). */
export interface OccurrenceHistoryEntry {
  at: ISODateString;
  actorUserId: Id | 'sistema';
  kind: 'acao' | 'automatico';
  text: string;
}

export interface OccurrencePause {
  startedAt: ISODateString;
  endedAt?: ISODateString;
  reason: string;
  byUserId: Id;
  resumedByUserId?: Id;
}

export interface Occurrence {
  id: Id;
  /** Identificador legível (ex.: OC-0012). */
  code: string;
  typeId: Id;
  locationId: Id;
  /** Ativo relacionado (identidade da Central), opcional. */
  assetId?: Id;
  description: string;
  occurredAt: ISODateString;
  createdAt: ISODateString;
  priority: OccurrencePriority;
  origin: OccurrenceOrigin;
  /** Evento do Security Hub de origem, quando origin = 'evento'. */
  sourceEventId?: Id;
  registeredByUserId: Id | 'sistema';
  involvedPersonIds: Id[];
  status: OccurrenceStatus;
  /** Primeiro trâmite humano: encerra o tempo de resposta (DP-02). */
  firstProceedingAt?: ISODateString;
  proceedings: Proceeding[];
  pauses: OccurrencePause[];
  /** Pedido de aprovação de conclusão pendente (DP-13). */
  approvalRequest?: { at: ISODateString; byUserId: Id; justification?: string; evidenceNames: string[] };
  conclusion?: {
    at: ISODateString;
    byUserId: Id;
    justification?: string;
    evidenceNames: string[];
    approvedByUserId?: Id;
    /** Conclusão com exceção autorizada (D-013): condições dispensadas, autorizador e justificativa. */
    exception?: { dispensed: string[]; authorizedByUserId: Id; justification: string };
  };
  /** Situação de elegibilidade da última avaliação (N3: notifica só na passagem para elegível). */
  eligible: boolean;
  history: OccurrenceHistoryEntry[];
}
