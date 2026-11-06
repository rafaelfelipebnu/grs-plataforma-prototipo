import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, PageHeader, Panel, Stack, tableStyles as t } from '@/components/ui';
import { LocationPath, formatDateTime } from '@/components/domain';
import { CANDIDATE_STATUS_LABEL, type CandidateStatus } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { centralPaths } from '@/modules/central/centralPaths';
import { MonitorNav, monitorPaths } from './MonitorNav';

const STATUS_TONE = { pendente: 'blue', aprovado: 'green', rejeitado: 'gray' } as const;

/**
 * Descoberta (Monitor): execuções e inventário do que foi encontrado, com as
 * sugestões e suas justificativas. Somente leitura — a revisão é na Central.
 */
export function DiscoveryPage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  usePageLabel('Descoberta');
  const [status, setStatus] = useState<CandidateStatus | ''>('');
  const query = useServiceQuery(
    async () => ({ runs: await services.monitor.listRuns(access), candidates: await services.monitor.listCandidates(access, { status: status || undefined }) }),
    [access, status],
  );
  const canReview = services.discovery.canReview(access);

  return (
    <>
      <PageHeader
        title="Descoberta"
        breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Descoberta' }]}
        description="Configurar conector → descobrir → classificar e sugerir → revisar e aprovar na Central → pontos de dado disponíveis no Monitor."
        actions={
          <Button variant="secondary" icon="plug" onClick={() => navigate(monitorPaths.connectors)}>
            Executar a partir dos conectores
          </Button>
        }
      />
      <MonitorNav />
      <QueryBoundary query={query} moduleId="monitor">
        {({ runs, candidates }) => (
          <Stack>
            <Alert
              tone="info"
              title="A descoberta é somente leitura"
              action={
                canReview ? (
                  <Button size="small" icon="check-square-o" onClick={() => navigate(centralPaths.review)}>
                    Revisar na Central
                  </Button>
                ) : undefined
              }
            >
              Classificação, localização e correspondência com ativos são apenas sugestões. Criar o dispositivo, confirmar a localização física e
              associá-lo a um ativo exigem aprovação de uma pessoa autorizada na Central de Ativos e Ambientes.
            </Alert>
            <Panel
              title={`Dispositivos descobertos (${candidates.length})`}
              flush
              actions={
                <select
                  aria-label="Filtrar por situação"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CandidateStatus | '')}
                  style={{ minHeight: 28, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' }}
                >
                  <option value="">Todas as situações</option>
                  {(Object.keys(CANDIDATE_STATUS_LABEL) as CandidateStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {CANDIDATE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              }
            >
              {candidates.length === 0 ? (
                <EmptyState compact icon="search" title="Nenhum dispositivo descoberto ainda." text="Execute a descoberta em um conector ativo." />
              ) : (
                <div className={t.tableWrap}>
                  <table className={t.table}>
                    <caption className="visually-hidden">Dispositivos descobertos</caption>
                    <thead>
                      <tr>
                        <th scope="col">Dispositivo</th>
                        <th scope="col">Conector</th>
                        <th scope="col">Sugestões</th>
                        <th scope="col">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map(({ candidate: c, connector, suggestedLocationPath, suggestedAsset, suggestedClassification, decidedByName }) => (
                        <tr key={c.id}>
                          <td style={{ minWidth: 220 }}>
                            {c.name}
                            <div className="helper">
                              {c.deviceType} · {c.address}
                            </div>
                          </td>
                          <td>{connector.name}</td>
                          <td style={{ minWidth: 240 }}>
                            <div className="helper">Classificação: {suggestedClassification?.name ?? '—'}</div>
                            <div className="helper">Local: {suggestedLocationPath.length ? <LocationPath path={suggestedLocationPath} tail={2} icon={false} /> : '—'}</div>
                            <div className="helper">Ativo: {suggestedAsset?.tag ?? '—'}</div>
                          </td>
                          <td>
                            <Badge tone={STATUS_TONE[c.status]}>{CANDIDATE_STATUS_LABEL[c.status]}</Badge>
                            {c.decision && (
                              <div className="helper">
                                {decidedByName} · {formatDateTime(c.decision.at)}
                                {c.decision.deviceId && (
                                  <>
                                    {' · '}
                                    <ContextLink to={paths.device(c.decision.deviceId)}>ver dispositivo</ContextLink>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <Panel title="Execuções" flush>
              {runs.length === 0 ? (
                <EmptyState compact icon="history" title="Nenhuma descoberta executada nesta demonstração." />
              ) : (
                <div className={t.tableWrap}>
                  <table className={t.table}>
                    <caption className="visually-hidden">Execuções de descoberta</caption>
                    <thead>
                      <tr>
                        <th scope="col">Data/hora</th>
                        <th scope="col">Conector</th>
                        <th scope="col">Responderam</th>
                        <th scope="col">Novos</th>
                        <th scope="col">Executada por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r) => (
                        <tr key={r.id}>
                          <td>{formatDateTime(r.startedAt)}</td>
                          <td>{r.connectorName}</td>
                          <td>{r.found}</td>
                          <td>{r.newCandidates}</td>
                          <td>{r.byName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </Stack>
        )}
      </QueryBoundary>
    </>
  );
}
