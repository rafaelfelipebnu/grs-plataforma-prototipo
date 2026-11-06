# Roteiro de verificação — Etapa 5, 3ª entrega (Planos de Ação)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`, arquivos `src/services/plans.test.ts` e `src/modules/planos/plans.test.tsx`).

Antes de começar: **Controles da demonstração** → **Restaurar cenário de demonstração**. Use o perfil comercial **Operacional** ou **Integrado**. Marcas "Provisório · P-xx" indicam hipóteses ainda não aprovadas (`docs/decisoes-evolucao.md`, P-70 a P-79).

## 1. Área compartilhada
1. Entre como **Juliana Prado (Gestor Local)**. No menu, abaixo dos módulos, o grupo **Capacidades compartilhadas** tem **Planos de ação**.
2. A lista mostra PA-0001 (Em andamento), PA-0003 (Rascunho) e, em "Todos", PA-0002 (Concluído, eficácia pendente).
3. Mude o perfil comercial para **Essencial** → Planos de ação aparece bloqueado, com explicação e sem dados. Volte para **Integrado**.

## 2. Dependência cancelada (DP-32) e ação executada por OS (DP-33)
1. Abra **PA-0001**. A ação **A4** mostra "Dependência cancelada — decisão necessária" (A3 foi cancelada).
2. **Decidir dependência** → escolha remover ou substituir; a justificativa é obrigatória e entra no histórico. A4 deixa de estar bloqueada.
3. A ação **A2** referencia a SOL-0004 / OS-0002. Como **Ricardo Nunes**, encerre a OS-0002 (o técnico André precisa antes enviar para encerramento). Volte ao PA-0001: A2 mostra "Execução vinculada concluída (OS encerrada)", mas continua **Em execução**.
4. Como **André Lima (Técnico)** → A2 → **Concluir** ou **Manter aberta** com justificativa.

## 3. Exigência de plano na ocorrência (DP-10, DP-10a)
1. **Gestão de Ocorrências** → **Tipos**: "Irregularidade em ronda" exige plano **iniciado**; "Desvio de procedimento de segurança" exige plano **concluído**.
2. **OC-0005**: registre um trâmite → as pendências mostram "Plano de ação iniciado (nenhum plano iniciado…)". O PA-0003 está em Rascunho e não conta.
3. Abra o **PA-0003** → inclua uma ação (executor Camila Rocha) → **Ativar plano** → volte à OC-0005: condição atendida e N3 no sino.
4. **OC-0008**: "Planos de ação concluídos" pendente (PA-0001 em andamento). **Criar plano** a partir da ocorrência → o novo plano em Rascunho passa a contar e a pendência mostra 2 planos não concluídos.

## 4. Pausa, conclusão e eficácia (DP-23, DP-24)
1. No PA-0001, **Pausar** com justificativa → as ações mantêm o status e mostram "Plano pausado"; Iniciar/Concluir somem. **Retomar**.
2. Num plano sem avaliador, conclua todas as ações → **Concluir plano** fica indisponível e explica que faltam avaliador e data da avaliação. **Definir avaliação de eficácia** → concluir.
3. Como **Helena Duarte** (avaliadora do PA-0002) → **Avaliar eficácia** → "Parcialmente eficaz" sem justificativa dá erro; com justificativa, registra.
4. Como **Juliana** → PA-0002 → **Criar plano relacionado** → o novo plano nasce em Rascunho, ligado ao anterior; o PA-0002 continua Concluído.

## 5. Vínculo com ocorrência concluída (DP-08)
1. No PA-0001, **Vincular ocorrência** → escolha a **OC-0006** (concluída) → a justificativa é exigida; a ocorrência continua Concluída, com registro automático no histórico.
