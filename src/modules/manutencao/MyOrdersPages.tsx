import { Link, useParams } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Icon, Panel } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { useOrderActions } from './orderActions';
import { ExecutionStatusBadge, PriorityBadge, WorkOrderStatusBadge, formatDate, maintenancePaths, maintenanceStyles as s } from './shared';

/**
 * Experiência móvel DEMONSTRATIVA de "Minhas OS" (Q-09, D-013): online, na
 * aplicação GRS, sem o app de Gestão de Rotinas. Não define tecnologia nativa
 * nem arquitetura mobile; offline é evolução futura.
 */
function MobileBanner() {
  return (
    <div className={s.mobileBanner} role="note">
      <Icon name="mobile" />
      <span>
        Visão móvel demonstrativa da execução de OS. Requer conexão com a internet.
      </span>
    </div>
  );
}

export function MyOrdersPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Minhas OS');
  const perm = services.maintenance.permissions(access);
  const query = useServiceQuery(() => services.maintenance.listWorkOrders(access, { mine: true, status: 'ativas', pageSize: 50 }), [access]);

  if (!perm.execute) {
    return (
      <Panel title="Minhas OS">
        <ErrorState kind={403} text="Seu perfil não executa ordens de serviço." />
      </Panel>
    );
  }

  return (
    <div className={s.mobile}>
      <h1 style={{ fontSize: 22, margin: '4px 0' }}>Minhas OS</h1>
      <MobileBanner />
      <QueryBoundary query={query} moduleId="manutencao">
        {(page) =>
          page.items.length === 0 ? (
            <EmptyState icon="check" title="Nenhuma OS ativa atribuída a você." />
          ) : (
            <>
              {page.items.map(({ order: o, asset, locationPath, overdue }) => (
                <Link key={o.id} to={maintenancePaths.myOrder(o.id)} className={s.card}>
                  <div className={s.badges}>
                    <strong>{o.code}</strong>
                    <WorkOrderStatusBadge value={o.status} />
                    <PriorityBadge value={o.priority} />
                    {overdue && <span style={{ color: 'var(--sds-red)', fontSize: 12, fontWeight: 600 }}>Atrasada</span>}
                  </div>
                  <div className={s.cardTitle}>{o.title}</div>
                  <div className={s.cardMeta}>
                    <Icon name="map-marker" /> {locationPath.map((l) => l.name).slice(-2).join(' › ')}
                    {asset && (
                      <>
                        {' · '}
                        <Icon name="cube" /> {asset.tag}
                      </>
                    )}
                  </div>
                  <div className={s.cardMeta}>
                    <Icon name="calendar" /> Previsão {formatDate(o.plannedDate)}
                  </div>
                </Link>
              ))}
            </>
          )
        }
      </QueryBoundary>
      <Link to={maintenancePaths.overview} className="helper" style={{ textAlign: 'center' }}>
        Ir para a visão completa da Manutenção
      </Link>
    </div>
  );
}

export function MyOrderPage() {
  const { orderId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.maintenance.getWorkOrder(access, orderId), [orderId, access]);
  usePageLabel(query.data ? `OS ${query.data.order.code} (móvel)` : 'OS');
  const { setDialog, busy, start, submit, dialogs } = useOrderActions(query.data);

  return (
    <div className={s.mobile}>
      <Link to={maintenancePaths.myOrders} className="helper">
        <Icon name="chevron-left" /> Minhas OS
      </Link>
      <QueryBoundary query={query} moduleId="manutencao">
        {(d) => {
          const o = d.order;
          const a = d.actions;
          const running = d.executions.find((x) => x.execution.status === 'em-andamento');
          return (
            <>
              <div>
                <div className={s.badges}>
                  <strong>{o.code}</strong>
                  <WorkOrderStatusBadge value={o.status} />
                  <PriorityBadge value={o.priority} />
                </div>
                <h1 style={{ fontSize: 20, margin: '8px 0 4px' }}>{o.title}</h1>
                <div className={s.cardMeta}>
                  <Icon name="map-marker" /> {d.locationPath.map((l) => l.name).join(' › ')}
                </div>
                {d.asset && (
                  <div className={s.cardMeta}>
                    <Icon name="cube" /> {d.asset.tag} — {d.asset.name}
                  </div>
                )}
                <div className={s.cardMeta}>
                  <Icon name="calendar" /> Previsão {formatDate(o.plannedDate)}
                </div>
              </div>
              <MobileBanner />

              <div className={s.bigActions}>
                {a.startExecution && (
                  <Button block icon="play" loading={busy === 'start'} onClick={start}>
                    {d.executions.length ? 'Iniciar nova execução' : 'Iniciar execução'}
                  </Button>
                )}
                {a.myRunningExecutionId && (
                  <Button block icon="check" onClick={() => setDialog('concluir-execucao')}>
                    Concluir execução
                  </Button>
                )}
                {a.submitForClosure && (
                  <Button block icon="paper-plane" loading={busy === 'submit'} onClick={submit}>
                    Trabalho finalizado — enviar para encerramento
                  </Button>
                )}
                {a.registerImpediment && (
                  <Button block variant="secondary" icon="exclamation-circle" onClick={() => setDialog('impedimento')}>
                    Registrar impedimento
                  </Button>
                )}
                {o.status === 'aguardando-encerramento' && <p className="helper">Aguardando validação e encerramento pelo gestor.</p>}
                {o.status === 'suspensa' && <p className="helper">OS suspensa pelo gestor. Aguarde a retomada.</p>}
              </div>

              {running && (
                <div className={s.section}>
                  <h2 className={s.sectionTitle}>Execução em andamento</h2>
                  <div className="helper">Iniciada em {formatDateTime(running.execution.startedAt)}</div>
                </div>
              )}

              <div className={s.section}>
                <h2 className={s.sectionTitle}>Descrição</h2>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{o.description}</p>
              </div>

              {d.executions.length > 0 && (
                <div className={s.section}>
                  <h2 className={s.sectionTitle}>Execuções</h2>
                  {d.executions.map(({ execution: e }) => (
                    <div key={e.id} style={{ marginBottom: 10 }}>
                      <div className={s.badges}>
                        <ExecutionStatusBadge value={e.status} />
                        <span className="helper">{formatDateTime(e.startedAt)}</span>
                      </div>
                      {e.workNotes && <p style={{ margin: '4px 0 0' }}>{e.workNotes}</p>}
                      {e.evidences.length > 0 && (
                        <div className={s.evidenceList}>
                          {e.evidences.map((ev) => (
                            <span key={ev.id} className={s.evidence}>
                              <Icon name="camera" /> {ev.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Link to={maintenancePaths.order(o.id)} className="helper" style={{ textAlign: 'center' }}>
                Abrir na visão completa
              </Link>
              {dialogs}
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
