import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Button, Modal, type BadgeTone } from '@/components/ui';
import { isServiceError, type AuditStatus } from '@/services';
import styles from './central.module.css';

export const MIN_REASON = 5;

/** Normalização simples para buscas locais (sem acento, minúsculas). */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function errorMessage(error: unknown): string | undefined {
  return isServiceError(error) || error instanceof Error ? error.message : undefined;
}

const AUDIT_STATUS: Record<AuditStatus, { label: string; tone: BadgeTone }> = {
  'em-dia': { label: 'Auditoria em dia', tone: 'green' },
  vencida: { label: 'Auditoria vencida', tone: 'red' },
  pendente: { label: 'Auditoria pendente', tone: 'yellow' },
  'nao-aplicavel': { label: 'Sem auditoria periódica', tone: 'gray' },
};

export function AuditStatusBadge({ value }: { value: AuditStatus }) {
  const s = AUDIT_STATUS[value];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

interface ReasonModalProps {
  open: boolean;
  title: string;
  /** Contexto exibido acima do campo de motivo. */
  children?: ReactNode;
  label?: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  /** Lança erro para manter o modal aberto e exibir a mensagem. */
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Modal que exige motivo — toda alteração relevante de cadastro e de grupo
 * registra ator, data/hora e motivo (docs/02).
 */
export function ReasonModal({ open, title, children, label = 'Motivo', confirmLabel, destructive, onCancel, onConfirm }: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(undefined);
    }
  }, [open]);

  const submit = async () => {
    if (reason.trim().length < MIN_REASON) {
      setError(`Informe o ${label.toLowerCase()} (mínimo de ${MIN_REASON} caracteres).`);
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setError(errorMessage(e) ?? 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footerStart={
        <Button variant="link" onClick={onCancel}>
          Cancelar
        </Button>
      }
      footerEnd={
        <Button variant={destructive ? 'danger' : 'primary'} loading={busy} onClick={submit}>
          {confirmLabel}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
        <label htmlFor="reason-field" style={{ fontWeight: 600 }}>
          {label}
          <span style={{ color: 'var(--sds-red)' }} aria-hidden="true">
            {' '}
            *
          </span>
        </label>
        <textarea
          id="reason-field"
          className={styles.textarea}
          value={reason}
          aria-invalid={error ? true : undefined}
          aria-describedby="reason-help"
          onChange={(e) => {
            setReason(e.target.value);
            setError(undefined);
          }}
        />
        <span id="reason-help" className={error ? undefined : 'helper'} style={error ? { color: 'var(--sds-red)', fontSize: 12 } : undefined}>
          {error ?? 'Registrado no histórico com seu nome, data e hora.'}
        </span>
      </div>
    </Modal>
  );
}
