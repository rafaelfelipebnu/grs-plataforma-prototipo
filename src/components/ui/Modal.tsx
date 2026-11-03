import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
import { useFocusTrap } from './hooks';
import styles from './Overlay.module.css';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Terciária à esquerda. */
  footerStart?: ReactNode;
  /** Secundária e primária à direita. */
  footerEnd?: ReactNode;
  size?: 'small' | 'default' | 'large';
}

/** Modal do SDS: título em UPPERCASE + ✕, sempre fechável. */
export function Modal({ open, title, onClose, children, footerStart, footerEnd, size = 'default' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[styles.modal, size !== 'default' && styles[size]].filter(Boolean).join(' ')}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton icon="times" label="Fechar" onClick={onClose} />
        </header>
        <div className={styles.body}>{children}</div>
        {(footerStart || footerEnd) && (
          <footer className={styles.footer}>
            {footerStart}
            <div className={styles.footerEnd}>{footerEnd}</div>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface SidePanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerExtra?: ReactNode;
  footerStart?: ReactNode;
  footerEnd?: ReactNode;
  wide?: boolean;
}

/** Sidebar (painel lateral) do SDS. Não empilhar. */
export function SidePanel({ open, title, onClose, children, headerExtra, footerStart, footerEnd, wide }: SidePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className={styles.sideBackdrop} onMouseDown={onClose} />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[styles.side, wide && styles.wide].filter(Boolean).join(' ')}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {headerExtra}
          <IconButton icon="times" label="Fechar" onClick={onClose} />
        </header>
        <div className={styles.body} style={{ padding: 0 }}>
          {children}
        </div>
        {(footerStart || footerEnd) && (
          <footer className={styles.footer}>
            {footerStart}
            <div className={styles.footerEnd}>{footerEnd}</div>
          </footer>
        )}
      </aside>
    </>,
    document.body,
  );
}
