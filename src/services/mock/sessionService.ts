import { buildAccessContext, PROFILES, PROFILE_ORDER } from '@/access';
import type { DemoUser } from '@/domain';
import type { DemoUserSummary, SessionService } from '../contracts';
import { locationIndexOf, type ServiceRuntime } from '../internal';

export function createSessionService(rt: ServiceRuntime): SessionService {
  const scopeLabel = (user: DemoUser): string => {
    if (user.scope.kind === 'corporativo') return 'Todas as unidades';
    const index = locationIndexOf(rt.store.getSnapshot());
    return user.scope.rootLocationIds.map((id) => index.get(id)?.name ?? id).join(', ');
  };

  return {
    listDemoUsers() {
      const db = rt.store.getSnapshot();
      return db.users
        .map((user): DemoUserSummary | null => {
          const person = db.people.find((p) => p.id === user.personId);
          if (!person) return null;
          return { user, person, profile: PROFILES[user.profileId], scopeLabel: scopeLabel(user) };
        })
        .filter((s): s is DemoUserSummary => s !== null)
        .sort((a, b) => PROFILE_ORDER.indexOf(a.profile.id) - PROFILE_ORDER.indexOf(b.profile.id));
    },

    resolveAccessContext(userId) {
      const db = rt.store.getSnapshot();
      const user = db.users.find((u) => u.id === userId);
      if (!user) return null;
      const person = db.people.find((p) => p.id === user.personId);
      return buildAccessContext(user, person, db.contract, locationIndexOf(db));
    },

    getCompany() {
      return rt.store.getSnapshot().company;
    },
  };
}
