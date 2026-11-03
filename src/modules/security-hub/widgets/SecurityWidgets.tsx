import { Badge, Button, EmptyState, Icon } from '@/components/ui';
import { AlertStatusBadge, SEVERITY_COLOR, formatRelative } from '@/components/domain';
import { PASSAGE_DIRECTION_LABEL, type EventCategory } from '@/domain';
import type { EventListItem, Paged } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery, type QueryState } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { hubPaths, severitiesFrom } from '../hubPaths';
import { WidgetCard, WidgetQueryBody, useWidgetLocation, type WidgetProps } from './WidgetCard';
import { useAcknowledge } from './useAcknowledge';
import styles from '../dashboard.module.css';

const clock = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const tail = (path: { name: string }[], n = 2) => path.slice(-n).map((l) => l.name).join(' › ');

/** Lista de eventos reutilizada por "Eventos e alertas", "Alarmes ativos" e "Alertas de telemetria". */
function EventRows({ query, emptyTitle }: { query: QueryState<Paged<EventListItem>>; emptyTitle: string }) {
  const { acknowledge, pending } = useAcknowledge();
  return (
    <WidgetQueryBody query={query}>
      {(page) =>
        page.items.length === 0 ? (
          <EmptyState compact icon="check-circle" title={emptyTitle} />
        ) : (
          <ul className={styles.rows}>
            {page.items.map(({ event, locationPath, canAcknowledge }) => (
              <li key={event.id} className={styles.row}>
                <span className={styles.severityDot} style={{ background: SEVERITY_COLOR[event.severity] }} title={`Severidade ${event.severity}`} />
                <div className={styles.rowMain}>
                  <ContextLink to={paths.event(event.id)} className={styles.rowTitle}>
                    {event.title}
                  </ContextLink>
                  <div className={styles.rowMeta}>
                    {tail(locationPath)} · {formatRelative(event.occurredAt)}
                    {event.securityContext ? ` · ${event.securityContext}` : ''}
                  </div>
                </div>
                <div className={styles.rowEnd}>
                  {canAcknowledge ? (
                    <Button size="small" variant="secondary" icon="check" loading={pending === event.id} onClick={() => acknowledge(event.id, event.title)}>
                      Reconhecer
                    </Button>
                  ) : (
                    <AlertStatusBadge value={event.status} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </WidgetQueryBody>
  );
}

export function EventsWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const status = config.statusFilter === 'todos' ? undefined : 'ativo';
  const severities = severitiesFrom(config.minSeverity);
  const query = useServiceQuery(
    () =>
      services.hub.listEvents(access, {
        status,
        severities,
        locationId: location.locationId,
        period: config.period,
        sort: 'severidade',
        pageSize: config.limit ?? 6,
      }),
    [access, status, severities?.join(), location.locationId, config.period, config.limit],
    { refresh: config.refresh },
  );
  return (
    <WidgetCard
      instance={instance}
      location={location}
      query={query}
      flush
      drillTo={hubPaths.events({ status, severidade: severities, local: location.locationId, periodo: config.period, ordem: 'severidade' })}
    >
      <EventRows query={query} emptyTitle="Nenhum alerta de segurança ativo neste recorte." />
    </WidgetCard>
  );
}

export function AlarmsWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const severities = severitiesFrom(config.minSeverity);
  const categories: EventCategory[] = ['alarme'];
  const query = useServiceQuery(
    () => services.hub.listEvents(access, { status: 'ativo', categories, severities, locationId: location.locationId, sort: 'severidade', pageSize: config.limit ?? 4 }),
    [access, severities?.join(), location.locationId, config.limit],
    { refresh: config.refresh },
  );
  return (
    <WidgetCard
      instance={instance}
      location={location}
      query={query}
      flush
      drillTo={hubPaths.events({ status: 'ativo', categoria: categories, severidade: severities, local: location.locationId })}
    >
      {query.data && (
        <div className={styles.counters}>
          <span className={styles.bigNumber}>{query.data.total}</span>
          <span className="muted" style={{ alignSelf: 'flex-end', paddingBottom: 4 }}>
            {query.data.total === 1 ? 'alarme ativo' : 'alarmes ativos'}
          </span>
        </div>
      )}
      <EventRows query={query} emptyTitle="Nenhum alarme ativo." />
    </WidgetCard>
  );
}

export function TelemetryAlertsWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const severities = severitiesFrom(config.minSeverity);
  const categories: EventCategory[] = ['telemetria', 'infraestrutura'];
  const query = useServiceQuery(
    () =>
      services.hub.listEvents(access, { categories, severities, locationId: location.locationId, period: config.period, status: 'ativo', sort: 'severidade', pageSize: config.limit ?? 5 }),
    [access, severities?.join(), location.locationId, config.period, config.limit],
    { refresh: config.refresh },
  );
  return (
    <WidgetCard
      instance={instance}
      location={location}
      query={query}
      flush
      drillTo={hubPaths.events({ status: 'ativo', categoria: categories, severidade: severities, local: location.locationId, periodo: config.period })}
    >
      <EventRows query={query} emptyTitle="Nenhum alerta de telemetria com impacto em segurança." />
    </WidgetCard>
  );
}

export function HistoryWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const severities = severitiesFrom(config.minSeverity);
  const query = useServiceQuery(
    () => services.hub.listEvents(access, { severities, locationId: location.locationId, period: config.period, pageSize: config.limit ?? 8 }),
    [access, severities?.join(), location.locationId, config.period, config.limit],
    { refresh: config.refresh },
  );
  return (
    <WidgetCard
      instance={instance}
      location={location}
      query={query}
      flush
      drillTo={hubPaths.events({ severidade: severities, local: location.locationId, periodo: config.period })}
    >
      <WidgetQueryBody query={query}>
        {(page) =>
          page.items.length === 0 ? (
            <EmptyState compact icon="history" title="Nenhum evento relevante no período." />
          ) : (
            <ol className={styles.timeline} style={{ paddingTop: 8, paddingBottom: 8 }}>
              {page.items.map(({ event, locationPath }) => (
                <li key={event.id} className={styles.timelineItem} style={{ ['--dot' as string]: SEVERITY_COLOR[event.severity] }}>
                  <div className={styles.rowMain}>
                    <ContextLink to={paths.event(event.id)} className={styles.rowTitle}>
                      {event.title}
                    </ContextLink>
                    <div className={styles.rowMeta}>
                      {new Date(event.occurredAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {tail(locationPath)}
                    </div>
                  </div>
                  <AlertStatusBadge value={event.status} />
                </li>
              ))}
            </ol>
          )
        }
      </WidgetQueryBody>
    </WidgetCard>
  );
}

export function AccessLiveWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const query = useServiceQuery(
    () => services.hub.listAccess(access, { locationId: location.locationId, period: config.period, pageSize: config.limit ?? 6 }),
    [access, location.locationId, config.period, config.limit],
    { refresh: config.refresh },
  );
  return (
    <WidgetCard instance={instance} location={location} query={query} flush drillTo={hubPaths.access({ local: location.locationId, periodo: config.period })}>
      <WidgetQueryBody query={query}>
        {(page) => (
          <>
            <div className={styles.counters}>
              <ContextLink to={hubPaths.access({ resultado: 'liberado', local: location.locationId, periodo: config.period })}>
                <Badge tone="green" icon="check">
                  {page.granted} liberados
                </Badge>
              </ContextLink>
              <ContextLink to={hubPaths.access({ resultado: 'negado', local: location.locationId, periodo: config.period })}>
                <Badge tone="red" icon="ban">
                  {page.denied} negados
                </Badge>
              </ContextLink>
            </div>
            {page.items.length === 0 ? (
              <EmptyState compact icon="id-card-o" title="Nenhuma passagem no período." />
            ) : (
              <ul className={styles.rows}>
                {page.items.map(({ passage, personName, personId, locationPath }) => (
                  <li key={passage.id} className={styles.row}>
                    <span className={styles.time}>{clock(passage.occurredAt)}</span>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {personName && personId ? <ContextLink to={paths.person(personId)}>{personName}</ContextLink> : <span className="muted">{passage.credential}</span>}
                      </span>
                      <div className={styles.rowMeta}>
                        {PASSAGE_DIRECTION_LABEL[passage.direction]} · {tail(locationPath)}
                        {passage.reason ? ` · ${passage.reason}` : ''}
                      </div>
                    </div>
                    <Badge tone={passage.result === 'liberado' ? 'green' : 'red'}>{passage.result === 'liberado' ? 'Liberado' : 'Negado'}</Badge>
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

export function CamerasWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const query = useServiceQuery(() => services.hub.cameras(access, { locationId: location.locationId, limit: config.limit ?? 4 }), [access, location.locationId, config.limit], {
    refresh: config.refresh,
  });
  return (
    <WidgetCard instance={instance} location={location} query={query}>
      <WidgetQueryBody query={query}>
        {(cameras) =>
          cameras.length === 0 ? (
            <EmptyState compact icon="video-camera" title="Nenhuma câmera neste recorte." />
          ) : (
            <div className={styles.cameraGrid}>
              {cameras.map((c) => {
                const offline = c.streamStatus === 'offline';
                return (
                  <ContextLink key={c.asset.id} to={paths.asset(c.asset.id)} className={styles.camera}>
                    <span className={[styles.cameraFrame, offline && styles.cameraOffline].filter(Boolean).join(' ')}>
                      {c.activeEvents > 0 && (
                        <span className={styles.cameraBadge}>
                          <Badge tone="orange" icon="bell">
                            {c.activeEvents}
                          </Badge>
                        </span>
                      )}
                      <Icon name={offline ? 'chain-broken' : 'video-camera'} />
                      {offline ? 'Sem sinal' : 'Imagem ao vivo indisponível na demonstração'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{c.asset.tag}</span>
                    <span className="helper">{tail(c.locationPath)}</span>
                  </ContextLink>
                );
              })}
            </div>
          )
        }
      </WidgetQueryBody>
    </WidgetCard>
  );
}

