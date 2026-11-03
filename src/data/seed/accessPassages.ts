import type { AccessPassage, ISODateString } from '@/domain';

/** Pontos de controle de acesso usados na simulação (local, controladora e pessoas habituais). */
export const ACCESS_POINTS: Array<{ locationId: string; deviceId?: string; personIds: string[] }> = [
  { locationId: 'loc-joi-portaria', deviceId: 'd-cta03', personIds: ['p-01', 'p-02', 'p-03', 'p-04', 'p-05', 'p-06', 'p-09', 'p-10', 'p-11'] },
  { locationId: 'loc-joi-recepcao', personIds: ['p-02', 'p-03', 'p-12'] },
  { locationId: 'loc-joi-servidores', personIds: ['p-09', 'p-02'] },
  { locationId: 'loc-cwb-portaria', personIds: ['p-07', 'p-08', 'p-13'] },
  { locationId: 'loc-cwb-recepcao', personIds: ['p-07', 'p-13'] },
];

export const DENIAL_REASONS = ['Credencial fora do horário permitido', 'Credencial bloqueada', 'Área não autorizada para a credencial', 'Dupla passagem (anti-passback)'];

/**
 * Histórico determinístico de passagens das últimas 3 horas, gerado a partir
 * de uma sequência fixa para que a demonstração seja reproduzível.
 */
export function createDemoAccessPassages(at: (minutesAgo: number) => ISODateString): AccessPassage[] {
  const passages: AccessPassage[] = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 46; i++) {
    const point = ACCESS_POINTS[Math.floor(next() * ACCESS_POINTS.length)]!;
    const personId = point.personIds[Math.floor(next() * point.personIds.length)]!;
    const denied = next() < 0.1;
    passages.push({
      id: `ap-${String(i + 1).padStart(3, '0')}`,
      personId,
      credential: `CR-${personId.replace('p-', '')}${Math.floor(next() * 90 + 10)}`,
      locationId: point.locationId,
      deviceId: point.deviceId,
      direction: next() < 0.55 ? 'entrada' : 'saida',
      result: denied ? 'negado' : 'liberado',
      reason: denied ? DENIAL_REASONS[Math.floor(next() * DENIAL_REASONS.length)] : undefined,
      occurredAt: at(Math.round(2 + i * 3.9 + next() * 2)),
      source: 'controle-acesso',
    });
  }
  // As tentativas negadas na Portaria Principal que originaram o alerta EVT-2026-0409.
  for (let k = 0; k < 4; k++) {
    passages.push({
      id: `ap-neg-${k + 1}`,
      credential: 'CR-DESCONHECIDA-77',
      locationId: 'loc-joi-portaria',
      deviceId: 'd-cta03',
      direction: 'entrada',
      result: 'negado',
      reason: 'Credencial bloqueada',
      occurredAt: at(25 + k * 2),
      source: 'controle-acesso',
    });
  }
  return passages.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
