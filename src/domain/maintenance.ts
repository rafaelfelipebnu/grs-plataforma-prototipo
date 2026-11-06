import type { Id, ISODateString } from './common';

/**
 * Gestão de Manutenção — fundação operacional (etapa 5).
 * Solicitação, Ordem de Serviço e Execução são entidades distintas (docs/05).
 * Regras aprovadas: D-011 (DP-47), D-012 (DP-38, DP-40, DP-48, DP-50, DP-51),
 * D-013 (DP-38, DP-48). Pontos ainda em proposta estão marcados como
 * provisórios (P-49 a P-59 em docs/decisoes-evolucao.md).
 */

/**
 * Escala de prioridade. PROVISÓRIO (P-49): a DP-39 propõe a mesma escala da
 * ocorrência, ainda não aprovada.
 */
export type MaintenancePriority = 'critica' | 'alta' | 'media' | 'baixa' | 'planejada';

export const MAINTENANCE_PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  planejada: 'Planejada',
};

export const MAINTENANCE_PRIORITIES: MaintenancePriority[] = ['critica', 'alta', 'media', 'baixa', 'planejada'];

/** Status da solicitação (DP-35 proposta + DP-38/DP-40/DP-50 aprovadas). */
export type RequestStatus =
  | 'aberta'
  | 'em-triagem'
  | 'convertida'
  | 'resolvida-sem-os'
  | 'rejeitada'
  | 'duplicada'
  | 'redirecionada'
  | 'cancelada';

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  aberta: 'Aberta',
  'em-triagem': 'Em triagem',
  convertida: 'Convertida em OS',
  'resolvida-sem-os': 'Resolvida sem OS',
  rejeitada: 'Rejeitada',
  duplicada: 'Duplicada',
  redirecionada: 'Redirecionada',
  cancelada: 'Cancelada',
};

/** Status final: nenhuma ação de triagem disponível (exceto retomar triagem, DP-50). */
export const REQUEST_FINAL_STATUSES: RequestStatus[] = ['convertida', 'resolvida-sem-os', 'rejeitada', 'duplicada', 'redirecionada', 'cancelada'];

/**
 * Status da OS (DP-42 proposta + DP-47/DP-48/DP-51 aprovadas).
 * "Aguardando aprovação" (aprovação condicional) não está no protótipo: os
 * parâmetros da regra condicional seguem em aberto.
 */
export type WorkOrderStatus =
  | 'aberta'
  | 'planejada'
  | 'em-execucao'
  | 'suspensa'
  | 'aguardando-encerramento'
  | 'encerrada'
  | 'cancelada';

export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  aberta: 'Aberta',
  planejada: 'Planejada',
  'em-execucao': 'Em execução',
  suspensa: 'Suspensa',
  'aguardando-encerramento': 'Aguardando encerramento',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

/**
 * Status da execução. "Interrompida" é HIPÓTESE DEMONSTRATIVA (P-51, ajuste
 * da DP-51 em D-013), pendente de validação.
 */
export type ExecutionStatus = 'em-andamento' | 'concluida' | 'interrompida';

export const EXECUTION_STATUS_LABEL: Record<ExecutionStatus, string> = {
  'em-andamento': 'Em andamento',
  concluida: 'Concluída',
  interrompida: 'Interrompida',
};

/** Registro de histórico especialista (quem, quando, o quê). */
export interface MaintenanceHistoryEntry {
  at: ISODateString;
  actorUserId: Id | 'sistema';
  text: string;
}

export interface RedirectDestination {
  id: Id;
  name: string;
  kind: 'area-interna' | 'terceiro' | 'outro-sistema';
}

export const REDIRECT_KIND_LABEL: Record<RedirectDestination['kind'], string> = {
  'area-interna': 'Área interna sem sistema',
  terceiro: 'Terceiro',
  'outro-sistema': 'Outro sistema',
};

export interface MaintenanceRequest {
  id: Id;
  /** Código legível (ex.: SOL-0012). */
  code: string;
  title: string;
  description: string;
  locationId: Id;
  assetId?: Id;
  perceivedPriority: MaintenancePriority;
  /** Prioridade definida pela triagem. */
  definedPriority?: MaintenancePriority;
  origin: 'manual' | 'painel-ativo';
  requesterUserId: Id;
  createdAt: ISODateString;
  status: RequestStatus;
  triageUserId?: Id;
  workOrderId?: Id;
  /** OS anteriores, canceladas, ligadas a esta solicitação (DP-50). */
  cancelledWorkOrderIds: Id[];
  duplicateOfId?: Id;
  redirect?: { destinationId?: Id; destinationText: string };
  /** Justificativa do desfecho (resolvida, rejeitada, redirecionada, cancelada). */
  outcomeReason?: string;
  history: MaintenanceHistoryEntry[];
}

export interface Evidence {
  id: Id;
  /** Nome do arquivo simulado (nenhum arquivo é enviado). */
  name: string;
  at: ISODateString;
  byUserId: Id;
}

export interface WorkExecution {
  id: Id;
  technicianUserId: Id;
  startedAt: ISODateString;
  endedAt?: ISODateString;
  status: ExecutionStatus;
  /** Registro do trabalho realizado (obrigatório para concluir ou interromper). */
  workNotes?: string;
  evidences: Evidence[];
  interruption?: { byUserId: Id; reason: string };
}

export interface Suspension {
  startedAt: ISODateString;
  endedAt?: ISODateString;
  reason: string;
  /** Gestor que autorizou (D-013). */
  authorizedByUserId: Id;
  resumedByUserId?: Id;
  /** Status para o qual a OS volta ao retomar. */
  previousStatus: 'planejada' | 'em-execucao';
}

/** Impedimento registrado pelo técnico; a suspensão é decisão do gestor (D-013). */
export interface Impediment {
  id: Id;
  at: ISODateString;
  byUserId: Id;
  description: string;
  /** Resolvido quando o gestor suspende ou o técnico/gestor o descarta. */
  handled: boolean;
}

export interface WorkOrder {
  id: Id;
  code: string;
  title: string;
  description: string;
  locationId: Id;
  assetId?: Id;
  /** Solicitações atendidas (DP-41: n solicitações — protótipo cria 1:1, P-53). */
  requestIds: Id[];
  priority: MaintenancePriority;
  createdAt: ISODateString;
  createdByUserId: Id;
  status: WorkOrderStatus;
  /** Técnico atribuído. */
  technicianUserId?: Id;
  plannedDate?: string;
  executions: WorkExecution[];
  suspensions: Suspension[];
  impediments: Impediment[];
  closure?: { at: ISODateString; byUserId: Id; note: string };
  cancellation?: { at: ISODateString; byUserId: Id; reason: string; hadPartialWork: boolean };
  history: MaintenanceHistoryEntry[];
}
