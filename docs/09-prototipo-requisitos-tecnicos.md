# 09 — Requisitos do protótipo e diretrizes técnicas

## Objetivo do protótipo

Validar conceito, navegação, jornadas, campos e proposta de valor com clientes. Deve parecer um produto real, mesmo que backend, integrações, dados e dispositivos sejam simulados.

## Requisitos de experiência

- Uma aplicação única com navegação consistente.
- Telas completas, com listas, filtros, detalhes, formulários e configurações relevantes.
- Ações reais dentro do protótipo: criar, editar, atribuir, mudar status, aprovar, reconhecer, anexar evidência simulada, filtrar, pesquisar, navegar.
- Dados relacionados devem refletir as ações entre módulos.
- Feedback visível de sucesso, erro, validação e estado.
- Estados vazios e de demonstração.
- Desktop-first responsivo.
- Experiência móvel específica para execução de rotinas.
- Permissões e módulos contratados simulados para demonstrar perfis/capacidades.

## Persistência

Usar persistência simulada local (ex.: localStorage) ou store em memória com opção de reset. Separar camada de dados/serviços dos componentes para futura substituição por APIs. Incluir botão de reset/recarregar cenário demonstrativo.

## Dados de demonstração

Usar dados fictícios coerentes e interligados. Identificar ambiente como demonstração. Não usar dados pessoais reais. Cenários A/B/C/D em `08-jornadas-e-cenarios-de-validacao.md`.

## Importação em lote

Fazer upload simulado de arquivo, pré-visualização, validação de linhas, identificação de possíveis duplicidades e confirmação humana antes de aplicar. Não afirmar integração real.

## Descoberta

Fluxo simulado de conectores e descoberta com aprovação humana. Não criar ou associar automaticamente.

## Qualidade

- TypeScript tipado.
- Componentes reutilizáveis.
- Rotas reais.
- Formulários validados.
- Testes dos fluxos críticos.
- Responsividade e acessibilidade básica.
- Sem botões decorativos/inertes nas jornadas principais.
- Sem segredos no repositório.

## Critério de pronto

Funcionalidade pronta quando navegação, campos, ações, validações, feedback e atualização dos dados relacionados estiverem funcionando; respeitar fronteiras de domínio e permissões; e houver teste automatizado ou roteiro manual reproduzível.

## Sequência de construção

1. Fundação visual, shell, navegação, dados base e perfis.
2. Security Hub e dashboard configurável.
3. Central de Ativos e Ambientes.
4. Dispositivos, descoberta e telemetria.
5. Gestão de Rotinas, Manutenção e Ocorrências.
6. Gestão de Riscos e cenários integrados.
7. Polimento, responsividade e roteiro de validação.

V0.6 HTML é referência conceitual/visual, não especificação completa nem produto pronto. Não apenas acrescentar campos superficialmente: auditar requisitos por módulo e implementar estrutura coerente.
