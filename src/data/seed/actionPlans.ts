import type { ActionPlan, ISODateString } from '@/domain';

/** Planos de ação de demonstração (Unidade Joinville). Dados fictícios. */
export function createDemoActionPlans(at: (minutesAgo: number) => ISODateString, today: Date): ActionPlan[] {
  const day = (offset: number) => {
    const d = new Date(today.getTime() + offset * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return [
    {
      id: 'pa-001', code: 'PA-0001', title: 'Desobstrução e sinalização de extintores — Prédio Industrial',
      objective: 'Eliminar a obstrução recorrente de extintores e recuperar a sinalização no Prédio Industrial.',
      origin: { module: 'ocorrencias', occurrenceId: 'oc-008', byUserId: 'u-seg', at: at(5 * 1440 - 50) },
      locationId: 'loc-joi-ind', assetId: 'a-ext12',
      links: [{ kind: 'ocorrencia', targetId: 'oc-008', linkedAt: at(5 * 1440 - 50), linkedByUserId: 'u-seg' }],
      status: 'em-andamento', responsibleUserId: 'u-local', dueDate: day(10), approvalMode: 'nenhuma',
      evaluatorUserId: 'u-seg', evaluationDueDate: day(40),
      actions: [
        {
          id: 'ac-001', number: 1, description: 'Demarcar no piso a área livre de cada extintor da Linha 1.', executorUserId: 'u-local', dueDate: day(-2),
          status: 'concluida', dependsOn: [], startedAt: at(4 * 1440), concludedAt: at(3 * 1440), resultNotes: 'Demarcação amarela aplicada em 12 pontos.', evidences: ['demarcacao-linha1.jpg'],
        },
        {
          id: 'ac-002', number: 2, description: 'Inspecionar o gerador de apoio da área (via solicitação de manutenção).', executorUserId: 'u-tec', dueDate: day(2),
          status: 'em-execucao', dependsOn: [], startedAt: at(2 * 1440), evidences: [], linkedRequestId: 'sol-004',
        },
        {
          id: 'ac-003', number: 3, description: 'Comprar placas fotoluminescentes (fornecedor descontinuou o modelo).', executorUserId: 'u-local', dueDate: day(1),
          status: 'cancelada', dependsOn: [], evidences: [], cancelReason: 'Fornecedor descontinuou o modelo; avaliar alternativa.',
        },
        {
          id: 'ac-004', number: 4, description: 'Instalar a nova sinalização nos 12 pontos.', executorUserId: 'u-tec', dueDate: day(6),
          status: 'pendente', dependsOn: ['ac-003'], evidences: [],
        },
      ],
      actionCounter: 4, pauses: [], createdAt: at(5 * 1440 - 50),
      history: [
        { at: at(5 * 1440 - 50), actorUserId: 'u-seg', text: 'Plano criado em Rascunho a partir da ocorrência OC-0008.' },
        { at: at(5 * 1440 - 40), actorUserId: 'u-local', text: 'Plano ativado: Em andamento.' },
        { at: at(1440), actorUserId: 'u-local', text: 'Ação A3 cancelada. Justificativa: Fornecedor descontinuou o modelo; avaliar alternativa. — A4 fica bloqueada até decisão.' },
      ],
    },
    {
      id: 'pa-002', code: 'PA-0002', title: 'Reforço do controle de acesso à Sala de Servidores',
      objective: 'Reduzir acessos fora do horário à Sala de Servidores.',
      origin: { module: 'direto', byUserId: 'u-local', at: at(30 * 1440) },
      locationId: 'loc-joi-servidores', links: [],
      status: 'concluido', responsibleUserId: 'u-local', dueDate: day(-5), approvalMode: 'nenhuma',
      evaluatorUserId: 'u-seg', evaluationDueDate: day(-1),
      effectiveness: { state: 'pendente' },
      actions: [
        {
          id: 'ac-101', number: 1, description: 'Revisar a lista de crachás autorizados.', executorUserId: 'u-local', dueDate: day(-20),
          status: 'concluida', dependsOn: [], concludedAt: at(20 * 1440), resultNotes: 'Removidos 4 crachás sem necessidade de acesso.', evidences: [],
        },
        {
          id: 'ac-102', number: 2, description: 'Configurar alerta de acesso fora do horário.', executorUserId: 'u-local', dueDate: day(-8),
          status: 'concluida', dependsOn: ['ac-101'], concludedAt: at(8 * 1440), resultNotes: 'Regra ativa no Controle de Acesso (simulado).', evidences: [],
        },
      ],
      actionCounter: 2, pauses: [], createdAt: at(30 * 1440), concludedAt: at(6 * 1440),
      history: [
        { at: at(30 * 1440), actorUserId: 'u-local', text: 'Plano criado em Rascunho.' },
        { at: at(6 * 1440), actorUserId: 'u-local', text: 'Plano concluído. Eficácia pendente de avaliação.' },
      ],
    },
    {
      id: 'pa-003', code: 'PA-0003', title: 'Revisão do roteiro da ronda noturna da portaria',
      objective: 'Ajustar o roteiro da ronda para incluir o portão de veículos.',
      origin: { module: 'ocorrencias', occurrenceId: 'oc-005', byUserId: 'u-local', at: at(300) },
      locationId: 'loc-joi-portaria',
      links: [{ kind: 'ocorrencia', targetId: 'oc-005', linkedAt: at(300), linkedByUserId: 'u-local' }],
      status: 'rascunho', responsibleUserId: 'u-local', dueDate: day(15), approvalMode: 'final', approverUserId: 'u-seg',
      actions: [], actionCounter: 0, pauses: [], createdAt: at(300),
      history: [{ at: at(300), actorUserId: 'u-local', text: 'Plano criado em Rascunho a partir da ocorrência OC-0005.' }],
    },
  ];
}
