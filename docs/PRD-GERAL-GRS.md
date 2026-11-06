# PRD Geral — Plataforma GRS (Gestão de Riscos e Operações)

**Status:** consolidação da visão e dos requisitos de produto.  
**Persona principal:** Gestor de Segurança.  
**Posicionamento:** “Da portaria ao chão de fábrica. Uma operação mais conectada, segura e previsível.”

## 1. Visão
Conectar pessoas, ativos, ambientes e processos em uma experiência integrada de Gestão de Riscos e Operações, permitindo antecipar riscos, coordenar respostas e comprovar o controle operacional.

## 2. Problema e proposta de valor
Informações e processos de acesso, CFTV, alarmes, sensores, manutenção, inspeções e ocorrências são frequentemente fragmentados. A plataforma conecta esses domínios, transforma dados em contexto, eventos em ações e ações em evidências, sem substituir BMS, CMMS, ERP ou supervisórios.

**Ciclo de valor:** Identificar → Monitorar → Contextualizar → Acionar → Executar → Comprovar → Aprimorar.  
**Pilares:** Conectar; Compreender; Agir; Comprovar e evoluir.

## 3. Usuários
Gestor de Segurança (principal), Gestores de TI, RH, Facilities, gestor local, gestor de manutenção, técnico, operador de rotinas, consultor de implantação e suporte técnico.

Perfis demonstrativos iniciais: Administrador Corporativo, Gestor Local, Gestor de Segurança, Gestor de Manutenção, Técnico e Operador de Rotinas. Perfis de acesso são independentes dos perfis comerciais Essencial, Operacional, Integrado e Personalizado.

## 4. Portfólio e limites de domínio
| Produto | Responsabilidade |
|---|---|
| Security Hub | Consciência situacional, monitoramento de segurança, contextualização, correlação e orquestração |
| Central de Ativos e Ambientes | Identidade mestre, locais, classificação, grupos, relacionamentos e visão 360º |
| Monitor de Infraestrutura | Descoberta, conectividade, telemetria, saúde dos dispositivos e regras |
| Controle de Acesso | Pessoas, permissões e eventos de acesso |
| Gestão de Rotinas | Planos de rotina, rotinas, checklists, pontos de controle e evidências |
| Gestão de Manutenção | Solicitações, OS, planejamento e execução |
| Gestão de Ocorrências | Registro, tratamento, planos de ação e acompanhamento |
| Gestão de Riscos | Avaliação estruturada de riscos e controles |
| Gestão de Terceiros | Documentos, habilitações e conformidade; fora do escopo inicial do protótipo |

Cada produto especialista mantém seus dados e regras. A experiência integrada consulta e inicia ações por contratos, sem absorver a lógica do domínio. A Central não vira CMMS; Security Hub não vira dashboard genérico; Monitor não assume cadastro mestre de ativos.

## 5. Princípios transversais
1. Identidade compartilhada para ativos, locais e pessoas; evitar cadastros mestres duplicados.
2. Cada produto mantém a propriedade do seu domínio.
3. Integração por APIs/eventos e contratos explícitos.
4. Permissões e escopo aplicados a navegação, busca, indicadores, detalhes e ações.
5. Alterações relevantes rastreáveis.
6. Compartilhamento de dados não dispara ações automaticamente; o módulo consumidor precisa configurar sua reação.
7. Dados e integrações simulados devem ser identificados como demonstração no protótipo.

## 6. Navegação e experiência global
Sidebar persistente e recolhível:
1. Security Hub
2. Central de Ativos e Ambientes
3. Monitor de Infraestrutura
4. Gestão de Rotinas
5. Gestão de Manutenção
6. Gestão de Ocorrências
7. Gestão de Riscos

Controle de Acesso não terá área própria na sidebar na primeira versão do protótipo; será fonte integrada de pessoas, permissões e eventos. Módulos não contratados podem aparecer bloqueados para descoberta comercial, sem expor dados operacionais.

Cabeçalho global: cliente/empresa, localização/unidade contextual, busca global, notificações, perfil/configurações.

Busca global: ativos/dispositivos, pessoas, locais, eventos/alertas, ocorrências e solicitações/OS. Respeitar permissões e abrir o domínio correto com contexto.

Notificações compartilhadas: filtros por módulo, tipo, localização e status; categorias não lidas, todas e importantes. Ler notificação é diferente de reconhecer ou resolver evento. Críticas aparecem imediatamente; ordinárias ficam na central.

## 7. Localização e dados compartilhados
Localização é uma entidade hierárquica única (ex.: Unidade → Prédio → Setor → Sala). Estrutura organizacional é separada e mapeada explicitamente. Todo ativo tem localização principal obrigatória. Locais atendidos/afetados são relacionamentos diferentes da localização física.

Distinções:
- Ativo: objeto físico ou lógico relevante.
- Dispositivo: equipamento que se comunica.
- Ponto de dados: variável/propriedade/sinal.
- Conexão: mecanismo/protocolo de comunicação.

Um ativo pode ter vários dispositivos; dispositivo pode também ser ativo; dispositivo pode fornecer vários pontos de dados.

## 8. Security Hub e dashboard
Security Hub é a experiência inicial após login e permanece centrado em segurança. O dashboard apoia decisões, priorizando fila de ações, impacto e contexto; detalhes técnicos ficam no drill-down.

Quatro áreas: resumo de segurança, eventos em destaque, mapa operacional expansível e ações pendentes.

Catálogo de 17 widgets:
- Segurança (5): acessos em tempo real; eventos e alertas; câmeras em destaque; alarmes ativos; ocorrências abertas.
- Operação integrada (6): mapa operacional; ativos críticos; saúde da infraestrutura; alertas de telemetria; manutenções em andamento; inspeções e rotinas pendentes.
- Gestão (6): indicadores gerais de segurança; ocorrências por status; ações pendentes; tempo médio de resposta; histórico de eventos relevantes; situação operacional por localização.

Cliente define layout padrão; usuário pode personalizar. Mudança no padrão não sobrescreve painéis já personalizados. Edição inclui catálogo, adicionar/remover, arrastar/redimensionar, pré-visualizar, salvar/cancelar. Widgets podem configurar período, local, criticidade, quantidade e atualização, quando aplicável. Clique abre detalhe contextualizado.

## 9. Estratégia comercial e fases
Estratégia land-and-expand, partindo da base de Security Hub/Controle de Acesso e expandindo conforme necessidade para infraestrutura, rotinas, manutenção, riscos e ocorrências. Não há sequência comercial obrigatória.

Fases:
1. Fundação: Central de Ativos e Ambientes.
2. Operação: Manutenção e Rotinas.
3. Inteligência: Monitoramento, Telemetria e Regras.
4. Risco: Gestão de Riscos e evolução de Ocorrências.

## 10. Métricas
Adoção de múltiplos produtos; produtos GRS por cliente sobre a mesma base de ativos; completude de localização/classificação; dispositivos descobertos e incorporados; duplicidades evitadas; tempo de cadastro/configuração; percentual de dispositivos conectados; uso e conclusão de jornadas integradas; tempo de resposta a eventos relevantes. Metas/baselines: **A definir**.

## 11. Escopo do protótipo
Aplicação única, navegação real, formulários/filtros/estados funcionais, persistência simulada, cenários integrados ponta a ponta, desktop-first responsivo e experiência móvel demonstrativa para Rotinas. Importação em lote e descoberta simuladas com revisão e confirmação humana. Identidade Senior modernizada, inspirada no Senior X.

## 12. Fora do escopo inicial
Backend produtivo, integrações reais com dispositivos, arquitetura técnica definitiva, Gestão de Terceiros e substituição de sistemas especialistas.

## 13. Critérios gerais de aceite
Navegação consistente e contextual; permissões em todas as camadas da experiência; entidades compartilhadas sem duplicação; domínios especialistas preservados; jornadas demonstrativas executáveis; dados simulados identificados; lacunas não preenchidas por suposição.

## 14. A definir
Matriz detalhada de permissões; metas; contratos API/eventos; arquitetura técnica e segurança; retenção/auditoria; composição comercial, limites e preços.
