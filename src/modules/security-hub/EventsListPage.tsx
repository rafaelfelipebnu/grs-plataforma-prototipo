import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { can } from '@/access';
import {
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  FilterPanel,
  LoadingState,
  PageHeader,
  Paginator,
  Panel,
  SelectField,
  Stack,
  TextField,
  tableStyles as t,
  useToast,
  type AppliedFilter,
} from '@/components/ui';
import { AlertStatusBadge, LocationPath, SEVERITY_LABEL, SeverityBadge, formatDateTime, formatRelative } from '@/components/domain';
import { EVENT_CATEGORY_LABEL, PERIOD_LABEL, type EventCategory, type Period, type Severity } from '@/domain';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { locationOptionLabel, useLocationOptions } from '@/app/hooks/useLocationOptions';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { SOURCE_LABEL } from '@/pages/records/shared';
import { hubPaths, parseEventParams, type EventListParams } from './hubPaths';

const SEVERITIES: Severity[] = ['critica', 'alta', 'media', 'baixa'];
const CATEGORIES = Object.keys(EVENT_CATEGORY_LABEL) as EventCategory[];
const PAGE_SIZE = 10;

/** Lista de eventos e alertas do Security Hub (destino do drill-down dos widgets). */
export function EventsListPage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const params = parseEventParams(searchParams);
  const locationOptions = useLocationOptions(2);
  const [draft, setDraft] = useState<EventListParams>(params);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const key = searchParams.toString();
  usePageLabel('lista de eventos');

  useEffect(() => {
    setDraft(parseEventParams(searchParams));
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const query = useServiceQuery(
    () =>
      services.hub.listEvents(access, {
        status: params.status,
        severities: params.severidade,
        categories: params.categoria,
        locationId: params.local,
        period: params.periodo,
        search: params.busca,
        sort: params.ordem,
        page: params.pagina,
        pageSize: PAGE_SIZE,
      }),
    [key, access],
  );

  // Mantém a pilha de contexto (voltar para…) ao mudar filtros e páginas.
  const go = (next: EventListParams) => navigate(hubPaths.events(next), { replace: true, state: location.state });

  const applied: AppliedFilter[] = [];
  if (params.status) applied.push({ key: 'status', label: 'Status', value: params.status === 'ativo' ? 'Ativo' : 'Reconhecido' });
  if (params.severidade?.length) applied.push({ key: 'severidade', label: 'Severidade', value: params.severidade.map((s) => SEVERITY_LABEL[s]).join(', ') });
  if (params.categoria?.length) applied.push({ key: 'categoria', label: 'Categoria', value: params.categoria.map((c) => EVENT_CATEGORY_LABEL[c]).join(', ') });
  if (params.local) applied.push({ key: 'local', label: 'Local', value: locationOptionLabel(locationOptions, params.local) });
  if (params.periodo) applied.push({ key: 'periodo', label: 'Período', value: PERIOD_LABEL[params.periodo] });
  if (params.busca) applied.push({ key: 'busca', label: 'Busca', value: params.busca });

  const toggleIn = <T,>(list: T[] | undefined, value: T): T[] =>
    list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];

  const acknowledge = async (ids: string[]) => {
    setBusy(true);
    try {
      const result = await services.hub.acknowledgeMany(access, ids);
      setSelected(new Set());
      toast.show({
        tone: result.acknowledged > 0 ? 'success' : 'info',
        title: result.acknowledged === 1 ? 'Alerta reconhecido' : `${result.acknowledged} alertas reconhecidos`,
        message: result.skipped > 0 ? `${result.skipped} já estavam reconhecidos.` : undefined,
      });
    } catch (error) {
      toast.show({ tone: 'error', title: 'Não foi possível reconhecer', message: isServiceError(error) ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const items = query.data?.items ?? [];
  const selectable = items.filter((i) => i.canAcknowledge);
  const allSelected = selectable.length > 0 && selectable.every((i) => selected.has(i.event.id));
  const canAckAny = can(access, 'hub.events.acknowledge');

  return (
    <>
      <ReturnBar />
      <PageHeader
        title="Eventos e alertas"
        breadcrumb={[{ label: 'Security Hub', to: '/security-hub' }, { label: 'Eventos' }]}
        description="Eventos de segurança e alertas de outros módulos que afetam a segurança, dentro do seu escopo."
      />
      <Stack>
        <FilterPanel
          applied={applied}
          onRemove={(k) => go({ ...params, [k]: undefined, pagina: 1 })}
          onApply={() => go({ ...draft, pagina: 1 })}
          onClear={() => setDraft({})}
        >
          <SelectField
            label="Status"
            emptyLabel="Todos"
            value={draft.status ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, status: (e.target.value || undefined) as EventListParams['status'] }))}
            options={[
              { value: 'ativo', label: 'Ativo' },
              { value: 'reconhecido', label: 'Reconhecido' },
            ]}
          />
          <SelectField
            label="Local"
            emptyLabel="Todo o seu escopo"
            value={draft.local ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, local: e.target.value || undefined }))}
            options={locationOptions}
            helper="Inclui os locais descendentes."
          />
          <SelectField
            label="Período"
            emptyLabel="Todo o histórico"
            value={draft.periodo ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, periodo: (e.target.value || undefined) as Period | undefined }))}
            options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          />
          <TextField label="Busca" value={draft.busca ?? ''} onChange={(e) => setDraft((d) => ({ ...d, busca: e.target.value || undefined }))} placeholder="Código, título ou descrição" />
          <fieldset className={t.filterFieldset}>
            <legend>Severidade</legend>
            {SEVERITIES.map((s) => (
              <Checkbox key={s} label={SEVERITY_LABEL[s]} checked={draft.severidade?.includes(s) ?? false} onChange={() => setDraft((d) => ({ ...d, severidade: toggleIn(d.severidade, s) }))} />
            ))}
          </fieldset>
          <fieldset className={t.filterFieldset}>
            <legend>Categoria</legend>
            {CATEGORIES.map((c) => (
              <Checkbox key={c} label={EVENT_CATEGORY_LABEL[c]} checked={draft.categoria?.includes(c) ?? false} onChange={() => setDraft((d) => ({ ...d, categoria: toggleIn(d.categoria, c) }))} />
            ))}
          </fieldset>
        </FilterPanel>

        <Panel title={`Resultados${query.data ? ` (${query.data.total})` : ''}`} flush>
          <div className={t.tableHeading}>
            {canAckAny && (
              <Button icon="check" disabled={selected.size === 0} loading={busy} onClick={() => acknowledge(Array.from(selected))}>
                Reconhecer selecionados{selected.size > 0 ? ` (${selected.size})` : ''}
              </Button>
            )}
            <div className={t.tableHeadingEnd}>
              <label className="helper" htmlFor="ordem-eventos">
                Ordenar por
              </label>
              <select
                id="ordem-eventos"
                value={params.ordem ?? 'recentes'}
                onChange={(e) => go({ ...params, ordem: e.target.value === 'severidade' ? 'severidade' : undefined, pagina: 1 })}
                style={{ minHeight: 32, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' }}
              >
                <option value="recentes">Mais recentes</option>
                <option value="severidade">Maior severidade</option>
              </select>
            </div>
          </div>
          {query.error ? (
            <ErrorState kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} compact text={query.error.message} />
          ) : !query.data ? (
            <LoadingState compact />
          ) : items.length === 0 ? (
            <EmptyState compact icon="bell-slash-o" title="Nenhum resultado encontrado para sua busca." />
          ) : (
            <>
              <div className={t.tableWrap}>
                <table className={t.table}>
                  <caption className="visually-hidden">Eventos e alertas</caption>
                  <thead>
                    <tr>
                      {canAckAny && (
                        <th className={t.checkCell}>
                          <input
                            type="checkbox"
                            aria-label="Selecionar todos os alertas ativos da página"
                            checked={allSelected}
                            disabled={selectable.length === 0}
                            onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((i) => i.event.id)))}
                          />
                        </th>
                      )}
                      <th scope="col">Severidade</th>
                      <th scope="col">Evento</th>
                      <th scope="col">Local</th>
                      <th scope="col">Origem</th>
                      <th scope="col">Ocorrido</th>
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="visually-hidden">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ event, locationPath, canAcknowledge }) => (
                      <tr key={event.id} className={selected.has(event.id) ? t.selected : undefined}>
                        {canAckAny && (
                          <td className={t.checkCell}>
                            <input
                              type="checkbox"
                              aria-label={`Selecionar ${event.code}`}
                              disabled={!canAcknowledge}
                              checked={selected.has(event.id)}
                              onChange={() =>
                                setSelected((s) => {
                                  const n = new Set(s);
                                  if (n.has(event.id)) n.delete(event.id);
                                  else n.add(event.id);
                                  return n;
                                })
                              }
                            />
                          </td>
                        )}
                        <td>
                          <SeverityBadge value={event.severity} />
                        </td>
                        <td style={{ minWidth: 240 }}>
                          <ContextLink to={paths.event(event.id)}>{event.title}</ContextLink>
                          <div className="helper">{event.code}</div>
                        </td>
                        <td>
                          <LocationPath path={locationPath} tail={2} />
                        </td>
                        <td className="muted">{SOURCE_LABEL[event.source]}</td>
                        <td title={formatDateTime(event.occurredAt)} style={{ whiteSpace: 'nowrap' }}>
                          {formatRelative(event.occurredAt)}
                        </td>
                        <td>
                          <AlertStatusBadge value={event.status} />
                        </td>
                        <td>
                          {canAcknowledge && (
                            <Button size="small" variant="secondary" icon="check" onClick={() => acknowledge([event.id])} disabled={busy}>
                              Reconhecer
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => go({ ...params, pagina: p })} />
            </>
          )}
        </Panel>
      </Stack>
    </>
  );
}
