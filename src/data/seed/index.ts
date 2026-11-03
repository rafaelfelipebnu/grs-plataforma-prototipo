import { buildContract } from '@/access/plans';
import type { ISODateString } from '@/domain';
import { DEMO_SCHEMA_VERSION, type DemoDatabase } from '../database';
import { DEMO_CLASSIFICATIONS, createDemoAssets } from './assets';
import { DEMO_CONNECTORS, DEMO_DEVICES, createDemoDataPoints, createDemoDeviceHealth } from './devices';
import { createDemoEvents, createDemoNotifications } from './events';
import { createDemoAccessPassages } from './accessPassages';
import { createDefaultDashboard } from './dashboard';
import { DEMO_COMPANY, DEMO_LOCATIONS, DEMO_ORG_LOCATION_MAPPINGS, DEMO_ORG_UNITS } from './organization';
import { DEMO_PEOPLE, DEMO_USERS } from './people';

/**
 * Cria o cenário de demonstração. Os horários são relativos a `now` para que
 * a demonstração sempre pareça "ao vivo".
 */
export function createDemoSeed(now: Date = new Date()): DemoDatabase {
  const at = (minutesAgo: number): ISODateString => new Date(now.getTime() - minutesAgo * 60_000).toISOString();

  return structuredClone({
    meta: { schemaVersion: DEMO_SCHEMA_VERSION, seededAt: now.toISOString() },
    company: DEMO_COMPANY,
    contract: buildContract('integrado'),
    users: DEMO_USERS,
    auditLog: [],
    notifications: createDemoNotifications(at),
    people: DEMO_PEOPLE,
    orgUnits: DEMO_ORG_UNITS,
    orgLocationMappings: DEMO_ORG_LOCATION_MAPPINGS,
    locations: DEMO_LOCATIONS,
    classifications: DEMO_CLASSIFICATIONS,
    assets: createDemoAssets(at),
    devices: DEMO_DEVICES,
    connectors: DEMO_CONNECTORS,
    deviceHealth: createDemoDeviceHealth(at),
    dataPoints: createDemoDataPoints(at),
    events: createDemoEvents(at),
    accessPassages: createDemoAccessPassages(at),
    dashboards: { clientDefault: createDefaultDashboard(at(1440)), personal: {} },
    demoSettings: { liveSimulation: true },
  } satisfies DemoDatabase);
}
