import { describe, expect, it } from 'vitest';
import { createTestServices } from '@/test/renderApp';
import type { AnswerInput } from '@/services';

function setup() {
  const bundle = createTestServices();
  const ctx = (userId: string) => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, r: bundle.services.routines, oc: bundle.services.occurrences, ctx };
}

const portaria = (nc: boolean): AnswerInput[] => [
  { checklistId: 'ck-001', itemId: 'it-001', value: nc ? 'nao-conforme' : 'conforme', observation: nc ? 'Portão destrancado novamente.' : undefined, attachments: nc ? ['portao.jpg'] : [] },
  { checklistId: 'ck-001', itemId: 'it-002', value: 'conforme', attachments: [] },
  { checklistId: 'ck-001', itemId: 'it-003', value: 'Sem novidades.', attachments: [] },
];

const incendio = (nc: boolean): AnswerInput[] => [
  { checklistId: 'ck-002', itemId: 'it-004', value: 'conforme', attachments: [] },
  { checklistId: 'ck-002', itemId: 'it-005', value: nc ? 'nao-conforme' : 'conforme', observation: nc ? 'Alarme persiste.' : undefined, attachments: nc ? ['painel.jpg'] : [] },
  { checklistId: 'ck-002', itemId: 'it-006', value: '7', attachments: [] },
];

describe('Gestão de Rotinas — execução e integrações', () => {
  it('não conformidade gera ocorrência (existente) e sugestão de vínculo após sincronizar (D-005)', async () => {
    const { r, oc, ctx, store } = setup();
    await r.startExecution(ctx('u-oper'), 're-001');
    await expect(r.answerPoint(ctx('u-oper'), 're-001', 'cp-001', portaria(true))).rejects.toMatchObject({ code: 'CONFLICT' }); // sem verificar o ponto
    await r.validatePoint(ctx('u-oper'), 're-001', 'cp-001', 'qr-code');
    // Observação e anexo obrigatórios para "Não Conforme".
    await expect(r.answerPoint(ctx('u-oper'), 're-001', 'cp-001', portaria(true).map((a) => ({ ...a, observation: undefined })))).rejects.toMatchObject({ code: 'VALIDATION' });
    await r.answerPoint(ctx('u-oper'), 're-001', 'cp-001', portaria(true));
    const fin = await r.finishExecution(ctx('u-oper'), 're-001');
    expect(fin).toEqual({ status: 'concluida', synced: true });
    const detail = await r.getExecution(ctx('u-local'), 're-001');
    expect(detail.score).toBe(0);
    const generated = detail.generatedOccurrences[0]!;
    const occ = await oc.get(ctx('u-local'), generated.id);
    expect(occ.occurrence.origin).toBe('nao-conformidade');
    expect(occ.suggestions.map((s) => s.code)).toEqual(['OC-0005']);
    expect(store.getSnapshot().notifications.some((n) => n.title.startsWith('Sugestão de vínculo') && n.recipientUserIds?.includes('u-local'))).toBe(true);
    // Só usuário autorizado confirma; o operador não.
    await expect(oc.decideLinkSuggestion(ctx('u-oper'), generated.id, 'oc-005', true)).rejects.toBeTruthy();
    await oc.decideLinkSuggestion(ctx('u-local'), generated.id, 'oc-005', true);
    expect((await oc.get(ctx('u-local'), 'oc-005')).related.map((x) => x.code)).toContain(occ.occurrence.code);
  });

  it('offline: a finalização fica pendente e as ocorrências só nascem após a sincronização', async () => {
    const { r, ctx, store } = setup();
    await r.setOffline(ctx('u-oper'), true);
    const e = await r.startUnscheduled(ctx('u-oper'), 'rt-003');
    await r.validatePoint(ctx('u-oper'), e.id, 'cp-004', 'qr-code');
    await r.answerPoint(ctx('u-oper'), e.id, 'cp-004', [
      { checklistId: 'ck-003', itemId: 'it-007', value: 'nao-conforme', observation: 'Paletes na frente do extintor.', attachments: ['ext.jpg'] },
      { checklistId: 'ck-003', itemId: 'it-008', value: 'conforme', attachments: [] },
    ]);
    await r.cancelPoint(ctx('u-oper'), e.id, 'cp-005', 'Sala trancada para manutenção.');
    const before = store.getSnapshot().occurrences.length;
    expect((await r.finishExecution(ctx('u-oper'), e.id)).status).toBe('finalizado-parcialmente');
    expect(store.getSnapshot().occurrences.length).toBe(before);
    await expect(r.sync(ctx('u-oper'))).rejects.toMatchObject({ code: 'CONFLICT' });
    await r.setOffline(ctx('u-oper'), false);
    const res = await r.sync(ctx('u-oper'));
    expect(res.synced).toEqual([e.code]);
    expect(res.generatedOccurrences).toHaveLength(1);
  });

  it('reinspeção: pedido pendente bloqueia a conclusão (DP-09); gestor programa; OK habilita sem concluir (DP-11/12)', async () => {
    const { r, oc, ctx } = setup();
    await expect(oc.conclude(ctx('u-seg'), 'oc-009', { evidenceNames: [] })).rejects.toMatchObject({ message: expect.stringMatching(/aguardando resultado/) });
    await expect(r.programReinspection(ctx('u-oper'), 'rq-001', { pointId: 'cp-002', checklistId: 'ck-002' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const e = await r.programReinspection(ctx('u-local'), 'rq-001', { pointId: 'cp-002', checklistId: 'ck-002' });
    await r.startExecution(ctx('u-oper'), e.id);
    await r.validatePoint(ctx('u-oper'), e.id, 'cp-002', 'geolocalizacao');
    await r.answerPoint(ctx('u-oper'), e.id, 'cp-002', incendio(false));
    await r.finishExecution(ctx('u-oper'), e.id);
    const d = await oc.get(ctx('u-seg'), 'oc-009');
    expect(d.reinspections[0]).toMatchObject({ status: 'executada', result: 'ok' });
    expect(d.occurrence.status).toBe('em-andamento');
    expect(d.check.typeMet).toBe(true);
    expect(d.history.some((h) => /Resultado da reinspeção .*: OK/.test(h.text))).toBe(true);
    await oc.conclude(ctx('u-seg'), 'oc-009', { evidenceNames: [] });
  });

  it('reinspeção Não OK (DP-15, alternativa C): original recebe o resultado e a nova ocorrência sugere vínculo com ela', async () => {
    const { r, oc, ctx } = setup();
    const e = await r.programReinspection(ctx('u-local'), 'rq-001', { pointId: 'cp-002', checklistId: 'ck-002' });
    await r.startExecution(ctx('u-oper'), e.id);
    await r.validatePoint(ctx('u-oper'), e.id, 'cp-002', 'geolocalizacao');
    await r.answerPoint(ctx('u-oper'), e.id, 'cp-002', incendio(true));
    await r.finishExecution(ctx('u-oper'), e.id);
    const original = await oc.get(ctx('u-seg'), 'oc-009');
    expect(original.reinspections[0]?.result).toBe('nao-ok');
    expect(original.check.typeMet).toBe(false);
    const created = (await r.getExecution(ctx('u-seg'), e.id)).generatedOccurrences[0]!;
    const fresh = await oc.get(ctx('u-seg'), created.id);
    expect(fresh.suggestions[0]).toMatchObject({ code: 'OC-0009', reason: expect.stringMatching(/Gerada por reinspeção da ocorrência OC-0009/) });
    // D-005d: concluir a original expira a sugestão pendente.
    await oc.concludeWithException(ctx('u-seg'), 'oc-009', 'Equipamento substituído; nova ocorrência acompanha o caso.');
    expect((await oc.get(ctx('u-seg'), created.id)).suggestions[0]?.status).toBe('expirada');
  });

  it('rotina agendada não executada vira "Não realizada" e gera ocorrência (existente)', async () => {
    const { r, oc, ctx } = setup();
    const res = await r.checkMissed(ctx('u-local'));
    expect(res.missed).toEqual(['EX-0002']);
    const o = (await oc.list(ctx('u-local'), { origin: 'rotina-nao-executada' })).items[0]!;
    expect(o.occurrence.code).toBe(res.generatedOccurrences[0]);
    expect((await r.getExecution(ctx('u-local'), 're-002')).execution.status).toBe('nao-realizada');
    // Futura não pode ser iniciada antes do horário.
    await expect(r.startExecution(ctx('u-oper'), 're-004')).rejects.toMatchObject({ message: 'Essa rotina ainda não pode ser executada.' });
  });
});
