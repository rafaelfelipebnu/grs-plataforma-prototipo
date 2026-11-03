import { useParams } from 'react-router-dom';
import { Alert, LabelValue, LabelValueGrid, PageHeader, Panel, Stack } from '@/components/ui';
import { PERSON_TYPE_LABEL } from '@/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { QueryBoundary } from '../QueryBoundary';
import { LocationLink, SOURCE_LABEL } from './shared';

/**
 * Consulta de pessoa vinda de fonte integrada (Controle de Acesso, simulado).
 * Somente leitura: o GRS não mantém cadastro próprio de pessoas.
 */
export function PersonPage() {
  const { personId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.people.get(access, personId), [personId, access]);
  usePageLabel(query.data?.person.name);

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query}>
        {(d) => (
          <>
            <PageHeader
              title={d.person.name}
              breadcrumb={[{ label: 'Pessoas' }, { label: d.person.name }]}
              description={`${PERSON_TYPE_LABEL[d.person.personType]} · ${d.person.jobTitle}`}
            />
            <Stack>
              <Alert tone="info">
                Dados consultados da fonte integrada {SOURCE_LABEL[d.person.source]}. Alterações são feitas no sistema de origem.
              </Alert>
              <Panel title="Dados da pessoa">
                <LabelValueGrid>
                  <LabelValue label="Tipo">{PERSON_TYPE_LABEL[d.person.personType]}</LabelValue>
                  <LabelValue label="Cargo ou função">{d.person.jobTitle}</LabelValue>
                  <LabelValue label="Área">{d.orgUnit?.name}</LabelValue>
                  <LabelValue label="Localização de referência">
                    <LocationLink path={d.referenceLocationPath} />
                  </LabelValue>
                  <LabelValue label="E-mail (fictício)">{d.person.email}</LabelValue>
                  <LabelValue label="Identificador na origem">{d.person.externalRef}</LabelValue>
                </LabelValueGrid>
              </Panel>
            </Stack>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
