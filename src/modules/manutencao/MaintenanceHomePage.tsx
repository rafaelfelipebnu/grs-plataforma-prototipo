import { useNavigate } from 'react-router-dom';
import { Alert, Button, EmptyState, PageHeader, Panel, StatsCard, Stack, tableStyles as t } from '@/components/ui';
import { LocationPath, formatRelative } from '@/components/domain';
import { MODULES } from '@/modules/registry';
import type { RequestListItem, WorkOrderListItem } from '@/services';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { MaintenanceNav, PriorityBadge, RequestStatusBadge, WorkOrderStatusBadge, formatDate, maintenancePaths, maintenanceStyles as s } from './shared';

/** Visão geral da Gestão de Manutenção: filas de trabalho por papel. */
export function MaintenanceHomePage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  usePageLabel('Gestão de Manutenção');
  const perm = services.maintenance.permissions(access);
  const { activeLocationId } = useSession();
  const contextPath = activeLocationId ? services.locations.pathOf(access, activeLocationId) : [];
  const query = useServiceQuery(() => services.maintenance.overview(access, { locationId: activeLocationId ?? undefined }), [access, activeLocationId]);

  return (
    <>
      <PageHeader
        title={MODULES.manutencao.name}
        description="Solicitação, ordem de serviço e execução são registros distintos: a triagem decide o destino da solicitação, o técnico executa e o gestor encerra a OS."
        actions={
          perm.request ? (
            <Button icon="plus" onClick={() => navigate(maintenancePaths.newRequest())}>
              Nova solicitação
            </Button>
          ) : undefined
        }
      />
      <MaintenanceNav />
      <QueryBoundary query={query} moduleId="manutencao">
        {(o) => (
          <Stack>
            <p className="helper" style={{ margin: 0 }}>
              Contexto de localização ativo:{' '}
              {contextPath.length > 0 ? <LocationPath path={contextPath} icon={false} /> : 'todas as localizações do seu escopo'}. Indicadores e filas consideram este recorte.
            </p>
            <div className={s.kpis}>
              <StatsCard icon="inbox" title="Solicitações abertas" value={o.requestsByStatus.aberta} tone="blue" onClick={() => navigate(`${maintenancePaths.requests}?status=aberta`)} />
              <StatsCard icon="filter" title="Em triagem" value={o.requestsByStatus['em-triagem']} tone="yellow" onClick={() => navigate(`${maintenancePaths.requests}?status=em-triagem`)} />
              <StatsCard icon="calendar" title="OS planejadas" value={o.ordersByStatus.planejada} onClick={() => navigate(`${maintenancePaths.orders}?status=planejada`)} />
              <StatsCard icon="cogs" title="OS em execução" value={o.ordersByStatus['em-execucao']} tone="yellow" onClick={() => navigate(`${maintenancePaths.orders}?status=em-execucao`)} />
              <StatsCard icon="pause-circle-o" title="OS suspensas" value={o.ordersByStatus.suspensa} tone="orange" onClick={() => navigate(`${maintenancePaths.orders}?status=suspensa`)} />
              <StatsCard icon="check-square-o" title="Aguardando encerramento" value={o.ordersByStatus['aguardando-encerramento']} tone="yellow" onClick={() => navigate(`${maintenancePaths.orders}?status=aguardando-encerramento`)} />
              <StatsCard icon="clock-o" title="OS atrasadas" value={o.overdueOrders} tone={o.overdueOrders ? 'red' : 'default'} onClick={() => navigate(`${maintenancePaths.orders}?status=ativas`)} />
            </div>

            {perm.triage && (
              <RequestTable
                title={`Fila de triagem (${o.triageQueue.length})`}
                items={o.triageQueue}
                empty="Nenhuma solicitação aguardando triagem."
              />
            )}
            {perm.manageOrders && o.awaitingClosure.length > 0 && <OrderTable title={`Aguardando encerramento (${o.awaitingClosure.length})`} items={o.awaitingClosure} />}
            {perm.manageOrders && o.withImpediments.length > 0 && <OrderTable title={`Impedimentos registrados pelo técnico (${o.withImpediments.length})`} items={o.withImpediments} />}
            {perm.execute && (
              <Panel
                title={`Minhas OS (${o.myOrders.length})`}
                actions={
                  <Button size="small" variant="secondary" icon="mobile" onClick={() => navigate(maintenancePaths.myOrders)}>
                    Abrir visão móvel
                  </Button>
                }
                flush
              >
                {o.myOrders.length === 0 ? <EmptyState compact icon="wrench" title="Nenhuma OS ativa atribuída a você." /> : <OrderRows items={o.myOrders} />}
              </Panel>
            )}
            {perm.request && (
              <RequestTable title="Minhas solicitações recentes" items={o.myRequests} empty="Você ainda não abriu solicitações." />
            )}
            {!perm.triage && !perm.execute && (
              <Alert tone="info">Seu perfil abre e acompanha solicitações. Triagem, planejamento e encerramento de OS são feitos pela equipe de manutenção.</Alert>
            )}
          </Stack>
        )}
      </QueryBoundary>
    </>
  );
}

export function RequestTable({ title, items, empty }: { title: string; items: RequestListItem[]; empty: string }) {
  return (
    <Panel title={title} flush>
      {items.length === 0 ? <EmptyState compact icon="inbox" title={empty} /> : <RequestRows items={items} />}
    </Panel>
  );
}

export function RequestRows({ items }: { items: RequestListItem[] }) {
  return (
        <div className={t.tableWrap}>
          <table className={t.table}>
            <caption className="visually-hidden">Solicitações</caption>
            <thead>
              <tr>
                <th scope="col">Solicitação</th>
                <th scope="col">Ativo / local</th>
                <th scope="col">Prioridade</th>
                <th scope="col">Status</th>
                <th scope="col">Aberta</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ request: r, asset, locationPath, requesterName, workOrder, awaitingTriageDecision }) => (
                <tr key={r.id}>
                  <td style={{ minWidth: 220 }}>
                    <ContextLink to={maintenancePaths.request(r.id)}>{r.code}</ContextLink> — {r.title}
                    <div className="helper">por {requesterName}</div>
                  </td>
                  <td>
                    {asset ? `${asset.tag} · ` : ''}
                    <span className="muted">{locationPath[locationPath.length - 1]?.name}</span>
                  </td>
                  <td>
                    <PriorityBadge value={r.definedPriority ?? r.perceivedPriority} />
                    <div className="helper">{r.definedPriority ? 'definida' : 'percebida'}</div>
                  </td>
                  <td>
                    <div className={s.badges}>
                      <RequestStatusBadge value={r.status} />
                      {workOrder && <WorkOrderStatusBadge value={workOrder.status} />}
                    </div>
                    {awaitingTriageDecision && <div className="helper">OS cancelada — decisão da triagem pendente</div>}
                  </td>
                  <td>{formatRelative(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  );
}

export function OrderRows({ items }: { items: WorkOrderListItem[] }) {
  return (
    <div className={t.tableWrap}>
      <table className={t.table}>
        <caption className="visually-hidden">Ordens de serviço</caption>
        <thead>
          <tr>
            <th scope="col">OS</th>
            <th scope="col">Ativo / local</th>
            <th scope="col">Prioridade</th>
            <th scope="col">Status</th>
            <th scope="col">Técnico</th>
            <th scope="col">Previsão</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ order: o, asset, locationPath, technicianName, overdue, openImpediments }) => (
            <tr key={o.id}>
              <td style={{ minWidth: 220 }}>
                <ContextLink to={maintenancePaths.order(o.id)}>{o.code}</ContextLink> — {o.title}
              </td>
              <td>
                {asset ? `${asset.tag} · ` : ''}
                <span className="muted">{locationPath[locationPath.length - 1]?.name}</span>
              </td>
              <td>
                <PriorityBadge value={o.priority} />
              </td>
              <td>
                <div className={s.badges}>
                  <WorkOrderStatusBadge value={o.status} />
                  {overdue && <span className="helper" style={{ color: 'var(--sds-red)' }}>Atrasada</span>}
                  {openImpediments > 0 && <span className="helper">Impedimento registrado</span>}
                </div>
              </td>
              <td>{technicianName ?? <span className="muted">Não atribuído</span>}</td>
              <td>{formatDate(o.plannedDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderTable({ title, items }: { title: string; items: WorkOrderListItem[] }) {
  return (
    <Panel title={title} flush>
      <OrderRows items={items} />
    </Panel>
  );
}
