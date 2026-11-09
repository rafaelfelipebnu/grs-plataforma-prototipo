import { useState } from 'react';
import { Badge, Button, Panel, TextField, useToast } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import { REINSPECTION_STATUS_LABEL } from '@/domain';
import { errorMessage } from '@/modules/central/shared';
import { ActionModal } from '@/modules/manutencao/shared';
import { routinePaths } from '@/modules/rotinas/shared';
import type { OccurrenceDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { occurrencePaths } from './shared';

/** Reinspeção (D-006): Ocorrências solicita; Rotinas programa e executa; resultado e evidências retornam. */
export function ReinspectionPanel({ d }: { d: OccurrenceDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  if (!d.reinspections.length && !d.actions.requestReinspection && !d.type.conclusion.requireReinspection) return null;
  return (
    <Panel
      title={`Reinspeção (${d.reinspections.length})`}
      actions={
        d.actions.requestReinspection ? (
          <Button size="small" variant="secondary" icon="refresh" onClick={() => setOpen(true)}>
            Solicitar reinspeção
          </Button>
        ) : undefined
      }
    >
      {d.reinspections.length === 0 ? (
        <p className="helper">Nenhuma reinspeção solicitada.</p>
      ) : (
        d.reinspections.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
            <span>{formatDateTime(r.requestedAt)}</span>
            <Badge tone={r.status === 'executada' ? 'green' : r.status === 'nao-realizada' ? 'gray' : 'yellow'}>{REINSPECTION_STATUS_LABEL[r.status]}</Badge>
            {r.result && <Badge tone={r.result === 'ok' ? 'green' : 'red'}>{r.result === 'ok' ? 'OK' : 'Não OK'}</Badge>}
            {r.status === 'executada' && !r.result && <span className="helper">sem resultado conclusivo</span>}
            {r.executionId && <ContextLink to={routinePaths.execution(r.executionId)}>{r.executionCode}</ContextLink>}
          </div>
        ))
      )}
      <p className="helper" style={{ marginTop: 8 }}>
        A reinspeção é programada pelo gestor de Rotinas como rotina não agendada de execução única. OK = nenhuma resposta Não Conforme (critério existente). Resultado OK habilita
        "Concluir", mas não conclui automaticamente.
      </p>
      <ActionModal
        open={open}
        title="Solicitar reinspeção"
        confirmLabel="Solicitar"
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await services.occurrences.requestReinspection(access, d.occurrence.id, { suggestedDate: date || undefined });
          toast.show({ tone: 'success', title: 'Reinspeção solicitada', message: 'O gestor de Rotinas foi avisado para programar.' });
          setOpen(false);
        }}
      >
        <p className="helper">O pedido vai para a Gestão de Rotinas; a ocorrência não programa nem executa a inspeção.</p>
        <TextField label="Data sugerida (opcional)" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </ActionModal>
    </Panel>
  );
}

/** Sugestão de vínculo (D-005) e ocorrências relacionadas (históricos próprios, sem fusão). */
export function LinkPanel({ d }: { d: OccurrenceDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (!d.suggestions.length && !d.related.length) return null;
  const decide = async (candidateId: string, confirm: boolean) => {
    setBusy(candidateId);
    try {
      await services.occurrences.decideLinkSuggestion(access, d.occurrence.id, candidateId, confirm);
      toast.show({ tone: 'success', title: confirm ? 'Vínculo confirmado' : 'Mantida independente' });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Ação não realizada', message: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };
  const statusLabel = { pendente: 'Pendente', confirmada: 'Vínculo confirmado', independente: 'Mantida independente', expirada: 'Expirada' } as const;
  return (
    <Panel title="Vínculos com outras ocorrências">
      {d.suggestions.map((s) => (
        <div key={s.candidateId} style={{ padding: '6px 0', borderBottom: '1px solid var(--sds-border)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              Sugestão: <ContextLink to={occurrencePaths.detail(s.candidateId)}>{s.code}</ContextLink> — {s.typeName}
            </span>
            <Badge tone={s.status === 'pendente' ? 'yellow' : s.status === 'confirmada' ? 'green' : 'gray'}>{statusLabel[s.status]}</Badge>
          </div>
          <div className="helper">
            Motivo: {s.reason}
            {s.expiredReason && ` · expirada: ${s.expiredReason}`}
          </div>
          {s.status === 'pendente' && d.actions.decideLinks && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Button size="small" icon="link" loading={busy === s.candidateId} onClick={() => decide(s.candidateId, true)}>
                Confirmar vínculo
              </Button>
              <Button size="small" variant="secondary" onClick={() => decide(s.candidateId, false)}>
                Manter independente
              </Button>
            </div>
          )}
        </div>
      ))}
      {d.related.length > 0 && (
        <p style={{ marginTop: 8 }}>
          Relacionadas:{' '}
          {d.related.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ', '}
              {r.visible ? <ContextLink to={occurrencePaths.detail(r.id)}>{r.code}</ContextLink> : r.code}
            </span>
          ))}
        </p>
      )}
      <p className="helper" style={{ marginTop: 8 }}>
        A sugestão nunca impede nem adia a geração da ocorrência. Sem confirmação, a ocorrência permanece independente; o vínculo confirmado mantém os históricos próprios.
      </p>
    </Panel>
  );
}
