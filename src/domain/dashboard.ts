import type { Criticality } from './asset';
import type { Id, ISODateString, Severity } from './common';

/** Os 17 widgets definidos em docs/03-security-hub.md. */
export type WidgetTypeId =
  // Segurança
  | 'acessos-tempo-real'
  | 'eventos-alertas'
  | 'cameras-destaque'
  | 'alarmes-ativos'
  | 'ocorrencias-abertas'
  // Operação integrada
  | 'mapa-operacional'
  | 'ativos-criticos'
  | 'saude-infraestrutura'
  | 'alertas-telemetria'
  | 'manutencoes-andamento'
  | 'inspecoes-rotinas-pendentes'
  // Gestão
  | 'indicadores-seguranca'
  | 'ocorrencias-por-status'
  | 'acoes-pendentes'
  | 'tempo-medio-resposta'
  | 'historico-eventos'
  | 'situacao-por-localizacao';

export type WidgetCategory = 'seguranca' | 'operacao-integrada' | 'gestao';

export const WIDGET_CATEGORY_LABEL: Record<WidgetCategory, string> = {
  seguranca: 'Segurança',
  'operacao-integrada': 'Operação integrada',
  gestao: 'Gestão',
};

/** As quatro áreas do dashboard (docs/03). */
export type DashboardArea = 'resumo' | 'destaque' | 'mapa' | 'acoes';

export const DASHBOARD_AREAS: DashboardArea[] = ['resumo', 'destaque', 'mapa', 'acoes'];

export const DASHBOARD_AREA_LABEL: Record<DashboardArea, string> = {
  resumo: 'Resumo de segurança',
  destaque: 'Eventos em destaque',
  mapa: 'Mapa operacional',
  acoes: 'Ações pendentes',
};

/** Largura do widget em colunas da grid de 12. */
export type WidgetSize = 3 | 4 | 6 | 8 | 12;

export const WIDGET_SIZE_LABEL: Record<WidgetSize, string> = {
  3: 'Pequeno (1/4)',
  4: 'Médio (1/3)',
  6: 'Grande (1/2)',
  8: 'Largo (2/3)',
  12: 'Total',
};

export type Period = '1h' | '24h' | '7d' | '30d';

export const PERIOD_LABEL: Record<Period, string> = {
  '1h': 'Última hora',
  '24h': 'Últimas 24 horas',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
};

export const PERIOD_SHORT_LABEL: Record<Period, string> = { '1h': '1 h', '24h': '24 h', '7d': '7 dias', '30d': '30 dias' };

export const PERIOD_MINUTES: Record<Period, number> = { '1h': 60, '24h': 1440, '7d': 10080, '30d': 43200 };

export type RefreshMode = 'tempo-real' | '30s' | '1min' | '5min' | 'manual';

export const REFRESH_LABEL: Record<RefreshMode, string> = {
  'tempo-real': 'Tempo real',
  '30s': 'A cada 30 segundos',
  '1min': 'A cada 1 minuto',
  '5min': 'A cada 5 minutos',
  manual: 'Manual',
};

/** Configuração individual do widget (docs/03): período, local, criticidade, quantidade, atualização. */
export interface WidgetConfig {
  period?: Period;
  /** null/ausente = herda a localização contextual do cabeçalho. */
  locationId?: Id | null;
  minSeverity?: Severity;
  minCriticality?: Criticality;
  limit?: number;
  refresh?: RefreshMode;
  statusFilter?: 'ativos' | 'todos';
}

export interface WidgetInstance {
  id: Id;
  type: WidgetTypeId;
  area: DashboardArea;
  size: WidgetSize;
  config: WidgetConfig;
}

export interface DashboardLayout {
  widgets: WidgetInstance[];
  updatedAt: ISODateString;
  updatedByUserId: Id;
}
