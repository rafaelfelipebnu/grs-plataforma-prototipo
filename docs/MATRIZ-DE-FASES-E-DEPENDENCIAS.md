# Matriz de fases, dependências e validação — GRS

## 1. Fases
| Fase | Foco | Capacidades |
|---|---|---|
| 1 — Fundação | Central de Ativos e Ambientes | identidade mestre, locais, classificação, grupos, relacionamentos, 360º e descoberta assistida |
| 2 — Operação | Manutenção e Rotinas | solicitações, OS, execução, inspeções, checklists, evidências e reinspeção |
| 3 — Inteligência | Monitor de Infraestrutura | conectividade, telemetria, saúde, regras e alertas |
| 4 — Risco | Riscos e Ocorrências | avaliação, controles, ocorrências avançadas, planos de ação e eficácia |

Security Hub é a porta de entrada integrada e evolui transversalmente.

## 2. Dependências conceituais
- Painel 360º depende da identidade compartilhada da Central.
- Telemetria contextualizada depende de Monitor + Central (ponto → dispositivo → ativo/local).
- Manutenção por condição depende de Monitor + Manutenção + Central.
- Não conformidade gerar ocorrência depende de Rotinas + Ocorrências.
- Plano de Ação pode ser habilitado por Ocorrências Avançadas, Rotinas ou Manutenção; não depende de Gestão de Riscos.
- Avaliação estruturada de risco pertence a Gestão de Riscos e é opcional.
- Security Hub contextualiza falha de infraestrutura quando houver impacto em segurança.

## 3. Jornadas integradas prioritárias
### A — Falha em ativo crítico
Monitor identifica condição anormal → sinal vinculado ao ativo/local → Central mostra condição/relacionamentos → Security Hub destaca se houver impacto em segurança → Manutenção recebe solicitação/gatilho conforme configuração → ocorrência pode ser aberta conforme regra → execução/evidências permanecem nos domínios proprietários.

### B — Não conformidade em inspeção
Operador executa rotina, inclusive offline → não conformidade com evidência → após sincronização, Ocorrências sugere vínculo com ocorrência aberta → usuário confirma ou mantém nova → um ou mais Planos de Ação → ações executadas/evidenciadas → reinspeção opcional → resultado apoia encerramento conforme configuração.

### C — Descoberta de dispositivo
Configurar conector/rede → descobrir dispositivo/metadados → sugerir classificação/correspondência → usuário revisa/aprova na Central → pontos de dados disponíveis no Monitor → sinais consumidos por outros módulos conforme configuração explícita.

## 4. Validação com clientes
Objetivo: validar entendimento, valor, navegação e jornadas, não homologar arquitetura produtiva. Protótipo deve usar dados fictícios identificados; fluxos ponta a ponta; integrações/persistência/dispositivos simulados; revisão humana em importação/descoberta; perfis comerciais e permissões; experiência móvel demonstrativa para Rotinas.

## 5. Decisões técnicas postergadas
Arquitetura técnica profunda, contratos finais, banco produtivo, mensageria, segurança operacional e escalabilidade serão aprofundados após validação do conceito/escopo com clientes.
