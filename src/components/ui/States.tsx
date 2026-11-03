import { useEffect, useState, type ReactNode } from 'react';
import styles from './Layout.module.css';
import { Icon } from './Icon';

interface StateProps {
  icon?: string;
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}

function StateBlock({ icon, title, text, actions, compact }: StateProps) {
  return (
    <div className={[styles.state, compact && styles.stateCompact].filter(Boolean).join(' ')}>
      {icon && <Icon name={icon} className={styles.stateIcon} />}
      <p className={styles.stateTitle}>{title}</p>
      {text && <div className={styles.stateText}>{text}</div>}
      {actions && <div className={styles.stateActions}>{actions}</div>}
    </div>
  );
}

/** Empty state do SDS (título positivo, CTA opcional). */
export function EmptyState({
  title = 'Ainda não há conteúdo para exibir neste painel.',
  icon = 'inbox',
  ...rest
}: Partial<StateProps>) {
  return <StateBlock title={title} icon={icon} {...rest} />;
}

/**
 * Loading state do SDS: só aparece se o carregamento passar de 300 ms.
 */
export function LoadingState({ label = 'Carregando dados...', compact }: { label?: string; compact?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return <span className="visually-hidden" role="status">{label}</span>;
  return (
    <div className={[styles.state, compact && styles.stateCompact].filter(Boolean).join(' ')} role="status">
      <Icon name="circle-o-notch" spin className={styles.stateIcon} />
      <p className={styles.stateText}>{label}</p>
    </div>
  );
}

export type ErrorKind = 403 | 404 | 500;

const ERROR_DEFAULTS: Record<ErrorKind, { title: string; icon: string }> = {
  403: { title: '403 - Acesso negado', icon: 'ban' },
  404: { title: '404 - Página não encontrada', icon: 'question-circle' },
  500: { title: '500 - Erro ao carregar os dados', icon: 'exclamation-circle' },
};

/** Error state do SDS — apenas 403, 404 e 500. */
export function ErrorState({ kind, text, actions, compact }: { kind: ErrorKind; text?: ReactNode; actions?: ReactNode; compact?: boolean }) {
  const def = ERROR_DEFAULTS[kind];
  return <StateBlock icon={def.icon} title={def.title} text={text} actions={actions} compact={compact} />;
}
