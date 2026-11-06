import { useLocation, useNavigate } from 'react-router-dom';
import { Badge, Tabs, type BadgeTone } from '@/components/ui';
import { OCCURRENCE_PRIORITY_LABEL, OCCURRENCE_STATUS_LABEL, type OccurrencePriority, type OccurrenceStatus } from '@/domain';
import styles from './occurrences.module.css';

export const occurrencePaths = {
  panel: '/ocorrencias',
  search: '/ocorrencias/consulta',
  register: (eventId?: string) => `/ocorrencias/registrar${eventId ? `?evento=${encodeURIComponent(eventId)}` : ''}`,
  types: '/ocorrencias/tipos',
  detail: (id: string) => `/ocorrencias/${id}`,
};

const SECTIONS = [
  { id: occurrencePaths.panel, label: 'Painel' },
  { id: occurrencePaths.search, label: 'Consulta' },
  { id: occurrencePaths.types, label: 'Tipos de ocorrência' },
];

/** Navegação existente do produto: Painel, Consulta e Tipos (registro pelo botão "Registrar"). */
export function OccurrenceNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = [...SECTIONS].reverse().find((s) => pathname === s.id || (s.id !== occurrencePaths.panel && pathname.startsWith(s.id)))?.id ?? occurrencePaths.panel;
  return (
    <div style={{ marginBottom: 16 }}>
      <Tabs label="Seções da Gestão de Ocorrências" items={SECTIONS} value={current} onChange={(id) => navigate(id)} />
    </div>
  );
}

const STATUS_TONE: Record<OccurrenceStatus, BadgeTone> = {
  'sem-tratamento': 'yellow',
  'em-andamento': 'blue',
  'em-pausa': 'orange',
  concluida: 'green',
};

/** Cores por prioridade (o produto existente usa uma cor por prioridade no Painel). */
export const PRIORITY_TONE: Record<OccurrencePriority, BadgeTone> = {
  critica: 'red',
  alta: 'orange',
  media: 'yellow',
  baixa: 'green',
  planejada: 'blue',
};

export function OccurrenceStatusBadge({ value }: { value: OccurrenceStatus }) {
  return <Badge tone={STATUS_TONE[value]}>{OCCURRENCE_STATUS_LABEL[value]}</Badge>;
}

export function OccurrencePriorityBadge({ value }: { value: OccurrencePriority }) {
  return <Badge tone={PRIORITY_TONE[value]}>{OCCURRENCE_PRIORITY_LABEL[value]}</Badge>;
}

export { styles as occurrenceStyles };
