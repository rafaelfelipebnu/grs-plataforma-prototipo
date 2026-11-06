import type { AppNotification, ISODateString, OperationalEvent } from '@/domain';

/**
 * Feed de eventos/alertas das diversas fontes (simulado). Cada evento pertence
 * à sua fonte; o Security Hub destaca apenas os relevantes para segurança.
 */
export function createDemoEvents(at: (minutesAgo: number) => ISODateString): OperationalEvent[] {
  return [
    {
      id: 'ev-001', code: 'EVT-2026-0412', source: 'security-hub', category: 'alarme', severity: 'critica',
      title: 'Alarme de intrusão — Docas de Expedição',
      description: 'Sensor de presença acionado fora do horário de operação nas docas.',
      locationId: 'loc-cwb-docas', occurredAt: at(40), status: 'ativo',
    },
    {
      id: 'ev-002', code: 'EVT-2026-0415', source: 'security-hub', category: 'alarme', severity: 'alta',
      title: 'Porta de emergência aberta — Linha Produtiva 1',
      description: 'Porta corta-fogo PCF-L1-02 permanece aberta há mais de 5 minutos.',
      locationId: 'loc-joi-linha1', occurredAt: at(12), status: 'ativo',
    },
    {
      id: 'ev-003', code: 'EVT-2026-0409', source: 'controle-acesso', category: 'acesso', severity: 'media',
      title: 'Tentativas de acesso negadas — Portaria Principal',
      description: '4 tentativas negadas com a mesma credencial em 10 minutos.',
      locationId: 'loc-joi-portaria', deviceId: 'd-cta03', assetId: 'a-cta03', occurredAt: at(25), status: 'ativo',
    },
    {
      id: 'ev-004', code: 'EVT-2026-0398', source: 'monitor', category: 'video', severity: 'media',
      title: 'Câmera CAM-EST-03 sem sinal',
      description: 'Perda de comunicação com a câmera do estacionamento.',
      locationId: 'loc-joi-estac', deviceId: 'd-cam02', assetId: 'a-cam02', occurredAt: at(48),
      securityContext: 'Perda de cobertura de vídeo no estacionamento.', status: 'ativo',
    },
    {
      id: 'ev-005', code: 'EVT-2026-0401', source: 'monitor', category: 'telemetria', severity: 'media',
      title: 'Temperatura acima do setpoint — Chiller CHL-001',
      description: 'Água gelada de saída a 9,4 °C (setpoint 7 °C).',
      locationId: 'loc-joi-maquinas', deviceId: 'd-chl001', assetId: 'a-chl001', ruleId: 'rule-chl-saida', occurredAt: at(35), status: 'ativo',
    },
    {
      id: 'ev-006', code: 'EVT-2026-0405', source: 'monitor', category: 'telemetria', severity: 'alta',
      title: 'Temperatura acima do limite — Câmara fria CFR-01',
      description: 'Temperatura interna em −12,5 °C (setpoint −18 °C).',
      locationId: 'loc-cwb-camara', deviceId: 'd-camfria', assetId: 'a-camfria', ruleId: 'rule-cfr-temp', occurredAt: at(22), status: 'ativo',
    },
    {
      id: 'ev-007', code: 'EVT-2026-0377', source: 'controle-acesso', category: 'acesso', severity: 'alta',
      title: 'Acesso fora do horário — Sala de Servidores',
      description: 'Entrada registrada às 02:14 sem agendamento prévio.',
      locationId: 'loc-joi-servidores', occurredAt: at(190), status: 'reconhecido',
      acknowledgedByUserId: 'u-seg', acknowledgedAt: at(150),
    },
    {
      id: 'ev-008', code: 'EVT-2026-0411', source: 'controle-acesso', category: 'acesso', severity: 'baixa',
      title: 'Visitante sem registro de saída — Recepção',
      description: 'Visita encerrada no agendamento, sem passagem na saída.',
      locationId: 'loc-joi-recepcao', occurredAt: at(75), status: 'ativo',
    },
    ...createHistoricalEvents(at),
  ];
}

/**
 * Eventos já reconhecidos nos últimos 7 dias — base do histórico e do tempo
 * médio de resposta. [minutos atrás, minutos até o reconhecimento, ...].
 */
function createHistoricalEvents(at: (minutesAgo: number) => ISODateString): OperationalEvent[] {
  const rows: Array<[number, number, OperationalEvent['source'], OperationalEvent['category'], OperationalEvent['severity'], string, string, string, string]> = [
    [420, 6, 'security-hub', 'alarme', 'alta', 'Alarme de porta forçada — Almoxarifado', 'Sensor magnético indicou abertura sem passagem válida.', 'loc-joi-almox', 'u-seg'],
    [610, 12, 'controle-acesso', 'acesso', 'media', 'Tentativas de acesso negadas — Recepção', '3 tentativas negadas com a mesma credencial.', 'loc-joi-recepcao', 'u-local'],
    [1310, 4, 'security-hub', 'alarme', 'critica', 'Alarme de intrusão — Estacionamento', 'Cerca perimetral acionada no setor norte.', 'loc-joi-estac', 'u-seg'],
    [1880, 21, 'security-hub', 'video', 'media', 'Obstrução de câmera — Portaria Principal', 'Análise de vídeo indicou obstrução parcial da lente.', 'loc-joi-portaria', 'u-seg'],
    [2650, 9, 'controle-acesso', 'acesso', 'alta', 'Acesso fora do horário — Docas de Expedição', 'Entrada registrada às 23:41 sem escala prevista.', 'loc-cwb-docas', 'u-seg'],
    [3100, 35, 'controle-acesso', 'acesso', 'baixa', 'Visitante sem registro de saída — Recepção', 'Visita encerrada sem passagem na saída.', 'loc-cwb-recepcao', 'u-admin'],
    [4020, 7, 'security-hub', 'alarme', 'alta', 'Porta de emergência aberta — Armazém Central', 'Porta PCF-ARM-04 aberta por mais de 5 minutos.', 'loc-cwb-arm', 'u-seg'],
    [5200, 15, 'security-hub', 'alarme', 'critica', 'Alarme de incêndio — Linha Produtiva 1', 'Detector de fumaça acionado; falso alarme confirmado pela brigada.', 'loc-joi-linha1', 'u-local'],
    [6400, 28, 'controle-acesso', 'acesso', 'media', 'Tentativas de acesso negadas — Portaria de Caminhões', '5 tentativas negadas de placa não cadastrada.', 'loc-cwb-portaria', 'u-seg'],
    [7900, 11, 'security-hub', 'video', 'baixa', 'Perda momentânea de vídeo — Docas', 'Câmera CAM-DOC-02 sem imagem por 2 minutos.', 'loc-cwb-docas', 'u-admin'],
    [9100, 5, 'security-hub', 'alarme', 'alta', 'Alarme de intrusão — Sala de Servidores', 'Sensor de presença acionado sem passagem válida.', 'loc-joi-servidores', 'u-seg'],
  ];
  return rows.map(([ago, ackAfter, source, category, severity, title, description, locationId, ackUser], i) => ({
    id: `ev-h${String(i + 1).padStart(2, '0')}`,
    code: `EVT-2026-${String(300 + i).padStart(4, '0')}`,
    source,
    category,
    severity,
    title,
    description,
    locationId,
    occurredAt: at(ago),
    status: 'reconhecido',
    acknowledgedByUserId: ackUser,
    acknowledgedAt: at(ago - ackAfter),
  }));
}

export function createDemoNotifications(at: (minutesAgo: number) => ISODateString): AppNotification[] {
  return [
    {
      id: 'n-001', moduleId: 'security-hub', type: 'alerta', severity: 'critica', important: true,
      title: 'Alarme de intrusão — Docas de Expedição', message: 'Sensor de presença acionado fora do horário de operação.',
      locationId: 'loc-cwb-docas', createdAt: at(40), target: { kind: 'event', id: 'ev-001' }, readByUserIds: [],
    },
    {
      id: 'n-002', moduleId: 'security-hub', type: 'alerta', severity: 'alta', important: true,
      title: 'Porta de emergência aberta — Linha Produtiva 1', message: 'Porta corta-fogo PCF-L1-02 aberta há mais de 5 minutos.',
      locationId: 'loc-joi-linha1', createdAt: at(12), target: { kind: 'event', id: 'ev-002' }, readByUserIds: [],
    },
    {
      id: 'n-003', moduleId: 'monitor', type: 'alerta', severity: 'media', important: false,
      title: 'Câmera CAM-EST-03 sem sinal', message: 'Dispositivo sem comunicação há 48 minutos.',
      locationId: 'loc-joi-estac', createdAt: at(48), target: { kind: 'device', id: 'd-cam02' }, readByUserIds: [],
    },
    {
      id: 'n-004', moduleId: 'monitor', type: 'alerta', severity: 'media', important: false,
      title: 'Chiller CHL-001 acima do setpoint', message: 'Água gelada de saída a 9,4 °C.',
      locationId: 'loc-joi-maquinas', createdAt: at(35), target: { kind: 'asset', id: 'a-chl001' }, readByUserIds: [],
    },
    {
      id: 'n-005', moduleId: 'central', type: 'sistema', severity: 'informativa', important: false,
      title: 'Dispositivos aguardando validação', message: '3 dispositivos descobertos aguardam validação de localização ou classificação.',
      locationId: 'loc-joi', createdAt: at(95), target: { kind: 'location', id: 'loc-joi' }, readByUserIds: [],
    },
    {
      id: 'n-006', moduleId: 'monitor', type: 'alerta', severity: 'alta', important: true,
      title: 'Câmara fria CFR-01 acima do limite', message: 'Temperatura interna em −12,5 °C.',
      locationId: 'loc-cwb-camara', createdAt: at(22), target: { kind: 'asset', id: 'a-camfria' }, readByUserIds: [],
    },
    {
      id: 'n-007', moduleId: 'security-hub', type: 'evento', severity: 'baixa', important: false,
      title: 'Visitante sem registro de saída', message: 'Recepção do Prédio Administrativo.',
      locationId: 'loc-joi-recepcao', createdAt: at(75), target: { kind: 'event', id: 'ev-008' }, readByUserIds: ['u-seg'],
    },
    {
      id: 'n-008', moduleId: 'central', type: 'sistema', severity: 'informativa', important: false,
      title: 'Elevador ELV-ADM-01 marcado como indisponível', message: 'Condição operacional alterada manualmente.',
      locationId: 'loc-joi-adm', createdAt: at(300), target: { kind: 'asset', id: 'a-elv01' }, readByUserIds: ['u-admin', 'u-local'],
    },
    {
      id: 'n-009', moduleId: 'rotinas', type: 'tarefa', severity: 'media', important: false,
      title: 'Ronda da Portaria Principal com pontos pendentes', message: 'Rotina do turno da noite com pontos de controle não executados.',
      locationId: 'loc-joi-portaria', createdAt: at(130), target: { kind: 'module', moduleId: 'rotinas' }, readByUserIds: [],
    },
    {
      id: 'n-010', moduleId: 'manutencao', type: 'tarefa', severity: 'media', important: false,
      title: 'Solicitação de manutenção aguardando triagem', message: 'Nova solicitação registrada para a Sala de Máquinas.',
      locationId: 'loc-joi-maquinas', createdAt: at(55), target: { kind: 'module', moduleId: 'manutencao' }, readByUserIds: [],
    },
  ];
}
