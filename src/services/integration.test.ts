import { describe, expect, it } from 'vitest';
import { FIXED_NOW, createTestServices } from '@/test/renderApp';

/**
 * Consultas entre módulos (coesão da plataforma): cada módulo responde pelo
 * que é seu, com as próprias regras de permissão e escopo; quem integra só
 * compõe. Nada é copiado nem associado automaticamente.
 */
function setup() {
  const bundle = createTestServices();
  const ctx = (userId: string) => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, s: bundle.services, ctx };
}

const occurredAt = () => new Date(FIXED_NOW.getTime() - 600_000).toISOString();

describe('rastreabilidade a partir do evento', () => {
  it('solicitação aberta a partir do evento preserva a origem e aparece nos registros do evento', async () => {
    const { s, ctx } = setup();
    const created = await s.maintenance.createRequest(ctx('u-seg'), {
      title: 'Câmera do estacionamento sem sinal',
      description: 'Verificar alimentação e cabeamento da CAM-EST-03.',
      locationId: 'loc-joi-estac',
      assetId: 'a-cam02',
      perceivedPriority: 'alta',
      origin: 'manual',
      sourceEventId: 'ev-004',
    });
    expect(created.origin).toBe('evento');
    expect(created.sourceEventId).toBe('ev-004');
    expect(created.history[0]?.text).toContain('a partir do evento EVT-2026-0398');

    const fromEvent = await s.maintenance.linkedRecords(ctx('u-seg'), { eventId: 'ev-004' });
    expect(fromEvent.map((r) => r.code)).toEqual([created.code]);
    expect(fromEvent[0]?.open).toBe(true);
  });

  it('ocorrências registradas a partir do evento são listadas no evento; nada é associado automaticamente', async () => {
    const { s, ctx } = setup();
    const oc = await s.occurrences.register(ctx('u-seg'), {
      typeId: 'tp-equip-seg',
      locationId: 'loc-joi-estac',
      assetId: 'a-cam02',
      description: 'Câmera sem sinal no estacionamento.',
      occurredAt: occurredAt(),
      priority: 'alta',
      involvedPersonIds: [],
      sourceEventId: 'ev-004',
    });
    const sol = await s.maintenance.createRequest(ctx('u-seg'), {
      title: 'Câmera do estacionamento sem sinal',
      description: 'Verificar alimentação.',
      locationId: 'loc-joi-estac',
      assetId: 'a-cam02',
      perceivedPriority: 'alta',
      origin: 'manual',
      sourceEventId: 'ev-004',
    });
    expect((await s.occurrences.linkedRecords(ctx('u-seg'), { eventId: 'ev-004' })).map((r) => r.code)).toEqual([oc.code]);
    // Sem associação automática entre a solicitação e a ocorrência.
    expect(sol.occurrenceId).toBeUndefined();
    expect((await s.occurrences.get(ctx('u-seg'), oc.id)).linkedRequests).toEqual([]);
    // Registrar de novo não é bloqueado (D-005c em aberto).
    const again = await s.occurrences.register(ctx('u-seg'), {
      typeId: 'tp-equip-seg',
      locationId: 'loc-joi-estac',
      description: 'Segundo registro do mesmo evento.',
      occurredAt: occurredAt(),
      priority: 'alta',
      involvedPersonIds: [],
      sourceEventId: 'ev-004',
    });
    expect((await s.occurrences.linkedRecords(ctx('u-seg'), { eventId: 'ev-004' })).map((r) => r.code).sort()).toEqual([oc.code, again.code].sort());
  });

  it('registros abertos do ativo respeitam o escopo de quem consulta', async () => {
    const { s, ctx } = setup();
    // SOL-0007 é de Curitiba (sem ativo): Juliana (Joinville) não a vê; Helena vê a SOL-0004 do GER-002.
    const ger = await s.maintenance.linkedRecords(ctx('u-seg'), { assetId: 'a-ger002', openOnly: true });
    expect(ger.some((r) => r.code === 'SOL-0004')).toBe(true);
    const camFria = await s.occurrences.linkedRecords(ctx('u-local'), { assetId: 'a-camfria' });
    expect(camFria).toEqual([]);
  });

  it('origem de evento inválida ou fora do escopo é recusada', async () => {
    const { s, ctx } = setup();
    await expect(
      s.maintenance.createRequest(ctx('u-local'), {
        title: 'Teste de origem',
        description: 'Evento de Curitiba fora do escopo.',
        locationId: 'loc-joi-estac',
        perceivedPriority: 'media',
        origin: 'manual',
        sourceEventId: 'ev-001',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('ações pendentes informadas pelos módulos donos', () => {
  it('cada perfil recebe só o que pode fazer', async () => {
    const { s, ctx } = setup();
    const man = await s.maintenance.pendingWork(ctx('u-man'), {});
    expect(man.some((i) => i.action === 'Triar solicitação')).toBe(true);
    // O Técnico não faz triagem.
    expect((await s.maintenance.pendingWork(ctx('u-tec'), {})).some((i) => i.action === 'Triar solicitação')).toBe(false);

    // Helena avalia a eficácia do PA-0002 (avaliação atrasada).
    const plans = await s.plans.pendingWork(ctx('u-seg'), {});
    expect(plans.some((i) => i.title.startsWith('PA-0002') && i.action.startsWith('Avaliar eficácia'))).toBe(true);
    // Juliana não é a avaliadora do PA-0002.
    expect((await s.plans.pendingWork(ctx('u-local'), {})).some((i) => i.title.startsWith('PA-0002') && i.action.startsWith('Avaliar'))).toBe(false);

    // Reinspeção da OC-0009 aguarda programação por quem gerencia Rotinas.
    const routines = await s.routines.pendingWork(ctx('u-local'), {});
    expect(routines.some((i) => i.action === 'Programar reinspeção' && i.title.includes('OC-0009'))).toBe(true);
    expect(await s.routines.pendingWork(ctx('u-oper'), {})).toEqual([]);
  });

  it('ocorrência nova sem tratamento entra nas ações de quem trata, sem mudar a ocorrência', async () => {
    const { s, ctx } = setup();
    const created = await s.occurrences.register(ctx('u-seg'), {
      typeId: 'tp-vidro',
      locationId: 'loc-joi-recepcao',
      description: 'Vidro da recepção trincado.',
      occurredAt: occurredAt(),
      priority: 'media',
      involvedPersonIds: [],
    });
    const pending = await s.occurrences.pendingWork(ctx('u-seg'), {});
    expect(pending.some((i) => i.title.startsWith(created.code) && i.action === 'Tratar ocorrência sem tratamento')).toBe(true);
    expect((await s.occurrences.get(ctx('u-seg'), created.id)).occurrence.status).toBe('sem-tratamento');
  });
});

describe('widgets do Security Hub consultam os módulos', () => {
  it('Manutenções em andamento: só OS ativas de ativos relevantes para a segurança', async () => {
    const { s, ctx } = setup();
    const summary = await s.maintenance.hubSummary(ctx('u-seg'), {});
    // GER-002 sustenta a controladora de acesso: é relevante para a segurança.
    expect(summary.orders.some((o) => o.asset?.tag === 'GER-002')).toBe(true);
    expect(summary.orders.every((o) => o.order.status !== 'encerrada' && o.order.status !== 'cancelada')).toBe(true);
  });

  it('Inspeções e rotinas pendentes: pendentes e reinspeções a programar no escopo', async () => {
    const { s, ctx } = setup();
    const summary = await s.routines.hubSummary(ctx('u-seg'), {});
    expect(summary.items.some((i) => i.execution.code === 'EX-0001')).toBe(true);
    expect(summary.counts.reinspecoesAProgramar).toBe(1);
  });
});

describe('linha do tempo do ativo consulta os módulos donos', () => {
  it('reúne solicitações, OS e ocorrências do ativo, com link para o registro', async () => {
    const { s, ctx } = setup();
    const maintenance = await s.maintenance.assetTimeline(ctx('u-seg'), 'a-ger002');
    expect(maintenance.some((h) => h.summary.startsWith('SOL-0004') && h.target?.kind === 'maintenance-request')).toBe(true);
    expect(maintenance.some((h) => h.summary.startsWith('OS-0002') && h.target?.kind === 'work-order')).toBe(true);

    const occurrences = await s.occurrences.assetTimeline(ctx('u-seg'), 'a-bmb014');
    expect(occurrences.some((h) => h.summary.startsWith('OC-0009'))).toBe(true);
  });

  it('sem acesso ao módulo, a linha do tempo não mostra seus registros', async () => {
    const { s, ctx } = setup();
    expect(await s.occurrences.assetTimeline(ctx('u-tec'), 'a-bmb014')).toEqual([]);
  });
});
