# 07 — Integrações, telemetria e descoberta

## Arquitetura conceitual

Um agente GRS compartilhado com conectores de protocolos/fornecedores. Protocolos citados: BACnet, Modbus, MQTT, ONVIF, SNMP e futuros conectores.

## Descoberta

Fluxo:
1. Configurar rede/conector.
2. Descobrir dispositivos.
3. Classificar e sugerir correspondências.
4. Revisar e aprovar criação/associação por pessoa autorizada.
5. Configurar módulos consumidores.

Descoberta inicial é somente leitura. Criação, atualização, associação e exclusão exigem aprovação humana. Descoberta não confirma localização física.

## Telemetria

Pontos de dados pertencem a dispositivos; dispositivos podem estar associados a ativos. Exibir valor, unidade, última atualização e status. Relacionamento: ponto → dispositivo → ativo.

## Protótipo

Simular conectores, descoberta, classificação, sugestões, aprovação, associação, pontos de dados, alertas e histórico. Não conectar equipamentos reais. Mostrar estado de comunicação e origem simulada.
