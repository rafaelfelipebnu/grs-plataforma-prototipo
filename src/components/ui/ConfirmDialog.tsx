import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog do SDS: só texto, confirmar/cancelar, foco inicial no botão principal. */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Cancelar', destructive, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="small"
      footerStart={
        <Button variant="link" onClick={onCancel}>
          {cancelLabel}
        </Button>
      }
      footerEnd={
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} data-autofocus>
          {confirmLabel}
        </Button>
      }
    >
      <div role="alertdialog" aria-live="assertive">
        {message}
      </div>
    </Modal>
  );
}
