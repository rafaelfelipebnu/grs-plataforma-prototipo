import type { Id, ISODateString } from './common';

/**
 * Gestão de Rotinas — produto EXISTENTE (docs/referencias, seção 1),
 * preservado: plano de rotina, rotina (agendada ou não), ponto de controle,
 * checklist, execução pelo app (inclusive offline) e status existentes.
 * Integrações decididas: D-005 (sugestão de vínculo após sincronização),
 * D-006/D-013 (reinspeção), DP-15 (alternativa C).
 */

/** Status existentes da rotina (referência 1.12). "Futura" só aparece no app. */
export type RoutineExecutionStatus =
  | 'futura'
  | 'pendente'
  | 'em-execucao'
  | 'interrompida'
  | 'concluida'
  | 'incompleta'
  | 'nao-realizada'
  | 'finalizado-parcialmente';

export const ROUTINE_STATUS_LABEL: Record<RoutineExecutionStatus, string> = {
  futura: 'Futura',
  pendente: 'Pendente',
  'em-execucao': 'Em execução',
  interrompida: 'Interrompida',
  concluida: 'Concluída',
  incompleta: 'Incompleta',
  'nao-realizada': 'Não realizada',
  'finalizado-parcialmente': 'Finalizado Parcialmente',
};

export type ControlPointType = 'personalizado' | 'ativo' | 'local-fisico' | 'pessoa' | 'veiculo';

export const CONTROL_POINT_TYPE_LABEL: Record<ControlPointType, string> = {
  personalizado: 'Personalizado',
  ativo: 'Ativo',
  'local-fisico': 'Local Físico',
  pessoa: 'Pessoa',
  veiculo: 'Veículo',
};

export type PointValidation = 'qr-code' | 'geolocalizacao' | 'sem-validacao';

export const POINT_VALIDATION_LABEL: Record<PointValidation, string> = {
  'qr-code': 'QR Code',
  geolocalizacao: 'Geolocalização',
  'sem-validacao': 'Sem validação',
};

/** Opções de resposta existentes (subconjunto usado na demonstração). */
export type AnswerType = 'conforme' | 'conforme-na' | 'nota' | 'texto';

export const ANSWER_TYPE_LABEL: Record<AnswerType, string> = {
  conforme: 'Conforme / Não conforme',
  'conforme-na': 'Conforme / Não conforme / Não se aplica',
  nota: 'Nota de 0 a 10',
  texto: 'Texto',
};

/** Configuração de anexo e de observação por item (existente). */
export type ItemRequirement = 'opcional' | 'nao-conforme' | 'obrigatorio';

export const ITEM_REQUIREMENT_LABEL: Record<ItemRequirement, string> = {
  opcional: 'Opcional',
  'nao-conforme': "Obrigatório para 'Não Conforme'",
  obrigatorio: 'Obrigatório',
};

export interface ChecklistItem {
  id: Id;
  description: string;
  /** Tipo de ocorrência: com ponto de controle com local físico, a não conformidade gera ocorrência. */
  occurrenceTypeId?: Id;
  answerType: AnswerType;
  /** "Nota para Não Conforme": essa nota e as menores são não conformes. */
  ncThreshold?: number;
  attachment: ItemRequirement;
  observation: ItemRequirement;
}

export interface Checklist {
  id: Id;
  name: string;
  checklistType: string;
  planIds: Id[];
  /** E-mail do gestor notificado na não conformidade (não disparado no protótipo). */
  email?: string;
  active: boolean;
  items: ChecklistItem[];
}

export interface ControlPoint {
  id: Id;
  planId: Id;
  name: string;
  type: ControlPointType;
  validation: PointValidation;
  /** Local físico (hierarquia única da Central). */
  locationId?: Id;
  /** Ativo (identidade da Central — D-007). */
  assetId?: Id;
  active: boolean;
  checklistIds: Id[];
}

export interface RoutinePlan {
  id: Id;
  name: string;
  area: string;
  locationId: Id;
  /** Tipo de ocorrência crítico do botão de pânico. */
  panicOccurrenceTypeId?: Id;
  active: boolean;
  notes?: string;
}

export interface Routine {
  id: Id;
  planId: Id;
  name: string;
  /** Não pode ser alterado depois de salvo (existente). */
  scheduled: boolean;
  /** Agendamento (simplificado na demonstração: janela diária). */
  schedule?: { startTime: string; endTime: string; recurrence: string };
  /** Só agendadas: tipo de ocorrência gerada quando a rotina não é executada. */
  missedOccurrenceTypeId?: Id;
  /** Só não agendadas: "Termina após X execuções". */
  maxExecutions?: number;
  active: boolean;
  /** Rotina criada para reinspeção (D-006/D-013). */
  reinspectionRequestId?: Id;
}

export interface ChecklistAnswer {
  checklistId: Id;
  itemId: Id;
  /** 'conforme' | 'nao-conforme' | 'nao-se-aplica' | nota (string) | texto livre. */
  value: string;
  /** Resultado de conformidade derivado da resposta; null = não avalia (texto, não se aplica). */
  conforming: boolean | null;
  observation?: string;
  attachments: string[];
}

export interface PointExecution {
  pointId: Id;
  status: 'pendente' | 'concluido' | 'cancelado';
  validatedBy?: 'qr-code' | 'geolocalizacao' | 'justificativa' | 'sem-validacao';
  validationJustification?: string;
  cancelReason?: string;
  finishedAt?: ISODateString;
  answers: ChecklistAnswer[];
}

export interface RoutineExecution {
  id: Id;
  code: string;
  routineId: Id;
  planId: Id;
  /** Janela da rotina agendada (ou momento de criação da não agendada). */
  windowStart: ISODateString;
  windowEnd?: ISODateString;
  status: RoutineExecutionStatus;
  operatorUserId?: Id;
  startedAt?: ISODateString;
  finishedAt?: ISODateString;
  /** Justificativa de finalização sem completar todos os pontos. */
  finishJustification?: string;
  points: PointExecution[];
  /** Simulação do app: finalização feita offline aguarda sincronização. */
  sync: 'sincronizado' | 'pendente';
  /** Ocorrências geradas por não conformidade ou por não execução (integração existente). */
  generatedOccurrenceIds: Id[];
  reinspectionRequestId?: Id;
}

export type ReinspectionStatus = 'pendente' | 'programada' | 'executada' | 'nao-realizada';

export const REINSPECTION_STATUS_LABEL: Record<ReinspectionStatus, string> = {
  pendente: 'Aguardando programação',
  programada: 'Programada',
  executada: 'Executada',
  'nao-realizada': 'Não realizada',
};

/**
 * Pedido de reinspeção feito em Ocorrências (D-006). Rotinas programa e
 * executa como rotina não agendada de execução única, pelo gestor (D-013).
 */
export interface ReinspectionRequest {
  id: Id;
  occurrenceId: Id;
  requestedByUserId: Id;
  requestedAt: ISODateString;
  /** Sugestões do solicitante (não programam nada). */
  suggestedDate?: string;
  suggestedChecklistId?: Id;
  status: ReinspectionStatus;
  pointId?: Id;
  checklistId?: Id;
  routineId?: Id;
  executionId?: Id;
  scheduledByUserId?: Id;
  /** OK = nenhuma resposta Não Conforme (critério existente, D-013). */
  result?: 'ok' | 'nao-ok';
  resultAt?: ISODateString;
}
