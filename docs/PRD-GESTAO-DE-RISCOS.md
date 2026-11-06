# PRD — Gestão de Riscos

## 1. Objetivo
Produto especialista para avaliar riscos estruturadamente, relacioná-los a ativos, locais, pessoas e processos e acompanhar exposição e controles. Consome evidências do ecossistema, mas mantém domínio próprio.

## 2. Limites e dependências
Gestão de Riscos é opcional e não é pré-requisito para Gestão de Ocorrências ou Planos de Ação. Planos de Ação podem ser habilitados por Ocorrências Avançadas, Gestão de Rotinas ou Gestão de Manutenção.

## 3. Usuários
Gestor de riscos, gestor de segurança, gestor local, responsáveis por controles e auditores.

## 4. Requisitos funcionais conceituais
1. Registrar risco e associá-lo a ativo, localização, processo ou outro objeto aplicável.
2. Avaliar risco conforme metodologia configurada. Metodologia, escalas, fórmulas e matriz são **A definir**; não presumir metodologia.
3. Relacionar controles ao risco, responsáveis e acompanhamento de situação/evidências.
4. Consultar evidências de ocorrências, inspeções, manutenção e telemetria mantendo origem e domínio proprietário.
5. Relacionar riscos a ativos/locais sem duplicar cadastro mestre.
6. Disponibilizar contexto relevante ao Security Hub e Central, respeitando permissões.

## 5. Critérios de aceite iniciais
Risco possui identidade/histórico; avaliação explicável e baseada em metodologia configurada; controles rastreáveis; evidências preservam origem; módulo não é dependência obrigatória de Ocorrências/Planos de Ação.

## 6. Lacunas a resolver antes da implementação
Taxonomia e ciclo de vida; metodologia, escalas e matriz; risco inerente/residual/aceitabilidade se aplicáveis; modelo de controle, responsável, periodicidade e evidência; planos de tratamento e relação com Planos de Ação; revisões/aprovações/auditoria; indicadores e relatórios.
