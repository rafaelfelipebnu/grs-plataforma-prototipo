import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('Planos de ação — telas', () => {
  it('responsável decide a dependência cancelada pela tela do plano', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/planos', userId: 'u-local' });
    await user.click(await screen.findByRole('link', { name: 'PA-0001' }));
    expect(await screen.findByText('Dependência cancelada — decisão necessária')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Decidir dependência' }));
    const dialog = screen.getByRole('dialog', { name: /Dependência cancelada/ });
    await user.type(within(dialog).getByLabelText(/Justificativa/), 'Placas atuais serão reaproveitadas.');
    await user.click(within(dialog).getByRole('button', { name: 'Remover dependência' }));
    await waitFor(() => expect(screen.queryByText('Dependência cancelada — decisão necessária')).not.toBeInTheDocument());
    expect(screen.getAllByText(/Dependência de A3 \(cancelada\) removida/).length).toBeGreaterThan(0);
  });

  it('ocorrência mostra a exigência de plano e permite criar plano vinculado', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/ocorrencias/oc-008', userId: 'u-seg' });
    expect(await screen.findByText(/Planos de ação concluídos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PA-0001' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar plano' }));
    await waitFor(() => expect(router.state.location.search).toBe('?ocorrencia=oc-008'));
    expect(await screen.findByText(/Plano vinculado à ocorrência/)).toBeInTheDocument();
  });

  it('menu mostra Planos de ação como capacidade compartilhada, fora da lista de módulos', async () => {
    renderApp({ path: '/', userId: 'u-tec' });
    const shared = await screen.findByRole('navigation', { name: 'Capacidades compartilhadas' });
    expect(within(shared).getByRole('link', { name: 'Planos de ação' })).toBeInTheDocument();
  });
});
