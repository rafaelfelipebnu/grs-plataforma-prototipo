# Roteiro de verificação — Etapa 5, 4ª entrega (Gestão de Rotinas)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`, arquivos `src/services/routines.test.ts` e `src/modules/rotinas/routines.test.tsx`).

Antes de começar: **Controles da demonstração** → **Restaurar cenário de demonstração**. Use o perfil comercial **Operacional** ou **Integrado**. Marcas "Provisório · P-xx" indicam hipóteses (`docs/decisoes-evolucao.md`, P-80 a P-89). Para ver o app como no celular, ative o modo de dispositivo móvel do navegador (ex.: 390 px).

## 1. Web: consulta e cadastros (Gestor Local)
1. **Juliana Prado** → **Gestão de Rotinas** → **Visão geral**: contadores por status das últimas 24 h, reinspeções a programar e pendências de sincronização.
2. **Consulta de rotinas** → **EX-0005** (Inspeção do sistema de incêndio, 2 dias atrás): score 0%, a não conformidade "Painel da bomba sem alarmes ativos" com observação e foto, e a ocorrência **OC-0009** gerada.
3. **Planos de rotina**: pontos (tipo, validação, local/ativo da Central), rotinas agendadas e não agendadas e checklists com "Nota para Não Conforme" e regras de anexo/observação — somente consulta.

## 2. App: ronda com não conformidade (Operador de Rotinas)
1. **Camila Rocha** → **App (móvel)** → em "Verificar localização", escolha **Ronda Patrimonial — Unidade Joinville**.
2. **Agendadas**: toque em **EX-0001** (Ronda da portaria). Toque no ponto **Portão de veículos** → **Ler QR Code (simulado)**.
3. Marque **Não conforme** em "Portão de veículos trancado" e tente concluir sem observação/foto → o app exige ambas. Preencha e conclua o checklist.
4. **Finalizar rotina** → **Concluída**. Uma nova ocorrência "Irregularidade em ronda" é gerada na Portaria Principal.
5. Como **Juliana**, abra a nova ocorrência: o painel **Vínculos com outras ocorrências** sugere a **OC-0005** (mesmo tipo e local). **Confirmar vínculo** ou **Manter independente**.

## 3. App offline e sincronização
1. Como **Camila**, no app: **Simular sem conexão**.
2. Escolha **Inspeção de Utilidades — Prédio Industrial** → **Não agendadas** → **Iniciar** a "Inspeção de utilidades". Registre uma não conformidade nos extintores e **cancele** o ponto da Sala de Máquinas (motivo obrigatório).
3. **Finalizar rotina** → **Finalizado Parcialmente**, mantida no aparelho (pendente de sincronização). Nenhuma ocorrência ainda.
4. **Reconectar** → **Sincronizar** → a ocorrência por não conformidade é gerada agora.

## 4. Reinspeção (Ocorrências ↔ Rotinas)
1. Como **Helena Duarte**, abra a **OC-0009** (tipo "Não conformidade de inspeção", exige reinspeção): a pendência mostra "reinspeção solicitada aguardando resultado" e **Concluir** é recusado.
2. Como **Juliana** → Rotinas → **Reinspeções** → **Programar** (ponto Casa de Bombas sugerido, checklist do sistema de incêndio) → cria uma rotina não agendada de execução única.
3. Como **Camila** → App → Ronda Patrimonial → **Não agendadas** → "Reinspeção — OC-0009" → execute com todas as respostas conformes → finalize.
4. Como **Helena**, a OC-0009 mostra **Resultado OK** no histórico e no painel Reinspeção; a condição fica atendida, mas a ocorrência **não** é concluída automaticamente. Conclua manualmente.
5. Variante: com "Não conforme" no painel da bomba, a original recebe "Não OK" e a nova ocorrência sugere vínculo com a OC-0009 ("gerada por reinspeção").

## 5. Rotina não executada
1. Como **Juliana** → Rotinas → **Verificar rotinas não executadas** → a **EX-0002** (janela vencida) vira **Não realizada** e gera uma ocorrência "Irregularidade em ronda" com origem "Rotina não executada".
2. No app, a **EX-0004** (Futura) não pode ser iniciada: "Essa rotina ainda não pode ser executada."
