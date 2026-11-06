# PRD — Gestão de Ocorrências

## 1. Objetivo
Registrar e acompanhar eventos que exigem tratamento. A capacidade básica é fundamental do GRS; recursos avançados incluem planos de ação, reinspeção, eficácia e relacionamentos entre ocorrências.

## 2. Conceitos e dependências
Ocorrência é distinta de Plano de Ação. Uma ocorrência pode ter vários planos; cada plano possui várias ações. Concluir ação não resolve automaticamente ocorrência. Ocorrência pode ser encerrada enquanto plano preventivo continua ativo. Gestão de Riscos é opcional e não é dependência. Planos de Ação podem ser habilitados por Ocorrências Avançadas, Rotinas ou Manutenção.

## 3. Tipo de Ocorrência
Preservar configuração existente: nome, prioridade padrão, indicador de monitoramento, alerta sonoro, e-mails notificados e ações de emergência/dispositivo.

Prioridades: Crítica, Alta, Média, Baixa e Planejada. “Planejada” é categoria de prioridade para processos planejados, como auditorias e verificações de eficácia, não uma dimensão separada.

Expandir o mesmo tipo com seção opcional de tratamento: exige plano de ação, exige reinspeção, critérios de encerramento e regras de relacionamento. Não criar template/classificação paralela.

## 4. Requisitos funcionais
1. Registrar ocorrência manual ou por origem integrada, com tipo, prioridade, ativo/local, descrição, evidências, responsável e histórico.
2. Origens: registro manual, não conformidade de checklist, rotina não executada e regras integradas.
3. Prioridade manual com sugestão opcional do sistema; usuário confirma; alterações auditadas.
4. Criar plano manualmente, a partir de ocorrência, não conformidade ou regra automática. Uma ocorrência pode ter múltiplos planos.
5. Ações com descrição/objetivo, executor, prazo, status, evidências/comentários, dependências e histórico.
6. Ações independentes ou com múltiplas dependências; não criar construtor visual de workflow.
7. Papéis: executor, responsável pelo plano e aprovador opcional; usuário pode acumular papéis.
8. Aprovação: nenhuma, por ação, final ou condicional por criticidade/tipo/regra.
9. Estados do plano: Rascunho, Em andamento, Aguardando aprovação, Pausado, Concluído e Cancelado. Pausa exige justificativa e responsável.
10. Prazo global e por ação. Alertas para ações atrasadas, planos em risco e vencidos. Reprogramação registra data original/nova, ator e motivo. Vencimento não conclui/cancela automaticamente.
11. Evidências no nível de ação e plano: fotos, vídeos, documentos, comentários e registros.
12. Separar execução e eficácia. Resultados: Eficaz, Parcialmente eficaz e Ineficaz. Parcial/ineficaz exige justificativa e pode gerar novas ações/outro plano. Preservar histórico.
13. Sugerir ocorrências anteriores semelhantes e histórico de ativo/local/planos/eficácia; não bloquear ou classificar automaticamente sem validação.
14. Ocorrências podem se relacionar mantendo histórico próprio.
15. Reinspeção agendada ou ad hoc; registrar checklist, operador, data, resultado e evidências. Tipo pode exigir reinspeção e definir critério de encerramento.
16. Encerramento configurável: manual, por reinspeção (OK pode permitir encerrar; não OK mantém aberta) ou aprovação. Evidência/justificativa pode ser exigida. Exceção autorizada exige motivo/histórico.
17. Reabertura fora da V1. Após encerramento, recorrência cria nova ocorrência relacionada à anterior.

## 5. Integração com Rotinas
Rotinas permanece autônoma e offline-capable. Durante execução offline não consulta ocorrências online nem deduplica. Após sincronização, Ocorrências avalia possível vínculo e sugere associação; usuário autorizado confirma ou mantém nova ocorrência.

Ocorrência pode solicitar/agendar reinspeção. Rotinas executa mesmo offline e sincroniza resultado. Resultado OK pode permitir encerramento conforme configuração; não OK mantém ocorrência aberta e acrescenta evidências.

## 6. Critérios de aceite
Ciclos de vida de ocorrência/plano independentes; múltiplos planos por ocorrência; dependências múltiplas sem workflow visual; aprovação/encerramento configuráveis; pausas e reprogramações auditáveis; execução e eficácia separadas; reincidência sugere relação sem classificação automática; sem reabertura V1; integração offline sem consulta online durante execução.

## 7. A definir
Estados/transições completos da ocorrência; campos obrigatórios por tipo; SLA/escalonamento; anexos/limites/retenção; matriz de permissões; relatórios e indicadores.
