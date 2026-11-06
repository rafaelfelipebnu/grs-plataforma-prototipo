import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

describe('Central — árvore e abas', () => {
  it('árvore respeita o escopo; selecionar local atualiza as abas e "somente este local" restringe', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/central?aba=ativos', userId: 'u-local' });
    const tree = await screen.findByRole('tree', { name: 'Locais' });
    expect(within(tree).queryByText(/Curitiba/)).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Ativos (11)' })).toBeInTheDocument();

    await user.click(within(tree).getByRole('button', { name: /^Prédio Industrial/ }));
    await waitFor(() => expect(router.state.location.search).toContain('local=loc-joi-ind'));
    expect(await screen.findByRole('heading', { name: /Ativos \(\d+\)/ })).not.toHaveTextContent('Ativos (11)');

    await user.click(screen.getByRole('button', { name: 'Somente este local' }));
    expect(await screen.findByText('Nenhum ativo cadastrado neste local.')).toBeInTheDocument();
  });

  it('local antigo (/central/locais/:id) redireciona para a visão por local', async () => {
    const { router } = renderApp({ path: '/central/locais/loc-joi-ext', userId: 'u-admin' });
    await waitFor(() => expect(router.state.location.search).toBe('?local=loc-joi-ext'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Área Externa' })).toBeInTheDocument();
  });

  it('telemetria sem Monitor contratado explica o valor sem exibir dados', async () => {
    const { bundle } = renderApp({ path: '/central?aba=telemetria', userId: 'u-admin' });
    await act(() => bundle.services.demo.setContract('essencial'));
    expect(await screen.findByText('Telemetria disponível com o Monitor de Infraestrutura')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Pontos de dado' })).not.toBeInTheDocument();
  });
});

describe('Central — cadastro de ativo', () => {
  it('bloqueia tag duplicada, cadastra ativo válido e o exibe no painel 360º', async () => {
    const user = userEvent.setup();
    const { router, bundle } = renderApp({ path: '/central/ativos/novo', userId: 'u-admin' });
    await user.type(await screen.findByRole('textbox', { name: /^Tag/ }), 'GER-002');
    expect(await screen.findByText('Esta tag já está cadastrada')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cadastrar ativo' }));
    expect(await screen.findByText(/Tag já usada por GER-002/)).toBeInTheDocument();

    const tag = screen.getByRole('textbox', { name: /^Tag/ });
    await user.clear(tag);
    await user.type(tag, 'BMB-099');
    await user.type(screen.getByRole('textbox', { name: /^Nome/ }), 'Bomba jockey de demonstração');
    await user.selectOptions(screen.getByRole('combobox', { name: /^Classificação/ }), 'cls-bomba');
    await user.selectOptions(screen.getByRole('combobox', { name: /^Localização principal/ }), 'loc-joi-bombas');
    await user.click(screen.getByRole('button', { name: 'Cadastrar ativo' }));

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/central\/ativos\/a-/));
    expect(await screen.findByRole('heading', { level: 1, name: /BMB-099 · Bomba jockey/ })).toBeInTheDocument();
    expect(screen.getByText('Ativo cadastrado')).toBeInTheDocument();
    expect(bundle.store.getSnapshot().assets.some((a) => a.tag === 'BMB-099')).toBe(true);
  });

  it('abrir o cadastro existente conta uma duplicidade evitada', async () => {
    const user = userEvent.setup();
    const { router, bundle } = renderApp({ path: '/central/ativos/novo', userId: 'u-admin' });
    await user.type(await screen.findByRole('textbox', { name: /^Tag/ }), 'CHL-001');
    await user.click(await screen.findByRole('button', { name: 'Abrir cadastro existente' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/central/ativos/a-chl001'));
    expect(bundle.store.getSnapshot().centralStats.duplicatesAvoided).toBe(1);
  });

  it('alterar condição exige motivo e atualiza o cabeçalho sem mudar a criticidade', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/central/ativos/a-ger002', userId: 'u-local' });
    await user.click(await screen.findByRole('button', { name: 'Alterar condição' }));
    const dialog = await screen.findByRole('dialog', { name: 'ALTERAR CONDIÇÃO OPERACIONAL' }).catch(() => screen.findByRole('dialog'));
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /Nova condição/ }), 'indisponivel');
    await user.click(within(dialog).getByRole('button', { name: 'Alterar condição' }));
    expect(await within(dialog).findByText(/mínimo de 5 caracteres/)).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox', { name: /Motivo/ }), 'Manutenção corretiva');
    await user.click(within(dialog).getByRole('button', { name: 'Alterar condição' }));
    expect(await screen.findByText('Condição alterada')).toBeInTheDocument();
    expect(screen.getAllByText('Indisponível').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Criticidade alta').length).toBeGreaterThan(0);
  });

  it('Gestor de Segurança consulta o painel 360º sem ações de cadastro; aba Riscos sem contratação explica valor', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/central/ativos/a-bmb014', userId: 'u-seg' });
    expect(await screen.findByRole('heading', { level: 1, name: /BMB-014/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar cadastro' })).not.toBeInTheDocument();
    await act(() => bundle.services.demo.setContract('operacional'));
    await user.click(await screen.findByRole('tab', { name: 'Riscos' }));
    expect(await screen.findByText('Gestão de Riscos não contratada')).toBeInTheDocument();
  });
});

describe('Central — importação', () => {
  it('analisa o exemplo, mostra duplicidade e erro e importa somente as linhas válidas', async () => {
    const user = userEvent.setup();
    const { bundle } = renderApp({ path: '/central/ativos/importar', userId: 'u-admin' });
    await user.click(await screen.findByRole('button', { name: 'Usar exemplo' }));
    await user.click(screen.getByRole('button', { name: 'Analisar arquivo' }));
    const table = await screen.findByRole('table', { name: 'Prévia da importação' });
    expect(within(table).getByText('Duplicidade')).toBeInTheDocument();
    expect(within(table).getByText(/Local "LOCAL-INEXISTENTE" não encontrado/)).toBeInTheDocument();
    const before = bundle.store.getSnapshot().assets.length;
    await user.click(screen.getByRole('button', { name: /Importar \d+ ativo/ }));
    expect(await screen.findByText('Resultado da importação'.toUpperCase()).catch(() => screen.findByText('Resultado da importação'))).toBeInTheDocument();
    expect(bundle.store.getSnapshot().assets.length).toBeGreaterThan(before);
    expect(bundle.store.getSnapshot().assets.some((a) => a.tag === 'GER-002' && a.id !== 'a-ger002')).toBe(false);
  });
});

describe('Central — grupos', () => {
  it('gestor local cria exceção em ativo incluído por regra e ela aparece com o conflito sinalizado', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/central/grupos/g-incendio', userId: 'u-local' });
    expect(await screen.findByText(/Regras e consumidores deste grupo são definidos pelo corporativo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar regras e configuração' })).not.toBeInTheDocument();

    const members = await screen.findByRole('table', { name: 'Ativos associados ao grupo' });
    const row = within(members).getByRole('link', { name: 'EXT-IND-12' }).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Criar exceção' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: /Motivo/ }), 'Extintor retirado para recarga');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Exceção criada')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Exceções/ }));
    const exceptions = await screen.findByRole('table', { name: 'Exceções do grupo' });
    expect(within(exceptions).getByText('EXT-IND-12')).toBeInTheDocument();
    expect(within(exceptions).getByText(/Conflita com/)).toBeInTheDocument();
  });

  it('corporativo altera regra vendo a prévia dos ativos afetados antes de salvar', async () => {
    const user = userEvent.setup();
    const { router } = renderApp({ path: '/central/grupos/g-energia/editar', userId: 'u-admin' });
    expect(await screen.findByText(/Após salvar, o grupo terá/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Alta' }));
    expect(await screen.findByRole('link', { name: 'QD-ADM-01' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: /Motivo/ }), 'Incluir todos os quadros elétricos');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar configuração' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/central/grupos/g-energia'));
    const members = await screen.findByRole('table', { name: 'Ativos associados ao grupo' });
    expect(within(members).getByRole('link', { name: 'QD-ADM-01' })).toBeInTheDocument();
  });
});
