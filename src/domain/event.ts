import type { Id, ISODateString, Severity, SourceSystem } from './common';

export type EventCategory = 'acesso' | 'alarme' | 'video' | 'telemetria' | 'infraestrutura';

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  acesso: 'Acesso',
  alarme: 'Alarme',
  video: 'Vídeo',
  telemetria: 'Telemetria',
  infraestrutura: 'Infraestrutura',
};

/**
 * Estado do alerta no Security Hub. Nesta etapa só "ativo" e "reconhecido"
 * estão modelados — o ciclo completo de tratamento ainda não foi definido.
 * Reconhecer um alerta é diferente de ler a notificação correspondente.
 */
export type AlertStatus = 'ativo' | 'reconhecido';

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  ativo: 'Ativo',
  reconhecido: 'Reconhecido',
};

/** Evento/alerta consolidado pelo Security Hub a partir de diferentes fontes. */
export interface OperationalEvent {
  id: Id;
  code: string;
  source: SourceSystem;
  category: EventCategory;
  severity: Severity;
  title: string;
  description: string;
  locationId: Id;
  assetId?: Id;
  deviceId?: Id;
  occurredAt: ISODateString;
  /**
   * Alertas de outros módulos só são destacados no Hub quando afetam a
   * segurança; este campo explica o vínculo (ex.: água de incêndio).
   */
  securityContext?: string;
  status: AlertStatus;
  acknowledgedByUserId?: Id;
  acknowledgedAt?: ISODateString;
}
