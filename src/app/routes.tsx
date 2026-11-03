import type { RouteObject } from 'react-router-dom';
import { MODULE_ORDER } from '@/modules/registry';
import type { ModuleId } from '@/domain';
import { AppShell } from '@/shell/AppShell';
import { AccessListPage } from '@/modules/security-hub/AccessListPage';
import { DashboardPage } from '@/modules/security-hub/DashboardPage';
import { EventsListPage } from '@/modules/security-hub/EventsListPage';
import { LoginPage } from '@/pages/LoginPage';
import { ModuleGate } from '@/pages/ModuleGate';
import { ModuleHomePage } from '@/pages/ModuleHomePage';
import { SearchPage } from '@/pages/SearchPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LandingRedirect, NotFoundPage, RequireSession } from '@/pages/SystemPages';
import { AssetPage } from '@/pages/records/AssetPage';
import { DevicePage } from '@/pages/records/DevicePage';
import { EventPage } from '@/pages/records/EventPage';
import { LocationPage } from '@/pages/records/LocationPage';
import { PersonPage } from '@/pages/records/PersonPage';

/** Página inicial dos módulos já implementados (os demais usam a página provisória). */
const MODULE_INDEX: Partial<Record<ModuleId, JSX.Element>> = {
  'security-hub': <DashboardPage />,
};

/** Rotas de cada módulo (crescem a cada etapa). */
const MODULE_CHILD_ROUTES: Partial<Record<ModuleId, RouteObject[]>> = {
  'security-hub': [
    { path: 'eventos', element: <EventsListPage /> },
    { path: 'eventos/:eventId', element: <EventPage /> },
    { path: 'acessos', element: <AccessListPage /> },
  ],
  central: [
    { path: 'ativos/:assetId', element: <AssetPage /> },
    { path: 'dispositivos/:deviceId', element: <DevicePage /> },
    { path: 'locais/:locationId', element: <LocationPage /> },
  ],
};

/** Flags de compatibilidade com React Router v7 (evita mudanças de comportamento na migração). */
export const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;

export const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <LandingRedirect /> },
          ...MODULE_ORDER.map<RouteObject>((m) => ({
            path: m.basePath.slice(1),
            element: <ModuleGate moduleId={m.id} />,
            children: [
              { index: true, element: MODULE_INDEX[m.id] ?? <ModuleHomePage moduleId={m.id} /> },
              ...(MODULE_CHILD_ROUTES[m.id] ?? []),
            ],
          })),
          { path: 'pessoas/:personId', element: <PersonPage /> },
          { path: 'busca', element: <SearchPage /> },
          { path: 'configuracoes', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
