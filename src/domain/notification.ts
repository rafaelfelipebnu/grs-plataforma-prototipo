import type { Id, ISODateString, ModuleId, Severity } from './common';

export type NotificationType = 'alerta' | 'evento' | 'tarefa' | 'sistema';

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  alerta: 'Alerta',
  evento: 'Evento',
  tarefa: 'Tarefa',
  sistema: 'Sistema',
};

/** Destino de navegação de uma notificação ou resultado de busca. */
export type NavTarget =
  | { kind: 'asset'; id: Id }
  | { kind: 'device'; id: Id }
  | { kind: 'location'; id: Id }
  | { kind: 'event'; id: Id }
  | { kind: 'person'; id: Id }
  | { kind: 'module'; moduleId: ModuleId }
  | { kind: 'maintenance-request'; id: Id }
  | { kind: 'work-order'; id: Id }
  | { kind: 'occurrence'; id: Id }
  | { kind: 'action-plan'; id: Id }
  | { kind: 'routine-execution'; id: Id }
  | { kind: 'routine-reinspections' };

/**
 * Notificação da central compartilhada. LER a notificação (readByUserIds) é
 * diferente de reconhecer/resolver o evento operacional que ela aponta.
 */
export interface AppNotification {
  id: Id;
  moduleId: ModuleId;
  type: NotificationType;
  severity: Severity;
  /** Marcada como importante (categoria "Importantes"). */
  important: boolean;
  title: string;
  message: string;
  locationId?: Id;
  createdAt: ISODateString;
  target: NavTarget;
  readByUserIds: Id[];
  /** Destinatários específicos (DP-07: notificação por destinatário elegível). Ausente = todos com acesso ao módulo e ao local. */
  recipientUserIds?: Id[];
}
