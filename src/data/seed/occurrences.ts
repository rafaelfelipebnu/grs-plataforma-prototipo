import type { ISODateString, Occurrence, OccurrenceType } from '@/domain';

/**
 * Tipos de ocorrência de demonstração. Campos existentes do produto + as
 * condições de conclusão opcionais da Linha GRS (DP-04). Valores fictícios.
 */
export const DEMO_OCCURRENCE_TYPES: OccurrenceType[] = [
  {
    id: 'tp-vidro', name: 'Vidro quebrado', defaultPriority: 'media', monitored: false, warningSound: false,
    notifiedEmails: [], conclusion: { requireEvidence: false, requireJustification: false, criterion: 'manual', requirePlan: 'nao-exige', requireReinspection: false },
  },
  {
    id: 'tp-vazamento', name: 'Vazamento', defaultPriority: 'alta', monitored: true, warningSound: false,
    notifiedEmails: ['facilities@aurora-demo.invalid'], conclusion: { requireEvidence: true, requireJustification: false, criterion: 'manual', requirePlan: 'nao-exige', requireReinspection: false },
  },
  {
    id: 'tp-acesso', name: 'Acesso indevido', defaultPriority: 'alta', monitored: true, warningSound: true,
    notifiedEmails: ['seguranca@aurora-demo.invalid'], conclusion: { requireEvidence: false, requireJustification: true, criterion: 'manual', requirePlan: 'nao-exige', requireReinspection: false },
  },
  {
    id: 'tp-equip-seg', name: 'Falha em equipamento de segurança', defaultPriority: 'critica', monitored: true, warningSound: true,
    notifiedEmails: ['seguranca@aurora-demo.invalid'], conclusion: { requireEvidence: true, requireJustification: false, criterion: 'aprovacao', requirePlan: 'nao-exige', requireReinspection: false },
  },
  {
    id: 'tp-ronda', name: 'Irregularidade em ronda', defaultPriority: 'media', monitored: false, warningSound: false,
    notifiedEmails: [], conclusion: { requireEvidence: false, requireJustification: false, criterion: 'manual', requirePlan: 'exige-iniciado', requireReinspection: false },
  },
  {
    id: 'tp-auditoria', name: 'Verificação programada', defaultPriority: 'planejada', monitored: false, warningSound: false,
    notifiedEmails: [], conclusion: { requireEvidence: false, requireJustification: false, criterion: 'manual', requirePlan: 'nao-exige', requireReinspection: false },
  },
  {
    id: 'tp-inspecao', name: 'Não conformidade de inspeção', defaultPriority: 'media', monitored: false, warningSound: false,
    notifiedEmails: [], conclusion: { requireEvidence: false, requireJustification: false, criterion: 'manual', requirePlan: 'nao-exige', requireReinspection: true },
  },
  {
    id: 'tp-desvio', name: 'Desvio de procedimento de segurança', defaultPriority: 'alta', monitored: false, warningSound: false,
    notifiedEmails: ['seguranca@aurora-demo.invalid'], conclusion: { requireEvidence: false, requireJustification: false, criterion: 'manual', requirePlan: 'exige-concluido', requireReinspection: false },
  },
];

/** Ocorrências da Unidade Joinville (e uma em Curitiba, fora do escopo dos perfis locais). */
export function createDemoOccurrences(at: (minutesAgo: number) => ISODateString): Occurrence[] {
  const base = { pauses: [], eligible: false, involvedPersonIds: [] as string[] };
  return [
    {
      ...base,
      id: 'oc-001', code: 'OC-0001', typeId: 'tp-acesso', locationId: 'loc-joi-servidores', description: 'Acesso à Sala de Servidores fora do horário autorizado, com crachá de colaborador da TI.',
      occurredAt: at(190), createdAt: at(185), priority: 'alta', origin: 'evento', sourceEventId: 'ev-007', registeredByUserId: 'u-seg',
      involvedPersonIds: ['p-09'], status: 'sem-tratamento', proceedings: [],
      history: [{ at: at(185), actorUserId: 'u-seg', kind: 'acao', text: 'Ocorrência registrada — Evento do Security Hub EVT-2026-0377. Prioridade Alta.' }],
    },
    {
      ...base,
      id: 'oc-002', code: 'OC-0002', typeId: 'tp-vazamento', locationId: 'loc-joi-maquinas', assetId: 'a-chl001',
      description: 'Poça de água sob o chiller, próxima ao quadro de comando.', occurredAt: at(300), createdAt: at(295), priority: 'alta', origin: 'usuario',
      registeredByUserId: 'u-local', status: 'em-andamento', firstProceedingAt: at(280),
      proceedings: [{ id: 'tr-001', at: at(280), byUserId: 'u-local', text: 'Área isolada com fita. Acionada a equipe de manutenção.', attachments: [] }],
      history: [
        { at: at(295), actorUserId: 'u-local', kind: 'acao', text: 'Ocorrência registrada — Registro por usuário. Prioridade Alta.' },
        { at: at(295), actorUserId: 'sistema', kind: 'automatico', text: 'Tipo monitorado: exibida em "Ocorrências em aberto" no Monitoramento (notificação existente, simulada).' },
        { at: at(280), actorUserId: 'u-local', kind: 'acao', text: 'Primeiro trâmite registrado: ocorrência Em andamento (tempo de resposta encerrado).' },
      ],
    },
    {
      ...base,
      id: 'oc-003', code: 'OC-0003', typeId: 'tp-equip-seg', locationId: 'loc-joi-estac', assetId: 'a-cam02',
      description: 'Câmera do estacionamento sem imagem desde a madrugada.', occurredAt: at(600), createdAt: at(590), priority: 'critica', origin: 'usuario',
      registeredByUserId: 'u-seg', status: 'em-andamento', firstProceedingAt: at(560), eligible: true,
      proceedings: [
        { id: 'tr-002', at: at(560), byUserId: 'u-seg', text: 'Ronda presencial reforçada no estacionamento até o retorno da câmera.', attachments: [] },
        { id: 'tr-003', at: at(120), byUserId: 'u-local', text: 'Fonte da câmera substituída; imagem restabelecida.', attachments: ['cam-est-03-imagem.jpg'] },
      ],
      history: [
        { at: at(590), actorUserId: 'u-seg', kind: 'acao', text: 'Ocorrência registrada — Registro por usuário. Prioridade Crítica.' },
        { at: at(560), actorUserId: 'u-seg', kind: 'acao', text: 'Primeiro trâmite registrado: ocorrência Em andamento (tempo de resposta encerrado).' },
        { at: at(120), actorUserId: 'sistema', kind: 'automatico', text: 'Passou a atender às condições verificáveis de conclusão do tipo (N3 enviada).' },
      ],
    },
    {
      ...base,
      id: 'oc-004', code: 'OC-0004', typeId: 'tp-vidro', locationId: 'loc-joi-recepcao', description: 'Vidro da porta lateral da recepção trincado.',
      occurredAt: at(2 * 1440), createdAt: at(2 * 1440 - 10), priority: 'media', origin: 'usuario', registeredByUserId: 'u-local',
      status: 'em-pausa', firstProceedingAt: at(2 * 1440 - 60),
      proceedings: [{ id: 'tr-004', at: at(2 * 1440 - 60), byUserId: 'u-local', text: 'Orçamento solicitado ao fornecedor de vidros.', attachments: [] }],
      pauses: [{ startedAt: at(1440), reason: 'Aguardando entrega do vidro pelo fornecedor (prazo de 3 dias).', byUserId: 'u-local' }],
      history: [
        { at: at(2 * 1440 - 10), actorUserId: 'u-local', kind: 'acao', text: 'Ocorrência registrada — Registro por usuário. Prioridade Média.' },
        { at: at(2 * 1440 - 60), actorUserId: 'u-local', kind: 'acao', text: 'Primeiro trâmite registrado: ocorrência Em andamento (tempo de resposta encerrado).' },
        { at: at(1440), actorUserId: 'u-local', kind: 'acao', text: 'Ocorrência pausada. Justificativa: Aguardando entrega do vidro pelo fornecedor (prazo de 3 dias).' },
      ],
    },
    {
      ...base,
      id: 'oc-005', code: 'OC-0005', typeId: 'tp-ronda', locationId: 'loc-joi-portaria', description: 'Não conformidade no ponto "Portão de veículos trancado" durante a ronda noturna.',
      occurredAt: at(420), createdAt: at(418), priority: 'media', origin: 'nao-conformidade', sourceExecutionId: 're-003', registeredByUserId: 'sistema', status: 'sem-tratamento', proceedings: [],
      history: [{ at: at(418), actorUserId: 'sistema', kind: 'automatico', text: 'Gerada automaticamente por não conformidade de checklist (integração existente com Gestão de Rotinas — simulada).' }],
    },
    {
      ...base,
      id: 'oc-006', code: 'OC-0006', typeId: 'tp-auditoria', locationId: 'loc-joi-ind', description: 'Verificação programada dos extintores do Prédio Industrial.',
      occurredAt: at(1440 * 3), createdAt: at(1440 * 3), priority: 'planejada', origin: 'usuario', registeredByUserId: 'u-local', status: 'concluida',
      firstProceedingAt: at(1440 * 3 - 30),
      proceedings: [{ id: 'tr-005', at: at(1440 * 3 - 30), byUserId: 'u-local', text: 'Todos os extintores dentro da validade; lacres conferidos.', attachments: [] }],
      conclusion: { at: at(300), byUserId: 'u-local', evidenceNames: [] },
      history: [
        { at: at(1440 * 3), actorUserId: 'u-local', kind: 'acao', text: 'Ocorrência registrada — Registro por usuário. Prioridade Planejada.' },
        { at: at(1440 * 3 - 30), actorUserId: 'u-local', kind: 'acao', text: 'Primeiro trâmite registrado: ocorrência Em andamento (tempo de resposta encerrado).' },
        { at: at(300), actorUserId: 'u-local', kind: 'acao', text: 'Ocorrência concluída.' },
      ],
    },
    {
      ...base,
      id: 'oc-007', code: 'OC-0007', typeId: 'tp-acesso', locationId: 'loc-cwb-portaria', description: 'Caminhão tentou entrar sem agendamento na portaria de caminhões.',
      occurredAt: at(150), createdAt: at(148), priority: 'alta', origin: 'usuario', registeredByUserId: 'u-admin', status: 'sem-tratamento', proceedings: [],
      history: [{ at: at(148), actorUserId: 'u-admin', kind: 'acao', text: 'Ocorrência registrada — Registro por usuário. Prioridade Alta.' }],
    },
    {
      ...base,
      id: 'oc-008', code: 'OC-0008', typeId: 'tp-desvio', locationId: 'loc-joi-ind', assetId: 'a-ext12',
      description: 'Extintor da Linha 1 obstruído por paletes durante a auditoria de segurança; outros pontos com sinalização apagada.',
      occurredAt: at(5 * 1440), createdAt: at(5 * 1440 - 20), priority: 'alta', origin: 'usuario', registeredByUserId: 'u-seg',
      status: 'em-andamento', firstProceedingAt: at(5 * 1440 - 60),
      proceedings: [{ id: 'tr-006', at: at(5 * 1440 - 60), byUserId: 'u-seg', text: 'Paletes removidos na hora. Aberto plano de ação para tratar a causa.', attachments: [] }],
      history: [
        { at: at(5 * 1440 - 20), actorUserId: 'u-seg', kind: 'acao', text: 'Ocorrência registrada — Registro por usuário. Prioridade Alta.' },
        { at: at(5 * 1440 - 60), actorUserId: 'u-seg', kind: 'acao', text: 'Primeiro trâmite registrado: ocorrência Em andamento (tempo de resposta encerrado).' },
        { at: at(5 * 1440 - 50), actorUserId: 'sistema', kind: 'automatico', text: 'Plano de ação PA-0001 vinculado.' },
      ],
    },
    {
      ...base,
      id: 'oc-009', code: 'OC-0009', typeId: 'tp-inspecao', locationId: 'loc-joi-bombas', assetId: 'a-bmb014',
      description: 'Não conformidade no item "Painel da bomba sem alarmes ativos": alarme de baixa pressão ativo no painel.',
      occurredAt: at(2 * 1440), createdAt: at(2 * 1440), priority: 'media', origin: 'nao-conformidade', sourceExecutionId: 're-005', registeredByUserId: 'sistema',
      status: 'em-andamento', firstProceedingAt: at(1500),
      proceedings: [{ id: 'tr-007', at: at(1500), byUserId: 'u-seg', text: 'Pressostato recalibrado pela manutenção. Solicitada reinspeção para confirmar.', attachments: [] }],
      history: [
        { at: at(2 * 1440), actorUserId: 'sistema', kind: 'automatico', text: 'Gerada automaticamente por não conformidade de checklist na execução EX-0005 (integração existente com Gestão de Rotinas).' },
        { at: at(1500), actorUserId: 'u-seg', kind: 'acao', text: 'Primeiro trâmite registrado: ocorrência Em andamento (tempo de resposta encerrado).' },
        { at: at(1440), actorUserId: 'u-seg', kind: 'automatico', text: 'Reinspeção solicitada à Gestão de Rotinas (aguardando programação).' },
      ],
    },
  ];
}
