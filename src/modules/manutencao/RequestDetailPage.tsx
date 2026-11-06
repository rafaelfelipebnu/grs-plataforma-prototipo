import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Col, Grid, LabelValue, LabelValueGrid, PageHeader, Panel, SelectField, Stack, TextField, useToast } from '@/components/ui';
import { LocationPath, formatDateTime } from '@/components/domain';
import { MAINTENANCE_PRIORITY_LABEL, REDIRECT_KIND_LABEL, type MaintenancePriority } from '@/domain';
import { MODULES } from '@/modules/registry';
import { ReasonModal } from '@/modules/central/shared';
import type { RequestDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, useContextNavigation, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import {
  ActionModal,
  HistoryPanel,
  MaintenanceNav,
  PRIORITY_OPTIONS,
  PriorityBadge,
  ProvisionalTag,
  RequestStatusBadge,
  TextArea,
  WorkOrderStatusBadge,
  maintenancePaths,
  maintenanceStyles as s,
} from './shared';

type Dialog = 'editar' | 'cancelar' | 'converter' | 'resolver' | 'rejeitar' | 'duplicada' | 'redirecionar' | 'retomar' | null;

export function RequestDetailPage() {
  const { requestId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.maintenance.getRequest(access, requestId), [requestId, access]);
  usePageLabel(query.data ? `Solicitação ${query.data.request.code}` : 'Solicitação');

  return (
    <>
      <PageHeader
        title={query.data ? `${query.data.request.code} — ${query.data.request.title}` : 'Solicitação'}
        breadcrumb={[
          { label: MODULES.manutencao.name, to: maintenancePaths.overview },
          { label: 'Solicitações', to: maintenancePaths.requests },
          { label: query.data?.request.code ?? '…' },
        ]}
      />
      <MaintenanceNav />
      <QueryBoundary query={query} moduleId="manutencao">
        {(d) => <RequestView d={d} />}
      </QueryBoundary>
    </>
  );
}

function RequestView({ d }: { d: RequestDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const { navigateWithContext } = useContextNavigation();
  const r = d.request;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const close = () => setDialog(null);
  const ok = (title: string, message?: string) => {
    toast.show({ tone: 'success', title, message });
    close();
  };

  const startTriage = async () => {
    setBusy(true);
    try {
      await services.maintenance.startTriage(access, r.id);
      toast.show({ tone: 'success', title: 'Triagem assumida', message: `${r.code} agora está Em triagem com você.` });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Não foi possível assumir a triagem', message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack>
      {d.awaitingTriageDecision && (
        <Alert tone="warning" title="OS vinculada cancelada">
          A {d.workOrder?.code} foi cancelada. A solicitação <strong>não</strong> foi cancelada automaticamente e continua "Convertida em OS" até a triagem decidir (DP-50).
          {d.actions.resumeTriage ? ' Use "Retomar triagem" para converter em nova OS, resolver sem OS ou rejeitar.' : ''}
        </Alert>
      )}
      <div className={s.actionsBar}>
        {d.actions.startTriage && (
          <Button icon="filter" loading={busy} onClick={startTriage}>
            Assumir triagem
          </Button>
        )}
        {d.actions.decide && (
          <>
            <Button icon="wrench" onClick={() => setDialog('converter')}>
              Converter em OS
            </Button>
            <Button variant="secondary" icon="check" onClick={() => setDialog('resolver')}>
              Resolver sem OS
            </Button>
            <Button variant="secondary" icon="clone" onClick={() => setDialog('duplicada')}>
              Marcar duplicada
            </Button>
            <Button variant="secondary" icon="share" onClick={() => setDialog('redirecionar')}>
              Redirecionar
            </Button>
            <Button variant="danger" icon="ban" onClick={() => setDialog('rejeitar')}>
              Rejeitar
            </Button>
          </>
        )}
        {d.actions.resumeTriage && (
          <Button icon="undo" onClick={() => setDialog('retomar')}>
            Retomar triagem
          </Button>
        )}
        {d.actions.edit && (
          <Button variant="secondary" icon="pencil" onClick={() => setDialog('editar')}>
            Editar
          </Button>
        )}
        {d.actions.cancel && (
          <Button variant="link" icon="times" onClick={() => setDialog('cancelar')}>
            Cancelar solicitação
          </Button>
        )}
        {r.status === 'aberta' && !d.actions.edit && !d.actions.startTriage && (
          <span className="helper">Aguardando triagem pela equipe de manutenção.</span>
        )}
      </div>

      <Grid>
        <Col span={8}>
          <Stack>
            <Panel title="Solicitação">
              <LabelValueGrid>
                <LabelValue label="Status">
                  <RequestStatusBadge value={r.status} />
                </LabelValue>
                <LabelValue label="Prioridade percebida">
                  <PriorityBadge value={r.perceivedPriority} />
                </LabelValue>
                <LabelValue label="Prioridade definida">{r.definedPriority ? <PriorityBadge value={r.definedPriority} /> : 'Definida na triagem'}</LabelValue>
                <LabelValue label="Solicitante">{d.requesterName}</LabelValue>
                <LabelValue label="Aberta em">{formatDateTime(r.createdAt)}</LabelValue>
                <LabelValue label="Origem">{r.origin === 'painel-ativo' ? 'Painel 360º do ativo' : 'Abertura manual'}</LabelValue>
                <LabelValue label="Triagem">{d.triageName ?? '—'}</LabelValue>
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
              </LabelValueGrid>
              <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{r.description}</p>
            </Panel>

            <Outcome d={d} />
          </Stack>
        </Col>
        <Col span={4}>
          <HistoryPanel items={d.history} />
        </Col>
      </Grid>

      <EditModal open={dialog === 'editar'} d={d} onClose={close} onDone={() => ok('Solicitação atualizada')} />
      <ReasonModal
        open={dialog === 'cancelar'}
        title="Cancelar solicitação"
        confirmLabel="Cancelar solicitação"
        destructive
        onCancel={close}
        onConfirm={async (reason) => {
          await services.maintenance.cancelRequest(access, r.id, reason);
          ok('Solicitação cancelada', r.code);
        }}
      >
        <p className="helper">Permitido enquanto a solicitação está Aberta (DP-40). O cancelamento fica no histórico.</p>
      </ReasonModal>
      <ConvertModal
        open={dialog === 'converter'}
        d={d}
        onClose={close}
        onDone={(code, id) => {
          ok(`OS ${code} criada`, 'A solicitação foi convertida. Planeje a OS para atribuir técnico e data.');
          navigateWithContext(maintenancePaths.order(id));
        }}
      />
      <ResolveModal open={dialog === 'resolver'} d={d} onClose={close} onDone={() => ok('Solicitação resolvida sem OS', 'O solicitante foi avisado.')} />
      <ReasonModal
        open={dialog === 'rejeitar'}
        title="Rejeitar solicitação"
        label="Justificativa"
        confirmLabel="Rejeitar"
        destructive
        onCancel={close}
        onConfirm={async (reason) => {
          await services.maintenance.rejectRequest(access, r.id, reason);
          ok('Solicitação rejeitada', 'O solicitante foi avisado.');
        }}
      />
      <DuplicateModal open={dialog === 'duplicada'} d={d} onClose={close} onDone={() => ok('Marcada como duplicada')} />
      <RedirectModal open={dialog === 'redirecionar'} d={d} onClose={close} onDone={() => ok('Solicitação redirecionada', 'Nenhum registro é criado no destino externo.')} />
      <ReasonModal
        open={dialog === 'retomar'}
        title="Retomar triagem"
        confirmLabel="Retomar triagem"
        onCancel={close}
        onConfirm={async (reason) => {
          await services.maintenance.resumeTriage(access, r.id, reason);
          ok('Triagem retomada', `${r.code} voltou para Em triagem. O histórico da OS cancelada é preservado.`);
        }}
      >
        <p className="helper">
          Decisão manual e autorizada (DP-50). <ProvisionalTag code="P-56">Permissão provisória</ProvisionalTag>
        </p>
      </ReasonModal>
    </Stack>
  );
}

/** Desfecho da triagem e relações com OS / outras solicitações. */
function Outcome({ d }: { d: RequestDetail }) {
  const r = d.request;
  const rows: JSX.Element[] = [];
  if (d.workOrder) {
    rows.push(
      <LabelValue key="os" label="Ordem de serviço">
        <span className={s.badges}>
          <ContextLink to={maintenancePaths.order(d.workOrder.id)}>{d.workOrder.code}</ContextLink>
          <WorkOrderStatusBadge value={d.workOrder.status} />
        </span>
        <div className="helper">A solicitação exibe o status da OS, mas não muda com ele.</div>
      </LabelValue>,
    );
  }
  if (d.cancelledWorkOrders.length) {
    rows.push(
      <LabelValue key="osc" label="OS anteriores (canceladas)">
        {d.cancelledWorkOrders.map((o) => (
          <div key={o.id}>
            <ContextLink to={maintenancePaths.order(o.id)}>{o.code}</ContextLink> — cancelada
          </div>
        ))}
      </LabelValue>,
    );
  }
  if (d.duplicateOf) {
    rows.push(
      <LabelValue key="dup" label="Duplicada de">
        <ContextLink to={maintenancePaths.request(d.duplicateOf.id)}>
          {d.duplicateOf.code} — {d.duplicateOf.title}
        </ContextLink>
      </LabelValue>,
    );
  }
  if (d.duplicates.length) {
    rows.push(
      <LabelValue key="dups" label="Duplicadas desta">
        {d.duplicates.map((x) => (
          <div key={x.id}>
            <ContextLink to={maintenancePaths.request(x.id)}>{x.code}</ContextLink>
          </div>
        ))}
      </LabelValue>,
    );
  }
  if (r.redirect) {
    rows.push(
      <LabelValue key="red" label="Destino externo">
        {r.redirect.destinationText}
        {d.redirectDestination && <div className="helper">{REDIRECT_KIND_LABEL[d.redirectDestination.kind]}</div>}
      </LabelValue>,
    );
  }
  if (r.outcomeReason) rows.push(<LabelValue key="why" label="Justificativa">{r.outcomeReason}</LabelValue>);
  if (!rows.length) return null;
  return (
    <Panel title="Desfecho e relações">
      <LabelValueGrid>{rows}</LabelValueGrid>
    </Panel>
  );
}

function EditModal({ open, d, onClose, onDone }: { open: boolean; d: RequestDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const [title, setTitle] = useState(d.request.title);
  const [description, setDescription] = useState(d.request.description);
  const [priority, setPriority] = useState<MaintenancePriority>(d.request.perceivedPriority);
  return (
    <ActionModal
      open={open}
      title="Editar solicitação"
      confirmLabel="Salvar"
      onCancel={onClose}
      onConfirm={async () => {
        await services.maintenance.editRequest(access, d.request.id, { title, description, perceivedPriority: priority });
        onDone();
      }}
    >
      <p className="helper">Permitido enquanto Aberta (DP-40). Valores anteriores ficam no histórico.</p>
      <TextField label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea id="edit-desc" label="Descrição" required value={description} onChange={setDescription} />
      <SelectField label="Prioridade percebida" options={PRIORITY_OPTIONS} value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)} />
    </ActionModal>
  );
}

function ConvertModal({ open, d, onClose, onDone }: { open: boolean; d: RequestDetail; onClose: () => void; onDone: (code: string, id: string) => void }) {
  const access = useAccess();
  const services = useServices();
  const [priority, setPriority] = useState<MaintenancePriority>(d.request.perceivedPriority);
  return (
    <ActionModal
      open={open}
      title="Converter em ordem de serviço"
      confirmLabel="Criar OS"
      onCancel={onClose}
      onConfirm={async () => {
        const order = await services.maintenance.convertToWorkOrder(access, d.request.id, priority);
        onDone(order.code, order.id);
      }}
    >
      <p className="helper">
        Cria uma nova OS Aberta com o ativo, o local e a descrição da solicitação. <ProvisionalTag code="P-53">Uma OS por solicitação</ProvisionalTag>
      </p>
      <SelectField
        label="Prioridade definida"
        required
        options={PRIORITY_OPTIONS}
        value={priority}
        onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
        helper={`Percebida pelo solicitante: ${MAINTENANCE_PRIORITY_LABEL[d.request.perceivedPriority]}. A criticidade do ativo não define a prioridade.`}
      />
    </ActionModal>
  );
}

function ResolveModal({ open, d, onClose, onDone }: { open: boolean; d: RequestDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const [priority, setPriority] = useState<MaintenancePriority>(d.request.perceivedPriority);
  const [reason, setReason] = useState('');
  return (
    <ActionModal
      open={open}
      title="Resolver sem OS"
      confirmLabel="Resolver"
      onCancel={onClose}
      onConfirm={async () => {
        await services.maintenance.resolveWithoutOrder(access, d.request.id, priority, reason);
        onDone();
      }}
    >
      <SelectField label="Prioridade definida" options={PRIORITY_OPTIONS} value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)} />
      <TextArea id="resolve-reason" label="Como foi resolvida" required value={reason} onChange={setReason} placeholder="Ex.: orientação ao solicitante, ajuste sem intervenção técnica." />
    </ActionModal>
  );
}

function DuplicateModal({ open, d, onClose, onDone }: { open: boolean; d: RequestDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const candidates = open ? services.maintenance.duplicateCandidates(access, d.request.id) : [];
  const [originalId, setOriginalId] = useState('');
  const [reason, setReason] = useState('');
  return (
    <ActionModal
      open={open}
      title="Marcar como duplicada"
      confirmLabel="Marcar duplicada"
      onCancel={onClose}
      onConfirm={async () => {
        await services.maintenance.markDuplicate(access, d.request.id, originalId, reason);
        onDone();
      }}
    >
      <SelectField
        label="Solicitação original"
        required
        emptyLabel="Selecione"
        options={candidates.map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` }))}
        value={originalId}
        onChange={(e) => setOriginalId(e.target.value)}
        helper="Primeiro as do mesmo ativo e do mesmo local."
      />
      <TextArea id="dup-reason" label="Motivo" required value={reason} onChange={setReason} />
    </ActionModal>
  );
}

function RedirectModal({ open, d, onClose, onDone }: { open: boolean; d: RequestDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const destinations = services.maintenance.redirectDestinations(access);
  const [destinationId, setDestinationId] = useState('');
  const [other, setOther] = useState('');
  const [reason, setReason] = useState('');
  return (
    <ActionModal
      open={open}
      title="Redirecionar para destino externo"
      confirmLabel="Redirecionar"
      onCancel={onClose}
      onConfirm={async () => {
        await services.maintenance.redirectRequest(access, d.request.id, {
          destinationId: destinationId && destinationId !== 'outro' ? destinationId : undefined,
          destinationText: destinationId === 'outro' ? other : undefined,
          reason,
        });
        onDone();
      }}
    >
      <p className="helper">
        Redirecionar é encaminhamento <strong>externo</strong> (DP-38). Troca de equipe dentro da Manutenção é feita na própria triagem. Nada é criado no destino.
      </p>
      <SelectField
        label="Destino"
        required
        emptyLabel="Selecione"
        options={[...destinations.map((x) => ({ value: x.id, label: `${x.name} · ${REDIRECT_KIND_LABEL[x.kind]}` })), { value: 'outro', label: 'Outro (informar)' }]}
        value={destinationId}
        onChange={(e) => setDestinationId(e.target.value)}
      />
      <ProvisionalTag code="P-52">Destinos de demonstração</ProvisionalTag>
      {destinationId === 'outro' && <TextField label="Outro destino" required value={other} onChange={(e) => setOther(e.target.value)} />}
      <TextArea id="red-reason" label="Motivo" required value={reason} onChange={setReason} />
    </ActionModal>
  );
}
