import { useEffect, useState } from 'react';
import { isModuleAvailable } from '@/access';
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  FilterPanel,
  LoadingState,
  Paginator,
  Panel,
  SelectField,
  Stack,
  tableStyles as t,
  type AppliedFilter,
} from '@/components/ui';
import { AlertStatusBadge, LocationPath, SEVERITY_LABEL, SeverityBadge, formatDateTime, formatRelative } from '@/components/domain';
import { EVENT_CATEGORY_LABEL, PERIOD_LABEL, type AlertStatus, type EventCategory, type Period, type Severity, type SourceSystem } from '@/domain';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { useAcknowledge } from '@/modules/security-hub/widgets/useAcknowledge';
import { SOURCE_LABEL } from '@/pages/records/shared';
import type { CentralTabProps } from '../CentralHomePage';
import type { CentralParams } from '../centralPaths';

const PAGE_SIZE = 10;
const SEVERITIES: Severity[] = ['critica', 'alta', 'media', 'baixa', 'informativa'];

/**
 * Alertas e ocorrências do local e descendentes (docs/02). Mostra o local de
 * origem de cada alerta; o detalhe abre no módulo proprietário.
 * Ocorrências entram na etapa 5 (Gestão de Ocorrências).
 */
export function EventsTab({ params, go }: CentralTabProps) {
  const access = useAccess();
  const services = useServices();
  const { acknowledge, pending } = useAcknowledge();
  const [draft, setDraft] = useState<CentralParams>(params);
  const key = JSON.stringify(params);

  useEffect(() => {
    setDraft(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const query = useServiceQuery(
    () =>
      services.central.listEvents(access, {
        locationId: params.local,
        includeDescendants: !params.somente,
        source: params.origem,
        category: params.tipo,
        severities: params.severidade,
        status: params.status,
        period: params.periodo,
        page: params.pagina,
        pageSize: PAGE_SIZE,
      }),
    [key, access],
  );

  const applied: AppliedFilter[] = [];
  if (params.origem) applied.push({ key: 'origem', label: 'Origem', value: SOURCE_LABEL[params.origem] });
  if (params.tipo) applied.push({ key: 'tipo', label: 'Tipo', value: EVENT_CATEGORY_LABEL[params.tipo] });
  if (params.severidade?.length) applied.push({ key: 'severidade', label: 'Severidade', value: params.severidade.map((s) => SEVERITY_LABEL[s]).join(', ') });
  if (params.status) applied.push({ key: 'status', label: 'Status', value: params.status === 'ativo' ? 'Ativo' : 'Reconhecido' });
  if (params.periodo) applied.push({ key: 'periodo', label: 'Período', value: PERIOD_LABEL[params.periodo] });
  const items = query.data?.items ?? [];
  const toggle = (list: Severity[] | undefined, s: Severity) => (list?.includes(s) ? list.filter((x) => x !== s) : [...(list ?? []), s]);
  const sources = (Object.keys(SOURCE_LABEL) as SourceSystem[]).filter((s) => s === 'controle-acesso' || isModuleAvailable(access, s));

  return (
    <Stack>
      {!isModuleAvailable(access, 'ocorrencias') ? (
        <Alert tone="info">Ocorrências aparecem aqui com a Gestão de Ocorrências contratada.</Alert>
      ) : (
        <Alert tone="info">As ocorrências deste local estão na Gestão de Ocorrências (Painel e Consulta). A consolidação nesta aba entra em entrega futura.</Alert>
      )}
      <FilterPanel
        applied={applied}
        onRemove={(k) => go({ ...params, [k]: undefined, pagina: 1 })}
        onApply={() => go({ ...draft, pagina: 1 })}
        onClear={() => setDraft({ ...params, origem: undefined, tipo: undefined, severidade: undefined, status: undefined, periodo: undefined })}
      >
        <SelectField
          label="Origem"
          emptyLabel="Todas"
          options={sources.map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
          value={draft.origem ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, origem: (e.target.value || undefined) as SourceSystem | undefined }))}
        />
        <SelectField
          label="Tipo"
          emptyLabel="Todos"
          options={(Object.keys(EVENT_CATEGORY_LABEL) as EventCategory[]).map((c) => ({ value: c, label: EVENT_CATEGORY_LABEL[c] }))}
          value={draft.tipo ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, tipo: (e.target.value || undefined) as EventCategory | undefined }))}
        />
        <SelectField
          label="Status"
          emptyLabel="Todos"
          options={[
            { value: 'ativo', label: 'Ativo' },
            { value: 'reconhecido', label: 'Reconhecido' },
          ]}
          value={draft.status ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, status: (e.target.value || undefined) as AlertStatus | undefined }))}
        />
        <SelectField
          label="Período"
          emptyLabel="Todo o histórico"
          options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          value={draft.periodo ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, periodo: (e.target.value || undefined) as Period | undefined }))}
        />
        <fieldset className={t.filterFieldset}>
          <legend>Severidade</legend>
          {SEVERITIES.map((s) => (
            <Checkbox key={s} label={SEVERITY_LABEL[s]} checked={draft.severidade?.includes(s) ?? false} onChange={() => setDraft((d) => ({ ...d, severidade: toggle(d.severidade, s) }))} />
          ))}
        </fieldset>
      </FilterPanel>
      <Panel title={`Alertas${query.data ? ` (${query.data.total})` : ''}`} flush>
        {query.error ? (
          <ErrorState kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} compact text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : items.length === 0 ? (
          <EmptyState compact icon="bell-slash-o" title="Nenhum alerta encontrado neste recorte." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Alertas do local</caption>
                <thead>
                  <tr>
                    <th scope="col">Severidade</th>
                    <th scope="col">Alerta</th>
                    <th scope="col">Local de origem</th>
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
                    <tr key={event.id}>
                      <td>
                        <SeverityBadge value={event.severity} />
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <ContextLink to={paths.event(event.id)}>{event.title}</ContextLink>
                        <div className="helper">
                          {event.code} · {EVENT_CATEGORY_LABEL[event.category]}
                        </div>
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
                          <Button size="small" variant="secondary" icon="check" loading={pending === event.id} onClick={() => acknowledge(event.id, event.title)}>
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
  );
}
