import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Badge, Button, Col, EmptyState, Grid, Icon, LabelValue, LabelValueGrid, PageHeader, Panel, SelectField, Stack, TextField, tableStyles as t, useToast } from '@/components/ui';
import { LocationPath, formatDateTime } from '@/components/domain';
import { EFFECTIVENESS_LABEL, OCCURRENCE_STATUS_LABEL, PLAN_ORIGIN_LABEL, REQUEST_STATUS_LABEL, WORK_ORDER_STATUS_LABEL, type EffectivenessResult } from '@/domain';
import { ReasonModal, errorMessage } from '@/modules/central/shared';
import { ActionModal, ProvisionalTag, TextArea, maintenancePaths } from '@/modules/manutencao/shared';
import { occurrencePaths } from '@/modules/ocorrencias/shared';
import type { PlanActionView, PlanDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, useContextNavigation, usePageLabel } from '@/app/navigation/contextNavigation';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { ActionStatusBadge, EffectivenessBadge, PlanStatusBadge, PlansGate, fmtDate, planPaths } from './shared';

type Dialog =
  | { kind: 'pausar' | 'cancelar' | 'reprogramar' | 'aprovar' | 'recusar' | 'avaliacao-config' | 'avaliar' | 'aprovar-avaliacao' | 'recusar-avaliacao' | 'vincular' }
  | { kind: 'acao-concluir' | 'acao-cancelar' | 'acao-reprogramar' | 'acao-dependencia' | 'acao-solicitacao' | 'acao-manter'; actionId: string }
  | null;

export function PlanDetailPage() {
  const { planId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.plans.get(access, planId), [planId, access]);
  usePageLabel(query.data ? `Plano ${query.data.plan.code}` : 'Plano de ação');
  return (
    <PlansGate title="Plano de ação">
      <PageHeader
        title={query.data ? `${query.data.plan.code} — ${query.data.plan.title}` : 'Plano de ação'}
        breadcrumb={[{ label: 'Planos de ação', to: planPaths.list }, { label: query.data?.plan.code ?? '…' }]}
      />
      <QueryBoundary query={query}>{(d) => <PlanView d={d} />}</QueryBoundary>
    </PlansGate>
  );
}

function PlanView({ d }: { d: PlanDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const { navigateWithContext } = useContextNavigation();
  const p = d.plan;
  const c = d.can;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const close = () => setDialog(null);
  const ok = (title: string, message?: string) => {
    toast.show({ tone: 'success', title, message });
    close();
  };
  const run = async (key: string, fn: () => Promise<void>, title: string, message?: string) => {
    setBusy(key);
    try {
      await fn();
      toast.show({ tone: 'success', title, message });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Ação não realizada', message: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };
  const openPause = p.pauses.find((x) => !x.endedAt);
  const actionOf = (id: string) => d.actions.find((a) => a.action.id === id);
  const current = dialog && 'actionId' in dialog ? actionOf(dialog.actionId) : undefined;

  return (
    <Stack>
      {openPause && (
        <Alert tone="warning" title="Plano pausado">
          Desde {formatDateTime(openPause.startedAt)}. {openPause.reason}. As ações mantêm seus status e não avançam até a retomada.{' '}
          <ProvisionalTag code="P-73">Efeito da pausa nas ações</ProvisionalTag>
        </Alert>
      )}
      {p.status === 'aguardando-aprovacao' && (
        <Alert tone="info" title="Aguardando aprovação final">
          Aprovador: {d.approverName}.
        </Alert>
      )}
      {p.status === 'cancelado' && <Alert tone="info" title="Plano cancelado">{p.cancelReason}</Alert>}
      {p.status === 'concluido' && (
        <Alert tone="success" title="Plano concluído">
          Concluído é final: não há reabertura (DP-23). Concluir o plano não conclui as ocorrências vinculadas.
        </Alert>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {c.activate && (
          <Button icon="play" loading={busy === 'ativar'} disabled={d.activationMissing.length > 0} onClick={() => run('ativar', () => services.plans.activate(access, p.id), 'Plano ativado', 'Os executores foram avisados.')}>
            Ativar plano
          </Button>
        )}
        {c.conclude && (
          <Button icon="check" loading={busy === 'concluir'} disabled={d.conclusionMissing.length > 0} onClick={() => run('concluir', () => services.plans.conclude(access, p.id), p.approvalMode === 'final' ? 'Enviado para aprovação final' : 'Plano concluído', 'O avaliador de eficácia foi avisado.')}>
            {p.approvalMode === 'final' ? 'Enviar para aprovação final' : 'Concluir plano'}
          </Button>
        )}
        {c.decideApproval && (
          <>
            <Button icon="thumbs-up" onClick={() => setDialog({ kind: 'aprovar' })}>
              Aprovar conclusão
            </Button>
            <Button variant="secondary" icon="thumbs-down" onClick={() => setDialog({ kind: 'recusar' })}>
              Recusar
            </Button>
          </>
        )}
        {c.resume && (
          <Button icon="play" loading={busy === 'retomar'} onClick={() => run('retomar', () => services.plans.resume(access, p.id), 'Plano retomado')}>
            Retomar
          </Button>
        )}
        {c.pause && (
          <Button variant="secondary" icon="pause" onClick={() => setDialog({ kind: 'pausar' })}>
            Pausar
          </Button>
        )}
        {c.reschedule && (
          <Button variant="secondary" icon="calendar" onClick={() => setDialog({ kind: 'reprogramar' })}>
            Reprogramar prazo
          </Button>
        )}
        {c.edit && (
          <Button variant="secondary" icon="star-half-o" onClick={() => setDialog({ kind: 'avaliacao-config' })}>
            Definir avaliação de eficácia
          </Button>
        )}
        {c.cancel && (
          <Button variant="link" icon="ban" onClick={() => setDialog({ kind: 'cancelar' })}>
            Cancelar plano
          </Button>
        )}
      </div>
      {d.activationMissing.length > 0 && c.activate && <p className="helper">Para ativar, falta: {d.activationMissing.join('; ')}.</p>}
      {d.conclusionMissing.length > 0 && c.conclude && <p className="helper">Para concluir, falta: {d.conclusionMissing.join('; ')}.</p>}

      <Grid>
        <Col span={8}>
          <Stack>
            <Panel title="Plano">
              <LabelValueGrid>
                <LabelValue label="Status">
                  <PlanStatusBadge value={p.status} />
                </LabelValue>
                <LabelValue label="Responsável">{d.responsibleName}</LabelValue>
                <LabelValue label="Prazo global">
                  {fmtDate(p.dueDate)}
                  {p.originalDueDate && <div className="helper">Original: {fmtDate(p.originalDueDate)}</div>}
                </LabelValue>
                <LabelValue label="Origem (imutável)">
                  {PLAN_ORIGIN_LABEL[p.origin.module]}
                  {d.originOccurrenceCode && ` — ${d.originOccurrenceCode}`}
                  <div className="helper">{formatDateTime(p.origin.at)}. Origem não confere propriedade (D-011).</div>
                </LabelValue>
                <LabelValue label="Local (contexto)">
                  <LocationPath path={d.locationPath} />
                </LabelValue>
                <LabelValue label="Aprovação">{p.approvalMode === 'final' ? `Final — ${d.approverName}` : 'Sem aprovação'}</LabelValue>
                <LabelValue label="Avaliação de eficácia">
                  {d.evaluatorName ? `${d.evaluatorName} · prevista para ${fmtDate(p.evaluationDueDate)}` : 'Avaliador não definido'}
                  {d.evaluationApproverName && <div className="helper">Aprovador da avaliação: {d.evaluationApproverName}</div>}
                </LabelValue>
                {d.relatedPlan && (
                  <LabelValue label="Plano anterior">
                    <ContextLink to={planPaths.detail(d.relatedPlan.id)}>{d.relatedPlan.code}</ContextLink>
                  </LabelValue>
                )}
              </LabelValueGrid>
              <p style={{ marginTop: 12 }}>{p.objective}</p>
            </Panel>

            <ActionsPanel d={d} onDialog={setDialog} busy={busy} run={run} />

            <EffectivenessPanel d={d} onDialog={setDialog} onRelated={() => navigateWithContext(planPaths.create({ relacionado: p.id }))} />

            <Panel
              title={`Ocorrências vinculadas (${d.links.length})`}
              actions={
                c.linkOccurrence ? (
                  <Button size="small" variant="secondary" icon="link" onClick={() => setDialog({ kind: 'vincular' })}>
                    Vincular ocorrência
                  </Button>
                ) : undefined
              }
            >
              {d.links.length === 0 ? (
                <p className="helper">Nenhuma ocorrência vinculada. Plano criado diretamente pode ser vinculado depois.</p>
              ) : (
                d.links.map((l) => (
                  <div key={l.occurrenceId} style={{ padding: '4px 0' }}>
                    {l.occurrence ? (
                      <>
                        <ContextLink to={occurrencePaths.detail(l.occurrenceId)}>{l.occurrence.code}</ContextLink> — {l.occurrence.typeName} ·{' '}
                        <span className="helper">{OCCURRENCE_STATUS_LABEL[l.occurrence.status]}</span>
                      </>
                    ) : (
                      <span className="muted">Ocorrência {l.referenceCode} (sem acesso ao conteúdo)</span>
                    )}
                    <div className="helper">
                      Vinculada por {l.linkedByName} em {formatDateTime(l.linkedAt)}
                      {l.justification && ` — ${l.justification}`}
                    </div>
                  </div>
                ))
              )}
            </Panel>
          </Stack>
        </Col>
        <Col span={4}>
          <Stack>
            <Panel title="Indicadores">
              {d.flags.length ? d.flags.map((f) => <Badge key={f} tone="orange">{f}</Badge>) : <p className="helper">Nenhum indicador ativo.</p>}
              <p className="helper" style={{ marginTop: 8 }}>
                <Icon name="info-circle" /> "Plano em risco" considera prazo, progresso e dependências, com sinais configuráveis e <strong>sem valores padrão</strong> (DP-26). Nenhum sinal configurado nesta demonstração.
              </p>
            </Panel>
            <Panel title="Histórico" flush>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {d.history.map((h, i) => (
                  <li key={`${h.at}-${i}`} style={{ padding: '10px 16px', borderBottom: '1px solid var(--sds-border)' }}>
                    <div>{h.text}</div>
                    <div className="helper">
                      {h.actorName} · {formatDateTime(h.at)}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </Stack>
        </Col>
      </Grid>

      {/* ── Diálogos do plano ── */}
      <ReasonModal open={dialog?.kind === 'pausar'} title="Pausar plano" label="Justificativa" confirmLabel="Pausar" onCancel={close} onConfirm={async (r) => { await services.plans.pause(access, p.id, r); ok('Plano pausado'); }}>
        <p className="helper">As ações mantêm seus status individuais e não avançam durante a pausa. Não existe status "Pausada" para ações (DP-34).</p>
      </ReasonModal>
      <ReasonModal open={dialog?.kind === 'cancelar'} title="Cancelar plano" label="Justificativa" confirmLabel="Cancelar plano" destructive onCancel={close} onConfirm={async (r) => { await services.plans.cancel(access, p.id, r); ok('Plano cancelado', 'Ações concluídas foram preservadas.'); }}>
        <p className="helper">Ações não finalizadas passam a Canceladas. Plano cancelado nunca satisfaz a exigência de plano de uma ocorrência.</p>
      </ReasonModal>
      <RescheduleModal open={dialog?.kind === 'reprogramar'} current={p.dueDate} title="Reprogramar prazo global" onClose={close} onConfirm={async (date, reason) => { await services.plans.reschedule(access, p.id, date, reason); ok('Prazo reprogramado', 'Original e novo ficam no histórico.'); }} />
      <ActionModal open={dialog?.kind === 'aprovar'} title="Aprovar conclusão do plano" confirmLabel="Aprovar" onCancel={close} onConfirm={async () => { await services.plans.decideApproval(access, p.id, true, ''); ok('Plano aprovado e concluído'); }}>
        <p>A eficácia passa a "pendente de avaliação" com {d.evaluatorName}.</p>
      </ActionModal>
      <ReasonModal open={dialog?.kind === 'recusar'} title="Recusar conclusão" confirmLabel="Recusar" destructive onCancel={close} onConfirm={async (r) => { await services.plans.decideApproval(access, p.id, false, r); ok('Conclusão recusada', 'O plano volta a Em andamento.'); }} />
      <EvaluationConfigModal open={dialog?.kind === 'avaliacao-config'} d={d} onClose={close} onDone={() => ok('Avaliação de eficácia definida')} />
      <EvaluateModal open={dialog?.kind === 'avaliar'} d={d} onClose={close} onDone={() => ok('Eficácia avaliada')} />
      <ActionModal open={dialog?.kind === 'aprovar-avaliacao'} title="Aprovar avaliação de eficácia" confirmLabel="Aprovar" onCancel={close} onConfirm={async () => { await services.plans.decideEvaluation(access, p.id, true, ''); ok('Avaliação aprovada'); }}>
        <p>Resultado: {p.effectiveness?.result && EFFECTIVENESS_LABEL[p.effectiveness.result]}. {p.effectiveness?.justification}</p>
      </ActionModal>
      <ReasonModal open={dialog?.kind === 'recusar-avaliacao'} title="Recusar avaliação" confirmLabel="Recusar" destructive onCancel={close} onConfirm={async (r) => { await services.plans.decideEvaluation(access, p.id, false, r); ok('Avaliação recusada', 'Volta para o avaliador.'); }} />
      <LinkOccurrenceModal open={dialog?.kind === 'vincular'} d={d} onClose={close} onDone={() => ok('Ocorrência vinculada', 'A elegibilidade de conclusão da ocorrência foi recalculada.')} />

      {/* ── Diálogos da ação ── */}
      {current && (
        <>
          <ConcludeActionModal open={dialog?.kind === 'acao-concluir'} v={current} planId={p.id} onClose={close} onDone={() => ok(`Ação A${current.action.number} concluída`, 'Concluir a ação não conclui o plano.')} />
          <ReasonModal open={dialog?.kind === 'acao-cancelar'} title={`Cancelar ação A${current.action.number}`} label="Justificativa" confirmLabel="Cancelar ação" destructive onCancel={close} onConfirm={async (r) => { await services.plans.cancelAction(access, p.id, current.action.id, r); ok('Ação cancelada', 'Ações dependentes ficam bloqueadas até decisão (DP-32).'); }} />
          <RescheduleModal open={dialog?.kind === 'acao-reprogramar'} current={current.action.dueDate} title={`Reprogramar ação A${current.action.number}`} onClose={close} onConfirm={async (date, reason) => { await services.plans.rescheduleAction(access, p.id, current.action.id, date, reason); ok('Prazo da ação reprogramado'); }} />
          <DependencyModal open={dialog?.kind === 'acao-dependencia'} v={current} d={d} onClose={close} onDone={() => ok('Dependência revisada', 'A decisão ficou no histórico.')} onCancelAction={() => setDialog({ kind: 'acao-cancelar', actionId: current.action.id })} />
          <LinkRequestModal open={dialog?.kind === 'acao-solicitacao'} v={current} planId={p.id} onClose={close} onDone={() => ok('Solicitação vinculada à ação')} />
          <ReasonModal open={dialog?.kind === 'acao-manter'} title="Manter ação aberta" label="Justificativa" confirmLabel="Manter aberta" onCancel={close} onConfirm={async (r) => { await services.plans.keepActionOpen(access, p.id, current.action.id, r); ok('Ação mantida aberta'); }}>
            <p className="helper">A execução vinculada teve desfecho, mas a ação continua aberta por decisão do executor (DP-33).</p>
          </ReasonModal>
        </>
      )}
    </Stack>
  );
}

function ActionsPanel({ d, onDialog, busy, run }: { d: PlanDetail; onDialog: (x: Dialog) => void; busy: string | null; run: (key: string, fn: () => Promise<void>, title: string) => Promise<void> }) {
  const access = useAccess();
  const services = useServices();
  return (
    <Panel title={`Ações (${d.actions.length})`} flush>
      {d.actions.length === 0 ? (
        <EmptyState compact icon="tasks" title="Nenhuma ação." text="Inclua ao menos uma ação com executor e prazo para ativar o plano." />
      ) : (
        <div className={t.tableWrap}>
          <table className={t.table}>
            <caption className="visually-hidden">Ações do plano</caption>
            <thead>
              <tr>
                <th scope="col">Ação</th>
                <th scope="col">Executor / prazo</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {d.actions.map((v) => {
                const a = v.action;
                return (
                  <tr key={a.id}>
                    <td style={{ minWidth: 260 }}>
                      <strong>A{a.number}</strong> — {a.description}
                      {v.dependsOn.length > 0 && <div className="helper">Depende de: {v.dependsOn.map((x) => `A${x.number}`).join(', ')}</div>}
                      {v.linkedRequest && (
                        <div className="helper">
                          Solicitação <ContextLink to={maintenancePaths.request(v.linkedRequest.id)}>{v.linkedRequest.code}</ContextLink> ({REQUEST_STATUS_LABEL[v.linkedRequest.status]})
                          {v.linkedRequest.workOrder && (
                            <>
                              {' · OS '}
                              <ContextLink to={maintenancePaths.order(v.linkedRequest.workOrder.id)}>{v.linkedRequest.workOrder.code}</ContextLink> ({WORK_ORDER_STATUS_LABEL[v.linkedRequest.workOrder.status]})
                            </>
                          )}
                        </div>
                      )}
                      {v.linkedRequest === null && <div className="helper">Solicitação vinculada (sem acesso à Manutenção)</div>}
                      {a.resultNotes && <div className="helper">Resultado: {a.resultNotes}</div>}
                      {a.cancelReason && <div className="helper">Cancelada: {a.cancelReason}</div>}
                      {a.keptOpenReason && <div className="helper">Mantida aberta: {a.keptOpenReason}</div>}
                      {v.indicators.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {v.indicators.map((i) => (
                            <span key={i.kind} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                              <Badge tone={i.kind === 'execucao-concluida' ? 'green' : i.kind === 'atrasada' || i.kind === 'dependencia-cancelada' ? 'red' : 'orange'}>{i.label}</Badge>
                              {i.provisional && <ProvisionalTag code="P-74">Indicador</ProvisionalTag>}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {v.executorName}
                      <div className="helper">
                        {fmtDate(a.dueDate)}
                        {a.originalDueDate && ` (original ${fmtDate(a.originalDueDate)})`}
                      </div>
                    </td>
                    <td>
                      <ActionStatusBadge value={a.status} />
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                      {v.can.start && (
                        <Button size="small" icon="play" loading={busy === `start-${a.id}`} onClick={() => run(`start-${a.id}`, () => services.plans.startAction(access, d.plan.id, a.id), `Ação A${a.number} iniciada`)}>
                          Iniciar
                        </Button>
                      )}
                      {v.can.conclude && (
                        <Button size="small" icon="check" onClick={() => onDialog({ kind: 'acao-concluir', actionId: a.id })}>
                          Concluir
                        </Button>
                      )}
                      {v.can.resolveDependency && (
                        <Button size="small" variant="secondary" icon="random" onClick={() => onDialog({ kind: 'acao-dependencia', actionId: a.id })}>
                          Decidir dependência
                        </Button>
                      )}
                      {v.can.keepOpen && (
                        <Button size="small" variant="link" onClick={() => onDialog({ kind: 'acao-manter', actionId: a.id })}>
                          Manter aberta
                        </Button>
                      )}
                      {v.can.linkRequest && (
                        <Button size="small" variant="link" onClick={() => onDialog({ kind: 'acao-solicitacao', actionId: a.id })}>
                          Vincular solicitação
                        </Button>
                      )}
                      {v.can.reschedule && (
                        <Button size="small" variant="link" onClick={() => onDialog({ kind: 'acao-reprogramar', actionId: a.id })}>
                          Reprogramar
                        </Button>
                      )}
                      {v.can.cancel && (
                        <Button size="small" variant="link" onClick={() => onDialog({ kind: 'acao-cancelar', actionId: a.id })}>
                          Cancelar
                        </Button>
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {d.can.addAction && <NewActionForm d={d} />}
    </Panel>
  );
}

function NewActionForm({ d }: { d: PlanDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const executors = services.plans.peopleOptions(access, d.plan.locationId, 'execute');
  const [description, setDescription] = useState('');
  const [executor, setExecutor] = useState('');
  const [due, setDue] = useState('');
  const [deps, setDeps] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const candidates = d.actions.filter((v) => v.action.status !== 'cancelada');
  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await services.plans.addAction(access, d.plan.id, { description, executorUserId: executor, dueDate: due, dependsOn: deps });
      toast.show({ tone: 'success', title: 'Ação incluída' });
      setDescription('');
      setExecutor('');
      setDue('');
      setDeps([]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--sds-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong>Nova ação</strong>
      <TextField label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SelectField label="Executor" emptyLabel="Selecione" options={executors.map((x) => ({ value: x.userId, label: x.name }))} value={executor} onChange={(e) => setExecutor(e.target.value)} />
        <TextField label="Prazo" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
      {candidates.length > 0 && (
        <div>
          <span className="helper">Depende de (opcional):</span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {candidates.map((v) => (
              <label key={v.action.id} style={{ fontSize: 13, display: 'flex', gap: 4 }}>
                <input type="checkbox" checked={deps.includes(v.action.id)} onChange={(e) => setDeps((l) => (e.target.checked ? [...l, v.action.id] : l.filter((x) => x !== v.action.id)))} />A{v.action.number}
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <Button size="small" icon="plus" loading={busy} onClick={submit}>
          Incluir ação
        </Button>
      </div>
      {error && <span style={{ color: 'var(--sds-red)', fontSize: 13 }}>{error}</span>}
    </div>
  );
}

function EffectivenessPanel({ d, onDialog, onRelated }: { d: PlanDetail; onDialog: (x: Dialog) => void; onRelated: () => void }) {
  const p = d.plan;
  if (p.status !== 'concluido' && !d.followUpPlans.length) return null;
  return (
    <Panel title="Eficácia">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <EffectivenessBadge plan={p} />
        {p.effectiveness?.justification && <span className="helper">{p.effectiveness.justification}</span>}
      </div>
      <p className="helper" style={{ marginTop: 8 }}>
        Eficácia é atributo do plano, separada da execução. Ela não é condição para concluir a ocorrência nesta etapa (DP-10b).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {d.can.evaluate && (
          <Button icon="star-half-o" onClick={() => onDialog({ kind: 'avaliar' })}>
            Avaliar eficácia
          </Button>
        )}
        {d.can.decideEvaluation && (
          <>
            <Button icon="thumbs-up" onClick={() => onDialog({ kind: 'aprovar-avaliacao' })}>
              Aprovar avaliação
            </Button>
            <Button variant="secondary" icon="thumbs-down" onClick={() => onDialog({ kind: 'recusar-avaliacao' })}>
              Recusar avaliação
            </Button>
          </>
        )}
        {d.can.createRelated && (
          <Button variant="secondary" icon="plus" onClick={onRelated}>
            Criar plano relacionado
          </Button>
        )}
      </div>
      {d.followUpPlans.length > 0 && (
        <p style={{ marginTop: 8 }}>
          Planos relacionados:{' '}
          {d.followUpPlans.map((f) => (
            <ContextLink key={f.id} to={planPaths.detail(f.id)}>
              {f.code}
            </ContextLink>
          ))}
        </p>
      )}
    </Panel>
  );
}

function RescheduleModal({ open, current, title, onClose, onConfirm }: { open: boolean; current: string; title: string; onClose: () => void; onConfirm: (date: string, reason: string) => Promise<void> }) {
  const [date, setDate] = useState(current);
  const [reason, setReason] = useState('');
  return (
    <ActionModal open={open} title={title} confirmLabel="Reprogramar" onCancel={onClose} onConfirm={() => onConfirm(date, reason)}>
      <TextField label="Novo prazo" type="date" required value={date} onChange={(e) => setDate(e.target.value)} helper={`Prazo atual: ${fmtDate(current)}`} />
      <TextArea id="resched-reason" label="Motivo" required value={reason} onChange={setReason} />
    </ActionModal>
  );
}

function EvaluationConfigModal({ open, d, onClose, onDone }: { open: boolean; d: PlanDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const [evaluator, setEvaluator] = useState(d.plan.evaluatorUserId ?? '');
  const [date, setDate] = useState(d.plan.evaluationDueDate ?? '');
  const [approver, setApprover] = useState(d.plan.evaluationApproverUserId ?? '');
  const opts = (role: 'evaluate' | 'approve') => services.plans.peopleOptions(access, d.plan.locationId, role).map((x) => ({ value: x.userId, label: x.name }));
  return (
    <ActionModal open={open} title="Avaliação de eficácia" confirmLabel="Salvar" onCancel={onClose} onConfirm={async () => { await services.plans.setEvaluation(access, d.plan.id, { evaluatorUserId: evaluator, evaluationDueDate: date, evaluationApproverUserId: approver || undefined }); onDone(); }}>
      <SelectField label="Avaliador" required emptyLabel="Selecione" options={opts('evaluate')} value={evaluator} onChange={(e) => setEvaluator(e.target.value)} />
      <TextField label="Data prevista da avaliação" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      <SelectField label="Aprovador da avaliação (opcional)" emptyLabel="Sem aprovação" options={opts('approve')} value={approver} onChange={(e) => setApprover(e.target.value)} />
    </ActionModal>
  );
}

function EvaluateModal({ open, d, onClose, onDone }: { open: boolean; d: PlanDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const [result, setResult] = useState<EffectivenessResult>('eficaz');
  const [justification, setJustification] = useState('');
  return (
    <ActionModal open={open} title="Avaliar eficácia" confirmLabel="Registrar avaliação" onCancel={onClose} onConfirm={async () => { await services.plans.evaluate(access, d.plan.id, { result, justification }); onDone(); }}>
      <SelectField label="Resultado" required options={(Object.keys(EFFECTIVENESS_LABEL) as EffectivenessResult[]).map((r) => ({ value: r, label: EFFECTIVENESS_LABEL[r] }))} value={result} onChange={(e) => setResult(e.target.value as EffectivenessResult)} />
      <TextArea id="eff-just" label="Justificativa" required={result !== 'eficaz'} value={justification} onChange={setJustification} helper={result === 'eficaz' ? 'Opcional.' : 'Obrigatória. Com Parcial ou Ineficaz, poderá ser criado um plano relacionado (DP-23).'} />
      {d.evaluationApproverName && <p className="helper">A avaliação passa por aprovação de {d.evaluationApproverName}.</p>}
    </ActionModal>
  );
}

function LinkOccurrenceModal({ open, d, onClose, onDone }: { open: boolean; d: PlanDetail; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const options = open ? services.plans.occurrenceOptions(access).filter((o) => !d.links.some((l) => l.occurrenceId === o.id)) : [];
  const [id, setId] = useState('');
  const [justification, setJustification] = useState('');
  const chosen = options.find((o) => o.id === id);
  return (
    <ActionModal open={open} title="Vincular ocorrência" confirmLabel="Vincular" onCancel={onClose} onConfirm={async () => { await services.plans.linkOccurrence(access, d.plan.id, id, justification); onDone(); }}>
      <SelectField label="Ocorrência" required emptyLabel="Selecione" options={options.map((o) => ({ value: o.id, label: `${o.code} — ${o.typeName} (${OCCURRENCE_STATUS_LABEL[o.status]})` }))} value={id} onChange={(e) => setId(e.target.value)} />
      <p className="helper">Plano vinculado depois da criação da ocorrência também conta para a exigência de plano do tipo (DP-10a); a elegibilidade de conclusão é recalculada.</p>
      {chosen?.status === 'concluida' && <TextArea id="link-just" label="Justificativa (ocorrência concluída)" required value={justification} onChange={setJustification} helper="DP-08: sem reabertura nem alteração do histórico original." />}
    </ActionModal>
  );
}

function ConcludeActionModal({ open, v, planId, onClose, onDone }: { open: boolean; v: PlanActionView; planId: string; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const [notes, setNotes] = useState('');
  const [evidences, setEvidences] = useState<string[]>([]);
  return (
    <ActionModal open={open} title={`Concluir ação A${v.action.number}`} confirmLabel="Concluir ação" onCancel={onClose} onConfirm={async () => { await services.plans.concludeAction(access, planId, v.action.id, { notes, evidences }); onDone(); }}>
      {v.indicators.some((i) => i.kind === 'execucao-concluida') && <Alert tone="success">A OS vinculada foi encerrada. Confira o resultado da OS antes de concluir.</Alert>}
      <TextArea id="act-notes" label="Resultado" required value={notes} onChange={setNotes} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {evidences.map((e) => (
          <Badge key={e} tone="gray">{e}</Badge>
        ))}
        <Button size="small" variant="secondary" icon="paperclip" onClick={() => setEvidences((l) => [...l, `evidencia-a${v.action.number}-${l.length + 1}.jpg`])}>
          Anexar evidência (simulado)
        </Button>
      </div>
    </ActionModal>
  );
}

function DependencyModal({ open, v, d, onClose, onDone, onCancelAction }: { open: boolean; v: PlanActionView; d: PlanDetail; onClose: () => void; onDone: () => void; onCancelAction: () => void }) {
  const access = useAccess();
  const services = useServices();
  const cancelled = v.dependsOn.filter((x) => x.status === 'cancelada');
  const [mode, setMode] = useState<'remover' | 'substituir'>('remover');
  const [replacement, setReplacement] = useState('');
  const [justification, setJustification] = useState('');
  const replacements = d.actions.filter((x) => x.action.id !== v.action.id && x.action.status !== 'cancelada' && !v.dependsOn.some((dep) => dep.id === x.action.id));
  return (
    <ActionModal
      open={open}
      title={`Dependência cancelada — A${v.action.number}`}
      confirmLabel={mode === 'remover' ? 'Remover dependência' : 'Substituir dependência'}
      onCancel={onClose}
      onConfirm={async () => {
        await services.plans.resolveDependency(access, d.plan.id, v.action.id, { dependencyId: cancelled[0]!.id, mode, replacementId: replacement || undefined, justification });
        onDone();
      }}
    >
      <p>
        A{cancelled[0]?.number} foi cancelada. A ação A{v.action.number} permanece bloqueada até sua decisão (DP-32). Remover ou substituir exige justificativa e fica no histórico.
      </p>
      <SelectField label="Decisão" options={[{ value: 'remover', label: 'Remover a dependência' }, { value: 'substituir', label: 'Substituir por outra ação' }]} value={mode} onChange={(e) => setMode(e.target.value as 'remover' | 'substituir')} />
      {mode === 'substituir' && (
        <SelectField label="Ação substituta" required emptyLabel="Selecione" options={replacements.map((x) => ({ value: x.action.id, label: `A${x.action.number} — ${x.action.description}` }))} value={replacement} onChange={(e) => setReplacement(e.target.value)} />
      )}
      <TextArea id="dep-just" label="Justificativa" required value={justification} onChange={setJustification} />
      <Button variant="link" onClick={onCancelAction}>
        Prefiro cancelar a ação A{v.action.number}
      </Button>
    </ActionModal>
  );
}

function LinkRequestModal({ open, v, planId, onClose, onDone }: { open: boolean; v: PlanActionView; planId: string; onClose: () => void; onDone: () => void }) {
  const access = useAccess();
  const services = useServices();
  const options = open ? services.plans.requestOptions(access) : [];
  const [id, setId] = useState('');
  return (
    <ActionModal open={open} title={`Vincular solicitação à ação A${v.action.number}`} confirmLabel="Vincular" onCancel={onClose} onConfirm={async () => { await services.plans.linkRequest(access, planId, v.action.id, id); onDone(); }}>
      <SelectField label="Solicitação de manutenção" required emptyLabel="Selecione" options={options.map((o) => ({ value: o.id, label: `${o.code} — ${o.title}` }))} value={id} onChange={(e) => setId(e.target.value)} />
      <p className="helper">O resultado, as evidências e o histórico da OS ficam disponíveis na ação. Encerrar a OS não conclui a ação: o executor decide (DP-33).</p>
      <p className="helper">
        Para abrir uma nova solicitação, use <ContextLink to={maintenancePaths.newRequest()}>Nova solicitação</ContextLink> e depois vincule aqui.
      </p>
    </ActionModal>
  );
}
