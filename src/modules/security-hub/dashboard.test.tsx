import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';
import { createWidget, moveWidget, shiftWidget } from './layoutOps';

const widget = (name: string) => screen.findByRole('article', { name });

describe('dashboard do Security Hub', () => {
  it('exibe as áreas e os widgets do padrão do cliente', async () => {
    renderApp({ path: '/security-hub', userId: 'u-seg' });
    expect(await screen.findByText('Painel padrão do cliente')).toBeInTheDocument();
    for (const area of ['Resumo de segurança', 'Eventos em destaque', 'Mapa operacional', 'Ações pendentes']) {
      expect(screen.getByRole('heading', { level: 2, name: area })).toBeInTheDocument();
    }
    const indicators = await widget('Indicadores gerais de segurança');
    expect(await within(indicators).findByText('Críticos ativos')).toBeInTheDocument();
  });

  it('drill-down do indicador abre a lista filtrada e permite voltar', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    const indicators = await widget('Indicadores gerais de segurança');
    await user.click(await within(indicators).findByText('Críticos ativos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/security-hub/eventos'));
    expect(router.state.location.search).toContain('severidade=critica');
    expect(await screen.findByText('Alarme de intrusão — Docas de Expedição')).toBeInTheDocument();
    expect(screen.queryByText('Porta de emergência aberta — Linha Produtiva 1')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Voltar para Security Hub/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/security-hub'));
  });

  it('reconhece alerta direto do widget de ações pendentes', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    const actions = await widget('Ações pendentes');
    await within(actions).findByText(/Reconhecer: Porta de emergência aberta/);
    const row = within(actions).getByText(/Reconhecer: Porta de emergência aberta/).closest('li')!;
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Reconhecer' }));
    await waitFor(() => expect(bundle.store.getSnapshot().events.find((e) => e.id === 'ev-002')?.status).toBe('reconhecido'));
    await waitFor(() => expect(within(actions).queryByText(/Reconhecer: Porta de emergência aberta/)).not.toBeInTheDocument());
  });

  it('personaliza: adiciona widget do catálogo, salva e passa a usar o painel pessoal', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    await user.click(await screen.findByRole('button', { name: 'Personalizar painel' }));
    expect(screen.getByText('Editando meu painel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Adicionar widget' }));
    const catalog = screen.getByRole('dialog', { name: 'Adicionar widget' });
    await user.click(within(catalog).getByRole('button', { name: 'Adicionar Histórico de eventos relevantes' }));
    await user.keyboard('{Escape}');

    expect(await widget('Histórico de eventos relevantes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Seu painel foi salvo')).toBeInTheDocument();
    expect(screen.getByText(/Meu painel personalizado/)).toBeInTheDocument();
    expect(bundle.store.getSnapshot().dashboards.personal['u-seg']?.widgets.some((w) => w.type === 'historico-eventos')).toBe(true);
  });

  it('remove widget e cancelar descarta as alterações após confirmação', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/security-hub', userId: 'u-seg' });
    await user.click(await screen.findByRole('button', { name: 'Personalizar painel' }));
    await user.click(screen.getByRole('button', { name: 'Remover Câmeras em destaque' }));
    expect(screen.queryByRole('article', { name: 'Câmeras em destaque' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(await widget('Câmeras em destaque')).toBeInTheDocument();
    expect(screen.queryByText('Editando meu painel')).not.toBeInTheDocument();
  });

  it('avisa ao sair com alterações não salvas', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    await user.click(await screen.findByRole('button', { name: 'Personalizar painel' }));
    await user.click(screen.getByRole('button', { name: 'Remover Câmeras em destaque' }));
    const menu = screen.getByRole('complementary', { name: 'Menu principal' });
    await user.click(within(menu).getByRole('link', { name: /Central de Ativos/ }));
    expect(await screen.findByText(/alterações não salvas no painel/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(router.state.location.pathname).toBe('/security-hub');
  });

  it('configuração do widget valida a quantidade', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/security-hub', userId: 'u-seg' });
    await user.click(await screen.findByRole('button', { name: 'Personalizar painel' }));
    await user.click(screen.getByRole('button', { name: 'Configurar Eventos e alertas' }));
    const field = screen.getByLabelText(/Quantidade de itens/);
    await user.clear(field);
    await user.type(field, '50');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(await screen.findByText('Informe um número inteiro entre 1 e 20.')).toBeInTheDocument();
  });

  it('somente o administrador vê "Editar padrão do cliente"', async () => {
    renderApp({ path: '/security-hub', userId: 'u-seg' });
    await screen.findByRole('button', { name: 'Personalizar painel' });
    expect(screen.queryByRole('button', { name: 'Editar padrão do cliente' })).not.toBeInTheDocument();
  });

  it('widget de módulo não contratado aparece bloqueado; de módulo futuro, sinaliza a etapa', async () => {
    const { bundle } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    const ctx = bundle.services.session.resolveAccessContext('u-seg')!;
    await act(async () => {
      await bundle.services.dashboards.saveMine(ctx, [createWidget('saude-infraestrutura'), createWidget('inspecoes-rotinas-pendentes')]);
      await bundle.services.demo.setContract('operacional');
    });
    const health = await widget('Saúde da infraestrutura');
    expect(within(health).getByText('Monitor de Infraestrutura não contratado')).toBeInTheDocument();
    const routines = await widget('Inspeções e rotinas pendentes');
    expect(within(routines).getByText('Disponível na etapa 5')).toBeInTheDocument();
  });
});

describe('lista de eventos', () => {
  it('reconhece alertas selecionados em lote', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/security-hub/eventos?status=ativo', userId: 'u-seg' });
    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar EVT-2026-0415' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar EVT-2026-0412' }));
    await user.click(screen.getByRole('button', { name: /Reconhecer selecionados \(2\)/ }));
    expect(await screen.findByText('2 alertas reconhecidos')).toBeInTheDocument();
    const db = bundle.store.getSnapshot();
    expect(db.events.filter((e) => ['ev-001', 'ev-002'].includes(e.id)).every((e) => e.status === 'reconhecido')).toBe(true);
  });
});

describe('operações de layout', () => {
  const list = [createWidget('eventos-alertas', 'destaque'), createWidget('alarmes-ativos', 'destaque'), createWidget('mapa-operacional', 'mapa')];

  it('move widget para outra área na posição indicada', () => {
    const moved = moveWidget(list, list[2]!.id, 'destaque', 0);
    expect(moved.filter((w) => w.area === 'destaque').map((w) => w.type)).toEqual(['mapa-operacional', 'eventos-alertas', 'alarmes-ativos']);
  });

  it('desloca widget dentro da área', () => {
    const shifted = shiftWidget(list, list[0]!.id, 1);
    expect(shifted.filter((w) => w.area === 'destaque').map((w) => w.type)).toEqual(['alarmes-ativos', 'eventos-alertas']);
    expect(shiftWidget(list, list[0]!.id, -1)).toBe(list);
  });
});
