import { useNavigate } from 'react-router-dom';
import { Alert, Button, EmptyState, PageHeader, Panel, Stack, StatsCard } from '@/components/ui';
import { CommunicationBadge, DataPointStatusBadge, LocationPath, formatRelative, formatValue } from '@/components/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { MonitorNav, monitorPaths } from './MonitorNav';
import styles from '@/modules/central/central.module.css';
import pageStyles from '@/pages/Pages.module.css';

/** Visão geral do Monitor: conectividade, telemetria fora do normal e descobertas pendentes. */
export function MonitorOverviewPage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  usePageLabel(MODULES.monitor.name);
  const query = useServiceQuery(() => services.monitor.overview(access), [access]);

  return (
    <>
      <PageHeader title={MODULES.monitor.name} breadcrumb={[{ label: MODULES.monitor.name }]} description="Conectividade, descoberta, telemetria, saúde dos dispositivos e regras técnicas — todos simulados nesta demonstração." />
      <MonitorNav />
      <QueryBoundary query={query} moduleId="monitor">
        {(o) => (
          <Stack>
            <div className={styles.statsGrid}>
              <StatsCard icon="plug" title="Conectores ativos" value={`${o.connectors.active}/${o.connectors.total}`} onClick={() => navigate(monitorPaths.connectors)} />
              <StatsCard icon="wifi" title="Dispositivos online" value={`${o.communication.online}/${o.devicesTotal}`} tone="green" onClick={() => navigate(monitorPaths.devices)} />
              <StatsCard
                icon="exclamation-triangle"
                title="Comunicação instável ou offline"
                value={o.communication.instavel + o.communication.offline}
                tone={o.communication.instavel + o.communication.offline > 0 ? 'orange' : 'default'}
                onClick={() => navigate(`${monitorPaths.devices}?comunicacao=offline`)}
              />
              <StatsCard icon="line-chart" title="Pontos fora do normal" value={o.pointsOutOfNormal} tone={o.pointsOutOfNormal > 0 ? 'yellow' : 'default'} onClick={() => navigate(`${monitorPaths.points}?status=alerta`)} />
              <StatsCard icon="bell" title="Alertas técnicos ativos" value={o.activeAlerts} tone={o.activeAlerts > 0 ? 'red' : 'default'} onClick={() => navigate(monitorPaths.alerts)} />
              <StatsCard icon="sliders" title="Regras ativas" value={o.activeRules} onClick={() => navigate(monitorPaths.rules)} />
              <StatsCard icon="search-plus" title="Descobertos aguardando revisão" value={o.pendingCandidates} tone={o.pendingCandidates > 0 ? 'blue' : 'default'} onClick={() => navigate(monitorPaths.discovery)} />
            </div>
            <Alert tone="info">
              Saúde de comunicação é do dispositivo; a condição operacional é do ativo. Um dispositivo offline não torna o ativo indisponível
              automaticamente.
            </Alert>
            <div className={styles.split}>
              <Panel title="Dispositivos com comunicação degradada" flush>
                {o.degradedDevices.length === 0 ? (
                  <EmptyState compact icon="check-circle" title="Todos os dispositivos estão se comunicando." />
                ) : (
                  <ul className={pageStyles.list}>
                    {o.degradedDevices.map((d) => (
                      <li key={d.device.id} className={pageStyles.listItem}>
                        <div className={pageStyles.listItemMain}>
                          <ContextLink to={paths.device(d.device.id)} className={pageStyles.listItemTitle}>
                            {d.device.name}
                          </ContextLink>
                          <div className="helper">
                            <LocationPath path={d.locationPath} tail={2} />
                            {d.health && ` · última comunicação ${formatRelative(d.health.lastSeenAt)}`}
                          </div>
                        </div>
                        {d.collectionPaused ? <span className="helper">Coleta pausada</span> : d.health && <CommunicationBadge value={d.health.communication} />}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel
                title="Pontos fora do normal"
                flush
                actions={
                  <Button size="small" variant="link" onClick={() => navigate(monitorPaths.points)}>
                    Ver pontos
                  </Button>
                }
              >
                {o.abnormalPoints.length === 0 ? (
                  <EmptyState compact icon="check-circle" title="Nenhum ponto fora do normal." />
                ) : (
                  <ul className={pageStyles.list}>
                    {o.abnormalPoints.map((p) => (
                      <li key={p.point.id} className={pageStyles.listItem}>
                        <div className={pageStyles.listItemMain}>
                          <ContextLink to={monitorPaths.point(p.point.id)} className={pageStyles.listItemTitle}>
                            {p.point.name}
                          </ContextLink>
                          <div className="helper">
                            {p.device.name}
                            {p.asset && ` · ${p.asset.tag}`}
                          </div>
                        </div>
                        <strong>{formatValue(p.point.value, p.point.unit)}</strong>
                        <DataPointStatusBadge value={p.point.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </Stack>
        )}
      </QueryBoundary>
    </>
  );
}
