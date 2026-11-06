import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('Cenário C — descoberta com revisão humana', () => {
  it('descobre no Monitor (sem criar nada) e aprova na Central associando ao ativo sugerido', async () => {
    const user = userEvent.setup();
    const { router, bundle } = renderApp({ path: '/monitor/conectores', userId: 'u-admin' });
    const devicesBefore = bundle.store.getSnapshot().devices.length;

    const table = await screen.findByRole('table', { name: 'Conectores' });
    const row = within(table).getByText('Agente GRS Joinville · Modbus TCP').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Descobrir' }));
    expect(await screen.findByText('1 novo(s) dispositivo(s) descoberto(s)')).toBeInTheDocument();
    expect(bundle.store.getSnapshot().devices.length).toBe(devicesBefore);

    await user.click(screen.getByRole('tab', { name: 'Descoberta' }));
    expect(await screen.findByText('Multimedidor QGBT Administrativo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revisar na Central' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/central/descobertas'));

    const card = (await screen.findByRole('heading', { name: 'Multimedidor QGBT Administrativo' })).closest('section')!;
    expect(within(card).getByText(/Correspondência: QD-ADM-01/)).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Revisar e aprovar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /sugerido: QD-ADM-01/ })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }));
    expect(await within(dialog).findByText(/motivo da aprovação/)).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox', { name: /Motivo da aprovação/ }), 'Conferido em campo');
    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByText('Dispositivo aprovado e incorporado')).toBeInTheDocument();

    const device = bundle.store.getSnapshot().devices.find((d) => d.address === '10.20.1.41 · unidade 7')!;
    expect(device).toMatchObject({ assetId: 'a-qdadm', locationStatus: 'confirmada' });
    expect(screen.queryByRole('heading', { name: 'Multimedidor QGBT Administrativo' })).not.toBeInTheDocument();
  });

  it('Gestor Local confirma a localização sugerida de um dispositivo existente', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/central/descobertas', userId: 'u-local' });
    const card = (await screen.findByRole('heading', { name: 'Sensor de nível LT-RES-01' })).closest('section')!;
    await user.click(within(card).getByRole('button', { name: 'Revisar e aprovar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('combobox', { name: /Localização física confirmada/ })).toHaveValue('loc-joi-reservatorio');
    await user.type(within(dialog).getByRole('textbox', { name: /Motivo da aprovação/ }), 'Sensor conferido');
    await user.click(within(dialog).getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByText('Localização confirmada')).toBeInTheDocument();
    expect(bundle.store.getSnapshot().devices.find((d) => d.id === 'd-nivres')!.locationStatus).toBe('confirmada');
  });

  it('Gestor de Segurança consulta a fila mas não aprova', async () => {
    renderApp({ path: '/central/descobertas', userId: 'u-seg' });
    expect(await screen.findByText(/não aprová-los/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar e aprovar' })).not.toBeInTheDocument();
  });
});

describe('Monitor — telemetria e regras', () => {
  it('leitura simulada viola regra, gera alerta técnico e atualiza o ponto', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/monitor/pontos/dp-ger-comb', userId: 'u-admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Nível de combustível' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Histórico das últimas leituras/ })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Novo valor/ }), '18');
    await user.click(screen.getByRole('button', { name: 'Enviar leitura simulada' }));
    expect(await screen.findByText('Leitura simulada recebida')).toBeInTheDocument();
    expect(await screen.findByText('Alertas ativos deste ponto'.toUpperCase()).catch(() => screen.findByText('Alertas ativos deste ponto'))).toBeInTheDocument();
    expect(screen.getAllByText('18 %').length).toBeGreaterThan(0);
  });

  it('cria regra com motivo; o valor atual já violado gera alerta', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/monitor/regras', userId: 'u-admin' });
    await user.click(await screen.findByRole('button', { name: 'Nova regra' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: /^Nome/ }), 'CPU do switch acima de 20%');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /Ponto de dado/ }), 'dp-sw-cpu');
    await user.type(within(dialog).getByRole('textbox', { name: /Limite/ }), '20');
    await user.type(within(dialog).getByRole('textbox', { name: /Motivo/ }), 'Acompanhar carga da rede');
    await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));
    expect(await screen.findByText(/O valor atual já viola a regra/)).toBeInTheDocument();
    expect(bundle.store.getSnapshot().events.some((e) => e.title.startsWith('CPU do switch acima de 20%'))).toBe(true);
  });

  it('Gestor Local consulta o Monitor sem ações de configuração', async () => {
    renderApp({ path: '/monitor/conectores', userId: 'u-local' });
    expect(await screen.findByText(/não configurá-los nem executar descobertas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descobrir' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Curitiba/)).not.toBeInTheDocument();
  });

  it('Monitor não contratado aparece bloqueado com explicação de valor', async () => {
    const { bundle } = renderApp({ path: '/monitor', userId: 'u-admin' });
    await act(() => bundle.services.demo.setContract('operacional'));
    expect(await screen.findByText('Capacidade não contratada')).toBeInTheDocument();
  });
});
