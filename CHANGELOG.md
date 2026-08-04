# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed
- Definition of done de M1, M2 e M3 reconciliado com o escopo entregue: M1 fica exercitável (5 critérios reescritos em torno do Agent Builder), M2 e M3 ficam registrados como cancelados com data e razão em vez de exigir telas que não existem (#M7)
- README descreve o Agent Builder como a única superfície entregue e declara, com o SHA do commit que a causou, que playground, traces, memory e knowledge foram removidos — quem precisa dessas telas deve fixar `v0.3.0` (#M7)

### Deprecated

### Removed
- Quatro contadores que nunca eram emitidos saem de `window.__STUDIO_METRICS__`: `stream_events_played_total`, `health_errors_total`, `unknown_events_total` e `reflection_chunks_dropped_total`. Eles apareciam zerados para sempre, e um zero permanente lê-se como "não houve erro" quando o fato era "ninguém contava" (#M7)
- `scenario: "offline"` deixa de ser um valor de configuração aceito. Ele passava pela validação e não fazia nada — nenhum código o distinguia de `"default"`. Agora é rejeitado como qualquer valor inválido: aviso no console nomeando o valor e queda para `"default"` (#M7)

### Fixed

### Security

## [0.4.1] - 2026-08-04

### Fixed
- Cobertura de branch de `plugin/http.ts` volta a 100%: o guard que impede escrita numa resposta
  já encerrada não tinha teste. Achado pela aceitação da v0.4.0, que mediu 90% contra o critério
  de 100% declarado no ROADMAP (#m6)

## [0.4.0] - 2026-08-04

### Added
- Roadmap amended: added M6 Plugin hardening (blockers da code review)
  (`/roadmap-feature plugin-hardening`)
- Roadmap amended: added M7 Reconciliação de documentação e superfície morta
  (`/roadmap-feature docs-dead-surface-reconciliation`)
- Roadmap amended: added M8 Qualidade da suíte e manutenibilidade
  (`/roadmap-feature test-quality-maintainability`)
- Script `dev` na raiz do monorepo — `npm run dev` (ou `pnpm dev`) sobe o TheoKit Studio
  (delegando ao pacote `@theokit/studio`) em `http://localhost:5173/`, com a reflection
  API do M1 montada na mesma origem (`/_studio/api/*`)


### Changed
- Allowlist de dependências recebe GHSA-qwww-vcr4-c8h2 (`react-router`, HIGH) com sunset em
  2026-11-02: o CVE é específico do RSC Mode, que esta SPA não usa (verificado por varredura em
  `packages/studio/src`), e a correção exige bump MAJOR `7.x → 8.x` fora do escopo do M6.
  Justificativa completa em `knowledge-base/adrs/0001-react-router-rsc-csrf-allowlist.md` (#m6)
- **BREAKING: o Studio passa a ter uma única interface — o Agent Builder.** A tela abre em
  tela cheia em `/builder`, a raiz `/` redireciona para ela e qualquer outro endereço
  responde "Page not found". Quem abria o Studio para o playground, traces, memória ou
  base de conhecimento deixa de encontrar essas telas (#studio-builder-only)
- O contrato de dados do Studio (`StudioDataSource`) foi reduzido ao que o Builder consome:
  agentes, skills e sessões de build. Em `mode: "live"` os agentes e skills continuam vindo
  da reflection do dev server; as sessões de build seguem em fixtures roteirizados
  (#studio-builder-only)
- O rótulo de origem dos dados ("Fixtures mode" / "Live reflection") migrou do rodapé do
  shell removido para o rodapé da barra lateral do Builder — a informação continua visível
  em toda a sessão (#studio-builder-only)
- Builder agora consome componentes do `@theokit/ui` para as superfícies de agente com
  paridade visual 1:1 (mesma experiência — sem diff perceptível): `ModelEffortPicker`
  (model picker do composer), `ApprovalModeSelector` (modo de aprovação inline),
  `CodeReviewPanel` (painel Review com diffs por arquivo + árvore) e `WorkLog` ("Worked
  for …" expansível). O shell do Builder (form do composer, splitter, roteamento, painel
  de detalhes) permanece no Studio, orquestrando os componentes da lib (#builder-ui-migration)
- Builder adota mais dois componentes do `@theokit/ui@1.2.0` com paridade visual 0-diff:
  `IntentSelector layout="tiles"` no lugar do grid manual de intents (as 4 cores por tile —
  sky/violet/emerald/amber — preservadas via a nova prop `tileClassName`), e `SessionListItem`
  nas listas de sessões da sidebar (Pinned + Tasks). Bump `@theokit/ui` para `^1.2.0`.
  `EditedFilesCard` e os composers (home + follow-up) permanecem no shell do Studio: o
  `CreatedFilesCard` da lib renderiza cada arquivo como mini-card com ícone (o Studio usa
  lista simples) e o `ChatComposer` tem `border-t` na action row + sombras próprias — migrar
  quebraria o 0-diff; as props do 1.2.0 (`headerAggregate`/`ctaPlacement`, `submitIcon`/`submitLabel`)
  cobrem header e submit, mas não a lista de arquivos nem a moldura (#builder-ui-migration)


### Removed
- As 20 telas do Studio que não eram o Builder: Agents (playground), Prompts, Workflows,
  Processors, MCP Servers, Tools, Workspaces, Request Context, Evaluation (visão geral,
  scorers, datasets, experiments), Observability (events, metrics, traces, logs), Memory,
  Knowledge e Settings — com seus fixtures e testes (#studio-builder-only)
- A navegação do Studio (barra lateral com drill-down, breadcrumb e cabeçalho de página) e
  os utilitários que só ela e as telas removidas usavam (#studio-builder-only)
- O cliente de streaming de execução no lado da SPA: o Studio não executa mais agentes pela
  interface. O endpoint `/_studio/api/agents/*/run` do plugin `@theokit/studio/plugin`
  permanece intacto, publicado e coberto pelos próprios testes (#studio-builder-only)
- `packages/studio/src/pages/builder/model-picker.tsx` — substituído pelo `ModelEffortPicker`
  do `@theokit/ui` (mesma anatomia: nome amigável + esforço num só controle) (#builder-ui-migration)
- `ReviewPanel` / `FileDiff` / `parseDiff` de `builder/review.tsx` — substituídos pelo
  `CodeReviewPanel` do `@theokit/ui` (o `DetailsPanel`, composição do Studio, permanece) (#builder-ui-migration)


### Fixed
- **O dev server do host não morre mais por causa de um asset ilegível.** O helper de erro do
  plugin (`sendErrorEnvelope`) verificava se a resposta havia terminado, mas não se o cabeçalho
  já tinha sido enviado; combinado com a leitura do arquivo feita *depois* do `writeHead(200)`,
  um `EACCES` determinístico virava `ERR_HTTP_HEADERS_SENT` dentro de um `.catch()` e encerrava
  o processo. Agora o arquivo é lido antes de comprometer o cabeçalho e, quando a resposta já
  começou, o erro é entregue **no corpo** em vez de a conexão morrer calada (#m6)
- Uma resposta de sucesso pedida depois que o cabeçalho já foi enviado agora **encerra** a
  requisição com um aviso, em vez de deixá-la pendurada aberta. A correção anterior trocava o
  crash ruidoso por um travamento silencioso — o cliente esperava para sempre (#m6)
- `/_studio/index.html` volta a entregar a mesma página que `/_studio`. Antes, o caminho
  explícito era servido como arquivo estático cru — sem a configuração injetada — e o Studio
  bootava em modo fixtures nele enquanto bootava em modo real na raiz: dois produtos diferentes
  dependendo de como se digitava a URL (#m6)
- `/_studio/svc/{lens,memory,rag}/*` responde 404 com envelope tipado em vez de devolver o HTML
  da SPA. O comportamento anterior dependia da extensão da URL: `.../query` devolvia HTML 200 e
  `.../index.json` devolvia 404 JSON — duas respostas para o mesmo namespace de contrato (#m6)
- A varredura de agents degrada por diretório: uma subpasta ilegível é pulada com aviso nomeando
  o caminho, em vez de derrubar a reflection inteira e o endpoint de run junto (#m6)
- O Studio no browser volta a mostrar o erro real do dev server: o cliente reconstrói o erro a
  partir do envelope `{error:{code,message}}` que o servidor já enviava e antes era descartado
  em favor de uma mensagem genérica derivada do status HTTP (#m6)
- Restaurado `packages/studio/src/pages/builder/model-picker.tsx` que foi removido por
  engano num commit de release (a deleção estava staged pela sessão paralela M7, mas a
  edição correspondente do builder ainda não commitada deixava o HEAD importando um módulo
  inexistente); o arquivo volta à versão consistente para o HEAD compilar


### Security
- Corrigidas 6 vulnerabilidades em dependências transitivas via `pnpm.overrides`, apuradas por
  `osv-scanner`: `brace-expansion` (GHSA-mh99-v99m-4gvg e GHSA-rgw5-rvv9-x895, HIGH — negação de
  serviço por expansão ilimitada), `postcss` (GHSA-fxqj-rqcc-2cmp, MODERATE — leitura de arquivo
  via `sourceMappingURL`) e `esbuild` (GHSA-g7r4-m6w7-qqqr, LOW — dev server no Windows).
  Suíte, typecheck e build re-validados verdes após a mudança (#m6)

## [0.3.0] - 2026-07-15

### Added
- M1 T4.1 (parcial) — guia de integração `docs/theokit-dev-integration.md` com o diff exato
  (dependência + `plugins.push(theokitStudio())` + smoke test) para montar o plugin no
  `theokit dev`; o commit cross-repo no `theokit` fica pendente de coordenação (feature em
  voo lá) e da publicação do pacote — rastreado em theokit#133 (#m1)
- M1 T3.2 — e2e `studio_e2e_reflection_and_run` (oráculo do Goal): sobe o `theokit dev`
  real na fixture demo-project e valida a cadeia inteira — health, reflection dos agents
  com tools, SPA em `/_studio` com config injetado, e run streamando NDJSON (toda linha
  com `kind`, ≥1 `message`, última `done`) — a prova de que o M1 funciona ponta a ponta (#m1)
- M1 T3.1 — Studio em live mode: `ReflectionDataSource` troca o adapter de fixtures pelo
  real via o seam DIP do M5 — agents/tools/skills/workflows/health vêm da reflection do
  dev server e o chat do playground roda o agent DE VERDADE (stream NDJSON traduzido para
  o vocabulário de eventos da UI; conversa multi-turn com sessão estável por agent; abort
  cancela o stream); superfícies fora da reflection seguem nas fixtures rotuladas; banner
  do shell distingue "Live reflection" de "Fixtures mode"; health mostra o dev server
  (novo serviço "studio") e os serviços theo-data offline com `theokit studio up` até
  M2/M3; params de geração do painel são ignorados com aviso (sem destino no endpoint
  live ainda); erro do stream vira mensagem tipada visível (#m1)
- M1 T2.2 — SPA servida pelo plugin em `/_studio`: assets do dist embarcado (content-type
  correto; query de cache-busting ignorada) + fallback SPA para deep-links (index.html com
  `window.__STUDIO_CONFIG__` injetado — mode/basePath — escapado contra script-breakout e
  nunca cacheado); path traversal bloqueado (decode único, null byte e `..` rejeitados —
  nada fora do root é lido); dist ausente → 503 com instrução de build; dir da SPA
  resolvido do pacote com override `THEOKIT_STUDIO_DIST` sempre honrado (#m1)
- M1 T2.1 — SPA embarcável: build da SPA com assets relativos (`base './'`) em `dist/spa`
  (o rebuild da SPA preserva `dist/plugin` — pacote publica os dois artefatos); router
  aceita `basePath` (SPA funciona servida sob `/_studio`); `window.__STUDIO_CONFIG__`
  ganha `mode` ("fixtures"|"live") e `basePath` com validação defensiva por campo (shape
  M5 `{scenario}` continua válido; campo inválido → warn agregado 1× + fallback; basePath
  normalizado com barra inicial e sem trailing) (#m1)
- M1 T1.4 — run endpoint do playground: `POST /_studio/api/agents/{name}/run` streama a
  resposta do agent como NDJSON (`{kind: message|done|error}` — uma linha JSON por evento;
  `run-event` reservado até o bridge expor o seam, theokit#132); mesma origem obrigatória
  ANTES de qualquer trabalho (um run gasta tokens reais; `Origin: null`/malformado → 403);
  `sessionId` do body preservado para conversa multi-turn (ausente → UUID por request);
  sem API key de provider → 424 nomeando `OPENROUTER_/OPENAI_/ANTHROPIC_API_KEY` (mesma
  prioridade do theokit dev); agent inexistente → 404; módulo inválido → 422; erro
  mid-stream vira linha `error` tipada (nunca `done` depois de erro); disconnect do
  cliente aborta o run (AbortSignal propagado, zero writes pós-close) (#m1)
- M1 T1.3 — endpoints agregados da reflection: `GET /_studio/api/tools` (dedup por nome com
  `usedBy` contando agents; primeira descrição vence; ordenado), `GET /_studio/api/workflows`
  (subagents declarados com `source: "subagent"` e nota honesta citando o gap theokit-sdk#123)
  e `GET /_studio/api/skills` (convenção `.theokit/skills/<name>/SKILL.md` via `discoverSkills`
  do SDK; skills malformadas listadas em `invalid`, nunca puladas em silêncio; degradação
  honesta em falha do discover); agents agora expõem `skills {enabled?, autoInject?}` por
  agent (enabled ausente = todas — distinção preservada) (#m1)
- M1 T1.2 — reflection de agents no plugin: `GET /_studio/api/agents` enumera os agents do
  projeto (scan da convenção theokit `agents/<name>.ts` — espelho testado do fonte — +
  `compileAgentModule` do `@theokit/agents/bridge` via `ssrLoadModule`, sem manifest e sem
  cache: hot-reload nativo); metadados por agent (model, tools name+descrição, subagents);
  módulo quebrado ou travado no import degrada SÓ aquele item com a mensagem real (timeout
  10s configurável); sem `agents/` → lista vazia com hint honesto (#m1)
- M1 T1.1 — plugin Vite `@theokit/studio/plugin` (skeleton): `theokitStudio()` registra o
  middleware do Studio no dev server (connect via `configureServer`); `GET /_studio/api/health`
  responde `{ok, studio: versão}`; envelope de erro tipado `{error:{code,message}}` para rotas
  desconhecidas; requests fora de `/_studio` passam intocados (boundary estrita, pathname-only
  — query strings não afetam o match); build node via tsup (`dist/plugin`, export `./plugin`);
  montado no dev do próprio Studio (dogfood); teste de integração com Vite server real (#m1)
- M1 plan: `m1-studio-table-stakes` v1.2 (plan-confidence SHIPPABLE 97.6) — plugin Vite
  `@theokit/studio/plugin` (reflection API + run NDJSON + static `/_studio`), SPA
  embarcável com `base './'`, `ReflectionDataSource` híbrido honesto e wiring
  cross-repo no theokit dev; edge-cases (4 MUST FIX absorvidos) e deps-audit
  PASS_WITH_CAVEATS (0 CVEs) (#m1)
- M1 discovery: blueprint `m1-studio-table-stakes` (verdict SHIPPABLE 100.0) mapeando
  reflection endpoint + SPA `/_studio` — prior art Genkit/Mastra + superfície real do
  `theokit dev` (vite-plugin middlewares) e `@theokit/sdk` 3.8.0 (`Agent.list()`,
  `run.stream()`, 9 RunEvents tipados); gaps de enumeração de tools/workflows
  reportados em theokit-sdk#123 (#m1)
- Studio Agent Builder — model picker refinado no composer (dogfood): o badge mono cru
  "claude-fable-5" + select solto de esforço viram um só controle elegante (tile
  Sparkles + nome amigável "Fable 5 · Medium" + chevron) sobre o DropdownMenu do
  design system, com seção Model (4 opções com nome amigável, descrição e id mono,
  radio no ativo) e seção Reasoning effort (Low/Medium/High) (M5 dogfood)
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
- M1 — peer de `vite` do plugin relaxado de `>=7 <9` para `>=6 <9`: o consumidor
  pretendido (`theokit dev`) está em Vite 6 e o middleware connect do plugin
  (`configureServer`/`server.middlewares.use`/`ssrLoadModule`) é idêntico em Vite 5/6/7 —
  o range anterior embutia uma incompatibilidade conhecida com o único host real (#m1)



### Fixed
- Review builder (batch): gate canônico `pnpm run check` restaurado (suppressions
  reposicionados no builder/use-listing, key composta nas linhas de diff, label do
  Phase ligado ao select do Processors); síntese da sessão roteirizada movida para o
  datasource (`startBuilderSession` no contrato DIP com erro tipado de prompt vazio,
  métrica contada e ids únicos de draft); builder/index.tsx (1145 LoC) extraído em
  módulos (model-picker, review, session-view); `key` por sessão zera estado do
  painel ao trocar de sessão; foco devolvido ao fechar Review/viewer/cancelar pasta
  (a11y); nome de pasta com "/" rejeitado na fronteira; aria-label do model picker
  anuncia a seleção; testes novos: negativos de getBuilderSession/startBuilderSession,
  loadError visível em Prompts/Builder/Workspaces, cenário empty do builder e
  validação de "/"; formatação canônica do biome aplicada também aos arquivos do
  delta M7 (events/playground) para manter o gate da raiz verde (M5 dogfood)
- Studio (dogfood): campos de input dos details de MCP tool e Workflow agora aceitam
  digitação — o "fake door" fica só na execução (Run/Submit desabilitados com nota
  honesta em fixtures mode), consistente com o Test Message do Processors

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

