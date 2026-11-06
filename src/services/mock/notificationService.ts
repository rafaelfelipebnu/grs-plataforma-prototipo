import { isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import type { AppNotification } from '@/domain';
import type { NotificationFilter, NotificationService, NotificationView } from '../contracts';
import { notFound } from '../errors';
import { canSeeEvent, inScope, locationIndexOf, simulateLatency, type ServiceRuntime } from '../internal';

/**
 * Visibilidade de notificação: respeita módulo (permissão + contrato) e
 * escopo de localização. Notificações que apontam para evento seguem a regra
 * de visibilidade do próprio evento.
 */
function isVisible(ctx: AccessContext, db: Readonly<DemoDatabase>, n: AppNotification): boolean {
  if (n.target.kind === 'event') {
    const targetId = n.target.id;
    const event = db.events.find((e) => e.id === targetId);
    return Boolean(event && canSeeEvent(ctx, event));
  }
  if (n.recipientUserIds && !n.recipientUserIds.includes(ctx.user.id)) return false;
  if (!isModuleAvailable(ctx, n.moduleId)) return false;
  return n.locationId ? inScope(ctx, n.locationId) : true;
}

function matches(ctx: AccessContext, db: Readonly<DemoDatabase>, n: AppNotification, f: NotificationFilter): boolean {
  const read = n.readByUserIds.includes(ctx.user.id);
  if (f.category === 'nao-lidas' && read) return false;
  if (f.category === 'importantes' && !n.important) return false;
  if (f.moduleId && n.moduleId !== f.moduleId) return false;
  if (f.type && n.type !== f.type) return false;
  if (f.readStatus === 'lida' && !read) return false;
  if (f.readStatus === 'nao-lida' && read) return false;
  if (f.locationId) {
    if (!n.locationId) return false;
    if (!locationIndexOf(db).isDescendantOrSelf(n.locationId, f.locationId)) return false;
  }
  return true;
}

export function createNotificationService(rt: ServiceRuntime): NotificationService {
  const visible = (ctx: AccessContext) => {
    const db = rt.store.getSnapshot();
    return { db, list: db.notifications.filter((n) => isVisible(ctx, db, n)) };
  };

  return {
    async list(ctx, filter) {
      await simulateLatency(rt);
      const { db, list } = visible(ctx);
      const index = locationIndexOf(db);
      return list
        .filter((n) => matches(ctx, db, n, filter))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n): NotificationView => {
          const targetId = n.target.kind === 'event' ? n.target.id : undefined;
          return {
            notification: n,
            read: n.readByUserIds.includes(ctx.user.id),
            locationPath: n.locationId ? index.pathOf(n.locationId) : [],
            linkedEventStatus: targetId ? db.events.find((e) => e.id === targetId)?.status : undefined,
          };
        });
    },

    unreadCount(ctx) {
      return visible(ctx).list.filter((n) => !n.readByUserIds.includes(ctx.user.id)).length;
    },

    async markRead(ctx, id) {
      const { list } = visible(ctx);
      if (!list.some((n) => n.id === id)) throw notFound('Notificação não encontrada.');
      rt.store.mutate((draft) => {
        const n = draft.notifications.find((x) => x.id === id)!;
        if (!n.readByUserIds.includes(ctx.user.id)) n.readByUserIds.push(ctx.user.id);
      });
    },

    async markAllRead(ctx, filter) {
      await simulateLatency(rt);
      const { db, list } = visible(ctx);
      const ids = new Set(
        list.filter((n) => matches(ctx, db, n, filter) && !n.readByUserIds.includes(ctx.user.id)).map((n) => n.id),
      );
      if (ids.size === 0) return 0;
      rt.store.mutate((draft) => {
        for (const n of draft.notifications) {
          if (ids.has(n.id)) n.readByUserIds.push(ctx.user.id);
        }
      });
      return ids.size;
    },

    criticalUnread(ctx) {
      return visible(ctx).list.filter((n) => n.severity === 'critica' && !n.readByUserIds.includes(ctx.user.id));
    },
  };
}
