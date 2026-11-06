# PRD — Security Hub

## 1. Objetivo
Porta de entrada da experiência integrada GRS, com foco em segurança: consciência situacional, monitoramento, contextualização, correlação e orquestração. Não deve se tornar dashboard genérico de operações.

## 2. Limites
Security Hub monitora/contextualiza. Controle de Acesso mantém permissões e eventos; Monitor mantém telemetria/regras; Manutenção mantém OS; Rotinas mantém checklists; Ocorrências mantém tratamento. Security Hub pode exibir e iniciar ações, sem absorver esses domínios.

## 3. Dashboard
Quatro áreas: resumo de segurança; eventos em destaque; mapa operacional expansível; ações pendentes.

Catálogo de 17 widgets:
- Segurança: acessos em tempo real; eventos e alertas; câmeras em destaque; alarmes ativos; ocorrências abertas.
- Operação integrada: mapa operacional; ativos críticos; saúde da infraestrutura; alertas de telemetria; manutenções em andamento; inspeções e rotinas pendentes.
- Gestão: indicadores gerais de segurança; ocorrências por status; ações pendentes; tempo médio de resposta; histórico de eventos relevantes; situação operacional por localização.

## 4. Requisitos funcionais
1. Painel padrão do cliente; após login, Security Hub é a página inicial.
2. Usuário pode personalizar painel: editar, adicionar do catálogo, remover, arrastar/redimensionar, pré-visualizar, salvar/cancelar.
3. Mudança do padrão administrativo não sobrescreve personalizações individuais.
4. Configuração de widget, quando aplicável: período, local, criticidade, quantidade e atualização.
5. Clique abre detalhe filtrado/contextualizado, preservando contexto.
6. Eventos exibem severidade, origem, localização, tempo e estado. Reconhecimento por usuário autorizado não equivale à resolução.
7. Alarmes e câmeras em destaque com contexto e navegação para detalhe.
8. Sinais de outros módulos só são destacados quando relevantes à segurança. Exemplo: falha de bomba vinculada ao sistema de água de incêndio pode afetar prédios/linha produtiva e merece contextualização quando os relacionamentos existirem.
9. Ações pendentes consolidadas sem assumir processo do domínio proprietário.

## 5. Experiência
Sidebar persistente/recolhível; cabeçalho global com empresa, localização, busca, notificações e perfil. Dashboard prioriza decisões, fila de ações, impacto e contexto; detalhes técnicos por drill-down.

## 6. Critérios de aceite
Foco em segurança; widgets configuráveis e com drill-down; padrão não sobrescreve customização individual; reconhecimento distinto de resolução; dados integrados mostram origem/domínio; permissões respeitadas.

## 7. A definir
Estados/transições completos de eventos e alarmes; latência/atualização; integração real CFTV/protocolos; fórmulas de indicadores; regras de correlação/priorização; estratégia de streaming de vídeo.
