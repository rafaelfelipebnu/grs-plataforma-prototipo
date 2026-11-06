import { Navigate, useParams, type RouteObject } from 'react-router-dom';
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
import { DevicePage } from '@/pages/records/DevicePage';
import { EventPage } from '@/pages/records/EventPage';
import { PersonPage } from '@/pages/records/PersonPage';
import { CentralHomePage } from '@/modules/central/CentralHomePage';
import { Asset360Page } from '@/modules/central/Asset360Page';
import { EditAssetPage, NewAssetPage } from '@/modules/central/AssetFormPage';
import { ImportAssetsPage } from '@/modules/central/ImportAssetsPage';
import { GroupDetailPage } from '@/modules/central/GroupDetailPage';
import { EditGroupPage, NewGroupPage } from '@/modules/central/GroupFormPage';
import { centralPaths } from '@/modules/central/centralPaths';
import { DiscoveryReviewPage } from '@/modules/central/DiscoveryReviewPage';
import { MonitorOverviewPage } from '@/modules/monitor/MonitorOverviewPage';
import { ConnectorsPage } from '@/modules/monitor/ConnectorsPage';
import { DiscoveryPage } from '@/modules/monitor/DiscoveryPage';
import { MonitorAlertsPage, MonitorDevicesPage, MonitorHistoryPage, PointsPage } from '@/modules/monitor/MonitorListsPages';
import { PointDetailPage } from '@/modules/monitor/PointDetailPage';
import { RulesPage } from '@/modules/monitor/RulesPage';
import { MaintenanceHomePage } from '@/modules/manutencao/MaintenanceHomePage';
import { RequestsListPage, WorkOrdersListPage } from '@/modules/manutencao/MaintenanceListsPages';
import { NewRequestPage } from '@/modules/manutencao/NewRequestPage';
import { RequestDetailPage } from '@/modules/manutencao/RequestDetailPage';
import { WorkOrderDetailPage } from '@/modules/manutencao/WorkOrderDetailPage';
import { MyOrderPage, MyOrdersPage } from '@/modules/manutencao/MyOrdersPages';

/** Endereço antigo de local: a visão por local vive na home da Central. */
function LocationRedirect() {
  const { locationId = '' } = useParams();
  return <Navigate to={centralPaths.location(locationId)} replace />;
}

/** Página inicial dos módulos já implementados (os demais usam a página provisória). */
const MODULE_INDEX: Partial<Record<ModuleId, JSX.Element>> = {
  'security-hub': <DashboardPage />,
  central: <CentralHomePage />,
  monitor: <MonitorOverviewPage />,
  manutencao: <MaintenanceHomePage />,
};

/** Rotas de cada módulo (crescem a cada etapa). */
const MODULE_CHILD_ROUTES: Partial<Record<ModuleId, RouteObject[]>> = {
  'security-hub': [
    { path: 'eventos', element: <EventsListPage /> },
    { path: 'eventos/:eventId', element: <EventPage /> },
    { path: 'acessos', element: <AccessListPage /> },
  ],
  monitor: [
    { path: 'conectores', element: <ConnectorsPage /> },
    { path: 'descoberta', element: <DiscoveryPage /> },
    { path: 'dispositivos', element: <MonitorDevicesPage /> },
    { path: 'pontos', element: <PointsPage /> },
    { path: 'pontos/:pointId', element: <PointDetailPage /> },
    { path: 'regras', element: <RulesPage /> },
    { path: 'alertas', element: <MonitorAlertsPage /> },
    { path: 'historico', element: <MonitorHistoryPage /> },
  ],
  manutencao: [
    { path: 'solicitacoes', element: <RequestsListPage /> },
    { path: 'solicitacoes/nova', element: <NewRequestPage /> },
    { path: 'solicitacoes/:requestId', element: <RequestDetailPage /> },
    { path: 'os', element: <WorkOrdersListPage /> },
    { path: 'os/:orderId', element: <WorkOrderDetailPage /> },
    { path: 'minhas-os', element: <MyOrdersPage /> },
    { path: 'minhas-os/:orderId', element: <MyOrderPage /> },
  ],
  central: [
    { path: 'ativos/novo', element: <NewAssetPage /> },
    { path: 'ativos/importar', element: <ImportAssetsPage /> },
    { path: 'ativos/:assetId', element: <Asset360Page /> },
    { path: 'ativos/:assetId/editar', element: <EditAssetPage /> },
    { path: 'grupos/novo', element: <NewGroupPage /> },
    { path: 'grupos/:groupId', element: <GroupDetailPage /> },
    { path: 'grupos/:groupId/editar', element: <EditGroupPage /> },
    { path: 'dispositivos/:deviceId', element: <DevicePage /> },
    { path: 'descobertas', element: <DiscoveryReviewPage /> },
    { path: 'locais/:locationId', element: <LocationRedirect /> },
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
