import { buildContract, COMMERCIAL_PLANS } from '@/access';
import type { DemoDatabase } from '@/data/database';
import { ACCESS_POINTS, DENIAL_REASONS } from '@/data/seed/accessPassages';
import type { Id } from '@/domain';
import type { DemoService } from '../contracts';
import { ServiceError } from '../errors';
import { hasSecurityClassification, simulateLatency, type ServiceRuntime } from '../internal';

const PUMP_EVENT_CODE = 'EVT-SIM-BMB014';
const SYSTEM_ACTOR = 'sistema';
/** Limite de passagens mantidas para não crescer indefinidamente o armazenamento local. */
const MAX_PASSAGES = 400;

/**
 * Controles da demonstração — ferramenta do facilitador, não funcionalidade
 * do produto. Simula o "mundo externo" (sinais de dispositivos, contrato,
 * passagens no Controle de Acesso).
 */
export function createDemoService(rt: ServiceRuntime): DemoService {
  return {
    status() {
      const db = rt.store.getSnapshot();
      return {
        seededAt: db.meta.seededAt,
        persistenceAvailable: rt.store.persistenceAvailable,
        contract: db.contract,
        scenarioAPumpFailureActive: db.events.some((e) => e.code === PUMP_EVENT_CODE && e.status === 'ativo'),
        liveSimulation: db.demoSettings.liveSimulation,
      };
    },

    async setContract(planId, customCapabilities = []) {
      await simulateLatency(rt);
      if (!COMMERCIAL_PLANS[planId]) throw new ServiceError('VALIDATION', 'Perfil comercial inválido.');
      const contract = buildContract(planId, customCapabilities);
      rt.store.mutate((draft) => {
        draft.contract = contract;
        draft.auditLog.push({
          id: rt.newId('aud'),
          at: rt.now().toISOString(),
          actorUserId: SYSTEM_ACTOR,
          moduleId: 'plataforma',
          action: 'demo.contrato',
          entityType: 'contrato',
          entityId: draft.company.id,
          summary: `Perfil comercial da demonstração alterado para ${COMMERCIAL_PLANS[planId].name}.`,
        });
      });
      return contract;
    },

    async setLiveSimulation(enabled) {
      rt.store.mutate((draft) => {
        draft.demoSettings.liveSimulation = enabled;
      });
    },

    tickLive() {
      const db = rt.store.getSnapshot();
      if (!db.demoSettings.liveSimulation) return;
      const point = ACCESS_POINTS[Math.floor(Math.random() * ACCESS_POINTS.length)]!;
      const personId = point.personIds[Math.floor(Math.random() * point.personIds.length)]!;
      const denied = Math.random() < 0.08;
      rt.store.mutate((draft) => {
        draft.accessPassages.unshift({
          id: rt.newId('ap'),
          personId,
          credential: `CR-${personId.replace('p-', '')}${Math.floor(Math.random() * 90 + 10)}`,
          locationId: point.locationId,
          deviceId: point.deviceId,
          direction: Math.random() < 0.55 ? 'entrada' : 'saida',
          result: denied ? 'negado' : 'liberado',
          reason: denied ? DENIAL_REASONS[Math.floor(Math.random() * DENIAL_REASONS.length)] : undefined,
          occurredAt: rt.now().toISOString(),
          source: 'controle-acesso',
        });
        if (draft.accessPassages.length > MAX_PASSAGES) draft.accessPassages.length = MAX_PASSAGES;
      });
    },

    async reset() {
      await simulateLatency(rt);
      rt.store.reset();
    },

    async simulatePumpFailure() {
      await simulateLatency(rt);
      const db = rt.store.getSnapshot();
      if (db.events.some((e) => e.code === PUMP_EVENT_CODE && e.status === 'ativo')) {
        throw new ServiceError('CONFLICT', 'A falha da BMB-014 já está ativa. Restaure o cenário para repetir.');
      }
      const now = rt.now().toISOString();
      const eventId: Id = rt.newId('ev');
      const notificationId: Id = rt.newId('n');

      rt.store.mutate((draft) => {
        // 1. Monitor recebe o sinal simulado (pontos de dado do CLP da bomba).
        const setPoint = (id: string, value: DemoDatabase['dataPoints'][number]['value'], status: 'critico' | 'normal') => {
          const point = draft.dataPoints.find((p) => p.id === id);
          if (point) Object.assign(point, { value, status, updatedAt: now });
        };
        setPoint('dp-bmb-pressao', 0.4, 'critico');
        setPoint('dp-bmb-motor', 'Falha', 'critico');
        setPoint('dp-bmb-corrente', 0, 'normal');
        draft.pointReadings.push(
          { pointId: 'dp-bmb-pressao', at: now, value: 0.4, status: 'critico' },
          { pointId: 'dp-bmb-motor', at: now, value: 'Falha', status: 'critico' },
        );
        const rule = draft.monitoringRules.find((r) => r.id === 'rule-bmb-pressao');
        if (rule) rule.lastTriggeredAt = now;

        // 2. Condição operacional do ativo alimentada pelo Monitor (criticidade não muda).
        const pump = draft.assets.find((a) => a.id === 'a-bmb014')!;
        pump.condition = 'critico';
        pump.conditionSource = { kind: 'modulo', moduleId: 'monitor' };
        pump.conditionUpdatedAt = now;

        // 3. Contextualização: ativos que dependem da bomba e são sistemas de segurança.
        const securityDependents = draft.assets.filter(
          (a) =>
            a.relationships.some((r) => r.type === 'depende-de' && r.targetAssetId === pump.id) &&
            hasSecurityClassification(draft, a.classificationId),
        );
        const securityContext =
          securityDependents.length > 0
            ? `Afeta ${securityDependents.map((a) => `${a.name} (${a.tag})`).join(', ')}.`
            : undefined;

        draft.events.push({
          id: eventId,
          code: PUMP_EVENT_CODE,
          source: 'monitor',
          category: 'telemetria',
          severity: 'critica',
          title: 'Falha na bomba BMB-014 — pressão de recalque baixa',
          description: 'Pressão de recalque caiu para 0,4 bar e o CLP reporta falha no motor.',
          locationId: pump.primaryLocationId,
          assetId: pump.id,
          deviceId: 'd-bmb014',
          ruleId: 'rule-bmb-pressao',
          occurredAt: now,
          securityContext,
          status: 'ativo',
        });

        draft.notifications.push({
          id: notificationId,
          moduleId: 'monitor',
          type: 'alerta',
          severity: 'critica',
          important: true,
          title: 'Falha na bomba BMB-014',
          message: securityContext ?? 'Pressão de recalque baixa e falha no motor.',
          locationId: pump.primaryLocationId,
          createdAt: now,
          target: { kind: 'event', id: eventId },
          readByUserIds: [],
        });

        draft.auditLog.push({
          id: rt.newId('aud'),
          at: now,
          actorUserId: SYSTEM_ACTOR,
          moduleId: 'monitor',
          action: 'simulacao.sinal',
          entityType: 'dispositivo',
          entityId: 'd-bmb014',
          summary: 'Sinal simulado de falha recebido do CLP da bomba BMB-014.',
        });
      });

      return { eventId, notificationId };
    },
  };
}
