# Roteiro de verificação — Etapa 4 (Monitor de Infraestrutura, descoberta e telemetria)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`, arquivos `monitor.test.ts` e `monitor.test.tsx`).

Antes de começar: **Controles da demonstração** → **Restaurar cenário de demonstração**. O perfil comercial precisa ser **Integrado** (o Monitor não está no Essencial nem no Operacional).

## 1. Visão geral do Monitor
1. Entre como **Marcos Vieira (Administrador Corporativo)** → menu **Monitor de Infraestrutura**.
2. Indicadores: conectores ativos, dispositivos online, comunicação instável/offline, pontos fora do normal, alertas técnicos ativos, regras ativas, descobertos aguardando revisão.
3. **Dispositivos com comunicação degradada** mostra o chiller (instável) e a câmera do estacionamento (offline). O aviso explica que comunicação do dispositivo ≠ condição do ativo.

## 2. Cenário C — descoberta com revisão humana
1. Aba **Conectores** → em **Agente GRS Joinville · Modbus TCP**, clique em **Descobrir** → toast "1 novo(s) dispositivo(s) descoberto(s)": nada foi criado nem associado.
2. Repita em **BACnet/IP**, **MQTT**, **SNMP** e **ONVIF** de Joinville. Clicar de novo em **Descobrir** no mesmo conector → "Nenhum dispositivo novo".
3. Aba **Descoberta** → lista dos encontrados com as sugestões (classificação, local, ativo) e as execuções.
4. **Revisar na Central** → fila **Revisão de dispositivos descobertos**. Cada cartão mostra metadados, pontos de dado e as justificativas das sugestões.
5. **Multimedidor QGBT Administrativo** → **Revisar e aprovar**: local pré-preenchido com a sugestão e "Associar a ativo existente (sugerido: QD-ADM-01)". **Aprovar** sem motivo → validação; com motivo → "Dispositivo aprovado e incorporado".
6. Abra **QD-ADM-01** → aba **Dispositivos** mostra o multimedidor; os pontos de dado aparecem no Monitor (aba **Pontos de dado**).
7. **Câmera IP 10.20.4.31** (sem pista de local) → aprove com **Criar novo ativo na Central** (tag, por exemplo, CAM-EST-04, local Estacionamento) → abre o painel 360º do novo ativo. Repetir com a tag **CAM-EST-03** → erro de tag duplicada.
8. **Impressora de rede PRN-0087** → **Rejeitar** com motivo → sai da fila; na aba **Descoberta** do Monitor aparece como "Rejeitado" e não volta numa nova descoberta.

## 3. Dispositivos já cadastrados com localização pendente
1. Entre como **Juliana Prado (Gestor Local)** → **Central** → aba **Dispositivos** → aviso "N dispositivo(s) aguardando revisão" → **Revisar descobertas**.
2. **Sensor de nível LT-RES-01** → aprove confirmando o **Reservatório de Água de Incêndio** e associando a **SIS-INC-01**.
3. **Nobreak UPS-SRV-01** → **Rejeitar** a sugestão → o dispositivo passa a "Localização não identificada".
4. **Dispositivo BACnet 2001** (não identificado) → não há opção de rejeitar (não existe sugestão); só aprovar informando o local.

## 4. Telemetria, regras e alertas
1. Como **Marcos Vieira** → aba **Pontos de dado** → **Nível de combustível** (GER-002).
2. Gráfico das últimas 24 h com a linha de limite da regra; passe o mouse para ver valor e horário; alterne para **Tabela**.
3. **Simular leitura** (ferramenta do facilitador) → valor **18** → toast com o alerta gerado; o ponto passa a **Alerta** e aparece "Alertas ativos deste ponto". Envie outra leitura baixa → nenhum alerta duplicado.
4. Abra o alerta: como o GER-002 alimenta a controladora CTA-PORT-03, ele mostra impacto em segurança e aparece também no **Security Hub**. A condição do GER-002 na Central continua **Normal**.
5. Aba **Regras** → **Nova regra**: "CPU do switch acima de 20%", ponto **Switch core SW-01 › Uso de CPU**, maior que 20, motivo → toast avisa que o valor atual já viola a regra.
6. **Desativar** a regra "Combustível do gerador baixo" com motivo; **Ativar** "Autonomia do nobreak baixa" (sem alerta, valor dentro do limite).
7. Aba **Alertas técnicos** → **Reconhecer** o alerta da CPU (sem impacto em segurança, reconhecido no Monitor).
8. Aba **Histórico** → conectores, descobertas, regras e leituras simuladas, com ator e motivo.

## 5. Conectores e coleta pausada
1. **Novo conector** → tente informar "senha=123" no campo de rede → recusado (o protótipo não coleta credenciais). Crie com uma faixa fictícia → **Descobrir** encontra um equipamento genérico.
2. **Desativar** o conector Modbus de Joinville com motivo → os dispositivos dele mostram "Coleta pausada"; **Descobrir** fica indisponível e a leitura simulada do combustível é recusada.

## 6. Permissões, escopo e contrato
1. Como **Juliana Prado** → Monitor: só conectores e pontos de Joinville; sem botões de configuração ou descoberta.
2. Como **Helena Duarte (Gestor de Segurança)** → `/central/descobertas`: consulta a fila, sem aprovar.
3. Controles da demonstração → perfil **Operacional** → Monitor aparece bloqueado com explicação de valor; a fila da Central mostra só os dispositivos já cadastrados (não há candidatos da descoberta).
