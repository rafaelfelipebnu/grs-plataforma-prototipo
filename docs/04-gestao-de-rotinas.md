# 04 — Gestão de Rotinas

## Diretriz

Produto existente. Preservar conceitos e fluxos documentados; não reconstruir por preferência estética. Só propor mudança se houver problema concreto, impacto, benefício e alternativa.

Referência documental fornecida pelo usuário:
https://documentacao.senior.com.br/seniorxplatform/manual-do-usuario/ronda/#home-gestao-de-rotinas.htm

## Conceitos existentes

- Planos de rotina.
- Rotinas.
- Checklists.
- Pontos de controle.
- Aplicativo móvel.
- Agendamento e recorrência.
- Evidências: foto, vídeo, áudio e comentários.
- Não conformidade.
- Geração de ocorrência.
- Relatórios e conformidade.

Tipos de ponto de controle:
- Personalizado.
- Ativo.
- Local físico.
- Pessoa.
- Veículo.

Rotinas podem ser agendadas ou não, recorrentes e com status. Execução pode validar operador/local e registrar evidências/histórico.

## Offline

Aplicativo precisa executar rotinas sem conexão. Durante execução offline, não consulta ocorrências online nem tenta deduplicar. Após sincronização, o serviço de Ocorrências avalia possível associação com ocorrência aberta e sugere vínculo. Usuário autorizado confirma ou mantém nova ocorrência.

Ocorrência pode solicitar/agendar reinspeção; Rotinas executa mesmo offline e sincroniza resultado. Resultado OK pode permitir encerramento conforme configuração; resultado não OK mantém ocorrência aberta e adiciona evidência.

## Protótipo

Incluir visão de planos, rotinas, checklists, pontos de controle, agenda, execução móvel, evidências, não conformidades e sincronização simulada. Mostrar claramente estado offline/sincronizado.
