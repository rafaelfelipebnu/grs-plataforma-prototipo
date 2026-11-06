import { describe, expect, it } from 'vitest';
import { FIXED_NOW, createTestServices } from '@/test/renderApp';

function setup() {
  const bundle = createTestServices();
  const ctx = (userId: string) => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, oc: bundle.services.occurrences, ctx };
}

describe('Ocorrências — ciclo aprovado (D-009, D-010, D-013)', () => {
  it('registro → 1º trâmite humano (Em andamento, tempo de resposta) → conclusão; sem reabertura', async () => {
    const { oc, ctx } = setup();
    const created = await oc.register(ctx('u-local'), {
      typeId: 'tp-vidro',
      locationId: 'loc-joi-recepcao',
      description: 'Vidro da janela da recepção quebrado.',
      occurredAt: new Date(FIXED_NOW.getTime() - 3_600_000).toISOString(),
      priority: 'media',
      involvedPersonIds: [],
    });
    expect(created.status).toBe('sem-tratamento');
    // Sem trâmite não conclui (regra atual).
    await expect(oc.conclude(ctx('u-local'), created.id, { evidenceNames: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
    await oc.addProceeding(ctx('u-local'), created.id, { text: 'Área isolada e vidraceiro acionado.', attachments: [] });
    let d = await oc.get(ctx('u-local'), created.id);
    expect(d.occurrence.status).toBe('em-andamento');
    expect(d.times.responseMs).toBeDefined();
    await oc.conclude(ctx('u-local'), created.id, { evidenceNames: [] });
    d = await oc.get(ctx('u-local'), created.id);
    expect(d.occurrence.status).toBe('concluida');
    expect(d.actions.proceed).toBe(false);
    await expect(oc.addProceeding(ctx('u-local'), created.id, { text: 'Mais um trâmite', attachments: [] })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('Em pausa: prioridade bloqueada e conclusão proibida em todos os canais (DP-03, DP-04a)', async () => {
    const { oc, ctx } = setup();
    // OC-0004 está Em pausa.
    await expect(oc.changePriority(ctx('u-local'), 'oc-004', 'alta')).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(oc.conclude(ctx('u-local'), 'oc-004', { evidenceNames: [] })).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(oc.concludeWithException(ctx('u-local'), 'oc-004', 'Forçar a conclusão')).rejects.toMatchObject({ code: 'CONFLICT' });
    const batch = await oc.concludeBatch(ctx('u-local'), ['oc-004']);
    expect(batch.kept[0]?.reason).toMatch(/em pausa/);
    await oc.resume(ctx('u-local'), 'oc-004');
    const d = await oc.get(ctx('u-local'), 'oc-004');
    expect(d.occurrence.status).toBe('em-andamento');
    expect(d.times.pausedMs).toBeGreaterThan(0);
  });

  it('condições do tipo: justificativa exigida; em lote fica aberta com o motivo (DP-14)', async () => {
    const { oc, ctx } = setup();
    // OC-0001 (Acesso indevido) exige justificativa.
    await oc.addProceeding(ctx('u-seg'), 'oc-001', { text: 'Colaborador identificado e orientado.', attachments: [] });
    const batch = await oc.concludeBatch(ctx('u-seg'), ['oc-001', 'oc-002']);
    expect(batch.done).toEqual([]);
    expect(batch.kept.map((k) => k.reason)).toEqual(['o tipo exige justificativa: conclua individualmente', 'o tipo exige evidência: anexe em um trâmite']);
    await expect(oc.conclude(ctx('u-seg'), 'oc-001', { evidenceNames: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
    await oc.conclude(ctx('u-seg'), 'oc-001', { justification: 'Acesso autorizado posteriormente pela TI.', evidenceNames: [] });
    expect((await oc.get(ctx('u-seg'), 'oc-001')).occurrence.status).toBe('concluida');
  });

  it('N3: avisa quem pode concluir quando a ocorrência passa a atender às condições (uma vez por ciclo)', async () => {
    const { oc, ctx, store } = setup();
    const n3 = () => store.getSnapshot().notifications.filter((n) => n.target.kind === 'occurrence' && n.target.id === 'oc-002' && /pode ser concluída/.test(n.title));
    await oc.addProceeding(ctx('u-local'), 'oc-002', { text: 'Vazamento estancado; foto anexada.', attachments: ['foto.jpg'] });
    expect(n3()).toHaveLength(1);
    expect(n3()[0]?.recipientUserIds).toEqual(expect.arrayContaining(['u-local', 'u-seg']));
    await oc.addProceeding(ctx('u-local'), 'oc-002', { text: 'Monitorando a área.', attachments: [] });
    expect(n3()).toHaveLength(1);
    // Pausa tira a elegibilidade; ao retomar, nova passagem → nova N3.
    await oc.pause(ctx('u-local'), 'oc-002', 'Aguardando peça de reposição.');
    await oc.resume(ctx('u-local'), 'oc-002');
    expect(n3()).toHaveLength(2);
  });

  it('aprovação da conclusão (DP-13): quem pede não aprova; recusa mantém Em andamento; pausa cancela o pedido', async () => {
    const { oc, ctx } = setup();
    // OC-0003 (Falha em equipamento de segurança): aprovação + evidência (já há anexo).
    await expect(oc.conclude(ctx('u-seg'), 'oc-003', { evidenceNames: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
    await oc.requestApproval(ctx('u-seg'), 'oc-003', { evidenceNames: [] });
    await expect(oc.decideApproval(ctx('u-seg'), 'oc-003', true, '')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await oc.decideApproval(ctx('u-local'), 'oc-003', false, 'Falta confirmar a gravação noturna.');
    let d = await oc.get(ctx('u-seg'), 'oc-003');
    expect(d.occurrence.status).toBe('em-andamento');
    expect(d.awaitingApproval).toBe(false);
    await oc.requestApproval(ctx('u-seg'), 'oc-003', { evidenceNames: [] });
    await oc.pause(ctx('u-seg'), 'oc-003', 'Aguardando técnico do fornecedor.');
    expect((await oc.get(ctx('u-seg'), 'oc-003')).awaitingApproval).toBe(false);
    await oc.resume(ctx('u-seg'), 'oc-003');
    await oc.requestApproval(ctx('u-seg'), 'oc-003', { evidenceNames: [] });
    await oc.decideApproval(ctx('u-local'), 'oc-003', true, '');
    d = await oc.get(ctx('u-seg'), 'oc-003');
    expect(d.occurrence.status).toBe('concluida');
    expect(d.approvedByName).toBe('Juliana Prado');
  });

  it('exceção autorizada dispensa só as condições do tipo e registra o que foi dispensado (D-013)', async () => {
    const { oc, ctx } = setup();
    await expect(oc.concludeWithException(ctx('u-seg'), 'oc-001', 'Encerramento administrativo')).rejects.toMatchObject({ code: 'CONFLICT' }); // sem trâmite
    await oc.addProceeding(ctx('u-seg'), 'oc-001', { text: 'Verificado pela central.', attachments: [] });
    await oc.concludeWithException(ctx('u-seg'), 'oc-001', 'Encerramento administrativo autorizado.');
    const d = await oc.get(ctx('u-seg'), 'oc-001');
    expect(d.occurrence.conclusion?.exception?.dispensed).toEqual(['Justificativa de conclusão']);
    expect(d.exceptionAuthorizedByName).toBe('Helena Duarte');
  });

  it('permissões separadas e escopo: Gestor de Manutenção só consulta; Gestor Local não vê Curitiba', async () => {
    const { oc, ctx } = setup();
    await expect(oc.addProceeding(ctx('u-man'), 'oc-002', { text: 'Tentativa de trâmite', attachments: [] })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(oc.get(ctx('u-local'), 'oc-007')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(oc.get(ctx('u-tec'), 'oc-002')).rejects.toBeTruthy();
  });

  it('solicitação de manutenção a partir da ocorrência preserva a origem e não altera o status da ocorrência', async () => {
    const { oc, ctx, services } = setup();
    const before = (await oc.get(ctx('u-local'), 'oc-002')).occurrence;
    const req = await services.maintenance.createRequest(ctx('u-local'), {
      title: 'Vazamento — OC-0002',
      description: 'Poça de água sob o chiller.',
      locationId: 'loc-joi-maquinas',
      assetId: 'a-chl001',
      perceivedPriority: 'alta',
      origin: 'manual',
      occurrenceId: 'oc-002',
    });
    expect(req.origin).toBe('ocorrencia');
    const d = await oc.get(ctx('u-local'), 'oc-002');
    expect(d.occurrence.status).toBe(before.status);
    expect(d.occurrence.proceedings).toHaveLength(before.proceedings.length);
    expect(d.linkedRequests.map((r) => r.code)).toEqual([req.code]);
    expect(d.history[0]?.kind).toBe('automatico');
  });
});
