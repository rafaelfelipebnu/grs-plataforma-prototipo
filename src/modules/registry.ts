import { MODULE_IDS, type ModuleId } from '@/domain';

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  /** Ícone Font Awesome 4.7. */
  icon: string;
  basePath: string;
  /** Papel do módulo, conforme docs/00 e docs/01. */
  summary: string;
  /** Responsabilidades (o módulo é dono destes dados e regras). */
  responsibilities: string[];
  /** Explicação de valor para quando o módulo não está contratado (sem dados operacionais). */
  valueProposition: string;
}

/**
 * Registro dos módulos na ordem oficial da sidebar (docs/01).
 * Textos extraídos dos documentos de contexto e das decisões do usuário.
 */
export const MODULES: Record<ModuleId, ModuleDefinition> = {
  'security-hub': {
    id: 'security-hub',
    name: 'Security Hub',
    icon: 'shield',
    basePath: '/security-hub',
    summary: 'Porta de entrada da plataforma integrada, centrada em segurança.',
    responsibilities: [
      'Consciência situacional e monitoramento de segurança',
      'Contextualização e correlação de eventos',
      'Orquestração da resposta, encaminhando comandos aos módulos especialistas',
      'Dashboard configurável por cliente e por usuário',
    ],
    valueProposition:
      'Reúne em uma única visão os eventos de segurança e os sinais de outros módulos que afetam a segurança, apoiando decisões e ações — não apenas a exibição de indicadores.',
  },
  central: {
    id: 'central',
    name: 'Central de Ativos e Ambientes',
    icon: 'sitemap',
    basePath: '/central',
    summary: 'Base compartilhada de identidade de ativos, dispositivos e locais.',
    responsibilities: [
      'Identidade mestre e cadastro de ativos e dispositivos',
      'Hierarquia única de localização',
      'Classificação, grupos e relacionamentos',
      'Painel 360º do ativo com visão consolidada dos módulos',
    ],
    valueProposition:
      'Um cadastro único de ativos, dispositivos e locais compartilhado por todos os módulos, evitando cadastros duplicados e dando contexto de localização, criticidade e impacto.',
  },
  monitor: {
    id: 'monitor',
    name: 'Monitor de Infraestrutura',
    icon: 'heartbeat',
    basePath: '/monitor',
    summary: 'Gestão técnica do monitoramento de dispositivos.',
    responsibilities: [
      'Descoberta de dispositivos (com aprovação humana)',
      'Conectividade e coleta de telemetria',
      'Saúde dos dispositivos',
      'Configuração de monitoramento e regras',
    ],
    valueProposition:
      'Conecta dispositivos por conectores de protocolo (BACnet, Modbus, MQTT, ONVIF, SNMP), coleta telemetria e acompanha a saúde e a conectividade da infraestrutura.',
  },
  rotinas: {
    id: 'rotinas',
    name: 'Gestão de Rotinas',
    icon: 'check-square-o',
    basePath: '/rotinas',
    summary: 'Planos, rotinas, checklists, pontos de controle e execução.',
    responsibilities: [
      'Planos de rotina, rotinas e checklists',
      'Pontos de controle e agendamento',
      'Execução móvel, inclusive offline, com evidências',
      'Não conformidades e geração de ocorrência',
    ],
    valueProposition:
      'Organiza inspeções e rondas com checklists e pontos de controle, executados em campo pelo aplicativo — inclusive sem conexão — com evidências e registro de não conformidades.',
  },
  manutencao: {
    id: 'manutencao',
    name: 'Gestão de Manutenção',
    icon: 'wrench',
    basePath: '/manutencao',
    summary: 'Solicitações, ordens de serviço, planejamento e execução.',
    responsibilities: [
      'Solicitações de manutenção e triagem',
      'Ordens de serviço e planejamento',
      'Execução, responsáveis e histórico',
      'Configuração do processo por etapa',
    ],
    valueProposition:
      'Separa solicitação, ordem de serviço e execução, com triagem, aprovações e histórico sobre a mesma base de ativos usada pelos demais módulos.',
  },
  ocorrencias: {
    id: 'ocorrencias',
    name: 'Gestão de Ocorrências',
    icon: 'exclamation-triangle',
    basePath: '/ocorrencias',
    summary: 'Registro, tratamento, planos de ação, evidências e eficácia.',
    responsibilities: [
      'Registro e tratamento de ocorrências',
      'Planos de ação e ações',
      'Reinspeção e encerramento',
      'Verificação de eficácia',
    ],
    valueProposition:
      'Trata ocorrências do registro ao encerramento, com planos de ação, evidências, reinspeção e verificação de eficácia.',
  },
  riscos: {
    id: 'riscos',
    name: 'Gestão de Riscos',
    icon: 'balance-scale',
    basePath: '/riscos',
    summary: 'Avaliação estruturada de riscos e controles.',
    responsibilities: ['Avaliação estruturada de riscos', 'Controles associados'],
    valueProposition:
      'Avaliação estruturada de riscos e controles, retroalimentada pelos eventos, ocorrências e evidências da operação.',
  },
};

export const MODULE_ORDER: ModuleDefinition[] = MODULE_IDS.map((id) => MODULES[id]);
