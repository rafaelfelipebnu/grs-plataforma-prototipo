import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('entrada e shell', () => {
  it('sem sessão, redireciona para a escolha de perfil; ao entrar abre o Security Hub', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/' });
    expect(await screen.findByRole('heading', { name: 'Escolha um perfil para entrar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Helena Duarte/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/security-hub'));
    expect(screen.getByRole('heading', { level: 1, name: 'Security Hub' })).toBeInTheDocument();
    expect(screen.getByText(/Ambiente de demonstração/)).toBeInTheDocument();
  });

  it('sidebar segue a ordem oficial e oculta módulos sem permissão do perfil', async () => {
    renderApp({ path: '/', userId: 'u-admin' });
    const menu = await screen.findByRole('complementary', { name: 'Menu principal' });
    const labels = within(within(menu).getByRole('navigation', { name: 'Módulos' }))
      .getAllByRole('link')
      .map((a) => a.textContent?.trim());
    expect(labels).toEqual([
      'Security Hub',
      'Central de Ativos e Ambientes',
      'Monitor de Infraestrutura',
      'Gestão de Rotinas',
      'Gestão de Manutenção',
      'Gestão de Ocorrências',
      'Gestão de Riscos',
    ]);
  });

  it('Operador de Rotinas vê apenas Gestão de Rotinas e cai nela ao entrar', async () => {
    const { router } = renderApp({ path: '/', userId: 'u-oper' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'));
    const menu = screen.getByRole('complementary', { name: 'Menu principal' });
    expect(within(menu).queryByText('Security Hub')).not.toBeInTheDocument();
    expect(within(menu).getByText('Gestão de Rotinas')).toBeInTheDocument();
  });

  it('acesso direto a módulo sem permissão mostra 403', async () => {
    renderApp({ path: '/riscos', userId: 'u-tec' });
    expect(await screen.findByText('403 - Acesso negado')).toBeInTheDocument();
  });
});

describe('módulos não contratados', () => {
  it('aparecem bloqueados com explicação de valor, sem dados operacionais', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    await act(() => bundle.services.demo.setContract('essencial'));
    const menu = screen.getByRole('complementary', { name: 'Menu principal' });
    await user.click(within(menu).getByRole('link', { name: /Monitor de Infraestrutura/ }));
    expect(await screen.findByText('Capacidade não contratada')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum dado operacional dele é exibido/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Falar com um consultor' }));
    expect(await screen.findByText('Interesse registrado')).toBeInTheDocument();
  });
});

describe('busca global e navegação contextual', () => {
  it('encontra o ativo, abre o registro e volta ao contexto anterior', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    const input = await screen.findByRole('combobox', { name: 'Busca global' });
    await user.type(input, 'BMB-014');
    const option = await screen.findByRole('option', { name: /BMB-014 · Bomba de recalque/ });
    await user.click(option);
    await waitFor(() => expect(router.state.location.pathname).toBe('/central/ativos/a-bmb014'));
    expect(await screen.findByRole('heading', { level: 1, name: /BMB-014/ })).toBeInTheDocument();
    expect(screen.getAllByText('Criticidade alta').length).toBeGreaterThan(0);

    // Navega para o sistema dependente (aba Relacionamentos) e volta pela pilha de contexto.
    await user.click(screen.getByRole('tab', { name: 'Relacionamentos' }));
    await user.click(await screen.findByRole('link', { name: 'SIS-INC-01' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/central/ativos/a-sisinc'));
    await user.click(await screen.findByRole('button', { name: /Voltar para BMB-014/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/central/ativos/a-bmb014'));
    await user.click(await screen.findByRole('button', { name: /Voltar para Security Hub/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/security-hub'));
  });

  it('Gestor Local não encontra dados fora do seu escopo', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/security-hub', userId: 'u-local' });
    await user.type(await screen.findByRole('combobox', { name: 'Busca global' }), 'Câmara fria');
    expect(await screen.findByText('Nenhum resultado encontrado para sua busca.')).toBeInTheDocument();
  });
});

describe('notificações e reconhecimento', () => {
  it('abrir a notificação marca como lida, mas o alerta só é reconhecido no módulo', async () => {
    const user = userEvent.setup();
    const { router, bundle } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    await user.click(await screen.findByRole('button', { name: /Notificações \(\d+ não lidas\)/ }));
    const panel = await screen.findByRole('dialog', { name: 'Notificações' });
    await user.click(within(panel).getByRole('button', { name: /Porta de emergência aberta — Linha Produtiva 1/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/security-hub/eventos/ev-002'));
    const db = bundle.store.getSnapshot();
    expect(db.notifications.find((n) => n.id === 'n-002')?.readByUserIds).toContain('u-seg');
    expect(db.events.find((e) => e.id === 'ev-002')?.status).toBe('ativo');

    await user.click(await screen.findByRole('button', { name: 'Reconhecer alerta' }));
    expect(await screen.findByText('Alerta reconhecido', { selector: '[class*="toastTitle"]' })).toBeInTheDocument();
    expect(bundle.store.getSnapshot().events.find((e) => e.id === 'ev-002')?.status).toBe('reconhecido');
  });

  it('notificação crítica nova aparece imediatamente (cenário A)', async () => {
    const { bundle } = renderApp({ path: '/security-hub', userId: 'u-seg' });
    await screen.findByRole('heading', { level: 1, name: 'Security Hub' });
    await act(() => bundle.services.demo.simulatePumpFailure());
    expect(await screen.findByText('Falha na bomba BMB-014')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir contexto' })).toBeInTheDocument();
  });
});

describe('localização contextual', () => {
  it('seleciona um local na árvore e reflete no cabeçalho e no módulo', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/manutencao', userId: 'u-local' });
    await user.click(await screen.findByRole('button', { name: /Localização/ }));
    const dialog = screen.getByRole('dialog', { name: 'Selecionar localização contextual' });
    // Escopo de Joinville: Curitiba não aparece.
    expect(within(dialog).queryByText('Unidade Curitiba – Centro de Distribuição')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Filtrar localizações'), 'Casa');
    await user.click(within(dialog).getByRole('button', { name: /Casa de Bombas/ }));
    expect(screen.getByRole('button', { name: /Localização Casa de Bombas/ })).toBeInTheDocument();
    expect(screen.getByText(/Contexto de localização ativo/).textContent).toContain('Casa de Bombas');
  });
});
