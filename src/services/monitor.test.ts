import { describe, expect, it } from 'vitest';
import { createTestServices } from '@/test/renderApp';

function setup(userId: string) {
  const bundle = createTestServices();
  const ctx = () => bundle.services.session.resolveAccessContext(userId)!;
  return { ...bundle, ctx };
}

describe('Monitor — descoberta somente leitura', () => {
  it('descobrir gera candidatos com sugestões explicadas, sem criar dispositivo nem associar ativo', async () => {
    const { services, ctx, store } = setup('u-admin');
    const devicesBefore = store.getSnapshot().devices.length;
    const { candidates, run } = await services.monitor.runDiscovery(ctx(), 'conn-modbus-joi');
    expect(run.newCandidates).toBe(1);
    expect(store.getSnapshot().devices.length).toBe(devicesBefore);
    const c = candidates[0]!;
    expect(c.status).toBe('pendente');
    expect(c.suggestions.assetId).toBe('a-qdadm');
    expect(c.suggestions.locationId).toBe('loc-joi-adm-t');
    expect(c.suggestions.reasons.join(' ')).toMatch(/Correspondência: QD-ADM-01/);
    // Repetir a descoberta não duplica candidatos.
    expect((await services.monitor.runDiscovery(ctx(), 'conn-modbus-joi')).run.newCandidates).toBe(0);
  });

  it('conector desativado não descobre; perfis sem gestão do Monitor não executam descoberta', async () => {
    const admin = setup('u-admin');
    await admin.services.monitor.setConnectorActive(admin.ctx(), 'conn-snmp-joi', false, 'Manutenção da rede');
    await expect(admin.services.monitor.runDiscovery(admin.ctx(), 'conn-snmp-joi')).rejects.toMatchObject({ code: 'VALIDATION' });
    const local = setup('u-local');
    await expect(local.services.monitor.runDiscovery(local.ctx(), 'conn-modbus-joi')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('cadastro de conector rejeita credenciais e exige motivo', async () => {
    const { services, ctx } = setup('u-admin');
    const input = { name: 'Agente GRS Joinville · BACnet 2', protocol: 'BACnet' as const, unitLocationId: 'loc-joi', networkScope: '10.20.9.0/24' };
    await expect(services.monitor.createConnector(ctx(), { ...input, networkScope: 'password=123' }, 'Nova rede')).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(services.monitor.createConnector(ctx(), input, '')).rejects.toMatchObject({ code: 'VALIDATION' });
    const c = await services.monitor.createConnector(ctx(), input, 'Nova rede de automação');
    expect(c.simulated).toBe(true);
    expect((await services.monitor.runDiscovery(ctx(), c.id)).run.newCandidates).toBe(1);
  });
});

describe('Central — revisão humana da descoberta', () => {
  it('Gestor Local aprova associando ao ativo sugerido; pontos passam a existir', async () => {
    const admin = setup('u-admin');
    await admin.services.monitor.runDiscovery(admin.ctx(), 'conn-modbus-joi');
    const ctx = admin.services.session.resolveAccessContext('u-local')!;
    const pending = await admin.services.discovery.pending(ctx);
    const item = pending.find((p) => p.kind === 'candidato')!;
    expect(item.kind === 'candidato' && item.suggestedAsset?.tag).toBe('QD-ADM-01');
    await expect(
      admin.services.discovery.approve(ctx, { kind: 'candidato', id: item.kind === 'candidato' ? item.candidate.id : '' }, { deviceName: 'Multimedidor', locationId: '', association: { kind: 'nenhuma' }, reason: 'Conferido' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    const { device } = await admin.services.discovery.approve(
      ctx,
      { kind: 'candidato', id: item.kind === 'candidato' ? item.candidate.id : '' },
      { deviceName: 'Multimedidor QGBT-ADM', locationId: 'loc-joi-adm-t', association: { kind: 'existente', assetId: 'a-qdadm' }, reason: 'Conferido em campo' },
    );
    expect(device).toMatchObject({ locationStatus: 'confirmada', locationId: 'loc-joi-adm-t', assetId: 'a-qdadm', origin: 'descoberta' });
    expect(admin.store.getSnapshot().dataPoints.filter((p) => p.deviceId === device.id)).toHaveLength(3);
    const overview = await admin.services.central.overview(ctx, {});
    expect(overview.indicators.discoveredIncorporated).toBeGreaterThan(0);
  });

  it('aprovação pode criar ativo novo pela identidade mestre (valida duplicidade)', async () => {
    const { services, ctx } = setup('u-admin');
    await services.monitor.runDiscovery(ctx(), 'conn-onvif-joi');
    const item = (await services.discovery.pending(ctx())).find((p) => p.kind === 'candidato')!;
    const ref = { kind: 'candidato' as const, id: item.kind === 'candidato' ? item.candidate.id : '' };
    const asset = { tag: 'CAM-EST-03', name: 'Câmera', description: '', classificationId: 'cls-cam', primaryLocationId: 'loc-joi-estac', servedLocationIds: [], criticality: 'media' as const, dependsOnAssetIds: [] };
    await expect(services.discovery.approve(ctx(), ref, { deviceName: 'Câmera 0431', locationId: 'loc-joi-estac', association: { kind: 'novo', asset }, reason: 'Nova câmera' })).rejects.toMatchObject({ code: 'VALIDATION' });
    const result = await services.discovery.approve(ctx(), ref, { deviceName: 'Câmera 0431', locationId: 'loc-joi-estac', association: { kind: 'novo', asset: { ...asset, tag: 'CAM-EST-04' } }, reason: 'Nova câmera' });
    expect(result.asset?.tag).toBe('CAM-EST-04');
    expect(result.device.assetId).toBe(result.asset?.id);
  });

  it('rejeitar candidato e rejeitar sugestão de localização de dispositivo existente', async () => {
    const { services, ctx, store } = setup('u-admin');
    await services.monitor.runDiscovery(ctx(), 'conn-snmp-joi');
    const printer = (await services.discovery.pending(ctx())).find((p) => p.kind === 'candidato')!;
    await services.discovery.reject(ctx(), { kind: 'candidato', id: printer.kind === 'candidato' ? printer.candidate.id : '' }, 'Impressora fora do escopo');
    await services.discovery.reject(ctx(), { kind: 'dispositivo', id: 'd-ups01' }, 'Nobreak está na sala de TI do 1º andar');
    const ups = store.getSnapshot().devices.find((d) => d.id === 'd-ups01')!;
    expect(ups.locationStatus).toBe('nao_identificada');
    await expect(services.discovery.reject(ctx(), { kind: 'dispositivo', id: 'd-bac2001' }, 'Sem sugestão')).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('confirma localização de dispositivo com sugestão pendente', async () => {
    const { services, ctx } = setup('u-local');
    const { device } = await services.discovery.approve(ctx(), { kind: 'dispositivo', id: 'd-nivres' }, { deviceName: 'Sensor de nível LT-RES-01', locationId: 'loc-joi-reservatorio', association: { kind: 'existente', assetId: 'a-sisinc' }, reason: 'Sensor instalado no reservatório' });
    expect(device).toMatchObject({ locationStatus: 'confirmada', assetId: 'a-sisinc' });
  });

  it('perfil sem gestão da Central não aprova', async () => {
    const { services, ctx } = setup('u-seg');
    await expect(services.discovery.approve(ctx(), { kind: 'dispositivo', id: 'd-nivres' }, { deviceName: 'x', locationId: 'loc-joi', association: { kind: 'nenhuma' }, reason: 'teste' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('Monitor — telemetria e regras', () => {
  it('leitura simulada que viola regra gera alerta técnico (um por regra) e muda o status do ponto', async () => {
    const { services, ctx, store } = setup('u-admin');
    const r1 = await services.monitor.simulateReading(ctx(), 'dp-ger-comb', '22');
    expect(r1.point.status).toBe('alerta');
    expect(r1.triggered).toHaveLength(1);
    expect(r1.triggered[0]).toMatchObject({ source: 'monitor', severity: 'alta', assetId: 'a-ger002', ruleId: 'rule-ger-comb' });
    const r2 = await services.monitor.simulateReading(ctx(), 'dp-ger-comb', '20');
    expect(r2.triggered).toHaveLength(0);
    // Comunicação do dispositivo é independente da condição do ativo.
    expect(store.getSnapshot().assets.find((a) => a.id === 'a-ger002')!.condition).toBe('normal');
    const detail = await services.monitor.getPoint(ctx(), 'dp-ger-comb');
    expect(detail.history.length).toBeGreaterThan(20);
    expect(detail.activeAlerts).toHaveLength(1);
  });

  it('alerta de ativo do qual depende sistema de segurança chega ao Security Hub', async () => {
    const { services, ctx } = setup('u-admin');
    // GER-002 alimenta CTA-PORT-03 (controle de acesso) → contexto de segurança.
    const { triggered } = await services.monitor.simulateReading(ctx(), 'dp-ger-comb', 10);
    expect(triggered[0]?.securityContext).toMatch(/CTA-PORT-03/);
    const hub = await services.hub.listEvents(ctx(), {});
    expect(hub.items.some((i) => i.event.id === triggered[0]!.id)).toBe(true);
  });

  it('criar regra avalia o valor atual; desativar exige motivo; alerta técnico é reconhecido no Monitor', async () => {
    const { services, ctx } = setup('u-admin');
    const { triggered } = await services.monitor.createRule(ctx(), { name: 'CPU do switch acima de 10%', pointId: 'dp-sw-cpu', operator: 'maior', threshold: 10, severity: 'baixa' }, 'Teste de regra');
    expect(triggered).toHaveLength(1);
    await expect(services.monitor.setRuleActive(ctx(), 'rule-ger-comb', false, '')).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(services.monitor.createRule(ctx(), { name: 'Inválida', pointId: 'dp-sw-cpu', operator: 'maior', threshold: 'alto', severity: 'baixa' }, 'Teste')).rejects.toMatchObject({ code: 'VALIDATION' });
    const alerts = await services.monitor.listAlerts(ctx(), { status: 'ativo' });
    const item = alerts.items.find((i) => i.event.id === triggered[0]!.id)!;
    expect(item.canAcknowledge).toBe(true);
    await services.events.acknowledge(ctx(), item.event.id);
    const local = services.session.resolveAccessContext('u-local')!;
    const localAlerts = await services.monitor.listAlerts(local, {});
    expect(localAlerts.items.every((i) => !i.canAcknowledge || i.securityRelevant)).toBe(true);
  });

  it('coleta pausada: leitura simulada recusada com conector desativado', async () => {
    const { services, ctx } = setup('u-admin');
    await services.monitor.setConnectorActive(ctx(), 'conn-modbus-joi', false, 'Troca do agente');
    await expect(services.monitor.simulateReading(ctx(), 'dp-ger-comb', 50)).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('escopo: Gestor Local não vê conectores, pontos nem histórico de Curitiba; Monitor não contratado bloqueia', async () => {
    const { services, ctx } = setup('u-local');
    expect((await services.monitor.listConnectors(ctx())).every((c) => c.connector.unitLocationId === 'loc-joi')).toBe(true);
    expect((await services.monitor.listPoints(ctx(), { pageSize: 100 })).items.some((p) => p.point.id === 'dp-cfr-temp')).toBe(false);
    await expect(services.monitor.getPoint(ctx(), 'dp-cfr-temp')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await services.demo.setContract('operacional');
    await expect(services.monitor.overview(ctx())).rejects.toMatchObject({ code: 'NOT_CONTRACTED' });
    expect((await services.discovery.pending(ctx())).every((i) => i.kind === 'dispositivo')).toBe(true);
  });
});
