import { describe, expect, it } from 'vitest';
import { createTestServices } from '@/test/renderApp';
import type { AssetInput } from './contracts';

function setup(userId: string) {
  const bundle = createTestServices();
  const ctx = () => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, ctx };
}

const NEW_ASSET: AssetInput = {
  tag: 'CHL-002',
  name: 'Chiller reserva',
  description: 'Ativo de demonstração',
  classificationId: 'cls-chiller',
  primaryLocationId: 'loc-joi-maquinas',
  servedLocationIds: ['loc-joi-adm'],
  criticality: 'media',
  dependsOnAssetIds: ['a-ger002'],
};

describe('Central — visão por local e escopo', () => {
  it('Gestor Local vê apenas os ativos de Joinville; corporativo vê todos', async () => {
    const local = setup('u-local');
    const corp = setup('u-admin');
    expect((await local.services.central.overview(local.ctx(), {})).indicators.totalAssets).toBe(11);
    expect((await corp.services.central.overview(corp.ctx(), {})).indicators.totalAssets).toBe(15);
  });

  it('inclui descendentes por padrão e permite "somente este local"', async () => {
    const { services, ctx } = setup('u-admin');
    const withChildren = await services.central.listAssets(ctx(), { locationId: 'loc-joi-ind' });
    const only = await services.central.listAssets(ctx(), { locationId: 'loc-joi-ind', includeDescendants: false });
    expect(withChildren.total).toBeGreaterThan(0);
    expect(only.total).toBe(0);
  });

  it('local fora do escopo é recusado sem expor dados', async () => {
    const { services, ctx } = setup('u-local');
    await expect(services.central.listAssets(ctx(), { locationId: 'loc-cwb' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('telemetria exige o Monitor de Infraestrutura contratado', async () => {
    const { services, ctx } = setup('u-admin');
    expect((await services.central.listDataPoints(ctx(), {})).total).toBeGreaterThan(0);
    await services.demo.setContract('essencial');
    await expect(services.central.listDataPoints(ctx(), {})).rejects.toMatchObject({ code: 'NOT_CONTRACTED' });
  });
});

describe('Central — cadastro mestre', () => {
  it('cria ativo com localização principal distinta dos locais atendidos e registra auditoria', async () => {
    const { services, ctx, store } = setup('u-admin');
    const asset = await services.central.createAsset(ctx(), NEW_ASSET);
    expect(asset.condition).toBe('normal');
    expect(asset.primaryLocationId).toBe('loc-joi-maquinas');
    expect(asset.servedLocationIds).toEqual(['loc-joi-adm']);
    expect(store.getSnapshot().auditLog.some((a) => a.entityId === asset.id && a.action === 'ativo.criar')).toBe(true);
    // Impacto: GER-002 passa a ter o novo ativo como dependente direto.
    const ger = await services.central.getAsset360(ctx(), 'a-ger002');
    expect(ger.impact.directDependents.map((a) => a.tag)).toContain('CHL-002');
  });

  it('localização principal é obrigatória e a tag é única', async () => {
    const { services, ctx } = setup('u-admin');
    await expect(services.central.createAsset(ctx(), { ...NEW_ASSET, primaryLocationId: '' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(services.central.createAsset(ctx(), { ...NEW_ASSET, tag: 'ger-002' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('duplicidade fora do escopo é sinalizada sem expor o ativo', () => {
    const { services, ctx } = setup('u-local');
    const check = services.central.checkDuplicates(ctx(), { tag: 'CFR-01', name: 'x', primaryLocationId: 'loc-joi-maquinas' });
    expect(check.tagConflict).toBeUndefined();
    expect(check.tagTakenOutOfScope).toBe(true);
  });

  it('perfil sem gestão da Central não altera o cadastro', async () => {
    const { services, ctx } = setup('u-seg');
    await expect(services.central.createAsset(ctx(), NEW_ASSET)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('edição exige motivo e entra no histórico do ativo', async () => {
    const { services, ctx } = setup('u-local');
    const base = await services.assets.get(ctx(), 'a-chl001');
    const input: AssetInput = {
      tag: base.asset.tag,
      name: 'Chiller principal — água gelada',
      description: base.asset.description,
      classificationId: base.asset.classificationId,
      primaryLocationId: base.asset.primaryLocationId,
      servedLocationIds: base.asset.servedLocationIds,
      criticality: 'alta',
      dependsOnAssetIds: [],
    };
    await expect(services.central.updateAsset(ctx(), 'a-chl001', input, '')).rejects.toMatchObject({ code: 'VALIDATION' });
    await services.central.updateAsset(ctx(), 'a-chl001', input, 'Revisão de criticidade');
    const s = await services.central.getAsset360(ctx(), 'a-chl001');
    expect(s.asset.criticality).toBe('alta');
    expect(s.history[0]?.summary).toMatch(/nome, criticidade.*Revisão de criticidade/);
  });

  it('condição operacional muda sem alterar a criticidade intrínseca', async () => {
    const { services, ctx } = setup('u-local');
    const updated = await services.central.setCondition(ctx(), 'a-ger002', 'indisponivel', 'Manutenção corretiva');
    expect(updated.condition).toBe('indisponivel');
    expect(updated.criticality).toBe('alta');
    expect(updated.conditionSource).toEqual({ kind: 'manual' });
  });

  it('importação: prévia sem gravar, duplicidades evitadas e criação após confirmação', async () => {
    const { services, ctx, store } = setup('u-admin');
    const before = store.getSnapshot().assets.length;
    const csv = 'tag;nome;classificacao;local;criticidade\nCHL-002;Chiller reserva;Chillers;JOI-IND-MAQ;media\nGER-002;Gerador;Geradores;JOI-IND-MAQ;alta\nX-1;Sem local;Bombas;NAO-EXISTE;alta';
    const preview = services.central.previewImport(ctx(), csv);
    expect(store.getSnapshot().assets.length).toBe(before);
    expect(preview.validCount).toBe(1);
    expect(preview.rows[1]?.duplicateOf?.tag).toBe('GER-002');
    expect(preview.rows[2]?.errors.join(' ')).toMatch(/Local "NAO-EXISTE" não encontrado/);
    const result = await services.central.applyImport(ctx(), preview, {});
    expect(result.created.map((a) => a.tag)).toEqual(['CHL-002']);
    expect(result.duplicatesAvoided).toBe(1);
    expect((await services.central.overview(ctx(), {})).indicators.duplicatesAvoided).toBe(1);
  });
});

describe('Central — grupos', () => {
  it('associação = regras + manuais − exceções, com conflito sinalizado', async () => {
    const { services, ctx } = setup('u-admin');
    const incendio = await services.groups.get(ctx(), 'g-incendio');
    expect(incendio.members.map((m) => m.asset.tag).sort()).toEqual(['BMB-014', 'EXT-IND-12', 'SIS-INC-01']);
    expect(incendio.members.find((m) => m.asset.tag === 'BMB-014')?.manual).toBe(true);
    const clima = await services.groups.get(ctx(), 'g-climatizacao');
    expect(clima.exceptions[0]?.asset.tag).toBe('CFR-01');
    expect(clima.exceptions[0]?.conflictingRuleIds).toEqual(['r-clima-1']);
  });

  it('exceção persiste e bloqueia inclusão manual até ser removida', async () => {
    const { services, ctx } = setup('u-local');
    await services.groups.addException(ctx(), 'g-incendio', 'a-ext12', 'Extintor desativado');
    let g = await services.groups.get(ctx(), 'g-incendio');
    expect(g.members.some((m) => m.asset.id === 'a-ext12')).toBe(false);
    await expect(services.groups.includeAsset(ctx(), 'g-incendio', 'a-ext12', 'Tentativa')).rejects.toMatchObject({ code: 'CONFLICT' });
    await services.groups.removeException(ctx(), 'g-incendio', 'a-ext12', 'Extintor reativado');
    g = await services.groups.get(ctx(), 'g-incendio');
    expect(g.members.some((m) => m.asset.id === 'a-ext12')).toBe(true);
    expect(g.history.filter((h) => h.kind === 'associacao' && h.assetId === 'a-ext12')).toHaveLength(2);
  });

  it('governança híbrida: gestor local não altera regras corporativas, mas cria grupo local', async () => {
    const local = setup('u-local');
    const g = await local.services.groups.get(local.ctx(), 'g-energia');
    expect(g.permissions.editConfig).toBe(false);
    expect(g.permissions.manageAssociations).toBe(true);
    expect(g.hiddenOutOfScope).toBe(1);
    await expect(
      local.services.groups.updateConfig(local.ctx(), 'g-energia', { name: g.group.name, description: '', category: 'corporativo', rules: [], consumers: [] }, 'Tentativa local'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      local.services.groups.create(local.ctx(), { name: 'Grupo corporativo', description: '', category: 'corporativo', rules: [], consumers: [] }, 'Tentativa'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const created = await local.services.groups.create(
      local.ctx(),
      { name: 'Quadros elétricos — Joinville', description: '', category: 'operacional', scopeLocationId: 'loc-joi', rules: [{ id: '', description: 'Quadros', classificationIds: ['cls-quadro'] }], consumers: [] },
      'Inspeção termográfica',
    );
    expect(created.rules[0]?.localScopeLocationId).toBe('loc-joi');
  });

  it('prévia mostra os ativos afetados sem alterar o grupo; a gravação separa configuração e associação', async () => {
    const { services, ctx } = setup('u-admin');
    const rules = [{ id: 'r-energia-1', description: 'Sistemas elétricos', classificationIds: ['cls-ele'] }];
    const preview = services.groups.preview(ctx(), 'g-energia', { rules });
    expect(preview.added.map((a) => a.tag)).toEqual(['QD-ADM-01']);
    expect((await services.groups.get(ctx(), 'g-energia')).members.some((m) => m.asset.tag === 'QD-ADM-01')).toBe(false);
    await services.groups.updateConfig(ctx(), 'g-energia', { name: 'Ativos críticos de energia', description: 'x', category: 'corporativo', rules, consumers: ['manutencao'] }, 'Ampliação do escopo');
    const g = await services.groups.get(ctx(), 'g-energia');
    expect(g.members.some((m) => m.asset.tag === 'QD-ADM-01')).toBe(true);
    expect(g.history.some((h) => h.kind === 'configuracao' && h.action === 'grupo.configurar')).toBe(true);
    expect(g.history.some((h) => h.kind === 'associacao' && h.action === 'associacao.regra-incluir')).toBe(true);
    // Compartilhar não dispara ação: o consumidor mantido preserva a reação; nenhum novo consumidor nasce configurado.
    expect(g.group.consumers).toEqual([{ moduleId: 'manutencao', reaction: 'nao-configurada' }]);
  });

  it('auditoria local é concluída sem aprovação corporativa', async () => {
    const { services, ctx } = setup('u-local');
    const before = await services.groups.get(ctx(), 'g-cameras-joi');
    expect(before.auditStatus[0]?.status).toBe('vencida');
    await services.groups.registerAudit(ctx(), 'g-cameras-joi', 'loc-joi', 'Câmeras conferidas');
    const after = await services.groups.get(ctx(), 'g-cameras-joi');
    expect(after.auditStatus[0]?.status).toBe('em-dia');
  });

  it('grupo especializado é somente leitura na Central', async () => {
    const { services, ctx } = setup('u-admin');
    const g = await services.groups.get(ctx(), 'g-ronda-noturna');
    expect(g.permissions).toMatchObject({ editConfig: false, manageAssociations: false });
    await expect(services.groups.includeAsset(ctx(), 'g-ronda-noturna', 'a-cam02', 'Novo ponto')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
