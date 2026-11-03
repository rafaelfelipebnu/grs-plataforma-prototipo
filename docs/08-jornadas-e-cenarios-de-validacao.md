# 08 — Jornadas e cenários de validação

## Cenário A — Falha em ativo crítico

Contexto demonstrativo: bomba BMB-014 apresenta falha.

1. Monitor de Infraestrutura recebe sinal simulado.
2. Central associa sinal ao dispositivo e ao ativo.
3. Ativo tem criticidade própria e locais/processos atendidos.
4. Impacto operacional é contextualizado, por exemplo edifício administrativo, linha produtiva ou reservatório.
5. Se houver impacto em sistema de segurança (ex.: água de incêndio), Security Hub destaca o evento.
6. Usuário reconhece o alerta e consulta contexto do ativo.
7. Usuário abre solicitação de manutenção ou acompanha OS no módulo proprietário.
8. Ocorrência pode ser registrada e tratada com plano de ação.
9. Histórico reúne sinal, decisões, execução e evidências.

## Cenário B — Não conformidade em inspeção

1. Operador executa checklist em dispositivo móvel.
2. Registra pequeno vazamento próximo à bomba.
3. App pode estar offline; evidência é armazenada localmente.
4. Ao sincronizar, sistema avalia ocorrência aberta semelhante e sugere vínculo.
5. Usuário autorizado confirma vínculo ou mantém nova ocorrência.
6. Conforme configuração, cria plano de ação e/ou solicitação de manutenção.
7. Pode ser agendada reinspeção.
8. Rotinas executa reinspeção, inclusive offline.
9. Resultado sincronizado alimenta encerramento conforme regra; resultado não OK mantém ocorrência aberta e adiciona evidência.

## Cenário C — Descoberta de dispositivo

1. Administrador configura conector.
2. Sistema descobre dispositivos e metadados.
3. Sistema sugere classificação/associação.
4. Usuário revisa, confirma ou rejeita.
5. Após aprovação, dispositivo é associado a ativo/local e pontos de dados são apresentados.

## Cenário D — Navegação contextual

1. Usuário abre alerta no Security Hub.
2. Acessa ativo relacionado.
3. Consulta dispositivos, módulos, operação e histórico.
4. Abre OS no módulo de manutenção preservando ativo/contexto.
5. Retorna ao contexto anterior sem perder seleção.

## Critérios de validação com cliente

- Entende o papel da Central e do Security Hub?
- Consegue localizar ativo e entender impacto?
- Entende a diferença entre ativo, dispositivo e ponto de dado?
- Consegue executar fluxo de descoberta com revisão humana?
- Consegue distinguir solicitação, OS e execução?
- Entende vínculo entre rotina, ocorrência, plano e reinspeção?
- Percebe valor da integração sem confundir os domínios?
- Consegue completar tarefas sem orientação do facilitador?
