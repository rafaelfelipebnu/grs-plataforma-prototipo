import { isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import type { Asset, Classification, Device, Id } from '@/domain';
import type { AssetService, AssetSummary, DeviceService, ResponsibilityOrigin } from '../contracts';
import { forbidden, notFound } from '../errors';
import { inScope, locationIndexOf, simulateLatency, type ServiceRuntime } from '../internal';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';

export function classificationPath(db: Readonly<DemoDatabase>, id: Id): Classification[] {
  const path: Classification[] = [];
  let current = db.classifications.find((c) => c.id === id);
  while (current) {
    path.unshift(current);
    const parentId = current.parentId;
    current = parentId ? db.classifications.find((c) => c.id === parentId) : undefined;
  }
  return path;
}

/** Local considerado para escopo de um dispositivo. */
export function deviceScopeLocationId(db: Readonly<DemoDatabase>, device: Device): Id | undefined {
  if (device.locationStatus === 'confirmada') return device.locationId;
  if (device.locationStatus === 'sugerida') return device.suggestedLocationId;
  return db.connectors.find((c) => c.id === device.connectorId)?.unitLocationId;
}

export function isDeviceVisible(ctx: AccessContext, db: Readonly<DemoDatabase>, device: Device): boolean {
  return inScope(ctx, deviceScopeLocationId(db, device));
}

/** Responsabilidade híbrida: direta ou herdada do local mais próximo que tenha responsável. */
export function resolveResponsibility(
  db: Readonly<DemoDatabase>,
  asset: Pick<Asset, 'directResponsiblePersonId' | 'primaryLocationId'>,
): { personId?: Id; origin: ResponsibilityOrigin } {
  if (asset.directResponsiblePersonId) return { personId: asset.directResponsiblePersonId, origin: { kind: 'direto' } };
  const fromLocation = [...locationIndexOf(db).pathOf(asset.primaryLocationId)].reverse().find((l) => l.responsiblePersonId);
  if (fromLocation) return { personId: fromLocation.responsiblePersonId, origin: { kind: 'herdado', fromLocation } };
  return { origin: { kind: 'nao-definido' } };
}

/** Monta o resumo de identidade do ativo respeitando o escopo nas relações. */
export function buildAssetSummary(ctx: AccessContext, db: Readonly<DemoDatabase>, asset: Asset): AssetSummary {
  const index = locationIndexOf(db);
  const responsibility = resolveResponsibility(db, asset);
  return {
    asset,
    classificationPath: classificationPath(db, asset.classificationId),
    primaryLocationPath: index.pathOf(asset.primaryLocationId),
    servedLocations: asset.servedLocationIds.map((locId) => index.get(locId)).filter((l): l is NonNullable<typeof l> => Boolean(l)),
    responsible: responsibility.personId ? db.people.find((p) => p.id === responsibility.personId) : undefined,
    responsibilityOrigin: responsibility.origin,
    devices: db.devices.filter((d) => d.assetId === asset.id && isDeviceVisible(ctx, db, d)),
    dependsOn: asset.relationships
      .map((r) => db.assets.find((a) => a.id === r.targetAssetId))
      .filter((a): a is NonNullable<typeof a> => Boolean(a && inScope(ctx, a.primaryLocationId))),
    dependents: db.assets.filter(
      (a) => inScope(ctx, a.primaryLocationId) && a.relationships.some((r) => r.type === 'depende-de' && r.targetAssetId === asset.id),
    ),
  };
}

export function createAssetService(rt: ServiceRuntime): AssetService {
  return {
    async get(ctx, id) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      const db = rt.store.getSnapshot();
      const asset = db.assets.find((a) => a.id === id);
      if (!asset) throw notFound('Ativo não encontrado.');
      if (!inScope(ctx, asset.primaryLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      return buildAssetSummary(ctx, db, asset);
    },
  };
}

export function createDeviceService(rt: ServiceRuntime): DeviceService {
  return {
    async get(ctx, id) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      const db = rt.store.getSnapshot();
      const device = db.devices.find((d) => d.id === id);
      if (!device) throw notFound('Dispositivo não encontrado.');
      if (!isDeviceVisible(ctx, db, device)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      const index = locationIndexOf(db);
      const asset = device.assetId ? db.assets.find((a) => a.id === device.assetId) : undefined;
      return {
        device,
        locationPath: device.locationId ? index.pathOf(device.locationId) : [],
        suggestedLocationPath: device.suggestedLocationId ? index.pathOf(device.suggestedLocationId) : [],
        asset: asset && inScope(ctx, asset.primaryLocationId) ? asset : undefined,
        connector: db.connectors.find((c) => c.id === device.connectorId),
        // Dados técnicos de monitoramento pertencem ao Monitor de Infraestrutura.
        monitoring: isModuleAvailable(ctx, 'monitor')
          ? {
              health: db.deviceHealth.find((h) => h.deviceId === device.id),
              dataPoints: db.dataPoints.filter((p) => p.deviceId === device.id),
            }
          : undefined,
      };
    },
  };
}
