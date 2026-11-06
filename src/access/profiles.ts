import type { Permission, Profile, ProfileId } from '@/domain';

/**
 * Matriz de permissões dos perfis de acesso.
 *
 * Os NOMES dos perfis foram definidos pelo usuário (03/11/2026). A distribuição
 * de permissões abaixo é PROVISÓRIA — derivada das responsabilidades descritas
 * nos documentos — e está registrada em docs/decisoes-evolucao.md para
 * validação. Alterar aqui reflete em toda a aplicação.
 */
const ALL_PERMISSIONS: Permission[] = [
  'hub.view',
  'hub.events.acknowledge',
  'hub.dashboard.default',
  'central.view',
  'central.manage',
  'central.groups.corporate',
  'monitor.view',
  'monitor.manage',
  'rotinas.view',
  'rotinas.manage',
  'rotinas.execute',
  'manutencao.view',
  'manutencao.request',
  'manutencao.manage',
  'manutencao.execute',
  'ocorrencias.view',
  'ocorrencias.register',
  'ocorrencias.treat',
  'ocorrencias.conclude',
  'ocorrencias.exception',
  'ocorrencias.configure',
  'riscos.view',
  'riscos.manage',
  'pessoas.view',
  'admin.contract',
];

export const PROFILES: Record<ProfileId, Profile> = {
  'admin-corporativo': {
    id: 'admin-corporativo',
    name: 'Administrador Corporativo',
    description:
      'Define padrões corporativos, administra configurações e tem visão consolidada de todas as unidades.',
    permissions: ALL_PERMISSIONS,
  },
  'gestor-seguranca': {
    id: 'gestor-seguranca',
    name: 'Gestor de Segurança',
    description:
      'Persona principal. Acompanha a consciência situacional, reconhece alertas e coordena a resposta a ocorrências.',
    permissions: [
      'hub.view',
      'hub.events.acknowledge',
      'central.view',
      'monitor.view',
      'rotinas.view',
      'manutencao.view',
      'manutencao.request',
      'ocorrencias.view',
      'ocorrencias.register',
      'ocorrencias.treat',
      'ocorrencias.conclude',
      'ocorrencias.exception',
      'riscos.view',
      'pessoas.view',
    ],
  },
  'gestor-local': {
    id: 'gestor-local',
    name: 'Gestor Local',
    description:
      'Responde pela operação de uma unidade: valida associações, gerencia ativos e rotinas locais dentro do seu escopo.',
    permissions: [
      'hub.view',
      'hub.events.acknowledge',
      'central.view',
      'central.manage',
      'monitor.view',
      'rotinas.view',
      'rotinas.manage',
      'manutencao.view',
      'manutencao.request',
      'ocorrencias.view',
      'ocorrencias.register',
      'ocorrencias.treat',
      'ocorrencias.conclude',
      'ocorrencias.exception',
      'riscos.view',
      'pessoas.view',
    ],
  },
  'gestor-manutencao': {
    id: 'gestor-manutencao',
    name: 'Gestor de Manutenção',
    description:
      'Faz triagem, priorização e autorização de solicitações e planeja ordens de serviço.',
    permissions: [
      'central.view',
      'monitor.view',
      'rotinas.view',
      'manutencao.view',
      'manutencao.request',
      'manutencao.manage',
      'manutencao.execute',
      'ocorrencias.view',
    ],
  },
  tecnico: {
    id: 'tecnico',
    name: 'Técnico',
    description: 'Executa ordens de serviço atribuídas e registra a execução e as evidências.',
    permissions: ['central.view', 'manutencao.view', 'manutencao.request', 'manutencao.execute'],
  },
  'operador-rotinas': {
    id: 'operador-rotinas',
    name: 'Operador de Rotinas',
    description: 'Executa rotinas e checklists em campo, inclusive pelo aplicativo móvel.',
    permissions: ['rotinas.view', 'rotinas.execute'],
  },
};

export const PROFILE_ORDER: ProfileId[] = [
  'admin-corporativo',
  'gestor-seguranca',
  'gestor-local',
  'gestor-manutencao',
  'tecnico',
  'operador-rotinas',
];
