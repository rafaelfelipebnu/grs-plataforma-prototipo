import { createDemoSeed } from '@/data/seed';
import type { Services } from './contracts';
import type { ServiceRuntime } from './internal';
import { createAssetService, createDeviceService } from './mock/assetService';
import { createDashboardService } from './mock/dashboardService';
import { createDemoService } from './mock/demoService';
import { createSecurityHubService } from './mock/securityHubService';
import { createEventService } from './mock/eventService';
import { createLocationService } from './mock/locationService';
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
      search: createSearchService(runtime),
      hub: createSecurityHubService(runtime),
      dashboards: createDashboardService(runtime),
      demo: createDemoService(runtime),
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
