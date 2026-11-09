import { createDemoSeed } from '@/data/seed';
import type { Services } from './contracts';
import type { ServiceRuntime } from './internal';
import { createAssetService, createDeviceService } from './mock/assetService';
import { createCentralService } from './mock/centralService';
import { createDiscoveryService } from './mock/discoveryService';
import { createMonitorService } from './mock/monitorService';
import { createDashboardService } from './mock/dashboardService';
import { createGroupService } from './mock/groupService';
import { createDemoService } from './mock/demoService';
import { createSecurityHubService } from './mock/securityHubService';
import { createEventService } from './mock/eventService';
import { createLocationService } from './mock/locationService';
import { createMaintenanceService } from './mock/maintenanceService';
import { createOccurrenceService } from './mock/occurrenceService';
import { createPlanService } from './mock/planService';
import { createRoutineService } from './mock/routineService';
import { createNotificationService } from './mock/notificationService';
import { createPeopleService } from './mock/peopleService';
import { createSearchService } from './mock/searchService';
import { createSessionService } from './mock/sessionService';
import { DemoStore, type StorageLike } from './store';

export * from './contracts';
export * from './errors';
export { DemoStore } from './store';
export { SEARCH_TYPE_LABEL } from './mock/searchService';

export interface CreateServicesOptions {
  storage?: StorageLike | null;
  latencyMs?: number;
  now?: () => Date;
}

export interface ServiceBundle {
  services: Services;
  store: DemoStore;
}

/** Monta a camada de serviços mock sobre a store local. */
export function createServices(options: CreateServicesOptions = {}): ServiceBundle {
  const now = options.now ?? (() => new Date());
  const store = new DemoStore({
    seedFactory: () => createDemoSeed(now()),
    storage: options.storage === undefined ? safeLocalStorage() : options.storage,
  });
  let counter = 0;
  const runtime: ServiceRuntime = {
    store,
    latencyMs: options.latencyMs ?? 250,
    now,
    newId: (prefix) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`,
  };
  const central = createCentralService(runtime);
  const maintenance = createMaintenanceService(runtime);
  const occurrences = createOccurrenceService(runtime);
  const plans = createPlanService(runtime);
  const routines = createRoutineService(runtime);
  return {
    store,
    services: {
      session: createSessionService(runtime),
      locations: createLocationService(runtime),
      assets: createAssetService(runtime),
      devices: createDeviceService(runtime),
      people: createPeopleService(runtime),
      events: createEventService(runtime),
      notifications: createNotificationService(runtime),
      // A busca consulta os módulos especialistas, que aplicam as próprias regras.
      search: createSearchService(runtime, { occurrences, maintenance, plans, routines }),
      hub: createSecurityHubService(runtime),
      central,
      monitor: createMonitorService(runtime),
      discovery: createDiscoveryService(runtime, central),
      groups: createGroupService(runtime),
      dashboards: createDashboardService(runtime),
      demo: createDemoService(runtime),
      maintenance,
      occurrences,
      plans,
      routines,
    },
  };
}

function safeLocalStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage;
    const probe = '__grs_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
