# PRD — Gestão de Rotinas (integração na plataforma GRS)

## 1. Diretriz
Gestão de Rotinas é produto existente. Integrar preservando modelo e fluxos úteis; não reconstruir nem inventar comportamento sem identificar lacuna concreta.

## 2. Capacidades existentes conhecidas
Planos de rotina, rotinas, checklists, pontos de controle, aplicativo móvel, agendamento/recorrência, evidências (foto, vídeo, áudio e comentários), não conformidades, geração de ocorrências, relatórios e conformidade.

Tipos de ponto de controle: Personalizado, Ativo, Local físico, Pessoa e Veículo. Rotinas podem ser agendadas/não agendadas, recorrentes e possuir status. Execução considera operador, validação de local, evidências e histórico.

## 3. Objetivos
Planejar/executar rotinas, rondas e inspeções; configurar checklists/pontos; coletar evidências; registrar não conformidades; operar offline; integrar com Ocorrências.

## 4. Requisitos de integração
1. Preservar autonomia e operação offline; conectividade não é requisito durante execução.
2. Não conformidade pode originar ocorrência, preservando plano, rotina, checklist, ponto de controle, operador e evidências.
3. Durante execução offline, app não consulta ocorrências online nem deduplica. Após sincronização, Ocorrências avalia possível vínculo e sugere associação. Usuário autorizado confirma ou mantém nova ocorrência.
4. Ocorrência pode solicitar/agendar reinspeção. Rotinas executa mesmo offline e sincroniza. Resultado OK pode permitir encerramento conforme configuração; não OK mantém ocorrência aberta e adiciona evidências.
5. Pontos de controle Ativo e Local físico usam referências compartilhadas da Central, evitando duplicidade.

## 5. Critérios de aceite
Fluxos existentes preservados; offline sem dependência de Ocorrências; associação após sincronização é sugestão; reinspeção mantém checklist, operador, data, resultado e evidências; identidade de ativo/local compartilhada.

## 6. Regra para propostas de mudança
Toda mudança deve registrar problema observado, impacto, benefício, alternativa considerada e compatibilidade com fluxos atuais.

## 7. A definir
Detalhes de sincronização/conflitos; elegibilidade para sugestão de vínculo; campos/estados não cobertos pela documentação existente; coexistência de versões.
