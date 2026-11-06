# Referência funcional — Gestão de Rotinas e Gestão de Ocorrências (produto atual)

> **Situação:** transcrição revisada pelo P.O. (Q-03) em 2026-11-06; G-I-04 a G-I-07 decididas (seção 4.1). Consulta à documentação oficial em 2026-11-06.
> **Uso:** orientar a etapa 5 do protótipo preservando o produto existente. Este documento **não substitui** `docs/04`, `docs/06` nem os PRDs.

## 0. Como ler este documento

### 0.1 Convenções

| Marca | Significado |
|---|---|
| **[Existente]** | Comportamento descrito na documentação oficial do produto atual. Seções 1, 2 e 3 contêm **apenas** isso. |
| **[Proposta GRS]** | Comportamento definido para a Linha GRS em `docs/04`, `docs/06`, `PRD-GESTAO-DE-ROTINAS.md` e `PRD-GESTAO-DE-OCORRENCIAS.md`. Aparece somente na seção 4. |
| **G-xx** | Pendência: a documentação não esclarece. Não implementar com suposição; usar o comportamento provisório mais simples e registrar (CLAUDE.md). |
| **I-xx** | Inconsistência entre páginas da documentação oficial. Precisa de decisão sobre qual versão vale. |
| `[Fnn]` | Fonte (tabela 0.2). |

Termos entre aspas são grafados como na documentação. Onde não há aspas, o texto é paráfrase fiel.

### 0.2 Fontes

Base: `https://documentacao.senior.com.br/seniorxplatform/manual-do-usuario/ronda/`

| Id | Página | Caminho (após a base) |
|---|---|---|
| F01 | Gestão de Rotinas (início) | `home-gestao-de-rotinas.htm` |
| F02 | Requisitos técnicos / implantação | `gestao-de-rotinas/requisitos.htm` |
| F03 | Checklists | `gestao-de-rotinas/checklist.htm` |
| F04 | Pontos de controle | `gestao-de-rotinas/pontos-de-controle.htm` |
| F05 | Contatos (web) | `gestao-de-rotinas/contatos.htm` |
| F06 | Dispositivos móveis (início) | `gestao-de-rotinas/dispositivos-moveis.htm` |
| F07 | Cadastro de dispositivos móveis | `gestao-de-rotinas/dispositivos-moveis/cadastro.htm` |
| F08 | Monitoramento do dispositivo móvel | `gestao-de-rotinas/dispositivos-moveis/monitoramento-dispositivo-movel.htm` |
| F09 | Plano de rotina | `gestao-de-rotinas/plano-de-rotina.htm` |
| F10 | Consulta de rotinas | `gestao-de-rotinas/consulta-de-rotinas.htm` |
| F11 | Relatórios (início) | `home-relatorios-gestao-de-rotinas.htm` |
| F12 | Relatório de rotinas | `gestao-de-rotinas/relatorio/relatorio-de-rotinas.htm` |
| F13 | Relatório de checklists | `gestao-de-rotinas/relatorio/relatorio-de-checklists.htm` |
| F14 | Aplicativo (início) | `home-aplicativo-gestao-de-rotinas.htm` |
| F15 | App — Entrar e validar token | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/entrar-e-validar-token.htm` |
| F16 | App — Verificar localização | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/verificar-localizacao.htm` |
| F17 | App — Menu e rotinas | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/menu-e-rotinas.htm` |
| F18 | App — Iniciar rotina | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/iniciar-rotina.htm` |
| F19 | App — Visualizar pontos de controle | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/visualizar-pontos-de-controle.htm` |
| F20 | App — Fazer checklists | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/fazer-checklists.htm` |
| F21 | App — Justificativa | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/justificativa.htm` |
| F22 | App — Registrar ocorrências | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/registrar-ocorrencias.htm` |
| F23 | App — Contatos | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/contatos.htm` |
| F24 | App — Alarme de pânico | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/alarme-de-panico.htm` |
| F25 | App — Status de sincronização | `gestao-de-rotinas/aplicativo-gestao-de-rotinas/status-de-sincronizacao.htm` |
| F26 | FAQ Gestão de Rotinas | `gestao-de-rotinas/faq.htm` |
| F27 | Gestão de ativos (Rotinas) | `gestao-de-rotinas/gestao-de-ativos.htm` |
| F28 | Feriados | `cadastros-gerais/feriados.htm` |
| F29 | Permissões | `implantacao/permissoes.htm` |
| F30 | Gestão de ocorrências | `security-hub/gestao-de-ocorrencias.htm` |
| F31 | Monitor Web (Monitoramento) | `security-hub/monitoramento.htm` |
| F32 | Integração de ocorrências via API | `integracoes/integracao-ocorrencias.htm` |
| F33 | Security Hub (início) | `home-security-hub.htm` |
| F34 | Dispositivos (controle de acesso) | `integracoes-com-dispositivos/dispositivos.htm` |

Os links do enunciado com `#` (`ronda/#home-gestao-de-rotinas.htm`) abrem as mesmas páginas.

### 0.3 Limites desta transcrição

- A leitura foi automatizada e os trechos citados são curtos. Antes de usar como regra definitiva, recomenda-se **conferência humana por amostragem** dos itens marcados como regra, principalmente nas seções 1.7 e 2.4.
- As páginas não mostram data nem versão. O documento descreve a documentação na data da consulta, que pode estar defasada em relação ao produto.
- As páginas não lidas estão na seção 7.

---

## 1. Gestão de Rotinas — [Existente]

### 1.1 Propósito e navegação

- Visão padronizada de checklists e rotinas auditáveis, conectada ao Senior X, com aplicativo móvel nativo. O operador registra checklists, anexa áudio, vídeo e fotos e gera ocorrências vinculadas à Gestão de Ocorrências. Parte dos recursos de Gestão de Ocorrências vem com a licença de Gestão de Rotinas. [F01]
- Pontos de controle são validados por "geolocalização ou QR Codes". [F01]
- Menu web: **Gestão de Riscos e Segurança | Ronda X > Gestão de Rotinas >**
  - Plano de Rotina [F09]
  - Pontos de controle [F04]
  - Checklists [F03]
  - Contatos [F05]
  - Dispositivos Móveis > Cadastro [F07] / Visualizar Status [F08]
  - Consulta de Rotinas [F10]
  - Relatório > Relatório de Rotinas [F12] / Relatório de Checklists [F13]
  - Gestão de ativos [F27] (ver G-R-20)

### 1.2 Pré-requisitos de implantação [F02]

Ordem descrita na implantação:

1. **Fuso horário** (Cadastros Gerais > Fusos Horários). Padrão: Brasília (-03:00). Campos: Nome, Fuso Horário e Ajuste de horário (em horas, para horário de verão).
2. **Local físico** (Cadastros Gerais > Locais físicos > "Adicionar raiz"). Campos: Descrição e Fuso Horário.
3. **Papéis Ronda**: no mínimo dois. Nomes sugeridos: "Operador do Gestão de Rotinas" e "Gestor de Rotinas".
   - Operador: Ocorrências — Visualizar e Incluir.
   - Gestor: Visualizar e Incluir em Papéis, Pessoas, Locais, Ocorrências, Tratamento de Ocorrências, Consulta de Ocorrências e Indicadores de Ocorrências.
4. **Papéis Senior X** (Tecnologia > Administração > Gestão de Papéis). Atividade "Gestão de Rotinas - Operador" ou "Ronda Gestão de Rotina - Gestor", com Incluir, Visualizar e Editar.
5. **Usuário** (Tecnologia > Administração > Gestão de Usuários). Campos: Nome completo, Login, Domínio, E-mail, Senha e Confirmar senha. Desmarcar "Alterar senha após autenticar" e vincular o papel.
6. **Pessoa** (Cadastros gerais > Pessoas). Campos: Nome, Tipo de Documento e Documento. Vincular o papel (Data Final não obrigatória) e o usuário.
7. **Tipo de ocorrência**: Nome e Prioridade padrão. Regra citada: "Para que uma ocorrência apareça na listagem de um plano de rotinas, o tipo dela precisa ter a prioridade padrão como Crítica." (ver I-09)
8. Plano de rotina, pontos de controle, checklists, rotinas e contatos (seções 1.3 a 1.6).
9. **Preparação de campo**:
   - Imprimir os QR Codes do plano e dos pontos. Para áreas externas, usar acrílico, PVC ou plastificação.
   - Instalar o app.
   - Fazer login e informar o código de ativação.
   - Conceder permissão de localização, inclusive "mesmo quando o aplicativo estiver em segundo plano".
- **Plataformas suportadas:** Android "9.0 (Pie) e superior" e iOS "12 e superior". [F02][F26]
- **Armazenamento de anexos:** 10 GB incluídos, com possibilidade de contratar mais. Tamanhos de referência:
  - foto JPG: ~400 KB;
  - áudio MP3 de até 1 min: ~120 KB;
  - vídeo MP4 de até 30 s: ~7 MB. [F02][F26]

### 1.3 Cadastro: Plano de Rotina [F09]

Acesso: Gestão de Rotinas > Plano de Rotina > Adicionar. O formulário tem as abas Dados gerais, Ponto de Controle, Checklists, Cadastro de Rotinas e Contato [F02], seguidas de um Resumo [F09].

**Dados gerais**

| Campo | Regras / valores |
|---|---|
| Nome do Plano de Rotina | — (obrigatoriedade não informada, G-R-01) |
| Área do plano de rotina | Lista única com 24 opções: Outros, Segurança Patrimonial, Manutenção, Segurança do trabalho, Facilities, Portaria e Recepção, Administrativo, Recursos Humanos, Estoque, Almoxarifado, Gestão de Riscos, Industria, Construção, Agronegócio, Mineração, Varejo, Serviços, Financeiro, Saúde, Alimentação e Bebidas, Consultoria, Auditoria, Atacado e Distribuição, Transporte e Logística. (Em F02 aparece como "Tipo do plano", ver I-06.) |
| Local físico | Referência ao cadastro geral de locais físicos. |
| Tipo de ocorrência | Tipo crítico usado pelo botão de pânico, "caso deseje habilitar o botão de pânico no aparelho móvel". |
| Lista de feriados | Usada "para definir se a rotina executa ou não de acordo com a lista selecionada" (efeito exato: G-R-02). |
| Latitude / Longitude | Coordenadas do plano. |
| Tolerância | Distância, em metros, dentro da qual o plano pode ser executado. |
| Permite seleção manual | Se marcado, o plano aparece na opção "Lista" da verificação de localização do app [F16]. |
| Status | Ativo / Inativo. "Optando por Inativo ele não será utilizado." |
| Observação | Texto livre. |

**Controles** (vínculo de pontos e checklists ao plano)

- Colunas: Ponto de Controle, Tipo de controle (Ativo, Pessoa, Local físico, Checklist ou Personalizado), Tipo de validação, Vinculado com e Ações.
- Ponto "Sem validação" exige checklist.
- Ponto com local físico só aceita checklists que tenham tipo de ocorrência.
- "Desvincular" não exclui o checklist.

**Resumo**: mostra o local e as rotinas (nome, horário, recorrência, se é agendada e, para não agendadas, o máximo de execuções).

### 1.4 Cadastro: Rotina e agendamento [F09][F02]

| Campo | Regras / valores |
|---|---|
| Nome da rotina | — |
| Rotina inicia em | Obrigatório. |
| Rotina termina em | Opcional. |
| Status | "Ativo" / "Desativado" (F02 usa Ativo/Inativo, ver I-02). |
| Rotina agendada | Sim / Não. **Não pode ser alterado depois de salvo.** |
| Tipo de ocorrência | Define que "quando essa rotina não for executada, uma ocorrência seja acionada". Vale **apenas para rotinas agendadas**. O sistema verifica rotinas não executadas **a cada 10 minutos**. |
| Termina após X execuções | Só para rotinas **não agendadas**. Em branco = ilimitado. |

**Agendamento** (somente quando Rotina agendada = Sim)

- Campos: Horário de início, Horário de término, Ativo e Recorrência.
- Recorrência:
  - **Diária**: "Padrão de recorrência" a cada N dias.
  - **Semanal**: dias da semana.
  - **Mensal**, em dois padrões:
    - (a) dia do mês + intervalo em meses (ex.: dia 5 a cada 2 meses);
    - (b) semana do mês (primeira, segunda, terceira, quarta ou última) + dia da semana + intervalo em meses.
- F02 também cita "Termina após" no agendamento (ver G-R-03).

### 1.5 Cadastro: Pontos de controle [F04]

**Lista**

- Filtros: Nome, Tipo, Plano de Rotina e Status ("Ativo", "Desativado", "Todos").
- Colunas: Identificador, Nome, Tipo e Nome do Plano de Rotina.
- Ações: Editar e Excluir.

**Formulário**

| Campo | Regras / valores |
|---|---|
| Nome do Ponto de Controle | Exibido no app. |
| Plano de Rotina | Obrigatório: "Todo Ponto de Controle deve ser atrelado a um Plano de Rotina cadastrado". |
| Tipo de Ponto de Controle | Personalizado (padrão), Ativo, Local Físico, Pessoa ou Veículo. "Após a criação do Ponto de Controle, não é possível alterar o tipo de ponto." |
| Tipo de Validação | "QR Code", "Geolocalização" ou "Sem validação" (F02 lista "Básico" em vez de "Sem validação", ver I-01). |
| Status | Ativo / Inativo. Inativo retira o ponto dos roteiros. |
| Observação | Texto livre. |
| Local Físico | Opcional no tipo Personalizado. Com local preenchido, "não é possível associar a esse ponto de controle checklists sem o tipo de ocorrência preenchido". |
| Latitude / Longitude | Recomendadas pelo menos 5 casas decimais (5 casas ≈ 1,11 m). Há busca no mapa (lupa). |
| Raio do Perímetro | Em metros, definido por controle deslizante (ver I-11). |

**Obrigatoriedade da referência conforme o tipo**

| Tipo | Referência |
|---|---|
| Personalizado | Local físico opcional. |
| Ativo | Ativo obrigatório. |
| Local Físico | Local físico obrigatório. |
| Pessoa | Opcional; pode ser preenchida no app. |
| Veículo | Opcional; pode ser preenchida no app. |

### 1.6 Cadastro: Checklists [F03][F02]

**Lista**

- Filtros: Nome do Checklist e Status (Ativo, Inativo, Todos). Por padrão, só os ativos.
- Colunas: Indicador, Nome do Checklist, Nome do Plano de Rotina, Status e Ações.
- As linhas podem ser reordenadas por arraste. Se o salvamento falhar, o item é indicado pelo nome e não é salvo.
- Ações: Visualizar, Editar, Duplicar, Associar Ocorrência e Excluir.
  - **Associar Ocorrência** oferece os graus "Ocorrência Crítica", "Ocorrência Alta", "Ocorrência Média", "Ocorrência Baixa" e "Ocorrência Planejada".

**Formulário**

| Campo | Regras / valores |
|---|---|
| Nome do Checklist | Obrigatório. |
| Plano de Rotina | Um ou mais. |
| E-mail | Gestor notificado quando o checklist resulta "Não Conforme". |
| Tipo de checklist | Obrigatório, escolha única entre 21 opções: Outros, Ronda perimetral, Manutenção de Ativos e Equipamentos, Controle de Ativos, Vistoria e Auditoria, Sistemas de proteção e contra incêndio, Auditoria de sistemas de segurança, ISO, PDCA, Auditoria de Normas Técnicas (NRs), Qualidade, Estoque, Certificação, Entregas, Veículos, Carga/descarga, Inspeção, Recebimentos, Expedição, EPI (Equipamento de Proteção Individual), Manutenção e limpeza. |
| Status | Ativo / Inativo. "Os inativos não serão listados ao associar um checklist a um ponto de controle." |
| Itens | Cada item tem Descrição, Tipo de ocorrência (lupa), Opções de respostas (lupa), Configuração de anexo e Configuração da observação. |

**Tipos de resposta (Opções de respostas)**

| Opção | Avalia conformidade? | Regras |
|---|---|---|
| Conforme / Não conforme | Sim | — |
| Conforme / Não conforme / Não se aplica | Sim | Efeito de "Não se aplica" no score: G-R-08. |
| Nota de 0 a 10 | Sim | Exige "Nota para Não Conforme". Essa nota e todas as menores são não conformes. Ex.: com 5, as notas 5, 4, 3… são não conformes e 6 em diante são conformes. |
| Assinatura Digital / "Assinatura Desenhada" | Não informado (G-R-08) | Até cinco assinantes, pelo menos um. Aviso do produto: a assinatura desenhada "não garante, por si só, validade jurídica plena". No app, o assinante é escolhido por nome, documento ou reconhecimento facial [F20]. (I-03) |
| Texto | Não | Texto livre, sem avaliação de conformidade. |
| Pessoa | Não informado | Não tem a opção "Obrigatório quando não conforme". No app, escolha por nome, documento ou reconhecimento facial. |

**Configuração de anexo e de observação** (por item)

- F03 nomeia as opções "Não obrigatório", "Não conforme" (obrigatório só quando não conforme) e "Todos" (sempre obrigatório).
- F02 e F09 nomeiam as mesmas opções "Opcional", "Obrigatório para 'Não Conforme'" e "Obrigatório" (ver I-04).

**Outras funções**

- **IAssist**: gera itens a partir de um prompt, em uma tabela de pré-visualização editável. Itens gerados com resposta "Nota" recebem por padrão "Nota para 'Não Conforme' = 5" e anexo/observação opcionais.
- **Duplicar**: copia apenas os itens. Exige permissão de inclusão e não salva sem nome ou sem itens.
- **Efeito da não conformidade** (citação): "Se o checklist tem um Tipo de ocorrência associado a ele e o ponto de controle possui um local físico… uma ocorrência do tipo definido é gerada automaticamente no Painel de Ocorrências." Os e-mails cadastrados também são notificados.

### 1.7 Cadastro: Contatos [F05][F23]

- **Lista**: filtros Nome e Telefone; colunas Identificador, Telefone e Nome; ações Editar e Excluir.
- **Campos**:
  - Nome do contato: "Não é permitido o cadastro com nomes salvos anteriormente."
  - Telefone: não pode repetir; formato "+XX ou (XX) com 8 ou 9 dígitos".
  - Planos de Rotina: opcional.
- **No app**: tocar no nome liga para o contato ou mostra suas informações, com busca por nome. "Todos os contatos que aparecem nesta tela são associados ao plano de rotina."
- F02 descreve que, ao salvar um contato no plano, é exibido um código de ativação a informar no primeiro acesso do dispositivo (ver G-R-04).

### 1.8 Cadastro: Dispositivos móveis [F07][F08]

**Cadastro**

- Acesso: Gestão de Rotinas > Dispositivos Móveis > Cadastro.
- O dispositivo precisa ser cadastrado e ativado antes do uso do app.
- Filtros: Nome, Telefone, Status (Ativo, Inativo, Todos) e Plataforma (Android, iOS).
- Colunas: Identificador, Nome do Dispositivo Móvel, Telefone, Status e Plataforma.

| Campo | Regras |
|---|---|
| Nome do Dispositivo Móvel | — |
| Telefone | "+XX ou (XX) com 8 ou 9 dígitos". |
| Plataforma | Android / iOS. |
| Status | Ativo permite o acesso. Inativo revoga o acesso e "não gerará um código de ativação". |
| Código de ativação | Ações > Editar > Código de ativação > "Gerar novo". Tem 5 dígitos [F15]. Após a ativação, são preenchidos automaticamente: Data da ativação, identificador do aparelho e usuário que ativou. |

Regra citada: "Será necessário gerar um novo código sempre que houver a troca de aparelho/dispositivo móvel ou quando for realizada a limpeza de cache/memória do aplicativo."

**Visualizar Status** [F08]

- Filtro: Dispositivo Móvel (lupa com os dispositivos ativos) e botão "Filtrar".
- Mapa com todos os dispositivos. Cada ícone mostra Nome do dispositivo móvel, Nível da bateria, Nome da pessoa e Data da Comunicação.
- Tabela de dispositivos ativos: Nome do dispositivo móvel, Nível da bateria (%), Nome da pessoa registrada, Data da comunicação e Ações (botão de localização).
- Coleta: "As informações sobre o dispositivo móvel são coletadas a cada 5 minutos pelos servidores", com o app em primeiro ou segundo plano. "Não há coleta de dados caso não haja um usuário autenticado em uso do aplicativo."

### 1.9 Cadastro auxiliar: Feriados [F28]

- Usado em faixas horárias, escalas e planos de rotina.
- O caminho citado fica em Controle de acesso > Dispositivos > Feriados (ver I-07).
- Campos:
  - lista: Nome;
  - feriado: Descrição e Data;
  - "Recorrente": quando marcado, usa apenas dia e mês.

### 1.10 Gestão de ativos dentro de Rotinas [F27]

- Caminho citado: Gestão de Rotinas > Tipos de ativo (possível erro de texto na página).
- Filtros: Descrição, Número de Série, Data de início/fim da Validade, Tipo de Ativo e Status (Ativo, Inativo, Todos).
- Campos: Tipo de Ativo, Descrição, Fabricante, Número de Série, Data de Fabricação, Data de Validade, Imagem do Ativo e Ativo/Inativo.
- Relatório: "caso o ativo esteja dentro da validade a sua situação fica como Válido e fora da validade fica como Inválido."
- Campos customizados: domínio "grs_asset", serviço "management".
- **Atenção:** existe um cadastro de ativos no produto atual. A relação com a Central de Ativos do GRS foi decidida em D-007 (ver 4.1.3): o cadastro é preservado e integrado à Central.

### 1.11 Consulta de Rotinas [F10]

**Filtros**

- Rotina/Plano (lupa);
- Data de início / Data de fim;
- Status (seleção múltipla);
- Rotinas agendadas (Sim / Não / Todas).

**Colunas**

- Data de início, Data de fim, Planos de Rotina, Status, Score, Observações e Ação.
- **Score** = percentual de checklists conformes da rotina.

**Linha expansível "Controles"**

- Descrição do controle (para pontos de veículo, mostra placa e tipo de checklist), Tipo de controle, Data e hora de início e Score.
- "Inspecionado" mostra "-" para Pessoa sem registros e para Personalizado.

**Visualizar — Detalhes da Rotina**

- Identificador, Data de início, Data de fim, Iniciada em, Finalizada em, Responsável e Status.
- Seções: Ponto de Controle (com "Data de finalização do ponto de controle"), Assinatura desenhada, Texto e Pessoa.
  - A seção Assinatura desenhada é uma tabela com Documento, Status da assinatura, Assinante, Assinado em e Versão.

**Exportar**: gera relatório com os detalhes e as imagens de evidência. O sistema pergunta se deve iniciar ou cancelar. Formato não informado.

### 1.12 Status da rotina [F10][F17][F18][F19][F21]

| Status | Definição (citação ou paráfrase fiel) | Onde aparece |
|---|---|---|
| Pendente | "rotinas que estão dentro do horário previsto e ainda não foram iniciadas" | web e app |
| Em execução | "dentro do horário e possuem ao menos um ponto de controle verificado" | web e app (o Relatório usa "Em andamento", I-05) |
| Interrompida | "o usuário finalizou a execução da rotina no aplicativo, mas sem completar todos os pontos de controle" | web |
| Concluída | "todos os pontos de controle foram concluídos com sucesso" | web |
| Incompleta | "rotina finalizada sem ler todos os pontos de controle. Neste caso, é necessário que o usuário apresente justificativa" | web |
| Não realizada | "rotinas pendente não foi iniciada e não teve os pontos de controle verificados" | web e app (aba Não agendadas) |
| Finalizado Parcialmente | "rotinas concluídas com ponto(s) de controle cancelados" | só no filtro da Consulta |
| Futura | Sem definição | só no app (Próximas rotinas, aba Agendadas) |

**Transições documentadas** (como condições, não como diagrama)

| De | Para | Gatilho |
|---|---|---|
| Pendente | Em execução | Primeiro ponto de controle verificado. |
| Em execução | Concluída | Todos os pontos concluídos com sucesso. |
| Em execução | Interrompida | Operador finaliza sem completar todos os pontos. |
| Em execução | Incompleta | Operador finaliza sem ler todos os pontos, com justificativa obrigatória. |
| Em execução | Finalizado Parcialmente | Concluída com ponto(s) cancelado(s) (cancelamento exige justificativa [F19]). |
| Pendente | Não realizada | Não iniciada e sem pontos verificados. **Momento do gatilho não informado** (G-R-05). |

Pendências: G-R-05 a G-R-07, além de I-05.

### 1.13 Relatórios [F11][F12][F13]

**Comum aos dois relatórios**

- Parâmetro "Executar" (emissão imediata) ou "Agendar" (emissão diária, enviada pelas notificações do Senior X).
- Período: Data de início/fim e Horário de início/término. No modo Agendar, Data de fim e Horário de término ficam ocultos e o relatório roda diariamente no Horário de início, com os dados até esse horário.
- Exportar:
  - Formato: "PDF, CSV, HTML, XLSX, XML, ODT e RTF".
  - Envio: "Não enviar, E-mail anexo e E-mail link". Com e-mail, há os campos Assunto, Para, Cc e Cco.
  - Disponível por (dias).
  - Timezone: Não informar timezone; America/DeNoronha (GMT-2); America/Sao_Paulo (GMT-3); America/Manaus (GMT-4); Brazil/Acre (GMT-5); Não aplicar timezone.
- Relatórios agendados exigem permissão de edição e visualização em `res://senior.com.br/platform/scheduler/job` e são excluídos em Tecnologia > Customização > Agendamento > Platform > Report.

**Relatório de Rotinas**

- Filtros: Planos de rotinas, Rotina, Operador e Status.
- Status oferecidos: "Todas, Pendente, Em andamento, Concluída, Incompleta, Interrompida e Não realizada" (ver I-05).

**Relatório de Checklists**

- Filtros: Ponto de Controle, Rotina, Pessoa inspecionada, Opções de Respostas dos Checklists (as seis opções) e Situação Checklist ("Conforme", "Não Conforme" e "Não se aplica", se habilitado).
- Notas são comparadas à "Nota para Não Conforme". Ex.: com corte 6, Conforme mostra notas ≥ 7 e Não Conforme mostra notas ≤ 6.
- Não tem filtro de status.

### 1.14 Aplicativo móvel [F14–F25]

#### 1.14.1 Acesso e ativação [F15]

- Login: campo "E-mail" > "Avançar" > "Senha" (senha do Senior X) > "Entrar". Há "Recuperar senha". (F02 fala em "login@domínio", ver I-08.)
- **Primeiro acesso**:
  - Política de privacidade: "Ao recusar a Política de Privacidade, não será possível prosseguir com o uso do aplicativo."
  - Permissões solicitadas: câmera, microfone, localização e galeria.
  - Token de 5 dígitos gerado no cadastro do dispositivo (1.8).
- A identidade do operador vem do login de cada um, então dispositivos compartilhados são suportados [F26].

#### 1.14.2 Verificar localização [F16]

Exibida após o login e a permissão de localização. Há três opções:

| Opção | Comportamento |
|---|---|
| Geolocalização | Usa a localização do aparelho. O mapa mostra o plano e o raio do perímetro. |
| QR Code | "A ativação de localização por QR Code deve ser feita no plano de rotina." Abre a câmera para leitura. |
| Lista | Mostra os planos com "Permite seleção manual". |

"Cancelar" "solicitará o logoff do sistema".

Na barra de local do menu, "Trocar" volta a essa tela [F17].

#### 1.14.3 Menu principal [F17]

- **Próximas rotinas**: rotinas Pendente, Em Execução e Futura. Mostra até cinco, ordenadas pela data de início.
- **Rotinas sem agenda**: as cinco rotinas não agendadas mais executadas.
- **Menu inferior**: Início, Rotinas, Contatos, Ocorrências e Pânico. O Pânico "só ficará disponível aos usuários que possuem um Tipo de Ocorrência configurado".
- **Menu lateral**: Início, Rotinas, Contatos, Ocorrências, Política de Privacidade e Sair. Mostra a data da última sincronização de dados e o identificador do dispositivo.

#### 1.14.4 Iniciar rotina [F18]

- **Abas**:
  - Agendadas: Em execução, Pendente ou Futura.
  - Não agendadas: Em execução, Pendente ou Não realizada.
  - Histórico: rotinas executadas ou expiradas nas últimas 24 horas.
- **Regras citadas**:
  - "Somente é possível iniciar uma rotina caso o horário de início seja maior ou igual ao horário atual" (ver G-R-06).
  - "Não é possível iniciar uma rotina caso o horário final seja menor que o horário atual."
  - "Não é possível iniciar uma rotina caso esteja com outra rotina em execução."
  - Rotina ainda não liberada: "Essa rotina ainda não pode ser executada."
- **Notificação**: "Sempre que uma nova rotina está pronta para iniciar, o aplicativo … emitirá uma notificação". Ela aparece mesmo com o app fechado, e tocar nela inicia a rotina.

#### 1.14.5 Pontos de controle durante a execução [F19]

- **Tela**: Pontos (total e verificados), Cronômetro e lista de Pontos de Controle com status "Pendente" ou "Concluída com sucesso". "Ver detalhes" mostra as informações do ponto.
- **Validação**:
  - Geolocalização: "A geolocalização é feita em um raio de até 50 metros do ponto de controle" (conflita com o Raio do Perímetro configurável, I-11).
  - QR Code: lido pela câmera do app.
  - "Caso o aplicativo não consiga verificar a localização, haverá uma tela de justificativa…" (1.14.7).
  - A geolocalização "é capturada mesmo em rotinas que possuam QR Codes" [F26].
- **Pontos Pessoa e Veículo**: busca de pessoa e, para veículo, tela de busca e seleção do veículo. Offline, a busca usa só as pessoas da base local e o reconhecimento facial usa só as biometrias já sincronizadas.
- **Cancelar ponto ou checklist pendente**: deslizar para a esquerda, confirmar e informar justificativa obrigatória.
- **Concorrência**: "É possível ter dois usuários autenticados acessando o mesmo plano de rotina. … os dados do segundo usuário serão descartados" (ver G-R-10).
- **Finalizar rotina**: se nem todos os pontos foram lidos, o app abre a justificativa.

#### 1.14.6 Fazer checklists [F20]

- Só aparecem os checklists configurados em Gestão de Rotinas > Checklists.
- **Cabeçalho**:
  - local;
  - Botão de Pânico;
  - contador de checklists, que "serve como um status de execução do roteiro";
  - cronômetro desde o início.
- **Respostas**:
  - Padrão: Conforme / Não Conforme, mais "Não se aplica" se habilitado.
  - Nota: botões de 0 a 10.
  - Assinatura Desenhada, Texto e Pessoa, como em 1.6.
- **Evidências**:
  - Ícones de áudio e câmera.
  - Limites por checklist: "um áudio de até 60 segundos, um vídeo de no máximo 30 segundos e 3 registros de fotos".
  - A obrigatoriedade segue a "Configuração de anexo".
- **Observações**: texto livre, obrigatório ou não conforme a "Configuração de observação".
- **Navegação**:
  - Voltar e Avançar entre checklists.
  - Ao final, Resumo, com "Editar" e "Concluir".
  - Depois, a tela de pontos mostra o status "Concluído" e o botão "Finalizar rotina".

#### 1.14.7 Justificativa [F21]

| Situação | Campos | Regras |
|---|---|---|
| Localização não verificada | Texto e botão "Justificar". Sucesso: "Concluída com sucesso". | Texto obrigatório; não aceita vazio nem só espaços. Sem justificativa, o operador precisa estar "no raio de geolocalização" ou usar QR Code para seguir ao checklist. |
| Finalizar antes do fim ou com checklists incompletos | Botão "!", aviso de que a rotina será encerrada sem conclusão, texto e evidências opcionais ("Pode-se também adicionar evidências"). Botão "Sim, finalizar rotina". | Texto obrigatório; não aceita vazio nem só espaços. |
| Cancelar ponto ou checklist [F19] | Motivo. | Obrigatório. |

A justificativa é texto livre; não há lista de motivos (G-R-11).

#### 1.14.8 Registrar ocorrências no app [F22]

- **Acesso**: botão Ocorrências no menu principal, no lateral ou no inferior.
- **Consulta**: abas "Hoje" e "Histórico", só com as ocorrências do próprio usuário, das mais recentes para as mais antigas.

**Nova ocorrência**

| Campo | Regras |
|---|---|
| Tipo de Ocorrência | Lista. |
| Local físico | Lupa com os locais cadastrados; selecionar "o ponto da ocorrência". |
| Pessoas envolvidas | Busca por nome. |
| Evidências | Áudio "de até 1 minuto" e "3 fotos". Exige permissões de microfone, galeria e câmera. |
| Descrição da Ocorrência | "um item obrigatório". |
| Salvar | — |

- **Detalhe**: data, hora e registros adicionados (evidências e descrição).
- **Citação**: "O aplicativo Gestão de Rotinas é atrelado ao Gestão de ocorrências … e permite que circunstâncias fora do padrão sejam devidamente registradas."
- O app não mostra campo de prioridade (G-I-02).

#### 1.14.9 Alarme de pânico [F24][F17][F20]

- **Onde**: item "Pânico" do menu inferior e "Botão de Pânico" na tela de checklist.
- **Como acionar**: "Mantenha o dedo pressionado por 3 segundos no botão central da tela, indicado por uma impressão digital". O app confirma com uma mensagem para aguardar a segurança do local.
- **Condições**:
  - "O botão Pânico só estará disponível caso o usuário tenha configurado um Tipo de Ocorrência com prioridade crítica ao incluir um Plano de Rotina".
  - O usuário precisa da permissão de registro de ocorrências no papel Ronda.
  - "Não é possível acionar o botão em modo offline."
- **Ocorrência gerada automaticamente**:

| Campo | Valor |
|---|---|
| Descrição | "Alarme de pânico disparado no ponto de controle X" |
| Data | Data e hora do acionamento |
| Local físico | Local do ponto de controle que disparou |
| Latitude / Longitude | "caso seja possível" |
| Tipo de Ocorrência | Tipo configurado no plano |
| Usuário | Usuário autenticado |

#### 1.14.10 Offline e sincronização [F17][F19][F20][F24][F25]

**O que a documentação afirma**

- "O aplicativo poderá ser utilizado em modo offline. A informação de finalização de rotina será mantida na base interna e sincronizada posteriormente, quando o usuário retomar a conexão com a internet."
- Offline, o usuário vê o status e as rotinas listadas para o dia.
- Pessoa e reconhecimento facial offline usam só a base já sincronizada. O app avisa que a lista pode estar incompleta.
- Pânico não funciona offline.

**Tela Status de Sincronização** [F25]

- Data e hora da última sincronização.
- Contadores: Sincronizado, Pendente e Erro.
- Filtros: Todos, Com erro e Sincronizado.
- Reenvio: selecionar registros e usar "Sincronizar selecionados".
- **Mensagens de erro listadas**:
  - Pessoa não encontrada
  - Dispositivo móvel não encontrado
  - Rotina não encontrada
  - Não encontrada observação obrigatória no checklist
  - Rotina já executada
  - Data/hora inválida
  - Não encontrado anexo obrigatório no checklist
  - O Checklist está sem resposta
  - Fornecedor de EPI não encontrado
  - Rotina fora do tempo definido

Pendências: G-R-12 a G-R-14.

---

## 2. Gestão de Ocorrências — [Existente]

### 2.1 Conceito e navegação [F30][F33]

- Ocorrência é qualquer evento fora da operação padrão que causa, ou pode causar, queda na qualidade do serviço ou risco a pessoas ou ao edifício.
- Origens citadas:
  - dispositivos (ex.: alarme de incêndio);
  - câmeras;
  - registro por usuário (ex.: vidro quebrado).
- Gestão de Ocorrências é uma funcionalidade do Security Hub (PSIM), ao lado de Monitoramento, Câmeras, Servidores, Proxy CFTV e Envio de Comandos [F33].
- **Menus**:
  - Gestão de Riscos e Segurança > Gestão de Ocorrências > **Registro de ocorrências**
  - Gestão de Riscos e Segurança > Gestão de Ocorrências > **Painel de ocorrências**
  - Gestão de Riscos e Segurança > Gestão de Ocorrências > **Tipos de ocorrências**
  - Gestão de Riscos e Segurança > **Consultas** (consulta de ocorrências)
  - Gestão de Riscos e Segurança | Ronda X > Analytics Ronda > **Gestão de Ocorrência**
  - Gestão de Riscos e Segurança > Security Hub > **Monitoramento**

### 2.2 Registro de ocorrência (web) [F30]

1. "Adicionar".
2. Selecionar o **Tipo de ocorrência** e o **Local físico**.
3. Preencher **Descrição**, **Data de ocorrência**, **horário** e **Prioridade**. A prioridade vem sugerida pela "Prioridade padrão" do tipo.
4. Opcional: **Pessoas envolvidas**. Digitar ao menos 3 caracteres em "Busca" e selecionar uma pessoa por vez.
5. "Salvar".

A documentação não informa a obrigatoriedade dos campos (G-O-01).

### 2.3 Prioridades [F30][F32]

| Valor na UI (Painel) | Grau no checklist [F03] | Valores vistos na API |
|---|---|---|
| Críticas | Ocorrência Crítica | — |
| Altas | Ocorrência Alta | — |
| Médias | Ocorrência Média | MEDIUM |
| Baixas | Ocorrência Baixa | — |
| Planejadas | Ocorrência Planejada | PLANNED |
| — | — | UNKNOWN (aparece em exemplo de resposta) |

- Cada prioridade tem uma cor no Painel.
- A prioridade pode ser alterada no detalhe, **exceto em "Em pausa"**.
- Ocorrência "importada da solução de Ronda Senior sem a prioridade informada" recebe a prioridade padrão do tipo.

Pendência: G-O-03.

### 2.4 Status e transições [F30][F31][F32]

**Status**

| Status (UI) | Observação |
|---|---|
| Sem tratamento | Também sinalizado no Monitoramento por um ícone amarelo no local. |
| Em andamento | — |
| Em pausa | — |
| Concluída / "Concluído" | O Painel mostra "Concluídas nas últimas 24h"; a Consulta usa "Concluído". |

A API mostra o valor `PENDING` sem mapeamento para os rótulos da UI (G-O-02).

**Ações e condições documentadas**

| Ação | Disponível quando | Efeito / regra |
|---|---|---|
| Registrar trâmite (texto ou anexo) | Detalhe: não informado. Em lote: status ≠ Concluído. | Primeiro trâmite marca o "tempo de resposta" (2.8). Transição para Em andamento: G-O-04. |
| Alterar prioridade | Status ≠ Em pausa | — |
| Pausar | Status ≠ Sem tratamento | Vai para Em pausa. |
| Retomar | Somente Em pausa | Status de retorno: G-O-05. |
| Concluir (detalhe) | Status ≠ Sem tratamento | Exigência de trâmite: G-O-06. |
| Concluir (em lote, Consulta) | Pelo menos um trâmite e status ≠ Em pausa e ≠ Concluído | Mostra uma confirmação que "explica os impactos" (conteúdo não informado). |
| Exportar | Detalhe | PDF com imagens em "alta qualidade". |

**Diagrama inferido das condições** (sem gatilhos explícitos):

```
Sem tratamento --(trâmite? G-O-04)--> Em andamento --Pausar--> Em pausa --Retomar--> (G-O-05)
Em andamento --Concluir--> Concluída
```

A reabertura de ocorrência concluída não é mencionada.

### 2.5 Trâmites [F30]

- Registro por **texto** ou **anexo**, no painel "Trâmites" do detalhe.
- **Trâmite em lote**: selecionar linhas na Consulta > "Tratar ocorrências" > preencher **Descrição** > "Salvar". Permitido enquanto o status for diferente de "Concluído".
- Tipos de trâmite, limites de anexo e permissão em "Em pausa": G-O-07.

### 2.6 Painel de ocorrências [F30]

- **Pendentes por prioridade**: "Críticas", "Altas", "Médias", "Baixas" e "Planejadas", com cores, das mais recentes para as mais antigas.
- **Por status**: "Sem tratamento", "Em andamento", "Em pausa" e "Concluídas nas últimas 24h".
- Clicar no nome abre detalhes, trâmites e tratamento.
- **Limite**: no máximo "100 registros por status". Acima disso, prioridade e data de geração decidem quais aparecem.
- "Ver mais ocorrências" abre a Consulta (2.7).

### 2.7 Consulta de ocorrências [F30]

- **Filtros**: Data e hora inicial, Data e hora final, Identificador, Tipo, Local físico, Status, Prioridade e Origem.
- Pelo menu Consultas, Data inicial e Data final são preenchidas antes de "Filtrar".
- **Resultado**: tabela paginada com seleção de linhas. As colunas não são informadas (G-O-08).
- **Ações**:
  - abrir detalhe;
  - "Tratar ocorrências" (trâmite em lote) e "Concluir ocorrência(s)" (conclusão em lote), visíveis com ao menos uma linha selecionada.

### 2.8 Indicadores — Analytics Ronda > Gestão de Ocorrência [F30]

- **Gráfico anual** do Registro de ocorrências: abertas × fechadas × saldo acumulado no ano, mês a mês.
- **Mês ativo** (clique no gráfico ou seletor no canto superior direito):
  - **Tempo médio de resposta**: "tempo entre o registro da ocorrência e o primeiro trâmite realizado sobre ela", em horas.
  - **Tempo médio de solução**: tempo até a solução, com "desconto dos tempos em pausa", em horas.
  - Gráficos por prioridade, por local e por tipo.

Fórmulas de abertas, fechadas e saldo: G-O-09.

### 2.9 Tipos de ocorrência [F30][F02]

Cadastro restrito a administrador.

**Aba "Dados gerais"**

| Campo | Regra |
|---|---|
| Nome | — |
| Monitorado | Cada ocorrência do tipo gera notificação no Monitoramento. |
| Aviso Sonoro | Cada ocorrência do tipo gera notificação sonora no Monitoramento. |
| Prioridade padrão | Sugerida no registro e aplicada a ocorrências importadas sem prioridade. |

A página também diz "Somente as ocorrências com essa opção marcada serão apresentadas no Monitoramento", sem indicar a opção (presumivelmente Monitorado, mas não confirmado: I-12).

**Painéis**

- **"E-mails notificados"**: "Adicionar e-mails" > "Adicionar e-mail" > "Adicionar", repetível.
- **"Emergência"**: "Adicionar gerenciadores", que define os dispositivos que recebem comando de emergência quando o tipo é registrado.
- **"Acionamentos"**: "Adicionar acionamentos" > "Adicionar acionamento" > Saída e Status:
  - "Desativar" ou "Ativar": a saída deve ser religada ou desligada depois no cadastro de dispositivos;
  - "Temporário": habilita o campo Duração, em milissegundos.

**Exclusão**: bloqueada se houver ocorrência não concluída do tipo.

### 2.10 Monitoramento (Security Hub) [F31]

- Exige a permissão "Security_Hub" (Tecnologia > Administração > Autorização > Gestão dos Papéis). Parte da visão depende da Abrangência do papel.
- **"Ocorrências em aberto"**: todas as não concluídas, por prioridade. Exige a licença de Gestão de Ocorrências. O clique abre o Painel.
- **Por local**: aba "Ver as ocorrências", com etiqueta colorida de prioridade e descrição do status. O ícone amarelo indica ocorrência sem tratamento no local ou em seus filhos.
- O som de notificação toca apenas com o som ligado.

### 2.11 Origens automáticas por dispositivos [F34]

- **Gerenciador, "Eventos monitorados"**: por evento, define se gera ocorrência e de qual tipo.
- **Controlador de acesso, "Acessos monitorados"**: tipos de acesso que geram ocorrência, tipo da ocorrência e envio de e-mail.
- **Entrada (sensor)**: Tipo de ocorrência e Prioridade, que "afetará o modo como essa ocorrência é mostrada no Monitoramento". Inclui "Gerar alarme"; se desmarcado, os alarmes da entrada são descartados.

### 2.12 API de ocorrências [F32]

**Pré-requisitos**: usuário autenticado, tipo de ocorrência cadastrado, locais físicos cadastrados e token no cabeçalho.

**Operações**

| Operação | Descrição |
|---|---|
| `GET /incident/pagedsearch/all` | Lista paginada (`page`, `pageSize`). |
| `GET /incidenttype` | Retorna id, name, description e isWatched. |
| `GET /physicallocation/search` | Autocomplete com `term` e `situation` (0 = ALL, 1 = ACTIVE). Até 10 resultados. |
| `POST /incident` | Cria ocorrência. Respostas 200, 401, 403 ("Operation denied") e 500. |

**Corpo do `POST /incident`**

- id (ignorado na criação)
- physicalLocation {id, name}
- incidentType {id, name, isWarningSound}
- date, creationDate
- status, priority
- description
- device {id, name, deviceType, readerTechnology} **ou** camera {id, name}
- people[], user {id, name}, procedures[]
- incidentOrigin

**Regras**

- "Se a origem for um dispositivo, o JSON terá o objeto "device" e não terá o "camera", e vice-versa".
- Formato de data: "2017-03-24T10:09:00-03:00".
- Valores vistos: status `PENDING`; priority `MEDIUM`, `PLANNED` e `UNKNOWN`; incidentOrigin `USER`. Não há enumeração completa (G-O-03).
- A existência de `procedures[]` no modelo é registrada sem interpretação (G-O-10).

### 2.13 Permissões [F29][F02][F31]

**Recursos de menu**

| Recurso | URI |
|---|---|
| Registros de ocorrências | `res://senior.com.br/sam/permission/menu-incidents-registers` |
| Painel de ocorrências | `res://senior.com.br/sam/permission/menu-incidents-dashboard` |
| Consulta de ocorrências | `res://senior.com.br/sam/permission/menu-incidents-search` |
| Indicadores de ocorrências | `res://senior.com.br/sam/permission/menu-incidents-indicators` |
| Tipos de ocorrências | `res://senior.com.br/sam/permission/menu-incidents-types` |
| Locais físicos | `res://senior.com.br/sam/permission/menu-physical-location` |
| Feriados | `res://senior.com.br/sam/permission/menu-holiday` |

**Outras permissões**

- Monitoramento: "Security_Hub".
- Papéis Ronda de operador e gestor de Rotinas: ver 1.2.
- A página de permissões **não lista recursos específicos** de checklist, plano, ponto ou rotina (G-R-15).
- Permissões de tratar, concluir, exportar e analytics por ação: G-O-11.

---

## 3. Integrações existentes entre Rotinas e Ocorrências — [Existente]

| # | Origem em Rotinas | Condição | Ocorrência gerada | Fonte |
|---|---|---|---|---|
| 1 | Item de checklist respondido **Não Conforme** | O item/checklist tem Tipo de ocorrência **e** o ponto de controle tem local físico. | "uma ocorrência do tipo definido é gerada automaticamente no Painel de Ocorrências". E-mails do checklist são notificados. | F03, F14 |
| 2 | Rotina agendada **não executada** | A rotina tem Tipo de ocorrência e é agendada. Há verificação a cada 10 minutos. | Ocorrência do tipo configurado na rotina. | F09 |
| 3 | **Registro manual no app** | Usuário com permissão. | Tipo, Local físico, Pessoas envolvidas, Evidências (áudio ≤ 1 min, 3 fotos) e Descrição. | F22 |
| 4 | **Alarme de pânico** | O plano tem tipo crítico, o usuário tem permissão e está online. | Descrição padrão, data e hora, local do ponto, lat/long, tipo do plano e usuário (1.14.9). | F24 |

**Configurações que condicionam as integrações**

- Tipo de ocorrência com prioridade padrão (crítica para pânico e para aparecer na lista do plano).
- Local físico no ponto de controle.
- Tipo de ocorrência no checklist/item e na rotina.
- Permissões de ocorrência no papel do operador.

**Comportamento herdado**: a ocorrência gerada segue o ciclo da seção 2.4 (Sem tratamento → trâmites → conclusão). A documentação **não descreve** retorno de informação de Ocorrências para Rotinas: não há reinspeção, vínculo de volta ao checklist nem bloqueio de rotina.

Pendências: G-I-01 a G-I-03. A evolução dessas integrações está na seção 4.1; o comportamento descrito nesta seção continua valendo sem alteração.

---

## 4. Existente × proposta da Linha GRS

Comparação para orientar a etapa 5. Coluna "Existente" = seções 1 a 3. Coluna "Proposta GRS" = `docs/04`, `docs/06` e PRDs. **Nenhuma linha desta tabela altera regra existente.**

| Tema | Existente | Proposta GRS | Leitura |
|---|---|---|---|
| Prioridades de ocorrência | Crítica, Alta, Média, Baixa, Planejada | As mesmas cinco | Confirmado. |
| Configuração do tipo de ocorrência | Nome, Monitorado, Aviso Sonoro, Prioridade padrão, E-mails notificados, Emergência, Acionamentos | Preservar isso e acrescentar seção opcional de tratamento: exige plano de ação, exige reinspeção, critério de encerramento e regras de relacionamento | Confirmado como base; a extensão é proposta. |
| Status da ocorrência | Sem tratamento, Em andamento, Em pausa, Concluída | PRD: "Estados/transições completos da ocorrência" a definir | Insumo para Q-02 (seção 6). |
| Tratamento | Trâmites (texto ou anexo), pausar, retomar, concluir | Planos de ação com ações, dependências, aprovação, eficácia e reinspeção | Tudo novo na proposta; **não existe** hoje. |
| Conclusão | "Concluir": exige não estar em Sem tratamento; em lote, exige ≥ 1 trâmite | docs/06 fala em "modos de encerramento": manual, por reinspeção e por aprovação; exceção autorizada | **Decidido (D-008):** mantém "Concluir". Os modos da proposta passam a ser critérios de conclusão (4.1.4). |
| Reabertura | Não mencionada | Fora da V1; recorrência cria nova ocorrência relacionada | Compatível. |
| Tipos de ponto de controle | Personalizado, Ativo, Local Físico, Pessoa, Veículo | Os mesmos cinco | Confirmado. |
| Evidências | Foto, vídeo, áudio, observação; assinatura desenhada; limites por checklist | Foto, vídeo, áudio, comentários | Confirmado; o existente é mais detalhado. |
| Offline | Finalização guardada e sincronizada; pânico indisponível; Pessoa só da base local | Offline sem dependência de Ocorrências; não deduplica durante a execução | Compatível. O comportamento offline de checklists, evidências e ocorrências do app não está documentado (G-R-12). |
| Sugestão de vínculo após a sincronização | Não existe; não conformidade gera ocorrência nova automaticamente | Geração automática preservada; depois da sincronização, Ocorrências sugere vínculo e o usuário autorizado decide | **Decidido (D-005):** evolução que se soma à regra existente, sem substituí-la (4.1.1). |
| Reinspeção | Não existe | Ocorrências solicita; Rotinas programa e executa; resultado volta à ocorrência | **Decidido (D-006):** usa a execução existente de Rotinas (4.1.2). |
| Ponto Ativo / Local físico | Referencia ativos de Gestão de Ativos (Rotinas) e locais físicos do cadastro geral | Central como referência mestre; cadastro de Rotinas preservado e integrado | **Decidido (D-007):** compatibilização sem duplicidade (4.1.3). |
| Tempo médio de resposta | Registro → primeiro trâmite da **ocorrência** | Q-13: definição para **eventos** do Security Hub | Insumo, não resposta: Q-13 trata de eventos. |
| Ciclo do alerta (Q-15) | Ocorrências de dispositivo entram pelo tipo "Monitorado" no Monitoramento | Ciclo de alerta além do reconhecimento | Insumo para Q-15. |

### 4.1 Evolução decidida da integração — [Proposta GRS]

Decisões do P.O. em 2026-11-06, registradas em `docs/decisoes-evolucao.md` (D-005 a D-008).

Nenhuma delas altera o produto atual. Cada uma descreve o que **permanece** (existente) e o que é **acrescentado** (evolução). Os subitens "a definir" não devem ser preenchidos por suposição na implementação.

#### 4.1.1 Geração automática e sugestão de vínculo (D-005)

| | Comportamento |
|---|---|
| **Permanece (existente)** | Não conformidade em item com tipo de ocorrência, em ponto com local físico, gera a ocorrência automaticamente (seção 3, linha 1). Durante a execução, o app não consulta ocorrências. |
| **Acrescenta (evolução)** | Depois da sincronização, Ocorrências avalia relacionamentos com ocorrências abertas e **sugere** vínculo. |
| **Quem decide** | Usuário autorizado. Sem confirmação, a ocorrência gerada permanece **independente**. |
| **Garantias** | A sugestão não impede, adia nem desfaz a geração. Vínculo confirmado = relacionamento entre ocorrências com históricos próprios. Não há fusão. |
| **A definir** | D-005a: critérios de elegibilidade. D-005b: permissão de confirmação. D-005c: se vale também para rotina não executada, app e pânico. D-005d: destino da sugestão não decidida. |

Fluxo:

```
[Rotinas/app] Não conforme ──(existente)──► Ocorrência gerada automaticamente
                                                  │ (após sincronização)
                                                  ▼
                              [Ocorrências] avalia ocorrências abertas ──► sugestão
                                                  │
                         usuário autorizado ──────┼── confirma ──► ocorrências relacionadas
                                                  └── não confirma ──► permanece independente
```

#### 4.1.2 Reinspeção (D-006)

| | Comportamento |
|---|---|
| **Permanece (existente)** | Rotinas programa e executa rotinas e checklists, inclusive no app e offline, com seus status (1.12), evidências e justificativas. |
| **Acrescenta (evolução)** | Ocorrências pode **solicitar** nova inspeção. Rotinas **programa e executa**. O resultado e as evidências **retornam** à ocorrência e entram no seu histórico. |
| **Não fazer** | Criar tela, checklist ou execução de inspeção dentro de Ocorrências. |
| **A definir** | D-006a: forma da atividade em Rotinas e quem a programa. D-006b: checklist utilizado. D-006c: tradução do resultado em OK / não OK. **D-006d: conflito** entre a nova não conformidade (que hoje geraria outra ocorrência) e a regra "não OK adiciona evidência à ocorrência aberta". D-006e: reinspeção não realizada. |

Fluxo:

```
[Ocorrências] solicita reinspeção ──► [Rotinas] programa (D-006a) ──► app executa (online/offline)
                                                                         │ sincroniza
[Ocorrências] histórico ◄── resultado + evidências + operador + data ◄────┘
```

#### 4.1.3 Ativos (D-007)

| | Comportamento |
|---|---|
| **Permanece (existente)** | A tela de ativos de Rotinas (1.10), com campos, filtros, validade Válido/Inválido e campos customizados `grs_asset`, segue disponível e sem redesenho. |
| **Acrescenta (evolução)** | A Central passa a ser a referência mestre de **identidade e relacionamento**. O cadastro de Rotinas se integra a ela, e o ponto de controle do tipo Ativo referencia a identidade compartilhada. |
| **Compatibilização** | Ativos já existentes em Rotinas são compatibilizados com a Central sem gerar duplicidade. A recomendação, **não aprovada**, é revisão humana sem associação automática, como na descoberta (P-40). |
| **A definir** | D-007a: atributos da Central × de Rotinas. D-007b: forma da compatibilização. D-007c: onde nasce um ativo novo. D-007d: Tipo de Ativo × classificação. D-007e: validade × condição operacional × criticidade. |

#### 4.1.4 Concluir (D-008)

| | Comportamento |
|---|---|
| **Permanece (existente)** | Termo "Concluir" e status "Concluída". Ciclo Sem tratamento → Em andamento → Em pausa → Concluída, com as regras de 2.4. |
| **Leitura da proposta** | "Encerramento", em docs/06 e no PRD, lê-se como **conclusão**. "Modos de encerramento" passam a ser **critérios de conclusão**: manual, por reinspeção ou por aprovação. |
| **Consequência a validar na Q-02** | Parâmetros opcionais do tipo (exige plano de ação, exige reinspeção, critério de conclusão) seriam condições **adicionais** a "Concluir", aplicadas só quando configuradas. Sem configuração, vale a regra atual. |
| **Pendente de autorização** | Ajuste de texto em docs/06 e no PRD de Ocorrências. |

---

## 5. Inconsistências na documentação oficial

| # | Inconsistência | Páginas |
|---|---|---|
| I-01 | Tipo de validação do ponto: "QR Code, Geolocalização, Básico" × "QR Code, Geolocalização ou Sem validação". | F02 × F04 |
| I-02 | Status de cadastro "Desativado" × "Inativo". | F09, F10, F04 × F02, F03, F07 |
| I-03 | "Assinatura Digital" × "Assinatura Desenhada". | F03 × F10, F20 |
| I-04 | Configuração de anexo/observação: "Não obrigatório / Não conforme / Todos" × "Opcional / Obrigatório para 'Não Conforme' / Obrigatório". | F03 × F02, F09 |
| I-05 | Status da rotina: "Em execução" (Consulta/app) × "Em andamento" (Relatório). O Relatório omite "Finalizado Parcialmente" e "Futura" só existe no app. | F10, F18 × F12 |
| I-06 | "Área do plano de rotina" × "Tipo do plano". | F09 × F02 |
| I-07 | Caminhos de menu divergentes: dispositivos móveis (F02 cita "Security Hub > Gestão de Rotinas > …"), feriados sob "Controle de acesso" e "Gestão dos Papéis" × "Gestão de Papéis". | F02, F07, F28, F29 |
| I-08 | Login "login@domínio" × "E-mail"; "código de ativação" × "token de 5 dígitos". | F02 × F15, F07 |
| I-09 | Prioridade: checklists aceitam os cinco graus, mas F02 diz que só tipos com prioridade padrão "Crítica" aparecem na listagem do plano. F24 fala em "prioridade crítica"; F09 em "Tipo de ocorrência crítica". | F03 × F02, F09, F24 |
| I-10 | Reconhecimento facial aparece no app e no plano, mas não no cadastro de checklist. | F20, F19 × F03 |
| I-11 | Raio de validação: "Raio do Perímetro" configurável no ponto e "Tolerância" no plano × "raio de até 50 metros" fixo no app. | F04, F09 × F19 |
| I-12 | Tipo de ocorrência: "Somente as ocorrências com essa opção marcada…" sem dizer qual opção. | F30 |
| I-13 | Conclusão de ocorrência: no detalhe, só não pode em "Sem tratamento"; em lote, exige trâmite e não pode em "Em pausa". | F30 |
| I-14 | O texto de acesso do Relatório de Rotinas diz "relatório de Checklists". | F12 |

---

## 6. Pendências (não preencher com suposição)

### 6.1 Gestão de Rotinas

| # | Pendência |
|---|---|
| G-R-01 | Obrigatoriedade dos campos de plano, rotina, contato e dispositivo (só alguns são declarados). |
| G-R-02 | Efeito da lista de feriados na rotina: não executa no feriado? Desloca a execução? |
| G-R-03 | "Termina após" no agendamento (F02) × "Termina após X execuções" só para não agendadas (F09). |
| G-R-04 | Código de ativação é exibido ao salvar **contato** (F02) ou gerado no **dispositivo** (F07)? Validade, reuso e limite de tentativas não informados. |
| G-R-05 | Momento em que a rotina vira "Não realizada" (fim da janela? job de 10 min?) e se existe saída desse status. |
| G-R-06 | Diferença entre "Interrompida" e "Incompleta"; definição de "Futura"; regra literal de início ("horário de início ≥ horário atual") × "dentro do horário". |
| G-R-07 | Mudança automática de status ao expirar a janela (além do job de ocorrência). |
| G-R-08 | Cálculo do Score com "Não se aplica", Texto, Pessoa e Assinatura. |
| G-R-09 | Interação entre a Tolerância (plano) e o Raio do Perímetro (ponto), e comportamento fora do raio ou com QR Code errado (de outro ponto ou ilegível). |
| G-R-10 | "Dados do segundo usuário serão descartados": quando, com que aviso e como aparece na sincronização. |
| G-R-11 | A justificativa é revisada por alguém? Pode bloquear algo? Não há lista de motivos. |
| G-R-12 | Offline: respostas de checklist, evidências, ocorrências do app, contatos, validação GPS/QR, login offline, fila e conflitos. |
| G-R-13 | Retenção de evidências além dos 10 GB; política ao atingir o limite. |
| G-R-14 | Efeito de editar, inativar ou excluir checklist, plano ou ponto que já tenha histórico ou rotinas em andamento. |
| G-R-15 | Recursos de permissão específicos de Rotinas (checklist, plano, ponto, rotina, consulta, relatórios). |

### 6.2 Gestão de Ocorrências

| # | Pendência |
|---|---|
| G-O-01 | Campos obrigatórios no registro web e no app (só Descrição é declarada obrigatória no app). |
| G-O-02 | Mapeamento entre os status da UI e da API e a lista completa de status. |
| G-O-03 | Enumeração completa de priority e incidentOrigin na API e o significado de `UNKNOWN`. |
| G-O-04 | O que leva de "Sem tratamento" a "Em andamento" (primeiro trâmite? ação explícita?). |
| G-O-05 | Status após "Retomar" (volta ao anterior ou a Em andamento?). |
| G-O-06 | Concluir pelo detalhe exige trâmite? Pode concluir em "Em pausa" pelo detalhe? (I-13) |
| G-O-07 | Tipos de trâmite, limites de anexo e permissão de trâmite em "Em pausa". |
| G-O-08 | Colunas da tabela do Painel e da Consulta; filtros adicionais não nomeados. |
| G-O-09 | Fórmulas de abertas, fechadas e saldo acumulado; registro do tempo de pausa. |
| G-O-10 | Significado de `procedures[]` e de "Ações emergenciais" no ciclo da ocorrência. |
| G-O-11 | Permissões por ação: tratar, pausar, concluir, exportar, analytics e alterar prioridade. |
| G-O-12 | Conteúdo e gatilhos dos e-mails além do cadastro no tipo. |
| G-O-13 | Como câmeras geram ocorrências. |
| G-O-14 | Exclusão de tipo com ocorrências apenas concluídas: efeito no histórico. |

### 6.3 Integração Rotinas ↔ Ocorrências

| # | Pendência |
|---|---|
| G-I-01 | Quais dados de Rotinas são copiados ou vinculados à ocorrência gerada por não conformidade ou rotina não executada (plano, rotina, checklist, item, ponto, operador, evidências, resposta). |
| G-I-02 | Prioridade da ocorrência criada no app (sem campo) e da ocorrência de pânico: herda a prioridade padrão do tipo? |
| G-I-03 | Ocorrência criada offline no app: é permitida? É enfileirada? |
| G-I-04 | **Decidida (D-005).** A sugestão complementa a geração automática, sem substituí-la. Subitens D-005a–d em aberto. |
| G-I-05 | **Decidida (D-006).** A reinspeção é solicitada por Ocorrências e programada e executada por Rotinas. Subitens D-006a–e em aberto, incluindo o conflito D-006d. |
| G-I-06 | **Decidida (D-007).** Central é a referência mestre; o cadastro de Rotinas é preservado e integrado. Subitens D-007a–e em aberto. |
| G-I-07 | **Decidida (D-008).** Mantém "Concluir"; "encerramento" na proposta lê-se como conclusão. |

---

## 7. Páginas não lidas

- `cadastros-gerais/locais-fisicos.htm`, `cadastros-gerais/pessoas.htm`, `cadastros-gerais/usuario.htm`, `cadastros-gerais/abrangencia.htm`, `cadastros-gerais/papeis.htm`
- `controle-de-acesso/faixas-horarias.htm`, `controle-de-acesso/escalas.htm`, `controle-de-acesso/notificacao-acesso.htm`
- `gestao-de-rotinas/aplicativo-gestao-de-rotinas/politica-de-privacidade.htm`, página de reconhecimento facial
- `security-hub/cameras.htm`, `servidores.htm`, `proxy-cftv.htm`, `envio-de-comandos.htm`; `integracoes-com-dispositivos/comandos.htm`
- Externos: vídeos do YouTube, artigo de blog, `dev.senior.com.br/api_privada/ronda-seniorx_s-secure-api/`

Essas páginas podem reduzir as pendências G-O-13 e G-O-10, mas não tratam do núcleo de Rotinas e Ocorrências.
