import { describe, expect, it } from 'vitest';
import { createTestServices } from '@/test/renderApp';

function setup(userId: string) {
  const bundle = createTestServices();
  const ctx = () => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, ctx };
}

describe('busca global', () => {
  it('retorna ativos, dispositivos e eventos relacionados ao termo', async () => {
    const { services, ctx } = setup('u-seg');
    const results = await services.search.search(ctx(), 'BMB-014');
    expect(results.find((r) => r.type === 'asset')?.id).toBe('a-bmb014');
    expect(results.some((r) => r.type === 'device' && r.id === 'd-bmb014')).toBe(true);
  });

  it('respeita o escopo: Gestor Local de Joinville não encontra a câmara fria de Curitiba', async () => {
    const seg = setup('u-seg');
    const local = setup('u-local');
    expect((await seg.services.search.search(seg.ctx(), 'camara fria')).length).toBeGreaterThan(0);
    expect(await local.services.search.search(local.ctx(), 'camara fria')).toEqual([]);
  });

  it('pessoas só aparecem para perfis com permissão', async () => {
    const seg = setup('u-seg');
    const tec = setup('u-tec');
    expect((await seg.services.search.search(seg.ctx(), 'Helena')).some((r) => r.type === 'person')).toBe(true);
    expect((await tec.services.search.search(tec.ctx(), 'Helena')).some((r) => r.type === 'person')).toBe(false);
  });

  it('não retorna dados de módulo não contratado', async () => {
    const { services, ctx } = setup('u-seg');
    await services.demo.setContract('personalizado', ['security-hub']);
    const results = await services.search.search(ctx(), 'BMB-014');
    expect(results.some((r) => r.type === 'asset' || r.type === 'device')).toBe(false);
  });

  it('sinaliza ocorrências e solicitações como ainda não implementadas', () => {
    const { services, ctx } = setup('u-admin');
    const coverage = services.search.coverage(ctx());
    expect(coverage.find((c) => c.type === 'occurrence')?.implemented).toBe(false);
    expect(coverage.find((c) => c.type === 'request')?.implemented).toBe(false);
  });
});

describe('detalhes respeitam permissão e escopo', () => {
  it('ativo fora do escopo retorna FORBIDDEN', async () => {
    const { services, ctx } = setup('u-local');
    await expect(services.assets.get(ctx(), 'a-camfria')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('ativo inexistente retorna NOT_FOUND', async () => {
    const { services, ctx } = setup('u-admin');
    await expect(services.assets.get(ctx(), 'nao-existe')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('responsabilidade herdada da localização mostra a origem', async () => {
    const { services, ctx } = setup('u-admin');
    const summary = await services.assets.get(ctx(), 'a-ger002');
    expect(summary.responsibilityOrigin).toMatchObject({ kind: 'herdado', fromLocation: { id: 'loc-joi-ind' } });
    expect(summary.responsible?.id).toBe('p-04');
  });

  it('dados de monitoramento só aparecem com o Monitor contratado', async () => {
    const { services, ctx } = setup('u-admin');
    expect((await services.devices.get(ctx(), 'd-bmb014')).monitoring).toBeDefined();
    await services.demo.setContract('essencial');
    expect((await services.devices.get(ctx(), 'd-bmb014')).monitoring).toBeUndefined();
  });
});

describe('notificações', () => {
  it('ler a notificação não reconhece o alerta', async () => {
    const { services, ctx, store } = setup('u-seg');
    await services.notifications.markRead(ctx(), 'n-002');
    const views = await services.notifications.list(ctx(), { category: 'todas' });
    const view = views.find((v) => v.notification.id === 'n-002')!;
    expect(view.read).toBe(true);
    expect(view.linkedEventStatus).toBe('ativo');
    expect(store.getSnapshot().events.find((e) => e.id === 'ev-002')?.status).toBe('ativo');
  });

  it('leitura é individual por usuário', async () => {
    const bundle = createTestServices();
    const seg = bundle.services.session.resolveAccessContext('u-seg')!;
    const admin = bundle.services.session.resolveAccessContext('u-admin')!;
    await bundle.services.notifications.markRead(seg, 'n-002');
    const adminViews = await bundle.services.notifications.list(admin, { category: 'nao-lidas' });
    expect(adminViews.some((v) => v.notification.id === 'n-002')).toBe(true);
  });

  it('respeita escopo: Gestor Local não recebe notificações de Curitiba', async () => {
    const { services, ctx } = setup('u-local');
    const views = await services.notifications.list(ctx(), { category: 'todas' });
    expect(views.some((v) => v.notification.locationId?.startsWith('loc-cwb'))).toBe(false);
    expect(views.length).toBeGreaterThan(0);
  });

  it('filtro por local inclui descendentes', async () => {
    const { services, ctx } = setup('u-seg');
    const views = await services.notifications.list(ctx(), { category: 'todas', locationId: 'loc-joi-ind' });
    expect(views.map((v) => v.notification.id).sort()).toEqual(['n-002', 'n-004', 'n-010']);
  });
});

describe('reconhecimento de alerta', () => {
  it('reconhece alerta ativo e registra auditoria', async () => {
    const { services, ctx, store } = setup('u-seg');
    const detail = await services.events.acknowledge(ctx(), 'ev-002');
    expect(detail.event.status).toBe('reconhecido');
    expect(detail.acknowledgedBy?.id).toBe('p-01');
    expect(store.getSnapshot().auditLog.some((a) => a.action === 'evento.reconhecer' && a.entityId === 'ev-002')).toBe(true);
  });

  it('impede reconhecer duas vezes', async () => {
    const { services, ctx } = setup('u-seg');
    await services.events.acknowledge(ctx(), 'ev-002');
    await expect(services.events.acknowledge(ctx(), 'ev-002')).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('cenário A — falha na BMB-014', () => {
  it('atualiza telemetria e condição, mantém criticidade e contextualiza impacto em segurança', async () => {
    const { services, ctx, store } = setup('u-seg');
    const before = store.getSnapshot().assets.find((a) => a.id === 'a-bmb014')!;
    const { eventId } = await services.demo.simulatePumpFailure();
    const db = store.getSnapshot();
    const pump = db.assets.find((a) => a.id === 'a-bmb014')!;
    expect(pump.condition).toBe('critico');
    expect(pump.criticality).toBe(before.criticality);
    expect(db.dataPoints.find((p) => p.id === 'dp-bmb-pressao')).toMatchObject({ value: 0.4, status: 'critico' });

    const detail = await services.events.get(ctx(), eventId);
    expect(detail.securityRelevant).toBe(true);
    expect(detail.event.securityContext).toContain('SIS-INC-01');
    expect(services.notifications.criticalUnread(ctx()).some((n) => n.target.kind === 'event' && n.target.id === eventId)).toBe(true);
  });

  it('não permite disparar o mesmo cenário duas vezes sem restaurar', async () => {
    const { services } = setup('u-seg');
    await services.demo.simulatePumpFailure();
    await expect(services.demo.simulatePumpFailure()).rejects.toMatchObject({ code: 'CONFLICT' });
    await services.demo.reset();
    await expect(services.demo.simulatePumpFailure()).resolves.toBeDefined();
  });
});
