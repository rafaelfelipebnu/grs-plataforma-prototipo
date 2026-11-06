# Q-02 — Ciclo de vida da ocorrência

> **Situação:** versão consolidada (revisão 3), em 2026-11-06.
> - Todas as recomendações DP foram **aprovadas pelo P.O.** (D-009 e D-010, `docs/decisoes-evolucao.md`), exceto DP-08, DP-09 e DP-13, que continuam **[Em aberto]**.
> - Nada implementado. docs/06 e os PRDs não foram modificados.
>
> **Base:**
> - `docs/referencias/rotinas-e-ocorrencias-atual.md` (seções 2.4 a 2.13 e 3);
> - D-005 a D-008;
> - regras consolidadas de docs/06 e do PRD de Ocorrências.

## 0. Marcas usadas

| Marca | Significado |
|---|---|
| **[E]** | Existente: documentação oficial do produto atual. |
| **[E\*]** | Deduzido diretamente de regras existentes. Confirmar com o time do produto. |
| **[C]** | Consolidado em docs/06 ou no PRD. |
| **[D]** | Decidido: D-005 a D-008. |
| **[Aprovado]** | Recomendação aprovada pelo P.O. em 2026-11-06 (D-009 ou D-010). |
| **[Proposta]** | Recomendação ainda **não aprovada**. |
| **[Em aberto]** | Depende de análise ou decisão. Não implementar por suposição. |

Situação de cada DP:

| DP | Tema | Situação |
|---|---|---|
| DP-01 | Manter os quatro status | **Aprovado** |
| DP-02 | Primeiro trâmite humano encerra o tempo de resposta (Sem tratamento → Em andamento) | **Aprovado** |
| DP-03 | Pausa com justificativa obrigatória e desconto no tempo de solução; bloqueio de prioridade esclarecido | **Aprovado** |
| DP-04 | Conclusão condicionada às regras configuradas no tipo | **Aprovado** |
| DP-04a | Ocorrência Em pausa não pode ser concluída em nenhum canal (detalhe, lote, API) | **Aprovado** (D-010) |
| DP-05 | Permissões conceituais separadas, sem matriz de perfis | **Aprovado** (D-010) |
| DP-06 | Registros automáticos não contam como trâmite humano | **Aprovado** |
| DP-07 | Notificações novas, só no sino (seção 5) | **Aprovado para o protótipo** (D-010) |
| DP-08 | Criar plano de ação em ocorrência concluída | **[Em aberto]** |
| DP-09 | Concluir com reinspeção solicitada e não executada | **[Em aberto]** |
| DP-10 | Exigência de plano de ação: dois modos (seção 6.2) | **Aprovado** (D-010), com dois pontos em aberto |
| DP-11 | "Exige reinspeção" = último resultado OK | **Aprovado** |
| DP-12 | Reinspeção OK habilita a conclusão, mas não conclui | **Aprovado** |
| DP-13 | Conclusão por aprovação | **[Em aberto]** |
| DP-14 | Conclusão em lote mantém abertas e identifica as que não atendem | **Aprovado** |
| DP-15 | Convivência reinspeção Não Conforme × geração automática: alternativa C | **Aprovado**, com as ressalvas da seção 7 |

---

## 1. Status da ocorrência — [Aprovado] DP-01

Mantêm-se **exatamente os quatro status existentes**. As capacidades novas (plano de ação, reinspeção, aprovação, vínculo) aparecem como **pendências de conclusão** e indicadores no detalhe, nunca como novos status.

| Status | Significado | Origem |
|---|---|---|
| **Sem tratamento** | Registrada e sem trâmite humano. | [E] status; [Aprovado] significado (DP-02, DP-06) |
| **Em andamento** | Em tratamento: ao menos um trâmite humano, não pausada, não concluída. | [E] status; [Aprovado] significado |
| **Em pausa** | Tratamento suspenso, com justificativa. | [E] + [Aprovado] DP-03 |
| **Concluída** | Tratamento finalizado. Estado final na V1. | [E] + [C] sem reabertura |

Não há "Cancelada" nem "Falso alarme" no produto atual. O tratamento de falso alarme depende da Q-15 [Em aberto].

---

## 2. Transições

```
 criação ──► Sem tratamento ──T2 1º trâmite humano──► Em andamento ──T5 Concluir──► Concluída
                                                       │      ▲                    (final; sem reabertura;
                                     T3 Pausar         │      │ T4 Retomar          recorrência = nova
                                     (justificativa)   ▼      │                     ocorrência relacionada)
                                                      Em pausa
                                              (prioridade bloqueada;
                                           tempo descontado da solução)
```

| # | De → Para | Gatilho | Condições | Permissão (DP-05) | Efeitos | Situação |
|---|---|---|---|---|---|---|
| T1 | — → Sem tratamento | Registro manual (web, app) ou integração (não conformidade, rotina não executada, pânico, dispositivo, API) | Tipo e local físico; prioridade sugerida pela prioridade padrão do tipo | **Registrar** (integração: sistema, com origem identificada) | Notificações existentes do tipo (Monitoramento, som, e-mails); ícone amarelo no local; histórico; após sincronização, avaliação de vínculo (D-005) | [E] + [D] |
| T2 | Sem tratamento → Em andamento | **Primeiro trâmite humano** | Registros automáticos não disparam esta transição | **Tratar** | Encerra o tempo de resposta; remove o ícone amarelo; histórico | [Aprovado] DP-02, DP-06 |
| T3 | Em andamento → Em pausa | Pausar | Status ≠ Sem tratamento [E]; **justificativa obrigatória** | **Tratar** | Bloqueio de prioridade (seção 2.1); inicia contagem de pausa, descontada do tempo de solução [E]; **não pausa planos de ação** [C]; histórico com justificativa e autor | [E] + [Aprovado] DP-03 |
| T4 | Em pausa → Em andamento | Retomar | Somente Em pausa [E] | **Tratar** | Encerra a contagem de pausa; desbloqueia a prioridade; histórico | [E] + [E\*] destino |
| T5 | Em andamento → Concluída | Concluir (individual, em lote ou via API) | Regra atual [E]: status ≠ Sem tratamento; ≥ 1 trâmite. **Em pausa nunca conclui, em nenhum canal** (seção 2.2) [Aprovado DP-04a]. **Mais as condições configuradas no tipo** (seção 6) [Aprovado DP-04] | **Concluir** | Sai de "Ocorrências em aberto"; entra em "Concluídas nas últimas 24h"; encerra o tempo de solução; **planos seguem seu ciclo** [C]; histórico | [E] + [Aprovado] |
| T6 | Em andamento → Em andamento | Trâmite, prioridade, plano, solicitação de reinspeção, vínculo | Prioridade só fora de Em pausa [E]. Trâmite só fora de Concluída [E] | **Tratar** (vínculo: D-005b [Em aberto]) | Histórico; alteração de prioridade auditada [C] | [E] + [C] |
| — | Concluída → qualquer | — | Não permitido na V1 | — | Recorrência cria nova ocorrência relacionada | [C] |

### 2.1 Bloqueio de prioridade durante a pausa — [Aprovado] DP-03 (esclarecimento)

- **Regra existente [E]:** não é permitido alterar o "Nível de prioridade" quando o status é "Em pausa".
- **O que fica bloqueado:** somente a **alteração** da prioridade, por qualquer usuário e também em lote. Para alterar, é preciso **retomar** antes; a alteração fica no histórico.
- **O que não muda:** a prioridade vigente continua **exibida** e **usada** na ordenação e nos agrupamentos do Painel, no Monitoramento ("Ocorrências em aberto" inclui as pausadas) e nos indicadores por prioridade. Pausar **não rebaixa nem zera** a prioridade.
- **Sem alteração automática:** nenhuma regra do sistema altera a prioridade durante a pausa.
- **Planos e ações:** prazos e alertas de planos e ações não são afetados pela pausa da ocorrência (ciclos independentes [C]). A pausa do plano tem regra própria (justificativa e responsável [C]).

### 2.2 Ocorrência Em pausa não pode ser concluída — [Aprovado] DP-04a

- Uma ocorrência **Em pausa não pode ser concluída**.
- Para concluir, é preciso **retomar primeiro** (T4). A retomada fica registrada no histórico e encerra a contagem da pausa. Só então a conclusão (T5) pode ser tentada, com as demais condições.
- A regra vale **igualmente em todos os canais**: detalhe, conclusão em lote e operações via API. Não pode haver divergência entre canais.
- **Relação com o existente:**
  - Harmoniza a inconsistência I-13: hoje a documentação só proíbe na conclusão em lote.
  - A documentação da API lida (F32) descreve apenas a criação de ocorrências. Se houver operação de conclusão via API no produto, ela deve seguir esta regra; a existência dessa operação não está confirmada.
- Na conclusão em lote, uma ocorrência Em pausa é **mantida aberta e identificada** com o motivo "em pausa: retome antes de concluir" (DP-14).
- No protótipo, a regra fica na **camada de serviço**, e não só na tela, para valer em qualquer chamada.

---

## 3. Permissões — [Aprovado] DP-05

**Princípio:** registrar, tratar e concluir são permissões **distintas**. Ter uma não implica ter as outras. Em particular, **quem registra uma ocorrência não pode, por isso, tratá-la ou concluí-la**.

A **matriz de perfis e permissões não está definida** e não deve ser presumida.

| Permissão conceitual | Abrange | Referência no produto atual |
|---|---|---|
| **Registrar** | T1 manual (web e app); anexar evidências no registro | [E] papel Ronda "Ocorrências — Incluir"; menu "Registros de ocorrências" |
| **Consultar** | Painel, Consulta, detalhe, exportar | [E] menus "Painel" e "Consulta"; exportar: G-O-11 |
| **Tratar** | Trâmite (T2, T6), pausar (T3), retomar (T4), alterar prioridade, criar plano, solicitar reinspeção | [E] papel Ronda "Tratamento de Ocorrências" |
| **Concluir** | T5 individual, em lote e via API | Não documentada separadamente no produto atual: **separação aprovada** (D-010) |
| **Confirmar vínculo** | Decidir a sugestão da D-005 | [Em aberto] D-005b |
| **Autorizar exceção de conclusão** | Concluir sem atender às condições do tipo | [Em aberto] |
| **Configurar tipo** | Inclui as condições de conclusão | [E] somente administrador |

Regras transversais:
- Toda permissão é limitada ao **escopo de localização** do usuário [CLAUDE.md].
- Ações de integração são executadas pelo sistema e registradas com a origem.
- Na etapa 5, o protótipo precisará de uma atribuição provisória dessas permissões aos perfis da D-001. Ela será apresentada para validação antes da implementação.

---

## 4. Efeitos por dimensão

| Dimensão | Regra | Situação |
|---|---|---|
| **Planos de ação** | Ciclo independente. Pausar ou concluir a ocorrência não pausa, conclui nem cancela planos. | [C] |
| | Criar plano em ocorrência concluída: DP-08. | [Em aberto] |
| **Reinspeções** | Solicitada pela ocorrência; programada e executada por Rotinas; resultado e evidências no histórico da original, inclusive se ela já estiver concluída (seção 7). | [D] D-006 + [Aprovado] DP-15 |
| | Concluir com reinspeção solicitada e não executada: DP-09. | [Em aberto] |
| **Notificações** | Existentes: inalteradas [E]. | [E] |
| | Novas: seção 5 (somente no sino). | [Aprovado] DP-07 |
| **Histórico** | Toda transição, alteração de prioridade, justificativa de pausa, vínculo, solicitação e resultado de reinspeção e exceção gera registro com ator (pessoa ou sistema/origem), data e motivo. | [C] + [Aprovado] DP-03 |
| | Registros automáticos ficam no histórico, mas **não são trâmite humano**: não afetam o tempo de resposta nem a regra "≥ 1 trâmite". | [Aprovado] DP-06 |
| **Indicadores** | Tempo de resposta = registro → 1º trâmite humano. Tempo de solução descontando pausas. Abertas × fechadas × saldo. | [E] + [Aprovado] DP-02 |

---

## 5. Notificações novas — [Aprovado para o protótipo] DP-07

### 5.1 Princípios

1. **Não alterar as notificações existentes**: Monitoramento (tipo "Monitorado"), aviso sonoro e e-mails do tipo continuam como hoje, com os mesmos gatilhos.
2. As notificações novas aparecem **somente no sino** (central de notificações do protótipo; leitura individual por usuário, P-12).
   - **Nenhum disparo novo** de e-mail, som ou Monitoramento.
   - Sem toast persistente: são informativas, não críticas.
3. Destinatários sempre filtrados por **permissão e escopo de localização** do local da ocorrência.
4. **Uma notificação por destinatário elegível para cada evento**, sem duplicação do mesmo evento para o mesmo destinatário.
5. Mudanças de status (T2 a T5) **não geram notificação nova**. Ficam só no histórico; o Painel e o Monitoramento já refletem o status.
6. Ao clicar, a notificação abre o detalhe da ocorrência na seção relevante.
7. **Nenhuma notificação executa ação.** Em particular, N3 informa que a ocorrência **pode** ser concluída; a conclusão continua sendo um ato humano (T5).

### 5.2 Eventos

| # | Evento | Destinatários propostos | Conteúdo | Ação ao clicar | Dependências |
|---|---|---|---|---|---|
| N1 | **Sugestão de vínculo disponível** (D-005) | Quem tem a permissão de confirmar vínculo no escopo do local da nova ocorrência | Identificador, tipo e local da nova ocorrência; ocorrência(s) candidata(s); motivo da sugestão (ex.: "gerada por reinspeção da ocorrência X") | Abre a sugestão para confirmar ou manter independente | Destinatários dependem da **D-005b** [Em aberto] |
| N2 | **Resultado de reinspeção recebido** (D-006) | Quem solicitou a reinspeção e quem tem **Tratar** no escopo da ocorrência original | Resultado (OK / não OK; tradução: D-006c), executor, data e hora da execução, quantidade de evidências. Se a original já estiver concluída: "registrado no histórico, sem reabertura" | Abre o histórico da original no registro da reinspeção | Tradução OK/não OK: **D-006c** [Em aberto] |
| N3 | **Condições de conclusão atendidas** | Quem tem **Concluir** no escopo | "A ocorrência X pode ser concluída: atende às condições configuradas" (ex.: reinspeção OK registrada) | Abre o detalhe com o botão Concluir; **não conclui** | Só para tipos com condições configuradas (seção 6) |

**Regra de disparo da N3 [Aprovado]:**
- Gerada no momento em que a ocorrência **passa a atender** às condições de conclusão.
- **Não se repete** em atualizações posteriores (novos trâmites, novos planos, mudança de prioridade) **enquanto a ocorrência permanecer elegível**.
- Leitura direta da regra aprovada (a confirmar): se a ocorrência **deixar de ser elegível** e depois **voltar a ser** (ex.: novo resultado de reinspeção não OK seguido de OK), conta como uma nova passagem para elegível e gera nova N3.
- Uma ocorrência Em pausa que atenda às demais condições **não é elegível**, porque não pode ser concluída (DP-04a). A N3 só é gerada quando ela for retomada e as condições estiverem atendidas.

### 5.3 Fora da proposta (registrado para evitar suposição)

- **Feedback de conclusão em lote:** retorno **em tela** ao usuário que executou (lista das concluídas e das mantidas abertas com o motivo, DP-14), não uma notificação.
- **Reinspeção não realizada:** depende da **D-006e** [Em aberto].
- **Aprovação de conclusão:** depende da **DP-13** [Em aberto].
- **Alertas de prazo de planos e ações** (atrasada, em risco, vencido) [C]: pertencem ao ciclo do plano e serão tratados com ele.

---

## 6. Conclusão: regra atual + condições do tipo — [Aprovado] DP-04

### 6.1 Princípio

- Sem configuração no tipo, vale **exatamente** a regra atual de T5.
- Com configuração, as condições são **adicionais**. Se alguma não for atendida, "Concluir" mostra a lista de pendências.
- Na conclusão em lote, as ocorrências que não atendem são **mantidas abertas e identificadas com o motivo** [Aprovado DP-14].

### 6.2 Exigência de plano de ação — [Aprovado] DP-10

**Regras:**

1. **Existir um plano não é o mesmo que o plano estar concluído.** O modo configurado no tipo diz qual das duas coisas é exigida.
2. **Plano Cancelado nunca satisfaz** a exigência.
3. A ocorrência só pode ser concluída com plano ainda ativo **se o modo configurado permitir**.

**Modos do parâmetro "Exige plano de ação" do tipo:**

| Modo | Condição para Concluir | Plano Cancelado |
|---|---|---|
| **Não exige** (padrão; sem configuração) | Regra atual | — |
| **Exige plano iniciado** | ≥ 1 plano associado em Em andamento, Aguardando aprovação, Pausado ou Concluído. Permite concluir com plano ativo. | Não satisfaz |
| **Exige plano concluído** | ≥ 1 plano associado **e** todos os planos associados não cancelados em Concluído | Não satisfaz; fica fora da conta |

**Continuam em aberto dentro da DP-10:**
- **DP-10a:** se um plano em **Rascunho** bloqueia a conclusão. Pela lista aprovada, Rascunho não conta como "plano iniciado". A dúvida é se, no modo "Exige plano concluído", um plano em Rascunho impede a conclusão ou fica fora da conta.
  - Ampliada em 2026-11-06 (ajuste do P.O. sobre a DP-23): também decidir se um plano **vinculado depois da criação** da ocorrência passa a contar para o requisito. O efeito de um novo plano relacionado (DP-23) sobre a conclusão fica condicionado a esta decisão.
  - **Aprovada com ressalva em D-013:** Rascunho bloqueia no modo "Exige plano concluído"; planos vinculados depois da criação também contam; a elegibilidade é recalculada com aviso ao usuário quando muda; ocorrências concluídas não são reabertas nem alteradas.
- **DP-10b:** se a **eficácia** do plano será condição adicional.
  - Decidido em D-010: **não acrescentar nesta etapa**, preservando a distinção entre execução e eficácia [C] e evitando acoplamento entre os ciclos do plano e da ocorrência.

**Relação com a Q-06** (docs/06: "ocorrência pode ser encerrada enquanto plano preventivo continua ativo"):

| Leitura da Q-06 | Consequência para a DP-10 |
|---|---|
| (a) "plano preventivo" = **plano de ação** de caráter preventivo | O modo "permite concluir com plano ativo" é exatamente o caso previsto em docs/06. A resposta confirma que esse modo é necessário. |
| (b) "plano preventivo" = **plano preventivo da Manutenção** | Não é plano de ação; não entra na contagem da DP-10. A permissão de concluir com plano de ação ativo passa a ser só uma opção de configuração, não uma regra consolidada. |

Em ambas as leituras, a DP-10 revisada se mantém. A Q-06 decide apenas se o modo intermediário tem respaldo consolidado ou é opção nova.

### 6.3 Demais condições

| Parâmetro do tipo [C] | Condição para "Concluir" | Situação |
|---|---|---|
| Exige reinspeção | O **último** resultado de reinspeção é **OK** | [Aprovado] DP-11 (tradução OK/não OK: D-006c [Em aberto]) |
| Critério = Manual | Regra atual | [E] |
| Critério = Por reinspeção | Resultado OK **habilita** "Concluir", sem conclusão automática. Não OK mantém aberta e adiciona evidência | [Aprovado] DP-12 + [C] |
| Critério = Por aprovação | Quem aprova e efeito da recusa | [Em aberto] DP-13 |
| Evidência / justificativa obrigatória na conclusão | Exigida se configurada | [C] |
| Exceção autorizada | Concluir sem atender às condições, com motivo e histórico; quem autoriza está em aberto | [C] + [Em aberto] |
| Reinspeção solicitada e não executada | DP-09 | [Em aberto] |

---

## 7. Reinspeção Não Conforme × geração automática — [Aprovado] DP-15 (alternativa C)

### 7.1 Regras aprovadas

1. A ocorrência **original sempre recebe** o resultado e as evidências da reinspeção. A relação é conhecida, porque foi a original que solicitou.
2. Rotinas **preserva** a regra atual: item Não Conforme com tipo de ocorrência, em ponto com local físico, gera nova ocorrência automaticamente.
3. A nova ocorrência **pode receber sugestão de vínculo** com a original, conforme a D-005.
4. O vínculo **não funde históricos** e **depende de confirmação** de usuário autorizado.
5. Se o resultado chegar **depois da conclusão** da original (ex.: execução offline sincronizada mais tarde):
   - o resultado é registrado no histórico da original, **sem reabertura automática**;
   - a nova ocorrência, quando gerada, **permanece como registro do problema identificado**.

### 7.2 Fluxo

```
[Ocorrência original] ──solicita──► [Rotinas] programa e executa (app, online/offline)
                                                │ sincronização
          ┌─────────────────────────────────────┴───────────────────────────────┐
          ▼ (sempre)                                                            ▼ (se configurado: tipo no item + local no ponto)
 Histórico da original recebe                                     Regra existente gera NOVA ocorrência
 resultado + evidências                                           (registro do problema identificado)
 (se Concluída: só registra, sem reabrir)                                       │ D-005
                                                                                ▼
                                                    Sugestão de vínculo com a original
                                                    ── confirmada: relacionadas, históricos próprios
                                                    ── não confirmada: permanece independente
```

### 7.3 Detalhes que acompanham a aprovação

- A nova ocorrência registra no histórico que nasceu de uma reinspeção da ocorrência X. É informação, não vínculo.
- A sugestão desse caso aparece mesmo que os critérios gerais da D-005a não a capturem, porque a relação é conhecida.
- Alternativa **D** (supressão configurável e explícita da nova ocorrência): **registrada como evolução**, a avaliar com clientes. Não aprovada.

---

## 8. Resumo do que está definido e do que continua em aberto

**Definido** (existente, consolidado, D-005 a D-008 ou aprovado em D-009):
- os quatro status;
- "Concluir";
- primeiro trâmite humano encerra o tempo de resposta;
- pausa com justificativa, desconto de tempo e bloqueio só da alteração de prioridade;
- conclusão = regra atual + condições do tipo;
- registros automáticos não são trâmite;
- "Exige reinspeção" = último resultado OK;
- reinspeção OK habilita, mas não conclui;
- conclusão em lote preserva e identifica;
- alternativa C para a reinspeção Não Conforme;
- sem reabertura;
- planos com ciclo independente.

Também definidos (D-010):
- Em pausa nunca conclui, em nenhum canal;
- permissões conceituais separadas (sem matriz);
- notificações N1–N3 só no sino, sem duplicação e com N3 disparada na passagem para elegível;
- dois modos de exigência de plano, sem contar plano cancelado.

**Propostas aguardando validação:** nenhuma.

**Em aberto:**
- DP-08, DP-09 e DP-13;
- DP-10a (plano em Rascunho);
- DP-10b (eficácia como condição; fora desta etapa);
- confirmação da leitura de reelegibilidade da N3 (seção 5.2);
- matriz de perfis e permissões;
- D-005a/b/c/d e D-006a/b/c/e;
- autorização de exceção;
- Q-06 (afeta a DP-10 só na forma descrita em 6.2);
- Q-15;
- G-O-02/03.

**Próximo passo da Q-02:** ciclos de ação, plano de ação, solicitação e ordem de serviço.
