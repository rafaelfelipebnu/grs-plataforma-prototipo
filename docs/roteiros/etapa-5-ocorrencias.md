# Roteiro de verificação — Etapa 5, 2ª entrega (Gestão de Ocorrências)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`, arquivos `src/services/occurrences.test.ts` e `src/modules/ocorrencias/occurrences.test.tsx`).

Antes de começar: **Controles da demonstração** → **Restaurar cenário de demonstração**. A ocorrência básica está em todos os perfis comerciais. Marcas "Provisório · P-xx" indicam hipóteses ainda não aprovadas (`docs/decisoes-evolucao.md`, P-60 a P-69).

## 1. Painel e consulta (Gestor de Segurança)
1. Entre como **Helena Duarte (Gestor de Segurança)** → **Gestão de Ocorrências**.
2. **Painel**: pendentes por prioridade (Críticas, Altas, Médias, Baixas, Planejadas) e por status (Sem tratamento, Em andamento, Em pausa, Concluídas nas últimas 24h).
3. **Ver mais ocorrências** → **Consulta**: filtros por status, prioridade, tipo e origem; a OC-0005 aparece com origem "Não conformidade (Gestão de Rotinas)" (integração existente, simulada).
4. **Tipos de ocorrência**: campos existentes + condições de conclusão (evidência, justificativa, critério manual ou por aprovação).

## 2. Registrar a partir de um evento
1. Security Hub → evento **Porta de emergência aberta — Linha Produtiva 1** → painel **Encaminhamentos** → **Registrar ocorrência**.
2. O formulário vem com local, descrição e horário do evento. Escolha o tipo **Acesso indevido**: a prioridade sugerida muda para **Alta** (prioridade padrão do tipo).
3. **Salvar** → ocorrência **Sem tratamento**, origem "Evento do Security Hub" com link para o evento. O evento continua com o mesmo status.

## 3. Tratamento: trâmite, pausa e prioridade
1. Na ocorrência criada, registre um **trâmite** → status **Em andamento**; o tempo de resposta aparece em **Tempos**.
2. **Alterar prioridade** → a alteração entra no histórico.
3. **Pausar** com justificativa → **Em pausa**: "Alterar prioridade" e "Concluir" somem; o aviso explica por quê. **Retomar** → contagem da pausa encerrada.

## 4. Conclusão com condições do tipo
1. **OC-0001** (Acesso indevido, exige justificativa): registre um trâmite → **Concluir** sem justificativa → erro; com justificativa → **Concluída**.
2. **OC-0002** (Vazamento, exige evidência): as **Pendências de conclusão** mostram "Evidência anexada". Registre um trâmite com **Anexar (simulado)** → a pendência fica atendida e o sino de quem pode concluir recebe "OC-0002 pode ser concluída" (N3).
3. **Consulta** → selecione **OC-0004** (em pausa) e outra aberta → **Concluir ocorrência(s)** → o resultado lista as mantidas abertas com o motivo (ex.: "em pausa: retome antes de concluir").

## 5. Conclusão por aprovação e exceção
1. **OC-0003** (Falha em equipamento de segurança, por aprovação): como Helena, **Solicitar aprovação da conclusão** → a ocorrência continua Em andamento com o aviso "aguardando aprovação". Helena não vê "Aprovar" (quem pede não aprova, P-61).
2. Troque para **Juliana Prado (Gestor Local)** → sino "Aprovar conclusão de OC-0003" → **Recusar** com motivo (continua Em andamento) ou **Aprovar conclusão** (Concluída, com "aprovada por Juliana Prado").
3. Em outra ocorrência com condições no tipo, **Concluir com exceção** → o histórico registra as condições dispensadas, quem autorizou e a justificativa. Em pausa, a exceção é recusada.

## 6. Integração com a Manutenção
1. Na **OC-0002**, **Abrir solicitação de manutenção** → o formulário vem com o local, o ativo (CHL-001) e a descrição da ocorrência.
2. Salve → a solicitação mostra a origem "Ocorrência de origem" (link). Na ocorrência, aparece no painel **Solicitações de manutenção** e um **registro automático** no histórico; o status e os trâmites da ocorrência não mudam.
3. Encerrar a OS dessa solicitação depois **não** conclui a ocorrência.

## 7. Security Hub, permissões e escopo
1. No painel do Security Hub, **Personalizar painel** → adicione **Ocorrências abertas** e **Ocorrências por status**: dados reais, com "Ver detalhes" levando à Consulta/Painel.
2. **Ricardo Nunes (Gestor de Manutenção)** consulta ocorrências, mas não registra, trata nem conclui.
3. **Juliana Prado** (escopo Joinville) não vê a **OC-0007** (Curitiba).
