import { useNavigate } from 'react-router-dom';
import { Button, PageHeader, Panel, Stack } from '@/components/ui';
import { LocationPath, formatRelative } from '@/components/domain';
import { OCCURRENCE_PRIORITIES, OCCURRENCE_PRIORITY_LABEL } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { OccurrenceListItem, OccurrencePanelColumn } from '@/services';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { OccurrenceNav, OccurrencePriorityBadge, OccurrenceStatusBadge, occurrencePaths, occurrenceStyles as s } from './shared';

const PRIORITY_COLOR = { critica: 'var(--sds-red)', alta: 'var(--sds-orange, #f57c00)', media: 'var(--sds-yellow, #f9a825)', baixa: 'var(--sds-green, #2e7d32)', planejada: 'var(--sds-blue, #1565c0)' } as const;

const STATUS_COLUMNS: { id: OccurrencePanelColumn; label: string }[] = [
  { id: 'sem-tratamento', label: 'Sem tratamento' },
  { id: 'em-andamento', label: 'Em andamento' },
  { id: 'em-pausa', label: 'Em pausa' },
  { id: 'concluidas-24h', label: 'Concluídas nas últimas 24h' },
];

/** Painel de ocorrências (produto existente): pendentes por prioridade e por status. */
export function OccurrencePanelPage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  usePageLabel('Painel de ocorrências');
  const perm = services.occurrences.permissions(access);
  const { activeLocationId } = useSession();
  const contextPath = activeLocationId ? services.locations.pathOf(access, activeLocationId) : [];
  const query = useServiceQuery(() => services.occurrences.panel(access, { locationId: activeLocationId ?? undefined }), [access, activeLocationId]);

  return (
    <>
      <PageHeader
        title={MODULES.ocorrencias.name}
        description="Registro e tratamento de ocorrências com os status existentes: Sem tratamento, Em andamento, Em pausa e Concluída."
        actions={
          <>
            <Button variant="secondary" icon="search" onClick={() => navigate(occurrencePaths.search)}>
              Ver mais ocorrências
            </Button>
            {perm.register && (
              <Button icon="plus" onClick={() => navigate(occurrencePaths.register())}>
                Registrar ocorrência
              </Button>
            )}
          </>
        }
      />
      <OccurrenceNav />
      <QueryBoundary query={query} moduleId="ocorrencias">
        {(p) => (
          <Stack>
            <p className="helper" style={{ margin: 0 }}>
              Contexto de localização ativo:{' '}
              {contextPath.length > 0 ? <LocationPath path={contextPath} icon={false} /> : 'todas as localizações do seu escopo'}.
            </p>
            <Panel title="Pendentes por prioridade">
              <div className={s.columns}>
                {OCCURRENCE_PRIORITIES.map((pr) => (
                  <Column key={pr} label={`${OCCURRENCE_PRIORITY_LABEL[pr]}s`} color={PRIORITY_COLOR[pr]} items={p.pendingByPriority[pr]} showStatus />
                ))}
              </div>
            </Panel>
            <Panel title="Por status">
              <div className={s.columns}>
                {STATUS_COLUMNS.map((c) => (
                  <Column key={c.id} label={c.label} items={p.byStatus[c.id]} showPriority />
                ))}
              </div>
              <p className="helper" style={{ marginTop: 8 }}>
                Até 100 registros por status, ordenados por prioridade e data de registro.
              </p>
            </Panel>
          </Stack>
        )}
      </QueryBoundary>
    </>
  );
}

function Column({ label, items, color, showStatus, showPriority }: { label: string; items: OccurrenceListItem[]; color?: string; showStatus?: boolean; showPriority?: boolean }) {
  return (
    <section className={s.column} aria-label={label}>
      <header className={s.columnHeader} style={color ? ({ '--col-color': color } as React.CSSProperties) : undefined}>
        <span>{label}</span>
        <span>{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="helper" style={{ padding: 12, margin: 0 }}>
          Nenhuma.
        </p>
      ) : (
        <ul className={s.columnBody}>
          {items.map(({ occurrence: o, type, locationPath, awaitingApproval }) => (
            <li key={o.id}>
              <ContextLink to={occurrencePaths.detail(o.id)}>
                {o.code} — {type.name}
              </ContextLink>
              <div className={s.meta}>
                {locationPath.at(-1)?.name} · {formatRelative(o.createdAt)}
              </div>
              <div className={s.badges} style={{ marginTop: 4 }}>
                {showStatus && <OccurrenceStatusBadge value={o.status} />}
                {showPriority && <OccurrencePriorityBadge value={o.priority} />}
                {awaitingApproval && <span className={s.meta}>Aguardando aprovação</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
