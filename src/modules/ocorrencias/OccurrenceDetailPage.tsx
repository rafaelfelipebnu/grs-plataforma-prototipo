import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Col, EmptyState, Grid, Icon, LabelValue, LabelValueGrid, PageHeader, Panel, SelectField, Stack, useToast } from '@/components/ui';
import { LocationPath, formatDateTime } from '@/components/domain';
import { CONCLUSION_CRITERION_LABEL, OCCURRENCE_ORIGIN_LABEL, OCCURRENCE_PRIORITIES, OCCURRENCE_PRIORITY_LABEL, REQUEST_STATUS_LABEL, type OccurrencePriority } from '@/domain';
import { MODULES } from '@/modules/registry';
import { ReasonModal, errorMessage } from '@/modules/central/shared';
import { ActionModal, ProvisionalTag, TextArea, formatDuration, maintenancePaths } from '@/modules/manutencao/shared';
import type { ConclusionCondition, OccurrenceDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, useContextNavigation, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { OccurrenceNav, OccurrencePriorityBadge, OccurrenceStatusBadge, occurrencePaths, occurrenceStyles as s } from './shared';
import { PlanStatusBadge, planPaths } from '@/modules/planos/shared';

type Dialog = 'pausar' | 'prioridade' | 'concluir' | 'pedir-aprovacao' | 'aprovar' | 'recusar' | 'excecao' | null;

export function OccurrenceDetailPage() {
  const { occurrenceId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.occurrences.get(access, occurrenceId), [occurrenceId, access]);
  usePageLabel(query.data ? `Ocorrência ${query.data.occurrence.code}` : 'Ocorrência');
  return (
    <>
      <PageHeader
        title={query.data ? `${query.data.occurrence.code} — ${query.data.type.name}` : 'Ocorrência'}
        breadcrumb={[
          { label: MODULES.ocorrencias.name, to: occurrencePaths.panel },
          { label: 'Consulta', to: occurrencePaths.search },
          { label: query.data?.occurrence.code ?? '…' },
        ]}
      />
      <OccurrenceNav />
      <QueryBoundary query={query} moduleId="ocorrencias">
        {(d) => <DetailView d={d} />}
      </QueryBoundary>
    </>
  );
}

function DetailView({ d }: { d: OccurrenceDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const { navigateWithContext } = useContextNavigation();
  const o = d.occurrence;
  const a = d.actions;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const close = () => setDialog(null);
  const ok = (title: string, message?: string) => {
    toast.show({ tone: 'success', title, message });
    close();
  };
  const openPause = o.pauses.find((p) => !p.endedAt);
  const typeConditions = d.check.conditions.filter((c) => c.origin === 'tipo');

  const resume = async () => {
    setBusy(true);
    try {
      await services.occurrences.resume(access, o.id);
      toast.show({ tone: 'success', title: 'Ocorrência retomada', message: 'A contagem da pausa foi encerrada.' });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Não foi possível retomar', message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack>
      {openPause && (
        <Alert tone="warning" title="Em pausa">
          Desde {formatDateTime(openPause.startedAt)}. Justificativa: {openPause.reason}. A prioridade não pode ser alterada e a ocorrência não pode ser concluída até ser
          retomada (DP-03, DP-04a).
        </Alert>
      )}
      {o.approvalRequest && (
        <Alert tone="info" title="Conclusão aguardando aprovação">
          Pedida por {d.approvalRequestedByName} em {formatDateTime(o.approvalRequest.at)}. A ocorrência continua Em andamento até a decisão (DP-13).
          {d.actions.decideApprovalBlockedReason && <div className="helper">{d.actions.decideApprovalBlockedReason}</div>}
        </Alert>
      )}
      {o.conclusion && (
        <Alert tone="success" title="Concluída">
          {formatDateTime(o.conclusion.at)} por {d.conclusionByName}
          {d.approvedByName && `, aprovada por ${d.approvedByName}`}.{o.conclusion.justification && ` Justificativa: ${o.conclusion.justification}.`}
          {o.conclusion.exception && (
            <div>
              <strong>Exceção autorizada</strong> por {d.exceptionAuthorizedByName}. Condições dispensadas: {o.conclusion.exception.dispensed.join('; ')}. Justificativa:{' '}
              {o.conclusion.exception.justification}
            </div>
          )}
          <div className="helper">Sem reabertura: uma recorrência é registrada como nova ocorrência.</div>
        </Alert>
      )}

      <div className={s.actionsBar}>
        {a.resume && (
          <Button icon="play" loading={busy} onClick={resume}>
            Retomar
          </Button>
        )}
        {a.conclude && (
          <Button icon="check" onClick={() => setDialog('concluir')}>
            Concluir
          </Button>
        )}
        {a.requestApproval && (
          <Button icon="check" onClick={() => setDialog('pedir-aprovacao')}>
            Solicitar aprovação da conclusão
          </Button>
        )}
        {a.decideApproval && (
          <>
            <Button icon="thumbs-up" onClick={() => setDialog('aprovar')}>
              Aprovar conclusão
            </Button>
            <Button variant="secondary" icon="thumbs-down" onClick={() => setDialog('recusar')}>
              Recusar
            </Button>
          </>
        )}
        {a.pause && (
          <Button variant="secondary" icon="pause" onClick={() => setDialog('pausar')}>
            Pausar
          </Button>
        )}
        {a.changePriority && (
          <Button variant="secondary" icon="sort-amount-desc" onClick={() => setDialog('prioridade')}>
            Alterar prioridade
          </Button>
        )}
        {a.openMaintenanceRequest && (
          <Button variant="secondary" icon="wrench" onClick={() => navigateWithContext(maintenancePaths.newRequestFromOccurrence(o.id))}>
            Abrir solicitação de manutenção
          </Button>
        )}
        {a.concludeWithException && (
          <Button variant="link" icon="unlock-alt" onClick={() => setDialog('excecao')}>
            Concluir com exceção
          </Button>
        )}
      </div>

      <Grid>
        <Col span={8}>
          <Stack>
            <Panel title="Ocorrência">
              <LabelValueGrid>
                <LabelValue label="Status">
                  <OccurrenceStatusBadge value={o.status} />
                </LabelValue>
                <LabelValue label="Prioridade">
                  <OccurrencePriorityBadge value={o.priority} />
                </LabelValue>
                <LabelValue label="Tipo">{d.type.name}</LabelValue>
                <LabelValue label="Local físico">
                  <LocationPath path={d.locationPath} />
                </LabelValue>
                <LabelValue label="Ativo relacionado">
                  {d.asset ? (
                    <ContextLink to={paths.asset(d.asset.id)}>
                      {d.asset.tag} — {d.asset.name}
                    </ContextLink>
                  ) : (
                    'Não informado'
                  )}
                </LabelValue>
                <LabelValue label="Data da ocorrência">{formatDateTime(o.occurredAt)}</LabelValue>
                <LabelValue label="Registro">
                  {formatDateTime(o.createdAt)} · {d.registeredByName}
                </LabelValue>
                <LabelValue label="Origem">
                  {OCCURRENCE_ORIGIN_LABEL[o.origin]}
                  {d.sourceEvent && (
                    <div>
                      <ContextLink to={paths.event(d.sourceEvent.id)}>
                        {d.sourceEvent.code} — {d.sourceEvent.title}
                      </ContextLink>
                    </div>
                  )}
                </LabelValue>
                <LabelValue label="Pessoas envolvidas">
                  {d.involvedPeople.length ? d.involvedPeople.map((p) => <div key={p.id}><ContextLink to={paths.person(p.id)}>{p.name}</ContextLink></div>) : 'Nenhuma'}
                </LabelValue>
              </LabelValueGrid>
              <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{o.description}</p>
            </Panel>

            {o.status !== 'concluida' && <ConclusionPanel d={d} />}

            <ProceedingsPanel d={d} />

            <PlansPanel d={d} />

            {(d.linkedRequests.length > 0 || d.hiddenLinkedRequests > 0) && (
              <Panel title="Solicitações de manutenção">
                {d.linkedRequests.map((r) => (
                  <div key={r.id} className={s.badges} style={{ padding: '4px 0' }}>
                    <ContextLink to={maintenancePaths.request(r.id)}>{r.code}</ContextLink> — {r.title} · <span className="helper">{REQUEST_STATUS_LABEL[r.status]}</span>
                  </div>
                ))}
                {d.hiddenLinkedRequests > 0 && <p className="helper">{d.hiddenLinkedRequests} solicitação(ões) vinculada(s) fora do seu acesso à Manutenção.</p>}
                <p className="helper">A solicitação e a OS seguem o ciclo da Manutenção; encerrar a OS não conclui a ocorrência.</p>
              </Panel>
            )}
          </Stack>
        </Col>
        <Col span={4}>
          <Stack>
            <Panel title="Tempos">
              <LabelValueGrid>
                <LabelValue label="Tempo de resposta">{d.times.responseMs !== undefined ? formatDuration(d.times.responseMs) : 'Aguardando 1º trâmite'}</LabelValue>
                <LabelValue label="Tempo em pausa">{formatDuration(d.times.pausedMs)}</LabelValue>
                <LabelValue label="Tempo de solução">{d.times.solutionMs !== undefined ? formatDuration(d.times.solutionMs) : 'Em aberto'}</LabelValue>
              </LabelValueGrid>
              <p className="helper" style={{ marginTop: 8 }}>
                Resposta: registro → primeiro trâmite humano. Solução: desconta o tempo em pausa.
              </p>
            </Panel>
            <Panel title="Histórico" flush>
              <ol className={s.timeline}>
                {d.history.map((h, i) => (
                  <li key={`${h.at}-${i}`} className={h.kind === 'automatico' ? s.auto : undefined}>
                    <div>{h.text}</div>
                    <div className="helper">
                      {h.kind === 'automatico' ? 'Registro automático' : h.actorName} · {formatDateTime(h.at)}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </Stack>
        </Col>
      </Grid>

      <ReasonModal
        open={dialog === 'pausar'}
        title="Pausar ocorrência"
        label="Justificativa"
        confirmLabel="Pausar"
        onCancel={close}
        onConfirm={async (reason) => {
          await services.occurrences.pause(access, o.id, reason);
          ok('Ocorrência pausada', 'O tempo em pausa é descontado do tempo de solução.');
        }}
      >
        <p className="helper">
          Durante a pausa a prioridade não pode ser alterada e a ocorrência não pode ser concluída. Planos e ações não são pausados.
          {o.approvalRequest && ' O pedido de aprovação pendente será cancelado.'}
        </p>
      </ReasonModal>
      <PriorityModal open={dialog === 'prioridade'} d={d} onClose={close} onDone={() => ok('Prioridade alterada', 'A alteração ficou registrada no histórico.')} />
      <ConcludeModal
        open={dialog === 'concluir' || dialog === 'pedir-aprovacao'}
        approval={dialog === 'pedir-aprovacao'}
        d={d}
        onClose={close}
        onDone={(approval) => ok(approval ? 'Aprovação solicitada' : 'Ocorrência concluída', approval ? 'Quem pode concluir foi avisado no sino.' : undefined)}
      />
      <ActionModal
        open={dialog === 'aprovar'}
        title="Aprovar conclusão"
        confirmLabel="Aprovar e concluir"
        onCancel={close}
        onConfirm={async () => {
          await services.occurrences.decideApproval(access, o.id, true, '');
          ok('Conclusão aprovada', 'A ocorrência foi concluída.');
        }}
      >
        <p>
          Pedido de {d.approvalRequestedByName}
          {o.approvalRequest?.justification && <> com a justificativa: “{o.approvalRequest.justification}”</>}.
        </p>
        <p className="helper">
          Quem pede não aprova. <ProvisionalTag code="P-61">Regra de aprovador provisória</ProvisionalTag>
        </p>
      </ActionModal>
      <ReasonModal
        open={dialog === 'recusar'}
        title="Recusar conclusão"
        confirmLabel="Recusar"
        destructive
        onCancel={close}
        onConfirm={async (reason) => {
          await services.occurrences.decideApproval(access, o.id, false, reason);
          ok('Conclusão recusada', 'A ocorrência continua Em andamento.');
        }}
      />
      <ReasonModal
        open={dialog === 'excecao'}
        title="Concluir com exceção autorizada"
        label="Justificativa"
        confirmLabel="Concluir com exceção"
        destructive
        onCancel={close}
        onConfirm={async (reason) => {
          await services.occurrences.concludeWithException(access, o.id, reason);
          ok('Ocorrência concluída com exceção', 'Condições dispensadas, autorizador e justificativa ficaram registrados.');
        }}
      >
        <p>A exceção dispensa somente as condições configuradas no tipo:</p>
        <ul>
          {typeConditions.map((c) => (
            <li key={c.label}>{c.label}</li>
          ))}
        </ul>
        <p className="helper">Não dispensa a regra atual do produto (estar Em andamento com ao menos um trâmite) nem a proibição de concluir Em pausa.</p>
      </ReasonModal>
    </Stack>
  );
}

function ConditionIcon({ c }: { c: ConclusionCondition }) {
  if (c.state === 'atendida') return <Icon name="check-circle" className={s.ok} label="Atendida" />;
  if (c.state === 'na-conclusao') return <Icon name="pencil-square-o" className={s.atConclusion} label="Informada na conclusão" />;
  return <Icon name="clock-o" className={s.pending} label="Pendente" />;
}

/** Pendências de conclusão: regra atual + condições do tipo (DP-01: indicadores, não status). */
function ConclusionPanel({ d }: { d: OccurrenceDetail }) {
  const t = d.type.conclusion;
  return (
    <Panel title="Pendências de conclusão">
      <ul className={s.conditions}>
        {d.check.conditions.map((c) => (
          <li key={c.label}>
            <ConditionIcon c={c} />
            <div>
              {c.label}
              <div className="helper">
                {c.origin === 'regra-atual' ? 'Regra atual do produto' : 'Configurada no tipo'}
                {c.state === 'na-conclusao' && ' · informada no momento de concluir'}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="helper" style={{ marginTop: 8 }}>
        Critério de conclusão do tipo: {CONCLUSION_CRITERION_LABEL[t.criterion]}.{' '}
        {!t.requireEvidence && !t.requireJustification && t.criterion === 'manual' ? 'Sem condições adicionais: vale a regra atual.' : ''}
      </p>
      {(t.requireEvidence || t.requireJustification || t.criterion !== 'manual') && (
        <ProvisionalTag code="P-62">Aplicação das condições provisória</ProvisionalTag>
      )}
    </Panel>
  );
}

/** Planos de ação vinculados (capacidade compartilhada): ciclos independentes da ocorrência. */
function PlansPanel({ d }: { d: OccurrenceDetail }) {
  const access = useAccess();
  const services = useServices();
  const { navigateWithContext } = useContextNavigation();
  const plans = services.plans.permissions(access);
  if (!plans.view) return null;
  if (!plans.contracted) {
    return (
      <Panel title="Planos de ação">
        <p className="helper">Planos de ação são habilitados por Ocorrências Avançadas, Gestão de Rotinas ou Gestão de Manutenção.</p>
      </Panel>
    );
  }
  const o = d.occurrence;
  const canCreate = plans.manage && services.occurrences.permissions(access).treat;
  return (
    <Panel
      title={`Planos de ação (${d.linkedPlans.length})`}
      actions={
        canCreate ? (
          <Button size="small" variant="secondary" icon="plus" onClick={() => navigateWithContext(planPaths.create({ ocorrencia: o.id }))}>
            Criar plano
          </Button>
        ) : undefined
      }
    >
      {d.linkedPlans.length === 0 ? (
        <p className="helper">Nenhum plano vinculado.</p>
      ) : (
        d.linkedPlans.map((p) => (
          <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
            <ContextLink to={planPaths.detail(p.id)}>{p.code}</ContextLink> — {p.title} <PlanStatusBadge value={p.status} />
          </div>
        ))
      )}
      <p className="helper" style={{ marginTop: 8 }}>
        Planos têm ciclo próprio: concluir a ocorrência não conclui nem cancela planos, e concluir um plano não conclui a ocorrência.
        {o.status === 'concluida' && ' Vincular plano a ocorrência concluída exige justificativa e não reabre a ocorrência (DP-08).'}
      </p>
    </Panel>
  );
}

function ProceedingsPanel({ d }: { d: OccurrenceDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const o = d.occurrence;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await services.occurrences.addProceeding(access, o.id, { text, attachments });
      toast.show({ tone: 'success', title: 'Trâmite registrado', message: o.status === 'sem-tratamento' ? 'A ocorrência passou a Em andamento.' : undefined });
      setText('');
      setAttachments([]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={`Trâmites (${d.proceedings.length})`} flush>
      {d.actions.proceed && (
        <div className={s.proceedingForm}>
          <TextArea id="proceeding" label="Novo trâmite" value={text} onChange={setText} placeholder="O que foi feito, verificado ou decidido." />
          <div className={s.actionsBar}>
            {attachments.map((name) => (
              <span key={name} className={s.attachment}>
                <Icon name="paperclip" /> {name}
              </span>
            ))}
            <Button size="small" variant="secondary" icon="paperclip" onClick={() => setAttachments((l) => [...l, `anexo-${o.code.toLowerCase()}-${d.proceedings.length + 1}-${l.length + 1}.jpg`])}>
              Anexar (simulado)
            </Button>
            <Button size="small" icon="comment" loading={busy} onClick={submit}>
              Registrar trâmite
            </Button>
          </div>
          {error && <span style={{ color: 'var(--sds-red)', fontSize: 13 }}>{error}</span>}
        </div>
      )}
      {d.proceedings.length === 0 ? (
        <EmptyState compact icon="comments-o" title="Nenhum trâmite." text="O primeiro trâmite humano leva a ocorrência para Em andamento e encerra o tempo de resposta." />
      ) : (
        <ol className={s.timeline}>
          {d.proceedings.map(({ proceeding: p, authorName }) => (
            <li key={p.id}>
              <div>{p.text}</div>
              {p.attachments.map((name) => (
                <span key={name} className={s.attachment}>
                  <Icon name="paperclip" /> {name}
                </span>
              ))}
              <div className="helper">
                {authorName} · {formatDateTime(p.at)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function PriorityModal({ open, d, onClose, onDone }: { open: boolean; d: OccurrenceDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const [priority, setPriority] = useState<OccurrencePriority>(d.occurrence.priority);
  return (
    <ActionModal
      open={open}
      title="Alterar prioridade"
      confirmLabel="Salvar"
      onCancel={onClose}
      onConfirm={async () => {
        await services.occurrences.changePriority(access, d.occurrence.id, priority);
        onDone();
      }}
    >
      <SelectField
        label="Prioridade"
        options={OCCURRENCE_PRIORITIES.map((p) => ({ value: p, label: OCCURRENCE_PRIORITY_LABEL[p] }))}
        value={priority}
        onChange={(e) => setPriority(e.target.value as OccurrencePriority)}
        helper={`Atual: ${OCCURRENCE_PRIORITY_LABEL[d.occurrence.priority]}. A alteração fica no histórico.`}
      />
    </ActionModal>
  );
}

function ConcludeModal({ open, approval, d, onClose, onDone }: { open: boolean; approval: boolean; d: OccurrenceDetail; onClose: () => void; onDone: (approval: boolean) => void }) {
  const access = useAccess();
  const services = useServices();
  const [justification, setJustification] = useState('');
  const [evidences, setEvidences] = useState<string[]>([]);
  const t = d.type.conclusion;
  const needsEvidence = t.requireEvidence && !d.check.typeMet;
  return (
    <ActionModal
      open={open}
      title={approval ? 'Solicitar aprovação da conclusão' : 'Concluir ocorrência'}
      confirmLabel={approval ? 'Solicitar aprovação' : 'Concluir'}
      onCancel={onClose}
      onConfirm={async () => {
        const input = { justification, evidenceNames: evidences };
        if (approval) await services.occurrences.requestApproval(access, d.occurrence.id, input);
        else await services.occurrences.conclude(access, d.occurrence.id, input);
        setJustification('');
        setEvidences([]);
        onDone(approval);
      }}
    >
      {approval && <p className="helper">O tipo exige aprovação: a ocorrência continua Em andamento até que outra pessoa com permissão de concluir decida.</p>}
      <TextArea
        id="conclusion-justification"
        label="Justificativa de conclusão"
        required={t.requireJustification}
        value={justification}
        onChange={setJustification}
        helper={t.requireJustification ? 'Exigida pelo tipo.' : 'Opcional.'}
      />
      {(t.requireEvidence || evidences.length > 0) && (
        <div>
          <span className="helper">{needsEvidence ? 'O tipo exige evidência: nenhuma foi anexada em trâmites.' : 'Evidências (opcional — já há evidência em trâmite).'}</span>
          <div className={s.actionsBar} style={{ marginTop: 4 }}>
            {evidences.map((name) => (
              <span key={name} className={s.attachment}>
                <Icon name="paperclip" /> {name}
              </span>
            ))}
            <Button size="small" variant="secondary" icon="paperclip" onClick={() => setEvidences((l) => [...l, `evidencia-${d.occurrence.code.toLowerCase()}-${l.length + 1}.jpg`])}>
              Anexar evidência (simulado)
            </Button>
          </div>
        </div>
      )}
      {!approval && <p className="helper">Concluir encerra o tempo de solução. Não há reabertura. Planos e solicitações vinculados seguem seus próprios ciclos.</p>}
    </ActionModal>
  );
}
