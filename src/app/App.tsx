import { useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import { createServices, type ServiceBundle } from '@/services';
import { ServicesProvider } from './providers/ServicesProvider';
import { SessionProvider } from './providers/SessionProvider';
import { ROUTER_FUTURE, appRoutes } from './routes';

/** Providers da aplicação (reutilizados nos testes com outro router/bundle). */
export function AppProviders({ bundle, children, initialUserId }: { bundle: ServiceBundle; children: React.ReactNode; initialUserId?: string }) {
  return (
    <ServicesProvider bundle={bundle}>
      <SessionProvider initialUserId={initialUserId}>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </ServicesProvider>
  );
}

export function App() {
  const [bundle] = useState(() => createServices());
  const [router] = useState(() => createBrowserRouter(appRoutes, { future: ROUTER_FUTURE }));
  return (
    <AppProviders bundle={bundle}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AppProviders>
  );
}
