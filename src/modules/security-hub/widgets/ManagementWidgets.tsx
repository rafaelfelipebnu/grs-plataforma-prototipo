import { Alert, Button, EmptyState, Icon, StatsCard } from '@/components/ui';
import { SEVERITY_COLOR, SEVERITY_LABEL } from '@/components/domain';
import { moduleAccess } from '@/access';
import { PERIOD_SHORT_LABEL } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { WIDGET_CATALOG } from '../catalog';
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
                  Média entre ocorrência e reconhecimento · {r.acknowledgedCount} {r.acknowledgedCount === 1 ? 'alerta' : 'alertas'}
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

export function PendingActionsWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const { acknowledge, pending } = useAcknowledge();
  const query = useServiceQuery(() => services.hub.pendingActions(access, { locationId: location.locationId, limit: config.limit ?? 6 }), [access, location.locationId, config.limit], {
    refresh: config.refresh,
  });
  const canAck = access.permissions.has('hub.events.acknowledge');
  return (
    <WidgetCard instance={instance} location={location} query={query} flush drillTo={hubPaths.events({ status: 'ativo', local: location.locationId, ordem: 'severidade' })}>
      <WidgetQueryBody query={query}>
        {(actions) => (
          <>
            {actions.length === 0 ? (
              <EmptyState compact icon="check-circle" title="Nenhuma ação pendente." />
            ) : (
              <ul className={styles.rows}>
                {actions.map((a) => (
                  <li key={a.event.id} className={styles.row}>
                    <span className={styles.severityDot} style={{ background: SEVERITY_COLOR[a.event.severity] }} title={`Severidade ${SEVERITY_LABEL[a.event.severity].toLowerCase()}`} />
                    <div className={styles.rowMain}>
                      <ContextLink to={paths.event(a.event.id)} className={styles.rowTitle}>
                        Reconhecer: {a.event.title}
                      </ContextLink>
                      <div className={styles.rowMeta}>
                        Aguardando há {formatMinutes(a.ageMinutes)} · {tail(a.locationPath)}
                      </div>
                    </div>
                    {canAck && (
                      <Button size="small" variant="secondary" icon="check" loading={pending === a.event.id} onClick={() => acknowledge(a.event.id, a.event.title)}>
                        Reconhecer
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="helper" style={{ padding: '8px 16px' }}>
              <Icon name="info-circle" /> Ações de ocorrências, manutenção e rotinas entram aqui quando esses módulos forem implementados (etapa 5).
            </p>
          </>
        )}
      </WidgetQueryBody>
    </WidgetCard>
  );
}

/**
 * Widgets cujos dados pertencem a módulos ainda não implementados no
 * protótipo: mostram o estado real (bloqueado ou previsto), sem dados fictícios.
 */
export function PendingModuleWidget({ instance }: WidgetProps) {
  const access = useAccess();
  const def = WIDGET_CATALOG[instance.type];
  const sourceModule = def.requiredModules.find((m) => m !== 'security-hub') ?? 'security-hub';
  const state = moduleAccess(access, sourceModule);
  return (
    <WidgetCard instance={instance}>
      {state === 'not-contracted' ? (
        <EmptyState
          compact
          icon="lock"
          title={`${MODULES[sourceModule].name} não contratado`}
          text={
            <>
              {MODULES[sourceModule].valueProposition}{' '}
              <ContextLink to={MODULES[sourceModule].basePath}>Saiba mais</ContextLink>
            </>
          }
        />
      ) : (
        <Alert tone="info" title={`Disponível na etapa ${def.pendingStage}`}>
          Os dados deste widget vêm de {MODULES[sourceModule].name}, que será implementado na etapa {def.pendingStage} do protótipo.
        </Alert>
      )}
    </WidgetCard>
  );
}
