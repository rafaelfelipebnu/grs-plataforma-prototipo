import { Button, EmptyState, StatsCard } from '@/components/ui';
import { SEVERITY_COLOR, SEVERITY_LABEL, formatDateTime } from '@/components/domain';
import { isModuleAvailable } from '@/access';
import { PERIOD_SHORT_LABEL, type Severity } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths, resolveTargetPath } from '@/app/navigation/targets';
import { hubPaths } from '../hubPaths';
import { WidgetCard, WidgetQueryBody, useWidgetLocation, type WidgetProps } from './WidgetCard';
import { useAcknowledge } from './useAcknowledge';
import styles from '../dashboard.module.css';

const tail = (path: { name: string }[], n = 2) => path.slice(-n).map((l) => l.name).join(' › ');

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function IndicatorsWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const period = config.period ?? '24h';
  const query = useServiceQuery(() => services.hub.indicators(access, { locationId: location.locationId, period }), [access, location.locationId, period], {
    refresh: config.refresh,
  });
  const local = location.locationId;
  const link = (to: string) =>
    function LinkWrapper({ className, children }: { className: string; children: React.ReactNode }) {
      return (
        <ContextLink to={to} className={className}>
          {children}
        </ContextLink>
      );
    };
  return (
    <WidgetCard instance={instance} location={location} query={query} drillTo={hubPaths.events({ local, periodo: period })}>
      <WidgetQueryBody query={query}>
        {(i) => (
          <div className={styles.statsGrid}>
            <StatsCard icon="bell" tone={i.activeAlerts ? 'orange' : 'green'} title="Alertas ativos" value={i.activeAlerts} as={link(hubPaths.events({ status: 'ativo', local }))} />
            <StatsCard icon="exclamation-circle" tone={i.criticalActive ? 'red' : 'green'} title="Críticos ativos" value={i.criticalActive} as={link(hubPaths.events({ status: 'ativo', severidade: ['critica'], local }))} />
            <StatsCard icon="bullhorn" tone={i.activeAlarms ? 'orange' : 'green'} title="Alarmes ativos" value={i.activeAlarms} as={link(hubPaths.events({ status: 'ativo', categoria: ['alarme'], local }))} />
            <StatsCard icon="check" tone="blue" title={`Reconhecidos (${PERIOD_SHORT_LABEL[period]})`} value={i.acknowledgedInPeriod} as={link(hubPaths.events({ status: 'reconhecido', local, periodo: period }))} />
            <StatsCard icon="ban" tone={i.deniedAccessInPeriod ? 'red' : 'green'} title={`Acessos negados (${PERIOD_SHORT_LABEL[period]})`} value={i.deniedAccessInPeriod} as={link(hubPaths.access({ resultado: 'negado', local, periodo: period }))} />
            <StatsCard icon="video-camera" tone={i.camerasWithoutSignal ? 'red' : 'green'} title="Câmeras sem sinal" value={i.camerasWithoutSignal} as={link(hubPaths.events({ status: 'ativo', categoria: ['video'], local }))} />
          </div>
        )}
      </WidgetQueryBody>
    </WidgetCard>
  );
}

export function ResponseTimeWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const period = config.period ?? '7d';
  const query = useServiceQuery(() => services.hub.responseTime(access, { locationId: location.locationId, period }), [access, location.locationId, period], {
    refresh: config.refresh,
  });
  return (
    <WidgetCard instance={instance} location={location} query={query} drillTo={hubPaths.events({ status: 'reconhecido', local: location.locationId, periodo: period })}>
      <WidgetQueryBody query={query}>
        {(r) =>
          r.averageMinutes === null ? (
            <EmptyState compact icon="clock-o" title="Nenhum alerta reconhecido no período." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className={styles.bigNumber}>{formatMinutes(r.averageMinutes)}</div>
                <div className="helper">
                  Média entre o evento e o reconhecimento · {r.acknowledgedCount} {r.acknowledgedCount === 1 ? 'alerta' : 'alertas'}
                </div>
              </div>
              <ul className={styles.rows} aria-label="Tempo médio por severidade">
                {r.bySeverity.map((s) => {
                  const max = Math.max(...r.bySeverity.map((x) => x.averageMinutes), 1);
                  return (
                    <li key={s.severity} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 64px', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                      <span className="helper">{SEVERITY_LABEL[s.severity]}</span>
                      <span className={styles.bar}>
                        <span className={styles.barFill} style={{ display: 'block', width: `${(s.averageMinutes / max) * 100}%`, background: SEVERITY_COLOR[s.severity] }} />
                      </span>
                      <span className="helper" style={{ textAlign: 'right' }}>
                        {formatMinutes(s.averageMinutes)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        }
      </WidgetQueryBody>
    </WidgetCard>
  );
}

interface PendingRow {
  key: string;
  severity: Severity;
  since: string;
  sourceLabel: string;
  action: string;
  title: string;
  to: string | null;
  meta: string;
  acknowledgeEventId?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { critica: 4, alta: 3, media: 2, baixa: 1, informativa: 0 };

/**
 * Ações pendentes do usuário em toda a plataforma: reconhecimentos do Security
 * Hub e o que cada módulo especialista informa (triagem, tratamento, eficácia,
 * reinspeção…), conforme as permissões do perfil. O Hub só reúne e leva ao
 * módulo responsável; nenhuma ação de outro módulo é executada aqui.
 */
export function PendingActionsWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const { acknowledge, pending } = useAcknowledge();
  const limit = config.limit ?? 6;
  const query = useServiceQuery(
    async () => {
      const filter = { locationId: location.locationId };
      const [acks, ...modules] = await Promise.all([
        services.hub.pendingActions(access, { ...filter, limit: 50 }),
        isModuleAvailable(access, 'ocorrencias') ? services.occurrences.pendingWork(access, filter) : Promise.resolve([]),
        isModuleAvailable(access, 'manutencao') ? services.maintenance.pendingWork(access, filter) : Promise.resolve([]),
        services.plans.permissions(access).view ? services.plans.pendingWork(access, filter) : Promise.resolve([]),
        isModuleAvailable(access, 'rotinas') ? services.routines.pendingWork(access, filter) : Promise.resolve([]),
      ]);
      const rows: PendingRow[] = [
        ...acks.map((a) => ({
          key: `ack-${a.event.id}`,
          severity: a.event.severity,
          since: new Date(Date.now() - a.ageMinutes * 60_000).toISOString(),
          sourceLabel: MODULES['security-hub'].name,
          action: 'Reconhecer alerta',
          title: a.event.title,
          to: paths.event(a.event.id),
          meta: `Aguardando há ${formatMinutes(a.ageMinutes)} · ${tail(a.locationPath)}`,
          acknowledgeEventId: a.event.id,
        })),
        ...modules.flat().map((w) => ({
          key: w.id,
          severity: w.severity,
          since: w.since,
          sourceLabel: w.target.kind === 'action-plan' ? 'Planos de ação' : MODULES[w.moduleId].name,
          action: w.action,
          title: w.title,
          to: resolveTargetPath(w.target, access, services),
          meta: `Desde ${formatDateTime(w.since)}${w.locationPath.length ? ` · ${tail(w.locationPath)}` : ''}`,
        })),
      ];
      return rows.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || a.since.localeCompare(b.since));
    },
    [access, location.locationId],
    { refresh: config.refresh },
  );
  const canAck = access.permissions.has('hub.events.acknowledge');
  return (
    <WidgetCard instance={instance} location={location} query={query} flush>
      <WidgetQueryBody query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState compact icon="check-circle" title="Nenhuma ação pendente para você." />
          ) : (
            <>
              <ul className={styles.rows}>
                {rows.slice(0, limit).map((r) => (
                  <li key={r.key} className={styles.row}>
                    <span className={styles.severityDot} style={{ background: SEVERITY_COLOR[r.severity] }} title={`Severidade ${SEVERITY_LABEL[r.severity].toLowerCase()}`} />
                    <div className={styles.rowMain}>
                      <div className={styles.rowMeta}>
                        {r.sourceLabel} · <strong>{r.action}</strong>
                      </div>
                      {r.to ? (
                        <ContextLink to={r.to} className={styles.rowTitle}>
                          {r.title}
                        </ContextLink>
                      ) : (
                        <span className={styles.rowTitle}>{r.title}</span>
                      )}
                      <div className={styles.rowMeta}>{r.meta}</div>
                    </div>
                    {r.acknowledgeEventId && canAck && (
                      <Button size="small" variant="secondary" icon="check" loading={pending === r.acknowledgeEventId} onClick={() => acknowledge(r.acknowledgeEventId!, r.title)}>
                        Reconhecer
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {rows.length > limit && (
                <p className="helper" style={{ padding: '8px 16px' }}>
                  Mais {rows.length - limit} {rows.length - limit === 1 ? 'ação pendente' : 'ações pendentes'}. Aumente o limite nas configurações do widget ou abra os módulos.
                </p>
              )}
            </>
          )
        }
      </WidgetQueryBody>
    </WidgetCard>
  );
}
