import { useParams } from 'react-router-dom';
import { Alert, Button, LabelValue, LabelValueGrid, PageHeader, Panel, Stack, useToast } from '@/components/ui';
import { LOCATION_LEVEL_LABEL } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { QueryBoundary } from '../QueryBoundary';
import { LocationLink, PersonRef } from './shared';

/** Localização (cadastro único da Central). A visão por local com abas chega na etapa 3. */
export function LocationPage() {
  const { locationId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const { activeLocationId, setActiveLocation } = useSession();
  const query = useServiceQuery(() => services.locations.get(access, locationId), [locationId, access]);
  usePageLabel(query.data ? query.data.location.name : undefined);

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query} moduleId="central">
        {(d) => (
          <>
            <PageHeader
              title={d.location.name}
              breadcrumb={[{ label: MODULES.central.name, to: '/central' }, { label: 'Locais' }, { label: d.location.name }]}
              description={`${LOCATION_LEVEL_LABEL[d.location.level]} · ${d.location.code}`}
              actions={
                <Button
                  variant="secondary"
                  icon="map-marker"
                  disabled={activeLocationId === d.location.id}
                  onClick={() => {
                    setActiveLocation(d.location.id);
                    toast.show({ tone: 'success', title: 'Localização contextual atualizada', message: d.location.name });
                  }}
                >
                  {activeLocationId === d.location.id ? 'Localização contextual atual' : 'Usar como localização contextual'}
                </Button>
              }
            />
            <Stack>
              <Alert tone="info">
                A visão por local (visão geral, ativos, dispositivos, telemetria, grupos e alertas/ocorrências) será implementada na etapa 3.
              </Alert>
              <Panel title="Dados da localização">
                <LabelValueGrid>
                  <LabelValue label="Caminho">
                    <LocationLink path={d.path} />
                  </LabelValue>
                  <LabelValue label="Nível">{LOCATION_LEVEL_LABEL[d.location.level]}</LabelValue>
                  <LabelValue label="Código">{d.location.code}</LabelValue>
                  <LabelValue label="Responsável">
                    <PersonRef person={d.responsible} />
                  </LabelValue>
                  <LabelValue label="Locais filhos no seu escopo">{d.childCount}</LabelValue>
                </LabelValueGrid>
              </Panel>
            </Stack>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
