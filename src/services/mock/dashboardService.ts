import { can, type AccessContext } from '@/access';
import { DASHBOARD_AREAS, type WidgetInstance } from '@/domain';
import { WIDGET_CATALOG } from '@/modules/security-hub/catalog';
import type { DashboardService } from '../contracts';
import { ServiceError, forbidden } from '../errors';
import { simulateLatency, type ServiceRuntime } from '../internal';
import { requireModule } from './guards';

/** Validação estrutural do layout (tipos, áreas, tamanhos, ids únicos). */
function validate(widgets: WidgetInstance[]): void {
  const ids = new Set<string>();
  for (const w of widgets) {
    const def = WIDGET_CATALOG[w.type];
    if (!def) throw new ServiceError('VALIDATION', `Widget desconhecido: ${w.type}.`);
    if (!DASHBOARD_AREAS.includes(w.area)) throw new ServiceError('VALIDATION', `Área inválida para ${def.name}.`);
    if (!def.allowedSizes.includes(w.size)) throw new ServiceError('VALIDATION', `Tamanho não permitido para ${def.name}.`);
    if (ids.has(w.id)) throw new ServiceError('VALIDATION', 'Identificador de widget duplicado.');
    if (w.config.limit !== undefined && (w.config.limit < 1 || w.config.limit > 20)) {
      throw new ServiceError('VALIDATION', `Quantidade de ${def.name} deve estar entre 1 e 20.`);
    }
    ids.add(w.id);
  }
}

/**
 * Painéis do Security Hub. O cliente (administrador) define o padrão; cada
 * usuário pode personalizar o seu. Alterar o padrão afeta somente quem ainda
 * não personalizou (docs/03).
 */
export function createDashboardService(rt: ServiceRuntime): DashboardService {
  const view = (ctx: AccessContext) => {
    const db = rt.store.getSnapshot();
    const personal = db.dashboards.personal[ctx.user.id];
    return personal
      ? { layout: personal, source: 'pessoal' as const }
      : { layout: db.dashboards.clientDefault, source: 'padrao-cliente' as const };
  };

  return {
    get(ctx) {
      requireModule(ctx, 'security-hub');
      return view(ctx);
    },

    getClientDefault(ctx) {
      requireModule(ctx, 'security-hub');
      return rt.store.getSnapshot().dashboards.clientDefault;
    },

    async saveMine(ctx, widgets) {
      await simulateLatency(rt);
      requireModule(ctx, 'security-hub');
      validate(widgets);
      const now = rt.now().toISOString();
      rt.store.mutate((draft) => {
        draft.dashboards.personal[ctx.user.id] = { widgets: structuredClone(widgets), updatedAt: now, updatedByUserId: ctx.user.id };
      });
      return view(ctx);
    },

    async resetMine(ctx) {
      await simulateLatency(rt);
      requireModule(ctx, 'security-hub');
      rt.store.mutate((draft) => {
        delete draft.dashboards.personal[ctx.user.id];
      });
      return view(ctx);
    },

    async saveClientDefault(ctx, widgets) {
      await simulateLatency(rt);
      requireModule(ctx, 'security-hub');
      if (!can(ctx, 'hub.dashboard.default')) throw forbidden('Somente o administrador corporativo define o painel padrão do cliente.');
      validate(widgets);
      const now = rt.now().toISOString();
      rt.store.mutate((draft) => {
        draft.dashboards.clientDefault = { widgets: structuredClone(widgets), updatedAt: now, updatedByUserId: ctx.user.id };
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: ctx.user.id,
          moduleId: 'security-hub',
          action: 'painel.padrao',
          entityType: 'painel',
          entityId: draft.company.id,
          summary: 'Painel padrão do cliente atualizado.',
        });
      });
      return rt.store.getSnapshot().dashboards.clientDefault;
    },

    personalizedCount() {
      return Object.keys(rt.store.getSnapshot().dashboards.personal).length;
    },
  };
}
