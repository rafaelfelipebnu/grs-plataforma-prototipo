import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('Ocorrências — telas', () => {
  it('registra a partir do evento do Security Hub (origem preservada) e o 1º trâmite leva a Em andamento', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/security-hub/eventos/ev-002', userId: 'u-seg' });
    await user.click(await screen.findByRole('button', { name: 'Registrar ocorrência' }));
    expect(await screen.findByText(/Registrada a partir do evento/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Tipo de ocorrência/), 'tp-acesso');
    expect(screen.getByLabelText(/^Prioridade/)).toHaveValue('alta');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/ocorrencias\/oc-/));
    expect(await screen.findByText('Evento do Security Hub')).toBeInTheDocument();
    expect(screen.getAllByText('Sem tratamento').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('Novo trâmite'), 'Porta fechada e inspecionada pela vigilância.');
    await user.click(screen.getByRole('button', { name: 'Registrar trâmite' }));
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument();
    expect(screen.getAllByText('Em andamento').length).toBeGreaterThan(0);
  });

  it('conclusão em lote informa as ocorrências mantidas abertas com o motivo', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/ocorrencias/consulta?status=abertas', userId: 'u-local' });
    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar OC-0004' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar OC-0002' }));
    await user.click(screen.getByRole('button', { name: 'Concluir ocorrência(s)' }));
    const confirm = screen.getByRole('dialog', { name: 'Concluir ocorrência(s)' });
    await user.click(within(confirm).getByRole('button', { name: 'Concluir' }));
    const result = await screen.findByRole('dialog', { name: 'Conclusão em lote' });
    expect(within(result).getByText(/em pausa: retome antes de concluir/)).toBeInTheDocument();
    expect(within(result).getByText(/o tipo exige evidência/)).toBeInTheDocument();
  });

  it('painel agrupa pendentes por prioridade; o resumo do widget do Hub prioriza a crítica; tipos são consultáveis', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/ocorrencias', userId: 'u-seg' });
    expect(await screen.findByRole('region', { name: 'Críticas' })).toHaveTextContent('OC-0003');
    const summary = await bundle.services.occurrences.hubSummary(bundle.services.session.resolveAccessContext('u-seg')!, {});
    expect(summary.open[0]?.occurrence.code).toBe('OC-0003');
    await user.click(screen.getByRole('tab', { name: 'Tipos de ocorrência' }));
    expect(await screen.findByText('Falha em equipamento de segurança')).toBeInTheDocument();
  });
});
