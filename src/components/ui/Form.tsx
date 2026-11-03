import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import styles from './Form.module.css';

interface FieldShellProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Estrutura de campo do SDS: label acima, sentence case, asterisco vermelho, helper/erro abaixo. */
function FieldShell({ label, required, helper, error, children }: FieldShellProps) {
  const id = useId();
  const helperId = `${id}-help`;
  const describedBy = error || helper ? helperId : undefined;
  return (
    <div className={[styles.field, error && styles.invalid].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children(id, describedBy)}
      {error ? (
        <span id={helperId} className={styles.error}>
          {error}
        </span>
      ) : helper ? (
        <span id={helperId} className={styles.helper}>
          {helper}
        </span>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  helper?: string;
  error?: string;
}

export function TextField({ label, helper, error, required, ...input }: TextFieldProps) {
  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      {(id, describedBy) => (
        <input
          id={id}
          className={styles.control}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          {...input}
        />
      )}
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  options: SelectOption[];
  helper?: string;
  error?: string;
  /** Rótulo da opção vazia (ex.: "Todos"). */
  emptyLabel?: string;
}

export function SelectField({ label, options, helper, error, required, emptyLabel, ...select }: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      {(id, describedBy) => (
        <select
          id={id}
          className={styles.control}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          {...select}
        >
          {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, disabled, ...input }: CheckboxProps) {
  return (
    <label className={[styles.checkbox, disabled && styles.disabled].filter(Boolean).join(' ')}>
      <input type="checkbox" disabled={disabled} {...input} />
      <span>
        {label}
        {description && <span className={styles.helper} style={{ display: 'block' }}>{description}</span>}
      </span>
    </label>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Tabs horizontais do SDS (não usar para dividir formulário). */
export function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = items[(index + delta + items.length) % items.length];
    if (next) onChange(next.id);
  };
  return (
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {items.map((item, index) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={[styles.tab, active && styles.tabActive].filter(Boolean).join(' ')}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            title={item.label}
          >
            {item.label}
            {item.count !== undefined && <span className={styles.tabCount}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
