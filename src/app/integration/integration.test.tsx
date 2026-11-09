import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('rastreabilidade do evento (tela)', () => {
  it('solicitação aberta a partir do evento preserva a origem e passa a constar no evento', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/security-hub/eventos/ev-004', userId: 'u-seg' });
    const originated = await screen.findByRole('heading', { name: /Registros originados deste evento/ });
    const panel = originated.closest('section') ?? document.body;
    expect(await within(panel as HTMLElement).findByText(/Nenhuma ocorrência ou solicitação foi criada/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir solicitação de manutenção' }));
    expect(await screen.findByText(/Aberta a partir do evento/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveValue('Câmera CAM-EST-03 sem sinal');
    expect(screen.getByRole('button', { name: /Voltar para/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir solicitação' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/manutencao\/solicitacoes\/sol-/));
    expect(await screen.findByRole('link', { name: 'Evento de origem' })).toBeInTheDocument();
    const code = (await screen.findByRole('heading', { level: 1 })).textContent?.match(/SOL-\d+/)?.[0];

    await router.navigate('/security-hub/eventos/ev-004');
    expect(await screen.findByRole('link', { name: code! })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Registros originados deste evento \(1\)/ })).toBeInTheDocument();
  });

  it('mostra registros em aberto do ativo como alerta, sem bloquear novos encaminhamentos', async () => {
    renderApp({ path: '/security-hub/eventos/ev-005', userId: 'u-seg' });
    const notice = await screen.findByText(/Registros em aberto para CHL-001/);
    const alert = notice.closest('[role="alert"], [role="status"], div') as HTMLElement;
    expect(await within(alert.parentElement ?? alert).findByText(/SOL-0003/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar ocorrência' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Abrir solicitação de manutenção' })).toBeEnabled();
  });
});
