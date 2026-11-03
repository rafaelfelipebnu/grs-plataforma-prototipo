import { can } from '@/access';
import type { PeopleService } from '../contracts';
import { forbidden, notFound } from '../errors';
import { inScope, locationIndexOf, simulateLatency, type ServiceRuntime } from '../internal';
import { OUT_OF_SCOPE_MESSAGE } from './guards';

/**
 * Pessoas vêm de fonte integrada (Controle de Acesso, simulado).
 * O GRS apenas consulta — não mantém cadastro próprio de pessoas.
 */
export function createPeopleService(rt: ServiceRuntime): PeopleService {
  return {
    async get(ctx, id) {
      await simulateLatency(rt);
      if (!can(ctx, 'pessoas.view')) throw forbidden('Seu perfil não tem acesso à consulta de pessoas.');
      const db = rt.store.getSnapshot();
      const person = db.people.find((p) => p.id === id);
      if (!person) throw notFound('Pessoa não encontrada.');
      if (!inScope(ctx, person.referenceLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      return {
        person,
        orgUnit: person.orgUnitId ? db.orgUnits.find((o) => o.id === person.orgUnitId) : undefined,
        referenceLocationPath: locationIndexOf(db).pathOf(person.referenceLocationId),
      };
    },
  };
}
