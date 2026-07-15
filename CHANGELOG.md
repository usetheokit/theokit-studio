# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Studio Agent Builder — minimizar chat ou painel lateral na sessão (dogfood): toggles
  de ícone no header da sessão (Minimize/Restore chat e Minimize/Restore side panel,
  com aria-pressed); no máximo UM lado minimizado por vez (nunca tela vazia — minimizar
  um lado com o outro escondido troca automaticamente); o lado restante ocupa 100% e o
  splitter some enquanto minimizado (M5 dogfood)
- Studio Agent Builder — largura do chat redimensionável na sessão (dogfood): splitter
  arrastável entre o chat e o painel lateral (pointer drag + setas do teclado no
  separator focável, com aria-valuenow e clamp 25–75%); implementação própria sem
  dependência nova (M5 dogfood)
- Studio Agent Builder — painel lateral de detalhes da sessão (dogfood): default à
  direita com seções "Branch details" (Changes com contadores +A −R que abre o Review,
  Git actions como fake door honesto, "Pull request status unavailable") e "Artifacts"
  (arquivos da sessão; clicar abre o Review já filtrado no artefato); a tab Review
  ganha × para voltar aos detalhes (M5 dogfood)
- Studio Agent Builder — composer da home com a anatomia da referência (dogfood):
  linha de ações dentro do composer com "+" (fake door honesto), select de modo de
  aprovação real (Ask for approval / Auto-approve edits / Read-only), modelo + select
  de esforço (Low/Medium/High), mic (fake door honesto) e seta redonda; linha do
  projeto ABAIXO do composer (select de projeto com "New project" + select de agente
  alvo) (M5 dogfood)
- Studio Agent Builder — estrutura de app de code assistant completa (dogfood, passo a
  passo sobre as referências visuais): sidebar reordenada (título com switcher →
  New session ⌘N → Search ⌘K → navegação Skills/Scheduled/Templates → Pinned →
  Projects → Tasks), vista de Skills consumindo listSkills real (fecha o achado
  F-wire-2 do review), Scheduled/Templates com empty states honestos; sessão ganha
  work log expansível ("Worked for Xs" com passos), card "Edited N files +A −R" com
  contadores por arquivo, Undo (fake door honesto) e Review; painel Review à direita
  com tab, toolbar "Unstaged +A −R" + Commit (fake door honesto), diffs por arquivo
  com números de linha e árvore "All files" que filtra os diffs (M5 dogfood)
- Studio Agent Builder em três painéis (dogfood): sidebar de app com Search (⌘K real,
  filtra sessões), New session (⌘N) e seções Pinned/Projects/Tasks clicáveis; clicar
  numa sessão abre o chat com transcript (bolhas user/assistant, badge "Simulated
  session") e o viewer de artefato à direita (arquivo + diff unificado com linhas
  +/- coloridas); enviar da home inicia sessão roteirizada com scaffold do agente e
  follow-ups anexam ao transcript (mesma premissa dos runs roteirizados do playground);
  StudioDataSource ganha getBuilderSession() com erro tipado (M5 dogfood)
- Studio Agent Builder (dogfood): nova superfície de construção de agentes no estilo
  code-assistant — sidebar de sessões (Pinned + Recent, fixtures com atividade
  relativa), home centrada "What should we build?" com 4 cards de intenção que
  preenchem o composer (criar agente, adicionar tools, ajustar guardrails, diagnosticar
  run), composer com barra de contexto (select de agente alvo + workspace) e badge do
  modelo; envio e "New session" como fake doors honestos até o registry real;
  StudioDataSource ganha listBuilderSessions(); item "Agent Builder" no menu raiz
  (M5 dogfood)
- Studio agent chat revisado (dogfood, paridade com o chat de agente do Mastra): abas
  por agente no header (Chat ativa; Editor/Evaluate/Review/Traces como fake doors
  honestos até seus milestones), painel lateral "Memory not enabled" explicando que
  threads chegam com o theo-memory (M1), empty state centrado com avatar do agente +
  "How can I help you today?", e badge mono do modelo no composer (M5 dogfood)
- Studio Workspaces interativo (dogfood): navegar em pastas com breadcrumb clicável,
  abrir arquivo em viewer lateral (nome + Close + conteúdo mono com tamanho real),
  criar pasta (validação na fronteira: nome vazio/duplicado vira erro tipado visível)
  e refresh refazendo a chamada real ao datasource; operações agem sobre estado de
  SESSÃO do fixture datasource (nota honesta: reset no reload, workspace real chega
  com o dev server); StudioDataSource ganha readWorkspaceFile/createWorkspaceFolder
  e useListing ganha reload() (M5 dogfood)
- Studio Prompts create view (dogfood): "Create Prompt" abre a tela de criação em duas
  colunas — Configuration (Name obrigatório, Description) e Content (editor mono com
  hint de template variables), seção Variables funcional com sintaxe {{variableName}},
  validação na fronteira (nome vazio/duplicado vira erro visível) e chips removíveis;
  form 100% preenchível com fake door honesto apenas no "Create prompt block"
  (M5 dogfood)
- Studio Prompts (dogfood, tela que faltava da paridade Mastra): lista de prompt blocks
  reutilizáveis/versionados (Name | Description | Version | Used by, com filtro),
  detail read-only com o conteúdo publicado e nota honesta (edição/versionamento chegam
  com o registry real), botão Create Prompt como fake door honesto; item "Prompts" no
  menu raiz entre Agents e Workflows (ordem Mastra); StudioDataSource ganha
  listPrompts() com fixtures (M5 dogfood)
- Studio MCP tool detail (dogfood): cada tool exposta no detail do server agora é
  clicável e abre o detail com descrição, form "Input Data" derivado do input schema
  da fixture (labels + required), Submit desabilitado com nota honesta (fixtures) e
  painel de Output; botão de voltar retorna ao detail do server (M5 dogfood)

### Changed

### Deprecated

### Removed

### Fixed
- Studio (dogfood): campos de input dos details de MCP tool e Workflow agora aceitam
  digitação — o "fake door" fica só na execução (Run/Submit desabilitados com nota
  honesta em fixtures mode), consistente com o Test Message do Processors

### Security

## [0.2.0] - 2026-07-15

### Added
- Docs: blueprint técnico hands-on do Mastra Studio (engenharia reversa com instância
  local, cada aba exercitada via REST + UI real) em
  docs/mastra-studio-blueprint-clonagem-2026-07-14.md, linkado no README (M5 dogfood)
- Studio MCP Server detail (dogfood): clicar na linha abre o detail com nome + badge de
  versão, três cards de transporte (HTTP stateless, SSE real-time e CLI via
  npx mcp-remote) com endpoint copiável, e painel "Available Tools" listando o que o
  server expõe com origem por ícone (tool direta, wrapper de agente, wrapper de
  workflow); botão "All MCP servers" volta para a lista (M5 dogfood)

- Studio Processors detail (dogfood): clicar na linha abre o detail com identidade
  (nome, slug, badges das fases implementadas, "Attached to N agents"), select de Phase
  restrito às fases que o processor implementa com descrição contextual, Test Message
  editável, Run Processor desabilitado com nota honesta (fixtures) e painel de Output;
  botão "All processors" volta para a lista (M5 dogfood)
- Studio Mastra-parity screens (dogfood, tela a tela contra o Mastra Studio local):
  Workflows (lista + detail com grafo vertical de steps, painel de run honesto
  desabilitado em fixtures e recent runs), Processors (matriz de capacidades
  input/step/stream/result), MCP Servers, Tools (55 itens com filtro), Workspaces
  (file browser read-only), Request Context (editor JSON com validação na fronteira e
  save em memória), Evaluation Overview (cards de contagem) + Scorers + Datasets +
  Experiments, Metrics (métricas REAIS in-memory do dev loop — window.__STUDIO_METRICS__),
  Logs (empty state honesto) e Settings (Theme + endpoints do stack read-only);
  interface StudioDataSource ganha listProcessors/listMcpServers/listScorers/
  listDatasets/listExperiments/listWorkspaces; componente compartilhado EntityTable +
  hook useListing (DRY na 4ª repetição do boilerplate de listagem) (M5 dogfood)
- Studio design pass (dogfood): ícones lucide por superfície (dep já presente via
  @theokit/ui), logo mark violet, PageHeader com tile de ícone, topbar com breadcrumb +
  status pill, composer flutuante com seletor de agente e chip do modelo, Events com
  badges coloridos por categoria e rows numeradas, atmosfera radial Violet Forge
- Studio integration validation: jornada completa pelas 5 superfícies com prova de métricas
  dev não-zero; keys de renderização estáveis; lint preset recommended restaurado (M5 Final)
- Studio Knowledge tab: browser de collections/documents/chunks + retrieval playground com
  scores e validação de query na fronteira (M5 T4.2)
- Studio Memory tab: browser de memórias com escopo, busca e filtro sobre fixtures (M5 T4.1)
- Studio Event Inspector: timeline crua dos eventos tipados do último run com filtro por
  categoria e payload expandível (M5 T3.2)
- Studio Playground: chat com playback do stream de eventos tipados (`Run.stream()`),
  tool calls, notices de permission/rate-limit e cancelamento de runs (M5 T3.1)
- Studio Traces tab honesta: placeholder theo-lens com instrução `theokit studio up` —
  nenhuma trace UI reconstruída (invariante do produto) (M5 T4.3)
- Studio service states: ServiceGate com skeleton/offline/online por serviço e métrica de
  erro de health (graceful degradation) (M5 T2.2)
- Studio shell navegável: 5 superfícies com sidebar/breadcrumb/deep-linking, error
  boundary por rota, bootstrap defensivo com startup-error e config seam do host (M5 T2.1)
- Studio run-stream playback: roteiros tipados dos eventos reais do `@theokit/sdk` 3.4
  (`InteractionUpdate`/`RunEvent`, sem casts) + player com cancelamento (M5 T1.2)
- Studio data layer (DIP): interface `StudioDataSource` + `FixtureDataSource` com cenários
  default/empty/offline, erros tipados de fronteira e métricas dev in-memory (M5 T1.1)
- `@theokit/studio` package scaffold: Vite + React 19 + TS strict + Vitest + Tailwind v4 +
  `@theokit/ui`/`@usetheo/ui`, smoke test verde e dev server funcional (M5 T0.1)
- Roadmap amended: added M5 "Studio UX shell" — all Studio screens on fixtures, no
  integration, UX-first (`/roadmap-feature studio-ux-shell`)
- SOTA references cloned for study: `mastra-ai/mastra` (Apache-2.0, `ee/` carve-out noted)
  and `genkit-ai/genkit` (Apache-2.0) — catalog in ROADMAP § State-of-the-art references


### Changed
- Shell breadcrumb agora usa o primitive `Breadcrumb` do `@usetheo/ui@0.17.0` (bump de ^0.15.0):
  função hand-rolled deletada, `aria-current` apenas no item corrente e separadores
  `aria-hidden` — fecha a adoção do M0 do roadmap data-ui-expansion da lib. (usetheo-ui#M0)

- Studio Memory e Knowledge Base viram drill-downs com paridade total ao menu do
  theo-cloud dashboard (dogfood): Memory → Overview, Memories (real), Episodes,
  Playground, Entities, Graph, Skills, Exports, Webhooks; Knowledge Base → Overview,
  Collections (real), Connectors, Documents, Ask, Analytics; rotas movem para
  /memory/memories e /knowledge/collections com labels derivados do submenu (M5 dogfood)
- Studio IA completa Mastra-parity com sidebar drill-down no padrão theo-cloud dashboard
  (dogfood): raiz com Agents/Workflows/Processors/MCP Servers/Tools/Workspaces/Request
  Context + Data (Memory, Knowledge) + Settings; submenus Evaluation (Overview, Scorers,
  Datasets, Experiments) e Observability (Events, Metrics, Traces, Logs) com back button
  e slide; superfícies não implementadas ganham placeholder honesto "Planned"; rotas
  novas /agents e /observability/* com redirects dos paths antigos (/playground, /events,
  /traces); copy PT restante do empty-state de Events traduzido (M5 dogfood)
- Studio Playground agora é agents-first (paridade com Mastra Studio, dogfood): a entrada
  é a lista de agentes (tabela Name | Description | Model com filtro) e o chat abre ao
  clicar na linha, com header do agente e botão "All agents" para voltar (M5 dogfood)

- Studio: todo o copy da UI e das fixtures padronizado em inglês (produto é English-first;
  strings PT destoavam) — testes atualizados junto
- Studio: selects nativos substituídos pelo `Select` (Radix) do design system no seletor
  de agente, filtro de categoria (Events) e filtro de escopo (Memory)
- `code-quality`: linguagem `typescript` habilitada (primeiro pacote TS do monorepo — M5)


### Fixed
- Review dogfood (batch): export morto `getSavedRequestContext` removido e copy do save
  do Request Context honesto (nada consome o valor em fixtures); campo `implemented`
  removido de `SurfaceMeta` (fonte dupla de verdade com o mapa de rotas); Playground
  migrado para `EntityTable`/`useListing` compartilhados (fork manual eliminado);
  flake da suíte completa corrigido (`asyncUtilTimeout` 5s + `testTimeout` 15s);
  `CopyField` mostra "Copy failed" visível em falha de clipboard (antes no-op
  silencioso); status de run de workflow legível por screen reader (sr-only);
  `aria-current="page"` no item ativo da sidebar; EntityTable distingue registry vazio
  de filtro sem match (`noItemsText`) e Workspaces ganha empty state; últimas strings
  de erro PT traduzidas (datasource/run-log/bootstrap); seções duplicadas do
  `[Unreleased]` reagrupadas na ordem canônica; testes novos: cenário empty
  (workflows/workspaces), rejeição de datasource visível (useListing), copy
  sucesso/falha (MCP) e redirect legado /traces
- Studio: cursor pointer em componentes clicáveis (regressão da troca p/ pipeline Tailwind
  único — o preflight v4 não estiliza cursor de controles; not-allowed em desabilitados)
- Studio UI sem estilo (dogfood): root-cause era ordem de cascade layers — o
  `tokens-v4.css` do design system abre `@layer utilities` antes do statement canônico,
  fazendo o preflight (`* { padding: 0 }`) vencer todas as utilities; corrigido declarando
  `@layer properties, theme, base, components, utilities;` como primeira linha do
  entrypoint CSS + pipeline Tailwind único (sem styles.css pré-buildado) + preset e
  content scan por realpath (o scanner do Tailwind v4 não segue symlinks do pnpm)
- `review`: `consolidate_findings.py` só descobria findings `*.yml` e dropava
  silenciosamente os `*.yaml` dos agentes — o report consolidado saía READY_TO_MERGE com
  0 findings; agora descobre ambas as extensões (regression test adicionado; achado
  durante o review do M5)
- Review M5 (batch): ciclo de import routes↔shell quebrado via `nav-items.ts`; tipos de
  evento movidos para o domínio (`data/types.ts`); send durante run ativo habilitado
  (contrato do plano — novo send aborta o anterior); erro de stream vira notice visível e
  reabilita o send; erros de datasource tratados na fronteira das páginas; collection
  inexistente rejeita em todos os cenários; métrica de query conta chamadas rejeitadas;
  dead export `RUN_SCRIPTS` removido; `check_wiring.py` enxerga testes de integração
  escopados por pacote (monorepo)
- `plan-confidence` checker: `_scan_blueprint_refs` não resolvia blueprints no layout
  plugin-install (`.claude/knowledge-base/...`), marcando toda citação `Blueprint §"X"`
  como fabricada; regression test adicionado (achado durante o plan do M5)
- `discover-plan-confidence` scorer: `_parse_thresholds` ignorava o formato documentado
  `band.<name> = <valor>` de `rules/discover-plan-thresholds.txt` (só aceitava `NAME | valor`),
  produzindo verdict INVALID incondicional; regression test adicionado (achado durante o
  discover do M5)

## [0.1.0] - 2026-07-14

### Added
- Repository founded: README, CLAUDE.md contract, ROADMAP (M0–M4), architecture proposal and
  verified competitive deep-research under `docs/` (bootstrap, no issue ref yet)

