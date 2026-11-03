import type { Id, ISODateString } from './common';

export type Protocol = 'BACnet' | 'Modbus' | 'MQTT' | 'ONVIF' | 'SNMP';

/**
 * Estado da localização física do dispositivo. Descoberta NÃO confirma
 * localização: a confirmação exige aprovação humana.
 */
export type DeviceLocationStatus = 'confirmada' | 'sugerida' | 'nao_identificada';

export const DEVICE_LOCATION_STATUS_LABEL: Record<DeviceLocationStatus, string> = {
  confirmada: 'Localização confirmada',
  sugerida: 'Localização sugerida — aguardando validação',
  nao_identificada: 'Localização não identificada',
};

export type DeviceOrigin = 'cadastro_manual' | 'descoberta' | 'importacao';

/**
 * Identidade do dispositivo (equipamento que se comunica com a plataforma).
 * A identidade e a associação a ativo/local ficam na Central; a gestão técnica
 * do monitoramento (conectividade, coleta, saúde, regras) é do Monitor de
 * Infraestrutura — ver {@link DeviceHealth}.
 */
export interface Device {
  id: Id;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  protocol: Protocol;
  connectorId: Id;
  locationStatus: DeviceLocationStatus;
  /** Preenchido quando a localização está confirmada. */
  locationId?: Id;
  /** Preenchido quando há sugestão pendente de validação. */
  suggestedLocationId?: Id;
  /** Ativo alimentado pelo dispositivo (um dispositivo pode ser o próprio ativo, ex.: câmera). */
  assetId?: Id;
  origin: DeviceOrigin;
}

/** Conector do agente GRS (simulado). Propriedade do Monitor de Infraestrutura. */
export interface Connector {
  id: Id;
  name: string;
  protocol: Protocol;
  /**
   * Unidade onde o agente está instalado. Dispositivos ainda sem localização
   * identificada ficam visíveis a quem tem esta unidade no escopo.
   */
  unitLocationId: Id;
  /** Sempre simulado neste protótipo. */
  simulated: true;
}

export type CommunicationStatus = 'online' | 'instavel' | 'offline';

export const COMMUNICATION_STATUS_LABEL: Record<CommunicationStatus, string> = {
  online: 'Online',
  instavel: 'Instável',
  offline: 'Offline',
};

/** Saúde/conectividade do dispositivo — dado de propriedade do Monitor de Infraestrutura. */
export interface DeviceHealth {
  deviceId: Id;
  communication: CommunicationStatus;
  lastSeenAt: ISODateString;
}

export type DataPointStatus = 'normal' | 'alerta' | 'critico' | 'sem_leitura';

/** Ponto de dado: variável/sinal fornecido por um dispositivo. Ponto → dispositivo → ativo. */
export interface DataPoint {
  id: Id;
  deviceId: Id;
  name: string;
  unit: string;
  value: number | string | boolean | null;
  updatedAt: ISODateString;
  status: DataPointStatus;
}
