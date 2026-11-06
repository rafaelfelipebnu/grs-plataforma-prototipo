# Instruções do projeto — GRS

## Missão

Desenvolva um protótipo web de alta fidelidade para a plataforma GRS, orientado à validação com clientes. O protótipo deve permitir navegar, pesquisar, filtrar, cadastrar/editar dados simulados, executar ações e percorrer jornadas integradas. Não entregue apenas telas estáticas.

## Leia antes de implementar

1. `README.md`
2. `docs/00-visao-geral-e-decisoes.md`
3. Documento do módulo que estiver implementando.
4. `docs/08-jornadas-e-cenarios-de-validacao.md`
5. `docs/09-prototipo-requisitos-tecnicos.md`

## Regras inegociáveis

- Não reabra decisões marcadas como consolidadas sem solicitação explícita do usuário.
- Não invente regras de negócio para preencher lacunas. Registre dúvidas em `docs/decisoes-evolucao.md` e use o comportamento provisório mais simples e reversível.
- Não reduza o produto a um dashboard genérico de operações. Security Hub continua centrado em segurança.
- Não duplique cadastros mestres de ativos ou locais em módulos diferentes.
- Cada módulo especialista mantém a propriedade de seus dados e regras. A experiência integrada consulta e orquestra; não absorve a lógica especialista.
- Gestão de Rotinas é produto existente: preserve seus conceitos e fluxos conhecidos. Não redesenhe por preferência estética.
- Separar Solicitação, Ordem de Serviço e Execução.
- Separar ocorrência, plano de ação, execução e eficácia. Concluir uma ação não significa resolver a ocorrência.
- Não confundir criticidade intrínseca do ativo com impacto operacional.
- Descoberta de dispositivo não confirma automaticamente sua localização física nem cria/associa ativos sem aprovação humana.
- Compartilhamento de grupos não deve disparar ações automaticamente: cada módulo precisa de configuração explícita.
- Permissões e escopo organizacional/local devem ser respeitados em listas, detalhes, indicadores, pesquisas e ações.
- Toda ação simulada importante deve gerar feedback visível e atualizar o estado local da interface.
- Use dados fictícios claramente identificáveis como demonstração.
- Nunca inserir segredos, tokens, senhas ou chaves no repositório.

## Princípios de implementação

- Uma aplicação única, evolutiva e coerente; não vários protótipos independentes.
- Desktop-first, responsiva; incluir experiência móvel específica para execução de rotinas e experiência móvel demonstrativa para execução de OS (online, na mesma aplicação — D-013; arquitetura mobile, app nativo e offline de OS seguem em aberto).
- Componentes reutilizáveis, tipagem explícita e dados de demonstração centralizados.
- Persistência simulada local, com camada de serviço separada dos componentes para futura substituição por APIs.
- Navegação real entre telas; links, botões, filtros, formulários, abas, modais e ações devem funcionar.
- Mostrar estados vazios, carregamento simulado, sucesso, erro/validação e permissões quando relevantes.
- Não criar funcionalidades só para “encher” a tela.
- Priorizar clareza, densidade informacional útil e consistência visual.
- Registrar decisões novas em `docs/decisoes-evolucao.md`.

## Stack inicial recomendada

- React + TypeScript.
- Vite.
- React Router.
- CSS modular ou solução consistente equivalente.
- Biblioteca de ícones consistente.
- Dados mockados em TypeScript/JSON e serviços mock com interfaces.
- Testes de componentes/jornadas para fluxos críticos.

A stack pode ser ajustada por decisão técnica justificada, sem alterar as regras de produto.

## Ordem de construção

1. Fundação visual, shell, navegação, permissões demonstrativas e dados base.
2. Security Hub e dashboard configurável.
3. Central de Ativos e Ambientes.
4. Dispositivos, descoberta e telemetria simuladas.
5. Gestão de Rotinas, Manutenção e Ocorrências.
6. Gestão de Riscos e cenários integrados.
7. Polimento, responsividade, acessibilidade e roteiro de validação.

## Critério de pronto por funcionalidade

Uma funcionalidade só está pronta quando:
- há entrada de navegação clara;
- a tela apresenta os campos e estados relevantes definidos no contexto;
- ações principais funcionam com dados simulados;
- validações e feedback estão presentes;
- dados atualizados aparecem nas telas relacionadas;
- permissões/escopo são considerados quando aplicável;
- não contradiz os limites de domínio;
- há ao menos um teste ou roteiro manual verificável para o fluxo crítico.

## Não fazer

- Não conectar equipamentos reais ou serviços produtivos neste protótipo.
- Não afirmar que uma integração real existe quando é simulada.
- Não criar workflow visual genérico para processos.
- Não transformar o protótipo em um ERP, BMS ou CMMS completo.
- Não ocultar módulos não contratados como se não existissem: quando fizer sentido comercial, mostrar capacidade bloqueada com explicação, sem expor dados operacionais.
