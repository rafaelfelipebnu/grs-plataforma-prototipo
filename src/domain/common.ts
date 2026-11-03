/** Identificador opaco de entidade. */
export type Id = string;

/** Data/hora no formato ISO 8601. */
export type ISODateString = string;

/**
 * Módulos da plataforma GRS na ordem oficial da sidebar
 * (docs/01-arquitetura-de-produto-e-navegacao.md).
 * Gestão de Terceiros está fora do escopo inicial.
 */
export const MODULE_IDS = [
  'security-hub',
  'central',
  'monitor',
  'rotinas',
  'manutencao',
  'ocorrencias',
  'riscos',
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

/**
 * Sistemas que fornecem dados à plataforma. Controle de Acesso é um produto
 * integrado (fonte de pessoas, permissões e eventos de acesso), não um item
 * da sidebar nesta versão.
 */
export type SourceSystem = ModuleId | 'controle-acesso';

/** Severidade alinhada às cores de criticidade do SDS (protocolo de Manchester). */
export type Severity = 'critica' | 'alta' | 'media' | 'baixa' | 'informativa';
