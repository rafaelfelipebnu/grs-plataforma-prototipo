import { useLocation, useNavigate } from 'react-router-dom';
import { Badge, Tabs, type BadgeTone } from '@/components/ui';
import { ROUTINE_STATUS_LABEL, type RoutineExecutionStatus } from '@/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';

export const routinePaths = {
  overview: '/rotinas',
  executions: '/rotinas/consulta',
  execution: (id: string) => `/rotinas/execucoes/${id}`,
  catalog: '/rotinas/planos',
  reinspections: '/rotinas/reinspecoes',
  app: '/rotinas/app',
  appExecution: (id: string) => `/rotinas/app/${id}`,
};

/** Navegação de Gestão de Rotinas. "App (móvel)" é a experiência móvel própria de execução (docs/00). */
export function RoutinesNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const access = useAccess();
  const services = useServices();
  const perm = services.routines.permissions(access);
  const sections = [
    { id: routinePaths.overview, label: 'Visão geral' },
    { id: routinePaths.executions, label: 'Consulta de rotinas' },
    { id: routinePaths.catalog, label: 'Planos de rotina' },
    { id: routinePaths.reinspections, label: 'Reinspeções' },
    ...(perm.execute ? [{ id: routinePaths.app, label: 'App (móvel)' }] : []),
  ];
  const effective = pathname.startsWith('/rotinas/execucoes') ? routinePaths.executions : pathname;
  const current = [...sections].reverse().find((s) => effective === s.id || (s.id !== routinePaths.overview && effective.startsWith(s.id)))?.id ?? routinePaths.overview;
  return (
    <div style={{ marginBottom: 16 }}>
      <Tabs label="Seções da Gestão de Rotinas" items={sections} value={current} onChange={(id) => navigate(id)} />
    </div>
  );
}

const TONE: Record<RoutineExecutionStatus, BadgeTone> = {
  futura: 'gray',
  pendente: 'blue',
  'em-execucao': 'yellow',
  interrompida: 'orange',
  concluida: 'green',
  incompleta: 'orange',
  'nao-realizada': 'red',
  'finalizado-parcialmente': 'yellow',
};

export function RoutineStatusBadge({ value }: { value: RoutineExecutionStatus }) {
  return <Badge tone={TONE[value]}>{ROUTINE_STATUS_LABEL[value]}</Badge>;
}

export function ScoreBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">—</span>;
  return <Badge tone={value === 100 ? 'green' : value >= 50 ? 'yellow' : 'red'}>{value}%</Badge>;
}
