import { can, isModuleAvailable, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import type { Asset, Device, Id } from '@/domain';
import type { CentralService, DiscoveryReviewService, ReviewApproval, ReviewItem, ReviewRef } from '../contracts';
import { ServiceError, forbidden, notFound } from '../errors';
import { inScope, locationIndexOf, simulateLatency, type ServiceRuntime } from '../internal';
import { isDeviceVisible } from './assetService';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';

const MIN_REASON = 5;

/**
 * Revisão humana da descoberta (Central). A descoberta só sugere; criar o
 * dispositivo, confirmar a localização física e associar a um ativo exigem
 * aprovação de pessoa autorizada (docs/07, PRD da Central e do Monitor).
 */
export function createDiscoveryService(rt: ServiceRuntime, central: CentralService): DiscoveryReviewService {
  const canReview = (ctx: AccessContext) => isModuleAvailable(ctx, 'central') && can(ctx, 'central.manage');

  const pendingItems = (ctx: AccessContext, db: Readonly<DemoDatabase>): ReviewItem[] => {
    const index = locationIndexOf(db);
    const candidates: ReviewItem[] = isModuleAvailable(ctx, 'monitor')
      ? db.discoveryCandidates
          .filter((c) => c.status === 'pendente')
          .map((c) => ({ c, connector: db.connectors.find((x) => x.id === c.connectorId) }))
          .filter(({ connector }) => connector && inScope(ctx, connector.unitLocationId))
          .map(({ c, connector }) => ({
            kind: 'candidato' as const,
            candidate: c,
            connector: connector!,
            suggestedLocationPath: c.suggestions.locationId ? index.pathOf(c.suggestions.locationId) : [],
            suggestedAsset: c.suggestions.assetId ? db.assets.find((a) => a.id === c.suggestions.assetId && inScope(ctx, a.primaryLocationId)) : undefined,
            suggestedClassification: c.suggestions.classificationId ? db.classifications.find((x) => x.id === c.suggestions.classificationId) : undefined,
          }))
      : [];
    const devices: ReviewItem[] = db.devices
      .filter((d) => d.locationStatus !== 'confirmada' && isDeviceVisible(ctx, db, d))
      .map((device) => ({
        kind: 'dispositivo' as const,
        device,
        connector: db.connectors.find((c) => c.id === device.connectorId),
        suggestedLocationPath: device.suggestedLocationId ? index.pathOf(device.suggestedLocationId) : [],
      }));
    return [...candidates, ...devices];
  };

  const prepare = (ctx: AccessContext) => {
    requireModule(ctx, 'central');
    if (!can(ctx, 'central.manage')) throw forbidden('Seu perfil não pode aprovar dispositivos descobertos.');
    return rt.store.getSnapshot();
  };

  const findTarget = (ctx: AccessContext, db: Readonly<DemoDatabase>, ref: ReviewRef) => {
    if (ref.kind === 'candidato') {
      requireModule(ctx, 'monitor');
      const candidate = db.discoveryCandidates.find((c) => c.id === ref.id);
      if (!candidate) throw notFound('Dispositivo descoberto não encontrado.');
      const connector = db.connectors.find((c) => c.id === candidate.connectorId);
      if (!connector || !inScope(ctx, connector.unitLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      if (candidate.status !== 'pendente') throw new ServiceError('CONFLICT', 'Este dispositivo já foi revisado.');
      return { candidate, device: undefined };
    }
    const device = db.devices.find((d) => d.id === ref.id);
    if (!device) throw notFound('Dispositivo não encontrado.');
    if (!isDeviceVisible(ctx, db, device)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    if (device.locationStatus === 'confirmada') throw new ServiceError('CONFLICT', 'A localização deste dispositivo já foi confirmada.');
    return { candidate: undefined, device };
  };

  return {
    canReview,

    pendingCount(ctx) {
      if (!isModuleAvailable(ctx, 'central')) return 0;
      return pendingItems(ctx, rt.store.getSnapshot()).length;
    },

    async pending(ctx) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      return pendingItems(ctx, rt.store.getSnapshot());
    },

    async approve(ctx, ref, input: ReviewApproval) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const { candidate, device: existing } = findTarget(ctx, db, ref);
      const errors: string[] = [];
      if (input.reason.trim().length < MIN_REASON) errors.push('Informe o motivo da aprovação (mínimo de 5 caracteres).');
      if (input.deviceName.trim().length < 3) errors.push('Informe o nome do dispositivo.');
      if (!input.locationId) errors.push('Confirme a localização física do dispositivo.');
      else if (!db.locations.some((l) => l.id === input.locationId)) errors.push('Localização inválida.');
      else if (!inScope(ctx, input.locationId)) errors.push('A localização está fora do seu escopo.');
      let linked: Asset | undefined;
      if (input.association.kind === 'existente') {
        const assetId = input.association.assetId;
        linked = db.assets.find((a) => a.id === assetId);
        if (!linked) errors.push('Selecione o ativo a associar.');
        else if (!inScope(ctx, linked.primaryLocationId)) errors.push('O ativo está fora do seu escopo.');
      }
      if (errors.length) throw new ServiceError('VALIDATION', errors.join(' '));

      // Novo ativo: usa o mesmo serviço de identidade mestre (valida tag, local, duplicidade).
      let created: Asset | undefined;
      if (input.association.kind === 'novo') created = await central.createAsset(ctx, input.association.asset);
      const assetId: Id | undefined = created?.id ?? linked?.id;
      const now = rt.now().toISOString();
      let device: Device;

      rt.store.mutate((draft) => {
        if (candidate) {
          device = {
            id: rt.newId('d'),
            name: input.deviceName.trim(),
            deviceType: candidate.deviceType,
            manufacturer: candidate.manufacturer,
            model: candidate.model,
            protocol: candidate.protocol,
            connectorId: candidate.connectorId,
            locationStatus: 'confirmada',
            locationId: input.locationId,
            assetId,
            origin: 'descoberta',
            address: candidate.address,
          };
          draft.devices.push(device);
          draft.deviceHealth.push({ deviceId: device.id, communication: 'online', lastSeenAt: now });
          for (const p of candidate.points) {
            draft.dataPoints.push({ id: rt.newId('dp'), deviceId: device.id, name: p.name, unit: p.unit, value: p.value, updatedAt: now, status: 'normal' });
          }
          const c = draft.discoveryCandidates.find((x) => x.id === candidate.id)!;
          c.status = 'aprovado';
          c.decision = { byUserId: ctx.user.id, at: now, reason: input.reason.trim(), deviceId: device.id, assetId, createdAssetId: created?.id };
        } else {
          const d = draft.devices.find((x) => x.id === existing!.id)!;
          Object.assign(d, { name: input.deviceName.trim(), locationStatus: 'confirmada', locationId: input.locationId, suggestedLocationId: undefined, assetId });
          device = d;
        }
        const assetTag = assetId ? draft.assets.find((a) => a.id === assetId)?.tag : undefined;
        const locName = locationIndexOf(draft).get(input.locationId)?.name;
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: ctx.user.id,
          moduleId: 'central',
          action: candidate ? 'descoberta.aprovar' : 'dispositivo.confirmar-local',
          entityType: 'dispositivo',
          entityId: device.id,
          summary: `${candidate ? 'Dispositivo descoberto aprovado' : 'Localização confirmada'}: ${device.name} em ${locName}${
            assetTag ? `, associado a ${assetTag}${created ? ' (ativo criado na aprovação)' : ''}` : ', sem associação a ativo'
          }. Motivo: ${input.reason.trim()}`,
        });
      });
      return { device: rt.store.getSnapshot().devices.find((d) => d.id === device!.id)!, asset: created ?? linked };
    },

    async reject(ctx, ref, reason) {
      await simulateLatency(rt);
      const db = prepare(ctx);
      const { candidate, device } = findTarget(ctx, db, ref);
      if (reason.trim().length < MIN_REASON) throw new ServiceError('VALIDATION', 'Informe o motivo da rejeição (mínimo de 5 caracteres).');
      if (device && device.locationStatus !== 'sugerida') {
        throw new ServiceError('VALIDATION', 'Não há sugestão de localização para rejeitar. Confirme a localização quando ela for identificada.');
      }
      const now = rt.now().toISOString();
      rt.store.mutate((draft) => {
        if (candidate) {
          const c = draft.discoveryCandidates.find((x) => x.id === candidate.id)!;
          c.status = 'rejeitado';
          c.decision = { byUserId: ctx.user.id, at: now, reason: reason.trim() };
        } else {
          const d = draft.devices.find((x) => x.id === device!.id)!;
          d.locationStatus = 'nao_identificada';
          d.suggestedLocationId = undefined;
        }
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: ctx.user.id,
          moduleId: 'central',
          action: candidate ? 'descoberta.rejeitar' : 'dispositivo.rejeitar-sugestao',
          entityType: 'dispositivo',
          entityId: candidate?.id ?? device!.id,
          summary: `${candidate ? `Dispositivo descoberto rejeitado: ${candidate.name}` : `Sugestão de localização rejeitada: ${device!.name}`}. Motivo: ${reason.trim()}`,
        });
      });
    },
  };
}
