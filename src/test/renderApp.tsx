import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/app/App';
import { ROUTER_FUTURE, appRoutes } from '@/app/routes';
import { createServices } from '@/services';

export const FIXED_NOW = new Date('2026-11-03T12:00:00.000Z');

/** Bundle de serviços isolado: sem persistência, sem latência, relógio fixo. */
export function createTestServices() {
  return createServices({ storage: null, latencyMs: 0, now: () => FIXED_NOW });
}

/** Renderiza a aplicação completa em memória, opcionalmente já autenticada. */
export function renderApp({ path = '/', userId }: { path?: string; userId?: string } = {}) {
  const bundle = createTestServices();
  // Testes determinísticos: sem passagens geradas aleatoriamente.
  bundle.store.mutate((d) => {
    d.demoSettings.liveSimulation = false;
  });
  const router = createMemoryRouter(appRoutes, { initialEntries: [path], future: ROUTER_FUTURE });
  const utils = render(
    <AppProviders bundle={bundle} initialUserId={userId}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AppProviders>,
  );
  return { ...utils, bundle, router };
}
