# Q-02 — Ciclos de plano de ação, ação, solicitação e ordem de serviço

> **Situação:** revisão 3.2, em 2026-11-06. A 3.2 incorpora as validações da D-013 (DP-08, DP-10a, eficácia, DP-48, DP-51 ajustada, Q-06 e Q-09). Detalhe das validações: `q02-pendencias-e-dependencias.md`, seção 0.1.
> Revisão 3.1: Revisão 3 aprovada pelo P.O. **como referência de trabalho**; 3.1 incorpora três ajustes pontuais (pausa do plano, DP-23 × DP-10a, solicitação duplicada) sem alterar decisões aprovadas.
> - Estrutura geral **aprovada conceitualmente** pelo P.O.
> - D-011: DP-47 e DP-33 aprovadas; DP-25 com diretriz conceitual aprovada.
> - D-012: DP-23, DP-24, DP-26, DP-32, DP-34 (evolução futura), DP-38, DP-40, DP-48, DP-49, DP-50 e DP-51 aprovadas (algumas com ajuste); DP-33 precisada (indicadores próprios por desfecho).
> - DP-25a/b/c: orientações do P.O. registradas para análise futura, **não aprovadas**.
> - Demais itens (ciclo-base DP-16 a DP-22, DP-27 a DP-31, DP-35 a DP-37, DP-39, DP-41 a DP-46 e a arquitetura da seção 2): **propostas** aguardando validação.
> - Nada implementado. docs/00, docs/05, docs/06 e os PRDs não foram modificados.
>
> **Base:**
> - docs/05, docs/06 e os PRDs de Manutenção e Ocorrências;
> - D-005 a D-012;
> - ciclo aprovado da ocorrência (`q02-ciclo-de-vida-da-ocorrencia.md`).
>
> Não há documentação de produto existente para plano de ação, ação, solicitação ou OS (Q-03). **Nenhuma regra aqui é [E].**

## 0. Marcas

| Marca | Significado |
|---|---|
| **[C]** | Consolidado em docs/05, docs/06 ou PRD. |
| **[Aprovado]** | Decisão aprovada pelo P.O. (D-009 a D-012). |
| **[Diretriz]** | Direção conceitual aprovada pelo P.O.; o detalhamento ainda é proposta. |
| **[Orientação]** | Direção indicada pelo P.O. **para análise futura**. Não aprovada. |
| **[Proposta]** | Recomendação desta proposta, **não aprovada**. |
| **[Em aberto]** | Precisa de decisão. Não implementar por suposição. |
| **[Futuro]** | Aprovado como evolução futura, **fora do escopo inicial**. |

**Princípios** (consolidados ou aprovados):
- **Ciclos independentes:** nenhuma conclusão se propaga automaticamente entre ação, plano, ocorrência, solicitação e OS. Ligações só como condição configurada ou como **informação disponibilizada** para decisão humana [C][D-009][D-011].
- **Situações derivadas viram indicadores; decisões humanas que mudam as ações permitidas viram status** (critério aplicado e aprovado na DP-48).
- **Vencimento nunca conclui nem cancela** [C].
- **Nenhuma geração automática sem regra explícita configurada** [C][Aprovado DP-49].
- **Permissão e escopo valem também através de vínculos:** quem não tem acesso a um objeto não pode inferir seu conteúdo por outro objeto relacionado [C, CLAUDE.md].

### Situação de cada item

| DP | Tema | Situação |
|---|---|---|
| DP-16 a DP-22 | Ciclo-base do plano (rascunho, ativação, pausa, conclusão, aprovação, cancelamento, eficácia) | [Proposta] |
| **DP-23** | Eficácia ruim → **novo plano relacionado**; Concluído permanece final | **[Aprovado com ajuste] D-012** — seção 3.4 |
| **DP-24** | Avaliador de eficácia; aprovador opcional por configuração | **[Aprovado] D-012** — seção 3.4 |
| **DP-25** | Plano de ação como entidade compartilhada do GRS | **[Diretriz] D-011**; arquitetura da seção 2 = [Proposta] |
| DP-25a/b/c | Múltiplas ocorrências, vincular/desvincular, local da configuração | [Orientação] para análise futura — seção 2.4 |
| **DP-26** | Plano em risco: prazo, progresso e dependências, configuráveis, sem valores padrão | **[Aprovado] D-012** — seção 3.5 |
| DP-27 a DP-31 | Ciclo-base da ação | [Proposta] |
| **DP-32** | Dependência cancelada bloqueia até decisão humana | **[Aprovado com ajuste] D-012** — seção 4.3 |
| **DP-33** | Ação executada por OS; indicadores próprios por desfecho | **[Aprovado] D-011, precisado em D-012** — seção 4.4 |
| **DP-34** | Pausa individual de ação | **[Futuro] D-012** |
| DP-35 a DP-37, DP-39, DP-41 | Ciclo-base da solicitação e prioridade | [Proposta] |
| **DP-38** | Troca de equipe na triagem; Redirecionada = encaminhamento externo | **[Aprovado] D-012** — seção 5.3 |
| **DP-40** | Edição e cancelamento enquanto Aberta | **[Aprovado] D-012** — seção 5.4 |
| DP-42 a DP-46 | Ciclo-base da OS e execução | [Proposta] |
| **DP-47** | Concluir execução × Encerrar OS | **[Aprovado] D-011** |
| **DP-48** | Suspensão da OS como status próprio | **[Aprovado] D-012** — seção 6.3 |
| **DP-49** | Nenhuma geração automática por padrão | **[Aprovado] D-012** — seção 6.5 |
| **DP-50** | Cancelar OS não cancela a solicitação; retorno à triagem manual e autorizado | **[Aprovado com ajuste] D-012** — seção 6.6 |
| **DP-51** | Cancelar OS em execução com justificativa e trabalho parcial preservado | **[Aprovado] D-012** — seção 6.6 |

---

## 1. Visão consolidada dos quatro ciclos e suas relações

```
                 ┌──────────────── PLANO DE AÇÃO (entidade compartilhada GRS, D-011) ────────────────┐
  origem/contexto│  Rascunho → Em andamento ⇄ Pausado → [Aguardando aprovação] → Concluído | Cancelado │
  (preservados): │       (Concluído e Cancelado são finais — D-012/DP-23: não há reabertura)          │
  Ocorrência,    │  eficácia (atributo): Pendente → [aprovação opcional] → Eficaz | Parcial | Ineficaz│
  Rotinas,       │       Parcial/Ineficaz ──► decisão humana: NOVO PLANO relacionado ao anterior      │
  Manutenção,    │                                                                                    │
  direto         │  AÇÃO (1:n):  Pendente → Em execução → [Aguardando aprovação] → Concluída | Cancelada│
                 │    indicadores: Bloqueada (inclui "dependência cancelada") · Atrasada ·            │
                 │                 indicadores de execução vinculada (um por desfecho, DP-33)         │
                 └───────────────────────────────┬────────────────────────────────────────────────────┘
                                                 │ ação pode referenciar (DP-33)
                                                 ▼
  SOLICITAÇÃO (Manutenção): Aberta → Em triagem → Convertida em OS | Resolvida sem OS | Rejeitada |
                            Duplicada | Redirecionada (externa) | Cancelada (enquanto Aberta)
                            Convertida em OS ──(OS cancelada; decisão manual e autorizada)──► Em triagem
                                                 │ convertida
                                                 ▼
  OS (Manutenção): Aberta → [Aguardando aprovação] → Planejada → Em execução → Aguardando encerramento → Encerrada
                   Planejada / Em execução ⇄ Suspensa (sem execução em andamento)  ·  → Cancelada (com justificativa)
                                                 │ 1:n
                                                 ▼
  EXECUÇÃO: Em andamento → Concluída  (técnico conclui; gestor encerra a OS — DP-47)
```

### 1.1 Como os ciclos se tocam (sempre sem propagação automática de status)

| De | Para | O que acontece | O que NÃO acontece | Base |
|---|---|---|---|---|
| Ocorrência | Plano | Pode originar plano; plano vinculado conta para "exige plano" no tipo | Concluir a ocorrência não conclui nem cancela o plano | [C][D-010] |
| Plano | Ocorrência | Conclusão e eficácia do plano ficam no histórico da ocorrência vinculada (registro automático, não trâmite) | Concluir o plano não conclui a ocorrência | [C][D-009 DP-06] + [Proposta] |
| Plano | Plano | Eficácia Parcial ou Ineficaz permite criar **novo plano relacionado** ao anterior | O plano anterior não é reaberto nem muda de status | [Aprovado DP-23] |
| Ação | Plano | Última ação final avisa o responsável | Concluir ação não conclui o plano | [C] + [Proposta DP-19] |
| Ação | Ação | Dependência cancelada mantém a dependente bloqueada até decisão humana | A dependente não é liberada nem cancelada automaticamente | [Aprovado DP-32] |
| Ação | Solicitação / OS | A ação referencia a solicitação; resultado, evidências e histórico ficam disponíveis na ação; indicador próprio por desfecho | Encerrar ou cancelar a OS não conclui nem cancela a ação | [Aprovado DP-33] |
| Ocorrência / não conformidade | Solicitação | Pode originar solicitação, preservando a origem | Encerrar a OS não conclui a ocorrência | [C] |
| Solicitação | OS | Conversão cria ou anexa OS; a solicitação exibe o status da OS | Mudanças da OS não alteram o status da solicitação; cancelar a OS não cancela a solicitação | [Proposta] + [Aprovado DP-50] |
| OS | Execução | Primeira execução inicia a OS; execuções concluídas permitem pedir encerramento | Concluir a execução não encerra a OS | [Aprovado DP-47] |

---

## 2. Plano de ação como entidade compartilhada — [Diretriz] D-011 / arquitetura [Proposta]

### 2.1 Diretriz aprovada

O Plano de Ação é uma **entidade funcional compartilhada do GRS**, com ciclo de vida próprio e **origem e contexto preservados**.

- Pode nascer de Ocorrências, Rotinas, Manutenção ou **diretamente** (avulso).
- Não depende obrigatoriamente de ocorrência nem de OS.
- O módulo de origem **não** é automaticamente o proprietário exclusivo do plano.

### 2.2 Arquitetura proposta — [Proposta]

**Analogia:** a Central é dona da identidade do ativo e os módulos consultam e referenciam. Da mesma forma, a **capacidade compartilhada "Planos de Ação"** é dona do plano, de suas ações, do ciclo de vida, das aprovações e da eficácia. Os módulos de origem **criam, vinculam e consultam**, mas não reimplementam as regras do plano.

**Estrutura do plano:**

| Elemento | Proposta |
|---|---|
| **Origem** (imutável) | Módulo (Ocorrências, Rotinas, Manutenção ou Direto), objeto de origem (ocorrência, execução de rotina ou não conformidade, solicitação ou OS, ou nenhum), usuário e data. Só registra de onde veio; não confere propriedade. |
| **Contexto** | Local físico (obrigatório, porque define o escopo de permissão), ativo opcional (referência à Central) e descrição do objetivo. |
| **Vínculos** | 0..n vínculos com objetos de módulos (ocorrências, solicitações, OS…). O objeto de origem é o primeiro vínculo. Vínculos posteriores ficam no histórico. |
| **Plano relacionado** | Referência ao plano anterior quando o plano nasce de eficácia Parcial ou Ineficaz [Aprovado DP-23]. |
| **Papéis** | Responsável do plano, executores das ações, aprovador opcional [C], avaliador de eficácia e aprovador opcional da avaliação [Aprovado DP-24]. |
| **Configuração** | Modo de aprovação, aprovação da avaliação e regras de risco (DP-26). Pertencimento à capacidade compartilhada: [Orientação DP-25c]. Nível de herança: depende da Q-05. |

**Habilitação [C]:** a capacidade fica disponível quando Ocorrências Avançadas, Gestão de Rotinas ou Gestão de Manutenção estiver contratado. Sem nenhum deles, aparece como capacidade bloqueada, com explicação (CLAUDE.md).

**Navegação proposta:**
- Uma área **"Planos de ação"**, com lista e detalhe, para planos de qualquer origem, inclusive os avulsos.
- Uma aba ou seção de planos vinculados no detalhe de cada objeto (ocorrência, execução de rotina, solicitação, OS).
- O ativo na Central (painel 360º) mostra os planos cujo contexto é aquele ativo.

**Visibilidade e permissão:**
- [Proposta] Permissões **próprias de planos**: criar plano, ser responsável, aprovar, avaliar eficácia, aprovar avaliação. São separadas das permissões do módulo de origem.
- [Proposta] Criar um plano **vinculado** a um objeto exige também a permissão de tratar aquele objeto. Na ocorrência, é a permissão "Tratar" (D-010).
- [Proposta] Escopo pelo **local do contexto**. Executores veem as ações atribuídas a eles.
- [C + Orientação DP-25] Usuário sem acesso ao objeto vinculado **não pode inferir seu conteúdo por meio do plano**. Proposta de detalhamento: ele vê apenas que existe um vínculo (tipo e identificador), sem título, descrição, status, evidências ou histórico do objeto; campos do plano que copiem dados do objeto (ex.: título da ocorrência no nome do plano) também são ocultados. **A confirmar** se mesmo o tipo e o identificador devem ser ocultados.

### 2.3 Impactos da diretriz

| Onde | Impacto | Tratamento |
|---|---|---|
| docs/00 (mapa de módulos) | Lista "planos de ação" como responsabilidade de Gestão de Ocorrências. Passa a ser capacidade compartilhada. | Revisar o texto **somente com autorização expressa** (não alterado). |
| docs/06 e PRD de Ocorrências | "Uma ocorrência pode ter vários planos" continua verdadeiro como vínculo. Muda a propriedade, não o comportamento. | Revisar o texto somente com autorização expressa. |
| D-010 / DP-10 ("planos associados") | Passa a significar **planos vinculados à ocorrência**, de qualquer origem. | **[Aprovado D-013, DP-10a]**: plano vinculado depois da criação conta; elegibilidade recalculada com aviso ao usuário. |
| D-010 / DP-05 (permissões) | "Tratar" na ocorrência continua necessário para criar ou vincular plano a ela. Somam-se as permissões próprias de planos. | Matriz continua indefinida. |
| DP-08 (plano em ocorrência concluída) | Um plano avulso pode ser criado sempre. A dúvida passa a ser só se ele pode ser **vinculado** a uma ocorrência concluída. | Continua [Em aberto], reformulada. |
| Arquitetura do protótipo | Um serviço "planos" separado dos serviços de ocorrências e manutenção, consumido por eles. | Só na implementação, depois da aprovação. |

### 2.4 Recomendações para análise futura — [Orientação DP-25a/b/c]

| # | Orientação do P.O. | O que ainda precisa ser analisado |
|---|---|---|
| DP-25a | Permitir **um plano relacionado a múltiplas ocorrências**, preservando a contagem correta nos indicadores. | Como o plano conta nos indicadores (ex.: "ocorrências com plano" conta cada ocorrência; "planos abertos" conta o plano uma vez). Como a condição "exige plano concluído" (D-010) se aplica a cada ocorrência vinculada. Se o escopo de local do plano precisa cobrir os locais de todas as ocorrências. |
| DP-25b | **Vincular e desvincular** com permissão específica e histórico. **Desvincular não apaga o histórico da relação.** | Se desvincular exige motivo. Se é possível desvincular quando a ocorrência já está concluída. Efeito do desvínculo sobre a exigência de plano de uma ocorrência aberta (ela pode deixar de atender). |
| DP-25c | A **configuração do ciclo** pertence à **capacidade compartilhada de Planos de Ação**. | Nível de herança da configuração (Q-05) e se o tipo de ocorrência pode sugerir um modo de aprovação para planos criados a partir dele. |
| DP-25 (acesso) | Quem não tem acesso ao objeto vinculado não pode inferir seu conteúdo por meio do plano. | Ver a proposta de detalhamento na seção 2.2. |
| DP-08 | — | Vincular plano a ocorrência concluída: continua [Em aberto]. |

---

## 3. Plano de ação — ciclo

### 3.1 Status [C] e transições

| # | De → Para | Gatilho e condições | Quem | Efeitos | Situação |
|---|---|---|---|---|---|
| P1 | — → Rascunho | Criação (origem: ocorrência, Rotinas, Manutenção, regra automática configurada, plano anterior com eficácia ruim, ou direto). Planos criados por regra também nascem em Rascunho | Usuário com permissão de criar plano (+ Tratar no objeto vinculado) ou sistema | Origem e contexto registrados | [C] + [Diretriz D-011] + [Proposta DP-16] |
| P2 | Rascunho → Em andamento | Ativar: responsável, prazo global e ≥ 1 ação com executor e prazo | Responsável | — | [Proposta DP-17] |
| P3/P4 | Em andamento ⇄ Pausado | Pausar com justificativa e responsável [C]. A pausa impede temporariamente o avanço das ações e preserva o status individual de cada uma (ver 3.1.1). Prazos só mudam por reprogramação | Responsável | Histórico | [C] + [Proposta DP-18, com ajuste do P.O.] |
| P5 | Em andamento → Concluído | Todas as ações finais, ≥ 1 Concluída, sem aprovação final. O sino avisa; não é automático | Responsável | Eficácia passa a Pendente de avaliação; registro no histórico dos objetos vinculados | [Proposta DP-19] |
| P6/P7 | Em andamento → Aguardando aprovação → Concluído / Em andamento | Aprovação final [C]; recusa com motivo | Responsável / Aprovador | — | [C] + [Proposta DP-20] |
| P8 | não final → Cancelado | Justificativa; ações não finais → Cancelada; concluídas preservadas | Responsável | Não satisfaz exigências de ocorrência [D-010] | [Proposta DP-21] |
| P9 | prazo global | Reprogramação com original e novo, ator e motivo | Responsável | — | [C] |

**Não existe transição a partir de Concluído** [Aprovado DP-23]: nesta versão, um plano concluído não é reaberto, nem manual nem automaticamente. A transição P10 da revisão 2 foi descartada.

#### 3.1.1 Efeito da pausa do plano sobre as ações — [Proposta DP-18, com ajuste do P.O.]

- A pausa do plano **impede temporariamente o avanço das ações**: enquanto o plano está Pausado, nenhuma ação muda de status.
- O **status individual de cada ação é preservado**: uma ação Em execução continua Em execução; uma Pendente continua Pendente. Ao retomar o plano, cada ação segue de onde estava.
- **Não existe status "Pausada" para ações.** A pausa individual de ação continua como evolução futura [Futuro DP-34].
- [Proposta] Durante a pausa continuam permitidos: comentários, anexar evidências e reprogramar prazos (com motivo, P9/A6).
- [Proposta] Ficam bloqueados: iniciar (A2), concluir ou enviar para aprovação (A3), aprovar ou recusar (A4) e criar ações novas (A1).
- [Em aberto] Se o cancelamento de uma ação (A5) é permitido com o plano Pausado. Proposta provisória: não, retomar antes, por simetria com a ocorrência (DP-04a).
- [Proposta] Indicador da ação durante a pausa: "Plano pausado", para que o executor entenda por que não pode avançar.

### 3.2 Indicadores
Em risco (DP-26), Vencido [C], "Todas as ações finalizadas" e avaliação de eficácia atrasada (se houver data prevista, ver 3.4).

### 3.3 Modos de aprovação [C]
Nenhuma, por ação, final, ou condicional por criticidade, tipo ou regra. Parâmetros da condicional: [Em aberto].

### 3.4 Eficácia — [Proposta DP-22] + [Aprovado DP-23, DP-24]

**Ciclo da avaliação (atributo do plano, não status) [Proposta DP-22]:**

```
Concluído ──► Pendente de avaliação ──avaliar──► [Aguardando aprovação, se configurado] ──► Eficaz | Parcialmente eficaz | Ineficaz
```

**DP-24 [Aprovado]:**
- Existe o papel de **avaliador de eficácia**. Pode ser diferente do responsável do plano.
- **Aprovador da avaliação é opcional, conforme configuração.** Quando configurado, a avaliação passa por "Aguardando aprovação" antes de valer.
- **Impacto:** dois papéis novos nas permissões próprias de planos (avaliar eficácia, aprovar avaliação).
- [Proposta] Data prevista para avaliação, com indicador de avaliação atrasada.
- [Em aberto] Se a data prevista é obrigatória e se pode vir de um padrão configurado; se a recusa do aprovador devolve a avaliação ao avaliador (proposta: sim, com motivo).

**DP-23 [Aprovado com ajuste]:**
- **Concluído permanece status final.** Não há reabertura manual nem automática nesta versão.
- Com eficácia **Parcialmente eficaz** ou **Ineficaz** (justificativa obrigatória [C]), é permitido **criar um novo plano relacionado ao anterior**, por decisão humana.
- O histórico e a relação entre os planos são preservados nos dois planos.

| Elemento | Situação |
|---|---|
| Novo plano nasce em Rascunho, com referência ao plano anterior | [Aprovado DP-23] + [Proposta: nasce em Rascunho] |
| O plano anterior permanece Concluído, com sua avaliação | [Aprovado DP-23] |
| O novo plano herda os vínculos do anterior (ex.: mesma ocorrência) | **[Proposta]**: sugerir os mesmos vínculos, com confirmação do usuário |
| Quem pode criar o plano relacionado | **[Proposta]**: responsável do plano anterior ou usuário com permissão de criar plano no mesmo local |
| Criar plano relacionado com eficácia **Eficaz** | **[Em aberto]**: a orientação fala só de Parcial e Ineficaz |

**Efeito na ocorrência vinculada (D-010) — definido pela DP-10a [Aprovado com ressalva, D-013]:**
- Plano em **Rascunho** bloqueia no modo "exige plano concluído", e planos **vinculados depois** da criação da ocorrência também contam.
- Portanto, um novo plano relacionado vinculado a uma ocorrência **aberta** nesse modo faz a ocorrência deixar de atender a condição até o plano ser concluído ou cancelado.
- **Ressalva:** a elegibilidade é **recalculada** a cada mudança, e o usuário é **avisado quando ela muda**.
- Ocorrência **concluída** não é reaberta nem alterada; o vínculo só fica registrado (DP-08, D-013).

**Avaliação pendente [Aprovado D-013]:**
- Avaliador e data prevista de avaliação são obrigatórios na conclusão do plano.
- A avaliação pode continuar pendente depois da conclusão.

### 3.5 Plano em risco — [Aprovado DP-26]

Indicador **calculado**, nunca status, com **sinais configuráveis**:

| Sinal | Exemplo de regra configurável | Parâmetro |
|---|---|---|
| **Prazo** | Faltam ≤ N dias para o prazo global | N |
| **Progresso** | % de ações concluídas abaixo do % de tempo decorrido menos uma tolerância | tolerância (%) |
| **Dependências** | Existe ação bloqueada (inclusive por dependência cancelada, DP-32) com prazo em ≤ M dias | M |

- [Aprovado] Os três sinais existem e são configuráveis. **Não há valores padrão** sem validação posterior.
- [Proposta] O plano fica **Em risco** se alguma regra ativa for atendida, e o detalhe mostra qual regra e por quê. As fórmulas da tabela são exemplos a validar.
- [Proposta] No protótipo, os valores usados ficam identificados como demonstração, não como padrão do produto.
- [Proposta] Não gera ação automática. No máximo, um aviso no sino ao responsável (princípios da DP-07).
- **Impacto:** a configuração precisa de um nível de herança (Q-05).

---

## 4. Ação — ciclo

### 4.1 Status [Proposta DP-27]

| Status | Significado |
|---|---|
| **Pendente** | Criada, não iniciada. |
| **Em execução** | Executor iniciou. |
| **Aguardando aprovação** | Só com aprovação por ação [C]. |
| **Concluída** | Finalizada (e aprovada, se for o caso). |
| **Cancelada** | Não será executada; justificativa obrigatória. |

**Indicadores (não status):**
- Bloqueada (dependência não concluída), incluindo "dependência cancelada — decisão necessária" [Aprovado DP-32];
- Atrasada [C];
- Indicadores de execução vinculada, um por desfecho [Aprovado DP-33] (seção 4.4).

Pausa individual de ação: **[Futuro DP-34]**, fora do escopo inicial; a pausa continua no nível do plano e preserva o status de cada ação (seção 3.1.1). Não há status "Pausada" para ações.

### 4.2 Transições [Proposta DP-28 a DP-31]

| # | De → Para | Condições | Quem |
|---|---|---|---|
| A1 | — → Pendente | Plano em Rascunho ou Em andamento | Responsável do plano |
| A2 | Pendente → Em execução | Plano Em andamento; dependências **Concluídas** (dependência circular é recusada) | Executor [C] |
| A3 | Em execução → Concluída / Aguardando aprovação | Evidência obrigatória se configurada | Executor |
| A4 | Aguardando aprovação → Concluída / Em execução | Recusa com motivo | Aprovador [C] |
| A5 | Pendente ou Em execução → Cancelada | Justificativa | Responsável do plano |
| A6 | Reprogramar prazo | Motivo; registra original e novo, ator e motivo [C] | Responsável do plano |

### 4.3 Dependência cancelada — [Aprovado com ajuste DP-32]

- Quando uma ação da qual outra depende é **Cancelada**, a dependente **permanece bloqueada até decisão humana**. Não é liberada automaticamente.
- O responsável escolhe entre:
  1. **remover** a dependência;
  2. **substituir** a dependência por outra ação;
  3. **cancelar** a ação dependente.
- **Remover ou substituir exige permissão, justificativa e histórico** [Aprovado].
- [Proposta] Cancelar a dependente segue a regra normal de cancelamento (A5: justificativa).
- [Proposta] "O responsável" = responsável do plano; a permissão específica para alterar dependências entra nas permissões próprias de planos.
- [Proposta] Aviso no sino ao responsável; a situação entra no sinal "Dependências" do indicador de risco (DP-26).

### 4.4 Ação executada por OS — [Aprovado] DP-33 (D-011, precisado em D-012)

1. A ação pode **referenciar** uma solicitação de Manutenção e, por ela, a OS.
2. Encerrar ou cancelar a OS **não conclui nem cancela** a ação automaticamente.
3. O **resultado, as evidências e o histórico ficam disponíveis na ação**, por consulta (Manutenção continua dona dos dados), respeitando a permissão do usuário.
4. A ação recebe um **indicador próprio para cada desfecho**.
5. O **executor decide**: conclui a ação, ou **mantém a ação aberta, registrando a justificativa**.

**Indicadores por desfecho:**

| Desfecho do objeto vinculado | Indicador na ação | Situação |
|---|---|---|
| OS **Encerrada** (resultado validado pelo gestor) | **Execução vinculada concluída** | [Aprovado D-012] — só acende com OS Encerrada; a conclusão da execução pelo técnico não basta |
| OS **Cancelada** | **OS vinculada cancelada** | [Aprovado D-012]: indicador próprio |
| Solicitação **Rejeitada** | **Solicitação vinculada rejeitada** | [Aprovado D-012]: indicador próprio |
| Solicitação **Redirecionada** | **Solicitação vinculada redirecionada** | [Aprovado D-012]: indicador próprio |
| Solicitação **Resolvida sem OS** | Solicitação vinculada resolvida sem OS | **[Proposta]**: indicador próprio, mesmo critério |
| Solicitação **Duplicada** | A ação **mantém a referência à solicitação duplicada** e pode **acrescentar uma referência à solicitação original**, só para acompanhamento. **Não há transferência automática de status nem de histórico** entre as solicitações ou para a ação. | **[Proposta, com ajuste do P.O.]** |
| Solicitação **Cancelada** pelo solicitante | Solicitação vinculada cancelada | **[Proposta]**: indicador próprio |

- [Proposta] Os nomes dos indicadores acima são de trabalho, a validar.
- [Proposta] Aviso no sino ao executor quando um indicador acende (princípios da DP-07).
- [Proposta] Se a OS cancelada levar a solicitação de volta à triagem e a uma nova OS (DP-50), a ação continua referenciando a solicitação e passa a acompanhar a nova OS; o indicador "OS vinculada cancelada" sai quando houver nova OS.

---

## 5. Solicitação — ciclo

### 5.1 Status

| Status | Final? | Situação |
|---|---|---|
| **Aberta** | Não | [Proposta DP-35] |
| **Em triagem** | Não | [Proposta DP-35] |
| **Convertida em OS** | Sim, com retorno manual e autorizado à triagem se a OS for cancelada | [Proposta DP-35] + [Aprovado DP-50] |
| **Resolvida sem OS** | Sim | [C] + [Proposta] |
| **Rejeitada** | Sim | [C] + [Proposta] |
| **Duplicada** | Sim | [C] + [Proposta] |
| **Redirecionada** | Sim: só **encaminhamento externo** | [Aprovado DP-38] |
| **Cancelada** | Sim | [Aprovado DP-40] |

### 5.2 Transições

| # | De → Para | Condições | Quem | Situação |
|---|---|---|---|---|
| S1 | — → Aberta | Descrição; ativo ou local quando conhecido; prioridade percebida; evidências; origem [C] | Solicitante [C] ou sistema (só com regra explícita, DP-49) | [C] + [Proposta] |
| S2 | Aberta → Em triagem | Triagem obrigatória [C]; alguém assume | Equipe de triagem | [Proposta] |
| S3 | Em triagem (ou Aberta, se a triagem não for obrigatória) → Convertida em OS | Cria ou anexa OS (DP-41) | Triagem, ou sistema com regra explícita (DP-49) | [Proposta] |
| S4 | → Resolvida sem OS / Rejeitada | Justificativa; solicitante avisado | Triagem | [Proposta] |
| S5 | → Duplicada | Referência à original | Triagem | [Proposta] |
| S6 | Em triagem → Redirecionada | Destino externo e motivo | Triagem | [Aprovado DP-38] |
| S7 | Aberta → Cancelada | Motivo; histórico | Solicitante | [Aprovado DP-40] |
| S8 | Convertida em OS → Em triagem | Só com a OS Cancelada; **decisão manual e autorizada**, nunca automática | Usuário de triagem com permissão específica | [Aprovado DP-50] |

### 5.3 Redirecionamento — [Aprovado DP-38]

- **Troca de equipe dentro da Manutenção:** ocorre **durante a triagem**, como ação da triagem, não status. A solicitação continua Em triagem. [Proposta] A troca fica no histórico com origem, destino e motivo.
- **Encaminhamento externo:** desfecho **Redirecionada**.
- **[Em aberto]** A lista de destinos externos (outro módulo do GRS? área fora do sistema?). [Proposta provisória] Enquanto não houver decisão, o destino fica como texto livre identificado.

### 5.4 Edição e cancelamento — [Aprovado DP-40]

| Momento | Regra | Situação |
|---|---|---|
| **Aberta** | O solicitante pode editar e cancelar. As alterações ficam no histórico. | [Aprovado] |
| **Em triagem** em diante | Edição e cancelamento **restritos conforme permissões**. | [Aprovado] |
| Detalhe da restrição | Solicitante só acrescenta comentários e evidências e pode pedir desistência; a triagem decide (ex.: Rejeitada com motivo "desistência do solicitante") | **[Proposta]** |
| Campos editáveis enquanto Aberta | Descrição, local/ativo, prioridade percebida e evidências; histórico com valor anterior e novo | **[Proposta]** |
| Motivo no cancelamento | Obrigatório | **[Proposta]** |

**Impacto:** novo status final **Cancelada**; a equipe de triagem vê o histórico das alterações feitas antes de assumir.

### 5.5 Prioridade [Proposta DP-39]

- Prioridade **percebida** (solicitante) × **definida** (triagem).
- Escala proposta: a mesma da ocorrência (Crítica, Alta, Média, Baixa, Planejada).
- A criticidade do ativo é critério possível de aprovação, mas **não define** a prioridade.

### 5.6 Uma OS para várias solicitações [Proposta DP-41]
Duplicadas acompanham a original. Uma OS pode atender várias solicitações.

---

## 6. OS e execução — ciclo

### 6.1 Status

| Status | Significado | Situação |
|---|---|---|
| **Aberta** | Em planejamento. | [Proposta DP-42] |
| **Aguardando aprovação** | Regra condicional aplicada [C]. | [C] + [Proposta] |
| **Planejada** | Autorizada, com responsável e data prevista. | [Proposta DP-42] |
| **Em execução** | Ao menos uma execução iniciada. | [Proposta DP-42] |
| **Suspensa** | Trabalho interrompido por impedimento. | **[Aprovado DP-48]** |
| **Aguardando encerramento** | Execuções concluídas; aguarda validação [C]. | [C] + [Proposta] |
| **Encerrada** | Validada pelo gestor ou responsável autorizado. | [Aprovado DP-47] |
| **Cancelada** | Não será (mais) executada; justificativa obrigatória. | [Proposta DP-42] + [Aprovado DP-51] |

**Indicador:** Atrasada.

### 6.2 Concluir × Encerrar — [Aprovado] DP-47 (D-011)

- **Concluir execução:** o técnico indica que terminou o trabalho.
- **Encerrar OS:** o gestor ou responsável autorizado valida o resultado e encerra.
- A D-008 ("Concluir" na ocorrência) **continua restrita** a Ocorrências.

### 6.3 Suspensão — [Aprovado DP-48]: status próprio

| Regra | Situação |
|---|---|
| "Suspensa" é **status**, não indicador | [Aprovado] |
| Exige **justificativa** e **responsável** | [Aprovado] |
| Histórico com **início e término** de cada suspensão | [Aprovado] |
| **Não pode suspender** enquanto houver execução em andamento | [Aprovado] |
| Desconto do período suspenso no prazo / SLA | **[Em aberto]** |
| Entra a partir de Planejada ou Em execução; "Retomar" volta ao status anterior | [Proposta] |
| Quem suspende e retoma (gestor, técnico ou ambos) | **[Em aberto]** |
| Previsão de retomada opcional; tipos de motivo (peça, acesso, terceiro…) | [Proposta] / [Em aberto] |

### 6.4 Transições

| # | De → Para | Condições | Quem | Situação |
|---|---|---|---|---|
| O1 | — → Aberta | Origem: solicitação, manual ou automática por regra explícita (DP-49) | Gestor ou sistema | [C] + [Aprovado DP-49] |
| O2/O3 | Aberta → Aguardando aprovação → Planejada / Cancelada | Regra condicional [C]; recusa com motivo | Sistema / Aprovador | [Proposta DP-43] |
| O4 | Aberta → Planejada | Responsável e data prevista; sem aprovação pendente | Gestor | [Proposta DP-44] |
| O5 | Planejada → Em execução | Primeira execução iniciada | Técnico | [Proposta DP-45] |
| O6 | Em execução → Aguardando encerramento | Execuções concluídas | Técnico | [Proposta DP-45] + [Aprovado DP-47] |
| O7 | Aguardando encerramento → Encerrada / Em execução | Validações [C]; recusa com motivo | Gestor ou responsável autorizado | [Aprovado DP-47] |
| O8 | Planejada ou Em execução ⇄ Suspensa | Seção 6.3 | A definir | [Aprovado DP-48] + [Em aberto: quem] |
| O9 | Aberta, Aguardando aprovação, Planejada, Em execução ou Suspensa → Cancelada | Justificativa obrigatória; seção 6.6 | Gestor | [Aprovado DP-51] + [Proposta: estados de origem e quem] |

### 6.5 Geração automática — [Aprovado DP-49]

- **Nenhuma geração automática por padrão.**
- Cada regra declara explicitamente **qual objeto gera** (solicitação ou OS) e **quais aprovações são necessárias**.
- [Proposta] A regra também define a origem (sinal do Monitor, não conformidade, **plano de manutenção preventiva** — termo da Q-06, D-013), as condições e o local ou grupo de ativos de aplicação; o objeto gerado registra no histórico a regra que o gerou.
- **Impacto:** formato da regra depende da Q-05 (onde configurar), da Q-06 (plano preventivo) e da Q-19 (sinal que altera a condição do ativo).

### 6.6 Cancelamento — [Aprovado DP-50, DP-51]

**DP-51 — cancelar OS em execução [Aprovado]:**
- **Justificativa obrigatória.**
- **Execuções e trabalho parcial preservados** (execuções, evidências e comentários).
- Relatórios **diferenciam** OS cancelada **sem execução** de OS cancelada **com trabalho parcial**.
- Execução Em andamento no momento do cancelamento: **[Ajustado D-013]** o gestor não pode concluí-la em nome do técnico. A execução precisa ser concluída pelo técnico ou marcada **Interrompida** (seção 6.7) antes do cancelamento da OS. O status Interrompida é proposta, aguardando validação.

**DP-50 — efeito na solicitação [Aprovado com ajuste]:**
- Cancelar a OS **não cancela automaticamente** a solicitação.
- A solicitação **mantém o histórico da conversão e da OS cancelada**.
- O retorno para **Em triagem** é **decisão manual e autorizada** (S8), nunca transição automática.
- [Proposta] Enquanto ninguém decide, a solicitação continua "Convertida em OS" com o indicador "OS cancelada — decisão da triagem" e o solicitante é avisado.
- **[Em aberto]** Qual permissão autoriza o retorno à triagem e se a solicitação pode ficar indefinidamente nesse estado.

### 6.7 Execução [Proposta DP-46] + [Ajuste do P.O. na DP-51, D-013]

- OS com 1..n execuções.
- Execução: **Em andamento → Concluída** (o técnico conclui, DP-47) **| Interrompida**.
- **Interrompida [Proposta, por orientação do P.O. na D-013]:**
  - O gestor **não pode** registrar como concluída uma execução que não foi efetivamente concluída.
  - Uma execução Em andamento pode ser marcada **Interrompida**, com justificativa e responsável, preservando o trabalho parcial (comentários, evidências, horários).
  - Interrompida é final para aquela execução. Retomar o trabalho exige uma **nova execução**.
  - Com nenhuma execução Em andamento, a OS pode ser **cancelada** (DP-51) ou **suspensa** (DP-48).
  - [Em aberto] Quem pode interromper: proposta, o gestor de manutenção e o próprio técnico atribuído.
  - [Em aberto] Se "Interrompida" também pode ser usada para viabilizar a suspensão, além do cancelamento. Proposta: sim, pela mesma regra.
- **Q-09 [Aprovado D-013]:** visão móvel demonstrativa de "Minhas OS" e execução, online, na aplicação GRS, sem usar o app de Rotinas. Offline continua como evolução futura. Não define tecnologia nativa nem arquitetura mobile definitiva.

---

## 7. Resumo

**Aprovado:**
- **D-011:** DP-47 (Concluir execução × Encerrar OS); DP-33 (OS não conclui a ação; executor decide); DP-25 como diretriz conceitual.
- **D-012:** DP-23 (Concluído final; novo plano relacionado), DP-24, DP-26, DP-32 (com permissão, justificativa e histórico), DP-34 (evolução futura), DP-38, DP-40, DP-48 (status Suspensa), DP-49, DP-50 (retorno manual e autorizado), DP-51 e a precisão da DP-33 (indicador de conclusão só com OS Encerrada; indicadores próprios por desfecho).

**Orientações do P.O. para análise futura (não aprovadas):** DP-25a, DP-25b, DP-25c e a regra de acesso via plano (detalhamento proposto na seção 2.2).

**Propostas aguardando validação:** ciclo-base DP-16 a DP-22, DP-27 a DP-31, DP-35 a DP-37, DP-39, DP-41 a DP-46; arquitetura da seção 2; detalhes marcados [Proposta] dentro de itens aprovados (herança de vínculos no plano relacionado, indicadores para Resolvida sem OS / Duplicada / Cancelada, campos editáveis da solicitação, entrada e retomada da suspensão, estados de origem do cancelamento da OS).

**Em aberto:**
- DP-08 (reformulado); DP-10a (plano em Rascunho e plano vinculado depois da criação; condiciona o efeito do plano relacionado da DP-23);
- plano relacionado com eficácia Eficaz; data prevista de avaliação;
- destinos externos (DP-38);
- desconto de tempo na suspensão; quem suspende e retoma; tipos de motivo;
- execução em andamento no cancelamento da OS;
- permissão do retorno à triagem;
- Q-05, Q-06, Q-09, Q-19.
