import type { DiscoveredPoint, ISODateString, MonitoringRule, Protocol } from '@/domain';

/**
 * "Mundo externo" simulado: o que responde na rede de cada conector.
 * Não é um cadastro do produto — é o que a descoberta encontra.
 * Todos os equipamentos, endereços e fabricantes são fictícios.
 */
export interface SimulatedNetworkDevice {
  address: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  metadata: Record<string, string>;
  points: DiscoveredPoint[];
  /** Pistas usadas pela classificação simulada (explicadas ao revisor). */
  hint: {
    classificationId?: string;
    classificationReason?: string;
    locationId?: string;
    locationReason?: string;
  };
}

export const SIMULATED_NETWORK: Record<string, SimulatedNetworkDevice[]> = {
  'conn-modbus-joi': [
    {
      address: '10.20.1.41 · unidade 7',
      name: 'Multimedidor QGBT Administrativo',
      deviceType: 'Multimedidor de energia',
      manufacturer: 'Fabricante Demo I',
      model: 'MM-300',
      metadata: { 'Firmware': '2.4.1', 'Registro de identificação': 'QGBT-ADM' },
      points: [
        { name: 'Tensão fase-neutro', unit: 'V', value: 221 },
        { name: 'Corrente média', unit: 'A', value: 84 },
        { name: 'Potência ativa', unit: 'kW', value: 18.4 },
      ],
      hint: {
        classificationId: 'cls-quadro',
        classificationReason: 'Tipo "multimedidor de energia" e registro de identificação "QGBT" indicam quadro elétrico.',
        locationId: 'loc-joi-adm-t',
        locationReason: 'Registro de identificação "QGBT-ADM" coincide com o código do Prédio Administrativo (térreo).',
      },
    },
  ],
  'conn-bacnet-joi': [
    {
      address: 'BACnet 2105 · 10.20.2.15',
      name: 'Controlador do elevador social',
      deviceType: 'Controlador de elevador',
      manufacturer: 'Fabricante Demo J',
      model: 'LIFT-C2',
      metadata: { 'Object name': 'ELV-SOCIAL-ADM', 'Vendor ID': '999 (demo)' },
      points: [
        { name: 'Estado de operação', unit: '', value: 'Fora de serviço' },
        { name: 'Andar atual', unit: '', value: 0 },
      ],
      hint: {
        classificationId: 'cls-elevador',
        classificationReason: 'Objeto BACnet "ELV-SOCIAL" identifica controlador de elevador.',
        locationId: 'loc-joi-adm',
        locationReason: 'Nome do objeto contém "ADM" (Prédio Administrativo).',
      },
    },
  ],
  'conn-mqtt-joi': [
    {
      address: 'mqtt: grs/joi/bombas/vb01',
      name: 'Sensor de vibração VB-01',
      deviceType: 'Sensor de vibração',
      manufacturer: 'Fabricante Demo H',
      model: 'VIB-20',
      metadata: { 'Tópico': 'grs/joi/bombas/vb01', 'Bateria': '87%' },
      points: [
        { name: 'Vibração (RMS)', unit: 'mm/s', value: 2.1 },
        { name: 'Temperatura do mancal', unit: '°C', value: 41 },
      ],
      hint: {
        classificationId: 'cls-bomba',
        classificationReason: 'Tópico publicado no ramo "bombas"; sensores de vibração costumam monitorar bombas.',
        locationId: 'loc-joi-bombas',
        locationReason: 'Tópico "grs/joi/bombas" corresponde à Casa de Bombas.',
      },
    },
  ],
  'conn-snmp-joi': [
    {
      address: '10.20.0.87',
      name: 'Impressora de rede PRN-0087',
      deviceType: 'Impressora',
      manufacturer: 'Fabricante Demo K',
      model: 'PRN-L5',
      metadata: { 'sysDescr': 'Network printer (demo)', 'sysLocation': 'não informado' },
      points: [{ name: 'Nível de toner', unit: '%', value: 34 }],
      hint: {},
    },
  ],
  'conn-onvif-joi': [
    {
      address: '10.20.4.31',
      name: 'Câmera IP 10.20.4.31',
      deviceType: 'Câmera IP',
      manufacturer: 'Fabricante Demo D',
      model: 'IPC-2M',
      metadata: { 'Perfil ONVIF': 'S', 'Hostname': 'cam-0431' },
      points: [{ name: 'Transmissão de vídeo', unit: '', value: 'Ativa' }],
      hint: {
        classificationId: 'cls-cam',
        classificationReason: 'Perfil ONVIF S (streaming de vídeo).',
      },
    },
  ],
  'conn-mqtt-cwb': [
    {
      address: 'mqtt: grs/cwb/camara-fria/porta',
      name: 'Sensor de porta da câmara fria',
      deviceType: 'Sensor de abertura',
      manufacturer: 'Fabricante Demo H',
      model: 'DOOR-2',
      metadata: { 'Tópico': 'grs/cwb/camara-fria/porta' },
      points: [{ name: 'Porta', unit: '', value: 'Fechada' }],
      hint: {
        classificationId: 'cls-camfria',
        classificationReason: 'Tópico publicado no ramo "camara-fria".',
        locationId: 'loc-cwb-camara',
        locationReason: 'Tópico "grs/cwb/camara-fria" corresponde à Câmara Fria do CD.',
      },
    },
  ],
  'conn-modbus-cwb': [],
  'conn-onvif-cwb': [],
};

/** Equipamento genérico encontrado por conectores novos (sem pistas de classificação/local). */
export function genericNetworkDevice(protocol: Protocol, seq: number): SimulatedNetworkDevice {
  const base: Record<Protocol, Pick<SimulatedNetworkDevice, 'deviceType' | 'points'>> = {
    BACnet: { deviceType: 'Controlador BACnet', points: [{ name: 'Valor presente', unit: '', value: 1 }] },
    Modbus: { deviceType: 'Dispositivo Modbus', points: [{ name: 'Registrador 40001', unit: '', value: 120 }] },
    MQTT: { deviceType: 'Sensor MQTT', points: [{ name: 'Leitura', unit: '', value: 12 }] },
    ONVIF: { deviceType: 'Câmera IP', points: [{ name: 'Transmissão de vídeo', unit: '', value: 'Ativa' }] },
    SNMP: { deviceType: 'Equipamento de rede', points: [{ name: 'Uso de CPU', unit: '%', value: 15 }] },
  };
  return {
    address: `nova-rede · host ${seq}`,
    name: `${base[protocol].deviceType} ${seq}`,
    manufacturer: 'Não informado',
    model: 'Não informado',
    metadata: { 'Origem': 'resposta genérica do protocolo (simulada)' },
    hint: {},
    ...base[protocol],
  };
}

/** Regras técnicas de demonstração (coerentes com os alertas já existentes). */
export function createDemoRules(at: (minutesAgo: number) => ISODateString): MonitoringRule[] {
  const day = 1440;
  return [
    { id: 'rule-bmb-pressao', name: 'Pressão de recalque baixa', pointId: 'dp-bmb-pressao', operator: 'menor', threshold: 2, severity: 'critica', active: true, createdByUserId: 'u-admin', createdAt: at(90 * day) },
    { id: 'rule-chl-saida', name: 'Água gelada acima do limite', pointId: 'dp-chl-saida', operator: 'maior', threshold: 8, severity: 'media', active: true, createdByUserId: 'u-admin', createdAt: at(60 * day), lastTriggeredAt: at(35) },
    { id: 'rule-cfr-temp', name: 'Câmara fria acima de −15 °C', pointId: 'dp-cfr-temp', operator: 'maior', threshold: -15, severity: 'alta', active: true, createdByUserId: 'u-admin', createdAt: at(60 * day), lastTriggeredAt: at(22) },
    { id: 'rule-ger-comb', name: 'Combustível do gerador baixo', pointId: 'dp-ger-comb', operator: 'menor', threshold: 30, severity: 'alta', active: true, createdByUserId: 'u-admin', createdAt: at(80 * day) },
    { id: 'rule-ups-autonomia', name: 'Autonomia do nobreak baixa', pointId: 'dp-ups-autonomia', operator: 'menor', threshold: 15, severity: 'media', active: false, createdByUserId: 'u-admin', createdAt: at(10 * day) },
  ];
}
