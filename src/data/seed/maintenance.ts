import type { ISODateString, MaintenanceRequest, RedirectDestination, WorkOrder } from '@/domain';

/**
 * Destinos externos de redirecionamento (DP-38: lista configurável, sem
 * destino padrão no produto). Valores DE DEMONSTRAÇÃO — P-52.
 */
export const DEMO_REDIRECT_DESTINATIONS: RedirectDestination[] = [
  { id: 'dst-ti', name: 'Service desk de TI (demonstração)', kind: 'outro-sistema' },
  { id: 'dst-predial', name: 'Administração predial do condomínio (demonstração)', kind: 'terceiro' },
  { id: 'dst-limpeza', name: 'Equipe de limpeza e conservação (demonstração)', kind: 'area-interna' },
];

/**
 * Cenário de Manutenção da Unidade Joinville (e uma solicitação em Curitiba,
 * fora do escopo dos perfis locais). Dados fictícios.
 */
export function createDemoMaintenance(at: (minutesAgo: number) => ISODateString, today: Date) {
  const day = (offset: number) => {
    const d = new Date(today.getTime() + offset * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const requests: MaintenanceRequest[] = [
    {
      id: 'sol-001', code: 'SOL-0001', title: 'Ruído anormal no elevador social',
      description: 'Elevador emite estalos ao parar no 1º andar desde ontem. Continua operando.',
      locationId: 'loc-joi-adm', assetId: 'a-elv01', perceivedPriority: 'media', origin: 'manual',
      requesterUserId: 'u-local', createdAt: at(95), status: 'aberta', cancelledWorkOrderIds: [],
      history: [{ at: at(95), actorUserId: 'u-local', text: 'Solicitação aberta. Prioridade percebida: Média.' }],
    },
    {
      id: 'sol-002', code: 'SOL-0002', title: 'Vibração elevada na bomba de recalque',
      description: 'Ronda noturna percebeu vibração acima do normal na BMB-014 durante o teste semanal.',
      locationId: 'loc-joi-bombas', assetId: 'a-bmb014', perceivedPriority: 'alta', origin: 'manual',
      requesterUserId: 'u-seg', createdAt: at(240), status: 'em-triagem', triageUserId: 'u-man', cancelledWorkOrderIds: [],
      history: [
        { at: at(240), actorUserId: 'u-seg', text: 'Solicitação aberta. Prioridade percebida: Alta.' },
        { at: at(200), actorUserId: 'u-man', text: 'Triagem assumida.' },
      ],
    },
    {
      id: 'sol-003', code: 'SOL-0003', title: 'Temperatura da água gelada acima do setpoint',
      description: 'Chiller mantendo a água gelada 2 °C acima do setpoint no período da tarde.',
      locationId: 'loc-joi-maquinas', assetId: 'a-chl001', perceivedPriority: 'alta', origin: 'manual',
      requesterUserId: 'u-local', createdAt: at(2 * 1440), status: 'convertida', triageUserId: 'u-man', definedPriority: 'alta',
      workOrderId: 'os-001', cancelledWorkOrderIds: [],
      history: [
        { at: at(2 * 1440), actorUserId: 'u-local', text: 'Solicitação aberta. Prioridade percebida: Alta.' },
        { at: at(2 * 1440 - 60), actorUserId: 'u-man', text: 'Triagem assumida.' },
        { at: at(2 * 1440 - 70), actorUserId: 'u-man', text: 'Convertida na OS-0001. Prioridade definida: Alta.' },
      ],
    },
    {
      id: 'sol-004', code: 'SOL-0004', title: 'Inspeção do gerador após queda de energia',
      description: 'Gerador assumiu a carga por 40 minutos; verificar nível de óleo, filtros e registros de partida.',
      locationId: 'loc-joi-maquinas', assetId: 'a-ger002', perceivedPriority: 'media', origin: 'painel-ativo',
      requesterUserId: 'u-seg', createdAt: at(3 * 1440), status: 'convertida', triageUserId: 'u-man', definedPriority: 'media',
      workOrderId: 'os-002', cancelledWorkOrderIds: [],
      history: [
        { at: at(3 * 1440), actorUserId: 'u-seg', text: 'Solicitação aberta a partir do painel 360º do ativo. Prioridade percebida: Média.' },
        { at: at(3 * 1440 - 30), actorUserId: 'u-man', text: 'Triagem assumida.' },
        { at: at(3 * 1440 - 40), actorUserId: 'u-man', text: 'Convertida na OS-0002. Prioridade definida: Média.' },
      ],
    },
    {
      id: 'sol-005', code: 'SOL-0005', title: 'Lâmpada queimada no estacionamento',
      description: 'Poste 4 do estacionamento sem iluminação.',
      locationId: 'loc-joi-estac', perceivedPriority: 'baixa', origin: 'manual',
      requesterUserId: 'u-local', createdAt: at(5 * 1440), status: 'convertida', triageUserId: 'u-man', definedPriority: 'baixa',
      workOrderId: 'os-003', cancelledWorkOrderIds: [],
      history: [
        { at: at(5 * 1440), actorUserId: 'u-local', text: 'Solicitação aberta. Prioridade percebida: Baixa.' },
        { at: at(5 * 1440 - 120), actorUserId: 'u-man', text: 'Convertida na OS-0003. Prioridade definida: Baixa.' },
      ],
    },
    {
      id: 'sol-006', code: 'SOL-0006', title: 'Troca do switch da sala de servidores',
      description: 'Pedido de troca do switch de acesso por modelo com mais portas.',
      locationId: 'loc-joi-servidores', perceivedPriority: 'planejada', origin: 'manual',
      requesterUserId: 'u-local', createdAt: at(6 * 1440), status: 'redirecionada', triageUserId: 'u-man',
      redirect: { destinationId: 'dst-ti', destinationText: 'Service desk de TI (demonstração)' },
      outcomeReason: 'Equipamento de rede é atendido pela equipe de TI.', cancelledWorkOrderIds: [],
      history: [
        { at: at(6 * 1440), actorUserId: 'u-local', text: 'Solicitação aberta. Prioridade percebida: Planejada.' },
        { at: at(6 * 1440 - 90), actorUserId: 'u-man', text: 'Redirecionada para Service desk de TI (demonstração) (Outro sistema). Motivo: Equipamento de rede é atendido pela equipe de TI.' },
      ],
    },
    {
      id: 'sol-007', code: 'SOL-0007', title: 'Porta da doca 3 não fecha totalmente',
      description: 'Porta seccional da doca 3 para a 20 cm do chão.',
      locationId: 'loc-cwb', perceivedPriority: 'media', origin: 'manual',
      requesterUserId: 'u-admin', createdAt: at(300), status: 'aberta', cancelledWorkOrderIds: [],
      history: [{ at: at(300), actorUserId: 'u-admin', text: 'Solicitação aberta. Prioridade percebida: Média.' }],
    },
  ];

  const orders: WorkOrder[] = [
    {
      id: 'os-001', code: 'OS-0001', title: 'Temperatura da água gelada acima do setpoint',
      description: 'Chiller mantendo a água gelada 2 °C acima do setpoint no período da tarde.',
      locationId: 'loc-joi-maquinas', assetId: 'a-chl001', requestIds: ['sol-003'], priority: 'alta',
      createdAt: at(2 * 1440 - 70), createdByUserId: 'u-man', status: 'planejada', technicianUserId: 'u-tec', plannedDate: day(0),
      executions: [], suspensions: [], impediments: [],
      history: [
        { at: at(2 * 1440 - 70), actorUserId: 'u-man', text: 'OS criada a partir da solicitação SOL-0003. Prioridade: Alta.' },
        { at: at(2 * 1440 - 80), actorUserId: 'u-man', text: `Planejada: técnico André Lima, data prevista ${day(0).split('-').reverse().join('/')}.` },
      ],
    },
    {
      id: 'os-002', code: 'OS-0002', title: 'Inspeção do gerador após queda de energia',
      description: 'Gerador assumiu a carga por 40 minutos; verificar nível de óleo, filtros e registros de partida.',
      locationId: 'loc-joi-maquinas', assetId: 'a-ger002', requestIds: ['sol-004'], priority: 'media',
      createdAt: at(3 * 1440 - 40), createdByUserId: 'u-man', status: 'em-execucao', technicianUserId: 'u-tec', plannedDate: day(-1),
      executions: [
        {
          id: 'ex-001', technicianUserId: 'u-tec', startedAt: at(26 * 60), endedAt: at(25 * 60), status: 'concluida',
          workNotes: 'Nível de óleo verificado e completado. Filtro de ar com saturação moderada — troca necessária.',
          evidences: [{ id: 'ev-001', name: 'painel-gerador.jpg', at: at(25 * 60), byUserId: 'u-tec' }],
        },
      ],
      suspensions: [], impediments: [],
      history: [
        { at: at(3 * 1440 - 40), actorUserId: 'u-man', text: 'OS criada a partir da solicitação SOL-0004. Prioridade: Média.' },
        { at: at(3 * 1440 - 50), actorUserId: 'u-man', text: `Planejada: técnico André Lima, data prevista ${day(-1).split('-').reverse().join('/')}.` },
        { at: at(26 * 60), actorUserId: 'u-tec', text: 'Execução iniciada. OS em execução.' },
        { at: at(25 * 60), actorUserId: 'u-tec', text: 'Execução concluída pelo técnico com 1 evidência(s). A OS continua aberta até o encerramento pelo gestor (DP-47).' },
      ],
    },
    {
      id: 'os-003', code: 'OS-0003', title: 'Lâmpada queimada no estacionamento',
      description: 'Poste 4 do estacionamento sem iluminação.',
      locationId: 'loc-joi-estac', requestIds: ['sol-005'], priority: 'baixa',
      createdAt: at(5 * 1440 - 120), createdByUserId: 'u-man', status: 'aguardando-encerramento', technicianUserId: 'u-tec', plannedDate: day(-2),
      executions: [
        {
          id: 'ex-002', technicianUserId: 'u-tec', startedAt: at(2 * 1440 + 60), endedAt: at(2 * 1440), status: 'concluida',
          workNotes: 'Lâmpada e reator substituídos. Iluminação testada ao anoitecer.',
          evidences: [{ id: 'ev-002', name: 'poste-4-aceso.jpg', at: at(2 * 1440), byUserId: 'u-tec' }],
        },
      ],
      suspensions: [], impediments: [],
      history: [
        { at: at(5 * 1440 - 120), actorUserId: 'u-man', text: 'OS criada a partir da solicitação SOL-0005. Prioridade: Baixa.' },
        { at: at(2 * 1440 + 60), actorUserId: 'u-tec', text: 'Execução iniciada. OS em execução.' },
        { at: at(2 * 1440), actorUserId: 'u-tec', text: 'Execução concluída pelo técnico com 1 evidência(s).' },
        { at: at(2 * 1440 - 5), actorUserId: 'u-tec', text: 'Trabalho finalizado pelo técnico. OS enviada para encerramento.' },
      ],
    },
  ];

  return { requests, orders, counters: { request: requests.length, workOrder: orders.length } };
}
