import type { ComponentType } from 'react';
import type { WidgetTypeId } from '@/domain';
import type { WidgetProps } from './WidgetCard';
import { CriticalAssetsWidget, InfraHealthWidget, LocationStatusWidget, MapWidget } from './OperationWidgets';
import { IndicatorsWidget, PendingActionsWidget, ResponseTimeWidget } from './ManagementWidgets';
import { MaintenanceInProgressWidget, RoutinesPendingWidget } from './IntegrationWidgets';
import { OccurrencesByStatusWidget, OpenOccurrencesWidget } from './OccurrenceWidgets';
import { AccessLiveWidget, AlarmsWidget, CamerasWidget, EventsWidget, HistoryWidget, TelemetryAlertsWidget } from './SecurityWidgets';

/** Componente de cada um dos 17 widgets do catálogo. */
export const WIDGET_COMPONENTS: Record<WidgetTypeId, ComponentType<WidgetProps>> = {
  'acessos-tempo-real': AccessLiveWidget,
  'eventos-alertas': EventsWidget,
  'cameras-destaque': CamerasWidget,
  'alarmes-ativos': AlarmsWidget,
  'ocorrencias-abertas': OpenOccurrencesWidget,
  'mapa-operacional': MapWidget,
  'ativos-criticos': CriticalAssetsWidget,
  'saude-infraestrutura': InfraHealthWidget,
  'alertas-telemetria': TelemetryAlertsWidget,
  'manutencoes-andamento': MaintenanceInProgressWidget,
  'inspecoes-rotinas-pendentes': RoutinesPendingWidget,
  'indicadores-seguranca': IndicatorsWidget,
  'ocorrencias-por-status': OccurrencesByStatusWidget,
  'acoes-pendentes': PendingActionsWidget,
  'tempo-medio-resposta': ResponseTimeWidget,
  'historico-eventos': HistoryWidget,
  'situacao-por-localizacao': LocationStatusWidget,
};
