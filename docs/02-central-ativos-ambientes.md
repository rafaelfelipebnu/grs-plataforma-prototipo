# 02 — Central de Ativos e Ambientes

## Objetivo

Ser a base compartilhada de identidade de ativos, dispositivos, locais, hierarquia e relacionamentos, evitando cadastros mestres duplicados.

## Modelo conceitual

- **Ativo:** objeto físico ou lógico relevante à operação.
- **Dispositivo:** equipamento que se comunica com a plataforma.
- **Ponto de dado:** variável, propriedade ou sinal fornecido por dispositivo.
- **Conexão:** forma/protocolo usado para comunicação.
- Um ativo pode ter vários dispositivos; um dispositivo pode alimentar um ativo; um dispositivo também pode ser um ativo (ex.: câmera).
- Incluir ativos sem dispositivo conectado.

## Identidade e especialização

Cadastro compartilhado mantém identidade, localização, hierarquia e relacionamentos. Atributos e funções especialistas permanecem nos módulos responsáveis. Cadastro iniciado pela Central ou por módulo especialista usa a mesma identidade mestre.

## Localização

Entidade unificada “Localização”, com hierarquia, por exemplo: Unidade → Prédio → Setor → Sala. Reutilizar hierarquia física existente; não criar outro cadastro de locais. Estrutura organizacional é separada, com mapeamento explícito.

Todo ativo tem localização principal obrigatória. Separar:
- Localização principal do ativo.
- Locais atendidos/afetados pelo ativo.

Exemplo: gerador localizado na sala de máquinas que atende prédios A, B e C.

Responsabilidade híbrida: ativo pode herdar responsável da localização e ter responsável direto; mostrar origem da responsabilidade.

## Criticidade e impacto

Manter separados:
- Criticidade intrínseca do ativo: importância própria; inicialmente baixa/média/alta, definida manualmente.
- Impacto operacional: calculado a partir de dependências, locais atendidos, processos, pessoas e outros ativos.

Ativo crítico pode estar normal; ativo pouco crítico pode estar indisponível. Condição operacional: normal, atenção, crítico ou indisponível, manual ou alimentada por módulos.

## Central e visão por local

Árvore de localização permanente. Seleção de local atualiza as abas e inclui descendentes por padrão; permitir “somente este local”. Evitar duplicidade e mostrar local de origem do alerta.

Mapa opcional e configurável, sincronizado com árvore; pode ser associado a unidade, prédio ou andar. A árvore é obrigatória.

## Home da Central

Após selecionar local, abas:
- Visão geral.
- Ativos.
- Dispositivos.
- Telemetria.
- Grupos.
- Alertas e ocorrências.

Visão geral: indicadores, mapa expansível, alertas/ocorrências que exigem atenção, ativos que exigem atenção.

Ativos: lista e cartões, filtros e permissões.

Dispositivos: estados distintos — localização confirmada, localização sugerida aguardando validação, não identificado. Descoberta não confirma localização física.

Telemetria: pontos de dados por dispositivo, valor atual, unidade, última atualização e status; relação ponto → dispositivo → ativo.

Grupos: grupos associados, critérios, origem manual/automática, exceções e histórico.

Alertas/ocorrências: consolidar local selecionado e descendentes; filtros por origem, tipo, severidade, status e período; detalhe no módulo proprietário.

## Grupos

Separar:
- Classificação: o que o ativo é; uma classificação principal em hierarquia.
- Grupos flexíveis: por que/como é usado; múltiplos grupos, sem duplicar ativo.

Categorias:
1. Corporativos/compartilhados.
2. Operacionais compartilhados.
3. Especializados, pertencentes a módulos.

Associação manual e por regras automáticas, com exceções. Regras são reavaliadas dinamicamente. Exceções persistem até remoção explícita; conflitos são sinalizados, não sobrescritos silenciosamente.

Toda mudança deve registrar origem, regra, histórico, exceção, ator, data/hora e motivo. Antes de alterar regra, mostrar prévia dos ativos afetados. Auditoria de associação é distinta de auditoria de configuração.

Governança híbrida:
- Corporativo define padrões, grupos compartilhados, regras gerais, periodicidade mínima de auditoria e indicadores consolidados.
- Gestor local valida associações, inclui/remove ativos, cria exceções e regras locais dentro de suas permissões.
- Auditoria local pode ser concluída sem aprovação corporativa; corporativo tem visão consolidada.

Central administra grupos corporativos/compartilhados; módulos administram grupos especializados. Grupo compartilhado permite selecionar quais módulos podem consumi-lo.

Reação do módulo ao grupo: informativa, aplicar configuração pré-configurada ou gatilho operacional. Compartilhar grupo não dispara ação por si só; módulo precisa de configuração explícita.

## Painel 360º do ativo

Página completa, não drawer. Cabeçalho persistente com identidade, localização, criticidade e condição. Abas:
- Visão geral.
- Dispositivos.
- Módulos GRS.
- Operação.
- Riscos.
- Relacionamentos.
- Histórico.

Todas as abas aparecem mesmo sem contratação; aba não contratada explica valor, sem expor dados. Ações comuns podem ocorrer no painel (reconhecer alerta, abrir solicitação de manutenção, consultar OS, histórico); configurações avançadas redirecionam ao módulo especialista.

## Indicadores

- Quantidade de ativos.
- Percentual com dispositivo conectado.
- Produtos GRS vinculados por ativo.
- Clientes com múltiplos módulos sobre os mesmos ativos.
- Tempo de cadastro/configuração.
- Dispositivos descobertos incorporados.
- Duplicidades evitadas.
- Completude de localização/classificação.
- Indicador estratégico: produtos GRS por cliente sobre base compartilhada.
