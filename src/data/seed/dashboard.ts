import type { DashboardLayout, ISODateString } from '@/domain';

/**
 * Layout padrão do cliente de demonstração. A distribuição dos widgets nas
 * quatro áreas é provisória (docs/03 não define o mapeamento) — ver
 * docs/decisoes-evolucao.md.
 */
export function createDefaultDashboard(at: ISODateString): DashboardLayout {
  return {
    updatedAt: at,
    updatedByUserId: 'u-admin',
    widgets: [
      { id: 'w-indicadores', type: 'indicadores-seguranca', area: 'resumo', size: 8, config: { period: '24h', refresh: 'tempo-real' } },
      { id: 'w-tempo', type: 'tempo-medio-resposta', area: 'resumo', size: 4, config: { period: '7d', refresh: '1min' } },
      { id: 'w-eventos', type: 'eventos-alertas', area: 'destaque', size: 8, config: { period: '24h', statusFilter: 'ativos', limit: 6, refresh: 'tempo-real' } },
      { id: 'w-alarmes', type: 'alarmes-ativos', area: 'destaque', size: 4, config: { limit: 4, refresh: 'tempo-real' } },
      { id: 'w-acessos', type: 'acessos-tempo-real', area: 'destaque', size: 6, config: { period: '1h', limit: 6, refresh: 'tempo-real' } },
      { id: 'w-cameras', type: 'cameras-destaque', area: 'destaque', size: 6, config: { limit: 4, refresh: '30s' } },
      { id: 'w-mapa', type: 'mapa-operacional', area: 'mapa', size: 8, config: { refresh: 'tempo-real' } },
      { id: 'w-situacao', type: 'situacao-por-localizacao', area: 'mapa', size: 4, config: { refresh: 'tempo-real' } },
      { id: 'w-acoes', type: 'acoes-pendentes', area: 'acoes', size: 6, config: { limit: 6, refresh: 'tempo-real' } },
      { id: 'w-ocorrencias', type: 'ocorrencias-abertas', area: 'acoes', size: 6, config: { limit: 5 } },
      { id: 'w-manutencoes', type: 'manutencoes-andamento', area: 'acoes', size: 4, config: { limit: 4 } },
      { id: 'w-rotinas', type: 'inspecoes-rotinas-pendentes', area: 'acoes', size: 4, config: { limit: 3 } },
      { id: 'w-ativos', type: 'ativos-criticos', area: 'acoes', size: 4, config: { minCriticality: 'alta', limit: 6, refresh: 'tempo-real' } },
    ],
  };
}
