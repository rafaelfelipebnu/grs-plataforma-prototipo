# Roteiro de verificação — Etapa 1 (fundação)

Roteiro manual reproduzível. Os fluxos críticos também têm testes automatizados (`npm test`).

Antes de começar: abra **Controles da demonstração** (faixa amarela no topo) → **Restaurar cenário de demonstração**.

## 1. Entrada e perfis
1. Acesse `http://localhost:5173`. Sem sessão, aparece **Escolha um perfil para entrar** com 6 perfis.
2. Entre como **Helena Duarte (Gestor de Segurança)** → abre o **Security Hub**.
3. Confirme a faixa "Ambiente de demonstração" e o cliente "Aurora Demo" no cabeçalho.
4. Menu do usuário (avatar) → **Trocar perfil de demonstração** → entre como **Camila Rocha (Operador de Rotinas)**.
   - Esperado: abre direto **Gestão de Rotinas**; o menu mostra só esse módulo.
5. Acesse `/riscos` manualmente → **403 - Acesso negado**.

## 2. Menu lateral e módulos contratados
1. Entre como **Helena Duarte**. O menu mostra os 7 módulos na ordem oficial.
2. **Recolher menu** (rodapé do menu) → somente ícones; recarregue a página → preferência mantida.
3. Controles da demonstração → Perfil comercial **Essencial** → **Aplicar perfil comercial**.
   - Esperado: toast de sucesso; Monitor, Rotinas, Manutenção e Riscos aparecem com cadeado.
4. Abra **Monitor de Infraestrutura** → "Capacidade não contratada", com proposta de valor e **nenhum dado operacional**.
5. **Falar com um consultor** → toast "Interesse registrado (Simulação)".
6. Volte a **Integrado**.

## 3. Localização contextual e escopo
1. Como **Juliana Prado (Gestor Local, Joinville)**, abra o seletor **Localização**.
   - Esperado: apenas a Unidade Joinville aparece (Curitiba está fora do escopo).
2. Digite "Casa" no filtro → selecione **Casa de Bombas**. O cabeçalho mostra o local escolhido e as páginas de módulo exibem "Contexto de localização ativo".
3. Busque "Câmara fria" → **Nenhum resultado** (ativo de Curitiba fora do escopo).

## 4. Busca global e navegação contextual
1. Como **Helena Duarte**, no Security Hub, digite `BMB-014` na busca (atalho: tecla `/`).
   - Esperado: resultados agrupados (Ativos, Dispositivos, Eventos…); rodapé informa que Ocorrências e Solicitações/OS estarão disponíveis quando os módulos forem implementados.
2. Abra o ativo **BMB-014**: criticidade (alta) e condição (normal) aparecem separadas; responsável direto; locais atendidos distintos da localização principal.
3. Clique em **SIS-INC-01** (Dependem deste ativo) → página do sistema de incêndio.
4. **Voltar para BMB-014** → **Voltar para Security Hub**. O retorno restaura o contexto anterior.
5. Busque "Helena" → aparece em **Pessoas** (fonte: Controle de Acesso). Abra → consulta somente leitura.
6. Como **André Lima (Técnico)**, busque "Helena" → nenhuma pessoa (perfil sem permissão).
7. Pressione Enter na busca → página **Busca** com filtros por tipo (estado na URL).

## 5. Notificações
1. Como **Helena Duarte**, clique no sino → abas **Não lidas / Todas / Importantes** com contadores.
2. **Filtros** → Módulo "Monitor de Infraestrutura" → chip de filtro aplicado; remova pelo ✕.
3. Clique em **Porta de emergência aberta — Linha Produtiva 1**.
   - Esperado: abre o evento no Security Hub; a notificação fica lida, mas o alerta continua **Alerta ativo**.
4. **Reconhecer alerta** → toast de sucesso; o status muda para "Reconhecido" com autor e horário.
5. Reabra o sino → a notificação mostra "Alerta reconhecido".

## 6. Cenário A — falha simulada em ativo crítico
1. Controles da demonstração → **Simular falha na bomba BMB-014**.
   - Esperado: aviso crítico imediato "Falha na bomba BMB-014 — Afeta Sistema de água de incêndio (SIS-INC-01)".
2. **Abrir contexto** → evento crítico com o painel **Impacto em segurança**.
3. Abra o **CLP da bomba BMB-014** → pressão 0,4 bar e motor "Falha" (Crítico).
4. Abra o ativo **BMB-014** → condição **Crítico** alimentada pelo Monitor; a criticidade continua **alta** (não muda).
5. Entre como **Ricardo Nunes (Gestor de Manutenção, sem Security Hub)** → a notificação da falha abre o **ativo** na Central.
6. Tente simular de novo → aviso "Cenário não iniciado"; restaure para repetir.

## 7. Persistência e responsividade
1. Recarregue a página após reconhecer um alerta → o estado é mantido.
2. **Restaurar cenário de demonstração** (com confirmação) → estado original.
3. Reduza a janela abaixo de 992 px → o menu vira gaveta (botão ☰); abaixo de 576 px a faixa de demonstração fica compacta.
