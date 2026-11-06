import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('Gestão de Rotinas — telas', () => {
  it('operador executa a ronda pelo app: local, QR Code, checklist e finalização', async () => {
    const user = userEvent.setup();
    const { router, bundle } = renderApp({ path: '/rotinas/app', userId: 'u-oper' });
    await user.selectOptions(await screen.findByLabelText('Plano de rotina'), 'rp-001');
    await user.click(await screen.findByRole('button', { name: /EX-0001/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas/app/re-001'));
    await user.click(await screen.findByRole('button', { name: /Portão de veículos/ }));
    await user.click(screen.getByRole('button', { name: 'Ler QR Code (simulado)' }));
    const conformes = await screen.findAllByRole('button', { name: 'Conforme' });
    await user.click(conformes[0]!);
    await user.click(conformes[1]!);
    await user.type(screen.getByLabelText('Resposta'), 'Sem novidades.');
    await user.click(screen.getByRole('button', { name: 'Concluir checklist do ponto' }));
    await user.click(await screen.findByRole('button', { name: 'Finalizar rotina' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas/app'));
    expect(bundle.store.getSnapshot().routineExecutions.find((e) => e.id === 're-001')?.status).toBe('concluida');
  });

  it('ocorrência que exige reinspeção mostra o pedido aguardando programação em Rotinas', async () => {
    renderApp({ path: '/ocorrencias/oc-009', userId: 'u-seg' });
    const panel = await screen.findByRole('region', { name: /Reinspeção/ });
    expect(within(panel).getByText('Aguardando programação')).toBeInTheDocument();
    expect(screen.getByText(/Reinspeção OK \(reinspeção solicitada aguardando resultado\)/)).toBeInTheDocument();
  });
});
