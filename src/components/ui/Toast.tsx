import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Overlay.module.css';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  tone: ToastTone;
  title: string;
  message?: string;
  /** Ação opcional (ex.: "Abrir"). Toast não deve conter conteúdo para copiar. */
  action?: { label: string; onClick: () => void };
  /** Padrão SDS: sucesso 5 s; demais 10 s. 0 = fechamento manual. */
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastApi {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, string> = {
  success: 'check-circle',
  info: 'info-circle',
  warning: 'exclamation-triangle',
  error: 'times-circle',
};

function ToastView({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const duration = item.durationMs ?? (item.tone === 'success' ? 5000 : 10000);
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onClose(item.id), duration);
    return () => clearTimeout(timer);
  }, [duration, item.id, onClose]);
  return (
    <div className={`${styles.toast} ${styles[`toast-${item.tone}`]}`} role={item.tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[item.tone]} className={styles.toastIcon} />
      <div className={styles.toastBody}>
        <div className={styles.toastTitle}>{item.title}</div>
        {item.message && <div className={styles.toastMessage}>{item.message}</div>}
        {item.action && (
          <div className={styles.toastAction}>
            <button
              type="button"
              className="toast-action-link"
              style={{ border: 0, background: 'none', padding: 0, color: 'var(--sds-primary)', cursor: 'pointer' }}
              onClick={() => {
                item.action!.onClick();
                onClose(item.id);
              }}
            >
              {item.action.label}
            </button>
          </div>
        )}
      </div>
      <button type="button" className={styles.toastClose} onClick={() => onClose(item.id)} aria-label="Fechar notificação">
        <Icon name="times" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const close = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    // Máximo de 4 visíveis; os mais antigos saem primeiro.
    setItems((list) => [...list.slice(-3), { ...options, id }]);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.toastViewport} aria-live="polite">
        {items.map((item) => (
          <ToastView key={item.id} item={item} onClose={close} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider.');
  return ctx;
}
