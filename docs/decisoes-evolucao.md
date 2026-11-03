# Registro de decisões e evolução

Use este arquivo para registrar somente decisões novas ou alterações explicitamente aprovadas.

Formato:
- Data:
- Tema:
- Decisão:
- Motivo:
- Impactos nos documentos/telas:
- Aprovado por:

## Estado inicial

Este pacote consolida decisões discutidas anteriormente. Não há autorização implícita para reabrir decisões consolidadas. Pontos ainda não detalhados devem ser registrados como dúvidas, sem assumir comportamento definitivo.

---

## Decisões aprovadas

### D-001 — Perfis de acesso iniciais
- Data: 2026-11-03
- Tema: Permissões
- Decisão: perfis de acesso iniciais são Administrador Corporativo, Gestor Local, Gestor de Segurança, Gestor de Manutenção, Técnico e Operador de Rotinas. Os perfis comerciais Essencial, Operacional, Integrado e Personalizado são um conceito separado e representam módulos/capacidades contratados.
- Motivo: viabilizar a etapa 1 (perfis demonstrativos) separando permissão de contrato.
- Impactos: `src/access/profiles.ts`, `src/access/plans.ts`, tela de entrada, menu lateral, controles da demonstração.
- Aprovado por: usuário (P.O.), em sessão de 03/11/2026.

### D-002 — Controle de Acesso como produto integrado
- Data: 2026-11-03
- Tema: Arquitetura de produto / navegação
- Decisão: Controle de Acesso não entra na sidebar nesta primeira versão. É um produto integrado e fonte de dados de pessoas, permissões e eventos de acesso. A busca global considera pessoas das fontes integradas, respeitando permissões.
- Motivo: resolver lacuna sobre o papel do Controle de Acesso no protótipo.
- Impactos: pessoas e eventos de acesso com origem "Controle de Acesso (integração simulada)"; página de consulta de pessoa somente leitura (`/pessoas/:id`).
- Aprovado por: usuário (P.O.), em sessão de 03/11/2026.

### D-003 — Fronteira Central de Ativos x Monitor de Infraestrutura
- Data: 2026-11-03
- Tema: Fronteiras de domínio
- Decisão:
  - Central: identidade mestre, cadastro, localização, classificação, grupos, relacionamentos e painel 360º.
  - Monitor: descoberta, conectividade, coleta de telemetria, saúde dos dispositivos, configuração de monitoramento e regras.
  - A Central apresenta informações consolidadas, mas não assume a gestão técnica do monitoramento.
- Motivo: resolver sobreposição entre docs/02 e docs/00 sobre dispositivos e telemetria.
- Impactos: dados separados por dono (`devices` na Central; `deviceHealth`, `dataPoints`, `connectors` no Monitor). A página do dispositivo na Central só exibe dados técnicos se o Monitor estiver disponível.
- Aprovado por: usuário (P.O.), em sessão de 03/11/2026.

### D-004 — Tratamento de lacunas e documentação externa
- Data: 2026-11-03
- Tema: Processo
- Decisão: lacunas são registradas neste arquivo e não bloqueiam etapas que não dependem delas. Não se inventam regras definitivas. Quando uma regra depender de documentação externa ainda não transcrita, a dependência é sinalizada em vez de presumida.
- Aprovado por: usuário (P.O.), em sessão de 03/11/2026.

---

## Decisões técnicas do protótipo

### T-001 — Stack e design system
- Data: 2026-11-03
- Decisão: React 18 + TypeScript + Vite + React Router 6 (router de dados) + CSS Modules + Vitest/Testing Library. Visual segue o SDS (Senior Design System): Open Sans, Font Awesome 4.7, tokens de cor/espaçamento/elevação, cores de Manchester para criticidade, Panels com título em maiúsculas, breadcrumb.
- Motivo: stack recomendada no CLAUDE.md. O SDS determina Angular + PrimeNG para front-ends produtivos; o protótipo reproduz o visual do SDS com componentes próprios em React. **Isso é desvio intencional e não deve ser levado para a implementação produtiva.**
- Impactos: `src/components/ui` implementa equivalentes de Button, Panel, Badge (Pill/Number/Chip), Alert, Toast, Modal, Sidebar, Tabs, Textfield/Select/Checkbox, State pages e Label Value.

### T-002 — Camada de serviços mock
- Data: 2026-11-03
- Decisão: telas acessam dados apenas por interfaces em `src/services/contracts.ts`. Todos os serviços recebem o contexto de acesso e aplicam permissão, contrato e escopo de localização (como uma API real faria). Persistência simulada em localStorage, com restauração do cenário.
- Motivo: permitir substituir por APIs reais sem reescrever telas e garantir escopo consistente em listas, buscas, notificações e indicadores.

---

## Comportamentos provisórios (etapa 1) — a validar

Implementados como a opção mais simples e reversível. Não são decisões aprovadas.

| # | Tema | Comportamento provisório | Onde alterar |
|---|------|--------------------------|--------------|
| P-01 | Matriz de permissões | Distribuição de permissões por perfil derivada das responsabilidades dos documentos (ex.: Técnico acessa Central e Manutenção; Operador de Rotinas só Rotinas; só Administrador Corporativo e Gestores de Segurança/Local consultam pessoas). | `src/access/profiles.ts` |
| P-02 | Composição dos perfis comerciais | Essencial = Security Hub + Central + Ocorrências básica; Operacional = Essencial + Rotinas + Manutenção; Integrado = todos, incluindo Monitor, Ocorrências Avançadas e Riscos. Exibido na UI como "composição provisória". | `src/access/plans.ts` |
| P-03 | Visibilidade no menu | Módulo sem permissão do perfil não aparece; módulo permitido e não contratado aparece bloqueado com explicação de valor. | `src/access/accessContext.ts` (`moduleAccess`) |
| P-04 | Entrada para perfis sem Security Hub | Login leva ao Security Hub (docs/01); perfis sem permissão no Hub vão ao primeiro módulo disponível. | `src/pages/SystemPages.tsx` |
| P-05 | Dados de módulo não contratado | Ativos, dispositivos e locais (Central) só aparecem em busca/detalhe se a Central estiver contratada e permitida. | `src/services/mock/searchService.ts` |
| P-06 | Estados de alerta | Somente "ativo" e "reconhecido". O ciclo completo de tratamento de eventos não está definido. | `src/domain/event.ts` |
| P-07 | Relevância para segurança | Evento é destacado no Hub quando vem de fonte de segurança (Security Hub, Controle de Acesso) ou quando o módulo de origem informa contexto de segurança. No cenário A, o contexto é derivado de ativos dependentes classificados como proteção contra incêndio/segurança eletrônica. | `src/services/internal.ts`, `src/services/mock/demoService.ts` |
| P-08 | Registro fora do escopo | Retorna 403 sem exibir dados. | serviços mock |
| P-09 | Níveis de localização | Além de Unidade/Prédio/Setor/Sala (exemplo do docs/02), os dados usam "Área" e "Andar". | `src/domain/location.ts` |
| P-10 | Tipos de relacionamento | Apenas "depende de". Outros tipos serão definidos com a Central (etapa 3). | `src/domain/asset.ts` |
| P-11 | Escopo de dispositivo sem localização | Dispositivo não identificado fica visível para quem tem no escopo a unidade do agente/conector que o descobriu. | `src/services/mock/assetService.ts` |
| P-12 | Notificações críticas | Exibição imediata (toast persistente) apenas para críticas que chegam durante a sessão; as anteriores ficam na central. Leitura é individual por usuário. | `src/shell/CriticalNotificationWatcher.tsx` |
| P-13 | Destino de notificação de evento | Com Security Hub disponível, abre o evento; sem ele, abre o ativo/dispositivo afetado na Central. | `src/app/navigation/targets.ts` |
| P-14 | Localização contextual do cabeçalho | Define o recorte padrão (incluindo descendentes) para os módulos; não altera o escopo de permissão. A relação com a árvore da Central será revista na etapa 3. | `src/shell/LocationContextSelector.tsx` |

## Comportamentos provisórios (etapa 2 — Security Hub) — a validar

| # | Tema | Comportamento provisório | Onde alterar |
|---|------|--------------------------|--------------|
| P-15 | Widgets × áreas | docs/03 define 4 áreas e 17 widgets, mas não o mapeamento. O padrão do cliente distribui 10 widgets entre as áreas; qualquer widget pode ser colocado em qualquer área. | `src/data/seed/dashboard.ts`, `src/modules/security-hub/catalog.ts` |
| P-16 | Quem define o padrão do cliente | Somente o Administrador Corporativo (permissão `hub.dashboard.default`). O padrão é único por cliente. | `src/access/profiles.ts` |
| P-17 | Ativo relevante para segurança | Ativo com classificação de segurança (proteção contra incêndio, segurança eletrônica) ou do qual um desses dependa, direta ou indiretamente. Ex.: BMB-014 (abastece SIS-INC-01) e GER-002 (alimenta CTA-PORT-03). | `src/services/internal.ts` |
| P-18 | Requisitos dos widgets integrados | Widgets de operação integrada exigem o módulo de origem (Central ou Monitor). "Câmeras em destaque" usa o estado da transmissão de vídeo (domínio de segurança) e não exige o Monitor. | `src/modules/security-hub/catalog.ts` |
| P-19 | Widgets de módulos futuros | Ocorrências abertas, Ocorrências por status, Manutenções em andamento e Inspeções e rotinas pendentes mostram o estado real: bloqueado (não contratado) ou "disponível na etapa 5". Nenhum dado fictício. | `ManagementWidgets.tsx` |
| P-20 | Ações pendentes | Nesta etapa, apenas alertas aguardando reconhecimento, ordenados por severidade e tempo de espera. Ações de outros módulos entram na etapa 5. | `securityHubService.ts` |
| P-21 | Mapa operacional | Mapa esquemático baseado na hierarquia de localização (sem planta/imagem). Expansível com aproximação por nível. Associação de plantas a unidade/prédio/andar fica para a Central (etapa 3). | `OperationWidgets.tsx` |
| P-22 | Local do widget | Usa o local configurado no widget, se estiver no escopo; senão, a localização do cabeçalho; senão, todo o escopo. Se o padrão do cliente tiver local fora do escopo do usuário, o widget avisa e exibe o escopo do usuário. | `WidgetCard.tsx` |
| P-23 | Tempo médio de resposta | Tempo entre a ocorrência do evento e o reconhecimento (único marco de tratamento modelado). | `securityHubService.ts` |
| P-24 | Tempo real simulado | Uma passagem simulada no Controle de Acesso a cada 8 s (desligável nos controles da demonstração); histórico limitado a 400 passagens. Cada widget respeita o modo de atualização configurado (tempo real, 30 s, 1 min, 5 min, manual). | `LiveSimulator.tsx`, `useServiceQuery.ts` |
| P-25 | Restaurar padrão | O usuário pode descartar o painel pessoal e voltar ao padrão do cliente. | `DashboardPage.tsx` |
| P-26 | Lista de eventos do Hub | Mostra somente eventos relevantes para segurança (ver P-07). Reconhecimento individual e em lote. | `securityHubService.ts` |

---

## Dúvidas em aberto

Não bloqueiam a etapa 1. Precisam de definição antes das etapas indicadas.

| # | Dúvida | Necessária na etapa |
|---|--------|---------------------|
| Q-01 | Gestão de Riscos não tem documento próprio: entidades, campos, metodologia de avaliação e relação com controles. | 6 |
| Q-02 | Ciclos de status não definidos: ocorrência (só o plano tem ciclo), ação do plano, solicitação, OS, execução, rotina/execução de rotina; escala de prioridade de solicitação/OS. | 5 |
| Q-03 | **Dependência de documentação externa não transcrita**: conceitos e fluxos atuais de Gestão de Rotinas e de Gestão de Ocorrências estão em `documentacao.senior.com.br` (links em docs/04 e docs/06). Campos, status e telas existentes precisam ser transcritos antes da etapa 5 para serem preservados. | 5 |
| Q-04 | Fórmula/escala do impacto operacional (dependências, locais atendidos, processos, pessoas). | 3 |
| Q-05 | Herança de configuração em Manutenção (empresa → unidade/filial → grupo de ativos → ativo): "unidade/filial" pertence à estrutura organizacional ou à hierarquia de localização? | 5 |
| Q-06 | Em docs/06, "ocorrência pode ser encerrada enquanto plano preventivo continua ativo": trata-se de plano de ação preventivo ou do plano preventivo da Manutenção? | 5 |
| Q-07 | Como a localização contextual do cabeçalho se relaciona com a árvore permanente da Central (sincronizadas ou independentes)? | 3 |
| Q-08 | Gestão de Terceiros: deve aparecer como módulo bloqueado (descoberta comercial) ou permanecer totalmente fora do protótipo? Atualmente fora. | 7 |
| Q-09 | Execução de OS pelo Técnico precisa de experiência móvel própria (como Rotinas)? | 5 |
| Q-10 | Fluxo de auditoria periódica de grupos (periodicidade mínima, conclusão local, visão corporativa). | 3 |
| Q-11 | Referência visual "V0.6 HTML" citada em docs/09 não está no repositório. | — |
| Q-12 | Tipos adicionais de relacionamento entre ativos e vínculo com processos. | 3 |
| Q-13 | Definição de "tempo médio de resposta a eventos": até o reconhecimento, até o início do tratamento ou até o encerramento? | 5 |
| Q-14 | Painel padrão: único por cliente ou também por unidade e/ou perfil de acesso? | 7 |
| Q-15 | Ciclo completo do alerta no Security Hub além do reconhecimento (tratamento, falso alarme, encerramento) e sua relação com a ocorrência. | 5 |
| Q-16 | Mapeamento oficial dos 17 widgets nas 4 áreas do dashboard (ver P-15). | 7 |
