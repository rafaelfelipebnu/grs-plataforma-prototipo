import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { can } from '@/access';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Paginator,
  Panel,
  tableStyles as t,
} from '@/components/ui';
import {
  AlertStatusBadge,
  CommunicationBadge,
  DataPointStatusBadge,
  DeviceLocationBadge,
  LocationPath,
  SeverityBadge,
  formatDateTime,
  formatRelative,
  formatValue,
} from '@/components/domain';
import { COMMUNICATION_STATUS_LABEL, type AlertStatus, type CommunicationStatus, type DataPointStatus } from '@/domain';
import { MODULES } from '@/modules/registry';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { useAcknowledge } from '@/modules/security-hub/widgets/useAcknowledge';
import { MonitorNav, monitorPaths } from './MonitorNav';

const PAGE_SIZE = 10;
const POINT_STATUS_LABEL: Record<DataPointStatus, string> = { normal: 'Normal', alerta: 'Alerta', critico: 'Crítico', sem_leitura: 'Sem leitura' };
const selectStyle = { minHeight: 32, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' } as const;

/** Filtros simples na URL (preservados ao voltar). */
function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const values = Object.fromEntries(keys.map((k) => [k, sp.get(k) ?? ''])) as Record<K, string>;
  const page = Number(sp.get('pagina')) || 1;
  const set = (next: Partial<Record<K | 'pagina', string>>) => {
    const merged = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(next) as [string, string | undefined][]) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    if (!('pagina' in next)) merged.delete('pagina');
    navigate(`${location.pathname}${merged.toString() ? `?${merged}` : ''}`, { replace: true, state: location.state });
  };
  return { values, page, set, key: sp.toString() };
}

function QueryError({ error }: { error: Error }) {
  return <ErrorState kind={isServiceError(error) && error.code === 'FORBIDDEN' ? 403 : 500} compact text={error.message} />;
}

/** Dispositivos sob monitoramento: comunicação, conector e vínculo com ativo. */
export function MonitorDevicesPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Dispositivos monitorados');
  const { values, page, set, key } = useUrlFilters(['comunicacao', 'busca'] as const);
  const [search, setSearch] = useState(values.busca);
  useEffect(() => setSearch(values.busca), [values.busca]);
  const query = useServiceQuery(
    () =>
      services.monitor.listDevices(access, {
        communication: (values.comunicacao || undefined) as CommunicationStatus | undefined,
        search: values.busca || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [key, access],
  );

  return (
    <>
      <PageHeader title="Dispositivos" breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Dispositivos' }]} description="Identificação, conector, estado de comunicação, última comunicação e vínculo com ativo." />
      <MonitorNav />
      <Panel title={`Dispositivos${query.data ? ` (${query.data.total})` : ''}`} flush>
        <div className={t.tableHeading}>
          <form
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
            onSubmit={(e) => {
              e.preventDefault();
              set({ busca: search });
            }}
          >
            <select aria-label="Comunicação" value={values.comunicacao} onChange={(e) => set({ comunicacao: e.target.value })} style={selectStyle}>
              <option value="">Toda comunicação</option>
              {(Object.keys(COMMUNICATION_STATUS_LABEL) as CommunicationStatus[]).map((c) => (
                <option key={c} value={c}>
                  {COMMUNICATION_STATUS_LABEL[c]}
                </option>
              ))}
            </select>
            <input aria-label="Buscar dispositivos" type="search" placeholder="Nome, tipo, protocolo, endereço ou ativo" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...selectStyle, minWidth: 260 }} />
            <Button type="submit" size="small" variant="secondary" icon="search">
              Buscar
            </Button>
          </form>
        </div>
        {query.error ? (
          <QueryError error={query.error} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : query.data.items.length === 0 ? (
          <EmptyState compact icon="microchip" title="Nenhum dispositivo encontrado." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Dispositivos monitorados</caption>
                <thead>
                  <tr>
                    <th scope="col">Dispositivo</th>
                    <th scope="col">Conector</th>
                    <th scope="col">Comunicação</th>
                    <th scope="col">Última comunicação</th>
                    <th scope="col">Localização</th>
                    <th scope="col">Ativo</th>
                    <th scope="col">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((d) => (
                    <tr key={d.device.id}>
                      <td style={{ minWidth: 200 }}>
                        <ContextLink to={paths.device(d.device.id)}>{d.device.name}</ContextLink>
                        <div className="helper">
                          {d.device.deviceType}
                          {d.device.address && ` · ${d.device.address}`}
                        </div>
                      </td>
                      <td className="helper">{d.connector?.name ?? '—'}</td>
                      <td>{d.collectionPaused ? <span className="helper">Coleta pausada</span> : d.health ? <CommunicationBadge value={d.health.communication} /> : '—'}</td>
                      <td title={d.health ? formatDateTime(d.health.lastSeenAt) : undefined}>{d.health ? formatRelative(d.health.lastSeenAt) : '—'}</td>
                      <td>
                        {d.locationPath.length ? <LocationPath path={d.locationPath} tail={2} /> : null}
                        <div>
                          <DeviceLocationBadge value={d.device.locationStatus} />
                        </div>
                      </td>
                      <td>{d.asset ? <ContextLink to={paths.asset(d.asset.id)}>{d.asset.tag}</ContextLink> : <span className="muted">Sem associação</span>}</td>
                      <td>{d.dataPointCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => set({ pagina: String(p) })} />
          </>
        )}
      </Panel>
    </>
  );
}

/** Pontos de dado: ponto → dispositivo → ativo, com valor, unidade, atualização e status. */
export function PointsPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Pontos de dado');
  const { values, page, set, key } = useUrlFilters(['status', 'busca'] as const);
  const [search, setSearch] = useState(values.busca);
  useEffect(() => setSearch(values.busca), [values.busca]);
  const query = useServiceQuery(
    () => services.monitor.listPoints(access, { status: (values.status || undefined) as DataPointStatus | undefined, search: values.busca || undefined, page, pageSize: PAGE_SIZE }),
    [key, access],
  );

  return (
    <>
      <PageHeader title="Pontos de dado" breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Pontos de dado' }]} description="Variáveis e sinais fornecidos pelos dispositivos. Valores simulados." />
      <MonitorNav />
      <Panel title={`Pontos${query.data ? ` (${query.data.total})` : ''}`} flush>
        <div className={t.tableHeading}>
          <form
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
            onSubmit={(e) => {
              e.preventDefault();
              set({ busca: search });
            }}
          >
            <select aria-label="Status do ponto" value={values.status} onChange={(e) => set({ status: e.target.value })} style={selectStyle}>
              <option value="">Todos os status</option>
              {(Object.keys(POINT_STATUS_LABEL) as DataPointStatus[]).map((s) => (
                <option key={s} value={s}>
                  {POINT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <input aria-label="Buscar pontos" type="search" placeholder="Ponto, dispositivo ou ativo" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...selectStyle, minWidth: 240 }} />
            <Button type="submit" size="small" variant="secondary" icon="search">
              Buscar
            </Button>
          </form>
        </div>
        {query.error ? (
          <QueryError error={query.error} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : query.data.items.length === 0 ? (
          <EmptyState compact icon="line-chart" title="Nenhum ponto encontrado." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Pontos de dado</caption>
                <thead>
                  <tr>
                    <th scope="col">Ponto</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Status</th>
                    <th scope="col">Atualização</th>
                    <th scope="col">Dispositivo</th>
                    <th scope="col">Ativo</th>
                    <th scope="col">Regras</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((p) => (
                    <tr key={p.point.id}>
                      <td>
                        <ContextLink to={monitorPaths.point(p.point.id)}>{p.point.name}</ContextLink>
                        <div className="helper">
                          <LocationPath path={p.locationPath} tail={2} />
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatValue(p.point.value, p.point.unit)}</td>
                      <td>
                        <DataPointStatusBadge value={p.point.status} />
                      </td>
                      <td title={formatDateTime(p.point.updatedAt)}>{p.collectionPaused ? <span className="helper">Coleta pausada</span> : formatRelative(p.point.updatedAt)}</td>
                      <td>
                        <ContextLink to={paths.device(p.device.id)}>{p.device.name}</ContextLink>
                      </td>
                      <td>{p.asset ? <ContextLink to={paths.asset(p.asset.id)}>{p.asset.tag}</ContextLink> : <span className="muted">—</span>}</td>
                      <td>{p.rules.filter((r) => r.active).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(n) => set({ pagina: String(n) })} />
          </>
        )}
      </Panel>
    </>
  );
}

/** Alertas técnicos gerados pelo Monitor (regras sobre telemetria e comunicação). */
export function MonitorAlertsPage() {
  const access = useAccess();
  const services = useServices();
  const { acknowledge, pending } = useAcknowledge();
  usePageLabel('Alertas técnicos');
  const { values, page, set, key } = useUrlFilters(['status'] as const);
  const query = useServiceQuery(
    () => services.monitor.listAlerts(access, { status: (values.status || undefined) as AlertStatus | undefined, page, pageSize: PAGE_SIZE }),
    [key, access],
  );
  return (
    <>
      <PageHeader title="Alertas técnicos" breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Alertas técnicos' }]} description="Alertas de infraestrutura gerados pelas regras de monitoramento. Os que afetam segurança também aparecem no Security Hub." />
      <MonitorNav />
      <Panel
        title={`Alertas${query.data ? ` (${query.data.total})` : ''}`}
        flush
        actions={
          <select aria-label="Status do alerta" value={values.status} onChange={(e) => set({ status: e.target.value })} style={{ ...selectStyle, minHeight: 28 }}>
            <option value="">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="reconhecido">Reconhecidos</option>
          </select>
        }
      >
        {query.error ? (
          <QueryError error={query.error} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : query.data.items.length === 0 ? (
          <EmptyState compact icon="bell-slash-o" title="Nenhum alerta técnico." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Alertas técnicos</caption>
                <thead>
                  <tr>
                    <th scope="col">Severidade</th>
                    <th scope="col">Alerta</th>
                    <th scope="col">Local</th>
                    <th scope="col">Ocorrido</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="visually-hidden">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map(({ event, locationPath, canAcknowledge, securityRelevant }) => (
                    <tr key={event.id}>
                      <td>
                        <SeverityBadge value={event.severity} />
                      </td>
                      <td style={{ minWidth: 240 }}>
                        <ContextLink to={paths.event(event.id)}>{event.title}</ContextLink>
                        <div className="helper">
                          {event.code} · {event.description}
                        </div>
                        {securityRelevant && <div className="helper">Impacto em segurança: {event.securityContext ?? 'sim'}</div>}
                      </td>
                      <td>
                        <LocationPath path={locationPath} tail={2} />
                      </td>
                      <td title={formatDateTime(event.occurredAt)}>{formatRelative(event.occurredAt)}</td>
                      <td>
                        <AlertStatusBadge value={event.status} />
                      </td>
                      <td>
                        {canAcknowledge && (
                          <Button size="small" variant="secondary" icon="check" loading={pending === event.id} onClick={() => acknowledge(event.id, event.title)}>
                            Reconhecer
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(n) => set({ pagina: String(n) })} />
          </>
        )}
      </Panel>
      {!can(access, 'monitor.manage') && <p className="helper" style={{ marginTop: 8 }}>Alertas técnicos sem impacto em segurança são reconhecidos por quem configura o monitoramento.</p>}
    </>
  );
}

/** Histórico/auditoria do Monitor: conectores, descobertas, regras e leituras simuladas. */
export function MonitorHistoryPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Histórico do Monitor');
  const { page, set, key } = useUrlFilters([] as const);
  const query = useServiceQuery(() => services.monitor.history(access, { page, pageSize: 15 }), [key, access]);
  return (
    <>
      <PageHeader title="Histórico" breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Histórico' }]} description="Auditoria de configuração (conectores, regras), descobertas e sinais simulados." />
      <MonitorNav />
      <Panel title="Registros" flush>
        {query.error ? (
          <QueryError error={query.error} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : query.data.items.length === 0 ? (
          <EmptyState compact icon="history" title="Nenhum registro no seu escopo." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Histórico do Monitor</caption>
                <thead>
                  <tr>
                    <th scope="col">Data/hora</th>
                    <th scope="col">Registro</th>
                    <th scope="col">Ator</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((h) => (
                    <tr key={h.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(h.at)}</td>
                      <td>{h.summary}</td>
                      <td>{h.actorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(n) => set({ pagina: String(n) })} />
          </>
        )}
      </Panel>
    </>
  );
}

