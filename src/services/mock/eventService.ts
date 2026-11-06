import type { AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import type { OperationalEvent } from '@/domain';
import type { EventDetail, EventService } from '../contracts';
import { forbidden, notFound, ServiceError } from '../errors';
import {
  canAcknowledgeEvent,
  canSeeEvent,
  eventOwnerModule,
  inScope,
  isSecurityRelevant,
  locationIndexOf,
  simulateLatency,
  type ServiceRuntime,
} from '../internal';

function toDetail(ctx: AccessContext, db: Readonly<DemoDatabase>, event: OperationalEvent): EventDetail {
  const securityRelevant = isSecurityRelevant(event);
  const asset = event.assetId ? db.assets.find((a) => a.id === event.assetId) : undefined;
  const ackUser = event.acknowledgedByUserId ? db.users.find((u) => u.id === event.acknowledgedByUserId) : undefined;
  return {
    event,
    locationPath: locationIndexOf(db).pathOf(event.locationId),
    asset: asset && inScope(ctx, asset.primaryLocationId) ? asset : undefined,
    device: event.deviceId ? db.devices.find((d) => d.id === event.deviceId) : undefined,
    acknowledgedBy: ackUser ? db.people.find((p) => p.id === ackUser.personId) : undefined,
    securityRelevant,
    canAcknowledge: canAcknowledgeEvent(ctx, event),
  };
}

export function createEventService(rt: ServiceRuntime): EventService {
  const findVisible = (ctx: AccessContext, id: string) => {
    const db = rt.store.getSnapshot();
    const event = db.events.find((e) => e.id === id);
    if (!event) throw notFound('Evento não encontrado.');
    if (!canSeeEvent(ctx, event)) throw forbidden();
    return { db, event };
  };

  return {
    async get(ctx, id) {
      await simulateLatency(rt);
      const { db, event } = findVisible(ctx, id);
      return toDetail(ctx, db, event);
    },

    routingInfo(ctx, id) {
      const event = rt.store.getSnapshot().events.find((e) => e.id === id);
      if (!event || !canSeeEvent(ctx, event)) return null;
      return { securityRelevant: isSecurityRelevant(event), assetId: event.assetId, deviceId: event.deviceId };
    },

    async acknowledge(ctx, id) {
      await simulateLatency(rt);
      const { db, event } = findVisible(ctx, id);
      if (!toDetail(ctx, db, event).canAcknowledge) {
        if (event.status === 'reconhecido') {
          throw new ServiceError('CONFLICT', 'Este alerta já foi reconhecido.');
        }
        throw forbidden('Você não tem permissão para reconhecer este alerta.');
      }
      const now = rt.now().toISOString();
      rt.store.mutate((draft) => {
        const target = draft.events.find((e) => e.id === id)!;
        target.status = 'reconhecido';
        target.acknowledgedByUserId = ctx.user.id;
        target.acknowledgedAt = now;
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: ctx.user.id,
          moduleId: isSecurityRelevant(target) ? 'security-hub' : eventOwnerModule(target),
          action: 'evento.reconhecer',
          entityType: 'evento',
          entityId: id,
          summary: `Alerta ${target.code} reconhecido.`,
        });
      });
      const updated = rt.store.getSnapshot();
      return toDetail(ctx, updated, updated.events.find((e) => e.id === id)!);
    },
  };
}
