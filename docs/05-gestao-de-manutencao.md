# 05 — Gestão de Manutenção

## Objetivo

Atender diferentes segmentos e contextos de facilities/equipamentos, com base operacional e evolução para planejamento e inteligência.

## Evolução

1. Fundação operacional: solicitações, ordens de serviço, execução, responsáveis e histórico.
2. Planejamento: planos preventivos, recorrência, calendários e recursos.
3. Inteligência: telemetria, regras e manutenção baseada em condição.
4. Otimização: indicadores, custos, confiabilidade, disponibilidade e previsibilidade.

## Entidades distintas

- **Solicitação:** pedido ou necessidade de intervenção.
- **Ordem de Serviço (OS):** trabalho autorizado e planejado.
- **Execução:** realização e registro do trabalho.

Solicitação pode ser rejeitada, duplicada, redirecionada ou resolvida sem OS.

## Origem e triagem

Solicitações podem ser abertas por usuários autorizados. Manutenção faz triagem/priorização/autorização. Fontes: pessoas, inspeções, planos preventivos, regras e telemetria.

Triage pode ser configurável como obrigatória ou opcional. OS pode ser manual ou automática. Aprovações condicionais por valor, criticidade, ativo ou intervenção.

## Papéis

- Solicitante.
- Gestor de manutenção.
- Técnico.
- Aprovador.
- Administrador.

Um usuário pode ter múltiplos papéis.

## Configuração de processo

Configurar parâmetros por etapa, sem designer visual genérico de workflow. Etapas configuráveis: entrada, triagem, aprovação, planejamento, execução, encerramento e notificações. Templates predefinidos podem facilitar configuração.

Hierarquia de herança:
empresa → unidade/filial → grupo de ativos → exceção de ativo individual. Só níveis configurados sobrescrevem; mostrar herdado vs. sobrescrito.

## Protótipo

Implementar listas e detalhes de solicitações, OS e execuções; formulários; priorização; atribuição; prazos; transições de status; evidências e histórico; calendário/plano preventivo em escopo demonstrativo. Não confundir solicitação com OS.
