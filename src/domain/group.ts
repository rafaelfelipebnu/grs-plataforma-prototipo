import type { Criticality } from './asset';
import type { Id, ISODateString, ModuleId } from './common';

/**
 * Categorias de grupo (docs/02):
 * 1. corporativo — corporativos/compartilhados, administrados pela Central;
 * 2. operacional — operacionais compartilhados, administrados pela Central;
 * 3. especializado — pertencem a um módulo, que os administra.
 */
export type GroupCategory = 'corporativo' | 'operacional' | 'especializado';

export const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = {
  corporativo: 'Corporativo compartilhado',
  operacional: 'Operacional compartilhado',
  especializado: 'Especializado de módulo',
};

/**
 * Regra de associação automática. Todos os critérios informados precisam ser
 * atendidos (E); várias regras no mesmo grupo se somam (OU).
 * Classificações e locais incluem seus descendentes.
 */
export interface GroupRule {
  id: Id;
  description: string;
  classificationIds?: Id[];
  criticalities?: Criticality[];
  locationIds?: Id[];
  /** Regra local: criada por gestor local, restrita a uma localização. */
  localScopeLocationId?: Id;
}

/** Associação manual (inclusão explícita). */
export interface GroupManualInclusion {
  assetId: Id;
  reason: string;
  byUserId: Id;
  at: ISODateString;
}

/** Exceção: mantém o ativo fora do grupo mesmo que uma regra o inclua. Persiste até remoção explícita. */
export interface GroupException {
  assetId: Id;
  reason: string;
  byUserId: Id;
  at: ISODateString;
}

/**
 * Reação de um módulo consumidor ao grupo (docs/02). Compartilhar o grupo
 * NÃO dispara ação: cada módulo precisa de configuração explícita.
 */
export type GroupReaction = 'nao-configurada' | 'informativa' | 'aplicar-configuracao' | 'gatilho-operacional';

export const GROUP_REACTION_LABEL: Record<GroupReaction, string> = {
  'nao-configurada': 'Não configurada no módulo',
  informativa: 'Informativa',
  'aplicar-configuracao': 'Aplicar configuração pré-definida',
  'gatilho-operacional': 'Gatilho operacional',
};

export interface GroupConsumer {
  moduleId: ModuleId;
  /** Configurada no próprio módulo consumidor; a Central só exibe. */
  reaction: GroupReaction;
}

/** Auditoria periódica de associações, concluída localmente sem aprovação corporativa. */
export interface GroupAudit {
  id: Id;
  locationId: Id;
  byUserId: Id;
  at: ISODateString;
  notes: string;
  membersReviewed: number;
}

export interface AssetGroup {
  id: Id;
  name: string;
  description: string;
  category: GroupCategory;
  /** Módulo que administra o grupo (Central para corporativo/operacional). */
  ownerModule: ModuleId;
  /** Grupo local: restrito a uma localização (criado por gestor local). Ausente = corporativo/toda a empresa. */
  scopeLocationId?: Id;
  rules: GroupRule[];
  manualInclusions: GroupManualInclusion[];
  exceptions: GroupException[];
  /** Módulos autorizados a consumir o grupo (somente grupos compartilhados). */
  consumers: GroupConsumer[];
  /** Periodicidade mínima de auditoria definida pelo corporativo (dias). */
  auditPeriodicityDays?: number;
  audits: GroupAudit[];
  createdAt: ISODateString;
  createdByUserId: Id;
}

/** Auditoria de associação (quem entrou/saiu) é distinta da auditoria de configuração (regras, consumidores). */
export type GroupHistoryKind = 'associacao' | 'configuracao';

export interface GroupHistoryEntry {
  id: Id;
  groupId: Id;
  kind: GroupHistoryKind;
  at: ISODateString;
  actorUserId: Id;
  action: string;
  assetId?: Id;
  ruleId?: Id;
  /** Origem da mudança: manual, regra, exceção, configuração, auditoria. */
  origin: 'manual' | 'regra' | 'excecao' | 'configuracao' | 'auditoria';
  reason: string;
  summary: string;
}
