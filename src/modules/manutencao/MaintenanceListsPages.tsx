import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Paginator, Panel, tableStyles as t } from '@/components/ui';
import { REQUEST_STATUS_LABEL, WORK_ORDER_STATUS_LABEL, type RequestStatus, type WorkOrderStatus } from '@/domain';
import { MODULES } from '@/modules/registry';
import { isServiceError } from '@/services';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { OrderRows, RequestRows } from './MaintenanceHomePage';
import { MaintenanceNav, maintenancePaths } from './shared';

const PAGE_SIZE = 10;
const selectStyle = { minHeight: 32, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' } as const;

/** Filtros na URL (preservados ao voltar de um detalhe). */
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

function SearchBar({ status, statusOptions, search, onStatus, onSearch, extra, placeholder }: {
  status: string;
  statusOptions: { value: string; label: string }[];
  search: string;
  onStatus: (v: string) => void;
  onSearch: (v: string) => void;
  extra?: React.ReactNode;
  placeholder: string;
}) {
  const [text, setText] = useState(search);
  useEffect(() => setText(search), [search]);
  return (
    <div className={t.tableHeading}>
      <form
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(text);
        }}
      >
        <select aria-label="Status" value={status} onChange={(e) => onStatus(e.target.value)} style={selectStyle}>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {extra}
        <input aria-label="Buscar" type="search" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} style={{ ...selectStyle, minWidth: 240 }} />
        <Button type="submit" size="small" variant="secondary" icon="search">
          Buscar
        </Button>
      </form>
    </div>
  );
}

export function RequestsListPage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  usePageLabel('Solicitações de manutenção');
  const perm = services.maintenance.permissions(access);
  const { values, page, set, key } = useUrlFilters(['status', 'busca', 'minhas'] as const);
  const { activeLocationId } = useSession();
  const query = useServiceQuery(
    () =>
      services.maintenance.listRequests(access, {
        status: (values.status || undefined) as RequestStatus | 'pendentes' | undefined,
        search: values.busca || undefined,
        mine: values.minhas === '1',
        locationId: activeLocationId ?? undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [key, access, activeLocationId],
  );
  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'pendentes', label: 'Pendentes (aberta ou em triagem)' },
    ...(Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => ({ value: s, label: REQUEST_STATUS_LABEL[s] })),
  ];

  return (
    <>
      <PageHeader
        title="Solicitações"
        breadcrumb={[{ label: MODULES.manutencao.name, to: maintenancePaths.overview }, { label: 'Solicitações' }]}
        description="Pedidos de intervenção. A triagem decide: converter em OS, resolver sem OS, rejeitar, marcar como duplicada ou redirecionar para destino externo."
        actions={
          perm.request ? (
            <Button icon="plus" onClick={() => navigate(maintenancePaths.newRequest())}>
              Nova solicitação
            </Button>
          ) : undefined
        }
      />
      <MaintenanceNav />
      <Panel title={`Solicitações${query.data ? ` (${query.data.total})` : ''}`} flush>
        <SearchBar
          status={values.status}
          statusOptions={statusOptions}
          search={values.busca}
          onStatus={(v) => set({ status: v })}
          onSearch={(v) => set({ busca: v })}
          placeholder="Código, título, ativo"
          extra={
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
              <input type="checkbox" checked={values.minhas === '1'} onChange={(e) => set({ minhas: e.target.checked ? '1' : '' })} /> Somente minhas
            </label>
          }
        />
        {query.error ? (
          <ErrorState compact kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : query.data.items.length === 0 ? (
          <EmptyState compact icon="inbox" title="Nenhuma solicitação encontrada." text="Ajuste os filtros ou abra uma nova solicitação." />
        ) : (
          <>
            <RequestRows items={query.data.items} />
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => set({ pagina: String(p) })} />
          </>
        )}
      </Panel>
    </>
  );
}

export function WorkOrdersListPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Ordens de serviço');
  const { values, page, set, key } = useUrlFilters(['status', 'busca'] as const);
  const { activeLocationId } = useSession();
  const query = useServiceQuery(
    () =>
      services.maintenance.listWorkOrders(access, {
        status: (values.status || undefined) as WorkOrderStatus | 'ativas' | undefined,
        search: values.busca || undefined,
        locationId: activeLocationId ?? undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [key, access, activeLocationId],
  );
  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'ativas', label: 'Ativas (não encerradas nem canceladas)' },
    ...(Object.keys(WORK_ORDER_STATUS_LABEL) as WorkOrderStatus[]).map((s) => ({ value: s, label: WORK_ORDER_STATUS_LABEL[s] })),
  ];

  return (
    <>
      <PageHeader
        title="Ordens de serviço"
        breadcrumb={[{ label: MODULES.manutencao.name, to: maintenancePaths.overview }, { label: 'Ordens de serviço' }]}
        description="Trabalho autorizado e planejado. O técnico conclui a execução; o gestor valida e encerra a OS (DP-47)."
      />
      <MaintenanceNav />
      <Panel title={`Ordens de serviço${query.data ? ` (${query.data.total})` : ''}`} flush>
        <SearchBar
          status={values.status}
          statusOptions={statusOptions}
          search={values.busca}
          onStatus={(v) => set({ status: v })}
          onSearch={(v) => set({ busca: v })}
          placeholder="Código, título, ativo"
        />
        {query.error ? (
          <ErrorState compact kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : query.data.items.length === 0 ? (
          <EmptyState compact icon="wrench" title="Nenhuma ordem de serviço encontrada." text="OS nascem da conversão de solicitações na triagem." />
        ) : (
          <>
            <OrderRows items={query.data.items} />
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => set({ pagina: String(p) })} />
          </>
        )}
      </Panel>
    </>
  );
}
