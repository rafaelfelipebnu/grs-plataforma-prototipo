import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('Manutenção — telas', () => {
  it('técnico executa pela visão móvel: inicia e conclui a execução com evidência simulada', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/manutencao/minhas-os', userId: 'u-tec' });
    await user.click(await screen.findByRole('link', { name: /OS-0001/ }));
    await user.click(await screen.findByRole('button', { name: 'Iniciar execução' }));
    await user.click(await screen.findByRole('button', { name: 'Concluir execução' }));
    const dialog = screen.getByRole('dialog', { name: 'Concluir execução' });
    await user.type(within(dialog).getByLabelText(/Trabalho realizado/), 'Carga de gás verificada e filtro limpo.');
    await user.click(within(dialog).getByRole('button', { name: '+ Adicionar foto' }));
    await user.click(within(dialog).getByRole('button', { name: 'Concluir execução' }));
    expect(await screen.findByRole('button', { name: /enviar para encerramento/ })).toBeInTheDocument();
    expect(screen.getByText('foto-os-0001-1.jpg')).toBeInTheDocument();
  });

  it('gestor tria e converte a solicitação em OS a partir do detalhe', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/manutencao/solicitacoes/sol-001', userId: 'u-man' });
    await user.click(await screen.findByRole('button', { name: 'Assumir triagem' }));
    await user.click(await screen.findByRole('button', { name: 'Converter em OS' }));
    const dialog = screen.getByRole('dialog', { name: 'Converter em ordem de serviço' });
    await user.click(within(dialog).getByRole('button', { name: 'Criar OS' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/manutencao\/os\//));
    expect(await screen.findByRole('button', { name: 'Planejar' })).toBeInTheDocument();
  });

  it('painel 360º do ativo lista as OS e permite abrir solicitação com o ativo preenchido', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/central/ativos/a-ger002?aba=operacao', userId: 'u-seg' });
    expect(await screen.findByText(/OS-0002/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir solicitação' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/manutencao/solicitacoes/nova'));
    expect(await screen.findByText(/Aberta a partir do painel 360º do ativo/)).toBeInTheDocument();
  });
});
