import type { Id } from './common';

/**
 * Perfis de acesso iniciais (decisão do usuário em 03/11/2026).
 * São distintos dos perfis comerciais (ver contract.ts).
 */
export type ProfileId =
  | 'admin-corporativo'
  | 'gestor-local'
  | 'gestor-seguranca'
  | 'gestor-manutencao'
  | 'tecnico'
  | 'operador-rotinas';

/**
 * Permissões granulares. Nesta etapa cobrem acesso aos módulos e às ações
 * transversais; ações especialistas serão acrescentadas com cada módulo.
 */
export type Permission =
  | 'hub.view'
  | 'hub.events.acknowledge'
  | 'hub.dashboard.default'
  | 'central.view'
  | 'central.manage'
  | 'central.groups.corporate'
  | 'monitor.view'
  | 'monitor.manage'
  | 'rotinas.view'
  | 'rotinas.manage'
  | 'rotinas.execute'
  | 'manutencao.view'
  | 'manutencao.request'
  | 'manutencao.manage'
  | 'manutencao.execute'
  | 'ocorrencias.view'
  | 'ocorrencias.register'
  | 'ocorrencias.treat'
  | 'ocorrencias.conclude'
  | 'ocorrencias.exception'
  | 'ocorrencias.link'
  | 'ocorrencias.configure'
  | 'planos.view'
  | 'planos.manage'
  | 'planos.approve'
  | 'planos.evaluate'
  | 'planos.execute'
  | 'riscos.view'
  | 'riscos.manage'
  | 'pessoas.view'
  | 'admin.contract';

export interface Profile {
  id: ProfileId;
  name: string;
  description: string;
  permissions: Permission[];
}

/**
 * Escopo de localização do usuário. "corporativo" enxerga toda a empresa;
 * "locais" enxerga as localizações raiz informadas e seus descendentes.
 */
export type AccessScope =
  | { kind: 'corporativo' }
  | { kind: 'locais'; rootLocationIds: Id[] };

/** Usuário de demonstração (persona) vinculado a uma pessoa de fonte integrada. */
export interface DemoUser {
  id: Id;
  personId: Id;
  login: string;
  profileId: ProfileId;
  scope: AccessScope;
}
