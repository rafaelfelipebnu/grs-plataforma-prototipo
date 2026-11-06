# PRD — Gestão de Manutenção

## 1. Objetivo
Administrar solicitações, triagem, ordens de serviço, planejamento e execução de intervenções em ativos, integrando-se à Central, Monitor, Rotinas e Ocorrências.

## 2. Roadmap conceitual
1. Fundação operacional: solicitações, OS, execução, responsáveis e histórico.
2. Planejamento: planos preventivos, recorrência, calendários e recursos.
3. Inteligência: telemetria, regras, alertas e manutenção baseada em condição.
4. Otimização: indicadores, custos, confiabilidade, disponibilidade e previsibilidade.

## 3. Usuários e papéis
Solicitante, gestor de manutenção, técnico, aprovador e administrador. Usuário pode acumular papéis.

## 4. Conceitos
- **Solicitação:** demanda submetida para avaliação.
- **Ordem de Serviço:** autorização/planejamento formal da intervenção.
- **Execução:** trabalho realizado e evidenciado.

Solicitação pode ser rejeitada, duplicada, redirecionada ou resolvida sem gerar OS.

## 5. Requisitos funcionais
1. Abertura por usuários autorizados, com ativo/local quando conhecido, descrição, prioridade percebida, evidências e origem.
2. Origens: pessoas, inspeções, planos preventivos, regras e telemetria.
3. Triagem por equipe autorizada: priorizar, identificar duplicidade, redirecionar, rejeitar ou converter em OS.
4. OS manual ou automática conforme regras. Aprovações podem depender de valor, criticidade, ativo ou tipo de intervenção.
5. Planejamento de responsáveis, equipe/recursos, datas, prioridade e sequência.
6. Execução com início, andamento, conclusão, responsáveis, comentários, evidências e histórico.
7. Encerramento com validações configuradas. Concluir OS não encerra automaticamente ocorrência relacionada.
8. Configuração de processo por parâmetros, não construtor visual de workflow. Modelos predefinidos podem facilitar configuração.
9. Herança de configuração: empresa → unidade/filial → grupo de ativos → exceção de ativo. Apenas níveis explicitamente definidos sobrescrevem; interface mostra herdado versus sobrescrito.
10. Consultar identidade, localização, criticidade, condição, grupos e histórico na Central.
11. Receber sinais do Monitor para manutenção por condição. Política de geração automática de solicitação/OS é configurável e ainda a definir.
12. Não conformidades/ocorrências podem originar solicitações, preservando origem e rastreabilidade.

## 6. Critérios de aceite
Solicitação, OS e execução são distintos; solicitação pode terminar sem OS; origem rastreável; triagem/aprovação configuráveis; herança respeitada; histórico consultável por ativo; OS não fecha ocorrência automaticamente.

## 7. A definir
Estados detalhados; campos obrigatórios por tipo; SLA/escalonamento/aprovação; materiais, custos e mão de obra; indicadores/fórmulas; integração com ERP/CMMS externos.
