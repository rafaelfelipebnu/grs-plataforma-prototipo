import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState, Icon, Modal, Panel, Tabs, type BadgeTone } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import {
  EXECUTION_STATUS_LABEL,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_PRIORITY_LABEL,
  REQUEST_STATUS_LABEL,
  WORK_ORDER_STATUS_LABEL,
  type ExecutionStatus,
  type MaintenancePriority,
  type RequestStatus,
  type WorkOrderStatus,
} from '@/domain';
import type { MaintenanceHistoryView } from '@/services';
import { errorMessage } from '@/modules/central/shared';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import styles from './maintenance.module.css';

export const maintenancePaths = {
  overview: '/manutencao',
  requests: '/manutencao/solicitacoes',
  newRequest: (assetId?: string) => `/manutencao/solicitacoes/nova${assetId ? `?ativo=${encodeURIComponent(assetId)}` : ''}`,
  newRequestFromOccurrence: (occurrenceId: string) => `/manutencao/solicitacoes/nova?ocorrencia=${encodeURIComponent(occurrenceId)}`,
  newRequestFromEvent: (eventId: string) => `/manutencao/solicitacoes/nova?evento=${encodeURIComponent(eventId)}`,
  request: (id: string) => `/manutencao/solicitacoes/${id}`,
  orders: '/manutencao/os',
  order: (id: string) => `/manutencao/os/${id}`,
  myOrders: '/manutencao/minhas-os',
  myOrder: (id: string) => `/manutencao/minhas-os/${id}`,
};

/** Navegação entre as seções da Manutenção. "Minhas OS" aparece para quem executa. */
export function MaintenanceNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const access = useAccess();
  const services = useServices();
  const perm = services.maintenance.permissions(access);
  const sections = [
    { id: maintenancePaths.overview, label: 'Visão geral' },
    { id: maintenancePaths.requests, label: 'Solicitações' },
    { id: maintenancePaths.orders, label: 'Ordens de serviço' },
    ...(perm.execute ? [{ id: maintenancePaths.myOrders, label: 'Minhas OS (móvel)' }] : []),
  ];
  const current =
    [...sections].reverse().find((s) => pathname === s.id || (s.id !== maintenancePaths.overview && pathname.startsWith(s.id)))?.id ?? maintenancePaths.overview;
  return (
    <div style={{ marginBottom: 16 }}>
      <Tabs label="Seções da Gestão de Manutenção" items={sections} value={current} onChange={(id) => navigate(id)} />
    </div>
  );
}

const REQUEST_TONE: Record<RequestStatus, BadgeTone> = {
  aberta: 'blue',
  'em-triagem': 'yellow',
  convertida: 'green',
  'resolvida-sem-os': 'green',
  rejeitada: 'gray',
  duplicada: 'gray',
  redirecionada: 'gray',
  cancelada: 'gray',
};

const ORDER_TONE: Record<WorkOrderStatus, BadgeTone> = {
  aberta: 'blue',
  planejada: 'blue',
  'em-execucao': 'yellow',
  suspensa: 'orange',
  'aguardando-encerramento': 'yellow',
  encerrada: 'green',
  cancelada: 'gray',
};

const PRIORITY_TONE: Record<MaintenancePriority, BadgeTone> = {
  critica: 'red',
  alta: 'orange',
  media: 'yellow',
  baixa: 'green',
  planejada: 'blue',
};

export function RequestStatusBadge({ value }: { value: RequestStatus }) {
  return <Badge tone={REQUEST_TONE[value]}>{REQUEST_STATUS_LABEL[value]}</Badge>;
}

export function WorkOrderStatusBadge({ value }: { value: WorkOrderStatus }) {
  return <Badge tone={ORDER_TONE[value]}>{WORK_ORDER_STATUS_LABEL[value]}</Badge>;
}

export function ExecutionStatusBadge({ value }: { value: ExecutionStatus }) {
  const tone: BadgeTone = value === 'concluida' ? 'green' : value === 'interrompida' ? 'orange' : 'yellow';
  return <Badge tone={tone}>{EXECUTION_STATUS_LABEL[value]}</Badge>;
}

export function PriorityBadge({ value }: { value: MaintenancePriority }) {
  return (
    <Badge tone={PRIORITY_TONE[value]} title="Escala provisória (P-49), pendente de validação">
      {MAINTENANCE_PRIORITY_LABEL[value]}
    </Badge>
  );
}

/** Marca na interface um comportamento provisório ou hipótese ainda não aprovada (P-xx). */
export function ProvisionalTag({ code, children = 'Provisório' }: { code: string; children?: ReactNode }) {
  return (
    <span className={styles.provisional} title={`Comportamento provisório (${code}), pendente de validação com clientes.`}>
      <Icon name="flask" />
      {children} · {code}
    </span>
  );
}

export const PRIORITY_OPTIONS = MAINTENANCE_PRIORITIES.map((p) => ({ value: p, label: MAINTENANCE_PRIORITY_LABEL[p] }));

export function HistoryPanel({ items, title = 'Histórico' }: { items: MaintenanceHistoryView[]; title?: string }) {
  return (
    <Panel title={title} flush>
      {items.length === 0 ? (
        <EmptyState compact icon="history" title="Sem registros." />
      ) : (
        <ol className={styles.history}>
          {items.map((h, i) => (
            <li key={`${h.at}-${i}`}>
              <div>{h.text}</div>
              <div className={styles.historyMeta}>
                {h.actorName} · {formatDateTime(h.at)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h`;
}

export function formatDate(iso: string | undefined): string {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

export function TextArea({
  label,
  value,
  onChange,
  required,
  helper,
  id,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  helper?: string;
  id: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      <textarea id={id} className={styles.textarea} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {helper && <span className="helper">{helper}</span>}
    </div>
  );
}

/**
 * Modal genérico de ação com formulário. `onConfirm` lança erro para manter o
 * modal aberto e exibir a mensagem da camada de serviço.
 */
export function ActionModal({
  open,
  title,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  children: ReactNode;
}) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setError(undefined);
  }, [open]);
  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm();
    } catch (e) {
      setError(errorMessage(e) ?? 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footerStart={
        <Button variant="link" onClick={onCancel}>
          Cancelar
        </Button>
      }
      footerEnd={
        <Button variant={destructive ? 'danger' : 'primary'} loading={busy} onClick={submit}>
          {confirmLabel}
        </Button>
      }
    >
      <div className={styles.formStack}>
        {children}
        {error && (
          <span role="alert" style={{ color: 'var(--sds-red)', fontSize: 13 }}>
            {error}
          </span>
        )}
      </div>
    </Modal>
  );
}

export { styles as maintenanceStyles };
