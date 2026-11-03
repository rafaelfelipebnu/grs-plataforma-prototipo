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
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
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
                <Alert tone="info">
                  Encaminhamentos a partir do evento — abrir solicitação de manutenção ou registrar ocorrência — serão habilitados quando os
                  módulos especialistas forem implementados (etapa 5).
                </Alert>
              </Stack>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}
