import type { AlertStatus, Criticality, DataPointStatus, DeviceLocationStatus, EventCategory, OperationalCondition, Period, Severity, SourceSystem } from '@/domain';
import type { AssetSort } from '@/services';

/** Abas da Central (docs/02, "Home da Central"). */
export type CentralTab = 'visao-geral' | 'ativos' | 'dispositivos' | 'telemetria' | 'grupos' | 'alertas';

export const CENTRAL_TABS: { id: CentralTab; label: string }[] = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'ativos', label: 'Ativos' },
  { id: 'dispositivos', label: 'Dispositivos' },
  { id: 'telemetria', label: 'Telemetria' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'alertas', label: 'Alertas e ocorrências' },
];

/**
 * Estado da Central na URL: local selecionado na árvore, recorte
 * ("somente este local"), aba e filtros da aba. Preservado ao voltar.
 */
export interface CentralParams {
  local?: string;
  /** true = somente este local (sem descendentes). */
  somente?: boolean;
  aba?: CentralTab;
  busca?: string;
  pagina?: number;
  // Ativos
  classificacao?: string;
  criticidade?: Criticality;
  condicao?: OperationalCondition;
  dispositivo?: 'com' | 'sem';
  grupo?: string;
  ordem?: AssetSort;
  visao?: 'tabela' | 'cartoes';
  // Dispositivos
  estado?: DeviceLocationStatus;
  // Telemetria
  ponto?: DataPointStatus;
  // Grupos
  categoria?: 'corporativo' | 'operacional' | 'especializado';
  // Alertas
  origem?: SourceSystem;
  tipo?: EventCategory;
  severidade?: Severity[];
  status?: AlertStatus;
  periodo?: Period;
}

/** Valor de `local` que indica escolha explícita de todo o escopo do usuário. */
export const ALL_SCOPE = 'todos';

const TAB_IDS =new Set<string>(CENTRAL_TABS.map((t) => t.id));

function toQuery(entries: Record<string, string | number | boolean | string[] | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) {
    if (v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)) continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export const centralPaths = {
  home: (p: CentralParams = {}) =>
    `/central${toQuery({
      ...p,
      aba: p.aba === 'visao-geral' ? undefined : p.aba,
      pagina: p.pagina && p.pagina > 1 ? p.pagina : undefined,
      severidade: p.severidade,
    } as Record<string, string | number | boolean | string[] | undefined>)}`,
  location: (id: string) => `/central${toQuery({ local: id })}`,
  asset: (id: string) => `/central/ativos/${id}`,
  assetTab: (id: string, aba: string) => `/central/ativos/${id}?aba=${aba}`,
  newAsset: (locationId?: string) => `/central/ativos/novo${toQuery({ local: locationId })}`,
  editAsset: (id: string) => `/central/ativos/${id}/editar`,
  importAssets: '/central/ativos/importar',
  review: '/central/descobertas',
  group: (id: string) => `/central/grupos/${id}`,
  newGroup: '/central/grupos/novo',
  editGroup: (id: string) => `/central/grupos/${id}/editar`,
};

const pick = <T extends string>(v: string | null, allowed: readonly T[]): T | undefined =>
  v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export function parseCentralParams(sp: URLSearchParams): CentralParams {
  const aba = sp.get('aba');
  return {
    local: sp.get('local') ?? undefined,
    somente: sp.get('somente') === '1',
    aba: aba && TAB_IDS.has(aba) ? (aba as CentralTab) : 'visao-geral',
    busca: sp.get('busca') ?? undefined,
    pagina: Number(sp.get('pagina')) || 1,
    classificacao: sp.get('classificacao') ?? undefined,
    criticidade: pick(sp.get('criticidade'), ['baixa', 'media', 'alta'] as const),
    condicao: pick(sp.get('condicao'), ['normal', 'atencao', 'critico', 'indisponivel'] as const),
    dispositivo: pick(sp.get('dispositivo'), ['com', 'sem'] as const),
    grupo: sp.get('grupo') ?? undefined,
    ordem: pick(sp.get('ordem'), ['tag', 'condicao', 'criticidade'] as const),
    visao: pick(sp.get('visao'), ['tabela', 'cartoes'] as const),
    estado: pick(sp.get('estado'), ['confirmada', 'sugerida', 'nao_identificada'] as const),
    ponto: pick(sp.get('ponto'), ['normal', 'alerta', 'critico', 'sem_leitura'] as const),
    categoria: pick(sp.get('categoria'), ['corporativo', 'operacional', 'especializado'] as const),
    origem: (sp.get('origem') as SourceSystem | null) ?? undefined,
    tipo: (sp.get('tipo') as EventCategory | null) ?? undefined,
    severidade: sp.get('severidade') ? (sp.get('severidade')!.split(',').filter(Boolean) as Severity[]) : undefined,
    status: pick(sp.get('status'), ['ativo', 'reconhecido'] as const),
    periodo: (sp.get('periodo') as Period | null) ?? undefined,
  };
}

/** Mantém apenas o recorte de local (ao trocar de aba ou de local, os filtros da aba são limpos). */
export function baseParams(p: CentralParams): CentralParams {
  return { local: p.local, somente: p.somente };
}
