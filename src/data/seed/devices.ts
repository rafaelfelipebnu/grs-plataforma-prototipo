import type { Connector, DataPoint, Device, DeviceHealth, ISODateString } from '@/domain';

/** Conectores do agente GRS — todos simulados. */
export const DEMO_CONNECTORS: Connector[] = [
  { id: 'conn-modbus-joi', name: 'Agente GRS Joinville · Modbus TCP', protocol: 'Modbus', unitLocationId: 'loc-joi', simulated: true },
  { id: 'conn-bacnet-joi', name: 'Agente GRS Joinville · BACnet/IP', protocol: 'BACnet', unitLocationId: 'loc-joi', simulated: true },
  { id: 'conn-onvif-joi', name: 'Agente GRS Joinville · ONVIF', protocol: 'ONVIF', unitLocationId: 'loc-joi', simulated: true },
  { id: 'conn-snmp-joi', name: 'Agente GRS Joinville · SNMP', protocol: 'SNMP', unitLocationId: 'loc-joi', simulated: true },
  { id: 'conn-mqtt-joi', name: 'Agente GRS Joinville · MQTT', protocol: 'MQTT', unitLocationId: 'loc-joi', simulated: true },
  { id: 'conn-modbus-cwb', name: 'Agente GRS Curitiba · Modbus TCP', protocol: 'Modbus', unitLocationId: 'loc-cwb', simulated: true },
  { id: 'conn-onvif-cwb', name: 'Agente GRS Curitiba · ONVIF', protocol: 'ONVIF', unitLocationId: 'loc-cwb', simulated: true },
  { id: 'conn-mqtt-cwb', name: 'Agente GRS Curitiba · MQTT', protocol: 'MQTT', unitLocationId: 'loc-cwb', simulated: true },
];

export const DEMO_DEVICES: Device[] = [
  { id: 'd-bmb014', name: 'CLP da bomba BMB-014', deviceType: 'Controlador lógico programável', manufacturer: 'Fabricante Demo A', model: 'CLP-200', protocol: 'Modbus', connectorId: 'conn-modbus-joi', locationStatus: 'confirmada', locationId: 'loc-joi-bombas', assetId: 'a-bmb014', origin: 'descoberta' },
  { id: 'd-ger002', name: 'Controlador do gerador GER-002', deviceType: 'Controlador de grupo gerador', manufacturer: 'Fabricante Demo B', model: 'GC-500', protocol: 'Modbus', connectorId: 'conn-modbus-joi', locationStatus: 'confirmada', locationId: 'loc-joi-maquinas', assetId: 'a-ger002', origin: 'cadastro_manual' },
  { id: 'd-chl001', name: 'Controlador do chiller CHL-001', deviceType: 'Controlador BMS', manufacturer: 'Fabricante Demo C', model: 'CH-Control 3', protocol: 'BACnet', connectorId: 'conn-bacnet-joi', locationStatus: 'confirmada', locationId: 'loc-joi-maquinas', assetId: 'a-chl001', origin: 'descoberta' },
  { id: 'd-cam01', name: 'CAM-PORT-01', deviceType: 'Câmera IP', manufacturer: 'Fabricante Demo D', model: 'IPC-4M', protocol: 'ONVIF', connectorId: 'conn-onvif-joi', locationStatus: 'confirmada', locationId: 'loc-joi-portaria', assetId: 'a-cam01', origin: 'importacao' },
  { id: 'd-cam02', name: 'CAM-EST-03', deviceType: 'Câmera IP', manufacturer: 'Fabricante Demo D', model: 'IPC-2M', protocol: 'ONVIF', connectorId: 'conn-onvif-joi', locationStatus: 'confirmada', locationId: 'loc-joi-estac', assetId: 'a-cam02', origin: 'importacao' },
  { id: 'd-cta03', name: 'CTA-PORT-03', deviceType: 'Controladora de acesso', manufacturer: 'Fabricante Demo E', model: 'AC-8', protocol: 'SNMP', connectorId: 'conn-snmp-joi', locationStatus: 'confirmada', locationId: 'loc-joi-portaria', assetId: 'a-cta03', origin: 'cadastro_manual' },
  { id: 'd-swcore', name: 'Switch core SW-01', deviceType: 'Switch de rede', manufacturer: 'Fabricante Demo F', model: 'SW-48G', protocol: 'SNMP', connectorId: 'conn-snmp-joi', locationStatus: 'confirmada', locationId: 'loc-joi-servidores', origin: 'descoberta' },
  { id: 'd-ups01', name: 'Nobreak UPS-SRV-01', deviceType: 'Nobreak', manufacturer: 'Fabricante Demo G', model: 'UPS-10K', protocol: 'SNMP', connectorId: 'conn-snmp-joi', locationStatus: 'sugerida', suggestedLocationId: 'loc-joi-servidores', origin: 'descoberta' },
  { id: 'd-nivres', name: 'Sensor de nível LT-RES-01', deviceType: 'Sensor de nível', manufacturer: 'Fabricante Demo H', model: 'LVL-100', protocol: 'MQTT', connectorId: 'conn-mqtt-joi', locationStatus: 'sugerida', suggestedLocationId: 'loc-joi-reservatorio', origin: 'descoberta' },
  { id: 'd-bac2001', name: 'Dispositivo BACnet 2001', deviceType: 'Não classificado', manufacturer: 'Não informado', model: 'Não informado', protocol: 'BACnet', connectorId: 'conn-bacnet-joi', locationStatus: 'nao_identificada', origin: 'descoberta' },
  { id: 'd-camfria', name: 'Sensor de temperatura TT-CFR-01', deviceType: 'Sensor de temperatura', manufacturer: 'Fabricante Demo H', model: 'TMP-40', protocol: 'MQTT', connectorId: 'conn-mqtt-cwb', locationStatus: 'confirmada', locationId: 'loc-cwb-camara', assetId: 'a-camfria', origin: 'descoberta' },
  { id: 'd-gercwb', name: 'Controlador do gerador GER-CWB-01', deviceType: 'Controlador de grupo gerador', manufacturer: 'Fabricante Demo B', model: 'GC-750', protocol: 'Modbus', connectorId: 'conn-modbus-cwb', locationStatus: 'confirmada', locationId: 'loc-cwb-arm', assetId: 'a-gercwb', origin: 'cadastro_manual' },
  { id: 'd-camcwb', name: 'CAM-DOC-02', deviceType: 'Câmera IP', manufacturer: 'Fabricante Demo D', model: 'IPC-4M', protocol: 'ONVIF', connectorId: 'conn-onvif-cwb', locationStatus: 'confirmada', locationId: 'loc-cwb-docas', assetId: 'a-camcwb', origin: 'importacao' },
];

export function createDemoDeviceHealth(at: (minutesAgo: number) => ISODateString): DeviceHealth[] {
  const online = (deviceId: string): DeviceHealth => ({ deviceId, communication: 'online', lastSeenAt: at(0) });
  return [
    online('d-bmb014'),
    online('d-ger002'),
    { deviceId: 'd-chl001', communication: 'instavel', lastSeenAt: at(3) },
    online('d-cam01'),
    { deviceId: 'd-cam02', communication: 'offline', lastSeenAt: at(48) },
    online('d-cta03'),
    online('d-swcore'),
    online('d-ups01'),
    online('d-nivres'),
    online('d-bac2001'),
    online('d-camfria'),
    online('d-gercwb'),
    online('d-camcwb'),
  ];
}

export function createDemoDataPoints(at: (minutesAgo: number) => ISODateString): DataPoint[] {
  return [
    { id: 'dp-bmb-pressao', deviceId: 'd-bmb014', name: 'Pressão de recalque', unit: 'bar', value: 6.8, updatedAt: at(0), status: 'normal' },
    { id: 'dp-bmb-motor', deviceId: 'd-bmb014', name: 'Estado do motor', unit: '', value: 'Em espera', updatedAt: at(0), status: 'normal' },
    { id: 'dp-bmb-corrente', deviceId: 'd-bmb014', name: 'Corrente do motor', unit: 'A', value: 0, updatedAt: at(0), status: 'normal' },
    { id: 'dp-ger-comb', deviceId: 'd-ger002', name: 'Nível de combustível', unit: '%', value: 82, updatedAt: at(1), status: 'normal' },
    { id: 'dp-ger-estado', deviceId: 'd-ger002', name: 'Estado de operação', unit: '', value: 'Stand-by', updatedAt: at(1), status: 'normal' },
    { id: 'dp-chl-saida', deviceId: 'd-chl001', name: 'Temperatura da água gelada (saída)', unit: '°C', value: 9.4, updatedAt: at(3), status: 'alerta' },
    { id: 'dp-chl-setpoint', deviceId: 'd-chl001', name: 'Setpoint', unit: '°C', value: 7, updatedAt: at(3), status: 'normal' },
    { id: 'dp-cam01-grav', deviceId: 'd-cam01', name: 'Gravação', unit: '', value: 'Ativa', updatedAt: at(0), status: 'normal' },
    { id: 'dp-cam02-stream', deviceId: 'd-cam02', name: 'Transmissão de vídeo', unit: '', value: null, updatedAt: at(48), status: 'sem_leitura' },
    { id: 'dp-cta03-estado', deviceId: 'd-cta03', name: 'Estado da controladora', unit: '', value: 'Operacional', updatedAt: at(0), status: 'normal' },
    { id: 'dp-sw-cpu', deviceId: 'd-swcore', name: 'Uso de CPU', unit: '%', value: 23, updatedAt: at(1), status: 'normal' },
    { id: 'dp-ups-autonomia', deviceId: 'd-ups01', name: 'Autonomia estimada', unit: 'min', value: 42, updatedAt: at(2), status: 'normal' },
    { id: 'dp-res-nivel', deviceId: 'd-nivres', name: 'Nível do reservatório', unit: '%', value: 96, updatedAt: at(1), status: 'normal' },
    { id: 'dp-cfr-temp', deviceId: 'd-camfria', name: 'Temperatura interna', unit: '°C', value: -12.5, updatedAt: at(1), status: 'alerta' },
    { id: 'dp-cfr-setpoint', deviceId: 'd-camfria', name: 'Setpoint', unit: '°C', value: -18, updatedAt: at(1), status: 'normal' },
    { id: 'dp-gercwb-comb', deviceId: 'd-gercwb', name: 'Nível de combustível', unit: '%', value: 64, updatedAt: at(2), status: 'normal' },
    { id: 'dp-camcwb-grav', deviceId: 'd-camcwb', name: 'Gravação', unit: '', value: 'Ativa', updatedAt: at(0), status: 'normal' },
  ];
}
