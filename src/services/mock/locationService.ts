import type { Location } from '@/domain';
import type { LocationService, LocationTreeNode } from '../contracts';
import { forbidden, notFound } from '../errors';
import { inScope, locationIndexOf, simulateLatency, type ServiceRuntime } from '../internal';
import { OUT_OF_SCOPE_MESSAGE } from './guards';

export function createLocationService(rt: ServiceRuntime): LocationService {
  return {
    getTree(ctx) {
      const db = rt.store.getSnapshot();
      const index = locationIndexOf(db);
      const visible = (loc: Location) => inScope(ctx, loc.id);
      const build = (loc: Location): LocationTreeNode => ({
        location: loc,
        children: index.childrenOf(loc.id).filter(visible).map(build),
      });
      // Raízes do escopo: locais visíveis cujo pai não é visível (ou não existe).
      const roots = index
        .all()
        .filter((loc) => visible(loc) && (!loc.parentId || !inScope(ctx, loc.parentId)))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      return roots.map(build);
    },

    async get(ctx, id) {
      await simulateLatency(rt);
      const db = rt.store.getSnapshot();
      const index = locationIndexOf(db);
      const location = index.get(id);
      if (!location) throw notFound('Localização não encontrada.');
      if (!inScope(ctx, id)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      const responsible = location.responsiblePersonId
        ? db.people.find((p) => p.id === location.responsiblePersonId)
        : undefined;
      return {
        location,
        path: index.pathOf(id),
        responsible,
        childCount: index.childrenOf(id).filter((c) => inScope(ctx, c.id)).length,
      };
    },

    pathOf(ctx, id) {
      if (!inScope(ctx, id)) return [];
      return locationIndexOf(rt.store.getSnapshot()).pathOf(id);
    },
  };
}
