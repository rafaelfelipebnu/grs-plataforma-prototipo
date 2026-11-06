import { EmptyState, StatsCard } from '@/components/ui';
import { formatRelative } from '@/components/domain';
import { OCCURRENCE_STATUS_LABEL } from '@/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { OccurrencePriorityBadge, OccurrenceStatusBadge, occurrencePaths } from '@/modules/ocorrencias/shared';
import { WidgetCard, WidgetQueryBody, useWidgetLocation, type WidgetProps } from './WidgetCard';
import styles from '../dashboard.module.css';

/**
 * Ocorrências abertas (não concluídas), por prioridade — dados da Gestão de
 * Ocorrências, consultados pelo Hub. O tratamento acontece no módulo.
 */
export function OpenOccurrencesWidget({ instance }: WidgetProps) {
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(instance.config);
  const limit = instance.config.limit ?? 5;
  const query = useServiceQuery(() => services.occurrences.hubSummary(access, { locationId: location.locationId, limit }), [access, location.locationId, limit]);
  return (
    <WidgetCard instance={instance} location={location} query={query} flush drillTo={`${occurrencePaths.search}?status=abertas`}>
      <WidgetQueryBody query={query}>
        {(s) =>
          s.open.length === 0 ? (
            <EmptyState compact icon="check-circle" title="Nenhuma ocorrência aberta." />
          ) : (
            <ul className={styles.rows}>
              {s.open.map(({ occurrence: o, type, locationPath }) => (
                <li key={o.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <ContextLink to={occurrencePaths.detail(o.id)} className={styles.rowTitle}>
                      {o.code} — {type.name}
                    </ContextLink>
                    <div className={styles.rowMeta}>
                      {locationPath.slice(-2).map((l) => l.name).join(' › ')} · {formatRelative(o.createdAt)}
                    </div>
                  </div>
                  <OccurrencePriorityBadge value={o.priority} />
                  <OccurrenceStatusBadge value={o.status} />
                </li>
              ))}
            </ul>
          )
        }
      </WidgetQueryBody>
    </WidgetCard>
  );
}

/** Distribuição por status, como no Painel de ocorrências do produto existente. */
export function OccurrencesByStatusWidget({ instance }: WidgetProps) {
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(instance.config);
  const query = useServiceQuery(() => services.occurrences.hubSummary(access, { locationId: location.locationId, limit: 0 }), [access, location.locationId], {
    refresh: instance.config.refresh,
  });
  return (
    <WidgetCard instance={instance} location={location} query={query} drillTo={occurrencePaths.panel}>
      <WidgetQueryBody query={query}>
        {(s) => (
          <div className={styles.statsGrid}>
            <StatsCard icon="exclamation-circle" tone={s.counts['sem-tratamento'] ? 'yellow' : 'green'} title={OCCURRENCE_STATUS_LABEL['sem-tratamento']} value={s.counts['sem-tratamento']} />
            <StatsCard icon="cogs" tone="blue" title={OCCURRENCE_STATUS_LABEL['em-andamento']} value={s.counts['em-andamento']} />
            <StatsCard icon="pause-circle-o" tone={s.counts['em-pausa'] ? 'orange' : 'default'} title={OCCURRENCE_STATUS_LABEL['em-pausa']} value={s.counts['em-pausa']} />
            <StatsCard icon="check" tone="green" title="Concluídas (24h)" value={s.counts['concluidas-24h']} />
          </div>
        )}
      </WidgetQueryBody>
    </WidgetCard>
  );
}
