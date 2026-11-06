import type { Checklist, ControlPoint, ISODateString, ReinspectionRequest, Routine, RoutineExecution, RoutinePlan } from '@/domain';

/**
 * Cenário de Gestão de Rotinas (Unidade Joinville). Conceitos do produto
 * existente; dados fictícios. Datas relativas a `now` para parecer "ao vivo".
 */
export function createDemoRoutines(at: (minutesAgo: number) => ISODateString) {
  const plans: RoutinePlan[] = [
    { id: 'rp-001', name: 'Ronda Patrimonial — Unidade Joinville', area: 'Segurança Patrimonial', locationId: 'loc-joi', active: true, notes: 'Rondas da portaria e dos sistemas de incêndio.' },
    { id: 'rp-002', name: 'Inspeção de Utilidades — Prédio Industrial', area: 'Manutenção', locationId: 'loc-joi-ind', active: true },
  ];

  const checklists: Checklist[] = [
    {
      id: 'ck-001', name: 'Ronda de portaria', checklistType: 'Ronda perimetral', planIds: ['rp-001'], email: 'seguranca@aurora-demo.invalid', active: true,
      items: [
        { id: 'it-001', description: 'Portão de veículos trancado', occurrenceTypeId: 'tp-ronda', answerType: 'conforme', attachment: 'nao-conforme', observation: 'nao-conforme' },
        { id: 'it-002', description: 'Iluminação do acesso funcionando', occurrenceTypeId: 'tp-ronda', answerType: 'conforme-na', attachment: 'opcional', observation: 'nao-conforme' },
        { id: 'it-003', description: 'Observações gerais da ronda', answerType: 'texto', attachment: 'opcional', observation: 'opcional' },
      ],
    },
    {
      id: 'ck-002', name: 'Sistema de combate a incêndio', checklistType: 'Sistemas de proteção e contra incêndio', planIds: ['rp-001'], email: 'seguranca@aurora-demo.invalid', active: true,
      items: [
        { id: 'it-004', description: 'Bomba sem vazamento aparente', occurrenceTypeId: 'tp-vazamento', answerType: 'conforme', attachment: 'nao-conforme', observation: 'nao-conforme' },
        { id: 'it-005', description: 'Painel da bomba sem alarmes ativos', occurrenceTypeId: 'tp-inspecao', answerType: 'conforme', attachment: 'nao-conforme', observation: 'nao-conforme' },
        { id: 'it-006', description: 'Nível do reservatório (0 a 10)', occurrenceTypeId: 'tp-inspecao', answerType: 'nota', ncThreshold: 5, attachment: 'opcional', observation: 'nao-conforme' },
      ],
    },
    {
      id: 'ck-003', name: 'Extintores', checklistType: 'Sistemas de proteção e contra incêndio', planIds: ['rp-002'], active: true,
      items: [
        { id: 'it-007', description: 'Extintor desobstruído e sinalizado', occurrenceTypeId: 'tp-desvio', answerType: 'conforme', attachment: 'nao-conforme', observation: 'nao-conforme' },
        { id: 'it-008', description: 'Lacre e validade em dia', occurrenceTypeId: 'tp-inspecao', answerType: 'conforme', attachment: 'opcional', observation: 'nao-conforme' },
      ],
    },
    {
      id: 'ck-004', name: 'Utilidades da Sala de Máquinas', checklistType: 'Manutenção de Ativos e Equipamentos', planIds: ['rp-002'], active: true,
      items: [
        { id: 'it-009', description: 'Chiller sem vazamento', occurrenceTypeId: 'tp-vazamento', answerType: 'conforme', attachment: 'nao-conforme', observation: 'nao-conforme' },
        { id: 'it-010', description: 'Ruído do compressor (0 a 10)', occurrenceTypeId: 'tp-inspecao', answerType: 'nota', ncThreshold: 4, attachment: 'opcional', observation: 'opcional' },
      ],
    },
  ];

  const points: ControlPoint[] = [
    { id: 'cp-001', planId: 'rp-001', name: 'Portão de veículos', type: 'local-fisico', validation: 'qr-code', locationId: 'loc-joi-portaria', active: true, checklistIds: ['ck-001'] },
    { id: 'cp-002', planId: 'rp-001', name: 'Casa de Bombas', type: 'ativo', validation: 'geolocalizacao', locationId: 'loc-joi-bombas', assetId: 'a-bmb014', active: true, checklistIds: ['ck-002'] },
    { id: 'cp-003', planId: 'rp-001', name: 'Reservatório de água de incêndio', type: 'local-fisico', validation: 'geolocalizacao', locationId: 'loc-joi-reservatorio', active: true, checklistIds: [] },
    { id: 'cp-004', planId: 'rp-002', name: 'Extintores da Linha 1', type: 'ativo', validation: 'qr-code', locationId: 'loc-joi-linha1', assetId: 'a-ext12', active: true, checklistIds: ['ck-003'] },
    { id: 'cp-005', planId: 'rp-002', name: 'Sala de Máquinas', type: 'local-fisico', validation: 'sem-validacao', locationId: 'loc-joi-maquinas', active: true, checklistIds: ['ck-004'] },
  ];

  const routines: Routine[] = [
    { id: 'rt-001', planId: 'rp-001', name: 'Ronda da portaria', scheduled: true, schedule: { startTime: 'janela de 2 h', endTime: '', recurrence: 'Diária, a cada 1 dia' }, missedOccurrenceTypeId: 'tp-ronda', active: true },
    { id: 'rt-002', planId: 'rp-001', name: 'Inspeção do sistema de incêndio', scheduled: true, schedule: { startTime: 'janela de 2 h', endTime: '', recurrence: 'Diária, a cada 1 dia' }, missedOccurrenceTypeId: 'tp-ronda', active: true },
    { id: 'rt-003', planId: 'rp-002', name: 'Inspeção de utilidades (sob demanda)', scheduled: false, active: true },
  ];

  const pending = (pointIds: string[]) => pointIds.map((pointId) => ({ pointId, status: 'pendente' as const, answers: [] }));

  const executions: RoutineExecution[] = [
    {
      id: 're-001', code: 'EX-0001', routineId: 'rt-001', planId: 'rp-001', windowStart: at(30), windowEnd: at(-90), status: 'pendente',
      points: pending(['cp-001']), sync: 'sincronizado', generatedOccurrenceIds: [],
    },
    {
      id: 're-002', code: 'EX-0002', routineId: 'rt-002', planId: 'rp-001', windowStart: at(6 * 60), windowEnd: at(4 * 60), status: 'pendente',
      points: pending(['cp-002', 'cp-003']), sync: 'sincronizado', generatedOccurrenceIds: [],
    },
    {
      id: 're-003', code: 'EX-0003', routineId: 'rt-001', planId: 'rp-001', windowStart: at(9 * 60), windowEnd: at(7 * 60), status: 'concluida',
      operatorUserId: 'u-oper', startedAt: at(430), finishedAt: at(419), sync: 'sincronizado', generatedOccurrenceIds: ['oc-005'],
      points: [
        {
          pointId: 'cp-001', status: 'concluido', validatedBy: 'qr-code', finishedAt: at(419),
          answers: [
            { checklistId: 'ck-001', itemId: 'it-001', value: 'nao-conforme', conforming: false, observation: 'Portão encontrado destrancado.', attachments: ['portao-aberto.jpg'] },
            { checklistId: 'ck-001', itemId: 'it-002', value: 'conforme', conforming: true, attachments: [] },
            { checklistId: 'ck-001', itemId: 'it-003', value: 'Movimento normal.', conforming: null, attachments: [] },
          ],
        },
      ],
    },
    {
      id: 're-004', code: 'EX-0004', routineId: 'rt-002', planId: 'rp-001', windowStart: at(-20 * 60), windowEnd: at(-22 * 60), status: 'futura',
      points: pending(['cp-002', 'cp-003']), sync: 'sincronizado', generatedOccurrenceIds: [],
    },
    {
      id: 're-005', code: 'EX-0005', routineId: 'rt-002', planId: 'rp-001', windowStart: at(2 * 1440 + 60), windowEnd: at(2 * 1440 - 60), status: 'concluida',
      operatorUserId: 'u-oper', startedAt: at(2 * 1440 + 30), finishedAt: at(2 * 1440), sync: 'sincronizado', generatedOccurrenceIds: ['oc-009'],
      points: [
        {
          pointId: 'cp-002', status: 'concluido', validatedBy: 'geolocalizacao', finishedAt: at(2 * 1440),
          answers: [
            { checklistId: 'ck-002', itemId: 'it-004', value: 'conforme', conforming: true, attachments: [] },
            { checklistId: 'ck-002', itemId: 'it-005', value: 'nao-conforme', conforming: false, observation: 'Alarme de baixa pressão ativo no painel.', attachments: ['painel-bmb014.jpg'] },
            { checklistId: 'ck-002', itemId: 'it-006', value: '8', conforming: true, attachments: [] },
          ],
        },
        { pointId: 'cp-003', status: 'concluido', validatedBy: 'geolocalizacao', finishedAt: at(2 * 1440), answers: [] },
      ],
    },
  ];

  const reinspections: ReinspectionRequest[] = [
    { id: 'rq-001', occurrenceId: 'oc-009', requestedByUserId: 'u-seg', requestedAt: at(1440), suggestedChecklistId: 'ck-002', status: 'pendente' },
  ];

  return { plans, checklists, points, routines, executions, reinspections, counter: executions.length };
}
