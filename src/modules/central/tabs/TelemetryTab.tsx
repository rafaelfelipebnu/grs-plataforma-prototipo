import { useEffect, useState } from 'react';
import { moduleAccess } from '@/access';
import { EmptyState, ErrorState, FilterPanel, LoadingState, Paginator, Panel, SelectField, Stack, TextField, tableStyles as t, type AppliedFilter } from '@/components/ui';
import { DataPointStatusBadge, LocationPath, formatDateTime, formatRelative, formatValue } from '@/components/domain';
import type { DataPointStatus } from '@/domain';
import { MODULES } from '@/modules/registry';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import type { CentralTabProps } from '../CentralHomePage';
import type { CentralParams } from '../centralPaths';

const PAGE_SIZE = 10;
const STATUS_LABEL: Record<DataPointStatus, string> = { normal: 'Normal', alerta: 'Alerta', critico: 'Crítico', sem_leitura: 'Sem leitura' };

/**
 * Telemetria consolidada: ponto → dispositivo → ativo (docs/02). Os pontos de
 * dado pertencem ao Monitor de Infraestrutura; a gestão técnica fica lá.
 */
export function TelemetryTab(props: CentralTabProps) {
  const access = useAccess();
  const state = moduleAccess(access, 'monitor');
  if (state !== 'available') {
    return (
      <Panel title="Telemetria">
        <EmptyState
          icon="lock"
          title={state === 'not-contracted' ? 'Telemetria disponível com o Monitor de Infraestrutura' : 'Seu perfil não consulta telemetria'}
          text={
            state === 'not-contracted'
              ? `${MODULES.monitor.valueProposition} Nenhum dado de telemetria é exibido sem a contratação.`
              : 'Os pontos de dado pertencem ao Monitor de Infraestrutura e exigem permissão de consulta nesse módulo.'
          }
        />
      </Panel>
    );
  }
  return <TelemetryList {...props} />;
}

function TelemetryList({ params, go }: CentralTabProps) {
  const access = useAccess();
  const services = useServices();
  const [draft, setDraft] = useState<CentralParams>(params);
  const key = JSON.stringify(params);

  useEffect(() => {
    setDraft(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const query = useServiceQuery(
    () =>
      services.central.listDataPoints(access, {
        locationId: params.local,
        includeDescendants: !params.somente,
        status: params.ponto,
        search: params.busca,
        page: params.pagina,
        pageSize: PAGE_SIZE,
      }),
    [key, access],
  );

  const applied: AppliedFilter[] = [];
  if (params.ponto) applied.push({ key: 'ponto', label: 'Status', value: STATUS_LABEL[params.ponto] });
  if (params.busca) applied.push({ key: 'busca', label: 'Busca', value: params.busca });
  const items = query.data?.items ?? [];

  return (
    <Stack>
      <FilterPanel
        applied={applied}
        onRemove={(k) => go({ ...params, [k]: undefined, pagina: 1 })}
        onApply={() => go({ ...draft, pagina: 1 })}
        onClear={() => setDraft({ ...params, ponto: undefined, busca: undefined })}
      >
        <SelectField
          label="Status do ponto"
          emptyLabel="Todos"
          options={(Object.keys(STATUS_LABEL) as DataPointStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          value={draft.ponto ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, ponto: (e.target.value || undefined) as DataPointStatus | undefined }))}
        />
        <TextField label="Busca" placeholder="Ponto, dispositivo ou ativo" value={draft.busca ?? ''} onChange={(e) => setDraft((d) => ({ ...d, busca: e.target.value || undefined }))} />
      </FilterPanel>
      <Panel title={`Pontos de dado${query.data ? ` (${query.data.total})` : ''}`} flush>
        {query.error ? (
          <ErrorState kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} compact text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : items.length === 0 ? (
          <EmptyState compact icon="line-chart" title="Nenhum ponto de dado neste recorte." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Pontos de dado</caption>
                <thead>
                  <tr>
                    <th scope="col">Ponto</th>
                    <th scope="col">Valor atual</th>
                    <th scope="col">Status</th>
                    <th scope="col">Última atualização</th>
                    <th scope="col">Dispositivo</th>
                    <th scope="col">Ativo</th>
                    <th scope="col">Local</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ point, device, asset, locationPath }) => (
                    <tr key={point.id}>
                      <td>{point.name}</td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{formatValue(point.value, point.unit)}</td>
                      <td>
                        <DataPointStatusBadge value={point.status} />
                      </td>
                      <td title={formatDateTime(point.updatedAt)} style={{ whiteSpace: 'nowrap' }}>
                        {formatRelative(point.updatedAt)}
                      </td>
                      <td>
                        <ContextLink to={paths.device(device.id)}>{device.name}</ContextLink>
                      </td>
                      <td>{asset ? <ContextLink to={paths.asset(asset.id)}>{asset.tag}</ContextLink> : <span className="muted">—</span>}</td>
                      <td>
                        <LocationPath path={locationPath} tail={2} />
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
      <p className="helper">Valores simulados. Configuração de coleta, limites e regras é feita no Monitor de Infraestrutura.</p>
    </Stack>
  );
}
