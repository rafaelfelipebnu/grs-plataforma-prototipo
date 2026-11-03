import type { Id, ISODateString, ModuleId } from './common';

/** Criticidade INTRÍNSECA do ativo: importância própria, definida manualmente. */
export type Criticality = 'baixa' | 'media' | 'alta';

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

/**
 * Condição operacional atual — independente da criticidade.
 * Um ativo crítico pode estar normal; um ativo pouco crítico pode estar indisponível.
 */
export type OperationalCondition = 'normal' | 'atencao' | 'critico' | 'indisponivel';

export const CONDITION_LABEL: Record<OperationalCondition, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  critico: 'Crítico',
  indisponivel: 'Indisponível',
};

/** Origem da condição: informada manualmente ou alimentada por um módulo. */
export type ConditionSource = { kind: 'manual' } | { kind: 'modulo'; moduleId: ModuleId };

/** Classificação: o que o ativo é. Uma classificação principal, em hierarquia. */
export interface Classification {
  id: Id;
  parentId: Id | null;
  name: string;
}

/**
 * Relacionamento entre ativos. "depende-de": o ativo de origem depende do
 * ativo alvo para operar. Tipos adicionais serão definidos com a Central
 * (etapa 3) — ver decisoes-evolucao.md.
 */
export interface AssetRelationship {
  type: 'depende-de';
  targetAssetId: Id;
}

/**
 * Identidade mestre do ativo, mantida pela Central de Ativos e Ambientes.
 * Atributos especialistas permanecem nos módulos responsáveis.
 */
export interface Asset {
  id: Id;
  tag: string;
  name: string;
  description: string;
  classificationId: Id;
  /** Localização principal — obrigatória. */
  primaryLocationId: Id;
  /** Locais atendidos/afetados — distinto da localização principal. */
  servedLocationIds: Id[];
  criticality: Criticality;
  condition: OperationalCondition;
  conditionSource: ConditionSource;
  conditionUpdatedAt: ISODateString;
  /** Responsável direto; se ausente, herda da localização. */
  directResponsiblePersonId?: Id;
  relationships: AssetRelationship[];
  /** Onde o cadastro foi iniciado; a identidade mestre é sempre a mesma. */
  registeredFrom: ModuleId;
}
