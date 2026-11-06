# Q-02 — Pendências restantes e dependências Q-05, Q-06 e Q-09

> **Situação:** revisão 2, em 2026-11-06. **Validado pelo P.O. em D-013.** O resultado de cada item está na seção 0.1, que prevalece sobre o texto da análise. Na revisão 1, nenhum item estava aprovado. As recomendações são **[Proposta]**; o que não tem base suficiente fica **[Em aberto]**.
>
> **Base:**
> - decisões D-001 e D-005 a D-012;
> - `q02-ciclo-de-vida-da-ocorrencia.md` e `q02-ciclos-plano-acao-solicitacao-os.md` (revisão 3.1);
> - referência de Rotinas e Ocorrências (`docs/referencias/rotinas-e-ocorrencias-atual.md`);
> - docs/00, 02, 04, 05, 06, 09, PRDs e matriz de fases (só leitura).
>
> Não altera docs/00, docs/05, docs/06 nem PRDs. Nada implementado.

## 0. Marcas e como ler

| Marca | Significado |
|---|---|
| **[E]** | Comportamento existente do produto (referência Q-03). |
| **[C]** | Consolidado em docs ou PRD. |
| **[Aprovado]** / **[Diretriz]** | Já decidido (D-005 a D-012). Usado só como base, não reaberto. |
| **[Proposta]** | Recomendação desta análise, **não aprovada**. |
| **[Em aberto]** | Continua sem decisão. |

Cada item traz: a pergunta, a base que já existe, as alternativas, a recomendação e os impactos.

### 0.1 Validação do P.O. — D-013 (2026-11-06)

**Prevalência:** onde esta tabela diverge do texto das seções 1 a 6, **vale a tabela**. As seções mantêm a análise original como histórico.

| Item | Resultado | O que vale |
|---|---|---|
| DP-08 | **Aprovado** | Vínculo de plano a ocorrência concluída, com permissão e justificativa, sem reabertura nem alteração do histórico original. |
| DP-09 / D-006e | **Aprovado** | Como em 1.2. |
| DP-13 | **Aprovado** | Como em 1.3. Quem aprova e a segregação continuam [Em aberto]. |
| N3 | **Aprovado com ajuste** | Nova notificação **somente** a cada nova transição de não elegível para elegível, **uma vez por destinatário e por ciclo**. |
| Exceção | **Aprovado com ajuste** | Dispensa **somente** condições configuradas no tipo. Não dispensa a DP-04a nem regras gerais. Registra as condições dispensadas, o **autorizador** e a justificativa. Se a mesma pessoa pode pedir e autorizar continua [Em aberto]. |
| D-005a–d | **Aprovado com ajustes** | Critérios principais: tipo e local. Ativo é fator de relevância. Janela configurável, sem padrão. Não se aplica a pânico. **Expiração explícita:** a sugestão expira quando **perde a utilidade**, ou seja, quando qualquer das duas ocorrências é concluída ou quando já existe um vínculo entre elas, sempre com registro "sugestão expirada" e o motivo. Local ancestral/descendente e registro manual na web continuam [Em aberto]. |
| D-006a–c | **Aprovado com ajuste** | Reinspeção por **rotina não agendada, de execução única, programada pelo gestor**, sem geração automática. **Preservar os critérios de resultado existentes** (classificação Conforme/Não Conforme e corte de Nota). Execuções Incompleta, Interrompida ou Finalizada Parcialmente continuam [Em aberto]. |
| DP-10a | **Aprovado com ressalva** | Rascunho bloqueia no modo "exige plano concluído"; planos vinculados depois também contam. **Ressalva:** a elegibilidade é recalculada e o usuário é avisado quando ela muda. Ocorrências concluídas não são reabertas nem alteradas. |
| Eficácia | **Aprovado com ajuste** | Plano relacionado somente com eficácia Parcial ou Ineficaz. Avaliador e data prevista obrigatórios na conclusão do plano. **A avaliação pode continuar pendente** após a conclusão. |
| Cancelar ação com plano pausado (2.4) | **Não validado** | Continua [Proposta]. |
| DP-38 (destinos) | **Aprovado** | Como em 3.1. |
| DP-50 (permissão de retorno) | **Não validado** | Continua [Proposta] (3.2). |
| DP-48 | **Aprovado** | Registra tempo total e líquido, **sem desconto de SLA** até a regra ser definida. O gestor autoriza a suspensão e o técnico registra o impedimento. Motivos configuráveis sem padrão. |
| DP-51 | **Ajustado: nova proposta** | O gestor **não pode** registrar como concluída uma execução não concluída; a alternativa (c) foi descartada. **Proposta nova:** status de execução **"Interrompida"**, com justificativa, responsável e trabalho parcial preservado, permitindo depois cancelar a OS. Detalhe em `q02-ciclos-plano-acao-solicitacao-os.md`, seção 6.7. **Aguardando validação.** |
| Matriz (1.8) | **Aprovado só como demonstrativa** | Vale exclusivamente para o protótipo, com os seis perfis da D-001. **Não** é a matriz definitiva do produto. |
| Q-05 | **Aprovado** | "Unidade/filial" = nó Unidade da hierarquia de localização; estrutura organizacional separada. **Ativo em dois grupos com valores conflitantes: [Em aberto]**, sem precedência definida até nova análise. Os demais pontos da seção 4 (grupos corporativos × locais; níveis por capacidade) continuam [Proposta]. |
| Q-06 | **Aprovado** | Distinguir **Plano de Ação** (capacidade compartilhada) de **Plano de Manutenção Preventiva** (funcionalidade de Gestão de Manutenção). **Não criar o campo "Natureza"** sem decisão específica. |
| Q-09 | **Aprovado como ampliação do escopo do protótipo** | Visão móvel demonstrativa de "Minhas OS" e execução, online, na aplicação GRS, sem o app de Rotinas. Offline como evolução futura. **Não define tecnologia nativa nem arquitetura mobile definitiva.** |

**Fora deste documento (mantidos como estão):**
- DP-25a, DP-25b e DP-25c: orientações para análise futura (D-012);
- DP-10b: eficácia como condição, fora desta etapa (D-010);
- Q-15 e Q-19: não pedidas nesta rodada.

---

## 1. Ocorrência

### 1.1 DP-08 — Vincular plano a ocorrência concluída

**Base:**
- A ocorrência concluída não é reaberta (D-009).
- Resultado de reinspeção que chega depois da conclusão é só registrado no histórico (DP-15).
- O plano pode ser criado avulso a qualquer momento (D-011), então a dúvida é só sobre o **vínculo**.

| Alternativa | Efeito |
|---|---|
| (a) Proibir | Simples, mas perde rastreabilidade quando o tratamento definitivo vem depois da conclusão (ex.: medida preventiva decidida na análise posterior). |
| (b) Permitir com permissão e justificativa | Vínculo registrado no histórico dos dois lados; a ocorrência continua Concluída. |
| (c) Permitir livremente | Rastreável, mas sem controle sobre quem altera o registro de uma ocorrência concluída. |

**Recomendação [Proposta]: (b).**
- Exige a permissão de vincular do plano (DP-25b, quando decidida) **e** "Tratar" ou "Concluir" na ocorrência (a definir na matriz).
- A justificativa é obrigatória.
- O vínculo **não reabre** a ocorrência e **não tem efeito** sobre condições de conclusão, que já não se aplicam.
- O vínculo entra no histórico como registro automático, não como trâmite (DP-06).

### 1.2 DP-09 e D-006e — Reinspeção solicitada e não executada

**Base:**
- "Exige reinspeção" é atendida pelo **último** resultado OK (DP-11).
- Em Rotinas [E], uma rotina pode terminar como "Não realizada". O momento em que isso acontece não está documentado (G-R-05).
- [E] Rotina **agendada** não executada gera ocorrência automaticamente.

Há três situações possíveis:

| Situação | Recomendação [Proposta] |
|---|---|
| Tipo **exige reinspeção** e existe pedido aguardando resultado | **Bloqueia "Concluir"** com a pendência "reinspeção solicitada aguardando resultado", mesmo que exista um OK anterior: o último resultado ainda não é conhecido. A exceção autorizada continua possível. |
| Tipo **não exige** reinspeção, mas alguém pediu | **Não bloqueia.** "Concluir" mostra um aviso. O pedido segue em Rotinas, porque Ocorrências não cancela atividade de Rotinas. Um resultado que chegue depois é registrado no histórico, como na DP-15. |
| Reinspeção termina **Não realizada** (D-006e) | O pedido é encerrado sem resultado e o desfecho vai para o histórico da ocorrência. **Não atende** "exige reinspeção". O usuário pode solicitar outra. |

**Interação com o existente:**
- Se a reinspeção virar uma rotina **agendada** (D-006a) e não for executada, a regra existente gera uma ocorrência nova.
- Proposta: preservar esse comportamento, coerente com a alternativa C da DP-15. A nova ocorrência recebe sugestão de vínculo (D-005) e nada é suprimido.
- Se a reinspeção for **não agendada**, a documentação não indica geração automática ao ficar "Não realizada". Nesse caso, não presumir.

**[Em aberto]:** se o pedido de reinspeção pode ser cancelado pelo solicitante em Ocorrências. Isso depende de como ele vira atividade em Rotinas (D-006a).

### 1.3 DP-13 — Critério de conclusão "Por aprovação"

**Base:**
- O critério está previsto no tipo [C].
- Os quatro status são mantidos (DP-01), então não pode haver um status "Aguardando aprovação" na ocorrência.

**Recomendação [Proposta]:** a aprovação é uma **pendência dentro de Em andamento**, não um status.

1. O usuário com "Concluir" **solicita a conclusão**. As demais condições do tipo precisam estar atendidas.
2. A ocorrência continua Em andamento, com o indicador "Conclusão aguardando aprovação".
3. O aprovador **aprova**, e a ocorrência passa a Concluída, ou **recusa com motivo**, e ela continua Em andamento.
4. Pedido, aprovação e recusa são registros automáticos no histórico e não contam como trâmite (DP-06).
5. Pausar a ocorrência **cancela** o pedido pendente, por coerência com a DP-04a. Ao retomar, é preciso pedir de novo.
6. Se outra condição deixar de ser atendida depois do pedido (ex.: reinspeção nova Não OK), o pedido também é cancelado, com registro.

**Notificações [Proposta]:** pelo sino, ao aprovador quando há pedido e ao solicitante quando há decisão, seguindo os princípios da DP-07.

**[Em aberto]:**
- quem é o aprovador: uma permissão "aprovar conclusão" no escopo do local, ou uma pessoa ou papel configurado no tipo;
- se o próprio solicitante pode aprovar (segregação).

### 1.4 Reelegibilidade da N3 (confirmação pendente da D-010)

**Pergunta:** se a ocorrência deixa de atender às condições de conclusão e volta a atender, a N3 ("pode ser concluída") é gerada de novo?

**Recomendação [Proposta]: sim.**
- A N3 é gerada **a cada passagem** de não elegível para elegível.
- Enquanto a ocorrência continua elegível, não há repetição (D-010).
- Exemplos de nova passagem: reinspeção Não OK seguida de OK, ou um plano novo que conta para a exigência e depois é concluído.
- **Motivo:** sem isso, o responsável não seria avisado justamente da situação nova.

### 1.5 Autorização de exceção

**Base:**
- A exceção autorizada existe como conceito [C].
- A permissão "autorizar exceção" foi aprovada como permissão separada (DP-05).

**Recomendação [Proposta]:**
- Autorizar exceção é **concluir sem atender a uma ou mais condições do tipo**. Exige a permissão "autorizar exceção" no escopo do local e justificativa obrigatória.
- O histórico registra **quais condições foram dispensadas**.
- A exceção **não dispensa a DP-04a**: uma ocorrência Em pausa precisa ser retomada antes.
- A exceção **não dispensa** a regra atual do produto [E] (T5). Ela só dispensa as condições adicionais do tipo.
- **[Em aberto]:** se a mesma pessoa pode pedir e autorizar.

### 1.6 D-005a a D-005d — Sugestão de vínculo após sincronização

| Subitem | Recomendação [Proposta] |
|---|---|
| **D-005a** Critérios | Ocorrência aberta (não Concluída) do **mesmo tipo** e no **mesmo local físico**. A coincidência de ativo, quando ambos têm ativo, **aumenta a relevância**, mas não é obrigatória. Janela de tempo **configurável, sem valor padrão** (como na DP-26). Local ancestral ou descendente: [Em aberto]. |
| **D-005b** Quem confirma | Já respondido conceitualmente pela permissão "Confirmar vínculo" (DP-05). Falta só a matriz. |
| **D-005c** Outras origens automáticas | Aplicar a **rotina não executada** e a **ocorrência registrada no app**. **Não aplicar ao pânico**: o pânico não deve ganhar nenhuma etapa de análise, nem informativa. Registro manual na web: [Em aberto], porque a sugestão na hora do registro seria outra funcionalidade. |
| **D-005d** Sugestão não decidida | Fica **pendente** enquanto as duas ocorrências estiverem abertas. Expira **automaticamente** quando uma delas é concluída, com registro "sugestão expirada sem decisão". Não há expiração por tempo. |

### 1.7 D-006a a D-006c — Reinspeção em Rotinas

| Subitem | Base | Recomendação [Proposta] |
|---|---|---|
| **D-006a** Como o pedido vira atividade e quem programa | [E] Rotinas tem rotinas agendadas e **não agendadas** (com "Termina após X execuções"). | O pedido feito em Ocorrências aparece **em Rotinas como pedido pendente**. O **gestor de Rotinas** programa a atividade, normalmente como **rotina não agendada de 1 execução** no local ou ponto de controle de origem. O solicitante sugere data e checklist, mas não programa. **Nada é criado automaticamente**, coerente com a DP-49 e com a propriedade dos dados por Rotinas. Alternativa: criação automática configurável, mais rápida, mas que cria atividade em outro módulo sem decisão humana. |
| **D-006b** Checklist | [E] Pontos de controle têm checklists associados. | Sugerir o checklist que originou a não conformidade, quando a origem é Rotinas. Permitir escolher outro entre os disponíveis no ponto de controle. Para ocorrência sem origem em Rotinas, a escolha é obrigatória. |
| **D-006c** Tradução em OK / não OK | [E] Cada resposta já é classificada como Conforme ou Não Conforme, inclusive "Nota", pelo corte "Nota para Não Conforme". | **OK = a execução da reinspeção terminou sem nenhuma resposta Não Conforme. Não OK = ao menos uma Não Conforme.** A regra usa a classificação existente, sem novo parâmetro. Execução Incompleta, Interrompida ou Finalizada Parcialmente: [Em aberto]. Proposta provisória: **não conta como resultado** e fica registrada como "reinspeção sem resultado conclusivo". |

### 1.8 Matriz de perfis — proposta demonstrativa (somente para o protótipo)

A DP-05 aprovou as permissões **sem** matriz. A tabela abaixo é **[Proposta]** só para os perfis demonstrativos da D-001, para que o protótipo tenha um comportamento verificável. Não é a matriz do produto.

| Permissão | Adm. Corporativo | Gestor Local | Gestor de Segurança | Gestor de Manutenção | Técnico | Operador de Rotinas |
|---|---|---|---|---|---|---|
| Ocorrência: registrar / consultar | ✓ | ✓ | ✓ | consultar | — | registrar (app) |
| Ocorrência: tratar / concluir | ✓ | ✓ | ✓ | — | — | — |
| Confirmar vínculo / autorizar exceção | ✓ | ✓ | ✓ | — | — | — |
| Configurar tipo de ocorrência | ✓ | — | — | — | — | — |
| Plano: criar / ser responsável | ✓ | ✓ | ✓ | ✓ | — | — |
| Ação: executar (as atribuídas) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Plano: aprovar / avaliar eficácia | ✓ | ✓ | ✓ | — | — | — |
| Solicitação: abrir | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Solicitação: triar / retomar triagem | ✓ | — | — | ✓ | — | — |
| OS: planejar, suspender, cancelar, encerrar | ✓ | — | — | ✓ | — | — |
| OS: executar (as atribuídas) | — | — | — | ✓ | ✓ | — |

Toda permissão vale **dentro do escopo de local** do perfil. **Para validar:** se Gestor Local deve tratar ocorrências e se Gestor de Manutenção deve aprovar planos.

---

## 2. Plano de ação e ação

### 2.1 DP-10a (ampliada) — Rascunho e vínculo posterior na exigência de plano

**Pergunta 1: um plano em Rascunho conta?**

| Modo do tipo | Recomendação [Proposta] |
|---|---|
| "Exige plano iniciado" | Rascunho **não satisfaz**. Já é o que diz a lista aprovada. |
| "Exige plano concluído" | Rascunho **conta como não concluído e bloqueia**. |

- **Motivo:** quem iniciou um plano sinalizou um tratamento pretendido. Se o plano não for necessário, ele deve ser **cancelado explicitamente** (P8), o que deixa decisão e histórico.
- **Alternativa:** ignorar o Rascunho, que é mais permissivo. O risco é concluir a ocorrência com um tratamento planejado e esquecido.

**Pergunta 2: um plano vinculado depois da criação da ocorrência conta?**

**Recomendação [Proposta]: sim.** A exigência fala de planos vinculados à ocorrência, não do momento do vínculo. Ignorar planos vinculados depois criaria duas categorias de plano invisíveis para o usuário.

**Consequências:**
- Vincular um plano pode **bloquear** uma ocorrência que já era elegível. Por isso a permissão e o histórico da DP-25b são importantes.
- A N3 volta a ser gerada quando o plano for concluído (item 1.4).
- Com as duas recomendações, o plano relacionado da DP-23, se vinculado a uma ocorrência aberta no modo "exige plano concluído", bloqueia a conclusão até ser concluído ou cancelado.

### 2.2 Plano relacionado quando a eficácia é Eficaz

**Recomendação [Proposta]:**
- A ação "Criar plano relacionado" fica disponível **só** para Parcialmente eficaz ou Ineficaz, como diz a D-012.
- Com eficácia Eficaz, nada impede criar um plano novo comum e vinculá-lo aos mesmos objetos (D-011), mas **sem a relação de continuidade**.
- **Motivo:** a relação de continuidade significa "o tratamento anterior não bastou". Usá-la com Eficaz distorceria os indicadores de eficácia.

### 2.3 Data prevista de avaliação de eficácia

**Recomendação [Proposta]:**
- O avaliador e a data prevista podem ser definidos a qualquer momento e passam a ser **obrigatórios na conclusão do plano** (P5/P7), quando a eficácia passa a "Pendente de avaliação".
- **Sem valor padrão** de prazo, coerente com a DP-26. A configuração poderá sugerir um prazo no futuro, depois de validado.
- O indicador "avaliação atrasada" usa essa data.

### 2.4 Pausa do plano: cancelar ação durante a pausa

Pendência criada pelo ajuste da revisão 3.1, seção 3.1.1.

**Recomendação [Proposta]: não permitir.** É preciso retomar o plano antes, por simetria com a DP-04a e porque a pausa congela o avanço das ações. A alternativa é permitir o cancelamento com justificativa, por ser um encerramento, não um avanço.

---

## 3. Solicitação e OS

### 3.1 Destinos externos do redirecionamento (DP-38)

| Alternativa | Efeito |
|---|---|
| (a) Texto livre | Simples, mas sem indicador confiável por destino. |
| (b) **Lista configurável de destinos** (nome e tipo: área interna sem sistema, terceiro, outro sistema), com a opção "Outro (texto)" | Permite indicadores por destino, sem integração. |
| (c) Integração com outro módulo (ex.: criar ocorrência ou atividade em Terceiros) | Viola a DP-49 sem regra explícita; Terceiros está fora do protótipo (Q-08). |

**Recomendação [Proposta]: (b).**
- O redirecionamento **não cria** objeto em nenhum destino.
- Se o destino for outro módulo do GRS, o usuário pode **criar manualmente** o objeto lá. A referência fica no histórico.
- **Nenhum destino padrão.** O protótipo usa destinos de demonstração identificados.

### 3.2 Permissão do retorno à triagem (DP-50)

**Recomendação [Proposta]:**
- O retorno usa a mesma permissão de **triar solicitação** no escopo do local da solicitação.
- O cancelamento da OS **não** dá essa permissão ao gestor que cancelou, a menos que ele também trie.
- A solicitação pode ficar indefinidamente em "Convertida em OS" com o indicador "OS cancelada — decisão da triagem pendente". Ela aparece na fila da triagem até haver decisão.
- Não há expiração automática, por coerência com "vencimento nunca conclui nem cancela".

### 3.3 Suspensão da OS: tempo, quem e motivos (DP-48)

**Desconto do tempo suspenso**

O SLA está "a definir" no PRD, então a questão de fundo continua [Em aberto].

**Recomendação [Proposta]:**
- O sistema **sempre registra** os intervalos de suspensão (já aprovado: início e término).
- A OS mostra **tempo total** e **tempo líquido** (sem suspensões).
- Qual dos dois o prazo e o SLA usam será decidido com o SLA. Possível evolução: desconto **por tipo de motivo** (ex.: "aguardando acesso" desconta; "aguardando peça" não).
- O indicador "Atrasada" usa a data prevista original até essa decisão.

**Quem suspende e retoma**

| Alternativa | Efeito |
|---|---|
| (a) Só o gestor de manutenção | Controle centralizado; o técnico depende do gestor para registrar um impedimento. |
| (b) Gestor e técnico atribuído | Ágil; o risco é suspensão sem visibilidade do gestor. |
| (c) **Gestor suspende e retoma; o técnico registra o impedimento** ao concluir a execução parcial, e o gestor é avisado | Separa quem informa de quem decide. |

**Recomendação [Proposta]: (c).** A suspensão é uma decisão sobre a OS, que é do gestor (como o encerramento na DP-47). O técnico continua dono da execução.

**Tipos de motivo:** [Proposta] lista configurável, **sem lista padrão** no produto. O protótipo usa exemplos identificados como demonstração (peça, acesso, terceiro, condição operacional).

### 3.4 Execução em andamento no cancelamento da OS (DP-51)

| Alternativa | Efeito |
|---|---|
| (a) **Exigir a conclusão da execução antes**, registrando o trabalho parcial, como na suspensão (DP-48) | Mantém dois status de execução e a responsabilidade do técnico (DP-47). Se o técnico estiver indisponível, o cancelamento fica travado. |
| (b) O cancelamento encerra a execução com um status novo ("Interrompida") | Resolve o travamento, mas cria um status de execução novo. |
| (c) Como (a), mas o gestor pode **concluir a execução em nome do técnico** com justificativa, registrada como conclusão pelo gestor | Sem status novo e sem travamento; mistura um pouco os papéis da DP-47, com histórico explícito. |

**Recomendação [Proposta]: (a) como regra, com (c) como saída excepcional.**

**[Em aberto]:** se a mesma saída (c) vale para a suspensão.

---

## 4. Q-05 — Herança de configuração em Manutenção

**Pergunta:** na hierarquia [C] empresa → unidade/filial → grupo de ativos → exceção de ativo, a "unidade/filial" pertence à estrutura organizacional ou à hierarquia de localização?

**Base:**
- **Localização** é uma entidade hierárquica única (Unidade → Prédio → Setor → Sala). A **estrutura organizacional é separada**, com mapeamento explícito [C: docs/02, PRD Geral, PRD Central].
- O **escopo de permissão** é por local [C + decisões técnicas do protótipo].
- Solicitação, OS e ativo sempre têm local. Ativo tem localização principal obrigatória [C].
- No protótipo, a estrutura organizacional (ex.: Segurança, Manutenção) mapeia **n:n** para locais. Uma área atende várias unidades, e um local tem várias áreas.

| Alternativa | Vantagens | Problemas |
|---|---|---|
| (a) **Nó de localização de nível "Unidade"** | Coerente com o escopo e com o local obrigatório de solicitação e OS. Resolução sem ambiguidade: cada objeto tem um único caminho até a raiz. | Não representa "filial" no sentido legal ou fiscal (CNPJ), que é organizacional. |
| (b) Unidade da estrutura organizacional | Combina com filial legal e com centro de custo. | O mapeamento n:n gera **ambiguidade**: um local com duas áreas herdaria duas configurações. Exige uma regra extra de desempate e um vínculo organizacional em cada objeto. |
| (c) Qualquer nó da hierarquia de localização (empresa → nó → … → grupo → ativo) | Flexível: um prédio pode ter configuração própria. | Interface de "herdado × sobrescrito" mais complexa, com risco de configuração difícil de auditar. |

**Recomendação [Proposta]: (a).** "Unidade/filial" é o **nó raiz de nível Unidade** da hierarquia de localização. A alternativa (c) fica como evolução possível.

**Regras de resolução propostas:**
1. Ordem de precedência, da mais específica para a mais geral: exceção de ativo → grupo de ativos → Unidade do local → empresa. Só níveis **explicitamente configurados** sobrescrevem [C].
2. Objeto **sem ativo** (ex.: solicitação só com local): a resolução começa na Unidade do local.
3. A interface mostra, para cada parâmetro, o valor efetivo e **de onde vem** [C].
4. **[Em aberto]:** ativo em **dois grupos** com valores diferentes para o mesmo parâmetro. Opções:
   - prioridade definida entre grupos;
   - o valor mais restritivo vence;
   - bloquear a configuração conflitante.

   Não presumir.
5. **[Em aberto]:** se grupos **corporativos** (P-34) e **locais** têm a mesma força na herança.

**Para outras configurações (impacto):**
- A Q-05 trata **de Manutenção**. Proposta: cada capacidade declara os níveis que usa, sem herdar automaticamente este modelo.
- Para a configuração de Planos de Ação (DP-25c, DP-26), proposta mínima: **empresa → Unidade**, sem grupo de ativos nem ativo, porque o plano tem local, mas nem sempre tem ativo.
- Para regras de geração (DP-49), a regra declara o local ou grupo de aplicação, e a herança se aplica só aos **parâmetros** dela.

**Impacto em documentos:** nenhum texto precisa mudar se (a) for aprovada, porque "unidade/filial" só ganha interpretação. Um esclarecimento em docs/05 e no PRD fica para quando houver autorização.

---

## 5. Q-06 — "Plano preventivo" em docs/06

**Pergunta:** em "ocorrência pode ser encerrada enquanto plano preventivo continua ativo", trata-se de plano de ação preventivo ou do plano preventivo da Manutenção?

**Base:**
- No PRD de Ocorrências, a frase está **no mesmo parágrafo** que define a relação ocorrência–plano de ação: "Uma ocorrência pode ter vários planos; cada plano possui várias ações. Concluir ação não resolve automaticamente ocorrência. Ocorrência pode ser encerrada enquanto plano preventivo continua ativo."
- Em docs/05 e no PRD de Manutenção, "planos preventivos" é capacidade de **planejamento** (fase 2: recorrência, calendários, recursos) e é uma das **origens de solicitação**. Nenhum documento relaciona o plano preventivo da Manutenção ao ciclo da ocorrência.

**Recomendação [Proposta]: leitura (a), plano de ação de caráter preventivo.** É a leitura que o contexto do parágrafo sustenta.

**Consequências:**
- O modo "exige plano iniciado" da DP-10, que permite concluir a ocorrência com plano ativo, passa a ter **respaldo consolidado**. Ele é exatamente o caso descrito.
- A DP-10 aprovada não muda.
- **Terminologia [Proposta]:** em todos os textos do GRS, usar "plano de ação" e "**plano de manutenção preventiva**" (Manutenção), sem a forma ambígua "plano preventivo". Em DP-49, a origem "plano preventivo" passa a ser lida como plano de manutenção preventiva.
- **[Em aberto]:** se o plano de ação precisa de um atributo de **natureza** (corretiva ou preventiva). A frase sugere a distinção, mas nenhum documento define esse campo. **Não criar o campo sem decisão.**

**Impacto em documentos:** esclarecer a frase em docs/06 e no PRD de Ocorrências **somente com autorização**.

---

## 6. Q-09 — Experiência móvel do técnico na execução de OS

**Pergunta:** a execução de OS pelo técnico precisa de uma experiência móvel própria, como Rotinas?

**Base:**
- [C] O escopo consolidado prevê experiência móvel própria **só para execução de rotinas** (docs/00, docs/09, CLAUDE.md, matriz de fases: "experiência móvel demonstrativa para Rotinas"). O restante é desktop-first responsivo.
- [C] A execução de OS tem início, andamento, conclusão, responsáveis, comentários, evidências e histórico (PRD de Manutenção, requisito 6). Não há menção a celular nem a modo offline.
- [E] O app de Rotinas é um produto existente com conceitos próprios (plano, rotina, ponto de controle, checklist). Não deve ser redesenhado.

| Alternativa | Efeito |
|---|---|
| (a) Nenhuma experiência móvel específica: telas web responsivas | Dentro do escopo consolidado. Risco: a validação com clientes pode questionar como o técnico trabalha em campo. |
| (b) **Visão móvel demonstrativa de "Minhas OS" e da execução**, online, dentro da mesma aplicação | Responde à pergunta do cliente sem criar outro app nem offline. **Amplia o escopo consolidado**, por isso exige decisão. |
| (c) Executar OS dentro do app de Rotinas | Mistura domínios (Manutenção é dona da OS) e altera o app existente. **Não recomendado.** |
| (d) App próprio com modo offline | Maior valor de campo e maior escopo: fila offline, conflitos de sincronização, evidências locais. Precisa de definição de produto inexistente hoje. |

**Recomendação [Proposta]: (b) para o protótipo, com (d) registrada como evolução.**
- Escopo mínimo de (b):
  - lista "Minhas OS" do técnico;
  - detalhe da OS;
  - iniciar e concluir execução;
  - comentários e evidências (foto simulada);
  - registrar impedimento (item 3.3).
- Sem modo offline. A tela deixa claro que a execução requer conexão, para não sugerir uma capacidade inexistente.
- Rotinas e Manutenção continuam com experiências separadas. Um técnico que também execute rotinas usa cada experiência no seu módulo.

**[Em aberto]:**
- se a validação com clientes exige demonstrar offline para OS;
- se o técnico pode abrir solicitação pelo celular, o que é coerente com "Solicitação: abrir" na matriz demonstrativa.

---

## 7. Resumo das recomendações (todas [Proposta])

| # | Recomendação |
|---|---|
| DP-08 | Vincular plano a ocorrência concluída com permissão e justificativa, sem reabrir |
| DP-09 / D-006e | Tipo exige reinspeção: pedido pendente bloqueia. Tipo não exige: só aviso. Não realizada não conta como resultado |
| DP-13 | Aprovação da conclusão como pendência dentro de Em andamento; pausa cancela o pedido |
| N3 | Nova notificação a cada passagem para elegível |
| Exceção | Dispensa só condições do tipo; registra quais; não dispensa DP-04a nem a regra atual |
| D-005a–d | Mesmo tipo e local, ativo como relevância, janela sem padrão; vale para rotina não executada e app, não para pânico; sugestão expira na conclusão |
| D-006a–c | Pedido pendente em Rotinas programado pelo gestor (não agendada, 1 execução); checklist de origem sugerido; OK = nenhuma resposta Não Conforme |
| Matriz | Proposta demonstrativa para os perfis da D-001 |
| DP-10a | Rascunho bloqueia no modo "exige plano concluído"; vínculo posterior conta |
| Eficácia | Plano relacionado só com Parcial ou Ineficaz; avaliador e data obrigatórios na conclusão, sem padrão |
| Pausa do plano | Cancelar ação exige retomar antes |
| DP-38 | Lista configurável de destinos, sem criar objeto no destino |
| DP-50 | Retorno com a permissão de triagem, sem expiração |
| DP-48 | Registrar tempo total e líquido; gestor suspende, técnico registra impedimento; motivos configuráveis sem padrão |
| DP-51 | Concluir execução antes; gestor conclui em nome do técnico como exceção |
| Q-05 | "Unidade/filial" = nó Unidade da hierarquia de localização; conflito entre grupos em aberto |
| Q-06 | Plano de ação preventivo; terminologia "plano de manutenção preventiva" |
| Q-09 | Visão móvel demonstrativa online para OS; offline como evolução |
