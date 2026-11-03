# 01 — Arquitetura de produto e navegação

## Estrutura principal

Sidebar persistente e recolhível, nesta ordem:
1. Security Hub.
2. Central de Ativos e Ambientes.
3. Monitor de Infraestrutura.
4. Gestão de Rotinas.
5. Gestão de Manutenção.
6. Gestão de Ocorrências.
7. Gestão de Riscos.

Gestão de Terceiros não entra no escopo inicial.

## Cabeçalho global

- Empresa/cliente.
- Unidade/localização contextual.
- Busca global.
- Notificações.
- Perfil e configurações do usuário.

Login direciona para o dashboard personalizado do Security Hub.

## Busca global

Pesquisar ativos/dispositivos, pessoas, locais, eventos/alertas, ocorrências e solicitações/OS. Respeitar permissões e abrir o módulo correto preservando contexto.

## Notificações

Central compartilhada entre módulos, com filtros por módulo, tipo, local e status. Categorias: não lidas, todas e importantes. Notificação deve abrir o contexto correto. Ler notificação é diferente de reconhecer/resolver evento operacional. Críticas aparecem imediatamente; demais ficam na central.

## Permissões e escopo

Aplicar escopo organizacional e de localização a indicadores, agregações, resultados de busca, detalhes e ações. Não permitir inferência de dados restritos por meio de indicadores agregados.

## Navegação contextual

Ao sair de um ativo/local/evento para um módulo especialista, passar o contexto e oferecer retorno ao contexto anterior. Não perder filtros e seleção sem aviso.

## Experiência integrada

A experiência deve parecer uma plataforma única, mas os módulos mantêm propriedade dos domínios. A camada de experiência consulta serviços e encaminha comandos autorizados.
