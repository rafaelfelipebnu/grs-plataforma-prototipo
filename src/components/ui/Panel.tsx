import { useId, useState, type ReactNode } from 'react';
import styles from './Layout.module.css';
import { Icon } from './Icon';

interface PanelProps {
  /** Título obrigatório (exibido em UPPERCASE pelo SDS). */
  title: string;
  /** Ações auxiliares pequenas no topo à direita. */
  actions?: ReactNode;
  /** Ações globais do panel: terciária à esquerda, secundária/primária à direita. */
  footerStart?: ReactNode;
  footerEnd?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Remove o padding do corpo (ex.: listas e tabelas). */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

/** Panel do SDS. */
export function Panel({
  title,
  actions,
  footerStart,
  footerEnd,
  collapsible,
  defaultCollapsed = false,
  flush,
  className,
  children,
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(collapsible ? defaultCollapsed : false);
  const bodyId = useId();
  const titleId = useId();
  return (
    <section
      className={[styles.panel, collapsed && styles.panelCollapsed, className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      <header className={styles.panelHeader}>
        {collapsible ? (
          <button
            type="button"
            className={styles.panelToggle}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={() => setCollapsed((c) => !c)}
          >
            <Icon name={collapsed ? 'plus' : 'minus'} />
            <h2 id={titleId} className={styles.panelTitle}>
              {title}
            </h2>
          </button>
        ) : (
          <h2 id={titleId} className={styles.panelTitle}>
            {title}
          </h2>
        )}
        {actions && <div className={styles.panelActions}>{actions}</div>}
      </header>
      {!collapsed && (
        <>
          <div id={bodyId} className={flush ? styles.panelBodyFlush : styles.panelBody}>
            {children}
          </div>
          {(footerStart || footerEnd) && (
            <footer className={styles.panelFooter}>
              {footerStart}
              {footerEnd && <div className={styles.panelFooterRight}>{footerEnd}</div>}
            </footer>
          )}
        </>
      )}
    </section>
  );
}

export function Stack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>;
}

type Span = 3 | 4 | 6 | 8 | 9 | 12;

export function Grid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function Col({ span, children }: { span: Span; children: ReactNode }) {
  return <div className={styles[`span${span}`]}>{children}</div>;
}
