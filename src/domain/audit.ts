import type { Id, ISODateString, ModuleId } from './common';

/**
 * Registro de auditoria transversal das ações simuladas (quem, o quê, quando).
 * Cada módulo continua dono do histórico especialista das suas entidades;
 * este log alimenta o histórico consolidado.
 */
export interface AuditEntry {
  id: Id;
  at: ISODateString;
  actorUserId: Id;
  moduleId: ModuleId | 'plataforma';
  action: string;
  entityType: string;
  entityId: Id;
  summary: string;
}
