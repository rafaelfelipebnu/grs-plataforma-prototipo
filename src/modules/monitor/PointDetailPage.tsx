import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Col,
  DemoTag,
  EmptyState,
  Grid,
  LabelValue,
  LabelValueGrid,
  PageHeader,
  Panel,
  Stack,
  TextField,
  tableStyles as t,
  useToast,
} from '@/components/ui';
import { DataPointStatusBadge, LocationPath, SeverityBadge, formatDateTime, formatRelative, formatValue } from '@/components/domain';
import { RULE_OPERATOR_LABEL, type MonitoringRule } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { errorMessage } from '@/modules/central/shared';
import { MonitorNav, monitorPaths } from './MonitorNav';
import { PointHistoryChart } from './PointHistoryChart';
import { RuleModal } from './RuleModal';

/** Detalhe do ponto de dado: valor atual, histórico, regras e alertas (ponto → dispositivo → ativo). */
export function PointDetailPage() {
  const { pointId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const query = useServiceQuery(() => services.monitor.getPoint(access, pointId), [pointId, access]);
  usePageLabel(query.data ? query.data.point.name : undefined);
  const [view, setView] = useState<'grafico' | 'tabela'>('grafico');
  const [reading, setReading] = useState('');
  const [readingError, setReadingError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [ruleModal, setRuleModal] = useState<{ rule?: MonitoringRule } | null>(null);

  const simulate = async () => {
    setBusy(true);
    setReadingError(undefined);
    try {
      const { point, triggered } = await services.monitor.simulateReading(access, pointId, reading);
      toast.show({
        tone: triggered.length ? 'warning' : 'success',
        title: 'Leitura simulada recebida',
        message: triggered.length ? `${point.name}: alerta ${triggered.map((e) => e.code).join(', ')} gerado.` : `${point.name} = ${formatValue(point.value, point.unit)}.`,
      });
      setReading('');
    } catch (e) {
      setReadingError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query} moduleId="monitor">
        {(d) => (
          <>
            <PageHeader
              title={d.point.name}
              breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Pontos de dado', to: monitorPaths.points }, { label: d.point.name }]}
              description={
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                  <strong style={{ fontSize: 18 }}>{formatValue(d.point.value, d.point.unit)}</strong>
                  <DataPointStatusBadge value={d.point.status} />
                  <span className="helper">atualizado {formatRelative(d.point.updatedAt)}</span>
                </span>
              }
            />
            <MonitorNav />
            <Stack>
              {d.collectionPaused && <Alert tone="warning">Coleta pausada: o conector deste dispositivo está desativado.</Alert>}
              <Grid>
                <Col span={8}>
                  <Panel
                    title="Histórico do ponto"
                    actions={
                      <select
                        aria-label="Forma de exibição do histórico"
                        value={view}
                        onChange={(e) => setView(e.target.value as 'grafico' | 'tabela')}
                        style={{ minHeight: 28, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' }}
                      >
                        <option value="grafico">Gráfico</option>
                        <option value="tabela">Tabela</option>
                      </select>
                    }
                  >
                    {view === 'grafico' ? (
                      <PointHistoryChart readings={d.history} unit={d.point.unit} rules={d.rules} />
                    ) : (
                      <div className={t.tableWrap} style={{ maxHeight: 280, overflow: 'auto' }}>
                        <table className={t.table}>
                          <caption className="visually-hidden">Leituras do ponto</caption>
                          <thead>
                            <tr>
                              <th scope="col">Data/hora</th>
                              <th scope="col">Valor</th>
                              <th scope="col">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...d.history].reverse().map((r) => (
                              <tr key={r.at}>
                                <td>{formatDateTime(r.at)}</td>
                                <td>{formatValue(r.value, d.point.unit)}</td>
                                <td>
                                  <DataPointStatusBadge value={r.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="helper" style={{ marginTop: 8 }}>
                      Série das últimas 24 h gerada para demonstração, seguida das leituras simuladas nesta sessão.
                    </p>
                  </Panel>
                </Col>
                <Col span={4}>
                  <Panel title="Origem">
                    <LabelValueGrid>
                      <LabelValue label="Dispositivo">
                        <ContextLink to={paths.device(d.device.id)}>{d.device.name}</ContextLink>
                      </LabelValue>
                      <LabelValue label="Ativo">{d.asset ? <ContextLink to={paths.asset(d.asset.id)}>{d.asset.tag} · {d.asset.name}</ContextLink> : <span className="muted">Sem associação</span>}</LabelValue>
                      <LabelValue label="Local">
                        <LocationPath path={d.locationPath} />
                      </LabelValue>
                      <LabelValue label="Unidade de medida">{d.point.unit || '—'}</LabelValue>
                    </LabelValueGrid>
                  </Panel>
                </Col>
              </Grid>

              <Panel
                title="Regras sobre este ponto"
                flush
                actions={
                  d.canManageRules ? (
                    <Button size="small" icon="plus" onClick={() => setRuleModal({})}>
                      Nova regra
                    </Button>
                  ) : undefined
                }
              >
                {d.rules.length === 0 ? (
                  <EmptyState compact icon="sliders" title="Nenhuma regra configurada para este ponto." />
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {d.rules.map((r) => (
                      <li key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--sds-border)' }}>
                        <div style={{ flex: 1 }}>
                          <strong>{r.name}</strong>
                          <div className="helper">
                            Alerta quando o valor for {RULE_OPERATOR_LABEL[r.operator]} {String(r.threshold)} {d.point.unit}
                          </div>
                        </div>
                        <SeverityBadge value={r.severity} />
                        <Badge tone={r.active ? 'green' : 'gray'}>{r.active ? 'Ativa' : 'Desativada'}</Badge>
                        {d.canManageRules && (
                          <Button size="small" variant="link" onClick={() => setRuleModal({ rule: r })}>
                            Editar
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {d.activeAlerts.length > 0 && (
                <Panel title="Alertas ativos deste ponto" flush>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {d.activeAlerts.map(({ event }) => (
                      <li key={event.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--sds-border)' }}>
                        <SeverityBadge value={event.severity} />
                        <ContextLink to={paths.event(event.id)}>{event.title}</ContextLink>
                        <span className="helper">{formatRelative(event.occurredAt)}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              <Panel title="Simular leitura">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <DemoTag>Ferramenta do facilitador</DemoTag>
                  <div style={{ minWidth: 200 }}>
                    <TextField label={`Novo valor${d.point.unit ? ` (${d.point.unit})` : ''}`} value={reading} error={readingError} onChange={(e) => setReading(e.target.value)} />
                  </div>
                  <Button icon="bolt" variant="secondary" loading={busy} disabled={d.collectionPaused} onClick={simulate}>
                    Enviar leitura simulada
                  </Button>
                </div>
                <p className="helper" style={{ marginTop: 8 }}>
                  Representa um sinal vindo do equipamento. As regras ativas são avaliadas; nenhum equipamento real é acessado.
                </p>
              </Panel>
            </Stack>
            <RuleModal open={ruleModal !== null} rule={ruleModal?.rule} pointId={d.point.id} onClose={() => setRuleModal(null)} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
