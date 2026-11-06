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

### D-005 — Geração automática de ocorrências e sugestão de vínculo (G-I-04)
- Data: 2026-11-06
- Tema: Integração Rotinas ↔ Ocorrências
- Decisão:
  - **Existente (preservado sem alteração):** não conformidade de checklist com tipo de ocorrência, em ponto de controle com local físico, gera a ocorrência automaticamente.
  - **Evolução GRS:** depois da sincronização, Ocorrências avalia possíveis relacionamentos entre a ocorrência gerada e ocorrências abertas e **sugere** o vínculo.
  - Só um usuário autorizado confirma o vínculo. Se ele não confirmar, a nova ocorrência permanece independente.
  - A sugestão nunca impede, adia ou desfaz a geração automática.
  - O vínculo confirmado relaciona ocorrências que mantêm históricos próprios (docs/06). Não há fusão.
- Motivo: preservar o comportamento atual de Gestão de Rotinas e acrescentar a deduplicação assistida prevista em docs/04 e no PRD de Rotinas.
- Ainda a definir (não presumir):
  - **D-005a:** critérios de elegibilidade da sugestão (mesmo tipo, local, ativo, janela de tempo?). O PRD de Rotinas já marca esse ponto como "a definir".
  - **D-005b:** perfil/permissão que confirma o vínculo.
  - **D-005c:** se a avaliação vale também para outras origens automáticas: rotina não executada, ocorrência registrada no app, pânico.
  - **D-005d:** o que acontece com a sugestão não decidida (expira? permanece pendente?).
- Impactos: `docs/referencias/rotinas-e-ocorrencias-atual.md` (seções 3, 4 e 4.1). Sem impacto em telas até a etapa 5.
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

### D-006 — Reinspeção usa a execução de Gestão de Rotinas (G-I-05)
- Data: 2026-11-06
- Tema: Integração Rotinas ↔ Ocorrências
- Decisão:
  - Gestão de Ocorrências pode **solicitar** uma nova inspeção para a ocorrência.
  - Gestão de Rotinas continua responsável por **programar e executar** a inspeção, com os mesmos conceitos existentes (plano, rotina, ponto de controle, checklist), inclusive pelo aplicativo mobile e offline.
  - O resultado e as evidências retornam para a ocorrência, preservando o histórico dos dois lados.
  - Não existe mecanismo de inspeção dentro de Ocorrências.
- Motivo: evitar mecanismo paralelo e manter cada módulo dono de seus dados e regras.
- Ainda a definir (não presumir):
  - **D-006a:** como a solicitação vira atividade em Rotinas: rotina não agendada, rotina agendada ou outra forma existente. Quem programa: o gestor de Rotinas ou o solicitante.
  - **D-006b:** qual checklist é usado (o que originou a não conformidade ou outro escolhido na solicitação).
  - **D-006c:** como o resultado do checklist (Conforme / Não Conforme / Nota) se traduz em reinspeção "OK" / "não OK" para o critério de conclusão do tipo (docs/06).
  - **D-006d (conflito a resolver):** pela regra existente, uma não conformidade na reinspeção geraria **outra** ocorrência automaticamente. A proposta (docs/04) diz que o resultado "não OK mantém a ocorrência aberta e adiciona evidência". É preciso decidir se a reinspeção suprime a geração automática, se a nova ocorrência é gerada e vinculada (D-005), ou se as duas coisas acontecem.
  - **D-006e:** comportamento quando a reinspeção não é executada (status "Não realizada" em Rotinas).
- Impactos: `docs/referencias/rotinas-e-ocorrencias-atual.md` (seções 4 e 4.1).
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

### D-007 — Central como referência mestre de ativos, preservando o cadastro de Rotinas (G-I-06)
- Data: 2026-11-06
- Tema: Cadastros mestres / integração
- Decisão:
  - A Central de Ativos e Ambientes é a referência mestre de **identidade e relacionamento** dos ativos.
  - O cadastro de ativos existente em Gestão de Rotinas não é eliminado nem redesenhado. A experiência atual é preservada e passa a se integrar ao cadastro compartilhado.
  - A compatibilização dos cadastros existentes deve evitar duplicidade de ativos.
- Motivo: cumprir a regra de não duplicar cadastros mestres sem quebrar o produto existente.
- Ainda a definir (não presumir):
  - **D-007a:** quais atributos ficam na identidade compartilhada (Central) e quais continuam de Rotinas. Atributos atuais: Tipo de Ativo, Descrição, Fabricante, Número de Série, Data de Fabricação, Data de Validade, Imagem e status, além dos campos customizados `grs_asset`.
  - **D-007b:** forma de compatibilização dos ativos já cadastrados em Rotinas: correspondência com ativo da Central, criação na Central, ou ambos. Por coerência com P-40 e com a regra de descoberta, recomenda-se revisão e aprovação humana, sem associação automática. Recomendação ainda **não aprovada**.
  - **D-007c:** a partir da integração, onde nasce um ativo novo cadastrado pela tela de Rotinas.
  - **D-007d:** relação entre "Tipo de Ativo" (Rotinas) e a classificação da Central.
  - **D-007e:** situação Válido/Inválido por validade. Hoje é regra de Rotinas, e não deve ser confundida com condição operacional nem com criticidade.
- Impactos: `docs/referencias/rotinas-e-ocorrencias-atual.md` (seções 1.10, 4 e 4.1). Ponto de controle do tipo Ativo passa a referenciar a identidade compartilhada (já previsto no PRD de Rotinas, requisito 5).
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

### D-008 — Manter "Concluir" na Gestão de Ocorrências (G-I-07)
- Data: 2026-11-06
- Tema: Nomenclatura / ciclo de vida
- Decisão:
  - A interface de Gestão de Ocorrências mantém o termo e o comportamento atuais de **"Concluir"** (status "Concluída").
  - A Linha GRS respeita o ciclo existente (Sem tratamento, Em andamento, Em pausa, Concluída) e não renomeia por uniformização.
  - Onde docs/06 e o PRD de Ocorrências falam em "encerramento" ("modos de encerramento", "critério de encerramento"), a leitura passa a ser **conclusão** ("critério de conclusão").
  - Os PRDs não foram reescritos nesta atividade.
- Motivo: preservar o produto existente.
- Consequência registrada para validação na Q-02: os parâmetros opcionais do tipo previstos em docs/06 (exige plano de ação, exige reinspeção, critério de conclusão) seriam **condições adicionais** para "Concluir", aplicadas só quando configuradas. Sem configuração, vale a regra atual.
- Impactos: `docs/referencias/rotinas-e-ocorrencias-atual.md` (seções 4 e 4.1). Revisão de texto em docs/06 e no PRD de Ocorrências fica pendente de autorização.
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

### D-009 — Ciclo de vida da ocorrência: estrutura e regras aprovadas (Q-02, parte ocorrência)
- Data: 2026-11-06
- Tema: Gestão de Ocorrências / ciclo de vida
- Decisão (detalhe em `docs/propostas/q02-ciclo-de-vida-da-ocorrencia.md`):
  - **DP-01:** mantêm-se os quatro status existentes (Sem tratamento, Em andamento, Em pausa, Concluída). Capacidades novas aparecem como pendências de conclusão, não como status. O ciclo da ocorrência é separado dos ciclos de plano de ação, ação e reinspeção.
  - **DP-02:** o primeiro trâmite **humano** leva de Sem tratamento a Em andamento e encerra o tempo de resposta.
  - **DP-03:** pausar exige justificativa. O tempo em pausa é descontado do tempo de solução. Durante a pausa só a **alteração** da prioridade fica bloqueada (para alterar, retomar antes). A prioridade vigente continua exibida e usada no Painel, no Monitoramento e nos indicadores. Pausar a ocorrência não afeta prazos de planos e ações.
  - **DP-04:** concluir = regra atual + condições configuradas no tipo. Sem configuração, vale a regra atual.
  - **DP-06:** registros automáticos (resultado de reinspeção, vínculo, integrações) ficam no histórico, mas não são trâmite humano: não afetam o tempo de resposta nem a exigência de trâmite.
  - **DP-11:** "Exige reinspeção" é atendida quando o último resultado de reinspeção é OK.
  - **DP-12:** reinspeção OK habilita "Concluir", mas não conclui automaticamente.
  - **DP-14:** na conclusão em lote, as ocorrências que não atendem às condições permanecem abertas e são identificadas com o motivo.
  - **DP-15:** resolve a D-006d com a **alternativa C**:
    - a original sempre recebe o resultado e as evidências da reinspeção;
    - Rotinas preserva a geração automática para não conformidade;
    - a nova ocorrência pode receber sugestão de vínculo (D-005), que não funde históricos e depende de confirmação;
    - resultado que chega após a conclusão da original é registrado no histórico dela, sem reabertura automática, e a nova ocorrência permanece como registro do problema identificado.
  - A alternativa D (supressão configurável) fica como evolução, não aprovada.
- Não aprovado nesta decisão:
  - propostas DP-04a, DP-05, DP-07 e DP-10;
  - itens em aberto DP-08, DP-09 e DP-13.
- Motivo: definir o ciclo da ocorrência preservando o produto atual (D-008) e as integrações decididas (D-005, D-006).
- Impactos: nenhum em código nesta etapa. Base para a implementação da etapa 5 e para a revisão futura de docs/06 e do PRD (pendente de autorização).
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

### D-010 — Ciclo de vida da ocorrência: conclusão em pausa, permissões, notificações e exigência de plano (Q-02)
- Data: 2026-11-06
- Tema: Gestão de Ocorrências / ciclo de vida
- Decisão (detalhe em `docs/propostas/q02-ciclo-de-vida-da-ocorrencia.md`, seções 2.2, 3, 5 e 6.2):
  - **DP-04a:** ocorrência Em pausa não pode ser concluída.
    - É preciso retomar antes; a retomada fica no histórico e encerra a contagem da pausa.
    - A regra vale igualmente no detalhe, na conclusão em lote e nas operações via API, sem divergência entre canais.
  - **DP-05:** permissões conceituais separadas: registrar, consultar, tratar, concluir, confirmar vínculo, autorizar exceção e configurar tipo de ocorrência. Registrar não implica tratar nem concluir. A matriz de perfis e permissões **não** é definida nesta decisão.
  - **DP-07 (escopo do protótipo):**
    - novas notificações somente no sino, sem novos disparos de e-mail, som ou Monitoramento;
    - uma notificação por destinatário elegível por evento, sem duplicação;
    - N3 é gerada quando a ocorrência passa a atender às condições de conclusão e não se repete em atualizações posteriores enquanto permanecer elegível;
    - a notificação informa que a ocorrência pode ser concluída e não executa a conclusão.
  - **DP-10:** dois modos de exigência de plano de ação no tipo:
    - "exige plano iniciado": ≥ 1 plano em andamento, aguardando aprovação, pausado ou concluído;
    - "exige plano concluído": ≥ 1 plano associado e todos os não cancelados concluídos;
    - plano cancelado não satisfaz a exigência;
    - eficácia **não** é condição nesta etapa, preservando a distinção entre execução e eficácia e evitando acoplamento entre os ciclos.
- Mantido em aberto:
  - DP-10a: se plano em Rascunho bloqueia a conclusão;
  - DP-10b: eficácia como condição adicional futura;
  - DP-08, DP-09 e DP-13;
  - matriz de perfis.
- A confirmar: leitura de que a N3 volta a ser gerada se a ocorrência deixar de ser elegível e voltar a ser.
- Motivo: completar o ciclo da ocorrência (Q-02) preservando o produto atual.
- Impactos: nenhum em código nesta etapa. Na implementação, a regra DP-04a fica na camada de serviço para valer em todos os canais.
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

### D-011 — Concluir × Encerrar na OS, ação executada por OS e Plano de Ação compartilhado (Q-02)
- Data: 2026-11-06
- Tema: Ciclos de plano de ação, ação e OS
- Decisão (detalhe em `docs/propostas/q02-ciclos-plano-acao-solicitacao-os.md`):
  - **DP-47 — aprovada.**
    - **Concluir execução** é responsabilidade do técnico e indica que ele terminou o trabalho.
    - **Encerrar OS** é responsabilidade do gestor ou responsável autorizado, depois de validar o resultado.
    - A D-008 permanece restrita ao ciclo de Ocorrências. Termos que representam responsabilidades distintas não são uniformizados entre módulos.
  - **DP-33 — aprovada com ajuste.**
    - Concluir ou encerrar uma OS não conclui automaticamente a ação vinculada.
    - Resultado, evidências e histórico da OS ficam disponíveis na ação.
    - A ação recebe a indicação de que a execução vinculada foi concluída.
    - O executor confirma a conclusão da ação ou a mantém aberta, registrando justificativa. Os ciclos permanecem independentes.
  - **DP-25 — diretriz conceitual aprovada.**
    - O Plano de Ação é uma **entidade funcional compartilhada do GRS**, com ciclo de vida próprio e origem e contexto preservados.
    - Pode nascer de Ocorrências, Rotinas, Manutenção ou diretamente, sem depender obrigatoriamente de ocorrência ou OS.
    - O módulo de origem não é automaticamente o proprietário exclusivo.
    - **A arquitetura detalhada (seção 2 do documento) continua como proposta**, não aprovada.
- A confirmar: o gatilho do indicador da DP-33 (proposto: OS **Encerrada**) e o tratamento dos demais desfechos (OS cancelada, solicitação rejeitada, resolvida sem OS ou redirecionada).
- Impactos:
  - A diretriz DP-25 altera a atribuição de "planos de ação" a Gestão de Ocorrências em docs/00, docs/06 e no PRD de Ocorrências. Esses textos serão revistos **somente com autorização** (não alterados nesta decisão).
  - Em D-010, "planos associados" passa a significar planos **vinculados** à ocorrência (a confirmar se um plano vinculado depois da criação conta).
  - O DP-08 foi reformulado: se é possível vincular plano a ocorrência concluída.
  - Nenhum impacto em código nesta etapa.
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.
- Complemento: o gatilho e os desfechos da DP-33 foram definidos em D-012.

### D-012 — Eficácia, risco, dependências, solicitação, suspensão, geração automática e cancelamento da OS (Q-02)
- Data: 2026-11-06
- Tema: Ciclos de plano de ação, ação, solicitação e OS
- Decisão (detalhe em `docs/propostas/q02-ciclos-plano-acao-solicitacao-os.md`, revisão 3):
  - **DP-23 — aprovada com ajuste.** Concluído é status final do plano. Com eficácia Parcialmente eficaz ou Ineficaz, é permitido criar um **novo plano relacionado** ao anterior. Não há reabertura manual nem automática de plano concluído nesta versão. Histórico e relação entre os planos são preservados.
  - **DP-24 — aprovada.** Papel de avaliador de eficácia; aprovador da avaliação opcional, conforme configuração.
  - **DP-26 — aprovada.** "Plano em risco" considera prazo, progresso e dependências; sinais configuráveis; sem valores padrão antes de validação posterior.
  - **DP-32 — aprovada com ajuste.** Ação com dependência cancelada permanece bloqueada até decisão humana. O responsável pode remover a dependência, substituí-la ou cancelar a ação. Remover ou substituir exige permissão, justificativa e histórico.
  - **DP-34 — aprovada como evolução futura**, fora do escopo inicial.
  - **DP-38 — aprovada.** Troca de equipe dentro da Manutenção ocorre na triagem; "Redirecionada" representa encaminhamento externo. Destinos externos continuam em aberto.
  - **DP-40 — aprovada.** Edição e cancelamento enquanto Aberta, com histórico das alterações; após a triagem, restritos conforme permissões.
  - **DP-48 — aprovada como status próprio ("Suspensa").** Exige justificativa, responsável e histórico de início e término; não pode suspender com execução em andamento. Desconto do período suspenso no prazo continua em aberto.
  - **DP-49 — aprovada.** Nenhuma geração automática por padrão; cada regra declara explicitamente qual objeto gera e quais aprovações são necessárias.
  - **DP-50 — aprovada com ajuste.** Cancelar a OS não cancela automaticamente a solicitação; a solicitação mantém o histórico da conversão e da OS cancelada; o retorno para Em triagem é decisão manual e autorizada, não transição automática.
  - **DP-51 — aprovada.** Cancelar OS em execução exige justificativa, preserva execuções e trabalho parcial, e os relatórios diferenciam OS cancelada sem execução de OS cancelada com trabalho parcial.
  - **DP-33 — precisão aprovada.** A execução vinculada só é considerada concluída quando a OS é **Encerrada**. OS cancelada, solicitação rejeitada e solicitação redirecionada têm **indicadores próprios**, sem agrupamento com "execução vinculada concluída".
- **Não aprovado nesta decisão (orientações do P.O. para análise futura):** DP-25a (um plano para múltiplas ocorrências, com contagem correta nos indicadores), DP-25b (vincular e desvincular com permissão específica e histórico; desvincular não apaga a relação), DP-25c (configuração do ciclo pertence à capacidade compartilhada de Planos de Ação) e a regra de que quem não tem acesso ao objeto vinculado não pode inferir seu conteúdo pelo plano (coerente com a regra consolidada de permissões do CLAUDE.md). A diretriz DP-25 de D-011 permanece como está.
- Continuam como proposta: os detalhes marcados [Proposta] dentro dos itens aprovados (ex.: herança de vínculos no plano relacionado; indicadores para solicitação Resolvida sem OS, Duplicada ou Cancelada; campos editáveis da solicitação; entrada e retomada da suspensão).
- Continuam em aberto: plano relacionado com eficácia Eficaz; destinos externos; desconto de tempo e responsável pela suspensão; execução em andamento no cancelamento da OS; permissão do retorno à triagem.
- Impactos:
  - DP-23 elimina a transição de reabertura (P10) proposta na revisão 2. Uma ocorrência aberta no modo "exige plano concluído" que recebe o novo plano relacionado volta a não atender a condição até ele ser concluído.
  - *Nota de precisão (2026-11-06, ajuste do P.O. sobre a revisão 3):* o efeito do plano relacionado sobre a condição de conclusão de uma ocorrência aberta **fica condicionado à DP-10a** (plano em Rascunho e plano vinculado depois da criação). Até essa decisão, nenhum efeito é presumido. As decisões da D-012 não mudam.
  - DP-24 e DP-32 acrescentam permissões próprias de planos (avaliar eficácia, aprovar avaliação, alterar dependências). Matriz de perfis continua indefinida.
  - DP-40 e DP-48 criam os status "Cancelada" (solicitação) e "Suspensa" (OS).
  - DP-51 exige distinção de OS cancelada com e sem trabalho parcial em relatórios e indicadores.
  - DP-49 condiciona o formato das regras às Q-05, Q-06 e Q-19.
  - docs/00, docs/05, docs/06 e PRDs **não foram alterados**; dependem de autorização expressa. Nenhum impacto em código nesta etapa.
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

### D-013 — Pendências da Q-02 e dependências Q-05, Q-06 e Q-09
- Data: 2026-11-06
- Tema: Ciclos da etapa 5, herança de configuração, terminologia de planos e experiência móvel de OS
- Decisão (detalhe em `docs/propostas/q02-pendencias-e-dependencias.md`, seção 0.1, que prevalece sobre o texto da análise):
  - **Aprovados:**
    - DP-08: vínculo de plano a ocorrência concluída, com permissão e justificativa, sem reabertura nem alteração do histórico original.
    - DP-09 / D-006e: se o tipo exige reinspeção, um pedido sem resultado bloqueia "Concluir"; se não exige, há só aviso; "Não realizada" não conta como resultado.
    - DP-13: a aprovação da conclusão é uma pendência dentro de Em andamento; pausar cancela o pedido.
    - DP-38: lista configurável de destinos externos; o redirecionamento não cria objeto no destino.
    - DP-48: registrar tempo total e tempo líquido, sem desconto de SLA até a regra ser definida; o gestor autoriza a suspensão e o técnico registra o impedimento.
    - Q-05: "unidade/filial" = nó Unidade da hierarquia de localização; estrutura organizacional separada.
    - Q-06: distinguir **Plano de Ação** (capacidade compartilhada) de **Plano de Manutenção Preventiva** (Gestão de Manutenção); não criar campo "Natureza" sem decisão específica.
  - **Aprovados com ajuste:**
    - N3: nova notificação somente a cada nova transição de não elegível para elegível, uma vez por destinatário e por ciclo.
    - Exceção: dispensa somente condições configuradas no tipo; não dispensa DP-04a nem regras gerais; registra condições dispensadas, autorizador e justificativa.
    - D-005a–d: tipo e local como critérios principais; ativo como fator de relevância; janela configurável sem padrão; não se aplica a pânico; a sugestão expira explicitamente quando perde a utilidade (ocorrência concluída ou vínculo já existente), com registro.
    - D-006a–c: reinspeção por rotina não agendada, de execução única, programada pelo gestor, sem geração automática; critérios de resultado existentes preservados.
    - Eficácia: plano relacionado somente com Parcial ou Ineficaz; avaliador e data prevista obrigatórios na conclusão do plano; a avaliação pode continuar pendente depois da conclusão.
  - **Aprovado com ressalva:**
    - DP-10a: Rascunho bloqueia no modo "Exige plano concluído"; planos vinculados depois da criação contam. A elegibilidade é recalculada e o usuário é avisado quando ela muda. Ocorrências concluídas não são reabertas nem alteradas.
  - **Aprovados com escopo restrito:**
    - Matriz de perfis: **exclusivamente demonstrativa para o protótipo**, com os seis perfis da D-001. Não aprova a matriz definitiva do produto.
    - Q-09: **ampliação do escopo do protótipo**. Visão móvel demonstrativa de "Minhas OS" e execução, online, na aplicação GRS, sem o app de Gestão de Rotinas. Offline é evolução futura. Não define tecnologia nativa nem arquitetura mobile definitiva.
  - **Ajustado, nova proposta aguardando validação:**
    - DP-51: o gestor não pode registrar como concluída uma execução não concluída. Proposta: status de execução **"Interrompida"**, com justificativa, responsável e trabalho parcial preservado, permitindo depois cancelar a OS (`q02-ciclos-plano-acao-solicitacao-os.md`, seção 6.7).
- Continuam em aberto: ativo em dois grupos com configurações conflitantes (Q-05, sem precedência até nova análise); quem aprova a conclusão e segregação (DP-13); mesma pessoa pedir e autorizar exceção; local ancestral ou descendente na sugestão de vínculo; reinspeção com execução Incompleta, Interrompida ou Finalizada Parcialmente; quem pode interromper execução.
- Continuam como proposta: cancelar ação com plano pausado; permissão do retorno à triagem (DP-50); demais pontos da seção 4 (grupos corporativos × locais; níveis de herança por capacidade).
- Impactos:
  - A D-012 (plano relacionado × condição de conclusão) passa a ter efeito definido pela DP-10a.
  - A Q-09 amplia o escopo do protótipo além de "experiência móvel só para Rotinas" (docs/00, docs/09, CLAUDE.md). Esses textos não foram alterados e dependem de autorização expressa.
  - docs/00, docs/05, docs/06 e PRDs não alterados. Nenhuma regra implementada a partir de proposta não aprovada.
- Aprovado por: usuário (P.O.), em sessão de 06/11/2026.

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

## Comportamentos provisórios (etapa 3 — Central de Ativos e Ambientes) — a validar

| # | Tema | Comportamento provisório | Onde alterar |
|---|------|--------------------------|--------------|
| P-27 | Árvore × localização contextual (Q-07) | A Central abre no local contextual do cabeçalho; depois, a seleção na árvore é independente e fica na URL. "Usar como localização contextual" sincroniza de forma explícita. O endereço antigo `/central/locais/:id` redireciona para a visão por local. | `src/modules/central/CentralHomePage.tsx` |
| P-28 | Impacto operacional (Q-04) | Sem índice consolidado: o painel mostra separadamente locais atendidos, dependentes diretos, dependentes indiretos e sistemas de segurança afetados. | `centralService.ts` (`getAsset360`) |
| P-29 | Duplicidade | A tag é o identificador único e bloqueia o cadastro, inclusive quando o ativo existente está fora do escopo (sem expô-lo). Nome semelhante na mesma localização gera aviso e exige confirmação "não é o mesmo ativo". Conta como "duplicidade evitada" abrir o cadastro existente a partir do aviso ou ignorar, na importação, uma linha duplicada ou semelhante. | `centralService.ts`, `AssetFormPage.tsx` |
| P-30 | Completude do cadastro | Percentual de ativos com classificação, localização principal e responsável (direto ou herdado). | `centralService.ts` |
| P-31 | Importação em lote | CSV colado na tela (upload de arquivo simulado), separador `;` ou `,`. Obrigatórias: tag, nome, classificação, local (código ou nome), criticidade; opcionais: responsável (matrícula ou e-mail), descrição. Linhas com erro ou tag existente são bloqueadas; linhas semelhantes vêm marcadas para ignorar, mas podem ser importadas. | `ImportAssetsPage.tsx`, `centralService.ts` |
| P-32 | Motivo obrigatório | Edição de cadastro, alteração manual de condição e qualquer mudança de grupo exigem motivo (mínimo de 5 caracteres). Criar ativo não exige. | `ReasonModal` em `src/modules/central/shared.tsx` |
| P-33 | Regras de grupo | Critérios por classificação, criticidade e local (classificação e local incluem descendentes). Dentro da regra os critérios se combinam (E); regras diferentes se somam (OU). Associação efetiva = regras + inclusões manuais − exceções. | `groupLogic.ts` |
| P-34 | Governança de grupos | Nova permissão `central.groups.corporate` (só Administrador Corporativo): cria grupos para toda a empresa e edita regras, consumidores e periodicidade. Gestor Local (`central.manage` com escopo local) cria grupos locais operacionais, inclui/remove ativos e cria exceções no seu escopo e conclui auditorias locais. Exceção não se aplica a inclusão manual (remove-se a inclusão). | `groupService.ts`, `src/access/profiles.ts` |
| P-35 | Auditoria periódica (Q-10) | Grupo corporativo é auditado por unidade do escopo; grupo local, pelo seu local. Situação em dia/vencida/pendente conforme a periodicidade; conclusão local registra observações e o número de associações revisadas. | `groupService.ts` |
| P-36 | Grupos especializados | Exibidos na Central somente para consulta; são administrados pelo módulo dono. | `groupService.ts` |
| P-37 | Abas de módulos no painel 360º | Monitor, Rotinas, Manutenção, Ocorrências e Riscos mostram o estado (em uso, não contratado, sem permissão) e a etapa de implementação, sem dados fictícios. Abrir solicitação/consultar OS a partir do ativo entra na etapa 5. | `Asset360Page.tsx` |
| P-38 | Aba Grupos da Central | Lista não recortada pela árvore (a contagem de membros respeita o escopo). "Ver ativos" abre a aba Ativos filtrada pelo grupo no local selecionado. | `GroupsTab.tsx` |
| P-39 | Validação de dispositivos descobertos | ~~Aprovação no Monitor~~ — corrigido na etapa 4: o PRD do Monitor e a matriz de fases (cenário C) colocam a aprovação na **Central**. Ver P-40. | `DevicesTab.tsx` |

## Comportamentos provisórios (etapa 4 — Monitor de Infraestrutura e descoberta) — a validar

| # | Tema | Comportamento provisório | Onde alterar |
|---|------|--------------------------|--------------|
| P-40 | Onde a descoberta é aprovada | O Monitor executa a descoberta (somente leitura) e guarda os candidatos no seu inventário; a revisão e a aprovação acontecem na Central (`/central/descobertas`), por perfil com `central.manage` no escopo do conector. Aprovar cria o dispositivo com localização confirmada e passa a expor seus pontos de dado; rejeitar não cria nada e o equipamento não volta em descobertas seguintes. Dispositivos já cadastrados com localização sugerida ou não identificada entram na mesma fila. | `discoveryService.ts`, `DiscoveryReviewPage.tsx` |
| P-41 | Reconhecimento de alerta técnico | Alerta do Monitor sem impacto em segurança é reconhecido por quem configura o monitoramento (`monitor.manage`). Com impacto em segurança, continua reconhecido no Security Hub. O ciclo completo do alerta segue em aberto (Q-15). | `canAcknowledgeEvent` em `internal.ts` |
| P-42 | Regras de monitoramento | Comparação simples de um ponto com um limite (maior, menor, igual, diferente), severidade escolhida; avaliada a cada leitura e ao criar/editar/ativar a regra. Um alerta ativo por regra (não duplica). O status do ponto passa a refletir a regra violada mais severa (crítica → crítico; demais → alerta). Sem histerese, janela, supressão ou escalonamento ("a definir" no PRD). | `monitorLogic.ts` |
| P-43 | Sugestões da descoberta | Classificação e localização sugeridas a partir de pistas do equipamento (tipo, nome do objeto, tópico, sub-rede), sempre com a justificativa exibida. Correspondência com ativo: ativo na localização sugerida com a classificação sugerida (ou descendente). | `suggestFor` em `monitorService.ts`, `src/data/seed/network.ts` |
| P-44 | Rede simulada | Cada conector de demonstração tem um inventário fixo do que "responde na rede"; conectores criados na demonstração encontram um equipamento genérico do protocolo. Nenhum equipamento real é acessado e credenciais não são coletadas (o campo de rede rejeita senha/token). | `src/data/seed/network.ts` |
| P-45 | Conector desativado | Pausa coleta e descoberta dos seus dispositivos; não altera a saúde de comunicação nem a condição dos ativos. Ativar/desativar exige motivo e fica na auditoria. | `monitorService.ts` |
| P-46 | Histórico de pontos | Série horária sintética das últimas 24 h (determinística, só para pontos numéricos) seguida das leituras simuladas na sessão. Retenção e frequência reais estão "a definir". | `pointHistory` em `monitorLogic.ts` |
| P-47 | Leitura simulada | Ferramenta do facilitador no detalhe do ponto, identificada como demonstração. Representa um sinal do equipamento, marca a comunicação como online e avalia as regras. Recusada com o conector desativado. | `PointDetailPage.tsx` |
| P-48 | Comunicação × condição | Alertas técnicos não alteram a condição operacional do ativo. Só o cenário A (falha da BMB-014) altera a condição, por ser um sinal de falha do equipamento. A regra geral de quando o Monitor alimenta a condição ainda precisa ser definida (Q-19). | `monitorLogic.ts`, `demoService.ts` |

---

## Comportamentos provisórios (etapa 5 — Gestão de Manutenção, 1ª entrega) — a validar

Hipóteses adotadas **só para demonstrar o fluxo**. Não são decisões aprovadas. Na interface, aparecem com a marca "Provisório · P-xx". Regras aprovadas aplicadas nesta entrega: D-011 (DP-47), D-012 (DP-38, DP-40, DP-48, DP-49, DP-50, DP-51) e D-013 (DP-38, DP-48, matriz demonstrativa, Q-09).

| # | Tema | Comportamento provisório (hipótese) | Base | Onde alterar |
|---|------|--------------------------|------|--------------|
| P-49 | Escala de prioridade | Prioridade percebida (solicitante) e definida (triagem) na mesma escala de 5 níveis da ocorrência: Crítica, Alta, Média, Baixa, Planejada. | DP-39 em proposta | `src/domain/maintenance.ts` |
| P-50 | Ciclo-base de solicitação e OS | Status e transições das propostas DP-35 e DP-42 a DP-46. A OS **não** tem "Aguardando aprovação": os parâmetros da aprovação condicional seguem em aberto, então a OS vai de Aberta direto a Planejada. | DP-35, DP-42 a DP-46 em proposta | `maintenanceService.ts` |
| P-51 | Execução "Interrompida" | Hipótese demonstrativa da DP-51 ajustada (D-013): execução em andamento pode ser interrompida com justificativa e responsável, preservando o trabalho parcial; depois a OS pode ser suspensa ou cancelada. **Quem pode interromper não foi decidido**; na demonstração, só o gestor (`manutencao.manage`). | DP-51 ajustada, aguardando validação | `interruptExecution` em `maintenanceService.ts` |
| P-52 | Destinos externos | Três destinos de demonstração (TI, administração predial, limpeza) + "Outro (informar)". Nenhum objeto é criado no destino. | DP-38 aprovado; lista sem padrão no produto | `src/data/seed/maintenance.ts` |
| P-53 | Conversão em OS | Cada conversão cria uma OS nova (1:1). Anexar a uma OS existente (DP-41: 1 OS para n solicitações) não está no protótipo. | DP-41 em proposta | `convertToWorkOrder` |
| P-54 | Triagem obrigatória | É preciso "Assumir triagem" (Aberta → Em triagem) antes de decidir o destino. A triagem opcional configurável não está no protótipo. | docs/05: triagem configurável | `requireTriaging` |
| P-55 | Papéis na demonstração | Triagem, planejamento, suspensão, cancelamento e encerramento: `manutencao.manage` (Administrador e Gestor de Manutenção). Execução: `manutencao.execute`, somente pelo técnico atribuído. Técnico passa a poder abrir solicitação e Gestor de Manutenção passa a poder executar, conforme a matriz demonstrativa (D-013). Operador de Rotinas não acessa Manutenção (sem `manutencao.view`). | Matriz demonstrativa (D-013) | `src/access/profiles.ts` |
| P-56 | Retomar triagem | Permitido a quem faz triagem (`manutencao.manage`) no escopo, só com a OS vinculada Cancelada. Sem expiração: a solicitação fica "Convertida em OS" com o aviso de decisão pendente. | DP-50 aprovado; permissão em proposta | `resumeTriage` |
| P-57 | Notificações | Somente no sino, para destinatários específicos: gestores com o local no escopo (nova solicitação, impedimento, aguardando encerramento, OS cancelada), técnico (atribuição, devolução, suspensão, retomada, interrupção) e solicitante (desfecho da triagem, OS encerrada ou cancelada). Quem executa a ação não é notificado. | Princípios da DP-07 | `notify` em `maintenanceService.ts`; `recipientUserIds` em `AppNotification` |
| P-58 | Atraso, tempo e evidências | "Atrasada" = data prevista ultrapassada com a OS Planejada, Em execução ou Suspensa (indicador, não status). Tempo total, suspenso e líquido são informativos, sem desconto de SLA (D-013). Evidências são nomes de arquivo simulados ("+ Adicionar foto"); nenhum arquivo é enviado. | D-013; SLA a definir | `maintenanceService.ts`, `orderActions.tsx` |
| P-59 | Recorte por local | Visão geral e listas da Manutenção respeitam a localização contextual do cabeçalho (como P-14). | P-14 | `MaintenanceHomePage.tsx`, `MaintenanceListsPages.tsx` |

## Comportamentos provisórios (etapa 5 — Gestão de Ocorrências, 2ª entrega) — a validar

Hipóteses adotadas **só para demonstrar o fluxo**; não são decisões aprovadas. Regras aprovadas aplicadas: D-008 ("Concluir"), D-009 (DP-01, 02, 03, 04, 06, 14), D-010 (DP-04a, DP-05, DP-07, DP-10 — exceto a parte de planos), D-013 (DP-13, N3, exceção, matriz demonstrativa). Planos de ação, reinspeção e sugestão de vínculo (D-005, D-006, DP-08, DP-09, DP-10) entram com Planos de Ação e Gestão de Rotinas.

| # | Tema | Comportamento provisório (hipótese) | Base | Onde alterar |
|---|------|--------------------------|------|--------------|
| P-60 | Permissões de Ocorrências | `ocorrencias.manage` foi substituída pelas permissões separadas da DP-05: registrar, tratar, concluir (inclui aprovar conclusão), autorizar exceção e configurar tipo. Distribuição conforme a matriz **demonstrativa** (D-013): Administrador — todas; Gestor de Segurança e Gestor Local — registrar, tratar, concluir, exceção; Gestor de Manutenção — consultar; Técnico e Operador de Rotinas — sem acesso (o registro pelo app de Rotinas entra com Gestão de Rotinas). "Confirmar vínculo" ainda não é usada. | DP-05, matriz demonstrativa | `src/access/profiles.ts` |
| P-61 | Aprovador da conclusão | Aprova quem tem "concluir" no escopo do local, **exceto quem pediu**. Quem aprova e a segregação seguem em aberto (DP-13). | DP-13 aprovado; aprovador em aberto | `decideApproval` em `occurrenceService.ts` |
| P-62 | Condições do tipo na conclusão | Evidência exigida é atendida por anexo em trâmite **ou** na conclusão; justificativa exigida é informada no ato de concluir. Em lote, tipos que exigem justificativa, evidência ainda não anexada ou aprovação ficam abertos com o motivo. Exceção: quem tem a permissão conclui dispensando as condições do tipo; pedir e autorizar pela mesma pessoa segue em aberto. | DP-04, DP-14, D-013 | `blockReason`, `concludeWithException` |
| P-63 | Elegibilidade para a N3 | Elegível = regra atual atendida (Em andamento, ≥ 1 trâmite) + evidência anexada quando exigida. Justificativa (informada no ato) e aprovação não entram no cálculo. Só tipos com condições configuradas. Destinatários: quem tem "concluir" no escopo. | DP-07, D-013 | `reevaluate` |
| P-64 | Ativo relacionado | Campo opcional no registro, referência à identidade da Central. O produto atual não tem esse campo (tem dispositivo/câmera na API). | Experiência integrada (docs/02) | `NewOccurrencePage.tsx`, `Occurrence.assetId` |
| P-65 | Origens | No protótipo só se criam ocorrências "Registro por usuário" e "Evento do Security Hub" (este preserva o evento de origem e não altera o status dele). Não conformidade, rotina não executada e dispositivo aparecem apenas nos dados de demonstração, como integrações existentes simuladas. | Q-03, seção 3 | `register`, `src/data/seed/occurrences.ts` |
| P-66 | Tipos de ocorrência | Somente consulta. Tipos e condições são de demonstração. Monitoramento, aviso sonoro e e-mails do tipo **não são disparados**; o tipo monitorado só gera um registro informativo no histórico. | Notificações existentes inalteradas (DP-07) | `OccurrenceTypesPage.tsx`, seed |
| P-67 | Trâmite em pausa | Trâmite é permitido em Em pausa (não retoma a ocorrência). A permissão em pausa não está documentada (G-O-07). | G-O-07 em aberto | `addProceeding` |
| P-68 | Validação do registro | Obrigatórios: tipo, local físico, descrição (mín. 5 caracteres), data/horário (não futura) e prioridade (sugerida pelo tipo). A obrigatoriedade real não está documentada (G-O-01). | G-O-01 em aberto | `register` |
| P-69 | Recorte por local | Painel e Consulta respeitam a localização contextual do cabeçalho (como P-14). | P-14 | `OccurrencePanelPage.tsx`, `OccurrenceSearchPage.tsx` |

## Comportamentos provisórios (etapa 5 — Planos de Ação, 3ª entrega) — a validar

Hipóteses adotadas **só para demonstrar o fluxo**; não são decisões aprovadas. Regras aprovadas aplicadas: D-010 (DP-10), D-011 (DP-25 diretriz, DP-33), D-012 (DP-23, DP-24, DP-26, DP-32, DP-33 precisada, DP-34), D-013 (DP-08, DP-10a com ressalva, eficácia, matriz demonstrativa).

| # | Tema | Comportamento provisório (hipótese) | Base | Onde alterar |
|---|------|--------------------------|------|--------------|
| P-70 | Arquitetura e navegação | "Planos de ação" é uma área própria, no grupo **Capacidades compartilhadas** do menu (fora da lista oficial de módulos), com serviço e permissões próprias: `planos.view`, `planos.manage`, `planos.approve`, `planos.evaluate`, `planos.execute`. Distribuição pela matriz demonstrativa (D-013): Administrador, Gestor de Segurança e Gestor Local — todas; Gestor de Manutenção — consultar, gerir e executar; Técnico e Operador de Rotinas — consultar e executar. Escopo pelo local do plano. Sem acesso à ocorrência vinculada, o plano mostra só o código dela. Habilitada com Ocorrências Avançadas, Rotinas ou Manutenção contratada [C]. | DP-25 (diretriz); arquitetura da seção 2 em proposta | `src/shell/Sidebar.tsx`, `planService.ts`, `src/access/profiles.ts` |
| P-71 | Modos de aprovação do plano | Só "sem aprovação" ou "aprovação final" (aprovador definido no plano). Aprovação por ação e condicional não estão no protótipo. | Modos [C]; parâmetros em aberto | `ActionPlan.approvalMode` |
| P-72 | Plano relacionado | Nasce em Rascunho, referencia o anterior e sugere (com confirmação) o vínculo com a primeira ocorrência do plano anterior. | DP-23 aprovado; herança de vínculos em proposta | `NewPlanPage.tsx`, `create` |
| P-73 | Pausa do plano | Pausado: nenhuma ação inicia, conclui ou é cancelada (retomar antes); não se criam ações; reprogramar prazos continua permitido. Status individuais preservados; sem status "Pausada" de ação. | Proposta DP-18 com ajuste do P.O. | `planService.ts` |
| P-74 | Ação × solicitação/OS | A ação referencia uma solicitação **existente** (não abre solicitação a partir da ação). Indicadores para solicitação resolvida sem OS, cancelada ou duplicada seguem a proposta (não aprovados). | DP-33 aprovado; demais desfechos em proposta | `actionView` em `planService.ts` |
| P-75 | Ciclo-base do plano e da ação | Ativar: prazo global e ≥ 1 ação com executor e prazo. Concluir: todas as ações finalizadas, ≥ 1 concluída, avaliador e data da avaliação. Cancelar: ações abertas viram Canceladas, concluídas preservadas. Iniciar ação exige dependências Concluídas. Ações de gestão (incluir, cancelar, reprogramar, decidir dependência) só pelo responsável do plano. Sem "Aguardando aprovação" por ação. | DP-16 a DP-22, DP-27 a DP-31 em proposta | `planService.ts` |
| P-76 | Plano em risco e indicadores | Nenhum sinal de risco configurado (DP-26: sem valores padrão), então o indicador não é calculado. Indicadores exibidos: Vencido, Todas as ações finalizadas, Avaliação atrasada. | DP-26 aprovado | `flags` em `planService.ts` |
| P-77 | Comunicação da mudança de elegibilidade | A ressalva da DP-10a ("comunicar quando mudar") é atendida com a N3 no sino ao passar a elegível e com um registro automático no histórico da ocorrência quando ela deixa de atender. | DP-10a com ressalva | `reevaluateOccurrence` |
| P-78 | Notificações de planos | Somente no sino: responsável (criação, todas as ações finalizadas, dependência cancelada, decisões), executores (ativação, nova ação), aprovador do plano, avaliador e aprovador da avaliação. | Princípios da DP-07 | `notify` em `planService.ts` |
| P-79 | Vínculos | Um plano pode ser vinculado a mais de uma ocorrência e não há desvincular. Multiplicidade (DP-25a) e vincular/desvincular (DP-25b) são orientações para análise futura, não aprovadas. | DP-25a/b em orientação | `linkOccurrence` |

## Dúvidas em aberto

Não bloqueiam a etapa 1. Precisam de definição antes das etapas indicadas.

| # | Dúvida | Necessária na etapa |
|---|--------|---------------------|
| Q-01 | Gestão de Riscos não tem documento próprio: entidades, campos, metodologia de avaliação e relação com controles. | 6 |
| Q-02 | Ciclos de status da etapa 5. **Ocorrência: aprovada (D-009, D-010), pendências residuais em aberto** (`docs/propostas/q02-ciclo-de-vida-da-ocorrencia.md`). Rotina: status existentes transcritos (referência, seção 1.12). Plano de ação, ação, solicitação e OS: **decisões aprovadas em D-011, D-012 e D-013**, ciclo-base e escala de prioridade em proposta (`docs/propostas/q02-ciclos-plano-acao-solicitacao-os.md`). Ver "Acompanhamento da Q-02". | 5 |
| Q-03 | **Em revisão (transcrição feita em 2026-11-06)**. Documentação oficial de Gestão de Rotinas e Gestão de Ocorrências transcrita em `docs/referencias/rotinas-e-ocorrencias-atual.md`, aguardando validação do usuário. Situação detalhada em "Acompanhamento da Q-03" abaixo. | 5 |
| Q-04 | Fórmula/escala do impacto operacional (dependências, locais atendidos, processos, pessoas). Provisório: P-28. | 3 |
| Q-05 | Herança de configuração em Manutenção (empresa → unidade/filial → grupo de ativos → ativo): "unidade/filial" pertence à estrutura organizacional ou à hierarquia de localização? **Respondida em D-013:** nó Unidade da hierarquia de localização. Continua aberto o conflito de ativo em dois grupos. | 5 |
| Q-06 | Em docs/06, "ocorrência pode ser encerrada enquanto plano preventivo continua ativo": trata-se de plano de ação preventivo ou do plano preventivo da Manutenção? **Respondida em D-013:** plano de ação; termo "Plano de Manutenção Preventiva" para Manutenção; sem campo "Natureza". | 5 |
| Q-07 | Como a localização contextual do cabeçalho se relaciona com a árvore permanente da Central (sincronizadas ou independentes)? Provisório: P-27. | 3 |
| Q-08 | Gestão de Terceiros: deve aparecer como módulo bloqueado (descoberta comercial) ou permanecer totalmente fora do protótipo? Atualmente fora. | 7 |
| Q-09 | Execução de OS pelo Técnico precisa de experiência móvel própria (como Rotinas)? **Respondida em D-013:** visão móvel demonstrativa online de "Minhas OS" e execução (ampliação do escopo do protótipo); offline como evolução. | 5 |
| Q-10 | Fluxo de auditoria periódica de grupos (periodicidade mínima, conclusão local, visão corporativa). Provisório: P-35. | 3 |
| Q-11 | Referência visual "V0.6 HTML" citada em docs/09 não está no repositório. | — |
| Q-12 | Tipos adicionais de relacionamento entre ativos e vínculo com processos. Etapa 3 manteve apenas "depende de" (P-10). | 3 |
| Q-13 | Definição de "tempo médio de resposta a eventos": até o reconhecimento, até o início do tratamento ou até o encerramento? | 5 |
| Q-14 | Painel padrão: único por cliente ou também por unidade e/ou perfil de acesso? | 7 |
| Q-15 | Ciclo completo do alerta no Security Hub além do reconhecimento (tratamento, falso alarme, encerramento) e sua relação com a ocorrência. | 5 |
| Q-16 | Mapeamento oficial dos 17 widgets nas 4 áreas do dashboard (ver P-15). | 7 |
| Q-17 | Mapa/planta da Central: formato das plantas, associação a unidade/prédio/andar e sincronização com a árvore. Etapa 3 usa o mapa esquemático pela hierarquia. | 7 |
| Q-18 | Atributos específicos por classe de ativo (PRD da Central, "A definir"). | — |
| Q-19 | Quando um sinal/alerta do Monitor deve alterar a condição operacional do ativo (automático, por regra configurada ou só manual)? | 5 |
| Q-20 | Operadores, histerese, janelas, supressão e escalonamento das regras; frequência, volume e retenção da telemetria (PRD do Monitor, "A definir"). | — |

### Acompanhamento da Q-03 — transcrição de Rotinas e Ocorrências

Referência: `docs/referencias/rotinas-e-ocorrencias-atual.md` (consulta à documentação oficial em 2026-11-06; 34 páginas lidas). Situação: **aguardando validação do usuário**. Nenhuma regra existente nem PRD foi alterado.

**Confirmado pela documentação oficial**
- Rotinas: cadastros de plano de rotina, rotina/agendamento (diária, semanal, mensal em dois padrões), pontos de controle (cinco tipos e três validações), checklists (21 tipos, seis tipos de resposta, nota de corte, anexo/observação configuráveis), contatos, dispositivos móveis (ativação por código, monitoramento a cada 5 min), consulta, relatórios e app (login, verificação de localização, execução, justificativas, ocorrências, pânico, sincronização e mensagens de erro).
- Status de rotina: Pendente, Em execução, Interrompida, Concluída, Incompleta, Não realizada e Finalizado Parcialmente (mais "Futura" no app), com as condições descritas.
- Ocorrências: registro, Painel (limite de 100 por status), Consulta (oito filtros), trâmites, pausar/retomar/concluir, exportação em PDF, indicadores (tempo médio de resposta = registro → primeiro trâmite; tempo de solução descontando pausas), tipo de ocorrência (Monitorado, Aviso Sonoro, Prioridade padrão, E-mails, Emergência, Acionamentos), API e permissões de menu.
- Prioridades Crítica, Alta, Média, Baixa e Planejada: coincidem com docs/06.
- Status de ocorrência existentes: Sem tratamento, Em andamento, Em pausa e Concluída.
- Integrações existentes: não conformidade gera ocorrência automática (exige tipo no checklist e local no ponto); rotina agendada não executada gera ocorrência (verificação a cada 10 min); registro manual de ocorrência no app; alarme de pânico (online, tipo crítico no plano).

**Ainda precisa de validação**
- Conferência humana, por amostragem, da transcrição (leitura automatizada e citações curtas).
- 14 inconsistências entre páginas da documentação (I-01 a I-14), por exemplo o raio fixo de 50 m × o raio configurável e "Em execução" × "Em andamento".
- 36 pendências sem resposta na documentação (G-R-01 a G-R-15, G-O-01 a G-O-14, G-I-01 a G-I-07). As mais relevantes:
  - transições de status da ocorrência (G-O-04 a G-O-06);
  - comportamento offline além da finalização (G-R-12);
  - dados levados de Rotinas para a ocorrência (G-I-01);
  - geração automática atual × sugestão de vínculo proposta (G-I-04);
  - reinspeção inexistente em Rotinas (G-I-05);
  - cadastro de ativos próprio de Rotinas × Central (G-I-06).

**Dúvidas da etapa 5 que continuam bloqueadas**
- Q-02: parcialmente informada. Rotina e ocorrência têm status existentes documentados, mas sem transições completas (G-R-05 a G-R-07, G-O-04 a G-O-06). Ação do plano, solicitação, OS e execução de OS não existem no produto atual e continuam a definir.
- Q-05, Q-06 e Q-09: sem relação com a documentação lida; continuam abertas.
- Q-13: informada só para ocorrências (registro → primeiro trâmite); para eventos do Security Hub continua aberta.
- Q-15: a documentação mostra só o caminho dispositivo → tipo "Monitorado" → Monitoramento; o ciclo do alerta continua aberto.
- Q-19: sem relação com a documentação lida; continua aberta.
- G-I-04 a G-I-07 foram decididas em 2026-11-06 (D-005 a D-008), com os subitens D-005a–d, D-006a–e e D-007a–e ainda em aberto.
- O subitem D-006d é um conflito entre a regra existente e a proposta e precisa de decisão antes da etapa 5.

### Acompanhamento da Q-02 — ciclos de status da etapa 5

Situação em 2026-11-06: **ciclo da ocorrência aprovado (D-009, D-010)**; **ciclos de plano, ação, solicitação e OS com decisões aprovadas em D-011 e D-012** e ciclo-base ainda como proposta. Documentos: `docs/propostas/q02-ciclo-de-vida-da-ocorrencia.md` e `docs/propostas/q02-ciclos-plano-acao-solicitacao-os.md` (revisão 3.1). A revisão 3, os registros da D-012 e esta classificação foram **aprovados pelo P.O. como referência de trabalho**. Análise das pendências restantes e das dependências Q-05, Q-06 e Q-09: `docs/propostas/q02-pendencias-e-dependencias.md` (**toda em proposta**, aguardando validação). Nada implementado; docs/00, docs/05, docs/06 e PRDs inalterados.

**Ajustes da revisão 3.1 (pedidos pelo P.O., sem alterar decisões aprovadas):**
- **Pausa do plano:** impede temporariamente o avanço das ações e preserva o status individual de cada uma. Não existe status "Pausada" para ações; a pausa individual continua como evolução futura (DP-34). Seção 3.1.1.
- **DP-23 × D-010:** o efeito de um novo plano relacionado sobre a condição de conclusão da ocorrência fica **condicionado à DP-10a**, que passa a incluir também se um plano vinculado depois da criação conta para o requisito.
- **Solicitação duplicada:** a ação pode manter uma referência à solicitação original só para acompanhamento, **sem transferência automática de status ou histórico**.

**Situação após a D-013:** classificação por objeto. "Com ajuste/ressalva" indica que o P.O. modificou a recomendação ao aprovar.

| Objeto | Aprovado | Aprovado com ajuste ou ressalva | Diretriz / Orientação do P.O. | Proposta aguardando validação | Em aberto |
|---|---|---|---|---|---|
| Ocorrência | D-009, D-010; DP-08, DP-09/D-006e, DP-13 (D-013) | N3, exceção, D-005a–d, D-006a–c, DP-10a com ressalva (D-013) | — | — | DP-10b (fora da etapa); quem aprova a conclusão e segregação; mesma pessoa pedir e autorizar exceção; local ancestral/descendente na sugestão; reinspeção com execução Incompleta, Interrompida ou Finalizada Parcialmente; matriz definitiva |
| Execução de rotina | — (produto existente, referência 1.12) | — | — | — | Lacunas G-R-05 a G-R-07 |
| Plano de ação | DP-23, DP-24, DP-26 (D-012) | Eficácia: plano relacionado, avaliador e data obrigatórios na conclusão (D-013) | **Diretriz** DP-25 (D-011); **Orientação** DP-25a/b/c e regra de acesso via plano | Ciclo DP-16 a DP-22; arquitetura da seção 2; herança de vínculos no plano relacionado; pausa do plano (3.1.1); cancelar ação com plano pausado | — |
| Ação do plano | DP-33 (D-011/D-012), DP-32, DP-34 como evolução futura (D-012) | — | — | Ciclo DP-27 a DP-31; indicadores para Resolvida sem OS, Duplicada e Cancelada; nomes dos indicadores | — |
| Solicitação | DP-38, DP-40, DP-50 (D-012); destinos externos (D-013) | — | — | Ciclo DP-35 a DP-37, DP-41; campos editáveis enquanto Aberta; permissão do retorno à triagem | — |
| OS e execução | DP-47 (D-011); DP-48, DP-49, DP-51 (D-012); DP-48 tempo/papéis (D-013) | — | — | Ciclo DP-42 a DP-46; **status de execução "Interrompida" (DP-51 ajustada, D-013)**; entrada e retomada da suspensão; estados de origem do cancelamento | Quem pode interromper execução; desconto de SLA (depende da regra de SLA); Q-19 |
| Configuração e escopo | Q-05: nó Unidade da localização (D-013) | — | — | Grupos corporativos × locais; níveis de herança por capacidade | Ativo em dois grupos com valores conflitantes |
| Terminologia e escopo do protótipo | Q-06 (D-013) | Matriz **só demonstrativa**; Q-09 como **ampliação do escopo do protótipo** (D-013) | — | — | Campo "Natureza" do plano (só com decisão específica); offline de OS (evolução) |
| Escala de prioridade de solicitação/OS | — | — | — | DP-39: percebida × definida, escala de 5 níveis da ocorrência | — |

**Em aberto (não aprovar sem análise)**
- Ativo em dois grupos com configurações conflitantes (Q-05).
- Quem aprova a conclusão (DP-13) e segregação; mesma pessoa pedir e autorizar exceção.
- Local ancestral/descendente na sugestão de vínculo; sugestão no registro manual na web.
- Reinspeção com execução Incompleta, Interrompida ou Finalizada Parcialmente.
- Quem pode interromper uma execução (DP-51 ajustada).
- DP-10b: eficácia como condição; fora desta etapa.
- DP-25a/b/c: orientações para análise futura.
- Matriz definitiva de perfis e permissões do produto.
- Campo "Natureza" do plano de ação.
- Q-15, Q-19.
- G-O-02/03: mapeamento com a API.
