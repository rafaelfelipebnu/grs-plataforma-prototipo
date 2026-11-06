import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, ErrorState, Icon, Panel, TextField, useToast } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import { POINT_VALIDATION_LABEL, type ChecklistItem } from '@/domain';
import { errorMessage } from '@/modules/central/shared';
import { TextArea, maintenanceStyles as s } from '@/modules/manutencao/shared';
import type { AnswerInput, ExecutionDetail, ExecutionListItem, PointExecutionView } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { RoutineStatusBadge, routinePaths } from './shared';

/** Barra de conexão e sincronização do app (offline simulado — referência 1.14.10). */
function ConnectionBar() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const state = services.routines.appState(access);
  const [busy, setBusy] = useState(false);
  const sync = async () => {
    setBusy(true);
    try {
      const r = await services.routines.sync(access);
      toast.show({
        tone: 'success',
        title: r.synced.length ? `${r.synced.length} rotina(s) sincronizada(s)` : 'Nada pendente de sincronização',
        message: r.generatedOccurrences.length
          ? `Ocorrência(s) gerada(s) por não conformidade: ${r.generatedOccurrences.join(', ')}${r.suggestions ? `; ${r.suggestions} sugestão(ões) de vínculo` : ''}.`
          : undefined,
      });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Não foi possível sincronizar', message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={s.section} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <Badge tone={state.offline ? 'orange' : 'green'} icon={state.offline ? 'plane' : 'wifi'}>
        {state.offline ? 'Sem conexão' : 'Online'}
      </Badge>
      <span className="helper" style={{ flex: 1 }}>
        {state.pendingSync} pendente(s) · última sincronização {state.lastSyncAt ? formatDateTime(state.lastSyncAt) : '—'}
      </span>
      <Button size="small" variant="secondary" onClick={() => services.routines.setOffline(access, !state.offline)}>
        {state.offline ? 'Reconectar' : 'Simular sem conexão'}
      </Button>
      <Button size="small" icon="refresh" loading={busy} disabled={state.offline} onClick={sync}>
        Sincronizar
      </Button>
    </div>
  );
}

function Banner() {
  return (
    <div className={s.mobileBanner} role="note">
      <Icon name="mobile" />
      <span>
        Experiência móvel demonstrativa do app de Gestão de Rotinas (conceitos do produto existente). Conexão, QR Code e geolocalização são simulados.
      </span>
    </div>
  );
}

/** Início do app: verificar localização (opção "Lista"), rotinas agendadas, não agendadas e histórico. */
export function RoutinesAppHomePage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  usePageLabel('App de Rotinas');
  const perm = services.routines.permissions(access);
  const state = services.routines.appState(access);
  const planId = sp.get('plano') ?? '';
  const [tab, setTab] = useState<'agendadas' | 'nao-agendadas' | 'historico'>('agendadas');
  const query = useServiceQuery(() => (planId ? services.routines.appRoutines(access, planId) : Promise.resolve(null)), [planId, access]);

  if (!perm.execute) {
    return (
      <Panel title="App de Rotinas">
        <ErrorState kind={403} text="Seu perfil não executa rotinas." />
      </Panel>
    );
  }

  const open = async (item: ExecutionListItem) => {
    try {
      if (item.execution.status !== 'em-execucao') await services.routines.startExecution(access, item.execution.id);
      navigate(routinePaths.appExecution(item.execution.id));
    } catch (e) {
      toast.show({ tone: 'error', title: 'Não foi possível iniciar', message: errorMessage(e) });
    }
  };
  const startUnscheduled = async (routineId: string) => {
    try {
      const e = await services.routines.startUnscheduled(access, routineId);
      navigate(routinePaths.appExecution(e.id));
    } catch (err) {
      toast.show({ tone: 'error', title: 'Não foi possível iniciar', message: errorMessage(err) });
    }
  };

  return (
    <div className={s.mobile}>
      <h1 style={{ fontSize: 22, margin: '4px 0' }}>Gestão de Rotinas</h1>
      <Banner />
      <ConnectionBar />
      <div className={s.section}>
        <h2 className={s.sectionTitle}>Verificar localização</h2>
        <p className="helper" style={{ marginTop: 0 }}>
          Geolocalização e QR Code são simulados; use a opção <strong>Lista</strong> (planos com seleção manual).
        </p>
        <select aria-label="Plano de rotina" value={planId} onChange={(e) => setSp(e.target.value ? { plano: e.target.value } : {})} style={{ width: '100%', minHeight: 44, fontSize: 16 }}>
          <option value="">Selecione o local / plano</option>
          {state.plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {planId && (
        <QueryBoundary query={query} moduleId="rotinas">
          {(r) =>
            r && (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(
                    [
                      ['agendadas', `Agendadas (${r.scheduled.length})`],
                      ['nao-agendadas', `Não agendadas (${r.unscheduled.length})`],
                      ['historico', `Histórico (${r.history.length})`],
                    ] as const
                  ).map(([id, label]) => (
                    <Button key={id} size="small" variant={tab === id ? 'primary' : 'secondary'} onClick={() => setTab(id)}>
                      {label}
                    </Button>
                  ))}
                </div>
                {tab === 'agendadas' &&
                  (r.scheduled.length === 0 ? (
                    <EmptyState compact icon="calendar" title="Nenhuma rotina agendada pendente." />
                  ) : (
                    r.scheduled.map((item) => (
                      <button key={item.execution.id} type="button" className={s.card} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => open(item)}>
                        <div className={s.badges}>
                          <strong>{item.execution.code}</strong>
                          <RoutineStatusBadge value={item.execution.status} />
                        </div>
                        <div className={s.cardTitle}>{item.routine.name}</div>
                        <div className={s.cardMeta}>
                          {formatDateTime(item.execution.windowStart)} até {formatDateTime(item.execution.windowEnd)} · {item.pointsTotal} ponto(s)
                        </div>
                      </button>
                    ))
                  ))}
                {tab === 'nao-agendadas' &&
                  (r.unscheduled.length === 0 ? (
                    <EmptyState compact icon="check" title="Nenhuma rotina sem agenda." />
                  ) : (
                    r.unscheduled.map((u) => (
                      <div key={u.routine.id} className={s.card}>
                        <div className={s.cardTitle}>{u.routine.name}</div>
                        <div className={s.cardMeta}>
                          {u.routine.reinspectionRequestId ? 'Reinspeção — execução única' : u.routine.maxExecutions ? `Termina após ${u.routine.maxExecutions} execução(ões)` : 'Sem limite de execuções'}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {u.execution ? (
                            <Button size="small" icon="play" onClick={() => open(u.execution!)}>
                              {u.execution.execution.status === 'em-execucao' ? 'Continuar' : 'Iniciar'}
                            </Button>
                          ) : (
                            <Button size="small" icon="play" onClick={() => startUnscheduled(u.routine.id)}>
                              Iniciar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ))}
                {tab === 'historico' &&
                  (r.history.length === 0 ? (
                    <EmptyState compact icon="history" title="Nada executado nas últimas 24 horas." />
                  ) : (
                    r.history.map((item) => (
                      <Link key={item.execution.id} to={routinePaths.execution(item.execution.id)} className={s.card}>
                        <div className={s.badges}>
                          <strong>{item.execution.code}</strong>
                          <RoutineStatusBadge value={item.execution.status} />
                          {item.execution.sync === 'pendente' && <Badge tone="orange">Pendente de sincronização</Badge>}
                        </div>
                        <div className={s.cardTitle}>{item.routine.name}</div>
                      </Link>
                    ))
                  ))}
              </>
            )
          }
        </QueryBoundary>
      )}
    </div>
  );
}

/** Execução no app: pontos de controle, verificação, checklists, cancelamento e finalização. */
export function RoutinesAppExecutionPage() {
  const { executionId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.routines.getExecution(access, executionId), [executionId, access]);
  usePageLabel('Rotina em execução');
  return (
    <div className={s.mobile}>
      <Link to={routinePaths.app} className="helper">
        <Icon name="chevron-left" /> Rotinas
      </Link>
      <ConnectionBar />
      <QueryBoundary query={query} moduleId="rotinas">
        {(d) => <ExecutionApp d={d} />}
      </QueryBoundary>
    </div>
  );
}

function ExecutionApp({ d }: { d: ExecutionDetail }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const e = d.execution;
  const [active, setActive] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = d.points.filter((p) => p.status === 'pendente').length;

  const finish = async () => {
    setBusy(true);
    try {
      const r = await services.routines.finishExecution(access, e.id, justification);
      toast.show({
        tone: 'success',
        title: `Rotina finalizada: ${r.status === 'concluida' ? 'Concluída' : r.status === 'incompleta' ? 'Incompleta' : 'Finalizado Parcialmente'}`,
        message: r.synced ? 'Sincronizada. Não conformidades com tipo de ocorrência geraram ocorrências.' : 'Sem conexão: mantida no aparelho até sincronizar.',
      });
      navigate(routinePaths.app);
    } catch (err) {
      toast.show({ tone: 'error', title: 'Não foi possível finalizar', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div>
        <div className={s.badges}>
          <strong>{e.code}</strong>
          <RoutineStatusBadge value={e.status} />
          {d.isReinspection && <Badge tone="blue">Reinspeção</Badge>}
        </div>
        <h1 style={{ fontSize: 20, margin: '8px 0 4px' }}>{d.routine.name}</h1>
        <div className={s.cardMeta}>
          Pontos {d.pointsDone}/{d.pointsTotal} · {d.plan.name}
        </div>
      </div>
      {!d.canWork && <Alert tone="info">{e.status === 'em-execucao' ? 'Em execução por outro usuário.' : 'Esta rotina não está em execução neste aparelho.'}</Alert>}
      {d.points.map((p) => (
        <PointCard key={p.point.id} executionId={e.id} p={p} canWork={d.canWork} open={active === p.point.id} onOpen={() => setActive(active === p.point.id ? null : p.point.id)} />
      ))}
      {d.canWork && (
        <div className={s.section}>
          {!finishing ? (
            <div className={s.bigActions}>
              <Button block icon="flag-checkered" onClick={() => (pending ? setFinishing(true) : finish())} loading={busy}>
                Finalizar rotina
              </Button>
            </div>
          ) : (
            <>
              <Alert tone="warning" title="Finalizar sem concluir">
                {pending} ponto(s) não lido(s): a rotina será encerrada sem conclusão (Incompleta).
              </Alert>
              <TextArea id="finish-just" label="Justificativa" required value={justification} onChange={setJustification} />
              <div className={s.bigActions} style={{ marginTop: 8 }}>
                <Button block variant="danger" loading={busy} onClick={finish}>
                  Sim, finalizar rotina
                </Button>
                <Button block variant="secondary" onClick={() => setFinishing(false)}>
                  Voltar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function PointCard({ executionId, p, canWork, open, onOpen }: { executionId: string; p: PointExecutionView; canWork: boolean; open: boolean; onOpen: () => void }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [justifying, setJustifying] = useState(false);
  const [text, setText] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      toast.show({ tone: 'success', title: ok });
      setJustifying(false);
      setCancelling(false);
      setText('');
    } catch (e) {
      toast.show({ tone: 'error', title: 'Ação não realizada', message: errorMessage(e) });
    }
  };
  const validated = Boolean(p.validatedBy);
  return (
    <div className={s.card}>
      <button type="button" onClick={onOpen} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }} aria-expanded={open}>
        <div className={s.badges}>
          <Badge tone={p.status === 'concluido' ? 'green' : p.status === 'cancelado' ? 'gray' : 'blue'}>
            {p.status === 'concluido' ? 'Concluída com sucesso' : p.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
          </Badge>
          <span className={s.cardMeta}>{POINT_VALIDATION_LABEL[p.point.validation]}</span>
        </div>
        <div className={s.cardTitle}>{p.point.name}</div>
      </button>
      {open && canWork && p.status === 'pendente' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!validated && !justifying && (
            <div className={s.bigActions}>
              {p.point.validation === 'qr-code' && (
                <Button block icon="qrcode" onClick={() => run(() => services.routines.validatePoint(access, executionId, p.point.id, 'qr-code'), 'QR Code lido')}>
                  Ler QR Code (simulado)
                </Button>
              )}
              {p.point.validation === 'geolocalizacao' && (
                <Button block icon="map-marker" onClick={() => run(() => services.routines.validatePoint(access, executionId, p.point.id, 'geolocalizacao'), 'Localização verificada')}>
                  Verificar localização (simulado)
                </Button>
              )}
              {p.point.validation === 'sem-validacao' && (
                <Button block icon="play" onClick={() => run(() => services.routines.validatePoint(access, executionId, p.point.id, 'sem-validacao'), 'Ponto iniciado')}>
                  Iniciar ponto
                </Button>
              )}
              {p.point.validation !== 'sem-validacao' && (
                <Button block variant="secondary" onClick={() => setJustifying(true)}>
                  Não consigo verificar — justificar
                </Button>
              )}
              <Button block variant="link" onClick={() => setCancelling(true)}>
                Cancelar ponto
              </Button>
            </div>
          )}
          {justifying && (
            <>
              <TextArea id={`just-${p.point.id}`} label="Justificativa de localização" required value={text} onChange={setText} />
              <Button block onClick={() => run(() => services.routines.validatePoint(access, executionId, p.point.id, 'justificativa', text), 'Concluída com sucesso')}>
                Justificar
              </Button>
            </>
          )}
          {cancelling && (
            <>
              <TextArea id={`cancel-${p.point.id}`} label="Motivo do cancelamento" required value={text} onChange={setText} />
              <Button block variant="danger" onClick={() => run(() => services.routines.cancelPoint(access, executionId, p.point.id, text), 'Ponto cancelado')}>
                Confirmar cancelamento
              </Button>
            </>
          )}
          {validated && <ChecklistForm executionId={executionId} p={p} />}
        </div>
      )}
    </div>
  );
}

function ChecklistForm({ executionId, p }: { executionId: string; p: PointExecutionView }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const [error, setError] = useState<string>();
  const key = (cid: string, iid: string) => `${cid}:${iid}`;
  const set = (cid: string, it: ChecklistItem, patch: Partial<AnswerInput>) =>
    setAnswers((a) => ({ ...a, [key(cid, it.id)]: { checklistId: cid, itemId: it.id, value: '', attachments: [], ...a[key(cid, it.id)], ...patch } }));
  const submit = async () => {
    setError(undefined);
    try {
      await services.routines.answerPoint(access, executionId, p.point.id, Object.values(answers));
      toast.show({ tone: 'success', title: 'Checklist concluído' });
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {p.checklists.map(({ checklist }) => (
        <div key={checklist.id}>
          <strong>{checklist.name}</strong>
          {checklist.items.map((it) => {
            const a = answers[key(checklist.id, it.id)];
            const choice = (value: string, label: string) => (
              <Button key={value} size="small" variant={a?.value === value ? 'primary' : 'secondary'} onClick={() => set(checklist.id, it, { value })}>
                {label}
              </Button>
            );
            return (
              <div key={it.id} style={{ borderTop: '1px solid var(--sds-border)', paddingTop: 8, marginTop: 8 }}>
                <div>{it.description}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {(it.answerType === 'conforme' || it.answerType === 'conforme-na') && [choice('conforme', 'Conforme'), choice('nao-conforme', 'Não conforme')]}
                  {it.answerType === 'conforme-na' && choice('nao-se-aplica', 'Não se aplica')}
                  {it.answerType === 'nota' &&
                    Array.from({ length: 11 }, (_, n) => (
                      <Button key={n} size="small" variant={a?.value === String(n) ? 'primary' : 'secondary'} onClick={() => set(checklist.id, it, { value: String(n) })}>
                        {n}
                      </Button>
                    ))}
                  {it.answerType === 'texto' && <TextField label="Resposta" value={a?.value ?? ''} onChange={(e) => set(checklist.id, it, { value: e.target.value })} />}
                </div>
                {it.answerType !== 'texto' && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                    <input
                      aria-label={`Observação — ${it.description}`}
                      placeholder={it.observation === 'opcional' ? 'Observação (opcional)' : 'Observação (obrigatória se não conforme)'}
                      value={a?.observation ?? ''}
                      onChange={(e) => set(checklist.id, it, { observation: e.target.value })}
                      style={{ flex: 1, minHeight: 36, minWidth: 160 }}
                    />
                    <Button size="small" variant="secondary" icon="camera" onClick={() => set(checklist.id, it, { attachments: [...(a?.attachments ?? []), `foto-${it.id}-${(a?.attachments.length ?? 0) + 1}.jpg`] })}>
                      Foto ({a?.attachments.length ?? 0})
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {error && <Alert tone="error">{error}</Alert>}
      <div className={s.bigActions}>
        <Button block icon="check" onClick={submit}>
          Concluir checklist do ponto
        </Button>
      </div>
    </div>
  );
}
