import type { ReactNode } from 'react';
import styles from './Layout.module.css';
import { Icon } from './Icon';

export type AlertTone = 'info' | 'warning' | 'error' | 'success';

const ICONS: Record<AlertTone, string> = {
  info: 'info-circle',
  warning: 'exclamation-triangle',
  error: 'times-circle',
  success: 'check-circle',
};

interface AlertProps {
  tone: AlertTone;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  action?: ReactNode;
}

/** Alert em tela do SDS (não é popup). */
export function Alert({ tone, title, children, onClose, action }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[`alert-${tone}`]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[tone]} className={styles.alertIcon} />
      <div className={styles.alertContent}>
        {title && <div className={styles.alertTitle}>{title}</div>}
        {children && <div>{children}</div>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
      {onClose && (
        <button type="button" className={styles.alertClose} onClick={onClose} aria-label="Fechar aviso">
          <Icon name="times" />
        </button>
      )}
    </div>
  );
}
