import { useEffect, useState } from 'react';
import { isModuleAvailable } from '@/access';
import { Alert, Button, EmptyState, ErrorState, FilterPanel, LoadingState, Paginator, Panel, SelectField, Stack, TextField, tableStyles as t, type AppliedFilter } from '@/components/ui';
import { CommunicationBadge, DeviceLocationBadge, LocationPath } from '@/components/domain';
import { DEVICE_LOCATION_STATUS_LABEL, type DeviceLocationStatus } from '@/domain';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, useContextNavigation } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import type { CentralTabProps } from '../CentralHomePage';
import { centralPaths, type CentralParams } from '../centralPaths';

const PAGE_SIZE = 10;

/**
 * Aba Dispositivos: identidade e associação (Central). Estados distintos de
 * localização — descoberta não confirma localização física (docs/02, docs/07).
 * Saúde/conectividade é dado do Monitor e só aparece com ele disponível.
 */
export function DevicesTab({ params, go }: CentralTabProps) {
  const access = useAccess();
  const services = useServices();
  const [draft, setDraft] = useState<CentralParams>(params);
  const key = JSON.stringify(params);
  const monitor = isModuleAvailable(access, 'monitor');
  const pending = services.discovery.pendingCount(access);
  const { navigateWithContext } = useContextNavigation();

  useEffect(() => {
    setDraft(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const query = useServiceQuery(
    () =>
      services.central.listDevices(access, {
        locationId: params.local,
        includeDescendants: !params.somente,
        locationStatus: params.estado,
        search: params.busca,
        page: params.pagina,
        pageSize: PAGE_SIZE,
      }),
    [key, access],
  );

  const applied: AppliedFilter[] = [];
  if (params.estado) applied.push({ key: 'estado', label: 'Localização', value: DEVICE_LOCATION_STATUS_LABEL[params.estado] });
  if (params.busca) applied.push({ key: 'busca', label: 'Busca', value: params.busca });
  const items = query.data?.items ?? [];

  return (
    <Stack>
      <Alert
        tone={pending > 0 ? 'warning' : 'info'}
        title={pending > 0 ? `${pending} dispositivo(s) aguardando revisão` : undefined}
        action={
          pending > 0 ? (
            <Button size="small" icon="check-square-o" onClick={() => navigateWithContext(centralPaths.review)}>
              Revisar descobertas
            </Button>
          ) : undefined
        }
      >
        Dispositivos descobertos chegam com localização <strong>sugerida</strong> ou <strong>não identificada</strong>: a localização física, a criação e a
        associação a ativo só valem após aprovação humana na Central.
      </Alert>
      <FilterPanel
        applied={applied}
        onRemove={(k) => go({ ...params, [k]: undefined, pagina: 1 })}
        onApply={() => go({ ...draft, pagina: 1 })}
        onClear={() => setDraft({ ...params, estado: undefined, busca: undefined })}
      >
        <SelectField
          label="Estado da localização"
          emptyLabel="Todos"
          options={(Object.keys(DEVICE_LOCATION_STATUS_LABEL) as DeviceLocationStatus[]).map((s) => ({ value: s, label: DEVICE_LOCATION_STATUS_LABEL[s] }))}
          value={draft.estado ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, estado: (e.target.value || undefined) as DeviceLocationStatus | undefined }))}
        />
        <TextField label="Busca" placeholder="Nome, tipo, fabricante, modelo ou protocolo" value={draft.busca ?? ''} onChange={(e) => setDraft((d) => ({ ...d, busca: e.target.value || undefined }))} />
      </FilterPanel>
      <Panel title={`Dispositivos${query.data ? ` (${query.data.total})` : ''}`} flush>
        {query.error ? (
          <ErrorState kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} compact text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : items.length === 0 ? (
          <EmptyState compact icon="microchip" title="Nenhum dispositivo encontrado neste recorte." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Dispositivos</caption>
                <thead>
                  <tr>
                    <th scope="col">Dispositivo</th>
                    <th scope="col">Localização</th>
                    <th scope="col">Estado da localização</th>
                    <th scope="col">Ativo associado</th>
                    <th scope="col">Pontos de dado</th>
                    {monitor && <th scope="col">Comunicação</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ device, locationPath, asset, health, dataPointCount }) => (
                    <tr key={device.id}>
                      <td style={{ minWidth: 220 }}>
                        <ContextLink to={paths.device(device.id)}>{device.name}</ContextLink>
                        <div className="helper">
                          {device.deviceType} · {device.protocol} · {device.origin === 'descoberta' ? 'descoberto' : device.origin === 'importacao' ? 'importado' : 'cadastro manual'}
                        </div>
                      </td>
                      <td>
                        {locationPath.length ? (
                          <>
                            <LocationPath path={locationPath} tail={2} />
                            {device.locationStatus === 'sugerida' && <div className="helper">Sugestão — não confirmada</div>}
                          </>
                        ) : (
                          <span className="muted">Não identificada</span>
                        )}
                      </td>
                      <td>
                        <DeviceLocationBadge value={device.locationStatus} />
                      </td>
                      <td>{asset ? <ContextLink to={paths.asset(asset.id)}>{asset.tag}</ContextLink> : <span className="muted">Sem associação</span>}</td>
                      <td>{dataPointCount}</td>
                      {monitor && <td>{health ? <CommunicationBadge value={health.communication} /> : <span className="muted">—</span>}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => go({ ...params, pagina: p })} />
          </>
        )}
      </Panel>
      {!monitor && <p className="helper">Conectividade e saúde dos dispositivos são exibidas com o Monitor de Infraestrutura contratado.</p>}
    </Stack>
  );
}
