import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Col, EmptyState, ErrorState, Grid, Icon, LabelValue, LabelValueGrid, LoadingState, PageHeader, Paginator, Panel, SelectField, Stack, StatsCard, tableStyles as t, useToast } from '@/components/ui';
import { LocationPath, formatDateTime } from '@/components/domain';
import { ANSWER_TYPE_LABEL, CONTROL_POINT_TYPE_LABEL, ITEM_REQUIREMENT_LABEL, POINT_VALIDATION_LABEL, REINSPECTION_STATUS_LABEL, ROUTINE_STATUS_LABEL, OCCURRENCE_STATUS_LABEL, type RoutineExecutionStatus } from '@/domain';
import { MODULES } from '@/modules/registry';
import { ReasonModal, errorMessage } from '@/modules/central/shared';
import { ActionModal, ProvisionalTag } from '@/modules/manutencao/shared';
import { occurrencePaths } from '@/modules/ocorrencias/shared';
import type { ExecutionListItem, ReinspectionView } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { RoutineStatusBadge, RoutinesNav, ScoreBadge, routinePaths } from './shared';

const VALIDATED_BY_LABEL: Record<string, string> = { 'qr-code': 'QR Code', geolocalizacao: 'geolocalização', justificativa: 'justificativa', 'sem-validacao': 'início sem validação' };

const selectStyle = { minHeight: 32, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' } as const;

/** Visão geral: status das rotinas das últimas 24 h, reinspeções e sincronização. */
export function RoutinesHomePage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  usePageLabel(MODULES.rotinas.name);
  const perm = services.routines.permissions(access);
  const query = useServiceQuery(() => services.routines.overview(access), [access]);
  const [busy, setBusy] = useState(false);

  const checkMissed = async () => {
    setBusy(true);
    try {
      const r = await services.routines.checkMissed(access);
      toast.show({
        tone: r.missed.length ? 'warning' : 'info',
        title: r.missed.length ? `${r.missed.length} rotina(s) não realizada(s)` : 'Nenhuma rotina vencida sem execução',
        message: r.generatedOccurrences.length ? `Ocorrência(s) gerada(s): ${r.generatedOccurrences.join(', ')}.` : undefined,
      });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Não foi possível verificar', message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={MODULES.rotinas.name}
        description="Produto existente preservado: planos de rotina, rotinas agendadas e não agendadas, pontos de controle, checklists e execução pelo app, inclusive offline."
        actions={
          perm.manage ? (
            <Button variant="secondary" icon="clock-o" loading={busy} onClick={checkMissed}>
              Verificar rotinas não executadas
            </Button>
          ) : undefined
        }
      />
      <RoutinesNav />
      <QueryBoundary query={query} moduleId="rotinas">
        {(o) => (
          <Stack>
            {perm.manage && (
              <p className="helper" style={{ margin: 0 }}>
                <Icon name="flask" /> "Verificar rotinas não executadas" simula o job existente do produto (a cada 10 minutos) — ferramenta da demonstração.
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              {(['pendente', 'em-execucao', 'concluida', 'incompleta', 'finalizado-parcialmente', 'nao-realizada'] as RoutineExecutionStatus[]).map((s) => (
                <StatsCard key={s} icon="check-square-o" title={ROUTINE_STATUS_LABEL[s]} value={o.today[s]} onClick={() => navigate(`${routinePaths.executions}?status=${s}`)} />
              ))}
              <StatsCard icon="refresh" title="Reinspeções a programar" value={o.pendingReinspections} tone={o.pendingReinspections ? 'yellow' : 'default'} onClick={() => navigate(routinePaths.reinspections)} />
              <StatsCard icon="cloud-upload" title="Aguardando sincronização" value={o.pendingSync} tone={o.pendingSync ? 'orange' : 'default'} />
            </div>
            <Panel title="Execuções recentes" flush>
              <ExecutionRows items={o.recent} />
            </Panel>
          </Stack>
        )}
      </QueryBoundary>
    </>
  );
}

function ExecutionRows({ items }: { items: ExecutionListItem[] }) {
  if (!items.length) return <EmptyState compact icon="check-square-o" title="Nenhuma execução." />;
  return (
    <div className={t.tableWrap}>
      <table className={t.table}>
        <caption className="visually-hidden">Execuções de rotina</caption>
        <thead>
          <tr>
            <th scope="col">Rotina</th>
            <th scope="col">Plano de rotina</th>
            <th scope="col">Início / fim</th>
            <th scope="col">Status</th>
            <th scope="col">Score</th>
            <th scope="col">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ execution: e, routine, plan, operatorName, score, pointsDone, pointsTotal, isReinspection }) => (
            <tr key={e.id}>
              <td style={{ minWidth: 200 }}>
                <ContextLink to={routinePaths.execution(e.id)}>{e.code}</ContextLink> — {routine.name}
                <div className="helper">
                  {routine.scheduled ? 'Agendada' : 'Não agendada'}
                  {isReinspection && ' · Reinspeção'}
                  {operatorName && ` · ${operatorName}`}
                  {e.sync === 'pendente' && ' · aguardando sincronização'}
                </div>
              </td>
              <td>{plan.name}</td>
              <td>
                {formatDateTime(e.windowStart)}
                {e.windowEnd && <div className="helper">até {formatDateTime(e.windowEnd)}</div>}
              </td>
              <td>
                <RoutineStatusBadge value={e.status} />
              </td>
              <td>
                <ScoreBadge value={score} />
              </td>
              <td>
                {pointsDone}/{pointsTotal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Consulta de Rotinas (existente): filtros por status e agendamento; score = % de checklists conformes. */
export function ExecutionsPage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();
  usePageLabel('Consulta de rotinas');
  const status = sp.get('status') ?? '';
  const scheduled = sp.get('agendadas') ?? '';
  const page = Number(sp.get('pagina')) || 1;
  const set = (k: string, v: string) => {
    const m = new URLSearchParams(sp);
    if (v) m.set(k, v);
    else m.delete(k);
    if (k !== 'pagina') m.delete('pagina');
    navigate(`${location.pathname}?${m}`, { replace: true, state: location.state });
  };
  const query = useServiceQuery(
    () => services.routines.listExecutions(access, { status: (status || undefined) as RoutineExecutionStatus | undefined, scheduled: (scheduled || undefined) as 'sim' | 'nao' | undefined, page }),
    [sp.toString(), access],
  );
  return (
    <>
      <PageHeader title="Consulta de rotinas" breadcrumb={[{ label: MODULES.rotinas.name, to: routinePaths.overview }, { label: 'Consulta' }]} />
      <RoutinesNav />
      <Panel title={`Rotinas${query.data ? ` (${query.data.total})` : ''}`} flush>
        <div className={t.tableHeading} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select aria-label="Status" value={status} onChange={(e) => set('status', e.target.value)} style={selectStyle}>
            <option value="">Todos os status</option>
            {(Object.keys(ROUTINE_STATUS_LABEL) as RoutineExecutionStatus[]).map((s) => (
              <option key={s} value={s}>
                {ROUTINE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select aria-label="Rotinas agendadas" value={scheduled} onChange={(e) => set('agendadas', e.target.value)} style={selectStyle}>
            <option value="">Agendadas e não agendadas</option>
            <option value="sim">Somente agendadas</option>
            <option value="nao">Somente não agendadas</option>
          </select>
        </div>
        {query.error ? (
          <ErrorState compact kind={500} text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : (
          <>
            <ExecutionRows items={query.data.items} />
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => set('pagina', String(p))} />
          </>
        )}
      </Panel>
    </>
  );
}

/** Detalhes da rotina (existente): pontos, respostas, não conformidades e ocorrências geradas. */
export function ExecutionDetailPage() {
  const { executionId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.routines.getExecution(access, executionId), [executionId, access]);
  usePageLabel(query.data ? `Rotina ${query.data.execution.code}` : 'Rotina');
  return (
    <>
      <PageHeader
        title={query.data ? `${query.data.execution.code} — ${query.data.routine.name}` : 'Execução de rotina'}
        breadcrumb={[{ label: MODULES.rotinas.name, to: routinePaths.overview }, { label: 'Consulta', to: routinePaths.executions }, { label: query.data?.execution.code ?? '…' }]}
      />
      <RoutinesNav />
      <QueryBoundary query={query} moduleId="rotinas">
        {(d) => {
          const e = d.execution;
          return (
            <Stack>
              {d.reinspectionOf && (
                <Alert tone="info" title="Reinspeção">
                  Execução de reinspeção da ocorrência <ContextLink to={occurrencePaths.detail(d.reinspectionOf.occurrenceId)}>{d.reinspectionOf.code}</ContextLink>. O resultado e as evidências retornam
                  para a ocorrência.
                </Alert>
              )}
              {e.sync === 'pendente' && <Alert tone="warning">Finalizada no app sem conexão: aguardando sincronização. As ocorrências por não conformidade só são geradas após sincronizar.</Alert>}
              <Grid>
                <Col span={8}>
                  <Stack>
                    {d.points.map((p) => (
                      <Panel key={p.point.id} title={`Ponto: ${p.point.name}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                          <Badge tone={p.status === 'concluido' ? 'green' : p.status === 'cancelado' ? 'gray' : 'blue'}>{p.status === 'concluido' ? 'Concluído' : p.status === 'cancelado' ? 'Cancelado' : 'Pendente'}</Badge>
                          <span className="helper">
                            {CONTROL_POINT_TYPE_LABEL[p.point.type]} · validação {POINT_VALIDATION_LABEL[p.point.validation]}
                            {p.validatedBy && ` · verificado por ${VALIDATED_BY_LABEL[p.validatedBy] ?? p.validatedBy}`}
                          </span>
                          {p.asset && <ContextLink to={paths.asset(p.asset.id)}>{p.asset.tag}</ContextLink>}
                        </div>
                        {p.locationPath.length > 0 && <LocationPath path={p.locationPath} />}
                        {p.validationJustification && <p className="helper">Justificativa de localização: {p.validationJustification}</p>}
                        {p.cancelReason && <p className="helper">Cancelado: {p.cancelReason}</p>}
                        {p.checklists.map(({ checklist, answers }) => (
                          <div key={checklist.id} style={{ marginTop: 8 }}>
                            <strong>{checklist.name}</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                              {checklist.items.map((it) => {
                                const a = answers.find((x) => x.itemId === it.id);
                                return (
                                  <li key={it.id}>
                                    {it.description}:{' '}
                                    {a ? (
                                      <>
                                        <strong style={{ color: a.conforming === false ? 'var(--sds-red)' : undefined }}>
                                          {a.value === 'conforme' ? 'Conforme' : a.value === 'nao-conforme' ? 'Não conforme' : a.value === 'nao-se-aplica' ? 'Não se aplica' : a.value}
                                        </strong>
                                        {it.answerType === 'nota' && <span className="helper"> (não conforme ≤ {it.ncThreshold})</span>}
                                        {a.observation && <span className="helper"> — {a.observation}</span>}
                                        {a.attachments.map((f) => (
                                          <Badge key={f} tone="gray">
                                            {f}
                                          </Badge>
                                        ))}
                                      </>
                                    ) : (
                                      <span className="muted">sem resposta</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </Panel>
                    ))}
                  </Stack>
                </Col>
                <Col span={4}>
                  <Stack>
                    <Panel title="Detalhes da rotina">
                      <LabelValueGrid>
                        <LabelValue label="Status">
                          <RoutineStatusBadge value={e.status} />
                        </LabelValue>
                        <LabelValue label="Score">
                          <ScoreBadge value={d.score} />
                        </LabelValue>
                        <LabelValue label="Plano de rotina">{d.plan.name}</LabelValue>
                        <LabelValue label="Responsável">{d.operatorName ?? '—'}</LabelValue>
                        <LabelValue label="Iniciada em">{formatDateTime(e.startedAt)}</LabelValue>
                        <LabelValue label="Finalizada em">{formatDateTime(e.finishedAt)}</LabelValue>
                        {e.finishJustification && <LabelValue label="Justificativa">{e.finishJustification}</LabelValue>}
                      </LabelValueGrid>
                    </Panel>
                    <Panel title="Ocorrências geradas">
                      {d.generatedOccurrences.length === 0 ? (
                        <p className="helper">Nenhuma.</p>
                      ) : (
                        d.generatedOccurrences.map((o) => (
                          <div key={o.id}>
                            <ContextLink to={occurrencePaths.detail(o.id)}>{o.code}</ContextLink> — {o.typeName}
                          </div>
                        ))
                      )}
                      <p className="helper" style={{ marginTop: 8 }}>
                        Regra existente: não conformidade em item com tipo de ocorrência, num ponto com local físico, gera ocorrência automaticamente.
                      </p>
                    </Panel>
                  </Stack>
                </Col>
              </Grid>
            </Stack>
          );
        }}
      </QueryBoundary>
    </>
  );
}

/** Cadastros existentes (somente consulta nesta entrega). */
export function CatalogPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Planos de rotina');
  const query = useServiceQuery(() => services.routines.catalog(access), [access]);
  return (
    <>
      <PageHeader title="Planos de rotina" breadcrumb={[{ label: MODULES.rotinas.name, to: routinePaths.overview }, { label: 'Planos de rotina' }]} description="Plano de rotina, pontos de controle, checklists e rotinas, como no produto atual." />
      <RoutinesNav />
      <QueryBoundary query={query} moduleId="rotinas">
        {(items) => (
          <Stack>
            <Alert tone="info">
              Cadastros em modo consulta nesta entrega. <ProvisionalTag code="P-80">Sem edição de cadastros</ProvisionalTag>
            </Alert>
            {items.map((c) => (
              <Panel key={c.plan.id} title={c.plan.name} collapsible>
                <p className="helper">
                  Área: {c.plan.area} · Local: <LocationPath path={c.locationPath} icon={false} /> · {c.plan.active ? 'Ativo' : 'Inativo'}
                </p>
                <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>Pontos de controle</h3>
                <div className={t.tableWrap}>
                  <table className={t.table}>
                    <thead>
                      <tr>
                        <th scope="col">Ponto</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Validação</th>
                        <th scope="col">Local / ativo</th>
                        <th scope="col">Checklists</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.points.map((p) => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td>{CONTROL_POINT_TYPE_LABEL[p.type]}</td>
                          <td>{POINT_VALIDATION_LABEL[p.validation]}</td>
                          <td>
                            {p.locationName ?? '—'}
                            {p.assetTag && <div className="helper">{p.assetTag} (identidade da Central)</div>}
                          </td>
                          <td>{p.checklistNames.join(', ') || <span className="muted">Nenhum</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>Rotinas</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {c.routines.map((r) => (
                    <li key={r.id}>
                      {r.name} — {r.scheduled ? `agendada (${r.schedule?.recurrence})` : `não agendada${r.maxExecutions ? `, termina após ${r.maxExecutions} execução(ões)` : ''}`}
                      {r.reinspectionRequestId && ' · reinspeção'}
                    </li>
                  ))}
                </ul>
                <h3 style={{ fontSize: 14, margin: '12px 0 4px' }}>Checklists</h3>
                {c.checklists.map((ck) => (
                  <div key={ck.id} style={{ marginBottom: 8 }}>
                    <strong>{ck.name}</strong> <span className="helper">({ck.checklistType})</span>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                      {ck.items.map((it) => (
                        <li key={it.id} className="helper">
                          {it.description} — {ANSWER_TYPE_LABEL[it.answerType]}
                          {it.ncThreshold !== undefined && ` (Nota para Não Conforme: ${it.ncThreshold})`} · anexo {ITEM_REQUIREMENT_LABEL[it.attachment].toLowerCase()} · observação{' '}
                          {ITEM_REQUIREMENT_LABEL[it.observation].toLowerCase()}
                          {it.occurrenceTypeId ? ' · gera ocorrência' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Panel>
            ))}
          </Stack>
        )}
      </QueryBoundary>
    </>
  );
}

/** Pedidos de reinspeção vindos de Ocorrências (D-006): o gestor de Rotinas programa (D-013). */
export function ReinspectionsPage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  usePageLabel('Reinspeções');
  const perm = services.routines.permissions(access);
  const query = useServiceQuery(() => services.routines.reinspections(access), [access]);
  const catalog = useServiceQuery(() => services.routines.catalog(access), [access]);
  const [programming, setProgramming] = useState<ReinspectionView | null>(null);
  const [cancelling, setCancelling] = useState<ReinspectionView | null>(null);
  return (
    <>
      <PageHeader
        title="Reinspeções"
        breadcrumb={[{ label: MODULES.rotinas.name, to: routinePaths.overview }, { label: 'Reinspeções' }]}
        description="Ocorrências solicitam; Rotinas programa e executa com os mesmos conceitos (plano, rotina, ponto, checklist), inclusive offline. Resultado e evidências retornam à ocorrência."
      />
      <RoutinesNav />
      <QueryBoundary query={query} moduleId="rotinas">
        {(items) => (
          <Panel title={`Pedidos (${items.length})`} flush>
            {items.length === 0 ? (
              <EmptyState compact icon="refresh" title="Nenhum pedido de reinspeção." />
            ) : (
              <div className={t.tableWrap}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th scope="col">Ocorrência</th>
                      <th scope="col">Solicitado</th>
                      <th scope="col">Situação</th>
                      <th scope="col">Resultado</th>
                      <th scope="col">
                        <span className="visually-hidden">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((v) => (
                      <tr key={v.request.id}>
                        <td>
                          <ContextLink to={occurrencePaths.detail(v.occurrence.id)}>{v.occurrence.code}</ContextLink> — {v.occurrence.typeName}
                          <div className="helper">{OCCURRENCE_STATUS_LABEL[v.occurrence.status]}</div>
                        </td>
                        <td>
                          {formatDateTime(v.request.requestedAt)}
                          <div className="helper">por {v.requestedByName}</div>
                        </td>
                        <td>
                          {REINSPECTION_STATUS_LABEL[v.request.status]}
                          {v.request.executionId && (
                            <div className="helper">
                              <ContextLink to={routinePaths.execution(v.request.executionId)}>{v.executionCode}</ContextLink>
                            </div>
                          )}
                        </td>
                        <td>{v.request.result ? <Badge tone={v.request.result === 'ok' ? 'green' : 'red'}>{v.request.result === 'ok' ? 'OK' : 'Não OK'}</Badge> : <span className="muted">—</span>}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {perm.manage && v.request.status === 'pendente' && (
                            <Button size="small" icon="calendar" onClick={() => setProgramming(v)}>
                              Programar
                            </Button>
                          )}
                          {perm.manage && (v.request.status === 'pendente' || v.request.status === 'programada') && (
                            <Button size="small" variant="link" onClick={() => setCancelling(v)}>
                              Não realizada
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </QueryBoundary>
      {programming && catalog.data && (
        <ProgramModal
          v={programming}
          catalog={catalog.data}
          onClose={() => setProgramming(null)}
          onDone={(code) => {
            toast.show({ tone: 'success', title: `Reinspeção programada (${code})`, message: 'Disponível no app em "Não agendadas", para execução única.' });
            setProgramming(null);
          }}
        />
      )}
      <ReasonModal
        open={cancelling !== null}
        title="Registrar reinspeção não realizada"
        confirmLabel="Registrar"
        destructive
        onCancel={() => setCancelling(null)}
        onConfirm={async (reason) => {
          await services.routines.markReinspectionNotRealized(access, cancelling!.request.id, reason);
          toast.show({ tone: 'success', title: 'Pedido encerrado sem resultado', message: 'Não atende "exige reinspeção"; pode ser solicitada outra.' });
          setCancelling(null);
        }}
      >
        <p className="helper">
          O pedido termina sem resultado (D-006e). <ProvisionalTag code="P-86">Gatilho manual provisório</ProvisionalTag>
        </p>
      </ReasonModal>
    </>
  );
}

function ProgramModal({ v, catalog, onClose, onDone }: { v: ReinspectionView; catalog: { points: { id: string; name: string; checklistIds: string[] }[]; checklists: { id: string; name: string }[]; plan: { name: string } }[]; onClose: () => void; onDone: (code: string) => void }) {
  const access = useAccess();
  const services = useServices();
  const points = catalog.flatMap((c) => c.points.map((p) => ({ ...p, planName: c.plan.name })));
  const checklists = Array.from(new Map(catalog.flatMap((c) => c.checklists).map((c) => [c.id, c])).values());
  const [pointId, setPointId] = useState(v.suggestedPointIds[0] ?? '');
  const [checklistId, setChecklistId] = useState(v.request.suggestedChecklistId ?? points.find((p) => p.id === (v.suggestedPointIds[0] ?? ''))?.checklistIds[0] ?? '');
  return (
    <ActionModal
      open
      title={`Programar reinspeção de ${v.occurrence.code}`}
      confirmLabel="Programar"
      onCancel={onClose}
      onConfirm={async () => {
        const e = await services.routines.programReinspection(access, v.request.id, { pointId, checklistId });
        onDone(e.code);
      }}
    >
      <p className="helper">Cria uma rotina não agendada, de execução única, no plano do ponto escolhido (D-013). Nada é criado automaticamente.</p>
      <SelectField
        label="Ponto de controle"
        required
        emptyLabel="Selecione"
        options={points.map((p) => ({ value: p.id, label: `${p.name} — ${p.planName}${v.suggestedPointIds.includes(p.id) ? ' (sugerido)' : ''}` }))}
        value={pointId}
        onChange={(e) => setPointId(e.target.value)}
      />
      <SelectField
        label="Checklist"
        required
        emptyLabel="Selecione"
        options={checklists.map((c) => ({ value: c.id, label: `${c.name}${c.id === v.request.suggestedChecklistId ? ' (sugerido pelo solicitante / origem)' : ''}` }))}
        value={checklistId}
        onChange={(e) => setChecklistId(e.target.value)}
      />
    </ActionModal>
  );
}
