import {
  PERIOD_LABEL,
  type AlertStatus,
  type EventCategory,
  type PassageDirection,
  type PassageResult,
  type Period,
  type Severity,
} from '@/domain';
import type { EventSort } from '@/services';

/** Filtros da lista de eventos — estado na URL (preservado ao voltar). */
export interface EventListParams {
  status?: AlertStatus;
  severidade?: Severity[];
  categoria?: EventCategory[];
  local?: string;
  periodo?: Period;
  busca?: string;
  ordem?: EventSort;
  pagina?: number;
}

export interface AccessListParams {
  resultado?: PassageResult;
  direcao?: PassageDirection;
  local?: string;
  periodo?: Period;
  busca?: string;
  pagina?: number;
}

const SEVERITY_ORDER: Severity[] = ['critica', 'alta', 'media', 'baixa', 'informativa'];

/** Severidades iguais ou acima da mínima. */
export function severitiesFrom(min: Severity | undefined): Severity[] | undefined {
  if (!min) return undefined;
  return SEVERITY_ORDER.slice(0, SEVERITY_ORDER.indexOf(min) + 1);
}

function isPeriod(v: string | null): v is Period {
  return v !== null && v in PERIOD_LABEL;
}

function toQuery(entries: Record<string, string | number | string[] | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
}

const list = <T extends string>(v: string | null): T[] | undefined => (v ? (v.split(',').filter(Boolean) as T[]) : undefined);

export const hubPaths = {
  dashboard: '/security-hub',
  events: (p: EventListParams = {}) =>
    `/security-hub/eventos${toQuery({ ...p, pagina: p.pagina && p.pagina > 1 ? p.pagina : undefined })}`,
  access: (p: AccessListParams = {}) =>
    `/security-hub/acessos${toQuery({ ...p, pagina: p.pagina && p.pagina > 1 ? p.pagina : undefined })}`,
};

export function parseEventParams(sp: URLSearchParams): EventListParams {
  const status = sp.get('status');
  const ordem = sp.get('ordem');
  const periodo = sp.get('periodo');
  return {
    status: status === 'ativo' || status === 'reconhecido' ? status : undefined,
    severidade: list<Severity>(sp.get('severidade')),
    categoria: list<EventCategory>(sp.get('categoria')),
    local: sp.get('local') ?? undefined,
    periodo: isPeriod(periodo) ? periodo : undefined,
    busca: sp.get('busca') ?? undefined,
    ordem: ordem === 'severidade' ? 'severidade' : undefined,
    pagina: Number(sp.get('pagina')) || 1,
  };
}

export function parseAccessParams(sp: URLSearchParams): AccessListParams {
  const resultado = sp.get('resultado');
  const direcao = sp.get('direcao');
  const periodo = sp.get('periodo');
  return {
    resultado: resultado === 'liberado' || resultado === 'negado' ? resultado : undefined,
    direcao: direcao === 'entrada' || direcao === 'saida' ? direcao : undefined,
    local: sp.get('local') ?? undefined,
    periodo: isPeriod(periodo) ? periodo : undefined,
    busca: sp.get('busca') ?? undefined,
    pagina: Number(sp.get('pagina')) || 1,
  };
}
