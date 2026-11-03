import { useParams } from 'react-router-dom';
import { isModuleAvailable } from '@/access';
import { Alert, Badge, Col, EmptyState, Grid, LabelValue, LabelValueGrid, PageHeader, Panel, Stack } from '@/components/ui';
import { CommunicationBadge, DataPointStatusBadge, DeviceLocationBadge, formatDateTime, formatRelative, formatValue } from '@/components/domain';
import { MODULES } from '@/modules/registry';
import type { DeviceOrigin } from '@/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '../QueryBoundary';
import { LocationLink } from './shared';
import styles from '../Pages.module.css';

const ORIGIN_LABEL: Record<DeviceOrigin, string> = {
  cadastro_manual: 'Cadastro manual',
  descoberta: 'Descoberta (simulada)',
  importacao: 'Importação em lote (simulada)',
};

/**
 * Identidade do dispositivo (Central) com dados técnicos consolidados do
 * Monitor de Infraestrutura quando contratado. A gestão técnica do
 * monitoramento permanece no Monitor (etapa 4).
 */
export function DevicePage() {
  const { deviceId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.devices.get(access, deviceId), [deviceId, access]);
  usePageLabel(query.data ? `Dispositivo ${query.data.device.name}` : undefined);
  const monitorState = isModuleAvailable(access, 'monitor');

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query} moduleId="central">
        {(s) => {
          const { device } = s;
          return (
            <>
              <PageHeader
                title={device.name}
                breadcrumb={[{ label: MODULES.central.name, to: '/central' }, { label: 'Dispositivos' }, { label: device.name }]}
                description={
                  <span className={styles.recordHeader}>
                    <DeviceLocationBadge value={device.locationStatus} />
                    {s.monitoring?.health && <CommunicationBadge value={s.monitoring.health.communication} />}
                  </span>
                }
              />
              <Stack>
                {device.locationStatus !== 'confirmada' && (
                  <Alert tone="warning" title="Localização física não confirmada">
                    A descoberta não confirma a localização física nem associa ativos automaticamente. A validação por uma pessoa autorizada
                    será implementada com o fluxo de descoberta (etapa 4).
                  </Alert>
                )}
                <Grid>
                  <Col span={6}>
                    <Panel title="Identificação">
                      <LabelValueGrid>
                        <LabelValue label="Tipo">{device.deviceType}</LabelValue>
                        <LabelValue label="Fabricante e modelo">
                          {device.manufacturer} · {device.model}
                        </LabelValue>
                        <LabelValue label="Protocolo">{device.protocol}</LabelValue>
                        <LabelValue label="Conector">
                          {s.connector?.name} <Badge tone="gray">Simulado</Badge>
                        </LabelValue>
                        <LabelValue label="Origem do cadastro">{ORIGIN_LABEL[device.origin]}</LabelValue>
                      </LabelValueGrid>
                    </Panel>
                  </Col>
                  <Col span={6}>
                    <Panel title="Localização e ativo">
                      <LabelValueGrid>
                        <LabelValue label="Localização">
                          {device.locationStatus === 'confirmada' ? <LocationLink path={s.locationPath} /> : <span className="muted">Não confirmada</span>}
                        </LabelValue>
                        {device.locationStatus === 'sugerida' && (
                          <LabelValue label="Localização sugerida">
                            <LocationLink path={s.suggestedLocationPath} />
                          </LabelValue>
                        )}
                        <LabelValue label="Ativo alimentado">
                          {s.asset ? (
                            <ContextLink to={paths.asset(s.asset.id)}>
                              {s.asset.tag} · {s.asset.name}
                            </ContextLink>
                          ) : (
                            <span className="muted">Sem ativo associado</span>
                          )}
                        </LabelValue>
                      </LabelValueGrid>
                    </Panel>
                  </Col>
                </Grid>
                <Panel title="Monitoramento" flush>
                  {!s.monitoring ? (
                    <EmptyState
                      compact
                      icon="lock"
                      title={monitorState ? 'Dados de monitoramento indisponíveis.' : `${MODULES.monitor.name} não disponível para o seu acesso.`}
                      text="Conectividade, saúde e telemetria são geridas pelo Monitor de Infraestrutura."
                    />
                  ) : (
                    <>
                      <div style={{ padding: 16 }}>
                        <LabelValueGrid>
                          <LabelValue label="Comunicação">
                            {s.monitoring.health ? <CommunicationBadge value={s.monitoring.health.communication} /> : '—'}
                          </LabelValue>
                          <LabelValue label="Última comunicação">
                            {s.monitoring.health ? `${formatRelative(s.monitoring.health.lastSeenAt)} (${formatDateTime(s.monitoring.health.lastSeenAt)})` : '—'}
                          </LabelValue>
                        </LabelValueGrid>
                      </div>
                      {s.monitoring.dataPoints.length === 0 ? (
                        <EmptyState compact title="Este dispositivo não fornece pontos de dado." />
                      ) : (
                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <caption className="visually-hidden">Pontos de dado do dispositivo</caption>
                            <thead>
                              <tr>
                                <th scope="col">Ponto de dado</th>
                                <th scope="col">Valor atual</th>
                                <th scope="col">Status</th>
                                <th scope="col">Última atualização</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.monitoring.dataPoints.map((p) => (
                                <tr key={p.id}>
                                  <td>{p.name}</td>
                                  <td>{formatValue(p.value, p.unit)}</td>
                                  <td>
                                    <DataPointStatusBadge value={p.status} />
                                  </td>
                                  <td title={formatDateTime(p.updatedAt)}>{formatRelative(p.updatedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
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
