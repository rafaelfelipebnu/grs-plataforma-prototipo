# Roteiro de verificação — Etapa 5, 1ª entrega (Gestão de Manutenção)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`, arquivos `src/services/maintenance.test.ts` e `src/modules/manutencao/maintenance.test.tsx`).

Antes de começar: **Controles da demonstração** → **Restaurar cenário de demonstração**. Use o perfil comercial **Operacional** ou **Integrado** (a Manutenção não está no Essencial). Marcas "Provisório · P-xx" na tela indicam hipóteses ainda não aprovadas (ver `docs/decisoes-evolucao.md`, P-49 a P-59).

## 1. Abrir solicitação a partir do ativo (Gestor de Segurança)
1. Entre como **Helena Duarte (Gestor de Segurança)** → **Central** → ativo **GER-002** → aba **Operação**.
2. Os painéis **Solicitações de manutenção** e **Ordens de serviço** mostram SOL-0004 e OS-0002.
3. **Abrir solicitação** → o formulário vem com o ativo e o local preenchidos e o aviso "Aberta a partir do painel 360º do ativo".
4. Tente **Abrir solicitação** sem título → validação. Preencha título e descrição → a página da nova solicitação abre com status **Aberta** e o histórico "aberta a partir do painel 360º".

## 2. Triagem (Gestor de Manutenção)
1. Troque para **Ricardo Nunes (Gestor de Manutenção)**. O sino mostra "Nova solicitação SOL-0008".
2. **Gestão de Manutenção** → **Visão geral** → **Fila de triagem** → abra **SOL-0001** (elevador).
3. **Assumir triagem** → status **Em triagem**; aparecem as decisões.
4. Experimente cada desfecho em solicitações diferentes:
   - **Converter em OS**: escolha a prioridade definida → abre a nova OS **Aberta**.
   - **Resolver sem OS** / **Rejeitar**: exigem justificativa; o solicitante é avisado no sino.
   - **Marcar duplicada**: escolha a original; a original passa a listar a duplicada.
   - **Redirecionar**: só para destino **externo**, com destinos de demonstração (P-52) ou "Outro (informar)".

## 3. Planejamento e execução (gestor e técnico)
1. Na OS criada → **Planejar** → técnico **André Lima** e data → status **Planejada**.
2. Troque para **André Lima (Técnico)** → menu **Gestão de Manutenção** → aba **Minhas OS (móvel)**.
3. Para ver como no celular: no navegador, abra as ferramentas de desenvolvedor e ative o modo de dispositivo móvel (ex.: 390 px de largura).
4. Toque na OS → **Iniciar execução** → **Concluir execução**: informe o trabalho realizado e toque em **+ Adicionar foto** (evidência simulada).
5. A OS continua **Em execução**: concluir a execução não encerra a OS (DP-47). Toque em **Trabalho finalizado — enviar para encerramento** → **Aguardando encerramento**.
6. **Registrar impedimento** (em outra OS planejada, ex.: OS-0001) → o gestor recebe aviso.

## 4. Encerramento, suspensão e cancelamento (Gestor de Manutenção)
1. Como **Ricardo Nunes** → **Visão geral** → **Aguardando encerramento** → **OS-0003** → **Encerrar OS** com a validação do resultado → **Encerrada**. A SOL-0005 continua "Convertida em OS".
2. **OS-0001** (com impedimento registrado) → **Suspender** com justificativa → **Suspensa**; o painel **Tempo da OS** mostra tempo total, suspenso e líquido, sem desconto de SLA. **Retomar** → volta para **Planejada**.
3. Com uma execução **em andamento** (inicie uma como André na OS-0002): como Ricardo, **Suspender** e **Cancelar OS** não aparecem e uma mensagem explica o motivo. **Interromper execução** (hipótese P-51) → a execução fica **Interrompida** com o trabalho parcial preservado.
4. **Cancelar OS** (OS-0002) → alerta "Cancelada com trabalho parcial".
5. Abra a solicitação da OS cancelada (SOL-0004) → aviso "OS vinculada cancelada": a solicitação **não** foi cancelada. **Retomar triagem** com motivo → **Em triagem**; a OS cancelada fica em "OS anteriores".

## 5. Solicitante, permissões e escopo
1. Como **Juliana Prado (Gestor Local)** → **Solicitações** → marque **Somente minhas** → abra uma solicitação **Aberta** → **Editar** (o histórico registra valor anterior e novo) e **Cancelar solicitação** (exige motivo). Em solicitação já em triagem, essas ações não aparecem (DP-40).
2. Juliana (escopo Joinville) não vê **SOL-0007** (Curitiba); Marcos Vieira (Administrador) vê.
3. **Operador de Rotinas** não vê a Manutenção no menu (P-55).
4. Selecione no cabeçalho a localização **Casa de Bombas** → visão geral e listas passam a mostrar só esse recorte (P-59).
5. Em **Controles da demonstração**, mude o perfil comercial para **Essencial** → a Manutenção aparece bloqueada com explicação, e o painel 360º do ativo informa que a capacidade não está contratada.
