import type { ReactNode } from 'react';
import styles from './Badge.module.css';
import { Icon } from './Icon';

export type BadgeTone = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'gray';

interface BadgeProps {
  tone: BadgeTone;
  icon?: string;
  children: ReactNode;
  title?: string;
}

/** Badge "Pill" do SDS — status, sem clique. */
export function Badge({ tone, icon, children, title }: BadgeProps) {
  return (
    <span className={`${styles.pill} ${styles[tone]}`} title={title}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/** Badge "Number" do SDS — contador circular. */
export function NumberBadge({ count, max = 99 }: { count: number; max?: number }) {
  return (
    <span className={styles.number} aria-label={`${count} não lidas`}>
      {count > max ? `${max}+` : count}
    </span>
  );
}

interface ChipProps {
  label: string;
  value: string;
  onRemove?: () => void;
}

/** Chip/Token do SDS — filtro ativo "Label: Texto ✕". */
export function Chip({ label, value, onRemove }: ChipProps) {
  const text = `${label}: ${value}`;
  return (
    <span className={styles.chip} title={text}>
      <span className={styles.chipText}>
        <strong>{label}:</strong> {value.length > 50 ? `${value.slice(0, 47)}...` : value}
      </span>
      {onRemove && (
        <button type="button" className={styles.chipRemove} onClick={onRemove} aria-label={`Remover filtro ${text}`}>
          <Icon name="times" />
        </button>
      )}
    </span>
  );
}

/** Marcador de dado/ambiente de demonstração. */
export function DemoTag({ children = 'Demonstração' }: { children?: ReactNode }) {
  return (
    <span className={styles.demoTag}>
      <Icon name="flask" />
      {children}
    </span>
  );
}
