import type { Id, ISODateString } from './common';

/**
 * Plano de Ação — entidade funcional COMPARTILHADA do GRS (diretriz D-011):
 * ciclo próprio, origem e contexto preservados; o módulo de origem não é dono
 * exclusivo. Regras aprovadas: D-012 (DP-23, DP-24, DP-26, DP-32, DP-33, DP-34),
 * D-013 (DP-08, DP-10a, eficácia). O ciclo-base (DP-16 a DP-22, DP-27 a DP-31)
 * ainda é proposta: implementado como provisório (P-70 em diante).
 */

/** Status do plano [C] (docs/06). Concluído e Cancelado são finais (DP-23: sem reabertura). */
export type PlanStatus = 'rascunho' | 'em-andamento' | 'pausado' | 'aguardando-aprovacao' | 'concluido' | 'cancelado';

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  rascunho: 'Rascunho',
  'em-andamento': 'Em andamento',
  pausado: 'Pausado',
  'aguardando-aprovacao': 'Aguardando aprovação',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/** Status da ação (DP-27, proposta). Sem "Pausada": pausa individual é evolução futura (DP-34). */
export type PlanActionStatus = 'pendente' | 'em-execucao' | 'concluida' | 'cancelada';

export const PLAN_ACTION_STATUS_LABEL: Record<PlanActionStatus, string> = {
  pendente: 'Pendente',
  'em-execucao': 'Em execução',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

/** Resultado da eficácia (atributo do plano, não status) [C]. */
export type EffectivenessResult = 'eficaz' | 'parcial' | 'ineficaz';

export const EFFECTIVENESS_LABEL: Record<EffectivenessResult, string> = {
  eficaz: 'Eficaz',
  parcial: 'Parcialmente eficaz',
  ineficaz: 'Ineficaz',
};

export type PlanOriginModule = 'ocorrencias' | 'manutencao' | 'rotinas' | 'direto';

export const PLAN_ORIGIN_LABEL: Record<PlanOriginModule, string> = {
  ocorrencias: 'Gestão de Ocorrências',
  manutencao: 'Gestão de Manutenção',
  rotinas: 'Gestão de Rotinas',
  direto: 'Criação direta',
};

export interface PlanHistoryEntry {
  at: ISODateString;
  actorUserId: Id | 'sistema';
  text: string;
}

/** Vínculo com objeto de outro módulo. Desvincular não apaga a relação do histórico (DP-25b, orientação). */
export interface PlanLink {
  kind: 'ocorrencia';
  targetId: Id;
  linkedAt: ISODateString;
  linkedByUserId: Id;
  justification?: string;
}

export interface PlanAction {
  id: Id;
  /** Sequencial dentro do plano (A1, A2…). */
  number: number;
  description: string;
  executorUserId: Id;
  dueDate: string;
  status: PlanActionStatus;
  /** Ações das quais esta depende (devem estar Concluídas para iniciar). */
  dependsOn: Id[];
  startedAt?: ISODateString;
  concludedAt?: ISODateString;
  resultNotes?: string;
  evidences: string[];
  cancelReason?: string;
  /** Prazo original quando reprogramado. */
  originalDueDate?: string;
  /** Solicitação de manutenção referenciada (DP-33). */
  linkedRequestId?: Id;
  /** Justificativa do executor para manter aberta após a execução vinculada (DP-33). */
  keptOpenReason?: string;
}

export interface PlanPause {
  startedAt: ISODateString;
  endedAt?: ISODateString;
  reason: string;
  byUserId: Id;
}

export interface ActionPlan {
  id: Id;
  code: string;
  title: string;
  objective: string;
  /** Origem imutável: só registra de onde veio; não confere propriedade (D-011). */
  origin: { module: PlanOriginModule; occurrenceId?: Id; byUserId: Id; at: ISODateString };
  /** Contexto: local obrigatório (define o escopo), ativo opcional. */
  locationId: Id;
  assetId?: Id;
  links: PlanLink[];
  status: PlanStatus;
  responsibleUserId: Id;
  dueDate: string;
  originalDueDate?: string;
  /** Aprovação final (PROVISÓRIO: só "nenhuma" ou "final" no protótipo — P-71). */
  approvalMode: 'nenhuma' | 'final';
  approverUserId?: Id;
  /** Avaliação de eficácia (DP-24): avaliador e data obrigatórios na conclusão (D-013). */
  evaluatorUserId?: Id;
  evaluationDueDate?: string;
  /** Aprovador opcional da avaliação, conforme configuração (DP-24). */
  evaluationApproverUserId?: Id;
  effectiveness?: {
    state: 'pendente' | 'aguardando-aprovacao' | 'avaliada';
    result?: EffectivenessResult;
    justification?: string;
    evaluatedByUserId?: Id;
    evaluatedAt?: ISODateString;
  };
  /** Plano anterior, quando criado por eficácia Parcial ou Ineficaz (DP-23). */
  relatedPlanId?: Id;
  actions: PlanAction[];
  actionCounter: number;
  pauses: PlanPause[];
  createdAt: ISODateString;
  concludedAt?: ISODateString;
  cancelReason?: string;
  history: PlanHistoryEntry[];
}

/** Exigência de plano no tipo de ocorrência (DP-10, D-010; DP-10a, D-013). */
export type PlanRequirement = 'nao-exige' | 'exige-iniciado' | 'exige-concluido';

export const PLAN_REQUIREMENT_LABEL: Record<PlanRequirement, string> = {
  'nao-exige': 'Não exige',
  'exige-iniciado': 'Exige plano iniciado',
  'exige-concluido': 'Exige plano concluído',
};
