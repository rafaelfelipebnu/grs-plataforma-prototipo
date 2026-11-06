# PRD — Monitor de Infraestrutura

## 1. Objetivo
Produto especialista de conectividade, descoberta, coleta de telemetria, saúde de dispositivos e configuração de monitoramento. A Central apresenta visão consolidada, mas não administra tecnicamente o monitoramento.

## 2. Limites
**Monitor:** conectores, conexões, descoberta, pontos de dados, coleta, saúde de comunicação, regras técnicas e alertas de infraestrutura.  
**Fora do Monitor:** identidade mestre de ativos, OS, inspeções, tratamento completo de ocorrências e avaliação corporativa de riscos.

## 3. Usuários
TI, engenharia/automação, gestor de infraestrutura, manutenção e administradores técnicos.

## 4. Requisitos funcionais
1. Configurar conexões e conectores para dispositivos. Conceito prevê agente GRS compartilhado e conectores por protocolo/fornecedor.
2. Protocolos considerados: BACnet, Modbus, MQTT, ONVIF e SNMP, com extensões futuras. Isso não significa suporte produtivo já implementado.
3. Descobrir dispositivos e metadados, sugerir classificação e correspondência com ativos existentes. Aprovação de criação/associação ocorre na Central.
4. Exibir identificação, tipo, conector, estado de conexão, última comunicação e vínculo com ativo.
5. Exibir pontos de dados por dispositivo: nome, valor, unidade, timestamp e condição; manter ponto → dispositivo → ativo.
6. Exibir saúde de comunicação e última atualização. Não confundir comunicação do dispositivo com condição operacional do ativo.
7. Consultar valor atual e histórico de pontos de dados.
8. Configurar regras de monitoramento e gerar alertas técnicos a partir de telemetria.
9. Distribuir sinais por contratos: Security Hub contextualiza impactos de segurança; Manutenção pode receber gatilhos de manutenção por condição; Riscos consome evidências; Central apresenta contexto consolidado.
10. Configuração/alteração/desativação de conexões e regras exige autorização e registro de auditoria.

## 5. Experiência sugerida
Visão geral; conexões/conectores; descoberta; dispositivos; pontos de dados/telemetria; regras/alertas; histórico/auditoria. Recebe contexto de ativo/local da Central.

## 6. Critérios de aceite
Dispositivos/pontos relacionados a ativos sem duplicar identidade; descoberta apenas sugere; saúde de comunicação separada de condição do ativo; alertas contextualizados; gestão técnica no Monitor.

## 7. A definir
Protocolos priorizados; instalação/atualização/observabilidade do agente; credenciais e segurança; frequência/volume/retenção; operadores, histerese, janelas, supressão e escalonamento de regras; garantias de entrega dos eventos e contratos de integração.
