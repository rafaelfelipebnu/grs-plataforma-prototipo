# GRS Product Context

Pacote de contexto para desenvolvimento do protótipo web GRS com Claude Code.

## Objetivo

Construir uma aplicação web navegável e testável por clientes, com aparência de produto real e fluxos funcionais simulados. O protótipo valida conceito, experiência, jornadas e proposta comercial; não é ainda uma implementação integrada aos serviços produtivos da Senior.

## Como usar

1. Coloque esta pasta na raiz do repositório Git.
2. Leia primeiro `CLAUDE.md`.
3. Leia `docs/00-visao-geral-e-decisoes.md`.
4. Consulte os documentos por domínio antes de implementar cada módulo.
5. Mantenha `docs/decisoes-evolucao.md` atualizado quando uma decisão for explicitamente alterada.

## Documentos

- `CLAUDE.md`: instruções permanentes para Claude Code.
- `docs/00-visao-geral-e-decisoes.md`: visão, estratégia, princípios e decisões transversais.
- `docs/01-arquitetura-de-produto-e-navegacao.md`: módulos, navegação e responsabilidades.
- `docs/02-central-ativos-ambientes.md`: cadastro mestre, locais, dispositivos, grupos e painel 360º.
- `docs/03-security-hub.md`: dashboard, widgets, monitoramento e experiência integrada.
- `docs/04-gestao-de-rotinas.md`: comportamento atual a preservar e integração.
- `docs/05-gestao-de-manutencao.md`: solicitações, OS e execução.
- `docs/06-gestao-de-ocorrencias.md`: ocorrências, planos de ação, eficácia e reinspeção.
- `docs/07-integracoes-telemetria-descoberta.md`: agente, protocolos, descoberta e telemetria.
- `docs/08-jornadas-e-cenarios-de-validacao.md`: cenários ponta a ponta para demonstração.
- `docs/09-prototipo-requisitos-tecnicos.md`: escopo técnico, comportamento esperado e estratégia de implementação.
- `docs/decisoes-evolucao.md`: registro de decisões novas e alterações aprovadas.

## Protótipo — como executar

Requisitos: Node.js 20+ (testado com Node 24) e npm.

```bash
npm install        # instala dependências
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm test           # testes automatizados (regras de acesso, serviços e jornadas)
npm run typecheck  # verificação de tipos
npm run build      # build de produção em dist/ (npm run preview para servir)
```

Não há login real: escolha uma persona de demonstração na tela de entrada. A faixa amarela do topo dá acesso aos **Controles da demonstração** (perfil comercial, cenário A, restauração dos dados).

Roteiros manuais de verificação: `docs/roteiros/` (etapa 1: fundação; etapa 2: Security Hub).

### Estrutura do código

```
src/
  domain/            tipos do domínio (localização, ativo, dispositivo, pessoa, acesso, contrato, evento, notificação)
  data/seed/         dados de demonstração centralizados e interligados
  access/            perfis → permissões, contrato → capacidades, escopo por localização
  services/          interfaces (contracts.ts) + implementações mock sobre store local (localStorage)
  modules/registry   registro dos módulos (ordem da sidebar, responsabilidades, etapa)
  modules/security-hub  dashboard configurável, catálogo de 17 widgets, listas de eventos e acessos
  app/               router, providers (serviços, sessão), navegação contextual
  shell/             menu lateral, cabeçalho global, busca, notificações, controles da demonstração
  pages/             entrada, gate de módulo, páginas de registro, busca, configurações
  components/ui      componentes no padrão SDS
  components/domain  badges de criticidade/condição/severidade, caminho de localização, formatação
```

## Estado e limites deste pacote

Este material consolida decisões e definições já discutidas. Onde uma regra não foi definida com precisão, ela é marcada como ponto a detalhar — não deve ser inventada como se fosse decisão aprovada. O protótipo deve usar dados fictícios e persistência simulada.
