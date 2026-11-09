import { Badge, EmptyState, StatsCard } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { WorkOrderStatusBadge, formatDate, maintenancePaths } from '@/modules/manutencao/shared';
import { RoutineStatusBadge, routinePaths } from '@/modules/rotinas/shared';
import { WidgetCard, WidgetQueryBody, useWidgetLocation, type WidgetProps } from './WidgetCard';
import styles from '../dashboard.module.css';

const tail = (path: { name: string }[], n = 2) => path.slice(-n).map((l) => l.name).join(' › ');

/**
 * Manutenções em andamento sobre ativos relevantes para a segurança — dados da
 * Gestão de Manutenção, consultados pelo Hub. Planejar e executar acontecem no módulo.
 */
export function MaintenanceInProgressWidget({ instance }: WidgetProps) {
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(instance.config);
  const limit = instance.config.limit ?? 5;
  const query = useServiceQuery(() => services.maintenance.hubSummary(access, { locationId: location.locationId, limit }), [access, location.locationId, limit], {
    refresh: instance.config.refresh,
  });
  return (
    <WidgetCard instance={instance} location={location} query={query} flush drillTo={`${maintenancePaths.orders}?status=ativas`}>
      <WidgetQueryBody query={query}>
        {(s) =>
          s.orders.length === 0 ? (
            <EmptyState compact icon="check-circle" title="Nenhuma OS em andamento em ativos de segurança." />
          ) : (
            <>
              <ul className={styles.rows}>
                {s.orders.map(({ order: o, asset, locationPath, technicianName, overdue, openImpediments }) => (
                  <li key={o.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <ContextLink to={paths.workOrder(o.id)} className={styles.rowTitle}>
                        {o.code} — {o.title}
                      </ContextLink>
                      <div className={styles.rowMeta}>
                        {asset ? `${asset.tag} · ` : ''}
                        {tail(locationPath)}
                        {technicianName ? ` · ${technicianName}` : ''}
                        {o.plannedDate ? ` · previsão ${formatDate(o.plannedDate)}` : ''}
                      </div>
                    </div>
                    {overdue && <Badge tone="red">Atrasada</Badge>}
                    {openImpediments > 0 && <Badge tone="orange">Impedimento</Badge>}
                    <WorkOrderStatusBadge value={o.status} />
                  </li>
                ))}
              </ul>
              {s.total > s.orders.length && (
                <p className="helper" style={{ padding: '8px 16px' }}>
                  Mais {s.total - s.orders.length} OS em andamento.
                </p>
              )}
            </>
          )
        }
      </WidgetQueryBody>
    </WidgetCard>
  );
}

/**
 * Inspeções e rotinas pendentes ou não realizadas, e reinspeções a programar —
 * dados da Gestão de Rotinas, consultados pelo Hub. A execução acontece em Rotinas.
 */
export function RoutinesPendingWidget({ instance }: WidgetProps) {
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(instance.config);
  const limit = instance.config.limit ?? 5;
  const query = useServiceQuery(() => services.routines.hubSummary(access, { locationId: location.locationId, limit }), [access, location.locationId, limit], {
    refresh: instance.config.refresh,
  });
  return (
    <WidgetCard instance={instance} location={location} query={query} flush drillTo={routinePaths.executions}>
      <WidgetQueryBody query={query}>
        {(s) => (
          <>
            <div className={styles.statsGrid} style={{ padding: '12px 16px 4px' }}>
              <StatsCard icon="clock-o" tone={s.counts.pendentes ? 'yellow' : 'green'} title="Pendentes" value={s.counts.pendentes} />
              <StatsCard icon="ban" tone={s.counts.naoRealizadas24h ? 'red' : 'green'} title="Não realizadas (24 h)" value={s.counts.naoRealizadas24h} />
              <StatsCard icon="refresh" tone={s.counts.reinspecoesAProgramar ? 'orange' : 'green'} title="Reinspeções a programar" value={s.counts.reinspecoesAProgramar} />
            </div>
            {s.items.length === 0 ? (
              <EmptyState compact icon="check-circle" title="Nenhuma rotina pendente no momento." />
            ) : (
              <ul className={styles.rows}>
                {s.items.map(({ execution: e, routine, plan, pointsDone, pointsTotal }) => (
                  <li key={e.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <ContextLink to={paths.routineExecution(e.id)} className={styles.rowTitle}>
                        {e.code} — {routine.name}
                      </ContextLink>
                      <div className={styles.rowMeta}>
                        {plan.name} · pontos {pointsDone}/{pointsTotal} · janela até {formatDateTime(e.windowEnd ?? e.windowStart)}
                      </div>
                    </div>
                    <RoutineStatusBadge value={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </WidgetQueryBody>
    </WidgetCard>
  );
}
