# 06 — Gestão de Ocorrências

## Diretriz

Preservar fluxos existentes e ampliar tratamento avançado. Referência fornecida:
https://documentacao.senior.com.br/seniorxplatform/manual-do-usuario/ronda/#security-hub/gestao-de-ocorrencias.htm

## Tipos de ocorrência

Manter configuração existente de tipo: nome, prioridade padrão, monitorada, alerta sonoro, e-mails notificados e ações emergenciais/de dispositivos.

Prioridades exatas:
- Crítica.
- Alta.
- Média.
- Baixa.
- Planejada.

“Planejada” é categoria de prioridade para processos planejados (ex.: auditorias/verificação de eficácia), não uma dimensão de planejamento separada.

Não criar cadastro paralelo de template/classificação. Expandir a configuração do mesmo tipo, em seção separada de monitoramento/acionamento, com parâmetros opcionais:
- Exige plano de ação.
- Exige reinspeção.
- Critério de encerramento.
- Regras de relacionamento.

Prioridade definida manualmente, com sugestão opcional; usuário confirma e alterações ficam registradas.

## Origem

Não conformidades e rotinas não executadas podem gerar ocorrências. Ocorrência básica é capacidade básica GRS.

Plano de ação é capacidade adicional habilitada por Ocorrências Avançadas, Gestão de Rotinas ou Gestão de Manutenção. Não depende de Gestão de Riscos.

Gestão de Riscos é opcional para avaliação estruturada.

## Planos de ação

Uma ocorrência pode ter vários planos; cada plano tem várias ações. Ações podem ser independentes ou dependentes, inclusive múltiplas dependências. Não criar designer visual de workflow.

Criação manual, a partir de ocorrência, não conformidade de Rotinas ou regras automáticas.

Campos de ação: descrição/objetivo, executor, prazo, status, evidências/comentários, dependências e histórico.

Papéis: executor, responsável pelo plano e aprovador opcional.

Aprovação configurável: nenhuma, por ação, final ou condicional por criticidade/tipo/regra. Concluir ação não resolve automaticamente ocorrência.

## Ciclo de vida

Plano:
- Rascunho.
- Em andamento.
- Aguardando aprovação.
- Pausado.
- Concluído.
- Cancelado.

Pausa exige justificativa e responsável. Ciclo do plano é independente do ciclo da ocorrência.

Prazo global do plano e prazos por ação. Alertas de ações atrasadas, planos em risco e planos vencidos. Reprogramação registra prazo original/novo, ator e motivo. Não concluir/cancelar automaticamente por vencimento.

Evidências no nível da ação e do plano: fotos, vídeos, documentos, comentários e registros de execução.

## Execução e eficácia

Separar execução de eficácia. Resultados:
- Eficaz.
- Parcialmente eficaz.
- Ineficaz.

Parcial/ineficaz exige justificativa; pode gerar novas ações ou outro plano. Preservar histórico.

Sugerir recorrências semelhantes com base em ativo/local/histórico/eficácia; não bloquear nem classificar automaticamente sem validação.

Ocorrência pode ser encerrada enquanto plano preventivo continua ativo. Ciclos independentes.

## Reinspeção e encerramento

Reinspeção agendada ou avulsa; registrar checklist, operador, data, resultado e evidências. Configuração do tipo pode exigir reinspeção e definir critério de encerramento.

Modos de encerramento:
- Manual.
- Por reinspeção (OK pode encerrar; não OK mantém aberta).
- Por aprovação.

Evidência/justificativa configurável; exceção autorizada exige motivo e histórico.

Reabertura não faz parte da V1. Após encerramento, recorrência cria nova ocorrência relacionada à anterior. Ocorrências podem se relacionar mantendo históricos próprios.

## Protótipo

Implementar cadastro/lista/detalhe de ocorrências, filtros, tipo/prioridade, origem, vínculos, planos e ações, evidências, aprovação, reinspeção, eficácia, histórico e encerramento.
