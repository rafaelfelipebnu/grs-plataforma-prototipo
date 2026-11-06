import { useEffect, useState } from 'react';
import { SelectField, TextField, useToast } from '@/components/ui';
import { ReasonModal } from '@/modules/central/shared';
import type { WorkOrderDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { ActionModal, ProvisionalTag, TextArea, maintenanceStyles as s } from './shared';

export type OrderDialog =
  | 'planejar'
  | 'concluir-execucao'
  | 'impedimento'
  | 'encerrar'
  | 'devolver'
  | 'suspender'
  | 'cancelar'
  | 'interromper'
  | null;

/**
 * Ações da OS (gestor e técnico) com seus diálogos. Usado no detalhe desktop
 * e na visão móvel "Minhas OS" para manter as mesmas regras e mensagens.
 */
export function useOrderActions(d: WorkOrderDetail | undefined) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [dialog, setDialog] = useState<OrderDialog>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const close = () => setDialog(null);
  const ok = (title: string, message?: string) => {
    toast.show({ tone: 'success', title, message });
    close();
  };

  /** Ações diretas (sem formulário). */
  const run = async (key: string, fn: () => Promise<void>, title: string, message?: string) => {
    setBusy(key);
    try {
      await fn();
      toast.show({ tone: 'success', title, message });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Ação não realizada', message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const start = () => d && run('start', () => services.maintenance.startExecution(access, d.order.id), 'Execução iniciada', `${d.order.code} está Em execução.`);
  const submit = () =>
    d && run('submit', () => services.maintenance.submitForClosure(access, d.order.id), 'Enviada para encerramento', 'O gestor valida o resultado e encerra a OS.');
  const resume = () => d && run('resume', () => services.maintenance.resumeWorkOrder(access, d.order.id), 'OS retomada');

  const dialogs = d ? (
    <>
      <PlanModal open={dialog === 'planejar'} d={d} onClose={close} onDone={() => ok('OS planejada', 'O técnico foi avisado.')} />
      <ConcludeModal open={dialog === 'concluir-execucao'} d={d} onClose={close} onDone={() => ok('Execução concluída', 'Se o trabalho terminou, envie a OS para encerramento.')} />
      <ReasonModal
        open={dialog === 'impedimento'}
        title="Registrar impedimento"
        label="Descrição do impedimento"
        confirmLabel="Registrar"
        onCancel={close}
        onConfirm={async (text) => {
          await services.maintenance.registerImpediment(access, d.order.id, text);
          ok('Impedimento registrado', 'O gestor avalia a suspensão da OS.');
        }}
      >
        <p className="helper">O técnico registra o impedimento; a suspensão da OS é autorizada pelo gestor (D-013).</p>
      </ReasonModal>
      <ReasonModal
        open={dialog === 'encerrar'}
        title="Encerrar OS"
        label="Validação do resultado"
        confirmLabel="Encerrar OS"
        onCancel={close}
        onConfirm={async (text) => {
          await services.maintenance.closeWorkOrder(access, d.order.id, text);
          ok('OS encerrada', 'Solicitante e técnico foram avisados.');
        }}
      >
        <p className="helper">Encerrar valida o trabalho executado (DP-47). Não conclui ações de planos nem ocorrências vinculadas.</p>
      </ReasonModal>
      <ReasonModal
        open={dialog === 'devolver'}
        title="Devolver para execução"
        confirmLabel="Devolver"
        onCancel={close}
        onConfirm={async (text) => {
          await services.maintenance.returnToExecution(access, d.order.id, text);
          ok('OS devolvida para execução', 'O técnico foi avisado.');
        }}
      />
      <ReasonModal
        open={dialog === 'suspender'}
        title="Suspender OS"
        label="Justificativa"
        confirmLabel="Suspender"
        onCancel={close}
        onConfirm={async (text) => {
          await services.maintenance.suspendWorkOrder(access, d.order.id, text);
          ok('OS suspensa', 'Início e término da suspensão ficam registrados.');
        }}
      >
        <p className="helper">
          Status próprio, autorizado pelo gestor (DP-48, D-013). O tempo suspenso é registrado e exibido à parte; <strong>não há desconto de SLA</strong> até a regra ser
          definida.
        </p>
      </ReasonModal>
      <ReasonModal
        open={dialog === 'cancelar'}
        title="Cancelar OS"
        label="Justificativa"
        confirmLabel="Cancelar OS"
        destructive
        onCancel={close}
        onConfirm={async (text) => {
          await services.maintenance.cancelWorkOrder(access, d.order.id, text);
          ok('OS cancelada', 'A solicitação não é cancelada: a triagem decide o próximo passo (DP-50).');
        }}
      >
        <p className="helper">
          {d.executions.length
            ? 'O trabalho parcial (execuções, evidências e comentários) é preservado e a OS fica identificada como cancelada com trabalho parcial (DP-51).'
            : 'A OS será cancelada sem execução.'}
        </p>
      </ReasonModal>
      <ReasonModal
        open={dialog === 'interromper'}
        title="Interromper execução"
        label="Justificativa"
        confirmLabel="Interromper"
        destructive
        onCancel={close}
        onConfirm={async (text) => {
          await services.maintenance.interruptExecution(access, d.order.id, text);
          ok('Execução interrompida', 'Trabalho parcial preservado. Agora a OS pode ser suspensa ou cancelada.');
        }}
      >
        <p className="helper">
          A execução não é registrada como concluída: ela fica <strong>Interrompida</strong>, com justificativa e responsável. <ProvisionalTag code="P-51">Hipótese em validação</ProvisionalTag>
        </p>
        <p className="helper">Quem pode interromper ainda não foi decidido; nesta demonstração, só o gestor.</p>
      </ReasonModal>
    </>
  ) : null;

  return { dialog, setDialog, busy, start, submit, resume, dialogs };
}

function PlanModal({ open, d, onClose, onDone }: { open: boolean; d: WorkOrderDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const technicians = open ? services.maintenance.technicianOptions(access, d.order.locationId) : [];
  const [tech, setTech] = useState(d.order.technicianUserId ?? '');
  const [date, setDate] = useState(d.order.plannedDate ?? '');
  useEffect(() => {
    if (open) {
      setTech(d.order.technicianUserId ?? '');
      setDate(d.order.plannedDate ?? '');
    }
  }, [open, d.order.technicianUserId, d.order.plannedDate]);
  return (
    <ActionModal
      open={open}
      title={d.order.status === 'planejada' ? 'Replanejar OS' : 'Planejar OS'}
      confirmLabel="Salvar planejamento"
      onCancel={onClose}
      onConfirm={async () => {
        await services.maintenance.planWorkOrder(access, d.order.id, { technicianUserId: tech, plannedDate: date });
        onDone();
      }}
    >
      <SelectField
        label="Técnico"
        required
        emptyLabel="Selecione"
        options={technicians.map((t) => ({ value: t.userId, label: `${t.name} — ${t.jobTitle}` }))}
        value={tech}
        onChange={(e) => setTech(e.target.value)}
        helper="Usuários que executam OS e têm o local da OS no escopo."
      />
      <TextField label="Data prevista" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
    </ActionModal>
  );
}

function ConcludeModal({ open, d, onClose, onDone }: { open: boolean; d: WorkOrderDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const [notes, setNotes] = useState('');
  const [evidences, setEvidences] = useState<string[]>([]);
  useEffect(() => {
    if (open) {
      setNotes('');
      setEvidences([]);
    }
  }, [open]);
  return (
    <ActionModal
      open={open}
      title="Concluir execução"
      confirmLabel="Concluir execução"
      onCancel={onClose}
      onConfirm={async () => {
        await services.maintenance.concludeExecution(access, d.order.id, { workNotes: notes, evidenceNames: evidences });
        onDone();
      }}
    >
      <TextArea id="exec-notes" label="Trabalho realizado" required value={notes} onChange={setNotes} placeholder="O que foi feito, peças trocadas, medições, pendências." />
      <div>
        <span className="helper">Evidências (simuladas — nenhum arquivo é enviado)</span>
        <div className={s.evidenceList}>
          {evidences.map((name) => (
            <span key={name} className={s.evidence}>
              {name}
            </span>
          ))}
          <button
            type="button"
            className={s.evidence}
            style={{ cursor: 'pointer', border: '1px dashed var(--sds-border-strong)' }}
            onClick={() => setEvidences((list) => [...list, `foto-${d.order.code.toLowerCase()}-${list.length + 1}.jpg`])}
          >
            + Adicionar foto
          </button>
        </div>
      </div>
      <p className="helper">Concluir a execução não encerra a OS: o encerramento é do gestor (DP-47).</p>
    </ActionModal>
  );
}
