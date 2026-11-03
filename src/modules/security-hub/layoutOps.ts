import type { DashboardArea, WidgetConfig, WidgetInstance, WidgetSize, WidgetTypeId } from '@/domain';
import { WIDGET_CATALOG } from './catalog';

let counter = 0;
export function newWidgetId(): string {
  counter += 1;
  return `w-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function createWidget(type: WidgetTypeId, area?: DashboardArea): WidgetInstance {
  const def = WIDGET_CATALOG[type];
  return { id: newWidgetId(), type, area: area ?? def.defaultArea, size: def.defaultSize, config: structuredClone(def.defaultConfig) };
}

/**
 * Move o widget para a área indicada, na posição `index` entre os widgets
 * daquela área (sem contar o próprio). Índice além do fim = última posição.
 */
export function moveWidget(list: WidgetInstance[], id: string, area: DashboardArea, index: number): WidgetInstance[] {
  const moving = list.find((w) => w.id === id);
  if (!moving) return list;
  const rest = list.filter((w) => w.id !== id);
  const areaItems = rest.filter((w) => w.area === area);
  const updated = { ...moving, area };
  const anchor = areaItems[Math.max(0, index)];
  if (anchor && index < areaItems.length) {
    const at = rest.indexOf(anchor);
    return [...rest.slice(0, at), updated, ...rest.slice(at)];
  }
  const last = areaItems[areaItems.length - 1];
  if (last) {
    const at = rest.indexOf(last) + 1;
    return [...rest.slice(0, at), updated, ...rest.slice(at)];
  }
  return [...rest, updated];
}

/** Desloca o widget uma posição dentro da sua área (-1 antes, +1 depois). */
export function shiftWidget(list: WidgetInstance[], id: string, delta: -1 | 1): WidgetInstance[] {
  const w = list.find((x) => x.id === id);
  if (!w) return list;
  const areaItems = list.filter((x) => x.area === w.area);
  const pos = areaItems.indexOf(w);
  const target = pos + delta;
  if (target < 0 || target >= areaItems.length) return list;
  return moveWidget(list, id, w.area, target);
}

export function updateWidget(
  list: WidgetInstance[],
  id: string,
  patch: { area?: DashboardArea; size?: WidgetSize; config?: WidgetConfig },
): WidgetInstance[] {
  return list.map((w) => (w.id === id ? { ...w, ...patch, config: patch.config ?? w.config } : w));
}

export function removeWidget(list: WidgetInstance[], id: string): WidgetInstance[] {
  return list.filter((w) => w.id !== id);
}

export function sameLayout(a: WidgetInstance[], b: WidgetInstance[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
