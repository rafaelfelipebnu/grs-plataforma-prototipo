# Roteiro de verificação — Etapa 2 (Security Hub e dashboard configurável)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`, arquivos `securityHub.test.ts` e `dashboard.test.tsx`).

Antes de começar: **Controles da demonstração** → **Restaurar cenário de demonstração**.

## 1. Dashboard padrão
1. Entre como **Helena Duarte (Gestor de Segurança)** → o Security Hub mostra "Painel padrão do cliente".
2. Confirme as quatro áreas: Resumo de segurança, Eventos em destaque, Mapa operacional e Ações pendentes.
3. Cada widget mostra o recorte (local e período), o modo de atualização e "Ver detalhes".
4. **Acessos em tempo real**: aguarde cerca de 10 s → novas passagens aparecem (simulação ligada nos controles da demonstração).

## 2. Drill-down e navegação contextual
1. Em **Indicadores gerais**, clique em **Críticos ativos** → abre **Eventos e alertas** filtrado (chip "Severidade: Crítica").
2. **Voltar para Security Hub** → o painel é restaurado.
3. Em **Acessos em tempo real**, clique no selo de **negados** → lista de acessos filtrada por "Negado".
4. Em **Situação operacional por localização**, clique em uma unidade → lista de alertas ativos daquela unidade.

## 3. Reconhecimento
1. Em **Ações pendentes**, clique em **Reconhecer** na porta de emergência → toast de sucesso; o item sai da lista e os indicadores se atualizam.
2. Abra **Todos os alertas** → selecione dois alertas → **Reconhecer selecionados** → "2 alertas reconhecidos".
3. Abra o sino: as notificações desses alertas mostram "Alerta reconhecido" (a leitura continua independente).

## 4. Mapa operacional
1. **Expandir mapa** → blocos por unidade, com peças coloridas pela maior severidade (cinza = sem alertas).
2. Clique em **Área Externa** → aproxima; o caminho no topo permite voltar.
3. Clique em uma peça sem subdivisões → abre a lista de alertas ativos daquele local.

## 5. Personalização (painel pessoal)
1. **Personalizar painel** → barra "Editando meu painel"; **Salvar** desabilitado até haver mudança.
2. **Adicionar widget** → catálogo com 17 widgets em 3 categorias e indicações ("Já no painel", "Dados na etapa 5", módulo não contratado).
3. Adicione **Histórico de eventos relevantes**.
4. Arraste um widget para outra posição ou área (ou use as setas e o seletor de área).
5. Mude o tamanho de um widget pelo seletor.
6. **Configurar** (engrenagem) em Eventos e alertas → período 7 dias, severidade mínima Alta, quantidade 3, atualização a cada 1 minuto → **Aplicar**. Teste quantidade 50 → mensagem de validação.
7. **Pré-visualizar** → controles ocultos; **Voltar à edição**.
8. Clique em outro módulo no menu → aviso "alterações não salvas" → **Continuar editando**.
9. **Salvar** → "Seu painel foi salvo"; o cabeçalho mostra "Meu painel personalizado".
10. **Restaurar padrão do cliente** → confirmação → painel padrão de volta.

## 6. Padrão do cliente (administrador)
1. Como **Helena**, personalize e salve o painel (ex.: remova um widget).
2. Entre como **Marcos Vieira (Administrador Corporativo)** → **Editar padrão do cliente**. A barra informa quantos usuários têm painel pessoal e não serão afetados.
3. Remova **Câmeras em destaque** e salve.
4. Entre como **Juliana Prado (Gestor Local)** → ela vê o novo padrão (sem câmeras).
5. Entre como **Helena** → o painel pessoal dela não muda.

## 7. Escopo, contrato e módulos futuros
1. Como **Juliana Prado (Joinville)**: indicadores, mapa e listas não incluem Curitiba.
2. Controles da demonstração → **Essencial**. Como Helena, adicione **Saúde da infraestrutura** → "Monitor de Infraestrutura não contratado", sem dados.
3. Adicione **Ocorrências abertas** → "Disponível na etapa 5" (Gestão de Ocorrências está contratada, mas ainda não foi implementada).

## 8. Integração com o Cenário A
1. Controles da demonstração → **Simular falha na bomba BMB-014**.
2. No painel: o alerta crítico aparece em Eventos e alertas e em Ações pendentes; **Ativos críticos** mostra BMB-014 em condição **Crítico**, com criticidade **alta** e "Sustenta SIS-INC-01"; o mapa marca a Área Externa em vermelho.
