import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ServiceBundle } from '@/services';

const ServicesContext = createContext<ServiceBundle | null>(null);

export function ServicesProvider({ bundle, children }: { bundle: ServiceBundle; children: ReactNode }) {
  return <ServicesContext.Provider value={bundle}>{children}</ServicesContext.Provider>;
}

function useBundle(): ServiceBundle {
  const bundle = useContext(ServicesContext);
  if (!bundle) throw new Error('ServicesProvider ausente.');
  return bundle;
}

export function useServices() {
  return useBundle().services;
}

/**
 * Versão da store simulada. Muda a cada alteração de dados, permitindo que
 * telas relacionadas recarreguem automaticamente (equivale a eventos de
 * atualização de um backend real).
 */
export function useDataVersion(): number {
  const { store } = useBundle();
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getVersion(),
  );
}
