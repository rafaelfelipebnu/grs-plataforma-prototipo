import { describe, expect, it } from 'vitest';
import { createTestServices } from '@/test/renderApp';

/** Vários usuários sobre a MESMA store (como na demonstração). */
function setup() {
  const bundle = createTestServices();
  const ctx = (userId: string) => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, m: bundle.services.maintenance, ctx };
}

describe('Manutenção — solicitação, triagem, OS e execução', () => {
  it('jornada completa: abre, tria, converte, planeja, executa, envia e encerra — sem propagar status', async () => {
    const { m, ctx, store } = setup();
    const req = await m.createRequest(ctx('u-local'), {
      title: 'Vazamento na casa de bombas',
      description: 'Gotejamento constante na flange de saída.',
      locationId: 'loc-joi-bombas',
      assetId: 'a-bmb014',
      perceivedPriority: 'alta',
      origin: 'painel-ativo',
    });
    expect(req.status).toBe('aberta');
    // Gestor de manutenção recebe aviso no sino (destinatário específico).
    const notes = await store.getSnapshot().notifications.filter((n) => n.target.kind === 'maintenance-request' && n.target.id === req.id);
    expect(notes[0]?.recipientUserIds).toContain('u-man');

    // Decidir sem assumir a triagem não é permitido.
    await expect(m.convertToWorkOrder(ctx('u-man'), req.id, 'alta')).rejects.toMatchObject({ code: 'CONFLICT' });
    await m.startTriage(ctx('u-man'), req.id);
    const order = await m.convertToWorkOrder(ctx('u-man'), req.id, 'critica');
    expect(order.status).toBe('aberta');

    await m.planWorkOrder(ctx('u-man'), order.id, { technicianUserId: 'u-tec', plannedDate: '2030-01-10' });
    // Só o técnico atribuído executa.
    await expect(m.startExecution(ctx('u-man'), order.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await m.startExecution(ctx('u-tec'), order.id);
    // Com execução em andamento não há suspensão nem cancelamento (DP-48/DP-51).
    await expect(m.suspendWorkOrder(ctx('u-man'), order.id, 'Aguardando peça')).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(m.cancelWorkOrder(ctx('u-man'), order.id, 'Não é mais necessário')).rejects.toMatchObject({ code: 'CONFLICT' });

    await expect(m.concludeExecution(ctx('u-tec'), order.id, { workNotes: '', evidenceNames: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
    await m.concludeExecution(ctx('u-tec'), order.id, { workNotes: 'Junta da flange substituída.', evidenceNames: ['flange.jpg'] });
    // Concluir a execução NÃO encerra a OS (DP-47).
    expect((await m.getWorkOrder(ctx('u-man'), order.id)).order.status).toBe('em-execucao');
    await m.submitForClosure(ctx('u-tec'), order.id);
    // Técnico não encerra.
    await expect(m.closeWorkOrder(ctx('u-tec'), order.id, 'Validado')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await m.closeWorkOrder(ctx('u-man'), order.id, 'Sem vazamento após 2 h de operação.');

    const detail = await m.getWorkOrder(ctx('u-man'), order.id);
    expect(detail.order.status).toBe('encerrada');
    expect(detail.executions[0]?.execution.evidences[0]?.name).toBe('flange.jpg');
    // A solicitação continua "Convertida em OS": não muda com a OS.
    expect((await m.getRequest(ctx('u-local'), req.id)).request.status).toBe('convertida');
  });

  it('cancelar a OS não cancela a solicitação; retomar a triagem é manual (DP-50) e preserva o histórico', async () => {
    const { m, ctx } = setup();
    // OS-0001 (sol-003) está Planejada, sem execução.
    await m.cancelWorkOrder(ctx('u-man'), 'os-001', 'Fornecedor fará a revisão em garantia.');
    const cancelled = await m.getWorkOrder(ctx('u-man'), 'os-001');
    expect(cancelled.order.cancellation?.hadPartialWork).toBe(false);
    const req = await m.getRequest(ctx('u-man'), 'sol-003');
    expect(req.request.status).toBe('convertida');
    expect(req.awaitingTriageDecision).toBe(true);
    expect(req.actions.resumeTriage).toBe(true);
    // Solicitante não retoma a triagem.
    await expect(m.resumeTriage(ctx('u-local'), 'sol-003', 'Quero de volta')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await m.resumeTriage(ctx('u-man'), 'sol-003', 'Garantia não cobre o compressor.');
    const resumed = await m.getRequest(ctx('u-man'), 'sol-003');
    expect(resumed.request.status).toBe('em-triagem');
    expect(resumed.cancelledWorkOrders.map((o) => o.code)).toEqual(['OS-0001']);
  });

  it('interromper execução (hipótese P-51) preserva o trabalho parcial e permite cancelar com trabalho parcial', async () => {
    const { m, ctx } = setup();
    await m.startExecution(ctx('u-tec'), 'os-002');
    await m.interruptExecution(ctx('u-man'), 'os-002', 'Gerador precisa voltar à operação.');
    const d = await m.getWorkOrder(ctx('u-man'), 'os-002');
    expect(d.executions.map((e) => e.execution.status)).toEqual(['concluida', 'interrompida']);
    await m.cancelWorkOrder(ctx('u-man'), 'os-002', 'Troca de filtro será feita na preventiva.');
    expect((await m.getWorkOrder(ctx('u-man'), 'os-002')).order.cancellation?.hadPartialWork).toBe(true);
  });

  it('suspensão: impedimento do técnico, suspensão do gestor e tempo total × líquido', async () => {
    const { m, ctx } = setup();
    await m.registerImpediment(ctx('u-tec'), 'os-001', 'Aguardando liberação da área pela produção.');
    await expect(m.suspendWorkOrder(ctx('u-tec'), 'os-001', 'Sem acesso')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await m.suspendWorkOrder(ctx('u-man'), 'os-001', 'Área bloqueada pela produção.');
    let d = await m.getWorkOrder(ctx('u-man'), 'os-001');
    expect(d.order.status).toBe('suspensa');
    expect(d.openImpediments).toBe(0);
    await m.resumeWorkOrder(ctx('u-man'), 'os-001');
    d = await m.getWorkOrder(ctx('u-man'), 'os-001');
    expect(d.order.status).toBe('planejada');
    expect(d.order.suspensions[0]?.endedAt).toBeTruthy();
    expect(d.time.netMs).toBe(d.time.totalMs - d.time.suspendedMs);
  });

  it('solicitante edita e cancela só enquanto Aberta (DP-40); escopo de localização é respeitado', async () => {
    const { m, ctx } = setup();
    await m.editRequest(ctx('u-local'), 'sol-001', { title: 'Ruído e trepidação no elevador social', description: 'Estalos ao parar no 1º andar.', perceivedPriority: 'alta' });
    const edited = await m.getRequest(ctx('u-local'), 'sol-001');
    expect(edited.history[0]?.text).toMatch(/prioridade percebida: Média → Alta/);
    // sol-002 já está em triagem.
    await expect(m.cancelRequest(ctx('u-seg'), 'sol-002', 'Desisti do pedido')).rejects.toMatchObject({ code: 'CONFLICT' });
    // Gestor local (Joinville) não vê a solicitação de Curitiba.
    await expect(m.getRequest(ctx('u-local'), 'sol-007')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const list = await m.listRequests(ctx('u-local'), { pageSize: 50 });
    expect(list.items.some((i) => i.request.id === 'sol-007')).toBe(false);
  });
});
