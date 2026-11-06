# Etapa 7 — Validação integrada e estabilização

Versão consolidada do protótipo (etapas 1 a 5) validada **no navegador** em 06/11/2026, além dos testes automatizados.

## Como acessar

```
npm install      # se ainda não tiver as dependências
npm run dev      # http://localhost:5173
npm test         # 145 testes automatizados
npm run build    # build de produção
```

- Ao abrir pela primeira vez esta versão, o cenário de demonstração é recriado automaticamente (o formato dos dados mudou). Para voltar ao estado inicial a qualquer momento: **Controles da demonstração** → **Restaurar cenário de demonstração**.
- Troca de persona: menu do usuário (canto superior direito) → sair → escolher o perfil.
- Para ver as experiências móveis: ferramentas do desenvolvedor do navegador → modo de dispositivo (ex.: 390 px).

## Como a validação foi feita

- Navegador Chrome (headless), controlado por script, com capturas de tela inspecionadas tela a tela.
- Resoluções: **desktop 1440×900**, **tablet paisagem 1024×768**, **tablet retrato 768×1024** e **celular 390×844** (experiências móveis).
- Em cada tela: erros de console e rolagem horizontal da página (nenhum ocorreu após as correções).
- Os cenários foram encadeados numa mesma sessão, trocando de persona entre as etapas (os dados persistem como na demonstração real).

## Cenários testados e resultados

| # | Cenário | Personas | Resultado |
|---|---------|----------|-----------|
| 1 | **Central → Rotinas / Ocorrências / Manutenção**: painel 360º da BMB-014, aba "Módulos GRS" | Gestor Local | OK após correção C7: mostra o ponto de controle que referencia o ativo e as ocorrências abertas, com links. |
| 2 | **Rotinas → Ocorrência**: ronda EX-0001 no app (QR Code, não conformidade com observação e foto, finalizar) | Operador de Rotinas | OK após correção C1 (o checklist sumia depois da verificação do ponto). Gera a OC-0010 automaticamente. |
| 3 | **Ocorrência → sugestão e confirmação de vínculo**: OC-0010 sugere OC-0005 (mesmo tipo e local) | Gestor Local | OK: sugestão, motivo e "Confirmar vínculo / Manter independente"; vínculo confirmado nos dois históricos. |
| 4 | **Ocorrência → reinspeção → Rotinas → resultado**: OC-0009 bloqueada; gestor programa; operador executa; resultado OK volta | Gestor de Segurança, Gestor Local, Operador | OK após correção C2: enquanto pendente, "Concluir" não aparece; com OK, a condição é atendida e "Concluir" aparece, sem conclusão automática. |
| 5 | **Ocorrência → Planos de Ação → ações e eficácia**: decidir dependência cancelada (PA-0001), avaliar eficácia Parcial (PA-0002), criar plano relacionado | Gestor Local, Gestor de Segurança | OK após correção C4 (botões da ação vazavam da tabela). PA-0004 nasce em Rascunho ligado ao PA-0002. |
| 6 | **Manutenção ponta a ponta**: abrir solicitação pelo ativo; triagem; converter; planejar; técnico executa no celular e envia; gestor encerra | Gestor Local, Gestor de Manutenção, Técnico | OK: OS-0004 Encerrada; a SOL-0001 continua "Convertida em OS" (sem propagação). |
| 7 | **Responsividade**: detalhe de ocorrência (1024), plano (768), consulta (768), Manutenção (768), Central (768), Minhas OS e app de Rotinas (390) | Várias | OK após correções C3, C4 e C8; menu vira gaveta no tablet; sem rolagem horizontal. |
| 8 | **Permissões demonstrativas**: Técnico (menu reduzido + Planos de ação), Gestor de Manutenção só consulta ocorrências, Operador acessa o app | Técnico, Gestor de Manutenção, Operador | OK. Cobertura adicional nos testes automatizados (escopo Joinville × Curitiba, contrato Essencial). |
| 9 | **Security Hub**: painel padrão e widgets de ocorrências | Gestor de Segurança | OK, sem erros. |

## Problemas encontrados e corrigidos

| # | Problema | Impacto | Correção |
|---|----------|---------|----------|
| C1 | O contexto de acesso era recriado a cada alteração de dados; as telas voltavam a "carregando" e eram **remontadas**, perdendo o estado local (no app de Rotinas, o checklist sumia após "Ler QR Code"; modais e campos digitados também eram afetados). | Bloqueava o fluxo do operador no app. | O contexto de acesso só muda quando usuário, perfil, escopo ou contrato mudam; as telas continuam atualizando com os dados (`SessionProvider.tsx`). |
| C2 | Ocorrência com pendência de plano/reinspeção mostrava **"Concluir"** (o clique só devolvia erro); "Solicitar reinspeção" aparecia com outra já pendente; o texto dizia "Sem condições adicionais" em tipo que exige reinspeção. | Confusão sobre o que pode ser feito. | "Concluir" e "Solicitar aprovação" só aparecem quando as pendências do tipo permitem, com explicação; pedido duplicado de reinspeção oculto; texto corrigido. |
| C3 | Colunas do Painel de ocorrências cortavam cartões. | Leitura prejudicada. | Colunas mais altas (com rolagem interna). |
| C4 | Botões de ação na tabela de ações do plano vazavam à direita (Reprogramar/Cancelar inacessíveis). | Ações inalcançáveis. | Botões quebram linha dentro da célula. |
| C5 | Detalhe da execução de rotina mostrava valor técnico ("verificado por geolocalizacao"). | Texto sem acento/técnico. | Rótulos "QR Code", "geolocalização", "justificativa". |
| C6 | No detalhe da execução, a aba ativa era "Visão geral" em vez de "Consulta de rotinas". | Orientação na navegação. | Aba correta destacada. |
| C7 | Aba "Módulos GRS" da Central dizia que Rotinas e Ocorrências chegariam "na etapa 5"; Security Hub aparecia "Em uso" com 0 eventos. | Informação desatualizada. | Mostra pontos de controle e ocorrências abertas do ativo (consulta aos módulos donos), com links. |
| C8 | Títulos dos cartões de indicadores truncados ("Finalizado Par…", "Aguardando s…", "Alarmes ativ…"). | Indicadores ilegíveis. | Títulos em até duas linhas, em todos os módulos. |
| C9 | Dados de demonstração incoerentes: SOL-0004/OS-0002 em "Área Externa" com o GER-002 na Sala de Máquinas; OC-0008 no prédio em vez da Linha 1 do extintor. | Inconsistência entre módulos. | Locais alinhados ao cadastro da Central. |
| C10 | Descrição da ocorrência gerada por não conformidade terminava com "..". | Texto. | Pontuação normalizada. |

## Pendências conhecidas (não corrigidas nesta etapa)

- **Hipóteses provisórias**: P-01 a P-89 em `docs/decisoes-evolucao.md` continuam aguardando validação (marcadas na interface como "Provisório · P-xx").
- **Avisos (toast) no celular** aparecem sobre o cabeçalho da página por alguns segundos; não bloqueiam a ação.
- **Títulos longos** de plano ficam parcialmente encobertos pelo aviso de sucesso logo após a criação (desaparece em seguida).
- **Gestão de Riscos** segue como módulo previsto (etapa 6), dependente da Q-01.
- **Fora do escopo implementado**: edição de cadastros de Rotinas e de tipos de ocorrência, aprovação condicional da OS, abrir solicitação direto da ação do plano, consolidação de ocorrências na aba "Alertas e ocorrências" da Central e na busca global, widget "Manutenções em andamento" do Hub, botão de pânico e relatórios de Rotinas.
- **Pacote JS** acima de 500 kB (aviso do build, sem impacto na demonstração).

## Roteiros por módulo

- `docs/roteiros/etapa-5-manutencao.md`
- `docs/roteiros/etapa-5-ocorrencias.md`
- `docs/roteiros/etapa-5-planos.md`
- `docs/roteiros/etapa-5-rotinas.md`
- Etapas anteriores: `etapa-1-fundacao.md` a `etapa-4-monitor.md`.

## Percurso integrado sugerido para avaliação (≈ 20 min)

1. **Juliana (Gestor Local)** → Central → **BMB-014** → aba **Módulos GRS**: ponto de controle e ocorrência do ativo.
2. **Camila (Operador de Rotinas)** → Rotinas → **App (móvel)** → Ronda Patrimonial → **EX-0001** → não conformidade no portão → finalizar.
3. **Juliana** → Ocorrências → Consulta (origem "Não conformidade") → nova ocorrência → **Confirmar vínculo** com a OC-0005.
4. **Juliana** → Rotinas → **Reinspeções** → programar a da **OC-0009**. **Camila** executa no app (Não agendadas). **Helena (Gestor de Segurança)** vê o resultado na OC-0009 e conclui.
5. **Juliana** → **Planos de ação** → **PA-0001** → decidir a dependência cancelada. **Helena** avalia o **PA-0002** como Parcial; **Juliana** cria o plano relacionado.
6. **Juliana** → Central → **ELV-ADM-01** → Operação → **Abrir solicitação**. **Ricardo (Gestor de Manutenção)** tria, converte e planeja. **André (Técnico)** executa em **Minhas OS (móvel)** e envia. **Ricardo** encerra.
