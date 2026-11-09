import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, EmptyState, ErrorState, LoadingState, PageHeader, Paginator, Panel, Stack, tableStyles as t } from '@/components/ui';
import { PLAN_STATUS_LABEL, type PlanStatus } from '@/domain';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ProvisionalTag } from '@/modules/manutencao/shared';
import { EffectivenessBadge, PlanStatusBadge, PlansGate, fmtDate, planPaths } from './shared';

const selectStyle = { minHeight: 32, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' } as const;

/** Área "Planos de ação": planos de qualquer origem, inclusive os criados diretamente. */
export function PlansListPage() {
  return (
    <PlansGate title="Planos de ação">
      <PlansList />
    </PlansGate>
  );
}

function PlansList() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();
  const { activeLocationId } = useSession();
  usePageLabel('Planos de ação');
  const perm = services.plans.permissions(access);
  const status = sp.get('status') ?? 'ativos';
  const busca = sp.get('busca') ?? '';
  const mine = sp.get('meus') === '1';
  const page = Number(sp.get('pagina')) || 1;
  const set = (next: Record<string, string>) => {
    const merged = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    if (!('pagina' in next)) merged.delete('pagina');
    navigate(`${location.pathname}?${merged}`, { replace: true, state: location.state });
  };
  const [text, setText] = useState(busca);
  useEffect(() => setText(busca), [busca]);
  const query = useServiceQuery(
    () =>
      services.plans.list(access, {
        status: (status === 'todos' ? undefined : status) as PlanStatus | 'ativos' | undefined,
        search: busca || undefined,
        mine,
        locationId: activeLocationId ?? undefined,
        page,
        pageSize: 10,
      }),
    [sp.toString(), access, activeLocationId],
  );

  return (
    <>
      <PageHeader
        title="Planos de ação"
        description="Capacidade compartilhada do GRS: o plano tem ciclo próprio e guarda a origem e o contexto; os módulos criam, vinculam e consultam."
        actions={
          perm.manage ? (
            <Button icon="plus" onClick={() => navigate(planPaths.create())}>
              Novo plano
            </Button>
          ) : undefined
        }
      />
      <Stack>
        <Alert tone="info">
          Área própria fora dos módulos, como capacidade compartilhada. <ProvisionalTag code="P-70">Arquitetura e navegação provisórias</ProvisionalTag>
        </Alert>
        <Panel title={`Planos${query.data ? ` (${query.data.total})` : ''}`} flush>
          <div className={t.tableHeading}>
            <form
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
              onSubmit={(e) => {
                e.preventDefault();
                set({ busca: text });
              }}
            >
              <select aria-label="Status" value={status} onChange={(e) => set({ status: e.target.value })} style={selectStyle}>
                <option value="ativos">Ativos (não concluídos nem cancelados)</option>
                <option value="todos">Todos</option>
                {(Object.keys(PLAN_STATUS_LABEL) as PlanStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PLAN_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={mine} onChange={(e) => set({ meus: e.target.checked ? '1' : '' })} /> Somente os meus
              </label>
              <input aria-label="Buscar planos" type="search" placeholder="Código, título, objetivo" value={text} onChange={(e) => setText(e.target.value)} style={{ ...selectStyle, minWidth: 220 }} />
              <Button type="submit" size="small" variant="secondary" icon="search">
                Buscar
              </Button>
            </form>
          </div>
          {query.error ? (
            <ErrorState compact kind={500} text={query.error.message} />
          ) : !query.data ? (
            <LoadingState compact />
          ) : query.data.items.length === 0 ? (
            <EmptyState compact icon="tasks" title="Nenhum plano encontrado." />
          ) : (
            <>
              <div className={t.tableWrap}>
                <table className={t.table}>
                  <caption className="visually-hidden">Planos de ação</caption>
                  <thead>
                    <tr>
                      <th scope="col">Plano</th>
                      <th scope="col">Local</th>
                      <th scope="col">Responsável</th>
                      <th scope="col">Ações</th>
                      <th scope="col">Prazo</th>
                      <th scope="col">Status</th>
                      <th scope="col">Eficácia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map(({ plan: p, locationPath, responsibleName, actionsDone, actionsTotal, flags }) => (
                      <tr key={p.id}>
                        <td style={{ minWidth: 240 }}>
                          <ContextLink to={planPaths.detail(p.id)}>{p.code}</ContextLink> — {p.title}
                          {flags.length > 0 && <div className="helper" style={{ color: 'var(--sds-orange-dark, #a35300)' }}>{flags.join(' · ')}</div>}
                        </td>
                        <td>{locationPath.at(-1)?.name}</td>
                        <td>{responsibleName}</td>
                        <td>
                          {actionsDone}/{actionsTotal} concluídas
                        </td>
                        <td>{fmtDate(p.dueDate)}</td>
                        <td>
                          <PlanStatusBadge value={p.status} />
                        </td>
                        <td>
                          <EffectivenessBadge plan={p} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(n) => set({ pagina: String(n) })} />
            </>
          )}
        </Panel>
      </Stack>
    </>
  );
}
