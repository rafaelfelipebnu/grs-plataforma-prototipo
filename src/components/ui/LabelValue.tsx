import type { ReactNode } from 'react';
import styles from './Layout.module.css';

/** Pares rótulo/valor para telas de detalhe (Label Value do SDS). */
export function LabelValueGrid({ children }: { children: ReactNode }) {
  return <dl className={styles.labelValueGrid}>{children}</dl>;
}

export function LabelValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.labelValue}>
      <dt>{label}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}
