import { Button, EmptyState, Panel, Stack, StatsCard } from '@/components/ui';
import { ConditionBadge, CriticalityBadge, LocationPath, SeverityBadge, formatRelative } from '@/components/domain';
import { LOCATION_LEVEL_LABEL } from '@/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { useAcknowledge } from '@/modules/security-hub/widgets/useAcknowledge';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { SOURCE_LABEL } from '@/pages/records/shared';
import type { CentralTabProps } from '../CentralHomePage';
import { baseParams } from '../centralPaths';
import styles from '../central.module.css';
import pageStyles from '@/pages/Pages.module.css';

/** Visão geral do local: indicadores, alertas e ativos que exigem atenção, locais filhos. */
export function OverviewTab({ params, go }: CentralTabProps) {
  const access = useAccess();
  const services = useServices();
  const { acknowledge, pending } = useAcknowledge();
  const query = useServiceQuery(
    () => services.central.overview(access, { locationId: params.local, includeDescendants: !params.somente }),
    [params.local, params.somente, access],
  );
  const base = baseParams(params);

  return (
    <QueryBoundary query={query} moduleId="central">
      {(o) => {
        const i = o.indicators;
        return (
          <Stack>
            <div className={styles.statsGrid}>
              <StatsCard icon="cubes" title="Ativos" value={i.totalAssets} onClick={() => go({ ...base, aba: 'ativos' })} />
              <StatsCard
                icon="exclamation-circle"
                title="Fora da condição normal"
                value={i.notNormal}
                tone={i.notNormal > 0 ? 'orange' : 'green'}
                onClick={() => go({ ...base, aba: 'ativos', ordem: 'condicao' })}
              />
              <StatsCard
                icon="bell"
                title="Alertas ativos"
                value={i.activeAlerts}
                tone={i.activeAlerts > 0 ? 'red' : 'green'}
                onClick={() => go({ ...base, aba: 'alertas', status: 'ativo' })}
              />
              <StatsCard icon="plug" title="Ativos com dispositivo" value={`${i.withDevicePercent}%`} tone="blue" onClick={() => go({ ...base, aba: 'ativos', dispositivo: 'com' })} />
              <StatsCard
                icon="map-marker"
                title="Dispositivos aguardando validação"
                value={i.devices.suggested + i.devices.unidentified}
                tone={i.devices.suggested + i.devices.unidentified > 0 ? 'yellow' : 'default'}
                onClick={() => go({ ...base, aba: 'dispositivos', estado: i.devices.suggested > 0 ? 'sugerida' : 'nao_identificada' })}
              />
              <StatsCard icon="check-square-o" title="Completude do cadastro" value={`${i.completenessPercent}%`} tone={i.completenessPercent >= 90 ? 'green' : 'yellow'} />
              <StatsCard icon="search-plus" title="Descobertos incorporados" value={i.discoveredIncorporated} />
              <StatsCard icon="clone" title="Duplicidades evitadas" value={i.duplicatesAvoided} />
            </div>
            <p className="helper" style={{ marginTop: -4 }}>
              Criticidade (alta {i.byCriticality.alta} · média {i.byCriticality.media} · baixa {i.byCriticality.baixa}) é a importância própria do
              ativo e não se confunde com a condição operacional. Completude: ativos com classificação, localização e responsável (direto ou herdado).
            </p>

            <div className={styles.split}>
              <Panel
                title="Alertas que exigem atenção"
                flush
                actions={
                  <Button variant="link" size="small" onClick={() => go({ ...base, aba: 'alertas', status: 'ativo' })}>
                    Ver todos
                  </Button>
                }
              >
                {o.attentionEvents.length === 0 ? (
                  <EmptyState compact icon="check-circle" title="Nenhum alerta ativo neste recorte." />
                ) : (
                  <ul className={pageStyles.list}>
                    {o.attentionEvents.map(({ event, locationPath, canAcknowledge }) => (
                      <li key={event.id} className={pageStyles.listItem}>
                        <SeverityBadge value={event.severity} />
                        <div className={pageStyles.listItemMain}>
                          <ContextLink to={paths.event(event.id)} className={pageStyles.listItemTitle}>
                            {event.title}
                          </ContextLink>
                          <div className="helper">
                            <LocationPath path={locationPath} tail={2} /> · {SOURCE_LABEL[event.source]} · {formatRelative(event.occurredAt)}
                          </div>
                        </div>
                        {canAcknowledge && (
                          <Button size="small" variant="secondary" icon="check" loading={pending === event.id} onClick={() => acknowledge(event.id, event.title)}>
                            Reconhecer
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel
                title="Ativos que exigem atenção"
                flush
                actions={
                  <Button variant="link" size="small" onClick={() => go({ ...base, aba: 'ativos', ordem: 'condicao' })}>
                    Ver ativos
                  </Button>
                }
              >
                {o.attentionAssets.length === 0 ? (
                  <EmptyState compact icon="check-circle" title="Todos os ativos deste recorte estão em condição normal." />
                ) : (
                  <ul className={pageStyles.list}>
                    {o.attentionAssets.map(({ asset, locationPath, activeAlerts }) => (
                      <li key={asset.id} className={pageStyles.listItem}>
                        <div className={pageStyles.listItemMain}>
                          <ContextLink to={paths.asset(asset.id)} className={pageStyles.listItemTitle}>
                            {asset.tag} · {asset.name}
                          </ContextLink>
                          <div className="helper">
                            <LocationPath path={locationPath} tail={2} />
                            {activeAlerts > 0 && ` · ${activeAlerts} alerta(s) ativo(s)`}
                          </div>
                        </div>
                        <span className={styles.badges}>
                          <ConditionBadge value={asset.condition} />
                          <CriticalityBadge value={asset.criticality} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title={o.location ? 'Locais contidos' : 'Unidades do seu escopo'}>
              {params.somente ? (
                <p className="helper">Recorte "somente este local": os locais filhos não são considerados.</p>
              ) : o.children.length === 0 ? (
                <EmptyState compact icon="map-o" title="Este local não tem locais filhos no seu escopo." />
              ) : (
                <>
                  <p className="helper" style={{ marginBottom: 12 }}>
                    Mapa esquemático pela hierarquia de localização. Selecione um local para aprofundar.
                  </p>
                  <div className={styles.childGrid}>
                    {o.children.map((c) => (
                      <button
                        key={c.location.id}
                        type="button"
                        className={[styles.childCard, (c.notNormal > 0 || c.activeAlerts > 0) && styles.childCardAttention].filter(Boolean).join(' ')}
                        onClick={() => go({ aba: 'visao-geral', local: c.location.id })}
                      >
                        <span className={styles.childCardTitle}>{c.location.name}</span>
                        <span className="helper">{LOCATION_LEVEL_LABEL[c.location.level]}</span>
                        <span className={styles.childCardMeta}>
                          <span>{c.assets} ativo(s)</span>
                          <span>{c.notNormal} fora do normal</span>
                          <span>{c.activeAlerts} alerta(s)</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Panel>
            {o.location && (
              <p className="helper">
                Responsável pelo local: {o.responsible?.name ?? 'não definido'} — ativos sem responsável direto herdam este responsável.
              </p>
            )}
          </Stack>
        );
      }}
    </QueryBoundary>
  );
}
