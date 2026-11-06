# PRD — Central de Ativos e Ambientes

## 1. Objetivo
Fornecer identidade mestre compartilhada, localização, classificação, grupos e relacionamentos dos ativos GRS, com visão 360º e acesso às capacidades especialistas sem absorver sua lógica.

## 2. Problema
Dados de ativos, dispositivos, locais e relações operacionais fragmentados dificultam identificar o objeto correto, entender onde está, quais serviços utiliza e quais operações dependem dele.

## 3. Escopo e não objetivos
Inclui cadastro mestre, hierarquia de locais, relacionamentos, grupos, descoberta assistida, visão 360º e navegação contextual. Não inclui gestão de OS, lógica de risco, execução de inspeções nem configuração técnica avançada de telemetria.

## 4. Modelo conceitual
- **Ativo:** objeto físico ou lógico relevante à operação.
- **Dispositivo:** equipamento comunicante.
- **Ponto de dados:** variável/sinal de um dispositivo.
- **Conexão:** meio/protocolo de comunicação.
- **Localização:** hierarquia física.
- **Grupo:** agrupamento por finalidade.
- **Relacionamento:** dependência, atendimento, associação ou impacto.

Localização hierárquica exemplificativa: Unidade → Prédio → Setor → Sala. Estrutura organizacional permanece separada, com mapeamento explícito. Todo ativo tem localização principal obrigatória. Localização principal (onde está) difere de locais atendidos/afetados (onde presta serviço/produz impacto).

Responsabilidade híbrida: ativo pode herdar responsável do local e também ter responsável direto, com origem explícita.

Criticidade intrínseca (baixa/média/alta), impacto operacional e condição (normal/atenção/crítico/indisponível) são dimensões independentes. Criticidade inicialmente manual; impacto derivado de relacionamentos simples e explicáveis; condição manual ou alimentada por módulos.

## 5. Requisitos funcionais
1. Cadastro/identidade mestre única, iniciado pela Central ou por módulo especialista usando o mesmo serviço.
2. Classificação principal hierárquica (“o que é”), distinta de grupo.
3. Navegação pela árvore de locais; padrão inclui descendentes, com opção “somente este local”; evitar duplicidades e mostrar origem de alertas.
4. Relacionamentos com dispositivos, pontos de dados, locais atendidos, grupos, responsáveis e outros ativos.
5. Grupos corporativos/compartilhados, operacionais compartilhados e especializados de produto. Um ativo pode pertencer a vários grupos.
6. Associação manual ou por regras; regras reavaliadas dinamicamente. Exceções persistem até remoção explícita; conflitos sinalizados, nunca sobrescritos silenciosamente.
7. Prévia dos ativos afetados antes de alterar regra. Auditoria registra origem, regra, histórico, ator, horário e motivo.
8. Governança híbrida: corporativo define padrões/grupos/regras gerais e periodicidade mínima de auditoria; gestor local valida associações, cria exceções e regras locais dentro de permissão. Auditoria local independente, visibilidade consolidada corporativa.
9. Grupo compartilhado indica módulos consumidores permitidos. Compartilhar não dispara ação: módulo consumidor configura reação informativa, aplicação de configuração ou gatilho operacional.
10. Descoberta assistida: configurar rede/conector → descobrir → classificar → revisar sugestões → aprovar criação/associação. Descoberta inicial somente leitura; alterações exigem aprovação humana autorizada.
11. Estado de dispositivo: localização confirmada, localização sugerida aguardando validação ou não identificado. Descoberta não confirma localização física.
12. Página 360º com cabeçalho persistente (identidade, local, criticidade, condição) e abas: Visão geral, Dispositivos, Módulos GRS, Operação, Riscos, Relacionamentos, Histórico.
13. Abas de módulos podem aparecer bloqueadas sem contratação, explicando valor, sem expor dados operacionais.
14. Ações comuns podem ser iniciadas no painel (reconhecer alerta, abrir solicitação, consultar OS); configuração avançada redireciona ao módulo proprietário, preservando contexto.
15. Central inicial com árvore fixa e abas: Visão geral, Ativos, Dispositivos, Telemetria, Grupos, Alertas e ocorrências.
16. Visão geral: indicadores, mapa expansível, alertas/ocorrências que exigem atenção e ativos que exigem atenção.
17. Telemetria consolidada: ponto por dispositivo, valor, unidade, última atualização e status; vínculo ponto → dispositivo → ativo. Gestão técnica fica no Monitor.

## 6. Experiência
Árvore de locais obrigatória; mapa opcional/configurável; árvore e mapa sincronizados. Mapas podem ser associados a unidade, prédio ou andar. Seleção de local atualiza todas as abas; incluir descendentes por padrão. Página de ativo é página completa, não painel lateral. Todas as listas, indicadores, detalhes e ações respeitam escopo/permissões.

## 7. Indicadores
Quantidade de ativos; percentual com dispositivos conectados; produtos GRS vinculados por ativo; clientes com múltiplos módulos na mesma base; tempo de cadastro/configuração; dispositivos descobertos incorporados; duplicidades evitadas; completude de local/classificação.

## 8. Critérios de aceite
Identidade única; local principal obrigatório; locais atendidos distintos; criticidade/impacto/condição separados; descoberta sem alteração automática; grupos com regras/exceções/prévia/histórico; painel 360º consulta domínios sem absorvê-los; permissões em árvore, métricas, listas, detalhes e ações.

## 9. A definir
Atributos específicos por classe de ativo; algoritmo de impacto além das relações simples; detalhes técnicos de mapas/floorplans; contratos de APIs/sincronização; regras detalhadas de auditoria.
