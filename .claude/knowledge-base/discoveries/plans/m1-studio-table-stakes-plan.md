# Discovery Plan: M1 Studio Table-Stakes — Reflection Endpoint + SPA em `/_studio`

> **Version 1.1** (v1.0 + MUST FIX/checkpoints do edge-case review de 2026-07-15) — Investiga como Genkit e Mastra implementam o par "reflection endpoint no dev server + SPA de playground servida em rota dedicada" (registry vivo sem manifest, chat playground com streaming de eventos tipados, graceful degradation), e mapeia a superfície REAL do ecossistema vivo (`theokit` CLI vite-plugin/devtools e `@theokit/sdk` 3.x registry + `Run.stream()`) onde o M1 se integra. O blueprint resultante alimenta o `/to-plan` do milestone M1.

**Slug:** `m1-studio-table-stakes`
**Owner:** paulohenriquevn
**Created:** 2026-07-15
**Time budget:** 8h (breakdown no ADR D1)

## Context

O ROADMAP.md § M1 exige: (a) reflection endpoint no dev server expondo o registry vivo de `@theokit/sdk` (agents/tools/skills/workflows) — sem manifest estático (invariante 1 do CLAUDE.md do projeto, "Reflection over manifest", lição do LangGraph); (b) Studio SPA servida em `/_studio` same-origin (invariante 2, "Dev server is the gateway"); (c) chat playground contra qualquer agente registrado com event inspector renderizando eventos tipados de `Run.stream()` ao vivo; (d) funcionamento com Docker ausente (invariante 4, "Graceful degradation").

O M5 (Studio UX shell) foi entregue com todas as telas sobre `StudioDataSource` fixtures via DIP (`rules/architecture.md § 2` — o domínio define a interface, o adapter implementa). O M1 é exatamente a troca do adapter de fixtures por um adapter real — mas o lado servidor (reflection endpoint + serving da SPA) nunca foi investigado a fundo. Os docs existentes (`docs/theokit-studio-arquitetura-proposta.md`, `docs/studio-deep-research-2026-07-14.md`) declaram o padrão em alto nível; nenhum desceu ao nível de código de como Genkit/Mastra implementam, nem auditou a superfície atual do `theokit` CLI (que já possui um subsistema `devtools` com vite-plugin — descoberta da varredura preliminar) e do `@theokit/sdk` 3.x (que possui `src/server/`, `types/run-events.ts`, `theokit.ts`).

Riscos declarados no ROADMAP § M1 que este discovery precisa responder: "dev-server integration surface in `theokit` (Vite plugin vs server route)" e "SDK 3.x adoption ahead of the rest of the cluster".

## Objective

Produzir um blueprint que permita decidir **como implementar o reflection endpoint e o serving da SPA `/_studio` dentro da superfície existente do `theokit dev`**, com o contrato de streaming de eventos tipados do playground definido a partir do que `@theokit/sdk` 3.x realmente exporta hoje.

- [ ] Todas as research questions respondidas com citações a `.claude/knowledge-base/references/` (mastra, genkit) e caminhos reais dos repos vivos (`../theokit`, `../theokit-sdk`)
- [ ] Tabela comparativa Genkit × Mastra × theokit-atual para: descoberta de registry, rota da SPA, transporte de streaming, graceful degradation
- [ ] Seção de recomendações com ≥ 1 proposta de decisão concreta por research question
- [ ] Verdict `/discover-confidence` ≥ SHIPPABLE_WITH_CAVEATS

## In-Scope / Out-of-Scope

### In-Scope (per reference project)

| Project | In-scope subdirectories | Reason |
|---|---|---|
| `.claude/knowledge-base/references/genkit/` | `js/core/src/` (reflection.ts, reflection-v2.ts, reflection-types.ts, registry.ts), `js/core/tests/`, `docs/reflection-v2-protocol.md`, `genkit-tools/cli/`, `genkit-tools/common/`, `genkit-tools/reflectionApi.yaml` | Genkit é O padrão canônico de reflection API citado no CLAUDE.md do projeto; tem protocolo documentado + spec OpenAPI |
| `.claude/knowledge-base/references/mastra/` | `packages/deployer/src/server/` (handlers, index.ts, openapi.json), `packages/cli/src/commands/`, `packages/playground/`, `packages/playground-ui/` (estrutura apenas) | Mastra é o análogo direto do Studio (mesma categoria de produto); serve SPA + API no mesmo dev server |
| `../theokit/packages/theo/` (repo vivo, read-only) | `src/vite-plugin/` (inject-devtools.ts, agent-middleware.ts, configure-server-hook.ts, api-middleware.ts, index.ts), `src/devtools/` (server-side/, bridge/, index.ts), `tests/unit/cli-dev.test.ts`, `tests/unit/devtools-*.test.ts` | É a superfície de integração REAL do M1 — decide "Vite plugin vs server route" (risco nº 1 do ROADMAP) |
| `../theokit-sdk/packages/sdk/` (repo vivo, read-only) | `src/theokit.ts`, `src/agent.ts`, `src/types/run-events.ts`, `src/types/run.ts`, `src/server/`, `src/index.ts` (exports públicos), `package.json` | Define o que o reflection endpoint consegue enumerar e o shape dos eventos que o playground streama (risco nº 2 do ROADMAP) |

### Out-of-Scope (explicit)

| Project / Subdir | Why excluded |
|---|---|
| `.claude/knowledge-base/references/mastra/packages/**/ee/` e qualquer diretório `ee/` | Carve-out de licença comercial — NUNCA ler/portar (fronteira de IP estabelecida no projeto) |
| `.claude/knowledge-base/references/mastra/packages/playground-ui/src/**` (leitura de implementação de componentes) | Studio já tem UI própria (M5, @theokit/ui); só a ESTRUTURA de rotas/build interessa, não componentes |
| `.claude/knowledge-base/references/genkit/go/`, `genkit/py/` (se existir) | Studio é TS-only; a reflection API JS é a referência |
| `.claude/knowledge-base/references/*/node_modules/`, `dist/`, `build/` | Artefatos de build |
| `../theokit/packages/theo/dist/` | Artefato de build; fonte é `src/` |
| theo-lens / theo-memory / theo-rag (theo-data) | M1 explicitamente não requer Docker/serviços; tabs service-backed são M2/M3 |
| Google ADK Web | Não clonado em `references/`; Cross-Project Rule proíbe afirmar features sem ler o fonte. Genkit + Mastra cobrem ≥ 2 referências independentes (gate do cycle-discover) |

## ADRs

### D1 — Time budget + stop conditions

**Decision:** genkit: 2h · mastra: 2.5h · `../theokit`: 2h · `../theokit-sdk`: 1.5h. Total 8h.

**Rationale:** Mastra recebe o maior budget por ser o análogo de produto completo (server + SPA + playground). Genkit tem protocolo documentado (`docs/reflection-v2-protocol.md` + OpenAPI yaml), então a leitura é mais dirigida. Os repos vivos são menores em escopo (superfícies específicas já localizadas na varredura preliminar).

**Alternatives considered:** split igual (ignora assimetria de documentação); deep-dive único no mastra (perderia o protocolo formal do genkit e a superfície real de integração).

**Stop condition — per question (mandatory):** Quando a Fase A de uma questão retornar vazio após 3 variantes de query (pattern → kind-based → caminho alternativo → escopo mais amplo), marcar a questão BLOCKED com razão "Fase A exhausted — no hotspots found" e seguir para a próxima. NÃO preencher com hotspots de outra questão.

**Stop condition — per project (mandatory):** Budget do projeto esgotado com questões pendentes → marcar todas as restantes daquele projeto BLOCKED com razão "budget exhausted" e avançar. Se todos os projetos restantes estiverem nesse estado, emitir `<promise>BLUEPRINT_BLOCKED</promise>` (nunca `BLUEPRINT_COMPLETE` com questões bloqueadas).

**Anti-pattern:** NUNCA fabricar respostas de Fase B para fechar questão com Fase A esgotada (Unbreakable Rule 3).

**Consequences:** blocked questions viram seed do próximo discovery; o blueprint as lista explicitamente.

### D2 — Investigation depth

**Decision:** Fase A por ast-grep/Grep para mapear hotspots; Fase B lê cada hotspot integralmente (arquivo inteiro quando ≤ 400 linhas, senão a seção relevante + imports/exports). Para specs (yaml/md de protocolo), leitura integral sem Fase A.

**Rationale:** As questões são de shape "como X implementa Y" — a resposta precisa de intenção + edge cases, não só assinaturas (KISS: profundidade só onde a decisão depende dela).

**Consequences:** menos arquivos cobertos, mais confiança por arquivo. Trade-off aceito: as superfícies já foram localizadas na varredura preliminar.

### D3 — Repos vivos investigados in-place (fora de `references/`)

**Decision:** `../theokit` e `../theokit-sdk` são investigados diretamente nos worktrees irmãos (read-only), citados por caminho relativo `../theokit/...`, e NÃO clonados para `knowledge-base/references/`.

**Rationale:** São o alvo de integração vivo, não referência externa — clonar snapshot criaria uma cópia desatualizada do código que o M1 vai modificar (DRY: uma única fonte da verdade por conhecimento). O hard cap de fabricated citation cobre caminhos `knowledge-base/references/`; os caminhos vivos são pré-validados neste plano (varredura de 2026-07-15) e re-validados pelo halt-loop checkpoint "path exists" antes de cada questão.

**Alternatives considered:** clonar snapshot em `references/` (rejeitado: duplicação + staleness); investigar só pelo CHANGELOG/docs dos repos (rejeitado: a decisão Vite-plugin-vs-route precisa do código).

**Consequences:** o blueprint carrega citações de dois formatos (references/ e ../); o `/discover-execute` valida existência de ambos antes de citar.

## Research Questions

**Ordem de execução (EC-1):** Q1 e Q2 DEVEM ser respondidas antes de Q6 (a Fase B de Q6 lê os pontos de uso de transporte localizados por Q1/Q2). As demais questões são livres.

| # | Question | Corner | Reference project(s) | Fase A (broad) | Fase B (deep — Read at each hotspot) | Expected answer shape |
|---|---|---|---|---|---|---|
| Q1 | Como o Genkit implementa a reflection API: quais endpoints, como enumera actions do registry vivo, como streama respostas (v1 vs v2 do protocolo)? | techniques | `.claude/knowledge-base/references/genkit/` | Grep `app.get\|app.post\|createServer\|listen` em `js/core/src/reflection.ts` e `reflection-v2.ts`; ler `docs/reflection-v2-protocol.md` e `genkit-tools/reflectionApi.yaml` integralmente (text-shape) | Read `js/core/src/reflection.ts`, `reflection-v2.ts`, `reflection-types.ts` + trechos de `registry.ts` referenciados | Tabela endpoint → método → payload → transporte (chunked/SSE), com citações `path:line`; diff v1 vs v2 |
| Q2 | Como o dev server do Mastra expõe o registry (agents/tools/workflows) e serve a playground SPA na mesma origem (estrutura de rotas, handlers, mounting da SPA)? | techniques | `.claude/knowledge-base/references/mastra/` | Grep `agents\|playground\|static\|serveStatic` em `packages/deployer/src/server/index.ts` e `ls packages/deployer/src/server/handlers/`; Grep `dev` em `packages/cli/src/commands/` | Read `packages/deployer/src/server/index.ts` (seções de rotas + static), 2-3 handlers representativos (agents, streaming), o comando `dev` do CLI | Mapa de rotas API + como a SPA é montada (base path, fallback) + fluxo do `mastra dev`, com citações |
| Q3 | Qual é a superfície de integração REAL do `theokit dev` hoje — como o vite-plugin injeta devtools e middlewares (`inject-devtools.ts`, `agent-middleware.ts`, `configure-server-hook.ts`), e onde um reflection endpoint + SPA `/_studio` se plugariam (plugin Vite vs rota do server)? | techniques | `../theokit/packages/theo/` | `ls src/vite-plugin/ src/devtools/`; Grep `configureServer\|middlewares.use\|/__theo\|/_theo` em `src/vite-plugin/` | Read `src/vite-plugin/index.ts`, `configure-server-hook.ts`, `agent-middleware.ts`, `api-middleware.ts`, `inject-devtools.ts` + `src/devtools/server-side/` (entry) | Resposta direta ao risco ROADMAP: ponto de extensão recomendado (com evidência), rotas já reservadas, como devtools atual descobre agents |
| Q4 | Como Genkit e Mastra testam seus endpoints de dev-server/reflection (testes de integração sobre HTTP real? mocks? fixtures de registry)? | tests | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | Glob `js/core/tests/reflection*_test.ts` (genkit); `packages/deployer/src/server/server-app-access.test.ts` + `ls packages/deployer/src/server/__tests__/` (mastra) | Read os arquivos de teste: setup (server real vs injetado), asserções sobre payload/stream, teardown | Tabela: teste → boundary exercitada → técnica (supertest/fetch/inject) → o que asserta, com citações |
| Q5 | Como o `theokit` testa o devtools e o comando `dev` hoje (`devtools-*.test.ts`, `cli-dev.test.ts`) — que harness/fixtures existem para eu reusar nos testes de integração do M1? | tests | `../theokit/packages/theo/`, `../theokit/tests/unit/` | `ls ../theokit/tests/unit/ \| grep -E 'devtools\|dev'`; Grep `describe(` em `cli-dev.test.ts` | Read `cli-dev.test.ts` + 2 testes devtools representativos (ex.: `devtools-agents-tab.test.ts`, `devtools-dispatcher.test.ts`) | Inventário do harness (como sobem server/plugin em teste), fixtures reusáveis, gaps |
| Q6 | Que dependências HTTP/server/streaming Mastra (deployer) e Genkit (reflection server) usam — framework (hono/express?), transporte de stream (SSE? chunked? WS?), e versões? | deps | `.claude/knowledge-base/references/mastra/`, `.claude/knowledge-base/references/genkit/` | Grep `"hono"\|"express"\|"ws"\|eventsource` em `packages/deployer/package.json` (mastra) e `js/core/package.json` (genkit); Grep `text/event-stream\|Transfer-Encoding` nos src já mapeados em Q1/Q2 | Read as seções de deps dos package.json + os pontos de uso do transporte | Tabela: projeto → framework → versão → transporte de streaming → justificativa aparente |
| Q7 | O que o `@theokit/sdk` 3.x exporta HOJE para o M1 consumir: superfície pública do registry (enumerar agents/tools/skills/workflows), shape dos eventos tipados de `Run.stream()` (`types/run-events.ts`), e o que `src/server/` já oferece? | deps | `../theokit-sdk/packages/sdk/` | Grep `export` em `src/index.ts`; `ls src/server/ src/types/`; Grep `agents\|tools\|skills\|workflows` em `src/theokit.ts` | Read `src/types/run-events.ts` integral, `src/theokit.ts` (superfície do registry), entry de `src/server/`, `package.json` (versão, exports map) | Contrato consumível: lista de eventos tipados com campos, API de enumeração do registry (existe? gap?), versão publicada vs 3.x |
| Q8 | Como a SPA de playground é buildada e servida em dev vs produção (Mastra: `packages/playground` build/base-path/embedding no CLI; Genkit: como `genkit-tools/cli` serve a Dev UI) — e o que isso implica para o build do `@theokit/studio` ser embarcável? | tools | `.claude/knowledge-base/references/mastra/`, `.claude/knowledge-base/references/genkit/` | Glob `packages/playground/vite.config*` + Grep `base:\|outDir` (mastra); Grep `ui\|static\|serve` em `genkit-tools/cli/src/` (localizar serving da Dev UI) | Read vite config + ponto do CLI que resolve/copia os assets da SPA (ambos projetos) | Pipeline de build/serving: onde os assets moram, como o CLI os encontra, base path, fallback de rota — e recomendação para o pacote `@theokit/studio` |

## Coverage Matrix

| Corner | Questions mapped | Status |
|---|---|---|
| Integration tests | Q4, Q5 | Covered |
| Dependencies | Q6, Q7 | Covered |
| Tools | Q8 | Covered |
| Techniques | Q1, Q2, Q3 | Covered |

**Coverage: 4/4 corners covered (100%)**

## Halt-loop Checkpoints

| Checkpoint | Assertion | Action if fails |
|---|---|---|
| Before answering Qx | Todo caminho declarado na Fase A de Qx existe (`references/` E `../theokit*`) | Marcar Qx BLOCKED com razão "path not found", seguir |
| Per-question Fase A budget | Fase A retornou ≥ 1 hotspot OU 3 variantes tentadas | Após 3 retries vazios, BLOCKED "Fase A exhausted"; seguir |
| After answering Qx | Seção do blueprint de Qx tem ≥ 1 citação `path:line` | Re-iterar Qx (1 retry max) |
| Mid-loop sanity | Citações totais ≥ 1 / 200 palavras de prosa | Adicionar citações aos parágrafos sub-citados (1 retry max) |
| Per-project time budget | Budget do projeto não esgotado | Esgotado → BLOCKED "budget exhausted" nas restantes; próximo projeto |
| Antes de qualquer Read no mastra (EC-2) | O caminho NÃO contém `/ee/` (`playground/src/ee/` existe — carve-out comercial) | Descartar o hotspot com nota no blueprint; NUNCA ler |
| Citações de repo vivo (EC-3) | Toda citação `../theokit*` re-validada com `ls`/Read na iteração que a citou; blueprint mantém tabela dedicada "Live-repo citations" | Recusar promise até a tabela estar completa e validada |
| Fase A de Q2 (EC-4) | `packages/cli/src/commands/dev/` é diretório — começar com `ls` dele antes do Grep | — |
| Before promising complete | 4 coverage corners com seções populadas + ≥ 1 ADR de síntese | Recusar promise, continuar iterando |

## Acceptance Criteria

- [ ] Todas as research questions respondidas OU explicitamente BLOCKED com razão
- [ ] Quatro coverage corners com seções populadas no blueprint
- [ ] Toda citação `knowledge-base/references/{...}` aponta para caminho real; toda citação `../theokit*` idem (re-validada na execução)
- [ ] ≥ 1 seção de ADR no blueprint sintetizando as decisões (incl. resposta ao risco "Vite plugin vs server route")
- [ ] Time budget respeitado por projeto
- [ ] Verdict `/discover-confidence` ≥ SHIPPABLE_WITH_CAVEATS
- [ ] Blueprint salvo em `.claude/knowledge-base/discoveries/blueprints/m1-studio-table-stakes-blueprint.md`

## Global Definition of Done

- [ ] Todas as fases completas (plan → edge-cases → plan-confidence → execute → confidence → improve se necessário → re-score)
- [ ] Verdict final do `/discover-confidence` registrado no header do blueprint
- [ ] Zero citações fabricadas
- [ ] Coverage Matrix 100%
- [ ] ADRs referenciam ≥ 1 princípio dos project rules — este plano cita `rules/architecture.md § 2` (DIP: o adapter real substitui o de fixtures sem tocar páginas), `rules/testing.md § 2` (testes de integração na fronteira do dev server) e DRY (ADR D3: repos vivos não clonados)
