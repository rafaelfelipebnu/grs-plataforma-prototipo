import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Chip } from './Badge';
import { Icon } from './Icon';
import styles from './Data.module.css';
import layout from './Layout.module.css';

export type StatsTone = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue';

interface StatsCardProps {
  icon: string;
  title: string;
  value: ReactNode;
  tone?: StatsTone;
  /** Renderiza como botão clicável (drill-down). Para links, use `as`. */
  onClick?: () => void;
  as?: (props: { className: string; children: ReactNode }) => ReactNode;
}

/** Stats Card (totalizador) do SDS — tema Regular; clicável para drill-down. */
export function StatsCard({ icon, title, value, tone = 'default', onClick, as }: StatsCardProps) {
  const className = [styles.stats, tone !== 'default' && styles[`tone-${tone}`]].filter(Boolean).join(' ');
  const content = (
    <>
      <span className={styles.statsIcon}>
        <Icon name={icon} />
      </span>
      <span className={styles.statsText}>
        <span className={styles.statsTitle} title={title}>
          {title}
        </span>
        <span className={styles.statsValue}>{value}</span>
      </span>
    </>
  );
  if (as) return <>{as({ className, children: content })}</>;
  if (onClick)
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  return <div className={className}>{content}</div>;
}

interface PaginatorProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

/** Paginador do SDS (padrão 10 linhas) com total de registros. */
export function Paginator({ page, pageSize, total, onPage }: PaginatorProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const visible = Array.from({ length: Math.min(5, pages) }, (_, i) => windowStart + i);
  return (
    <nav className={styles.paginator} aria-label="Paginação">
      <span>
        {first}–{last} de {total} registros
      </span>
      <span className={styles.pages}>
        <button type="button" className={styles.pageButton} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          <Icon name="angle-left" />
        </button>
        {visible.map((p) => (
          <button
            key={p}
            type="button"
            className={[styles.pageButton, p === page && styles.pageButtonActive].filter(Boolean).join(' ')}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        <button type="button" className={styles.pageButton} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Próxima página">
          <Icon name="angle-right" />
        </button>
      </span>
    </nav>
  );
}

export interface AppliedFilter {
  key: string;
  label: string;
  value: string;
}

interface FilterPanelProps {
  applied: AppliedFilter[];
  onRemove: (key: string) => void;
  onApply: () => void;
  onClear: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Panel "FILTROS" do SDS: recolhido por padrão; filtros aplicados viram chips
 * ao lado do título; ao filtrar, recolhe (e a tela volta à página 1).
 */
export function FilterPanel({ applied, onRemove, onApply, onClear, children, defaultOpen = false }: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={layout.panel} aria-label="Filtros">
      <header className={layout.panelHeader} style={open ? undefined : { borderBottom: 0 }}>
        <button type="button" className={layout.panelToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ flex: '0 0 auto' }}>
          <Icon name={open ? 'minus' : 'plus'} />
          <h2 className={layout.panelTitle}>Filtros</h2>
        </button>
        <div className={styles.filterChips} style={{ flex: 1 }}>
          {applied.map((f) => (
            <Chip key={f.key} label={f.label} value={f.value} onRemove={() => onRemove(f.key)} />
          ))}
        </div>
      </header>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onApply();
            setOpen(false);
          }}
        >
          <div className={layout.panelBody}>
            <div className={styles.filterGrid}>{children}</div>
          </div>
          <footer className={layout.panelFooter}>
            <Button variant="link" icon="eraser" onClick={onClear}>
              Limpar filtros
            </Button>
            <div className={layout.panelFooterRight}>
              <Button type="submit" icon="filter">
                Filtrar
              </Button>
            </div>
          </footer>
        </form>
      )}
    </section>
  );
}

export const tableStyles = styles;
