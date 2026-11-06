import type { ReactNode } from 'react';
import { Badge, EmptyState, PageHeader, Panel, type BadgeTone } from '@/components/ui';
import { EFFECTIVENESS_LABEL, PLAN_ACTION_STATUS_LABEL, PLAN_STATUS_LABEL, type ActionPlan, type PlanActionStatus, type PlanStatus } from '@/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';

export const planPaths = {
  list: '/planos',
  create: (params: { ocorrencia?: string; relacionado?: string } = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return `/planos/novo${q ? `?${q}` : ''}`;
  },
  detail: (id: string) => `/planos/${id}`,
};

const PLAN_TONE: Record<PlanStatus, BadgeTone> = {
  rascunho: 'gray',
  'em-andamento': 'blue',
  pausado: 'orange',
  'aguardando-aprovacao': 'yellow',
  concluido: 'green',
  cancelado: 'gray',
};

const ACTION_TONE: Record<PlanActionStatus, BadgeTone> = {
  pendente: 'gray',
  'em-execucao': 'blue',
  concluida: 'green',
  cancelada: 'gray',
};

export function PlanStatusBadge({ value }: { value: PlanStatus }) {
  return <Badge tone={PLAN_TONE[value]}>{PLAN_STATUS_LABEL[value]}</Badge>;
}

export function ActionStatusBadge({ value }: { value: PlanActionStatus }) {
  return <Badge tone={ACTION_TONE[value]}>{PLAN_ACTION_STATUS_LABEL[value]}</Badge>;
}

export function EffectivenessBadge({ plan }: { plan: ActionPlan }) {
  const e = plan.effectiveness;
  if (!e) return <span className="muted">—</span>;
  if (e.state === 'pendente') return <Badge tone="yellow">Eficácia pendente</Badge>;
  const tone: BadgeTone = e.result === 'eficaz' ? 'green' : e.result === 'parcial' ? 'orange' : 'red';
  return (
    <Badge tone={tone}>
      {EFFECTIVENESS_LABEL[e.result!]}
      {e.state === 'aguardando-aprovacao' ? ' (aguardando aprovação)' : ''}
    </Badge>
  );
}

/**
 * Acesso à capacidade compartilhada: contratada com Ocorrências Avançadas,
 * Gestão de Rotinas ou Gestão de Manutenção [C]; sem contrato, aparece
 * bloqueada com explicação e sem dados operacionais (CLAUDE.md).
 */
export function PlansGate({ title, children }: { title: string; children: ReactNode }) {
  const access = useAccess();
  const services = useServices();
  const perm = services.plans.permissions(access);
  if (!perm.contracted) {
    return (
      <>
        <PageHeader title={title} />
        <Panel title="Capacidade não contratada">
          <EmptyState
            icon="lock"
            title="Planos de ação não contratados"
            text="Planos de ação são uma capacidade compartilhada do GRS, habilitada por Ocorrências Avançadas, Gestão de Rotinas ou Gestão de Manutenção. Organizam ações com executores, prazos, dependências, evidências e avaliação de eficácia. Nenhum dado é exibido sem a contratação."
          />
        </Panel>
      </>
    );
  }
  if (!perm.view) {
    return (
      <>
        <PageHeader title={title} />
        <Panel title="Acesso">
          <EmptyState icon="ban" title="Seu perfil não acessa planos de ação." />
        </Panel>
      </>
    );
  }
  return <>{children}</>;
}

export const fmtDate = (date?: string) => (date ? date.split('-').reverse().join('/') : '—');
