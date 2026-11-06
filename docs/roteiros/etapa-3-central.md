# Roteiro de verificação — Etapa 3 (Central de Ativos e Ambientes)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`, arquivos `central.test.ts` e `central.test.tsx`).

Antes de começar: **Controles da demonstração** → **Restaurar cenário de demonstração**.

## 1. Árvore de locais e escopo
1. Entre como **Juliana Prado (Gestor Local)** → menu **Central de Ativos e Ambientes**.
2. A árvore mostra só a **Unidade Joinville** (Curitiba fora do escopo). A visão geral exibe 11 ativos.
3. Clique em **Prédio Industrial** → todas as abas passam a considerar o prédio e seus descendentes; a URL guarda o local.
4. **Somente este local** → a aba Ativos fica vazia (os ativos estão nas salas/setores filhos). Volte para **Incluir descendentes**.
5. **Usar como localização contextual** → toast; o seletor do cabeçalho passa a mostrar o prédio.
6. Digite "bombas" no filtro da árvore → só o caminho até **Casa de Bombas** permanece.

## 2. Visão geral
1. Selecione **Unidade Joinville**: indicadores (ativos, fora do normal, alertas ativos, % com dispositivo, dispositivos aguardando validação, completude, descobertos incorporados, duplicidades evitadas).
2. Clique em **Alertas ativos** → abre a aba Alertas e ocorrências filtrada por status Ativo.
3. Em **Alertas que exigem atenção**, clique em **Reconhecer** → toast; o indicador diminui.
4. Em **Locais contidos**, clique em **Área Externa** → aprofunda a navegação.

## 3. Ativos (lista e cartões)
1. Aba **Ativos** → **Filtros** → Criticidade **Alta**, Condição **Normal** → **Filtrar** (o chip mostra os filtros; um ativo crítico pode estar normal).
2. Alterne **Cartões**/**Lista**; ordene por **Condição (mais grave primeiro)**.
3. Clique em uma tag → painel 360º; **Voltar para Central** restaura local, aba e filtros.

## 4. Cadastro de ativo e duplicidade
1. Entre como **Marcos Vieira (Administrador Corporativo)** → **Novo ativo**.
2. Digite a tag **GER-002** → aviso "Esta tag já está cadastrada"; **Cadastrar ativo** mostra erro no campo.
3. Clique em **Abrir cadastro existente** → abre o GER-002 e o indicador **Duplicidades evitadas** passa a 1.
4. Novo ativo com tag **BMB-099**, nome "Bomba jockey", classificação **Bombas**, local **Casa de Bombas**, locais atendidos **Reservatório de Água de Incêndio**, depende de **GER-002** → **Cadastrar ativo** → toast e painel 360º.
5. Tente cadastrar "Bomba de recalque" na **Casa de Bombas** → aviso de possível duplicidade com BMB-014; só avança após marcar "Confirmo que não é o mesmo ativo".
6. Comece um cadastro e clique em outro menu → aviso de alterações não salvas.

## 5. Painel 360º
1. Abra **BMB-014**: cabeçalho fixo com local, criticidade e condição (e a origem da condição).
2. **Visão geral**: identidade, responsável (herdado ou direto) e fatores de impacto separados da criticidade.
3. **Relacionamentos**: depende de / dependem deste (SIS-INC-01), locais atendidos e grupos com a origem (regra, manual, exceção).
4. **Operação**: reconheça um alerta direto no painel.
5. **Módulos GRS** e **Riscos**: nos Controles da demonstração, troque o perfil comercial para **Essencial** → as abas mostram "não contratado" com a explicação de valor, sem dados.
6. **Alterar condição** → escolha **Indisponível** sem motivo → validação; informe o motivo → toast; a criticidade não muda. Veja o registro em **Histórico**.
7. **Editar cadastro** → altere a criticidade → **Salvar alterações** → informe o motivo → o histórico mostra os campos alterados e o motivo.

## 6. Importação
1. **Importar ativos** → **Usar exemplo** → **Analisar arquivo**.
2. A prévia mostra uma linha pronta, uma **Duplicidade** (GER-002, bloqueada), uma possivelmente semelhante e uma com erro de local.
3. **Importar** → resultado com criados, ignorados e duplicidades evitadas; os novos ativos aparecem na aba Ativos.

## 7. Dispositivos e telemetria
1. Aba **Dispositivos** → filtre por **Localização sugerida — aguardando validação**: a localização aparece como sugestão, não confirmada.
2. Aba **Telemetria** → ponto → dispositivo → ativo, com valor, unidade, status e atualização (valores simulados).
3. Com perfil comercial **Essencial**, a aba Telemetria explica o valor do Monitor sem exibir dados.

## 8. Grupos e governança
1. Como **Juliana Prado (Gestor Local)** → aba **Grupos** → **Sistemas de combate a incêndio**: aviso de que as regras são corporativas; sem botão de editar regras.
2. Em **EXT-IND-12** (incluído por regra) → **Criar exceção** com motivo → aba **Exceções** mostra o conflito com a regra.
3. **Incluir ativo** → o EXT-IND-12 não aparece entre os candidatos enquanto houver exceção. Em **Exceções** → **Remover exceção** com motivo → ele volta a ser membro por regra.
4. Aba **Auditoria local** → **Concluir auditoria** com observações → situação **em dia**.
5. Aba **Histórico** → filtre **Somente associação** / **Somente configuração**.
6. Como **Marcos Vieira** → **Ativos críticos de energia** → **Editar regras e configuração** → desmarque **Alta** na regra → a prévia mostra **QD-ADM-01** entrando → **Salvar configuração** com motivo → o ativo aparece como membro por regra.
7. **Novo grupo** → abrangência **Local** está disponível ao Gestor Local; **toda a empresa** só ao corporativo. Autorizar módulos consumidores não dispara ações (reação "não configurada no módulo").
8. **Pontos da ronda noturna** (especializado, Gestão de Rotinas) → somente consulta.
