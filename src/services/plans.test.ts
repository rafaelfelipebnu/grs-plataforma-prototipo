import { describe, expect, it } from 'vitest';
import { createTestServices } from '@/test/renderApp';

function setup() {
  const bundle = createTestServices();
  const ctx = (userId: string) => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, pl: bundle.services.plans, oc: bundle.services.occurrences, m: bundle.services.maintenance, ctx };
}

describe('Planos de ação — capacidade compartilhada', () => {
  it('DP-10/DP-10a: plano em Rascunho não satisfaz "exige plano iniciado"; ativar o plano torna a ocorrência elegível (N3)', async () => {
    const { pl, oc, ctx, store } = setup();
    // OC-0005 (Irregularidade em ronda: exige plano iniciado) tem o PA-0003 em Rascunho.
    await oc.addProceeding(ctx('u-local'), 'oc-005', { text: 'Portão verificado e trancado.', attachments: [] });
    await expect(oc.conclude(ctx('u-local'), 'oc-005', { evidenceNames: [] })).rejects.toMatchObject({ message: expect.stringMatching(/exige plano de ação iniciado/) });
    await pl.addAction(ctx('u-local'), 'pa-003', { description: 'Incluir o portão no roteiro da ronda.', executorUserId: 'u-oper', dueDate: '2026-11-20', dependsOn: [] });
    await pl.activate(ctx('u-local'), 'pa-003');
    const d = await oc.get(ctx('u-local'), 'oc-005');
    expect(d.check.typeMet).toBe(true);
    expect(store.getSnapshot().notifications.some((n) => n.target.kind === 'occurrence' && n.target.id === 'oc-005' && /pode ser concluída/.test(n.title))).toBe(true);
    await oc.conclude(ctx('u-local'), 'oc-005', { evidenceNames: [] });
  });

  it('DP-10a: "exige plano concluído" — plano vinculado depois (inclusive Rascunho) passa a contar e a ocorrência deixa de ser elegível', async () => {
    const { pl, oc, ctx } = setup();
    // OC-0008 (exige plano concluído) com PA-0001 Em andamento.
    expect((await oc.get(ctx('u-seg'), 'oc-008')).check.typeMet).toBe(false);
    const extra = await pl.create(ctx('u-seg'), {
      title: 'Treinamento sobre áreas livres de extintores',
      objective: 'Orientar os operadores da Linha 1.',
      locationId: 'loc-joi-ind',
      responsibleUserId: 'u-seg',
      dueDate: '2026-11-30',
      approvalMode: 'nenhuma',
      occurrenceId: 'oc-008',
    });
    const d = await oc.get(ctx('u-seg'), 'oc-008');
    expect(d.linkedPlans.map((p) => p.code)).toContain(extra.code);
    expect(d.check.conditions.find((c) => c.label.startsWith('Planos de ação concluídos'))?.label).toMatch(/2 plano\(s\) ainda não concluído/);
  });

  it('DP-32: dependência cancelada bloqueia até decisão humana; remover exige justificativa e libera a ação', async () => {
    const { pl, ctx } = setup();
    // PA-0001: A3 cancelada, A4 depende dela.
    await expect(pl.startAction(ctx('u-tec'), 'pa-001', 'ac-004')).rejects.toMatchObject({ code: 'CONFLICT' });
    const before = await pl.get(ctx('u-local'), 'pa-001');
    expect(before.actions.find((a) => a.action.id === 'ac-004')?.indicators.map((i) => i.kind)).toContain('dependencia-cancelada');
    await expect(pl.resolveDependency(ctx('u-tec'), 'pa-001', 'ac-004', { dependencyId: 'ac-003', mode: 'remover', justification: 'Sem necessidade' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(pl.resolveDependency(ctx('u-local'), 'pa-001', 'ac-004', { dependencyId: 'ac-003', mode: 'remover', justification: '' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await pl.resolveDependency(ctx('u-local'), 'pa-001', 'ac-004', { dependencyId: 'ac-003', mode: 'remover', justification: 'Placas atuais serão reaproveitadas.' });
    await pl.startAction(ctx('u-tec'), 'pa-001', 'ac-004');
    expect((await pl.get(ctx('u-local'), 'pa-001')).history[0]?.text).toMatch(/Ação A4 iniciada/);
  });

  it('DP-33: OS encerrada acende "execução vinculada concluída" sem concluir a ação; o executor decide', async () => {
    const { pl, m, ctx } = setup();
    // A2 do PA-0001 referencia a SOL-0004 → OS-0002 (Em execução, execução já concluída).
    await m.submitForClosure(ctx('u-tec'), 'os-002');
    let a2 = (await pl.get(ctx('u-tec'), 'pa-001')).actions.find((a) => a.action.id === 'ac-002')!;
    expect(a2.indicators.map((i) => i.kind)).not.toContain('execucao-concluida'); // técnico concluir não basta
    await m.closeWorkOrder(ctx('u-man'), 'os-002', 'Gerador testado em carga por 30 minutos.');
    a2 = (await pl.get(ctx('u-tec'), 'pa-001')).actions.find((a) => a.action.id === 'ac-002')!;
    expect(a2.indicators.map((i) => i.kind)).toContain('execucao-concluida');
    expect(a2.action.status).toBe('em-execucao');
    await pl.concludeAction(ctx('u-tec'), 'pa-001', 'ac-002', { notes: 'Resultado da OS conferido.', evidences: [] });
  });

  it('pausa do plano: ações mantêm status e não avançam; conclusão exige avaliador e data (D-013)', async () => {
    const { pl, ctx } = setup();
    await pl.pause(ctx('u-local'), 'pa-001', 'Aguardando parada programada da linha.');
    await expect(pl.concludeAction(ctx('u-tec'), 'pa-001', 'ac-002', { notes: 'Teste de avanço', evidences: [] })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await pl.get(ctx('u-local'), 'pa-001')).actions.find((a) => a.action.id === 'ac-002')?.action.status).toBe('em-execucao');
    await pl.resume(ctx('u-local'), 'pa-001');

    const plan = await pl.create(ctx('u-local'), { title: 'Plano sem avaliador', objective: 'Testar a regra de conclusão.', locationId: 'loc-joi-adm', responsibleUserId: 'u-local', dueDate: '2026-12-01', approvalMode: 'nenhuma' });
    await pl.addAction(ctx('u-local'), plan.id, { description: 'Ação única do plano', executorUserId: 'u-local', dueDate: '2026-11-20', dependsOn: [] });
    await pl.activate(ctx('u-local'), plan.id);
    const actionId = (await pl.get(ctx('u-local'), plan.id)).actions[0]!.action.id;
    await pl.startAction(ctx('u-local'), plan.id, actionId);
    await pl.concludeAction(ctx('u-local'), plan.id, actionId, { notes: 'Feito conforme previsto.', evidences: [] });
    await expect(pl.conclude(ctx('u-local'), plan.id)).rejects.toMatchObject({ message: expect.stringMatching(/avaliador e data prevista/) });
    await pl.setEvaluation(ctx('u-local'), plan.id, { evaluatorUserId: 'u-seg', evaluationDueDate: '2026-12-15' });
    await pl.conclude(ctx('u-local'), plan.id);
    expect((await pl.get(ctx('u-local'), plan.id)).plan.effectiveness?.state).toBe('pendente');
  });

  it('DP-23/DP-24: eficácia Parcial exige justificativa e permite plano relacionado; o anterior continua Concluído', async () => {
    const { pl, ctx } = setup();
    await expect(pl.evaluate(ctx('u-local'), 'pa-002', { result: 'parcial', justification: 'x' })).rejects.toMatchObject({ code: 'FORBIDDEN' }); // não é o avaliador
    await expect(pl.evaluate(ctx('u-seg'), 'pa-002', { result: 'parcial', justification: '' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await pl.evaluate(ctx('u-seg'), 'pa-002', { result: 'parcial', justification: 'Ainda há acessos fora do horário de terceiros.' });
    const related = await pl.create(ctx('u-local'), {
      title: 'Controle de acesso de terceiros à Sala de Servidores',
      objective: 'Tratar os acessos remanescentes de terceiros.',
      locationId: 'loc-joi-servidores',
      responsibleUserId: 'u-local',
      dueDate: '2026-12-10',
      approvalMode: 'nenhuma',
      relatedPlanId: 'pa-002',
    });
    expect(related.status).toBe('rascunho');
    const previous = await pl.get(ctx('u-local'), 'pa-002');
    expect(previous.plan.status).toBe('concluido');
    expect(previous.followUpPlans.map((p) => p.code)).toEqual([related.code]);
    // Plano Eficaz não gera plano relacionado.
    await expect(pl.create(ctx('u-local'), { title: 'Outro relacionado', objective: 'Não permitido.', locationId: 'loc-joi-servidores', responsibleUserId: 'u-local', dueDate: '2026-12-10', approvalMode: 'nenhuma', relatedPlanId: 'pa-001' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('DP-08: vincular a ocorrência concluída exige justificativa e não a reabre; contrato Essencial bloqueia a capacidade', async () => {
    const { pl, oc, ctx, services } = setup();
    await expect(pl.linkOccurrence(ctx('u-local'), 'pa-001', 'oc-006')).rejects.toMatchObject({ code: 'VALIDATION' });
    await pl.linkOccurrence(ctx('u-local'), 'pa-001', 'oc-006', 'Extintores verificados na mesma área.');
    expect((await oc.get(ctx('u-local'), 'oc-006')).occurrence.status).toBe('concluida');
    await services.demo.setContract('essencial');
    await expect(pl.list(ctx('u-local'), {})).rejects.toMatchObject({ code: 'NOT_CONTRACTED' });
  });
});
