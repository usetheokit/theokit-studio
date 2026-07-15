# Blueprint: M1 Studio Table-Stakes — Reflection Endpoint + SPA em `/_studio`

> **Version 1.0** — Sintetiza como Genkit e Mastra implementam o par "reflection endpoint no dev server + SPA de playground em rota dedicada", e mapeia a superfície REAL de integração do ecossistema vivo (`theokit` CLI v0.41.0 @ `53e3582d`, `@theokit/sdk` 3.8.0 @ `858b384c`). Informa as decisões do plano de implementação do milestone M1: onde o reflection endpoint se pluga, como a SPA é embarcada/servida, qual o contrato de streaming do playground, e quais gaps do SDK exigem degradação honesta.

**Slug:** `m1-studio-table-stakes`
**Source plan:** `.claude/knowledge-base/discoveries/plans/m1-studio-table-stakes-plan.md` (v1.1)
**Owner:** paulohenriquevn
**Generated:** 2026-07-15 via `/discover-execute` (halt-loop inline, 4 investigadores paralelos)
**Confidence verdict:** SHIPPABLE (100.0 — 2026-07-15, zero hard/soft caps)

## Context

ROADMAP § M1 exige reflection endpoint no `theokit dev` (registry vivo, sem manifest), SPA em `/_studio` same-origin, playground com eventos tipados de `Run.stream()` ao vivo, e funcionamento sem Docker. O M5 entregou todas as telas sobre `StudioDataSource` fixtures (DIP, `rules/architecture.md § 2`); o M1 troca o adapter. Os dois riscos declarados no ROADMAP: superfície de integração no `theokit` (Vite plugin vs server route) e adoção do SDK 3.x.

## Objective

Permitir decidir como implementar o reflection endpoint e o serving da SPA `/_studio` dentro da superfície existente do `theokit dev`, com contrato de streaming derivado do que `@theokit/sdk` 3.8.0 realmente exporta.

---

## Coverage Corner 1 — Integration Tests

### Genkit (Q4)

Testa a reflection API contra **servidor real** (HTTP v1, WebSocket v2) — sem mocks de transporte:

- **Pattern v1**: sobe o `ReflectionServer` e faz `http.get()`/POST reais; asserta status + shape do body. Ex.: rejeição de query param ausente (`.claude/knowledge-base/references/genkit/js/core/tests/reflection_test.ts:79-83`), erro tipado NOT_FOUND com `error.code === 5` (`.claude/knowledge-base/references/genkit/js/core/tests/reflection_test.ts:154-175`).
- **Pattern v2**: WebSocket real com handshake `register`, `listActions`, streaming (`streamChunk` chunks coletados e comparados), cancelamento via `AbortController`/traceId, e reconexão simulada com `terminate()` (`.claude/knowledge-base/references/genkit/js/core/tests/reflection-v2_test.ts:72-103`, `:368-441`, `:443-539`, `:541-577`).
- **Coverage**: validação de fronteira (params), enumeração, execução, streaming, cancelamento, reconexão — o ciclo de vida completo do protocolo.

### Mastra (Q4)

Testa o dev server **sem HTTP real** — usa o test client do Hono (`app.fetch(new Request(...))`):

- Exposição da app: `mastra.getServerApp()` + `app.fetch()` (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/server-app-access.test.ts:11-25`).
- Health e listagem de agents por `Request` sintética: status 200 + shape do JSON (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/server-app-access.test.ts:40-76`).
- CORS por preflight OPTIONS em rotas globais vs específicas (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/__tests__/cors.test.ts:16-58`).
- Mocks pontuais por `vi.doMock` para dependências opcionais (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/__tests__/browser-session-probe.test.ts:11-29`).

### theokit (Q5 — repo vivo)

Dois níveis de harness já existem e são reusáveis pelo M1:

- **End-to-end real**: `cli-dev.test.ts` sobe `startDevServer()` de verdade contra a fixture `fixtures/onda1-hello-theo` com `port: 0`, asserta 200 + `text/html` (`../theokit/tests/unit/cli-dev.test.ts:15-45`).
- **Middleware isolado (fake Vite)**: `api-middleware-coverage.test.ts` monta o middleware com `ViteLike` mínimo (`{ ssrLoadModule: vi.fn() }`), `makeReq()`/`makeRes()` sintéticos e `runMiddleware()` (`../theokit/tests/integration/api-middleware-coverage.test.ts:1-100`). Helper `safe-close.ts` para teardown com timeout (`../theokit/tests/integration/helpers/safe-close.ts:15-41`).
- **Gaps honestos**: não há factory reusável de mock Vite, nem captura de broadcasts WS, nem fixture com agents para e2e — o M1 precisa criá-los (recomendação R6).

---

## Coverage Corner 2 — Dependencies

### Genkit (Q6)

| Dependency | Version | Why | Citation |
|---|---|---|---|
| `express` | `^4.21.0` | reflection server HTTP v1 | `.claude/knowledge-base/references/genkit/js/core/package.json:43` |
| `ws` | `^8.18.0` | protocolo v2 (WebSocket JSON-RPC 2.0) | `.claude/knowledge-base/references/genkit/js/core/package.json:48` |

Transporte de streaming v1: **HTTP chunked** — `Content-Type: text/plain` + `Transfer-Encoding: chunked`, um JSON por linha via `response.write(JSON.stringify(chunk) + '\n')` (`.claude/knowledge-base/references/genkit/js/core/src/reflection.ts:271-284`). Sem SSE.

### Mastra (Q6)

| Dependency | Version | Why | Citation |
|---|---|---|---|
| `hono` | `^4.12.8` | framework HTTP do dev server | `.claude/knowledge-base/references/mastra/packages/deployer/package.json:116` |
| `@hono/node-server` | `^1.19.11` (dev) | adapter Node | `.claude/knowledge-base/references/mastra/packages/deployer/package.json:127` |
| `@hono/node-ws` + `ws` | `^1.3.0` / `^8.21.0` | canais WebSocket | `.claude/knowledge-base/references/mastra/packages/deployer/package.json:100,124` |

Transporte de streaming: **SSE** (`Content-Type: text/event-stream`, `.claude/knowledge-base/references/mastra/packages/deployer/src/server/handlers/client.ts:7-26`) e `stream()` do hono (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/handlers/a2a.ts:12,59`).

### theokit-sdk 3.8.0 (Q7 — repo vivo, sha `858b384c`)

Superfície consumível pelo M1 hoje:

| Necessidade M1 | Status | Superfície | Citation |
|---|---|---|---|
| Enumerar agents | ✅ existe | `Agent.list()` → `SDKAgentInfo[]` (agentId, name, summary, status, runtime) | `../theokit-sdk/packages/sdk/src/agent.ts:321-327`, `../theokit-sdk/packages/sdk/src/types/agent.ts:925-941` |
| Enumerar tools | ❌ **GAP** | tools ficam em `RegisteredAgent.options.tools` (interno, sem getter público) | `../theokit-sdk/packages/sdk/src/internal/runtime/registry/agent-registry-contract.ts:35-63` |
| Enumerar skills | ⚠️ parcial | `agent.skills.list()` → `SystemPromptSkillRef[]` (por agent, quando habilitado); `discoverSkills` em `@theokit/sdk/skills` | `../theokit-sdk/packages/sdk/src/skills.ts:1-26` |
| Enumerar workflows | ❌ **GAP** | subagent defs em `AgentOptions.agents`, sem enumeração de instâncias | `../theokit-sdk/packages/sdk/src/index.ts:1-273` |
| Stream de mensagens | ✅ existe | `run.stream()` → `AsyncGenerator<SDKMessage>` (`system`/`user`/`assistant`/`tool_call`/`thinking`) | `../theokit-sdk/packages/sdk/src/types/run.ts:1-586`, exemplo real `../theokit-sdk/examples/agent-streaming/run.ts:1-64` |
| Eventos tipados | ✅ existe | `SendOptions.onRunEvent` → 9 `RunEvent`: `tool_progress`, `rate_limit`, `permission_denied`, `task_started`, `task_updated`, `task_completed`, `compact_boundary`, `tripwire`, `completion_check` | `../theokit-sdk/packages/sdk/src/types/run-events.ts:1-133` |
| Server adapter | ❌ não serve p/ reflection | `src/server/adapter` expõe `/agent/send` + `/agent/stream` (execução, não introspecção); `errors-envelope` é reusável | `../theokit-sdk/packages/sdk/src/server/adapter/shared-handler.ts:12-56`, `../theokit-sdk/packages/sdk/src/server/errors-envelope.ts:36-115` |

**Achado de ecossistema (REPORT):** o DoD do M1 pede reflection de "agents/tools/skills/workflows", mas o SDK 3.8.0 não expõe enumeração pública de **tools** nem de **workflows**. Ver ADR D3 e recomendação R5.

---

## Coverage Corner 3 — Tools

### Genkit (Q8)

- **Origem dos assets da Dev UI**: baixados de um bucket GCS (`https://storage.googleapis.com/genkit-assets/{version}.zip`) para `~/.genkit/assets/{version}/ui/browser/` (`.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:38-47`, `.claude/knowledge-base/references/genkit/genkit-tools/common/src/utils/ui-assets.ts:36-51`).
- **Serving**: `express.static(UI_ASSETS_SERVE_PATH)` na raiz, porta padrão 4000 (fallback até 4099) (`.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:149`, `.claude/knowledge-base/references/genkit/genkit-tools/cli/src/commands/ui-start.ts:50-61`).
- **Fallback SPA**: `app.all('*')` → `res.sendFile('/', { root: UI_ASSETS_SERVE_PATH })` — toda rota não-API devolve `index.html` (`.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:358-360`).

### Mastra (Q8)

- **Build**: `vite build` com `base: './'` (assets relativos — chave para servir sob qualquer prefixo) e `cssCodeSplit: false` (`.claude/knowledge-base/references/mastra/packages/playground/vite.config.ts:221,229-231`, `.claude/knowledge-base/references/mastra/packages/playground/package.json:31`).
- **Embedding no pacote**: o build do CLI copia `playground/dist` para `dist/studio` do pacote publicado (`.claude/knowledge-base/references/mastra/packages/cli/tsup.config.ts:16,18`; replicado no BuildBundler `.claude/knowledge-base/references/mastra/packages/cli/src/commands/build/BuildBundler.ts:62-63`).
- **Resolução em runtime**: `getStudioPath()` prefere env `MASTRA_STUDIO_PATH`, senão `join(__dirname, 'studio')` (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/index.ts:33-46`).
- **Serving**: assets em `${studioBasePath}/assets/*` via `serveStatic` + catch-all `app.get('*')` que pula rotas de API/arquivos com extensão, lê `index.html` e injeta config dinâmica no HTML antes de responder (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/index.ts:359-506`).

### theokit (Q3.8 — repo vivo)

- `theokit dev` é um **wrapper do Vite**: `createServer({ plugins: [react(), ...theoPluginAsync(config)] })` + `server.listen()` — o Vite é o servidor HTTP real (`../theokit/packages/theo/src/cli/commands/dev.ts:82-97`).
- Serving estático em produção já tem primitiva própria: `serveStaticFile()` (`../theokit/packages/theo/src/server/http/static.ts:30-60`), usada pelo dispatch de `theokit start` (ações → agents → rotas → estático → SSR → CSR, `../theokit/packages/theo/src/cli/commands/start/request-handler.ts:202-211`).

---

## Coverage Corner 4 — Techniques

### Reflection endpoint — enumeração do registry vivo (Q1, Q2, Q3)

| Project | Approach | Citation |
|---|---|---|
| Genkit | `GET /api/actions` → `registry.listResolvableActions()` → `Record<key, {name, description, metadata, inputSchema, outputSchema}>` (JSON schemas via `toJsonSchema`) | `.claude/knowledge-base/references/genkit/js/core/src/reflection.ts:207-238` |
| Mastra | Dev server importa o entry file do usuário (`findMastraEntryFile`) + fs-routing de `agents/*`; rotas `/api/agents` etc. registradas pelo adapter | `.claude/knowledge-base/references/mastra/packages/cli/src/commands/dev/dev.ts:445-456`, `.claude/knowledge-base/references/mastra/packages/deployer/src/server/index.ts:129,190-191` |
| theokit hoje | `agent-middleware` faz `scanAgents(projectRoot, agentsDir)` (fs) + `createViteLoader(vite)` (SSR module loading) por request — **o "registry vivo" do dev é o filesystem + Vite SSR loader**, não um singleton em memória | `../theokit/packages/theo/src/vite-plugin/agent-middleware.ts:208-238` |

Diferença que importa: Genkit enumera um registry em memória do processo do app; Mastra e theokit dev derivam do **filesystem do projeto carregado sob demanda pelo bundler** — hot-reload grátis (o Vite invalida o módulo). Para o M1, o padrão theokit existente (`scanAgents` + loader) É a reflection: o endpoint novo formaliza esse mecanismo em JSON.

### Endpoints e transporte do protocolo (Q1)

Genkit v1 (o shape que o M1 espelha): `GET /api/actions` (enumeração), `POST /api/runAction` (execução com streaming chunked, um JSON por linha), `GET /api/values`, `POST /api/cancelAction`, `GET /api/envs`, `POST /api/notify`, healthcheck `GET /api/__health` (`.claude/knowledge-base/references/genkit/js/core/src/reflection.ts:174-427`). Porta padrão 3100, descoberta por runtime files em `.genkit/runtimes/*.json` (`.claude/knowledge-base/references/genkit/js/core/src/reflection.ts:100,511-531`). O v2 inverte a conexão (runtime → CLI, WebSocket JSON-RPC 2.0 com `register`/`listActions`/`streamChunk`) (`.claude/knowledge-base/references/genkit/docs/reflection-v2-protocol.md:1-227`, `.claude/knowledge-base/references/genkit/js/core/src/reflection-v2.ts:17-110`) — relevante como direção futura, não para M1 (Studio é same-origin, não precisa de descoberta multi-runtime).

### Ponto de integração no theokit dev (Q3 — resposta ao risco nº 1 do ROADMAP)

**Vite plugin, não server route.** Evidência:

1. Todos os middlewares do dev são registrados no hook `configureServer` (`../theokit/packages/theo/src/vite-plugin/index.ts:413-437` → `runConfigureServer`), na ordem: action middleware (`/api/__actions/`) → agent middleware (`/api/agents/`) → api middleware genérico (`/api/*`) (`../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts:88-127`).
2. O namespace reservado hoje é `/__theo/*` (health, ready, csrf-readiness, csp-report) (`../theokit/packages/theo/src/server/security/csrf-readiness-endpoint.ts:21-22`, `../theokit/packages/theo/src/server/security/csp-report.ts:13`). **Não existe `/_studio`** — superfície livre.
3. O devtools atual NÃO tem endpoint HTTP — comunica via HMR WebSocket (`globalThis.__theoViteHotServer` + `server.ws.send`, com redação de segredos antes do envio) (`../theokit/packages/theo/src/devtools/server-side/broadcast.ts:35-79`, canais em `../theokit/packages/theo/src/devtools/bridge/hmr-bridge.ts:110-115`).
4. Padrão a seguir: um `studio-middleware.ts` novo no vite-plugin (modelo `agent-middleware.ts`), registrado em `configure-server-hook.ts` antes do api-middleware genérico, com duas responsabilidades: reflection API (`/_studio/api/*`) e serving estático da SPA (`/_studio`) via `serveStaticFile()` (`../theokit/packages/theo/src/server/http/static.ts:30-60`).

### Streaming do playground (Q7)

O chat playground consome `run.stream()` (`for await (const msg of run.stream())`, `../theokit-sdk/examples/agent-streaming/run.ts:1-64`) e os 9 eventos tipados via `SendOptions.onRunEvent` (`../theokit-sdk/packages/sdk/src/types/run-events.ts:42-111`). O transporte HTTP do middleware existente já usa `UIMessageStream` no agent-middleware (`../theokit/packages/theo/src/vite-plugin/agent-middleware.ts:208-238`) — o M1 pode (a) reusar o endpoint `/api/agents/<name>` existente para o chat e (b) adicionar o multiplex de `RunEvent` no stream do reflection endpoint. Mastra usa SSE, Genkit usa chunked JSON-lines; o theokit já tem seu próprio formato de stream — **não inventar um quarto formato** (Rule 9).

---

## Cross-cutting Comparison

| Dimension | Genkit | Mastra | theokit hoje |
|---|---|---|---|
| Framework HTTP do dev | Express `^4.21.0` (`js/core/package.json:43`) | hono `^4.12.8` (`deployer/package.json:116`) | Vite dev server + connect middlewares (`vite-plugin/configure-server-hook.ts:88-127`) |
| Enumeração do registry | Em memória: `registry.listResolvableActions()` (`reflection.ts:210`) | Entry file do usuário + fs-routing (`dev.ts:445-456`) | fs scan + Vite SSR loader por request (`agent-middleware.ts:208-238`) |
| Rota da SPA | `/` raiz, porta separada 4000 (`server.ts:149`) | `studioBasePath` configurável, mesma origem (`index.ts:359`) | — (M1 cria `/_studio`) |
| Assets da SPA | Download GCS em runtime (`ui-assets.ts:36-51`) | Embarcados no pacote (`tsup.config.ts:18`) | — (M1 decide: embarcar, padrão Mastra) |
| Fallback SPA | `app.all('*')` → index.html (`server.ts:358-360`) | catch-all com injeção de config no HTML (`index.ts:424-506`) | SSR middleware serve HTML (`ssr-dev-middleware.ts`) |
| Streaming | HTTP chunked JSON-lines (`reflection.ts:271-284`) | SSE `text/event-stream` (`handlers/client.ts:7-26`) | `UIMessageStream` no agent-middleware (`agent-middleware.ts:208-238`) |
| Teste do dev server | HTTP/WS real (`reflection_test.ts:79-175`) | test client `app.fetch()` (`server-app-access.test.ts:11-76`) | fixture real + fake-Vite p/ middleware (`cli-dev.test.ts:15-45`, `api-middleware-coverage.test.ts:1-100`) |

## ADRs

### D1 — Integração via Vite plugin middleware (não server route standalone)

**Decision:** O reflection endpoint e o serving da SPA entram como um novo middleware do vite-plugin do theokit (`studio-middleware.ts`), registrado em `configure-server-hook.ts`, sob o namespace `/_studio` (SPA) e `/_studio/api/*` (reflection).

**Rationale:** É o único padrão existente no `theokit dev` — todos os endpoints do dev (actions, agents, api) são connect middlewares registrados no hook `configureServer` (`../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts:88-127`); o Vite é o servidor HTTP real (`../theokit/packages/theo/src/cli/commands/dev.ts:82-97`). Uma "server route" separada exigiria segunda porta/processo — o anti-padrão que o CLAUDE.md do Studio veta ("Dev server is the gateway"). Resolve o risco nº 1 do ROADMAP com evidência.

**Alternatives considered:** (a) porta separada estilo Genkit Dev UI (porta 4000) — rejeitado: quebra same-origin, invariante 2; (b) canal HMR WebSocket como o devtools atual — rejeitado para reflection: o Studio SPA é uma página própria, não um overlay injetado; HTTP simples é testável com o harness fake-Vite existente (KISS).

**Consequences:** o M1 tem trabalho no repo `theokit` (novo middleware + registro), não só no `theokit-studio`; o plano de implementação precisa declarar essa fronteira cross-repo explicitamente.

### D2 — SPA embarcada no pacote (padrão Mastra), servida com assets relativos

**Decision:** `@theokit/studio` builda com Vite `base: './'` e o pacote publica os assets; o middleware resolve o diretório dist do pacote instalado (com env override para dev do próprio Studio), servindo via `serveStaticFile()` + fallback catch-all para `index.html` sob `/_studio`.

**Rationale:** Mastra prova o padrão completo: `base: './'` (`.claude/knowledge-base/references/mastra/packages/playground/vite.config.ts:221`), cópia para o pacote no build (`.claude/knowledge-base/references/mastra/packages/cli/tsup.config.ts:18`), resolução runtime com env override + fallback `__dirname` (`.claude/knowledge-base/references/mastra/packages/deployer/src/server/index.ts:33-46`). O download-em-runtime do Genkit (`.claude/knowledge-base/references/genkit/genkit-tools/common/src/utils/ui-assets.ts:36-51`) foi rejeitado: dependência de rede no primeiro uso viola graceful degradation (invariante 4) e adiciona infra (bucket) sem valor para um dev-tool local.

**Alternatives considered:** download GCS (rejeitado acima); servir a SPA pelo próprio Vite como módulos (rejeitado: a SPA do Studio é um app React independente com seu próprio build; misturar os module graphs do app do usuário e do Studio cria conflitos de dedupe/alias).

**Consequences:** o pacote `@theokit/studio` ganha um artefato dist embarcado; o middleware no theokit depende de `@theokit/studio` (dependência CLI → Studio, permitida; o inverso é vetado pelo CLAUDE.md).

### D3 — Reflection honesta sobre os gaps do SDK: agents já, tools/skills degradados, workflows fora

**Decision:** O reflection endpoint do M1 expõe: agents via fs-scan + loader (padrão `agent-middleware` existente, enriquecido com metadados do módulo carregado), skills via `discoverSkills`/`agent.skills.list()` quando disponível, e declara honestamente `tools: []`/`workflows: []` com um campo `unavailable_reason` enquanto o SDK não expõe enumeração pública (gap reportado).

**Rationale:** `@theokit/sdk` 3.8.0 não tem getter público para tools de um agent (ficam em `RegisteredAgent.options.tools`, interno — `../theokit-sdk/packages/sdk/src/internal/runtime/registry/agent-registry-contract.ts:35-63`) nem enumeração de workflows. Fabricar introspecção via imports de caminhos `internal/` violaria a fronteira de API (Rule 3 — honestidade; e acoplamento a superfície não-pública quebraria a cada release do SDK). O DoD do M1 é atendível para agents + eventos; o gap é do ecossistema e vai reportado ao repo do SDK.

**Alternatives considered:** (a) importar dos caminhos `internal/` do SDK — rejeitado (acoplamento frágil, quebra semver); (b) bloquear o M1 até o SDK expor a API — rejeitado (o valor central — playground + eventos — não depende disso; o campo degradado mantém a UI honesta como no M5); (c) parsear os arquivos de agents estaticamente para extrair tools — possível follow-up, mas heurístico; fica como questão aberta no plano.

**Consequences:** o Studio mostra tools/workflows como "indisponível via reflection (SDK gap)" — mesma disciplina de honestidade do M5; issue a ser aberta no `theokit-sdk`.

### D4 — Contrato de streaming: reusar o stream existente do agent-middleware + expor RunEvents

**Decision:** O chat do playground fala com o endpoint `/api/agents/<name>` existente (UIMessageStream); os 9 `RunEvent` tipados são plugados via `SendOptions.onRunEvent` e multiplexados no mesmo stream (ou canal paralelo SSE em `/_studio/api/runs/{id}/events` se o formato existente não comportar), sem inventar um novo protocolo.

**Rationale:** O theokit já tem transporte de chat streaming em produção de dev (`../theokit/packages/theo/src/vite-plugin/agent-middleware.ts:208-238`); Rule 9 (não reinventar). Os eventos tipados existem e são síncronos/best-effort (`../theokit-sdk/packages/sdk/src/types/run-events.ts:1-133`). Genkit (chunked JSON-lines) e Mastra (SSE) mostram que qualquer transporte unidirecional simples basta — a escolha fica com o formato que o theokit já usa.

**Alternatives considered:** WebSocket dedicado (rejeitado: v2 do Genkit resolve descoberta multi-runtime, problema que o Studio same-origin não tem); SSE novo paralelo desde já (adiado: só se o multiplex no stream existente se mostrar inviável no spike do plano).

**Consequences:** o plano do M1 precisa de um spike curto validando que `onRunEvent` pode ser encaixado no fluxo do agent-middleware sem mudança de formato incompatível com consumidores existentes.

## Recommendations for the project

| # | Recommendation | Linked to | Priority |
|---|---|---|---|
| R1 | Implementar `studio-middleware.ts` no vite-plugin do theokit (reflection `/_studio/api/*` + static `/_studio`), registrado antes do api-middleware genérico | Q3, D1, `rules/architecture.md § 1` (composition root) | HIGH |
| R2 | Reflection de agents = formalizar `scanAgents` + Vite loader em JSON (nome, arquivo, metadados do módulo); não criar manifest | Q1, Q2, Q3, D1, D3 | HIGH |
| R3 | Build do `@theokit/studio` com `base: './'` + dist embarcado + resolução com env override (padrão Mastra) | Q8, D2 | HIGH |
| R4 | Playground: chat via endpoint agents existente; eventos tipados via `onRunEvent` (spike de multiplex primeiro) | Q7, D4, `rules/testing.md § 2` (spike antes de integrar) | HIGH |
| R5 | Reportar ao `theokit-sdk`: falta enumeração pública de tools/workflows (bloqueia reflection completa); campo degradado honesto no Studio até lá | Q7, D3, Rule 3 (honestidade) | HIGH |
| R6 | Testes M1: níveis espelhando o harness existente do theokit — fake-Vite para o middleware novo (unit/integration) + 1 e2e real com fixture de projeto com agent; criar `create-test-vite-server` helper | Q4, Q5, `rules/testing.md § 2` | MEDIUM |
| R7 | Healthcheck do reflection (`/_studio/api/health`) espelhando `/__theo/health`, para o Studio detectar dev server ausente (graceful degradation, invariante 4) | Q1, Q3 | MEDIUM |

## Blocked questions (if any)

| Question | Reason | Suggested human follow-up |
|---|---|---|
| — | Nenhuma questão bloqueada | — |

## Live-repo citations (EC-3 — re-validação obrigatória)

Caminhos vivos citados neste blueprint (validados na geração; re-validar no `/to-plan`):

| Path | Verificado |
|---|---|
| `../theokit/packages/theo/src/vite-plugin/index.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/vite-plugin/agent-middleware.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/vite-plugin/api-middleware.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/vite-plugin/ssr-dev-middleware.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/vite-plugin/inject-devtools.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/devtools/bridge/hmr-bridge.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/devtools/server-side/broadcast.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/cli/commands/dev.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/cli/commands/start/request-handler.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/server/http/static.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/server/security/csrf-readiness-endpoint.ts` | 2026-07-15 |
| `../theokit/packages/theo/src/server/security/csp-report.ts` | 2026-07-15 |
| `../theokit/tests/unit/cli-dev.test.ts` | 2026-07-15 |
| `../theokit/tests/unit/devtools-agents-tab.test.ts` | 2026-07-15 |
| `../theokit/tests/unit/devtools-dispatcher.test.ts` | 2026-07-15 |
| `../theokit/tests/integration/api-middleware-coverage.test.ts` | 2026-07-15 |
| `../theokit/tests/integration/helpers/safe-close.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/agent.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/theokit.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/index.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/types/run-events.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/types/run.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/types/agent.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/skills.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/server/adapter/shared-handler.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/server/errors-envelope.ts` | 2026-07-15 |
| `../theokit-sdk/packages/sdk/src/internal/runtime/registry/agent-registry-contract.ts` | 2026-07-15 |
| `../theokit-sdk/examples/agent-streaming/run.ts` | 2026-07-15 |

**SHAs no momento da leitura:** `theokit` @ `53e3582d` (theo v0.41.0) · `theokit-sdk` @ `858b384c` (@theokit/sdk 3.8.0).

## Halt-loop progress (audit trail)

- Iterations used: 1 (fan-out de 4 investigadores paralelos; ralph-loop plugin indisponível na sessão — loop dirigido inline com o mesmo contrato)
- Questions answered: 8 / 8
- Questions blocked: 0
- Citations verified: ver sanity check pós-promise no relatório da execução
- EC-2 respeitado: nenhum caminho `ee/` lido (proibição instruída a todos os investigadores)
- Promise emitted at iteration: 1

## Related

- Discovery plan: `.claude/knowledge-base/discoveries/plans/m1-studio-table-stakes-plan.md`
- Edge-case review: `.claude/knowledge-base/reviews/m1-studio-table-stakes-edge-cases-2026-07-15.md`
- Confidence report: `.claude/knowledge-base/reviews/m1-studio-table-stakes-confidence-2026-07-15.md` (gerado por `/discover-confidence`)
- Project rules: `.claude/rules/architecture.md`, `.claude/rules/testing.md`
