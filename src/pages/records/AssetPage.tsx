import { useParams } from 'react-router-dom';
import { Alert, Col, EmptyState, Grid, LabelValue, LabelValueGrid, PageHeader, Panel, Stack } from '@/components/ui';
import { ConditionBadge, CriticalityBadge, DeviceLocationBadge, formatDateTime } from '@/components/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '../QueryBoundary';
import { LocationLink, PersonRef } from './shared';
import styles from '../Pages.module.css';

/**
 * Identidade mestre do ativo (Central). O Painel 360º completo, com abas,
 * é implementado na etapa 3; esta página já é o destino real de navegação.
 */
export function AssetPage() {
  const { assetId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.assets.get(access, assetId), [assetId, access]);
  usePageLabel(query.data ? `${query.data.asset.tag} · ${query.data.asset.name}` : undefined);

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query} moduleId="central">
        {(s) => {
          const { asset } = s;
          const conditionSource =
            asset.conditionSource.kind === 'manual' ? 'Informada manualmente' : `Alimentada por ${MODULES[asset.conditionSource.moduleId].name}`;
          return (
            <>
              <PageHeader
                title={`${asset.tag} · ${asset.name}`}
                breadcrumb={[{ label: MODULES.central.name, to: '/central' }, { label: 'Ativos' }, { label: asset.tag }]}
                description={
                  <span className={styles.recordHeader}>
                    <CriticalityBadge value={asset.criticality} />
                    <ConditionBadge value={asset.condition} />
                    <span className="helper">{conditionSource} · {formatDateTime(asset.conditionUpdatedAt)}</span>
                  </span>
                }
              />
              <Stack>
                <Alert tone="info">
                  Criticidade é a importância própria do ativo; condição é o estado operacional atual. O Painel 360º completo (visão geral,
                  dispositivos, módulos GRS, operação, riscos, relacionamentos e histórico) será implementado na etapa 3.
                </Alert>
                <Grid>
                  <Col span={8}>
                    <Panel title="Identificação">
                      <LabelValueGrid>
                        <LabelValue label="Classificação">{s.classificationPath.map((c) => c.name).join(' › ')}</LabelValue>
                        <LabelValue label="Localização principal">
                          <LocationLink path={s.primaryLocationPath} />
                        </LabelValue>
                        <LabelValue label="Locais atendidos">
                          {s.servedLocations.length === 0 ? (
                            <span className="muted">Nenhum</span>
                          ) : (
                            s.servedLocations.map((l, i) => (
                              <span key={l.id}>
                                {i > 0 && ', '}
                                <ContextLink to={paths.location(l.id)}>{l.name}</ContextLink>
                              </span>
                            ))
                          )}
                        </LabelValue>
                        <LabelValue label="Responsável">
                          <PersonRef person={s.responsible} />
                          {s.responsibilityOrigin.kind === 'herdado' && (
                            <span className="helper" style={{ display: 'block' }}>
                              Herdado da localização {s.responsibilityOrigin.fromLocation.name}
                            </span>
                          )}
                          {s.responsibilityOrigin.kind === 'direto' && (
                            <span className="helper" style={{ display: 'block' }}>
                              Responsável direto do ativo
                            </span>
                          )}
                        </LabelValue>
                        <LabelValue label="Descrição">{asset.description}</LabelValue>
                        <LabelValue label="Cadastro iniciado em">{MODULES[asset.registeredFrom].name}</LabelValue>
                      </LabelValueGrid>
                    </Panel>
                  </Col>
                  <Col span={4}>
                    <Panel title="Relacionamentos">
                      <p className="helper" style={{ marginBottom: 8 }}>
                        Depende de
                      </p>
                      {s.dependsOn.length === 0 ? (
                        <p className="muted">Nenhuma dependência registrada.</p>
                      ) : (
                        <ul className={styles.list}>
                          {s.dependsOn.map((a) => (
                            <li key={a.id} style={{ padding: '2px 0' }}>
                              <ContextLink to={paths.asset(a.id)}>{a.tag}</ContextLink> · {a.name}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="helper" style={{ margin: '16px 0 8px' }}>
                        Dependem deste ativo
                      </p>
                      {s.dependents.length === 0 ? (
                        <p className="muted">Nenhum ativo depende deste.</p>
                      ) : (
                        <ul className={styles.list}>
                          {s.dependents.map((a) => (
                            <li key={a.id} style={{ padding: '2px 0' }}>
                              <ContextLink to={paths.asset(a.id)}>{a.tag}</ContextLink> · {a.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                  </Col>
                </Grid>
                <Panel title="Dispositivos" flush>
                  {s.devices.length === 0 ? (
                    <EmptyState compact icon="microchip" title="Ativo sem dispositivo conectado." text="Ativos sem dispositivo também fazem parte do cadastro compartilhado." />
                  ) : (
                    <ul className={styles.list}>
                      {s.devices.map((d) => (
                        <li key={d.id} className={styles.listItem}>
                          <div className={styles.listItemMain}>
                            <ContextLink to={paths.device(d.id)} className={styles.listItemTitle}>
                              {d.name}
                            </ContextLink>
                            <div className="helper">
                              {d.deviceType} · {d.protocol}
                            </div>
                          </div>
                          <DeviceLocationBadge value={d.locationStatus} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </Stack>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}
