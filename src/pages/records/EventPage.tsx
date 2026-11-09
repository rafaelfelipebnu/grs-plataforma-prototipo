import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Col, Grid, LabelValue, LabelValueGrid, PageHeader, Panel, Stack, useToast } from '@/components/ui';
import { AlertStatusBadge, SeverityBadge, formatDateTime, formatRelative } from '@/components/domain';
import { EVENT_CATEGORY_LABEL } from '@/domain';
import { MODULES } from '@/modules/registry';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, useContextNavigation, usePageLabel } from '@/app/navigation/contextNavigation';
import { occurrencePaths } from '@/modules/ocorrencias/shared';
import { maintenancePaths } from '@/modules/manutencao/shared';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { LinkedRecordList, OpenRecordsNotice, useLinkedRecords } from '@/app/integration/LinkedRecords';
import { isModuleAvailable } from '@/access';
import { QueryBoundary } from '../QueryBoundary';
import { LocationLink, PersonRef, SOURCE_LABEL } from './shared';
import styles from '../Pages.module.css';

/**
 * Detalhe de evento/alerta no Security Hub, com a ação de reconhecimento.
 * Reconhecer o alerta é distinto de ler a notificação.
 */
export function EventPage() {
  const { eventId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [acknowledging, setAcknowledging] = useState(false);
  const query = useServiceQuery(() => services.events.get(access, eventId), [eventId, access]);
  usePageLabel(query.data ? `Evento ${query.data.event.code}` : undefined);
  const { navigateWithContext } = useContextNavigation();
  const forward = {
    register: services.occurrences.permissions(access).register,
    request: services.maintenance.permissions(access).request,
  };

  const acknowledge = async () => {
    setAcknowledging(true);
    try {
      const updated = await services.events.acknowledge(access, eventId);
      toast.show({ tone: 'success', title: 'Alerta reconhecido', message: `${updated.event.code} · ${updated.event.title}` });
    } catch (error) {
      toast.show({ tone: 'error', title: 'Não foi possível reconhecer o alerta', message: isServiceError(error) ? error.message : undefined });
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query} moduleId="security-hub">
        {(d) => {
          const { event } = d;
          return (
            <>
              <PageHeader
                title={event.title}
                breadcrumb={[{ label: MODULES['security-hub'].name, to: '/security-hub' }, { label: 'Eventos', to: '/security-hub/eventos' }, { label: event.code }]}
                description={
                  <span className={styles.recordHeader}>
                    <SeverityBadge value={event.severity} />
                    <AlertStatusBadge value={event.status} />
                    <span className="helper">
                      {event.code} · {formatRelative(event.occurredAt)}
                    </span>
                  </span>
                }
                actions={
                  d.canAcknowledge ? (
                    <Button icon="check" onClick={acknowledge} loading={acknowledging}>
                      Reconhecer alerta
                    </Button>
                  ) : undefined
                }
              />
              <Stack>
                {event.securityContext && (
                  <Alert tone="warning" title="Impacto em segurança">
                    {event.securityContext}
                  </Alert>
                )}
                {event.status === 'reconhecido' && (
                  <Alert tone="success" title="Alerta reconhecido">
                    Por <PersonRef person={d.acknowledgedBy} /> em {formatDateTime(event.acknowledgedAt)}.
                  </Alert>
                )}
                <Grid>
                  <Col span={8}>
                    <Panel title="Detalhes do evento">
                      <LabelValueGrid>
                        <LabelValue label="Descrição">{event.description}</LabelValue>
                        <LabelValue label="Origem">{SOURCE_LABEL[event.source]}</LabelValue>
                        <LabelValue label="Categoria">{EVENT_CATEGORY_LABEL[event.category]}</LabelValue>
                        <LabelValue label="Ocorrido em">{formatDateTime(event.occurredAt)}</LabelValue>
                        <LabelValue label="Local de origem">
                          <LocationLink path={d.locationPath} />
                        </LabelValue>
                      </LabelValueGrid>
                    </Panel>
                  </Col>
                  <Col span={4}>
                    <Panel title="Contexto">
                      <LabelValueGrid>
                        <LabelValue label="Ativo relacionado">
                          {d.asset ? (
                            <ContextLink to={paths.asset(d.asset.id)}>
                              {d.asset.tag} · {d.asset.name}
                            </ContextLink>
                          ) : (
                            <span className="muted">Nenhum</span>
                          )}
                        </LabelValue>
                        <LabelValue label="Dispositivo">
                          {d.device ? <ContextLink to={paths.device(d.device.id)}>{d.device.name}</ContextLink> : <span className="muted">Nenhum</span>}
                        </LabelValue>
                      </LabelValueGrid>
                    </Panel>
                  </Col>
                </Grid>
                <EventForwarding eventId={event.id} assetId={event.assetId} assetTag={d.asset?.tag} forward={forward} />
                {(forward.register || forward.request) && (
                  <Panel title="Encaminhar">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {forward.register && (
                        <Button variant="secondary" icon="exclamation-triangle" onClick={() => navigateWithContext(occurrencePaths.register(event.id))}>
                          Registrar ocorrência
                        </Button>
                      )}
                      {forward.request && (
                        <Button variant="secondary" icon="wrench" onClick={() => navigateWithContext(maintenancePaths.newRequestFromEvent(event.id))}>
                          Abrir solicitação de manutenção
                        </Button>
                      )}
                    </div>
                    <p className="helper" style={{ marginTop: 8 }}>
                      O registro é criado no módulo responsável, com este evento como origem. O status do evento não muda: reconhecer o alerta continua sendo uma ação
                      do Security Hub.
                    </p>
                  </Panel>
                )}
              </Stack>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}

/**
 * Rastreabilidade do evento: o que foi criado a partir dele e o que já está em
 * aberto para o ativo afetado. Consulta os módulos donos; nada é associado
 * automaticamente e nada bloqueia um novo encaminhamento.
 */
function EventForwarding({
  eventId,
  assetId,
  assetTag,
  forward,
}: {
  eventId: string;
  assetId?: string;
  assetTag?: string;
  forward: { register: boolean; request: boolean };
}) {
  const access = useAccess();
  const fromEvent = useLinkedRecords({ eventId });
  const canSee = isModuleAvailable(access, 'ocorrencias') || isModuleAvailable(access, 'manutencao');
  if (!canSee) return null;
  const originated = fromEvent.data ?? [];
  return (
    <>
      <Panel title={`Registros originados deste evento${originated.length ? ` (${originated.length})` : ''}`}>
        {fromEvent.loading && !fromEvent.data ? (
          <p className="helper">Carregando registros…</p>
        ) : (
          <LinkedRecordList
            records={originated}
            empty={forward.register || forward.request ? 'Nenhuma ocorrência ou solicitação foi criada a partir deste evento.' : 'Nenhum registro originado deste evento no seu escopo.'}
          />
        )}
      </Panel>
      {assetId && <OpenRecordsNotice assetId={assetId} assetTag={assetTag} excludeIds={originated.map((r) => r.id)} />}
    </>
  );
}
