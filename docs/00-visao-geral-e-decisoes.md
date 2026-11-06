# 00 — Visão geral e decisões consolidadas

## Visão

Conectar pessoas, ativos, ambientes e processos em uma experiência integrada de Gestão de Riscos e Operações, permitindo antecipar situações, coordenar respostas e comprovar controles.

**Posicionamento:** da portaria ao chão de fábrica. Uma operação mais conectada, segura e previsível.

A plataforma evolui de produtos separados para um ecossistema integrado. Não pretende substituir BMS, CMMS, ERP ou sistemas supervisórios: integra-se a eles.

## Proposta de valor

Conectar dados fragmentados; contextualizar sinais; transformar sinais em eventos, eventos em ações e ações em evidências.

Pilares:
1. Conectar.
2. Compreender.
3. Agir.
4. Comprovar e evoluir.

Ciclo de valor: Identificar → Monitorar → Contextualizar → Acionar → Executar → Comprovar → retroalimentar riscos e controles.

## Persona principal

Gestor de Segurança. Outras personas relevantes: gestores de TI, RH, Facilities, manutenção, operação, consultores de implantação e suporte.

## Princípios

- Security Hub é a porta de entrada integrada e continua segurança-cêntrico.
- Módulos especialistas preservam domínio, dados e regras próprias.
- A plataforma integra por serviços, APIs e eventos.
- O usuário deve perceber uma experiência coerente, sem precisar entender a arquitetura interna.
- A experiência deve apoiar decisões e ações, não apenas exibir indicadores.
- Contexto de localização, ativo, pessoa e evento deve ser preservado na navegação.
- Dados, indicadores e ações respeitam permissões e escopo.
- Protótipo valida mercado e experiência; arquitetura produtiva será aprofundada depois da validação.

## Portfólio e fronteiras

- **Security Hub:** consciência situacional, monitoramento, contextualização, correlação, orquestração e experiência integrada.
- **Controle de Acesso:** pessoas, permissões e eventos de acesso.
- **Central de Ativos e Ambientes:** identidade compartilhada, localização, hierarquia, relacionamentos e visão transversal.
- **Monitor de Infraestrutura:** dispositivos, telemetria, saúde e conectividade.
- **Gestão de Rotinas:** planos, rotinas, checklists, pontos de controle e execução.
- **Gestão de Manutenção:** solicitações, OS, planejamento e execução de manutenção.
- **Gestão de Ocorrências:** registro, tratamento, planos de ação, evidências e eficácia.
- **Gestão de Riscos:** avaliação estruturada de riscos e controles.
- **Gestão de Terceiros:** documentos, habilitações e conformidade; fora do escopo inicial do protótipo.

## Fronteiras de domínio

Cada módulo é dono dos seus dados e regras. A camada integrada pode consultar, apresentar contexto e encaminhar comandos, mas não replica a lógica especialista.

Exemplo: Security Hub pode mostrar o status de uma OS, mas Gestão de Manutenção é dona da criação, planejamento e execução da OS.

## Estratégia comercial

Land-and-expand: começar pela base instalada de Security Hub/Controle de Acesso e expandir para infraestrutura, rotinas, manutenção, riscos e ocorrências. Não impor uma sequência rígida de contratação.

Módulos não contratados podem aparecer para descoberta comercial, com bloqueio e explicação de valor, sem expor dados operacionais.

## Fases de evolução do produto

1. Fundação: Central de Ativos e Ambientes.
2. Operação: Gestão de Manutenção e Gestão de Rotinas.
3. Inteligência: Monitoramento, Telemetria e Regras.
4. Risco: Gestão de Riscos e Ocorrências.

Security Hub é a porta de entrada integrada ao longo das fases.

## Decisões consolidadas

- Uma única aplicação evolutiva.
- Protótipo de alta fidelidade, navegável e testável por clientes.
- Backend, integrações, dados e dispositivos simulados.
- Desktop-first responsivo; experiência móvel própria para execução de rotinas e experiência móvel demonstrativa para execução de OS (online, na mesma aplicação — D-013). Arquitetura mobile, aplicativo nativo e offline de OS continuam em aberto.
- Importação em lote e descoberta de dispositivos fazem parte do protótipo inicial, com revisão e confirmação antes de aplicar.
- Validação de conceito e jornadas antes de aprofundar arquitetura produtiva.
