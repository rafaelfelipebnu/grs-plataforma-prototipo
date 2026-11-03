import { describe, expect, it } from 'vitest';
import { createTestServices } from '@/test/renderApp';

function setup(userId: string) {
  const bundle = createTestServices();
  const ctx = () => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, ctx };
}

describe('lista de eventos do Security Hub', () => {
  it('inclui apenas eventos relevantes para segurança', async () => {
    const { services, ctx } = setup('u-seg');
    const { items } = await services.hub.listEvents(ctx(), { pageSize: 100 });
    const ids = items.map((i) => i.event.id);
    expect(ids).toContain('ev-004'); // câmera sem sinal, com contexto de segurança
    expect(ids).not.toContain('ev-005'); // chiller: telemetria sem impacto em segurança
    expect(ids).not.toContain('ev-006'); // câmara fria: idem
  });

  it('respeita escopo, filtros e paginação', async () => {
    const { services, ctx } = setup('u-local');
    const all = await services.hub.listEvents(ctx(), { pageSize: 100 });
    expect(all.items.some((i) => i.event.locationId.startsWith('loc-cwb'))).toBe(false);
    const active = await services.hub.listEvents(ctx(), { status: 'ativo', pageSize: 2, page: 1 });
    expect(active.items).toHaveLength(2);
    expect(active.total).toBeGreaterThan(2);
    expect(active.items.every((i) => i.event.status === 'ativo')).toBe(true);
  });

  it('filtro por local fora do escopo é negado', async () => {
    const { services, ctx } = setup('u-local');
    await expect(services.hub.listEvents(ctx(), { locationId: 'loc-cwb' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('reconhece em lote apenas alertas ativos', async () => {
    const { services, ctx } = setup('u-seg');
    const result = await services.hub.acknowledgeMany(ctx(), ['ev-001', 'ev-002', 'ev-007']);
    expect(result).toEqual({ acknowledged: 2, skipped: 1 });
  });
});

describe('widgets do Security Hub', () => {
  it('tempo médio de resposta considera eventos reconhecidos no período', async () => {
    const { services, ctx } = setup('u-seg');
    const rt = await services.hub.responseTime(ctx(), { period: '7d' });
    expect(rt.acknowledgedCount).toBe(12);
    expect(rt.averageMinutes).toBeGreaterThan(0);
    const before = rt.acknowledgedCount;
    await services.events.acknowledge(ctx(), 'ev-002');
    expect((await services.hub.responseTime(ctx(), { period: '7d' })).acknowledgedCount).toBe(before + 1);
  });

  it('ativos críticos: só os relevantes para segurança (inclusive dependências), sem confundir com condição', async () => {
    const { services, ctx } = setup('u-seg');
    const tags = (await services.hub.criticalAssets(ctx(), { minCriticality: 'alta' })).map((v) => v.asset.tag);
    expect(tags).toContain('BMB-014'); // abastece o sistema de incêndio
    expect(tags).toContain('GER-002'); // alimenta a controladora de acesso
    expect(tags).not.toContain('CHL-001'); // climatização, sem relação com segurança
    expect(tags).not.toContain('CFR-01');
  });

  it('saúde da infraestrutura exige o Monitor contratado', async () => {
    const { services, ctx } = setup('u-seg');
    const health = await services.hub.infrastructureHealth(ctx(), {});
    expect(health.offline).toBeGreaterThanOrEqual(1); // CAM-EST-03
    await services.demo.setContract('essencial');
    await expect(services.hub.infrastructureHealth(ctx(), {})).rejects.toMatchObject({ code: 'NOT_CONTRACTED' });
  });

  it('situação por localização parte das raízes do escopo', async () => {
    const seg = setup('u-seg');
    const rows = await seg.services.hub.locationStatus(seg.ctx(), {});
    expect(rows.map((r) => r.location.id).sort()).toEqual(['loc-cwb', 'loc-joi']);
    const local = setup('u-local');
    const localRows = await local.services.hub.locationStatus(local.ctx(), {});
    expect(localRows.map((r) => r.location.id)).toEqual(['loc-joi']);
    expect(localRows[0]!.children.length).toBeGreaterThan(0);
  });

  it('indicadores agregam apenas dados do escopo (sem inferência de outras unidades)', async () => {
    const seg = setup('u-seg');
    const local = setup('u-local');
    const all = await seg.services.hub.indicators(seg.ctx(), { period: '24h' });
    const joi = await local.services.hub.indicators(local.ctx(), { period: '24h' });
    expect(joi.criticalActive).toBeLessThan(all.criticalActive); // intrusão nas docas (CWB) não entra
  });

  it('acessos: contagem de liberados/negados e filtro por resultado', async () => {
    const { services, ctx } = setup('u-seg');
    const page = await services.hub.listAccess(ctx(), { period: '24h', result: 'negado', pageSize: 50 });
    expect(page.denied).toBeGreaterThanOrEqual(4);
    expect(page.items.every((i) => i.passage.result === 'negado')).toBe(true);
  });
});

describe('painéis', () => {
  it('usuário sem personalização usa o padrão do cliente', () => {
    const { services, ctx } = setup('u-seg');
    expect(services.dashboards.get(ctx()).source).toBe('padrao-cliente');
  });

  it('padrão do administrador só afeta quem não personalizou', async () => {
    const bundle = createTestServices();
    const admin = bundle.services.session.resolveAccessContext('u-admin')!;
    const seg = bundle.services.session.resolveAccessContext('u-seg')!;
    const local = bundle.services.session.resolveAccessContext('u-local')!;
    const original = bundle.services.dashboards.get(seg).layout.widgets;

    await bundle.services.dashboards.saveMine(seg, original.slice(0, 2));
    await bundle.services.dashboards.saveClientDefault(admin, original.slice(0, 1));

    expect(bundle.services.dashboards.get(seg).layout.widgets).toHaveLength(2); // personalizou: não afetado
    expect(bundle.services.dashboards.get(local).layout.widgets).toHaveLength(1); // usa o novo padrão
    expect(bundle.services.dashboards.personalizedCount(admin)).toBe(1);

    await bundle.services.dashboards.resetMine(seg);
    expect(bundle.services.dashboards.get(seg).layout.widgets).toHaveLength(1);
  });

  it('somente o administrador define o padrão do cliente', async () => {
    const { services, ctx } = setup('u-seg');
    await expect(services.dashboards.saveClientDefault(ctx(), [])).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejeita tamanho não permitido para o widget', async () => {
    const { services, ctx } = setup('u-seg');
    await expect(
      services.dashboards.saveMine(ctx(), [{ id: 'x', type: 'mapa-operacional', area: 'mapa', size: 3, config: {} }]),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
