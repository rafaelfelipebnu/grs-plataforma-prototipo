import { Badge, type BadgeTone } from '@/components/ui';
import {
  ALERT_STATUS_LABEL,
  COMMUNICATION_STATUS_LABEL,
  CONDITION_LABEL,
  CRITICALITY_LABEL,
  DEVICE_LOCATION_STATUS_LABEL,
  type AlertStatus,
  type CommunicationStatus,
  type Criticality,
  type DataPointStatus,
  type DeviceLocationStatus,
  type OperationalCondition,
  type Severity,
} from '@/domain';

/**
 * Criticidade INTRÍNSECA e condição OPERACIONAL usam rótulos e ícones
 * distintos para não serem confundidas.
 */
const CRITICALITY_TONE: Record<Criticality, BadgeTone> = { alta: 'red', media: 'yellow', baixa: 'blue' };

export function CriticalityBadge({ value }: { value: Criticality }) {
  return (
    <Badge tone={CRITICALITY_TONE[value]} icon="signal" title="Criticidade intrínseca do ativo">
      Criticidade {CRITICALITY_LABEL[value].toLowerCase()}
    </Badge>
  );
}

const CONDITION_TONE: Record<OperationalCondition, BadgeTone> = {
  normal: 'green',
  atencao: 'yellow',
  critico: 'red',
  indisponivel: 'gray',
};
const CONDITION_ICON: Record<OperationalCondition, string> = {
  normal: 'check-circle',
  atencao: 'exclamation-triangle',
  critico: 'exclamation-circle',
  indisponivel: 'ban',
};

export function ConditionBadge({ value }: { value: OperationalCondition }) {
  return (
    <Badge tone={CONDITION_TONE[value]} icon={CONDITION_ICON[value]} title="Condição operacional atual">
      {CONDITION_LABEL[value]}
    </Badge>
  );
}

const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  critica: 'red',
  alta: 'orange',
  media: 'yellow',
  baixa: 'green',
  informativa: 'blue',
};
export const SEVERITY_LABEL: Record<Severity, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  informativa: 'Informativa',
};

/** Cor (Manchester) da severidade para marcadores, bordas e pontos. */
export const SEVERITY_COLOR: Record<Severity, string> = {
  critica: 'var(--sds-red)',
  alta: 'var(--sds-orange)',
  media: 'var(--sds-yellow)',
  baixa: 'var(--sds-green)',
  informativa: 'var(--sds-blue)',
};

export function SeverityBadge({ value }: { value: Severity }) {
  return (
    <Badge tone={SEVERITY_TONE[value]} title="Severidade">
      {SEVERITY_LABEL[value]}
    </Badge>
  );
}

export function AlertStatusBadge({ value }: { value: AlertStatus }) {
  return (
    <Badge tone={value === 'ativo' ? 'orange' : 'gray'} icon={value === 'ativo' ? 'bell' : 'check'} title="Estado do alerta">
      {value === 'ativo' ? 'Alerta ativo' : ALERT_STATUS_LABEL[value]}
    </Badge>
  );
}

const COMM_TONE: Record<CommunicationStatus, BadgeTone> = { online: 'green', instavel: 'yellow', offline: 'red' };

export function CommunicationBadge({ value }: { value: CommunicationStatus }) {
  return (
    <Badge tone={COMM_TONE[value]} icon="wifi" title="Comunicação (Monitor de Infraestrutura)">
      {COMMUNICATION_STATUS_LABEL[value]}
    </Badge>
  );
}

const LOC_STATUS_TONE: Record<DeviceLocationStatus, BadgeTone> = {
  confirmada: 'green',
  sugerida: 'yellow',
  nao_identificada: 'gray',
};

export function DeviceLocationBadge({ value }: { value: DeviceLocationStatus }) {
  return (
    <Badge tone={LOC_STATUS_TONE[value]} icon="map-marker">
      {DEVICE_LOCATION_STATUS_LABEL[value]}
    </Badge>
  );
}

const DP_TONE: Record<DataPointStatus, BadgeTone> = { normal: 'green', alerta: 'yellow', critico: 'red', sem_leitura: 'gray' };
const DP_LABEL: Record<DataPointStatus, string> = { normal: 'Normal', alerta: 'Alerta', critico: 'Crítico', sem_leitura: 'Sem leitura' };

export function DataPointStatusBadge({ value }: { value: DataPointStatus }) {
  return <Badge tone={DP_TONE[value]}>{DP_LABEL[value]}</Badge>;
}
