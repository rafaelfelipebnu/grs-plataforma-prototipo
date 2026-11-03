import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Col,
  EmptyState,
  ErrorState,
  FilterPanel,
  Grid,
  LoadingState,
  PageHeader,
  Paginator,
  Panel,
  SelectField,
  Stack,
  StatsCard,
  TextField,
  tableStyles as t,
  type AppliedFilter,
} from '@/components/ui';
import { LocationPath, formatDateTime } from '@/components/domain';
import { PASSAGE_DIRECTION_LABEL, PASSAGE_RESULT_LABEL, PERIOD_LABEL, type PassageDirection, type PassageResult, type Period } from '@/domain';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { locationOptionLabel, useLocationOptions } from '@/app/hooks/useLocationOptions';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { hubPaths, parseAccessParams, type AccessListParams } from './hubPaths';

const PAGE_SIZE = 10;

/** Passagens do Controle de Acesso (fonte integrada, simulada) — destino do drill-down. */
export function AccessListPage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const params = parseAccessParams(searchParams);
  const locationOptions = useLocationOptions(3);
  const [draft, setDraft] = useState<AccessListParams>(params);
  const key = searchParams.toString();
  usePageLabel('acessos');

  useEffect(() => {
    setDraft(parseAccessParams(searchParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const query = useServiceQuery(
    () =>
      services.hub.listAccess(access, {
        result: params.resultado,
        direction: params.direcao,
        locationId: params.local,
        period: params.periodo,
        search: params.busca,
        page: params.pagina,
        pageSize: PAGE_SIZE,
      }),
    [key, access],
  );

  const go = (next: AccessListParams) => navigate(hubPaths.access(next), { replace: true, state: location.state });

  const applied: AppliedFilter[] = [];
  if (params.resultado) applied.push({ key: 'resultado', label: 'Resultado', value: PASSAGE_RESULT_LABEL[params.resultado] });
  if (params.direcao) applied.push({ key: 'direcao', label: 'Direção', value: PASSAGE_DIRECTION_LABEL[params.direcao] });
  if (params.local) applied.push({ key: 'local', label: 'Local', value: locationOptionLabel(locationOptions, params.local) });
  if (params.periodo) applied.push({ key: 'periodo', label: 'Período', value: PERIOD_LABEL[params.periodo] });
  if (params.busca) applied.push({ key: 'busca', label: 'Busca', value: params.busca });

  return (
    <>
      <ReturnBar />
      <PageHeader
        title="Acessos"
        breadcrumb={[{ label: 'Security Hub', to: '/security-hub' }, { label: 'Acessos' }]}
        description="Passagens registradas pelo Controle de Acesso (integração simulada), dentro do seu escopo."
      />
      <Stack>
        {query.data && (
          <Grid>
            <Col span={4}>
              <StatsCard icon="check" tone="green" title="Liberados no filtro" value={query.data.granted} onClick={() => go({ ...params, resultado: 'liberado', pagina: 1 })} />
            </Col>
            <Col span={4}>
              <StatsCard icon="ban" tone="red" title="Negados no filtro" value={query.data.denied} onClick={() => go({ ...params, resultado: 'negado', pagina: 1 })} />
            </Col>
          </Grid>
        )}
        <FilterPanel
          applied={applied}
          onRemove={(k) => go({ ...params, [k]: undefined, pagina: 1 })}
          onApply={() => go({ ...draft, pagina: 1 })}
          onClear={() => setDraft({})}
        >
          <SelectField
            label="Resultado"
            emptyLabel="Todos"
            value={draft.resultado ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, resultado: (e.target.value || undefined) as PassageResult | undefined }))}
            options={[
              { value: 'liberado', label: 'Liberado' },
              { value: 'negado', label: 'Negado' },
            ]}
          />
          <SelectField
            label="Direção"
            emptyLabel="Todas"
            value={draft.direcao ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, direcao: (e.target.value || undefined) as PassageDirection | undefined }))}
            options={[
              { value: 'entrada', label: 'Entrada' },
              { value: 'saida', label: 'Saída' },
            ]}
          />
          <SelectField label="Local" emptyLabel="Todo o seu escopo" value={draft.local ?? ''} onChange={(e) => setDraft((d) => ({ ...d, local: e.target.value || undefined }))} options={locationOptions} />
          <SelectField
            label="Período"
            emptyLabel="Todo o histórico"
            value={draft.periodo ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, periodo: (e.target.value || undefined) as Period | undefined }))}
            options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          />
          <TextField label="Busca" value={draft.busca ?? ''} onChange={(e) => setDraft((d) => ({ ...d, busca: e.target.value || undefined }))} placeholder="Pessoa ou credencial" />
        </FilterPanel>

        <Panel title={`Passagens${query.data ? ` (${query.data.total})` : ''}`} flush>
          {query.error ? (
            <ErrorState kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} compact text={query.error.message} />
          ) : !query.data ? (
            <LoadingState compact />
          ) : query.data.items.length === 0 ? (
            <EmptyState compact icon="id-card-o" title="Nenhum resultado encontrado para sua busca." />
          ) : (
            <>
              <div className={t.tableWrap}>
                <table className={t.table}>
                  <caption className="visually-hidden">Passagens de acesso</caption>
                  <thead>
                    <tr>
                      <th scope="col">Horário</th>
                      <th scope="col">Pessoa ou credencial</th>
                      <th scope="col">Local</th>
                      <th scope="col">Direção</th>
                      <th scope="col">Resultado</th>
                      <th scope="col">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map(({ passage, personName, personId, locationPath }) => (
                      <tr key={passage.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(passage.occurredAt)}</td>
                        <td>
                          {personName && personId ? <ContextLink to={paths.person(personId)}>{personName}</ContextLink> : <span className="muted">Não identificada</span>}
                          <div className="helper">{passage.credential}</div>
                        </td>
                        <td>
                          <LocationPath path={locationPath} tail={2} />
                        </td>
                        <td>{PASSAGE_DIRECTION_LABEL[passage.direction]}</td>
                        <td>
                          <Badge tone={passage.result === 'liberado' ? 'green' : 'red'}>{PASSAGE_RESULT_LABEL[passage.result]}</Badge>
                        </td>
                        <td className="muted">{passage.reason ?? '—'}</td>
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
