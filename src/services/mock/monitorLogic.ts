import type { DemoDatabase } from '@/data/database';
import type { DataPoint, DataPointStatus, Id, MonitoringRule, OperationalEvent, PointReading, Severity } from '@/domain';
import { normalize, securityContextFor, SEVERITY_RANK, type ServiceRuntime } from '../internal';

/** Comparação simples com o limite (operadores avançados estão "a definir" no PRD). */
export function violates(rule: Pick<MonitoringRule, 'operator' | 'threshold'>, value: DataPoint['value']): boolean {
  if (value === null || value === undefined) return false;
  const numeric = typeof value === 'number' && typeof rule.threshold === 'number';
  switch (rule.operator) {
    case 'maior':
      return numeric && (value as number) > (rule.threshold as number);
    case 'menor':
      return numeric && (value as number) < (rule.threshold as number);
    case 'igual':
      return numeric ? value === rule.threshold : normalize(String(value)) === normalize(String(rule.threshold));
    case 'diferente':
      return numeric ? value !== rule.threshold : normalize(String(value)) !== normalize(String(rule.threshold));
  }
}

/** Status do ponto pela regra violada mais severa (P-42). */
export function statusFromSeverity(severity: Severity | undefined): DataPointStatus {
  if (!severity) return 'normal';
  return severity === 'critica' ? 'critico' : 'alerta';
}

/** Valor digitado: número quando possível. */
export function parseValue(raw: string | number): number | string {
  if (typeof raw === 'number') return raw;
  const t = raw.trim().replace(',', '.');
  return t !== '' && !Number.isNaN(Number(t)) ? Number(t) : raw.trim();
}

/**
 * Avalia as regras ativas de um ponto (dentro de uma mutação) e gera alertas
 * técnicos. Um alerta ativo por regra: se já existe, não duplica.
 */
export function evaluatePoint(rt: ServiceRuntime, draft: DemoDatabase, pointId: Id, actorUserId: Id): OperationalEvent[] {
  const point = draft.dataPoints.find((p) => p.id === pointId);
  if (!point) return [];
  const device = draft.devices.find((d) => d.id === point.deviceId);
  const rules = draft.monitoringRules.filter((r) => r.pointId === pointId && r.active);
  const violated = rules.filter((r) => violates(r, point.value));
  const worst = violated.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
  if (point.value !== null) point.status = statusFromSeverity(worst?.severity);

  const now = rt.now().toISOString();
  const created: OperationalEvent[] = [];
  for (const rule of violated) {
    if (draft.events.some((e) => e.ruleId === rule.id && e.status === 'ativo')) continue;
    const locationId = device?.locationId ?? device?.suggestedLocationId;
    if (!device || !locationId) continue;
    const asset = device.assetId ? draft.assets.find((a) => a.id === device.assetId) : undefined;
    const valueText = `${String(point.value)}${point.unit ? ` ${point.unit}` : ''}`;
    const event: OperationalEvent = {
      id: rt.newId('ev'),
      code: `EVT-MON-${String(draft.events.length + 1).padStart(4, '0')}`,
      source: 'monitor',
      category: 'telemetria',
      severity: rule.severity,
      title: `${rule.name}${asset ? ` — ${asset.tag}` : ` — ${device.name}`}`,
      description: `${point.name} = ${valueText} (regra: ${rule.operator} ${rule.threshold}${point.unit ? ` ${point.unit}` : ''}).`,
      locationId,
      assetId: asset?.id,
      deviceId: device.id,
      ruleId: rule.id,
      occurredAt: now,
      securityContext: securityContextFor(draft, asset?.id),
      status: 'ativo',
    };
    draft.events.push(event);
    rule.lastTriggeredAt = now;
    draft.notifications.push({
      id: rt.newId('n'),
      moduleId: 'monitor',
      type: 'alerta',
      severity: rule.severity,
      important: rule.severity === 'critica' || rule.severity === 'alta',
      title: event.title,
      message: event.securityContext ?? event.description,
      locationId,
      createdAt: now,
      target: { kind: 'event', id: event.id },
      readByUserIds: [],
    });
    draft.auditLog.push({
      id: rt.newId('aud'),
      at: now,
      actorUserId,
      moduleId: 'monitor',
      action: 'regra.disparar',
      entityType: 'regra',
      entityId: rule.id,
      summary: `Regra "${rule.name}" gerou o alerta ${event.code}.`,
    });
    created.push(event);
  }
  return created;
}

/** Hash simples e determinístico para a série sintética. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/**
 * Histórico do ponto: série horária sintética (24 h) para pontos numéricos,
 * seguida das leituras registradas na demonstração. Valores fictícios.
 */
export function pointHistory(db: Readonly<DemoDatabase>, point: DataPoint, now: Date): PointReading[] {
  const recorded = db.pointReadings.filter((r) => r.pointId === point.id).sort((a, b) => a.at.localeCompare(b.at));
  const firstRecorded = recorded[0]?.at;
  const synthetic: PointReading[] = [];
  if (typeof point.value === 'number' || (recorded[0] && typeof recorded[0].value === 'number')) {
    const base = typeof point.value === 'number' && point.status === 'normal' ? point.value : Number(recorded[0]?.value ?? point.value ?? 0);
    const amplitude = Math.max(Math.abs(base) * 0.04, 0.2);
    const seed = hash(point.id);
    for (let h = 24; h >= 1; h--) {
      const at = new Date(now.getTime() - h * 3_600_000).toISOString();
      if (firstRecorded && at >= firstRecorded) break;
      const noise = Math.sin((seed % 97) + h * 0.7) * amplitude + (((seed >> (h % 16)) % 7) - 3) * amplitude * 0.08;
      synthetic.push({ pointId: point.id, at, value: Math.round((base + noise) * 10) / 10, status: 'normal' });
    }
  }
  const current: PointReading = { pointId: point.id, at: point.updatedAt, value: point.value, status: point.status };
  const all = [...synthetic, ...recorded];
  if (!all.some((r) => r.at === current.at)) all.push(current);
  return all.sort((a, b) => a.at.localeCompare(b.at));
}
