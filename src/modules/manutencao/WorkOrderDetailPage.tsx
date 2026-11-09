import { useParams } from 'react-router-dom';
import { Alert, Button, Col, EmptyState, Grid, LabelValue, LabelValueGrid, PageHeader, Panel, Stack } from '@/components/ui';
import { LocationPath, formatDateTime } from '@/components/domain';
import { MODULES } from '@/modules/registry';
import type { WorkOrderDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { useOrderActions } from './orderActions';
import {
  ExecutionStatusBadge,
  HistoryPanel,
  MaintenanceNav,
  PriorityBadge,
  ProvisionalTag,
  RequestStatusBadge,
  WorkOrderStatusBadge,
  formatDate,
  formatDuration,
  maintenancePaths,
  maintenanceStyles as s,
} from './shared';

export function WorkOrderDetailPage() {
  const { orderId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.maintenance.getWorkOrder(access, orderId), [orderId, access]);
  usePageLabel(query.data ? `OS ${query.data.order.code}` : 'Ordem de serviço');
  return (
    <>
      <PageHeader
        title={query.data ? `${query.data.order.code} — ${query.data.order.title}` : 'Ordem de serviço'}
        breadcrumb={[
          { label: MODULES.manutencao.name, to: maintenancePaths.overview },
          { label: 'Ordens de serviço', to: maintenancePaths.orders },
          { label: query.data?.order.code ?? '…' },
        ]}
      />
      <MaintenanceNav />
      <QueryBoundary query={query} moduleId="manutencao">
        {(d) => <OrderView d={d} />}
      </QueryBoundary>
    </>
  );
}

function OrderView({ d }: { d: WorkOrderDetail }) {
  const o = d.order;
  const a = d.actions;
  const { setDialog, busy, start, submit, resume, dialogs } = useOrderActions(d);
  const openSuspension = o.suspensions.find((x) => !x.endedAt);

  return (
    <Stack>
      {o.status === 'suspensa' && openSuspension && (
        <Alert tone="warning" title="OS suspensa">
          Desde {formatDateTime(openSuspension.startedAt)}. Justificativa: {openSuspension.reason}
        </Alert>
      )}
      {o.cancellation && (
        <Alert tone="info" title={o.cancellation.hadPartialWork ? 'Cancelada com trabalho parcial' : 'Cancelada sem execução'}>
          {o.cancellation.reason} — {formatDateTime(o.cancellation.at)}. {o.cancellation.hadPartialWork && 'Execuções e evidências foram preservadas.'}
        </Alert>
      )}
      {d.openImpediments > 0 && a.suspend && (
        <Alert tone="warning" title="Impedimento registrado pelo técnico">
          {o.impediments.filter((i) => !i.handled).map((i) => i.description).join(' · ')} — avalie a suspensão da OS.
        </Alert>
      )}

      <div className={s.actionsBar}>
        {a.plan && (
          <Button icon="calendar" onClick={() => setDialog('planejar')}>
            {o.status === 'planejada' ? 'Replanejar' : 'Planejar'}
          </Button>
        )}
        {a.startExecution && (
          <Button icon="play" loading={busy === 'start'} onClick={start}>
            Iniciar execução
          </Button>
        )}
        {a.myRunningExecutionId && (
          <Button icon="check" onClick={() => setDialog('concluir-execucao')}>
            Concluir execução
          </Button>
        )}
        {a.submitForClosure && (
          <Button icon="paper-plane" loading={busy === 'submit'} onClick={submit}>
            Enviar para encerramento
          </Button>
        )}
        {a.registerImpediment && (
          <Button variant="secondary" icon="exclamation-circle" onClick={() => setDialog('impedimento')}>
            Registrar impedimento
          </Button>
        )}
        {a.close && (
          <Button icon="flag-checkered" onClick={() => setDialog('encerrar')}>
            Encerrar OS
          </Button>
        )}
        {a.returnToExecution && (
          <Button variant="secondary" icon="undo" onClick={() => setDialog('devolver')}>
            Devolver para execução
          </Button>
        )}
        {a.suspend && (
          <Button variant="secondary" icon="pause" onClick={() => setDialog('suspender')}>
            Suspender
          </Button>
        )}
        {a.resume && (
          <Button icon="play" loading={busy === 'resume'} onClick={resume}>
            Retomar
          </Button>
        )}
        {a.interruptExecution && (
          <Button variant="secondary" icon="stop" onClick={() => setDialog('interromper')}>
            Interromper execução
          </Button>
        )}
        {a.cancel && (
          <Button variant="link" icon="ban" onClick={() => setDialog('cancelar')}>
            Cancelar OS
          </Button>
        )}
      </div>
      {(a.suspendBlockedReason || a.cancelBlockedReason) && <p className="helper">{a.suspendBlockedReason ?? a.cancelBlockedReason}</p>}

      <Grid>
        <Col span={8}>
          <Stack>
            <Panel title="Ordem de serviço">
              <LabelValueGrid>
                <LabelValue label="Status">
                  <span className={s.badges}>
                    <WorkOrderStatusBadge value={o.status} />
                    {d.overdue && <span className="helper" style={{ color: 'var(--sds-red)' }}>Atrasada</span>}
                  </span>
                </LabelValue>
                <LabelValue label="Prioridade">
                  <PriorityBadge value={o.priority} />
                </LabelValue>
                <LabelValue label="Técnico">{d.technicianName ?? 'Não atribuído'}</LabelValue>
                <LabelValue label="Data prevista">{formatDate(o.plannedDate)}</LabelValue>
                <LabelValue label="Criada por">
                  {d.createdByName} · {formatDateTime(o.createdAt)}
                </LabelValue>
                <LabelValue label="Local">
                  <LocationPath path={d.locationPath} />
                </LabelValue>
                <LabelValue label="Ativo">
                  {d.asset ? (
                    <ContextLink to={paths.asset(d.asset.id)}>
                      {d.asset.tag} — {d.asset.name}
                    </ContextLink>
                  ) : (
                    'Não informado'
                  )}
                </LabelValue>
                <LabelValue label="Solicitações atendidas">
                  {d.requests.map((r) => (
                    <div key={r.id} className={s.badges}>
                      <ContextLink to={maintenancePaths.request(r.id)}>{r.code}</ContextLink>
                      <RequestStatusBadge value={r.status} />
                    </div>
                  ))}
                </LabelValue>
                {o.closure && (
                  <LabelValue label="Encerramento">
                    {o.closure.note} · {formatDateTime(o.closure.at)}
                  </LabelValue>
                )}
              </LabelValueGrid>
              <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{o.description}</p>
            </Panel>

            <Panel title={`Execuções (${d.executions.length})`} flush>
              {d.executions.length === 0 ? (
                <EmptyState compact icon="cogs" title="Nenhuma execução iniciada." text="O técnico atribuído inicia a execução pela OS ou pela visão móvel." />
              ) : (
                d.executions.map(({ execution: e, technicianName }) => (
                  <div key={e.id} className={s.execution}>
                    <div className={s.badges}>
                      <ExecutionStatusBadge value={e.status} />
                      {e.status === 'interrompida' && <ProvisionalTag code="P-51">Hipótese</ProvisionalTag>}
                      <strong>{technicianName}</strong>
                      <span className="helper">
                        {formatDateTime(e.startedAt)}
                        {e.endedAt ? ` → ${formatDateTime(e.endedAt)}` : ' → em andamento'}
                      </span>
                    </div>
                    {e.workNotes && <p style={{ margin: '6px 0 0' }}>{e.workNotes}</p>}
                    {e.interruption && <p className="helper">Interrompida: {e.interruption.reason}</p>}
                    {e.evidences.length > 0 && (
                      <div className={s.evidenceList}>
                        {e.evidences.map((ev) => (
                          <span key={ev.id} className={s.evidence}>
                            {ev.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </Panel>

            <Panel title="Tempo da OS">
              <LabelValueGrid>
                <LabelValue label="Tempo total">{formatDuration(d.time.totalMs)}</LabelValue>
                <LabelValue label="Tempo suspenso">{formatDuration(d.time.suspendedMs)}</LabelValue>
                <LabelValue label="Tempo líquido">{formatDuration(d.time.netMs)}</LabelValue>
              </LabelValueGrid>
              <p className="helper" style={{ marginTop: 8 }}>
                Registro informativo. Nenhum desconto de SLA é aplicado até a regra de SLA ser definida.
              </p>
              {o.suspensions.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {o.suspensions.map((x) => (
                    <li key={x.startedAt} className="helper">
                      {formatDateTime(x.startedAt)} → {x.endedAt ? formatDateTime(x.endedAt) : 'em curso'} · {x.reason}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </Stack>
        </Col>
        <Col span={4}>
          <HistoryPanel items={d.history} />
        </Col>
      </Grid>
      {dialogs}
    </Stack>
  );
}
