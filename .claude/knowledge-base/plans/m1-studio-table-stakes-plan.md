---
slug: m1-studio-table-stakes
milestone_id: M1
created_at: 2026-07-15
goal: Reflection endpoint + SPA /_studio + playground live via plugin Vite exportado por @theokit/studio
---

# Plan: M1 Studio Table-Stakes — Reflection Endpoint + SPA em `/_studio` + Playground Live

> **Version 1.2** (v1.1 + correções do plan-confidence: matrix 100%, citações de seção exatas, subseções de concorrência fora de code fence, ACs com oráculo executável) — Transforma o `@theokit/studio` de SPA fixtures-only (M5) em produto embarcável: um plugin Vite exportado (`@theokit/studio/plugin`) que serve a reflection API (`/_studio/api/*`) e a SPA (`/_studio`) dentro do dev server do usuário, mais um `ReflectionDataSource` que troca o adapter de fixtures pelo real via o seam DIP já existente. O playground passa a rodar agents de verdade com eventos tipados ao vivo. Consome o blueprint `m1-studio-table-stakes` (SHIPPABLE 100.0).

## Goal

Enable um projeto theokit (com `agents/*.ts`) a abrir `/_studio` no próprio dev server e conversar com um agent registrado vendo eventos tipados ao vivo, measured by o teste e2e `studio_e2e_reflection_and_run` (Vite server real + fixture de projeto com agent) passando: `GET /_studio/api/agents` retorna o agent da fixture com tools enumeradas E `POST .../run` streama ≥ 1 chunk NDJSON.

## Context

O M5 entregou todas as telas do Studio sobre `StudioDataSource` fixtures via DIP — o composition root (`src/main.tsx:11-14`) e o seam `window.__STUDIO_CONFIG__` (`src/bootstrap.ts`, EC-8) foram desenhados exatamente para esta troca. O ROADMAP § M1 define o DoD: reflection endpoint no dev server (registry vivo, sem manifest), SPA em `/_studio` same-origin, playground com eventos de `Run.stream()` ao vivo, e funcionamento com Docker ausente.

O discovery `m1-studio-table-stakes` (blueprint SHIPPABLE) mapeou: (a) o `theokit dev` é um wrapper do Vite cujos endpoints são connect middlewares registrados no hook `configureServer`; (b) o padrão Mastra de SPA embarcada (`base: './'` + dist no pacote + resolução com env override); (c) `@theokit/agents@0.40.0` exporta publicamente `compileAgentModule()` → `CompiledAgentOptions` (tools com name+description, subagents, skills, model) e `streamAgentUIMessages()` — o que permite enumerar tools/workflows POR AGENT sem depender do gap do SDK (theokit-sdk#123, que segue válido para o registry runtime do SDK).

Decisão de empacotamento (refina o ADR D1 do blueprint): o middleware vive NESTE repo como plugin Vite exportado — o `theokit` CLI o consome com um registro de uma linha (fase cross-repo minimalista). Isso mantém a direção de dependência permitida (CLAUDE.md: "Consumed by: theokit"; "Never: theo-data service → Studio") e todo o ciclo de qualidade anchorado aqui.

## Baseline Context (deep review of current state)

### Files that will be touched

| File | LoC today | Last commit (sha + date) | Why it exists today | Invariants to preserve |
|---|---|---|---|---|
| `packages/studio/package.json` | 40 | `855ff42` (2026-07-15) | manifesto do `@theokit/studio@0.0.0` (SPA only) | nome `@theokit/studio` LOCKED; deps existentes intactas |
| `packages/studio/vite.config.ts` | 7 | `7f26b8b` (2026-07-14) | build da SPA (react + tailwind) | plugins react+tailwind mantidos |
| `packages/studio/vitest.config.ts` | 20 | `87d7a36` (2026-07-15) | runner jsdom + setup + coverage | testes jsdom existentes intactos (173+) |
| `packages/studio/index.html` | 12 | `6fd64df` (2026-07-14) | entry da SPA (`#root` + bootstrap) | `#root` + script bootstrap |
| `packages/studio/src/bootstrap.ts` | 54 | `87d7a36` (2026-07-15) | entry defensivo; parse de `window.__STUDIO_CONFIG__` (EC-8) | fallback fixtures em config malformada; startup-error fail-loud |
| `packages/studio/src/main.tsx` | 28 | `6fd64df` (2026-07-14) | composition root — único lugar que conhece o adapter concreto | contrato `mount(rootEl, config)`; `__STUDIO_METRICS__` |
| `packages/studio/src/app/routes.tsx` | 104 | `029ac8c` (2026-07-15) | rotas + IMPLEMENTED_PAGES (fonte de verdade das páginas reais) | shape das rotas; redirect raiz |
| `packages/studio/src/app/shell.tsx` | 219 | `87d7a36` (2026-07-15) | shell com banner "Fixtures mode · M5 simulated data" | navegação/menus intactos |
| `packages/studio/src/data/types.ts` | 296 | `5219968` (2026-07-15) | entidades react-free + erros tipados; eventos = `InteractionUpdate \| RunEvent` do SDK | vocabulário de eventos do SDK; erros tipados existentes |
| `packages/studio/src/data/fixture-datasource.ts` | 234 | `5219968` (2026-07-15) | adapter M5 (fixtures, metric-counted) | comportamento intacto (todos os testes M5) |
| `packages/studio/src/data/metrics.ts` | 34 | `8b82b18` (2026-07-14) | contador `datasource_calls_total` | API `metrics.count/snapshot/reset` |
| `packages/studio/src/pages/playground/index.tsx` | 308 | `b3b9038` (2026-07-15) | playground consumindo `runAgent(): AsyncIterable<StudioEvent>` | contrato de eventos; painel de params (M7 T3.2) |
| `packages/studio/src/test/setup.ts` | 47 | `c4e2d0e` (2026-07-15) | stubs jsdom (CSS.escape, matchMedia, ResizeObserver) | stubs existentes |
| `packages/studio/src/data/reflection-datasource.ts` (NEW) | 0 | — | (adapter real sobre `/_studio/api/*`) | — |
| `packages/studio/src/data/reflection-datasource.test.ts` (NEW) | 0 | — | (testes RED do adapter) | — |
| `packages/studio/plugin/index.ts` (NEW) | 0 | — | (entry do plugin Vite) | — |
| `packages/studio/plugin/reflection-api.ts` (NEW) | 0 | — | (handlers da reflection API) | — |
| `packages/studio/plugin/agent-scan.ts` (NEW) | 0 | — | (scan de `agents/*.ts` espelhando a convenção theokit) | — |
| `packages/studio/plugin/run-endpoint.ts` (NEW) | 0 | — | (POST run com NDJSON streaming + RunEvents) | — |
| `packages/studio/plugin/static-serve.ts` (NEW) | 0 | — | (serving da SPA com proteção de path traversal) | — |
| `packages/studio/plugin/*.test.ts` (NEW) | 0 | — | (testes node-env do plugin, harness fake-Vite) | — |
| `packages/studio/tests/e2e/studio-e2e.test.ts` (NEW) | 0 | — | (e2e: Vite server real + fixture de projeto) | — |
| `packages/studio/tests/fixtures/demo-project/` (NEW) | 0 | — | (projeto mínimo com `agents/support.ts`) | — |
| `packages/studio/tsup.config.ts` (NEW) | 0 | — | (build node do plugin) | — |
| `CHANGELOG.md` | — | contínuo | contrato público de mudanças | Keep a Changelog; `[Unreleased]` primeiro |
| `../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts` (CROSS-REPO) | 199 | `53e3582d` | registro de middlewares do dev | ordem existente de middlewares; diff mínimo (fase 4) |

### Current callers / dependents

- **Symbol:** `StudioDataSource` (interface) em `src/data/datasource.ts`
  - **Callers (production):** todas as páginas via `useDataSource()` (20+ arquivos em `src/pages/**`); composition root `src/main.tsx:14`
  - **Callers (tests):** todos os `*.test.tsx` injetam `createFixtureDataSource` via `DataSourceProvider`
  - **External:** não — interface interna da SPA. A troca do adapter NÃO muda a interface (DIP: novo implementador).
- **Symbol:** `mount(rootEl, config)` em `src/main.tsx`
  - **Callers (production):** `src/bootstrap.ts:36` (dynamic import)
  - **Callers (tests):** nenhum direto (bootstrap testado via parseStudioConfig)
  - **External:** não.
- **Symbol:** `parseStudioConfig(raw)` em `src/bootstrap.ts`
  - **Callers (production):** `src/bootstrap.ts:37`
  - **Callers (tests):** `src/bootstrap.test.ts` (se existente) / testes de boot
  - **External:** o HOST (plugin) escreve `window.__STUDIO_CONFIG__` — o shape ganha campos novos com fallback compatível (invariante EC-8).
- **Symbol (novo, público):** `theokitStudio()` em `packages/studio/plugin/index.ts`
  - **Callers (production):** fase 4 — `../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts` (cross-repo, 1 registro); e2e local usa direto num `createServer` do Vite
  - **External:** sim — vira export público `@theokit/studio/plugin` (contrato: função → plugin Vite).

### Domain glossary

- **Reflection endpoint** — API HTTP no dev server que enumera o registry vivo (agents/tools/skills/workflows) derivado do filesystem + módulos carregados; sem manifest estático.
- **`CompiledAgentOptions`** — shape normalizado que `compileAgentModule()` (`@theokit/agents/bridge`) extrai de um módulo `defineAgent` (model, tools, agents/subagents, skills, systemPrompt).
- **`StudioEvent`** — `InteractionUpdate | RunEvent` do `@theokit/sdk` (`src/data/types.ts:235`) — o vocabulário que o playground já renderiza.
- **NDJSON** — um JSON por linha no corpo chunked (padrão do reflection do Genkit) — transporte do run endpoint.
- **Fixtures mode / Live mode** — origem dos dados da SPA: `FixtureDataSource` (M5) vs `ReflectionDataSource`+delegação (M1), decidido por `window.__STUDIO_CONFIG__.mode`.
- **agent scan** — descoberta de `agents/<name>.ts` no projeto (convenção theokit LOCKED: top-level `agents/`, subpastas de composição `tools/ skills/ prompts/...` excluídas).

### Architecture boundaries affected

- `rules/architecture.md § 1` (composition root): `src/main.tsx` continua o único lugar que conhece adapters concretos — ganha a escolha fixtures/live. Direção preservada.
- `rules/architecture.md § 2` (DIP): `ReflectionDataSource` é novo implementador da interface existente; páginas intocadas.
- **Nova fronteira pública:** `@theokit/studio/plugin` (node-side). O plugin NÃO importa nada da SPA (`src/**`) e vice-versa — comunicam-se apenas via HTTP + dist embarcado + `window.__STUDIO_CONFIG__`. Import `plugin/ → src/` e `src/ → plugin/` são ambos proibidos.
- **Cross-repo (fase 4):** `theokit` (CLI) → `@theokit/studio` — direção permitida pelo CLAUDE.md ("Consumed by: theokit"); o inverso proibido.

## Prior Art & Related Work

- **Internal blueprint:** `m1-studio-table-stakes` (SHIPPABLE 100.0) — Blueprint §"Coverage Corner 4 — Techniques" (ponto de integração vite-plugin; enumeração por fs+loader), §"ADRs D1–D4" (plugin Vite; SPA embarcada padrão Mastra; degradação honesta; streaming sem novo protocolo), §"Coverage Corner 1" (harness de testes fake-Vite do theokit).
- **Patterns skills:** (nenhuma `*-patterns` existe em `.claude/skills/` — verificado em 2026-07-15).
- **Reference projects:** `.claude/knowledge-base/references/genkit/js/core/src/reflection.ts:207-238` (enumeração + JSON schema por action; NDJSON chunked em runAction), `.claude/knowledge-base/references/mastra/packages/playground/vite.config.ts:221` (`base: './'`), `.claude/knowledge-base/references/mastra/packages/deployer/src/server/index.ts:33-46` (resolução de assets com env override), `.claude/knowledge-base/references/mastra/packages/deployer/src/server/index.ts:424-506` (catch-all SPA com injeção de config no HTML).
- **Live-repo evidence (re-validada nesta data):** `../theokit/packages/theo/src/server/scan/agent-scan.ts:52-80` (convenção de scan), `../theokit/packages/agents/src/bridge/agent-endpoint.ts:58` (`compileAgentModule`), `../theokit/packages/agents/src/bridge/agent-endpoint.ts:186` (`streamAgentUIMessages(compiled, apiKey, input)`), `../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts:88-127` (ordem de middlewares), `../theokit/tests/integration/api-middleware-coverage.test.ts` (harness fake-Vite).

## Objective

- [ ] Plugin Vite `theokitStudio()` exportado em `@theokit/studio/plugin`, com reflection API (`/_studio/api/health|agents|skills|tools|workflows`) derivada de fs-scan + `ssrLoadModule` + `compileAgentModule`
- [ ] Run endpoint `POST /_studio/api/agents/:name/run` streamando NDJSON de `StudioEvent` (UIMessageChunks + RunEvents) com abort propagado e defesa same-origin
- [ ] SPA buildada embarcável (`base: './'`, `dist/spa` no pacote) e servida em `/_studio` com fallback SPA + injeção de `window.__STUDIO_CONFIG__`
- [ ] `ReflectionDataSource` implementando o subset live do `StudioDataSource` + composição híbrida honesta no composition root (live para reflection; fixtures rotuladas para o resto)
- [ ] Playground em live mode roda agent real com eventos tipados ao vivo; degradação honesta quando o dev server/reflection está ausente
- [ ] e2e `studio_e2e_reflection_and_run` verde contra Vite server real + fixture de projeto
- [ ] Wiring cross-repo: `theokitStudio()` registrado no `theokit dev` (diff mínimo no repo theokit)

## ADRs

### D1 — Plugin Vite exportado por `@theokit/studio` (inversão do blueprint D1 sobre ONDE o código vive)

**Decision:** O `studio-middleware` do blueprint vive NESTE repo como `@theokit/studio/plugin` (função `theokitStudio()` retornando um plugin Vite com `configureServer`); o repo `theokit` apenas o registra (1 linha + dependência).

**Rationale:** Mantém o ciclo de qualidade (TDD, review, release) inteiro num repo só; respeita a direção de dependência do CLAUDE.md ("Consumed by: theokit"); o padrão técnico é idêntico ao do blueprint D1 (connect middleware no hook `configureServer`, evidência `configure-server-hook.ts:88-127`). DIP (`architecture.md § 2`): o theokit consome um contrato público estável em vez de o Studio depender de internals do theokit.

**Alternatives considered:** (a) implementar dentro de `../theokit/packages/theo/src/vite-plugin/` (blueprint D1 literal) — rejeitado: espalha o M1 por dois ciclos de review/release e acopla o Studio ao release train do CLI; (b) porta separada estilo Genkit Dev UI — rejeitado no blueprint (quebra same-origin, invariante 2).

**Consequences:** o plugin precisa reimplementar o agent scan (a convenção theokit não é export público — ver D3); a fase cross-repo encolhe para dependência + registro + smoke test.

### D2 — Enumeração via `@theokit/agents/bridge` (supera a degradação total do blueprint D3)

**Decision:** A reflection carrega cada agent com `vite.ssrLoadModule` e normaliza com `compileAgentModule()` público de `@theokit/agents/bridge`, expondo por agent: model, tools (name+description), skills settings e subagents; os endpoints agregados `tools`/`workflows` derivam dessa compilação. Workflows = subagents declarados (`CompiledAgentOptions.agents`), rotulados como tal.

**Rationale:** Descoberta pós-blueprint: `compileAgentModule` é público e retorna exatamente os metadados que o SDK não expõe (evidência `agent-endpoint.ts:58` + shape em `agent-compiler.ts`). Não reinventar (Rule 9) nem acoplar a `internal/` do SDK (blueprint D3). theokit-sdk#123 permanece válido para o registry runtime do SDK, mas deixa de limitar o M1.

**Alternatives considered:** (a) `tools: []` degradado (blueprint D3 original) — rejeitado: informação disponível por via pública; degradar seria honestidade performática; (b) parse estático dos arquivos de agent — rejeitado: heurístico e frágil vs compile real.

**Consequences:** `@theokit/agents` vira peerDependency do plugin; falha de compile de UM agent degrada só aquele agent (entrada com `error`), nunca a lista inteira (fail-fast por item, error-handling.md § 2).

### D3 — Agent scan próprio espelhando a convenção theokit (contrato testado, não import)

**Decision:** O plugin implementa `scanStudioAgents()` (~40 LoC) espelhando a convenção LOCKED do theokit (top-level `agents/`, extensões ts/js, subpastas de composição excluídas, `index` colapsado), coberto por teste de contrato com fixture idêntica à semântica documentada.

**Rationale:** `scanAgents` do theokit vive em `server/internal-api.ts` — explicitamente não-público ("Do NOT re-export these from the public server/index.ts"). Importar de dist interno quebraria a cada release. A convenção é pequena, estável e documentada no fonte (evidência `agent-scan.ts:49-52` "LOCKED naming decision").

**Alternatives considered:** (a) pedir export público ao theokit e bloquear o M1 nisso — rejeitado: dependência de release externo para lógica de 40 linhas; follow-up registrado para deduplicar quando/se o theokit publicar (`server/scan` já é entrypoint público sem o agent-scan); (b) import de caminho dist interno — rejeitado: frágil.

**Consequences:** risco de drift de convenção — mitigado pelo teste de contrato + a fase 4 roda o e2e sob o theokit real.

### D4 — Run endpoint próprio no plugin com NDJSON (resolve o spike do blueprint D4)

**Decision:** `POST /_studio/api/agents/:name/run` no próprio plugin: compila o agent, resolve a API key do ambiente do dev process, streama `streamAgentUIMessages()` + `RunEvent`s (via `onRunEvent`) multiplexados como NDJSON (`{kind:"message"|"run-event", event}` por linha), com `AbortSignal` amarrado ao disconnect e verificação same-origin antes de gastar tokens.

**Rationale:** Torna o plugin autossuficiente (funciona sob Vite puro — pré-requisito do e2e local e da degradação sem theokit); `streamAgentUIMessages` é público e já trata abort (`agent-endpoint.ts:186+`); NDJSON chunked é o transporte provado do Genkit (`reflection.ts:271-284`); mountAgent do theokit exige a mesma defesa CSRF/origin antes do run ("an agent run spends real LLM tokens" — `mount-agent.ts:85+`).

**Alternatives considered:** (a) reusar `/api/agents/<name>` do theokit (blueprint D4 opção a) — rejeitado como caminho único: inexiste sob Vite puro e não expõe RunEvents; segue disponível como otimização futura; (b) SSE — rejeitado: NDJSON é mais simples de parsear incremental no fetch reader e igual em capacidade aqui (KISS).

**Consequences:** resolução de API key vira responsabilidade do plugin (convenção de env vars do host; erro tipado claro quando ausente — cenário de falha coberto); o playground live parseia NDJSON.

### D5 — Composição híbrida honesta no composition root (live + fixtures rotuladas)

**Decision:** Em live mode o composition root injeta um datasource composto: `ReflectionDataSource` responde `listAgents/listSkills/listTools/listWorkflows/runAgent/health`; as demais superfícies delegam ao `FixtureDataSource` existente (que já se auto-rotula "Fixtures mode · simulated data" nas telas); o banner global passa a distinguir "Live reflection" vs "Fixtures".

**Rationale:** Invariante 4 do CLAUDE.md (graceful degradation — Studio útil sempre) + a disciplina de honestidade do M5 (dados simulados SEMPRE rotulados). Zero mudança nas páginas (DIP). Superfícies service-backed (memory/knowledge/traces) são M2/M3 por ROADMAP.

**Alternatives considered:** (a) live-only com telas vazias fora da reflection — rejeitado: destrói a utilidade do Studio e não adiciona honestidade (banner já rotula); (b) reimplementar cada lista vazia com CTA — rejeitado: YAGNI, é o estado offline do M2/M3.

**Consequences:** a UI precisa expor o modo por superfície (reflection-backed vs fixtures) — resolvido com o banner existente + campo de config; o teste do composition root cobre o roteamento por método.

## Drawbacks & Risks

| Drawback / Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| Drift da convenção de agent scan vs theokit (D3 reimplementa) | Medium | teste de contrato com fixture espelhando `agent-scan.ts`; e2e da fase 4 sob theokit real; follow-up para consumir export público quando existir | implementer |
| `@theokit/agents`/`@theokit/sdk` são pre-release (0.40.0/3.8.0) e podem quebrar API entre releases | Medium | peerDependencies com range explícito; SHAs registrados no blueprint; re-validação da superfície na fase 1 (spike T1.4.1) | implementer |
| Serving estático hand-rolled tem superfície de segurança (path traversal) | Medium | normalização + prefixo obrigatório do root resolvido; testes negativos dedicados (`../`, encoded, absolute) — segurança nunca cortada (parsimony-ladder § guardrail) | implementer |
| Run endpoint gasta tokens reais de LLM do usuário | Medium | defesa same-origin obrigatória antes do run (paridade mountAgent); erro tipado sem key; docs honestas | implementer |
| Dois ambientes de teste (jsdom SPA + node plugin) no mesmo pacote | Low | pragma `@vitest-environment node` por arquivo do plugin; suíte M5 intocada como regressão | implementer |
| Cross-repo (fase 4) depende do ciclo/review do repo theokit | Low | diff mínimo (dep + 1 registro + smoke); e2e local independe dele; se atrasar, M1 fica `PR_OPEN` no theokit sem bloquear o resto | Paulo |

## Unresolved Questions

- Q1 — Qual a assinatura exata de `StreamAgentOptions` e como resolver a API key por provider (convenção de env)? **Método de resolução:** T1.4 passo 1 lê `agent-endpoint.ts` + `createSdkAgentStream` no worktree vivo antes do RED.
- Q2 — O `theokit dev` carrega o vite.config do usuário (permitindo registro manual do plugin sem tocar o theokit)? **Método:** fase 4 passo 1 lê `cli/commands/dev.ts` (createServer options) — afeta só a documentação do caminho alternativo.
- Q3 — `discoverSkills` do SDK funciona a partir do project root do host sem side effects? **Método:** T1.3 valida na fixture demo-project; se não, skills vêm só do `CompiledAgentOptions.skills` (degradação por agent documentada).

## Dependencies

Novas dependências (e mudanças de papel) que o plano introduz. Nenhuma outra é adicionada — serving estático, NDJSON e roteamento são stdlib/hand-rolled mínimos (parsimony rungs 2/6).

| Package | Version | Papel | Rule 9 (Don't Reinvent) — por que esta dep |
|---|---|---|---|
| `tsup` | `^8.5.0` | devDependency (build node do plugin) | builder canônico LOCKED do toolchain do ecossistema (CLAUDE.md § Toolchain); não escrever pipeline esbuild próprio |
| `@theokit/agents` | `^0.39.0` (latest publicado; 0.40.0 é o worktree ainda não released — bridge exports existem desde o M2 do pacote) | peerDependency + devDependency (compile/stream de agents) | única superfície PÚBLICA que normaliza módulos `defineAgent` e streama UIMessages (`compileAgentModule`/`streamAgentUIMessages`) — reimplementar seria duplicar o bridge do ecossistema |
| `@theokit/sdk` | `^3.8.0` | já devDependency; vira TAMBÉM peerDependency do plugin | tipos de eventos (`RunEvent`/`InteractionUpdate`) e `discoverSkills`; já era dep do projeto (rung 4 — reuso) |
| `vite` | `^7.0.0` | já devDependency; declarada peerDependency do plugin | o plugin É um plugin Vite; peer evita duplicar a instância do host |

## Dependency Graph

```
Phase 1 (plugin core: scan+reflection+run) ──▶ Phase 3 (datasource live + playground + e2e)
Phase 2 (SPA embeddable + static serve)    ──▶ Phase 3
Phase 1 ──▶ Phase 2 (static-serve entra no mesmo plugin criado na P1)
Phase 3 ──▶ Phase 4 (cross-repo wiring)   ──▶ Final Phase (Integration Validation)
```

Phase 1 e Phase 2 são sequenciais (P2 estende o plugin da P1). P3 precisa de ambas. P4 precisa do pacote funcional.

---

## Phase 1: Plugin core — reflection API + run endpoint (node-side)

**Objective:** `theokitStudio()` plugin Vite servindo `/_studio/api/*` com enumeração real e run streaming, 100% testado com harness fake-Vite.

### T1.1 — Skeleton do plugin + build node + health endpoint

#### Objective
Criar `packages/studio/plugin/` com o entry `theokitStudio()`, build tsup dedicado, export `./plugin` no package.json, e o primeiro endpoint (`GET /_studio/api/health`).

#### Why this step (action + reasoning — ReAct discipline)
1. **What:** cria a estrutura do plugin (plugin Vite com hook `configureServer` que registra um connect middleware sob `/_studio/api/`), o pipeline de build node (tsup, ESM) e o health endpoint respondendo `{ ok: true, studio: <versão do pacote> }`.
2. **Why now:** tudo da fase 1–2 pende desta fundação; o health é o menor endpoint que prova o plugin registrado e é o mecanismo de detecção de live mode do datasource (blueprint R7 — graceful degradation). D1 fixa o formato (plugin Vite neste repo).

#### Evidence
- Padrão de registro: `../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts:88-127` (middlewares connect em `configureServer`).
- Healthcheck espelha `/__theo/health` (Blueprint §"Recommendations for the project", linha R7).
- Toolchain lock do CLAUDE.md: tsup já é o builder canônico do ecossistema.

#### Files to edit
```
packages/studio/plugin/index.ts (NEW) — theokitStudio(): Plugin; roteador connect /_studio/api
packages/studio/plugin/index.test.ts (NEW) — RED primeiro (node env)
packages/studio/tsup.config.ts (NEW) — entry plugin/index.ts → dist/plugin (esm, dts)
packages/studio/package.json — exports {"./plugin"}, files [dist], scripts build:plugin, peerDeps
packages/studio/vitest.config.ts — incluir plugin/**/*.test.ts (jsdom continua default; plugin usa pragma node)
```

#### Deep file dependency analysis
- `plugin/index.ts`: novo; expõe `theokitStudio(options?: { agentsDir?: string })`. Nenhum import de `src/**` (fronteira declarada em § Architecture boundaries).
- `package.json` (Baseline row 1): ganha `exports` map (`"." → nada por ora; "./plugin" → dist/plugin`), `peerDependencies` (`vite`, `@theokit/agents`, `@theokit/sdk`), devDep `tsup`. Consumidor: fase 4 (theokit) e e2e local.
- `vitest.config.ts` (Baseline row 3): `include` passa a cobrir `plugin/`; testes SPA intactos.

#### Deep Dives
- O middleware é UMA função connect montada em `server.middlewares.use()`, que despacha por prefixo: `/_studio/api/health` → health; demais `/_studio/api/*` → 404 JSON tipado `{ error: { code, message } }` (envelope estável desde o dia 1).
- **EC-1 (MUST FIX absorvido):** o dispatcher parseia `new URL(req.url, "http://local")` e TODA decisão de rota/asset/fallback usa `url.pathname` — nunca `req.url` cru (query string `?tab=tools` e `?v=hash` em assets não podem afetar o match).
- Invariante: requests fora de `/_studio` passam intocados (`next()`), inclusive `/_studioX` (prefixo exige `/` ou fim).

#### Pseudo-code / Signatures
```pseudocode
export function theokitStudio(options?: StudioPluginOptions): Plugin
  return {
    name: "theokit-studio",
    configureServer(server):
      server.middlewares.use((req, res, next) =>
        handleStudioRequest(req, res, next, { server, root: server.config.root, options }))
  }
# handleStudioRequest: prefixo != /_studio → next(); /api/health → 200 {ok:true}; /api/* desconhecido → 404 envelope
```

#### Tasks
1. Escrever testes RED (harness fake-vite: `makeReq/makeRes/runMiddleware` espelhando `api-middleware-coverage.test.ts` do theokit).
2. Implementar `theokitStudio()` mínimo (health + 404 + passthrough).
3. tsup config + scripts (`build` = SPA + plugin) + exports map + peerDeps + **devDependency `@theokit/agents`** (EC-4 — a fixture demo-project e os testes de reflection resolvem o pacote no workspace).
4. Rodar gates (test, typecheck, `pnpm run check` da raiz).

#### TDD
```
RED:     test_health_endpoint_returns_ok_and_version() — GET /_studio/api/health → 200 {ok:true, studio:string}
RED:     test_unknown_api_route_returns_typed_404_envelope() — GET /_studio/api/nope → 404 {error:{code:"NOT_FOUND"}}
RED:     test_non_studio_request_passes_through_untouched() — GET /app chama next() sem tocar res
RED:     test_studio_prefix_requires_boundary() — GET /_studioX/api/health chama next()
RED:     test_dispatch_decides_on_pathname_ignoring_query() — GET /_studio/api/health?x=1 → 200 (EC-1)
GREEN:   plugin mínimo
REFACTOR: extrair router table se o dispatch passar de ~30 linhas
VERIFY:  pnpm --filter @theokit/studio test plugin/index.test.ts
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] `node -e "import('@theokit/studio/plugin')"` (após `pnpm --filter @theokit/studio build`) retorna exit code 0 e o módulo exporta `theokitStudio`
- [ ] `pnpm --filter @theokit/studio test plugin/index.test.ts` retorna exit code 0 com os 5 testes do bloco TDD passando
- [ ] `pnpm run check` (raiz) retorna exit code 0 (zero diagnósticos) nos arquivos alterados
- [ ] `wc -l plugin/index.ts` retorna ≤ 500 linhas

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0 (suíte M5 + novos)
- [ ] `pnpm --filter @theokit/studio typecheck` retorna exit code 0
- [ ] `pnpm run build` (raiz) retorna exit code 0 e escreve `dist/plugin/index.js` + `dist/spa/index.html`
- [ ] `CHANGELOG.md` contém a entry desta task sob `[Unreleased]`

### T1.2 — Agent scan (convenção theokit) + `GET /_studio/api/agents`

#### Objective
`scanStudioAgents()` espelhando a convenção LOCKED + endpoint que carrega cada agent via `ssrLoadModule` e compila com `compileAgentModule`, retornando metadados enumeráveis.

#### Why this step
1. **What:** implementa o scan (walk de `agents/` com exclusões de subpastas de composição e testes) e o endpoint `GET /_studio/api/agents` → `{ items: [{ name, filePath, model?, tools: [{name, description}], skills?, subagents: string[], error? }] }`.
2. **Why now:** é O reflection do DoD ("registry vivo, sem manifest") e a fonte dos endpoints agregados de T1.3. D2 (compileAgentModule) e D3 (scan próprio) decidem o como; a Fase A do blueprint provou que o "registry" do dev theokit É fs+loader (Blueprint §"Coverage Corner 4 — Techniques", subseção do reflection endpoint).

#### Evidence
- Convenção: `../theokit/packages/theo/src/server/scan/agent-scan.ts:52-80` (AGENT_SUBFOLDERS, index colapsado, extensões).
- Compile público: `../theokit/packages/agents/src/bridge/agent-endpoint.ts:58` (`compileAgentModule(mod, source): CompiledAgentOptions`).
- Shape dos tools: `CompiledTool { name, description }` (`agent-compiler.ts:32-34`).
- Genkit retorna schema por action (`references/genkit/js/core/src/reflection.ts:207-238`) — nosso shape espelha com o que o compile expõe.

#### Files to edit
```
packages/studio/plugin/agent-scan.ts (NEW) — scanStudioAgents(root, agentsDir)
packages/studio/plugin/agent-scan.test.ts (NEW) — RED contrato da convenção
packages/studio/plugin/reflection-api.ts (NEW) — handler agents (usa scan + loader + compile)
packages/studio/plugin/reflection-api.test.ts (NEW) — RED endpoint (fake vite com ssrLoadModule stub)
packages/studio/plugin/index.ts — despacho /api/agents
packages/studio/tests/fixtures/demo-project/ (NEW) — agents/support.ts + agents/tools/ignored.ts + agents/nested/index.ts
```

#### Deep file dependency analysis
- `agent-scan.ts`: novo, puro (fs read-only), zero deps além de node:fs/path. Consumido por `reflection-api.ts` e `run-endpoint.ts` (T1.4).
- `reflection-api.ts`: recebe `{ ssrLoadModule }` injetado (DIP — testável com stub; produção usa o ViteDevServer). Falha de load/compile de um agent → entrada `{ name, error: string }` (fail-fast por item, error-handling.md § 2 — nunca lista vazia silenciosa).
- fixture `demo-project`: usada aqui (scan) e no e2e (P3/P4); o agent `support.ts` usa `defineAgent` real do `@theokit/agents`.

#### Deep Dives
- Contrato do scan (espelho de `agent-scan.ts`): extensões `.ts/.js/.mts/.mjs`; exclui `*.test.*`/`*.spec.*`; exclui arquivos sob diretórios `{tools, skills, prompts, subagents, schedules, sandbox, workflows, evals, memory}`; `foo/index.ts` → `foo`; `agents/index.ts` raiz → ignorado.
- Edge cases: `agents/` ausente → `{ items: [] }` + campo `hint: "create agents/<name>.ts"` (honesto, não erro); módulo que lança no import → capturado por item; agent sem model → `model` omitido.
- Invariante: o endpoint NUNCA cacheia entre requests (hot-reload grátis via Vite module graph — mesma razão do theokit escanear por request, `agent-middleware.ts:208`).

#### Pseudo-code / Signatures
```pseudocode
function scanStudioAgents(projectRoot: string, agentsDirName = "agents"): AgentFileNode[]
  // AgentFileNode { name: string; filePath: string }

async function listAgents(deps: {root, agentsDir, load: (file)=>Promise<unknown>}): Promise<ReflectionAgent[]>
  for node in scanStudioAgents(root, agentsDir):
    try: mod = await load(node.filePath); c = compileAgentModule(mod, node.filePath)
         push { name: node.name, filePath: rel, model: c.model, tools: c.tools.map({name,description}),
                subagents: keys(c.agents), skillsEnabled: c.skills?.enabled }
    catch e: push { name: node.name, filePath: rel, error: message(e) }
# input: fixture demo-project → output: items[0].name == "support", items[0].tools == [{name:"lookupOrder",...}]
```

#### Tasks
1. RED do contrato do scan (fixture com subpastas excluídas + index aninhado + teste ignorado).
2. GREEN `scanStudioAgents`.
3. RED do endpoint agents (stub de load: módulo bom, módulo que lança, dir ausente).
4. GREEN `reflection-api.ts` + despacho no index.
5. Gates.

#### TDD
```
RED:     test_scan_discovers_top_level_agents_and_collapses_index() — support + nested/index → ["nested","support"]
RED:     test_scan_excludes_composition_subfolders_and_tests() — tools/ignored.ts e *.test.ts fora
RED:     test_scan_returns_empty_when_agents_dir_missing() — [] sem throw
RED:     test_agents_endpoint_compiles_metadata_per_agent() — tools name+description presentes
RED:     test_agents_endpoint_degrades_per_item_on_broken_module() — 1 quebrado → error naquele item, outros ok
RED:     test_agents_endpoint_hints_when_no_agents_dir() — {items:[], hint}
RED:     test_agent_load_timeout_degrades_that_item() — load que nunca resolve + Promise.race (timeout injetável; 50ms no teste) → {name, error:"load timeout..."}, demais itens ok (EC-6)
GREEN:   scan + handler
REFACTOR: extrair mapeamento CompiledAgentOptions→ReflectionAgent puro (testável sem IO)
VERIFY:  pnpm --filter @theokit/studio test plugin/
```

#### Concurrency tests
(none — single-threaded) — endpoint stateless, um request por teste

#### Acceptance Criteria
- [ ] `pnpm --filter @theokit/studio test plugin/agent-scan.test.ts plugin/reflection-api.test.ts` retorna exit code 0 com os 7 testes do bloco TDD passando
- [ ] O teste de contrato do scan cita `../theokit/packages/theo/src/server/scan/agent-scan.ts` no comentário e a fixture cobre subpasta excluída + index aninhado + `*.test.ts` ignorado
- [ ] `curl http://localhost:PORT/_studio/api/agents` (no e2e T3.2) retorna JSON com `items[0].tools[0].name` preenchido
- [ ] `pnpm run check` (raiz) retorna exit code 0; `wc -l` de cada arquivo novo ≤ 500

#### DoD
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0; `pnpm --filter @theokit/studio typecheck` retorna exit code 0; `CHANGELOG.md` contém a entry sob `[Unreleased]`

### T1.3 — Endpoints agregados: skills, tools, workflows

#### Objective
`GET /_studio/api/skills|tools|workflows` agregando a partir da compilação por agent (+ `discoverSkills` quando disponível), com procedência honesta.

#### Why this step
1. **What:** deriva as três listas agregadas: tools = união deduplicada dos `CompiledTool` de todos os agents (com `usedBy` = contagem de agents); workflows = subagents declarados (`CompiledAgentOptions.agents`) rotulados `source: "subagent"`; skills = `discoverSkills(projectRoot)` do SDK (Q3) com fallback para skills settings por agent.
2. **Why now:** completa o DoD de reflection (agents/tools/skills/workflows) usando exclusivamente superfície pública (D2); o shape alimenta o `ReflectionDataSource` (P3) que mapeia para `ToolSummary.usedBy` já existente na UI (`src/data/types.ts:11-17`).

#### Evidence
- `CompiledAgentOptions.tools/agents/skills` (`agent-compiler.ts` shape citado no baseline).
- `discoverSkills` export: `../theokit-sdk/packages/sdk/src/skills.ts:1-26`.
- UI já modela `usedBy` em `ToolSummary` (`packages/studio/src/data/types.ts:15`).

#### Files to edit
```
packages/studio/plugin/reflection-api.ts — handlers skills/tools/workflows (agregação pura extraída)
packages/studio/plugin/reflection-api.test.ts — RED dos 3 endpoints
packages/studio/tests/fixtures/demo-project/ — segundo agent compartilhando uma tool (dedup/usedBy)
```

#### Deep file dependency analysis
- `reflection-api.ts` (criado em T1.2): ganha 3 handlers + função pura `aggregateReflection(agents: ReflectionAgent[])` (sem IO — unit-test direto). Consumidor: `ReflectionDataSource` (P3).

#### Deep Dives
- Dedup de tools por `name` (a convenção `toolRuntimeName` do bridge garante unicidade namespace.tool — `agent-endpoint.ts:55`).
- Workflows: shape `{ id, name, description?, source: "subagent", agents: string[] }` — honesto sobre a natureza (subagent defs, não instâncias; theokit-sdk#123 citado no campo `source`).
- Skills: se `discoverSkills` lançar/indisponível → `{ items: [...por-agent...], degraded: "discoverSkills unavailable: <msg>" }` (Q3).

#### Pseudo-code / Signatures
```pseudocode
function aggregateReflection(agents: ReflectionAgent[]): { tools: AggTool[]; workflows: AggWorkflow[] }
  tools: Map<name, {name, description, usedBy: Set<agent>}> → array ordenado, usedBy = set.size
# input: support{tools:[lookupOrder]}, billing{tools:[lookupOrder, refund]} →
# output tools: [{name:"lookupOrder", usedBy:2}, {name:"refund", usedBy:1}]
```

#### Tasks
1. RED (agregação pura + 3 endpoints com fixture de 2 agents).
2. GREEN.
3. Gates.

#### TDD
```
RED:     tools_endpoint_dedups_by_name_and_counts_usedBy() — lookupOrder usedBy=2
RED:     test_workflows_endpoint_lists_subagents_with_honest_source() — source=="subagent"
RED:     test_skills_endpoint_degrades_honestly_when_discover_fails() — campo degraded presente, sem throw
GREEN:   aggregateReflection + handlers
REFACTOR: none expected
VERIFY:  pnpm --filter @theokit/studio test plugin/reflection-api.test.ts
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] `pnpm --filter @theokit/studio test plugin/reflection-api.test.ts` retorna exit code 0 com os 3 novos testes passando
- [ ] `aggregateReflection()` é função pura: o teste dela não importa `node:fs` nem cria server (verificável por leitura do arquivo de teste)
- [ ] `pnpm run check` (raiz) retorna exit code 0

#### DoD
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0; `pnpm --filter @theokit/studio typecheck` retorna exit code 0; `CHANGELOG.md` contém a entry sob `[Unreleased]`

### T1.4 — Run endpoint com NDJSON streaming + RunEvents + defesa de origem

#### Objective
`POST /_studio/api/agents/:name/run` streamando `StudioEvent` como NDJSON com abort propagado, RunEvents multiplexados e same-origin obrigatório.

#### Why this step
1. **What:** implementa o run: valida origem (Origin/Host match — paridade com a defesa do mountAgent) e body (`{ message: string }` não-vazio); resolve o agent (scan+load+compile); resolve a API key do env; itera `streamAgentUIMessages(compiled, apiKey, { message, signal })` escrevendo `{kind:"message", chunk}` por linha; injeta `onRunEvent`/canal de RunEvents como `{kind:"run-event", event}`; fecha com `{kind:"done"}`.
2. **Why now:** é o coração do DoD do playground ("chat contra qualquer agente registrado; eventos tipados ao vivo"). D4 fixa transporte e autossuficiência; o passo 1 da task resolve Q1 lendo a assinatura real no worktree vivo ANTES do RED (95% rule).

#### Evidence
- `streamAgentUIMessages(compiled, apiKey, input)` público com abort (`../theokit/packages/agents/src/bridge/agent-endpoint.ts:186-220`).
- Defesa antes de gastar tokens: `../theokit/packages/theo/src/server/agent/mount-agent.ts:85-100` (CSRF strict por default).
- NDJSON chunked provado: `references/genkit/js/core/src/reflection.ts:271-284`.
- Vocabulário de eventos que a UI já renderiza: `packages/studio/src/data/types.ts:230-238`.

#### Files to edit
```
packages/studio/plugin/run-endpoint.ts (NEW) — handler do run
packages/studio/plugin/run-endpoint.test.ts (NEW) — RED (stream fake injetado)
packages/studio/plugin/index.ts — despacho POST /api/agents/:name/run
packages/studio/tests/fixtures/demo-project/agents/support.ts — (já criado em T1.2; reusado)
```

#### Deep file dependency analysis
- `run-endpoint.ts`: novo; recebe deps injetadas `{ loadAgent, streamFactory, env }` (DIP — o teste injeta um stream fake determinístico; produção liga `streamAgentUIMessages`). Consumidor: playground live (P3) e e2e (P3/P4).
- `index.ts`: adiciona rota POST; método errado → 405 envelope.

#### Deep Dives
- **Origem:** request sem `Origin` OU `Origin` cujo host:port == `Host` do request → permitido (same-origin dev); caso contrário — **incluindo o literal `Origin: null` (opaque origin, EC-8)** — 403 `ORIGIN_FORBIDDEN` ANTES de qualquer load/compile.
- **Rota (EC-2 MUST FIX):** match por prefixo/sufixo, não por segmento: `name = decodeURIComponent(pathname.slice(len("/_studio/api/agents/"), -len("/run")))` — nomes aninhados com `/` (`team/support`, paridade com `agent-scan.ts` do theokit) funcionam; decode embrulhado (URIError → 400, EC-5).
- **Write guard (EC-7):** TODA escrita (loop de chunks E callback `onRunEvent`) passa por `writeLine` com guard `res.writableEnded` — evento tardio pós-done/abort é descartado sem throw.
- **API key:** resolução por env do processo dev (mapa provider→var: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, ... conforme model do compiled; verificado no passo 1). Ausente → 424 `PROVIDER_KEY_MISSING` com a var esperada na mensagem (fail-clear).
- **Abort:** `req.on('close')` → `AbortController.abort()` → o generator termina; nenhuma escrita pós-close (guard `res.writableEnded`).
- **Formato de linha:** `JSON.stringify({kind, ...}) + "\n"`; headers `Content-Type: application/x-ndjson`, `Transfer-Encoding: chunked`, `Cache-Control: no-store`.
- Edge cases: agent inexistente → 404; body sem message → 400; erro mid-stream → linha `{kind:"error", error:{code,message}}` e end (nunca swallow).

#### Pseudo-code / Signatures
```pseudocode
async function handleRun(req, res, deps):
  if not sameOrigin(req): return json(res, 403, ORIGIN_FORBIDDEN)
  body = await readJson(req); if !body.message?.trim(): return json(res, 400, BAD_REQUEST)
  agent = resolveAgent(name); if !agent: return json(res, 404, AGENT_NOT_FOUND)
  key = resolveApiKey(agent.compiled, deps.env); if !key: return json(res, 424, PROVIDER_KEY_MISSING)
  ctrl = new AbortController(); req.on("close", () => ctrl.abort())
  writeHead(200, ndjsonHeaders)
  for await (chunk of deps.streamFactory(agent.compiled, key, {message, signal: ctrl.signal, onRunEvent: e => writeLine({kind:"run-event", event:e})})):
    writeLine({kind:"message", chunk})
  writeLine({kind:"done"}); res.end()
# input: {message:"hi"} → output lines: {kind:"message",...}×N, {kind:"run-event",...}×M, {kind:"done"}
```

#### Tasks
1. **Spike Q1 (leitura, sem código):** ler `StreamAgentOptions` + `createSdkAgentStream` no worktree vivo; registrar no log de implementação o mapa provider→env-var e onde `onRunEvent` se encaixa (se não houver seam público de RunEvent no bridge, degradar honesto: só `{kind:"message"}` + issue no theokit — decisão documentada).
2. RED com stream fake.
3. GREEN handler + despacho.
4. Gates.

#### TDD
```
RED:     test_run_streams_ndjson_message_chunks_then_done() — 2 chunks fake → 3 linhas parseáveis
RED:     test_run_multiplexes_run_events_inline() — onRunEvent fake → linha kind=run-event
RED:     test_cross_origin_request_rejected_before_any_work() — Origin externo → 403, loadAgent NÃO chamado
RED:     test_missing_api_key_returns_424_with_expected_var() — env vazio → 424 + nome da var
RED:     test_blank_message_rejected_400() — fail-fast na fronteira
RED:     test_unknown_agent_404() — envelope tipado
RED:     test_mid_stream_error_emits_error_line_and_ends() — generator lança após 1 chunk → linha kind=error, res ended
RED:     test_nested_agent_name_with_slash_resolves() — POST /_studio/api/agents/team%2Fsupport/run e /team/support/run → agent aninhado encontrado (EC-2)
RED:     test_opaque_origin_null_rejected_403() — header literal "null" → 403 (EC-8)
RED:     test_run_event_after_end_is_dropped_by_guard() — onRunEvent após done → nenhuma escrita, sem throw (EC-7)
GREEN:   handler
REFACTOR: extrair writeLine/readJson utilitários
VERIFY:  pnpm --filter @theokit/studio test plugin/run-endpoint.test.ts
```

#### Concurrency tests
`client_disconnect_aborts_the_stream()` — fecha o req após o 1º chunk; assert: `signal.aborted === true`, nenhuma escrita após close (`res.writableEnded` respeitado), generator finalizado (finally executado). Shape: cancellation propagation — o run é async streaming com AbortSignal.

#### Acceptance Criteria
- [ ] `pnpm --filter @theokit/studio test plugin/run-endpoint.test.ts` retorna exit code 0 com os 11 testes do bloco TDD (incl. concorrência) passando
- [ ] O teste `cross_origin_request_rejected_before_any_work` asserta que o spy `loadAgent` retorna 0 chamadas quando a resposta é 403
- [ ] Cada linha escrita no response parseia com `JSON.parse` e contém o campo `kind` (assert no teste de streaming)
- [ ] `pnpm run check` (raiz) retorna exit code 0; `wc -l plugin/run-endpoint.ts` ≤ 500

#### DoD
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0; `pnpm --filter @theokit/studio typecheck` retorna exit code 0; `CHANGELOG.md` contém a entry sob `[Unreleased]`

---

## Phase 2: SPA embarcável + static serving

**Objective:** SPA buildada com `base: './'` para `dist/spa`, servida pelo plugin em `/_studio` com fallback SPA e injeção de config.

### T2.1 — Build embarcável da SPA (base relativa, outDir, basename do router)

#### Objective
`vite build` da SPA produz `dist/spa` com assets relativos; o router aceita basename `/_studio`; bootstrap ganha `mode`/`basePath` no config com fallback compatível.

#### Why this step
1. **What:** configura `base: './'` e `outDir: 'dist/spa'` no vite.config; estende `StudioConfig` com `{ mode: "fixtures" | "live"; basePath?: string }` (parse EC-8 com fallback `mode:"fixtures"`); `mount()` passa `basename` ao `createBrowserRouter`.
2. **Why now:** pré-requisito do serving (T2.2) e do live mode (P3). Padrão provado no blueprint D2 (Mastra `base './'` — assets funcionam sob qualquer prefixo).

#### Evidence
- `references/mastra/packages/playground/vite.config.ts:221` (`base: './'`).
- Seam existente: `packages/studio/src/bootstrap.ts:11-31` (parse defensivo; comentário "M1 troca por adapter real").
- Router hoje sem basename: `packages/studio/src/main.tsx:22`.

#### Files to edit
```
packages/studio/vite.config.ts — base './', build.outDir 'dist/spa'
packages/studio/src/bootstrap.ts — StudioConfig + parse de mode/basePath (fallback compatível)
packages/studio/src/bootstrap.test.ts (ou existente) — RED parse novo
packages/studio/src/main.tsx — basename no createBrowserRouter
packages/studio/package.json — files inclui dist
```

#### Deep file dependency analysis
- `bootstrap.ts` (Baseline): `parseStudioConfig` mantém TODOS os comportamentos atuais (config ausente → default; malformada → warn+fallback) e adiciona campos novos com o MESMO rigor de validação — testes M5 do parse continuam passando sem edição (invariante EC-8).
- `main.tsx` (Baseline): `mount` continua com a mesma assinatura; basename derivado de `config.basePath ?? ""` (dev standalone continua na raiz).

#### Deep Dives
- Edge: `basePath` sem barra inicial ou com trailing slash → normalizado; valor não-string → ignorado com warn (mesmo padrão de scenario).
- Backward compat: `window.__STUDIO_CONFIG__ = { scenario: "empty" }` (shape M5) continua válido → `mode:"fixtures"`.

#### Tasks
1. RED do parse estendido + basename.
2. GREEN.
3. Ajustar vite.config + package files; `pnpm --filter @theokit/studio build` e inspecionar dist/spa (assets relativos).
4. Gates.

#### TDD
```
RED:     test_parse_accepts_live_mode_and_base_path() — {mode:"live", basePath:"/_studio"} → preservado
RED:     test_parse_defaults_mode_fixtures_for_m5_shape() — {scenario:"empty"} → mode fixtures, scenario empty
RED:     test_parse_normalizes_malformed_base_path_with_warn() — 42 → basePath undefined + warn 1×
RED:     test_mount_wires_router_basename_from_config() — basename chega ao createBrowserRouter (spy/route resolve)
GREEN:   parse + mount
REFACTOR: none expected
VERIFY:  pnpm --filter @theokit/studio test src/bootstrap
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] `grep './assets/' dist/spa/index.html` retorna match após `pnpm --filter @theokit/studio build` (assets relativos)
- [ ] `pnpm --filter @theokit/studio test src/bootstrap` retorna exit code 0 com os 4 novos testes + os testes M5 do parse passando sem edição dos M5
- [ ] `pnpm run check` (raiz) retorna exit code 0

#### DoD
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0; `pnpm --filter @theokit/studio typecheck` retorna exit code 0; `pnpm --filter @theokit/studio build` retorna exit code 0; `CHANGELOG.md` contém a entry sob `[Unreleased]`

### T2.2 — Static serving da SPA em `/_studio` (fallback + injeção de config + segurança)

#### Objective
O plugin serve `dist/spa` sob `/_studio`: assets estáticos com content-type correto, fallback de rota para `index.html` com `window.__STUDIO_CONFIG__` injetado, e proteção contra path traversal.

#### Why this step
1. **What:** adiciona `static-serve.ts` ao plugin: resolução do dir da SPA (env override `THEOKIT_STUDIO_DIST` → senão dist do próprio pacote via `new URL('../spa', import.meta.url)`), handler de assets com normalização estrita, e fallback catch-all `/_studio/*` (não-api, sem extensão) → `index.html` com `<script>window.__STUDIO_CONFIG__={mode:"live",basePath:"/_studio"}</script>` injetado antes de `</head>`.
2. **Why now:** completa o DoD "SPA served at /_studio same-origin". Padrão = blueprint D2 (Mastra: env override + `__dirname` fallback + catch-all com injeção de config, `deployer/src/server/index.ts:33-46,424-506`); segurança de path é guardrail inegociável (parsimony-ladder § never on the chopping block).

#### Evidence
- Resolução + injeção: `references/mastra/packages/deployer/src/server/index.ts:33-46` e `:424-506`.
- Fallback SPA do Genkit: `references/genkit/genkit-tools/common/src/server/server.ts:358-360`.
- Primitiva análoga no ecossistema: `../theokit/packages/theo/src/server/http/static.ts:30-60` (não importável — internal; reimplementação mínima com testes de segurança).

#### Files to edit
```
packages/studio/plugin/static-serve.ts (NEW) — resolveSpaDir + serveStudioAsset + serveIndexWithConfig
packages/studio/plugin/static-serve.test.ts (NEW) — RED (dir temporário com spa fake)
packages/studio/plugin/index.ts — despacho /_studio não-api → static
```

#### Deep file dependency analysis
- `static-serve.ts`: novo; fs read-only; content-type map mínimo (html/js/css/svg/png/ico/json/map/woff2). Consumido pelo dispatch do index.
- `index.ts`: ordem de despacho vira: `/api/*` → reflection/run; senão asset existente → serve; senão sem extensão → index.html injetado; senão 404.

#### Deep Dives
- **Traversal guard:** `path.normalize(join(spaDir, urlPath))` DEVE começar com `spaDir + sep`; caso contrário 403. Cobre `../`, `%2e%2e` (decodificar antes), absolutos. Decode embrulhado: percent-encoding malformado (`/%`) → 400 tipado, nunca URIError não-tratada (EC-5).
- **Resolução dual do spa dir (EC-10):** a resolução relativa (`new URL('../spa', import.meta.url)`) precisa funcionar no layout BUILDADO (`dist/plugin/index.js` → `dist/spa/`); teste contra layout simulado em dir temporário além do env override.
- **Injeção:** substituição única de `</head>`; config serializado com `JSON.stringify` (sem interpolação crua).
- Edge: dist ausente (plugin instalado sem build) → 503 `STUDIO_ASSETS_MISSING` com hint de build (fail-clear, não tela branca).

#### Pseudo-code / Signatures
```pseudocode
function resolveSpaDir(env): string  # env.THEOKIT_STUDIO_DIST ?? new URL("../spa", import.meta.url)
function safeJoin(root, urlPath): string | null  # null → 403
async function serveStudio(req,res,{spaDir,config}): asset | indexWithConfig | 404
```

#### Tasks
1. RED com spa fake em dir temporário (index.html + asset).
2. GREEN.
3. Gates.

#### TDD
```
RED:     test_serves_existing_asset_with_content_type() — /_studio/assets/app.js → 200 text/javascript
RED:     test_spa_fallback_serves_index_with_injected_config() — /_studio/agents → HTML com __STUDIO_CONFIG__ mode live
RED:     test_path_traversal_attempts_rejected() — /_studio/../secret e %2e%2e → 403, arquivo NÃO lido
RED:     test_missing_dist_returns_actionable_503() — spaDir inexistente → 503 STUDIO_ASSETS_MISSING
RED:     test_env_override_wins_for_spa_dir() — THEOKIT_STUDIO_DIST aponta dir alternativo
RED:     test_malformed_percent_encoding_returns_400_not_500() — GET /_studio/% → 400 envelope (EC-5)
RED:     test_resolve_spa_dir_works_from_built_layout() — layout dist/plugin + dist/spa simulado (EC-10)
RED:     test_asset_with_query_string_still_resolves() — /_studio/assets/app.js?v=1 → 200 (EC-1)
GREEN:   static-serve + dispatch
REFACTOR: none expected
VERIFY:  pnpm --filter @theokit/studio test plugin/static-serve.test.ts
```

#### Concurrency tests
(none — single-threaded) — handlers stateless por request

#### Acceptance Criteria
- [ ] `pnpm --filter @theokit/studio test plugin/static-serve.test.ts` retorna exit code 0 com os 8 testes do bloco TDD passando
- [ ] O teste de traversal asserta que o conteúdo do arquivo fora do root NUNCA aparece no body da resposta (assert de não-leitura via spy/conteúdo sentinela)
- [ ] O HTML servido no fallback contém a string `window.__STUDIO_CONFIG__` com `mode:"live"` (assert por `contains`)
- [ ] `pnpm run check` (raiz) retorna exit code 0; `wc -l plugin/static-serve.ts` ≤ 500

#### DoD
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0; `pnpm --filter @theokit/studio typecheck` retorna exit code 0; `CHANGELOG.md` contém a entry sob `[Unreleased]`

---

## Phase 3: Live datasource + playground + e2e

**Objective:** SPA em live mode consumindo a reflection de verdade; playground streamando run real; e2e provando a cadeia inteira.

### T3.1 — `ReflectionDataSource` + composição híbrida no composition root

#### Objective
Adapter live implementando o subset reflection do `StudioDataSource` (fetch + NDJSON parser) e o composition root escolhendo fixtures/híbrido por `config.mode`.

#### Why this step
1. **What:** cria `reflection-datasource.ts` (react-free, metric-counted como o fixture adapter): `listAgents/listTools/listSkills/listWorkflows/health` via `GET /_studio/api/*`; `runAgent` via POST NDJSON → `AsyncIterable<StudioEvent>` com AbortSignal; demais métodos delegam ao `FixtureDataSource` injetado (D5). `main.tsx` monta o composto quando `mode === "live"`.
2. **Why now:** é a troca de adapter que o M5 preparou (DIP — zero mudança nas páginas); depende dos endpoints (P1) e do config (T2.1). D5 fixa a composição honesta.

#### Evidence
- Seam: `packages/studio/src/main.tsx:11-14` ("M1 troca por adapter real"), `src/data/datasource.ts:24-26`.
- Vocabulário de eventos já compatível: `src/data/types.ts:230-238`.
- Métrica obrigatória por operação: padrão do fixture adapter (`src/data/fixture-datasource.ts`, todas metric-counted) — wiring triad pilar (c).

#### Files to edit
```
packages/studio/src/data/reflection-datasource.ts (NEW) — adapter + parser NDJSON
packages/studio/src/data/reflection-datasource.test.ts (NEW) — RED (fetch stubado)
packages/studio/src/data/types.ts — ServiceName += "studio" (EC-3, aditivo)
packages/studio/src/data/fixture-datasource.ts — health map ganha entrada studio (EC-3)
packages/studio/src/main.tsx — escolha fixtures/híbrido por mode
packages/studio/src/app/shell.tsx — banner distingue "Live reflection" vs fixtures (texto honesto)
```

#### Deep file dependency analysis
- `reflection-datasource.ts`: implementa `StudioDataSource` completo (delegação interna ao fixture para superfícies não-reflection — decorator, OCP); erros de fetch → rejeição com mensagem acionável (páginas já renderizam `role=alert` — testes M5 de loadError provam).
- `main.tsx` (Baseline): troca de ~6 linhas; `__STUDIO_METRICS__` intacto.
- `shell.tsx` (Baseline): SÓ o texto/variante do banner (mode vem por prop/context mínimo) — navegação intocada.

#### Deep Dives
- Parser NDJSON: reader do `fetch` body, split por `\n`, buffer de linha parcial, `JSON.parse` por linha; linha malformada → erro tipado `MalformedStreamLineError` com a linha no contexto (fail-clear).
- Mapeamentos: reflection agent → `AgentSummary { id: name, name, description: systemPrompt truncado? NÃO — description honesta: filePath }`; tool agregada → `ToolSummary { usedBy }`; workflow → `WorkflowSummary` com descrição contendo `source: subagent`.
- `health()` (EC-3 MUST FIX): `ServiceName` (types.ts:216) é estendido ADITIVAMENTE com `"studio"`; em live mode: `studio: online` quando `GET /_studio/api/health` responde, e `memory/lens/rag: offline` com hint `theokit studio up` (honesto — theo-data é M2/M3); fetch do health falhou → `studio: offline` com hint do dev server. `FixtureDataSource` ganha a entrada `studio` no seu health map (testes M5 de health ajustados aditivamente).
- Mapeamento de agent quebrado (EC-9): entrada da reflection com `error` vira `AgentSummary` com `description` prefixada `"⚠ failed to load: <msg>"` — visível e honesto na lista, nunca mascarado.
- Edge: `runAgent` com `{kind:"error"}` na stream → lança erro tipado após yield dos anteriores; `{kind:"done"}` encerra.

#### Pseudo-code / Signatures
```pseudocode
export function createReflectionDataSource(opts: {baseUrl?: string; fallback: StudioDataSource; fetchImpl?}): StudioDataSource
async function* parseNdjson(body: ReadableStream, signal?): AsyncGenerator<RunLine>
# runAgent: yield line.kind==="message" → chunk como StudioEvent; "run-event" → event; "error" → throw typed
```

#### Tasks
1. RED do parser NDJSON (chunks quebrados no meio da linha; malformada; done).
2. RED do adapter (fetch stub por endpoint; delegação ao fallback; métricas contadas).
3. GREEN adapter + parser.
4. RED/GREEN do composition root (mode live → agents vêm do fetch stub; prompts vêm do fixture).
5. Banner live/fixtures.
6. Gates.

#### TDD
```
RED:     test_ndjson_parser_handles_split_lines_across_chunks() — chunk corta no meio do JSON
RED:     test_ndjson_malformed_line_raises_typed_error_with_context() — MalformedStreamLineError
RED:     test_list_agents_maps_reflection_payload_to_agent_summary() — id/name/model
RED:     test_run_agent_yields_message_and_run_event_lines_and_stops_on_done()
RED:     test_run_agent_error_line_raises_after_prior_events()
RED:     test_non_reflection_surfaces_delegate_to_fixture_fallback() — listPrompts → fixture + métrica
RED:     test_health_offline_when_fetch_rejects() — estado offline, sem throw na UI
RED:     test_composition_root_selects_hybrid_in_live_mode() — mount com mode live
RED:     test_every_reflection_call_counts_datasource_metric() — datasource_calls_total incrementa
RED:     test_ndjson_parser_flushes_trailing_line_without_newline() — última linha sem \n ainda é yielded (EC-11)
RED:     test_broken_agent_maps_with_visible_error_marker() — description "⚠ failed to load: ..." (EC-9)
RED:     test_health_studio_online_theo_data_offline_in_live_mode() — studio online + memory/lens/rag offline com hint (EC-3)
GREEN:   adapter + root
REFACTOR: extrair mapeadores puros payload→Summary
VERIFY:  pnpm --filter @theokit/studio test src/data/reflection-datasource.test.ts
```

#### Concurrency tests
`abort_signal_cancels_run_agent_iteration()` — abort após o 1º evento; assert: reader cancelado, iteração termina (return), nenhuma linha processada após o abort. Shape: cancellation propagation.

#### Acceptance Criteria
- [ ] `pnpm --filter @theokit/studio test src/data/reflection-datasource.test.ts` retorna exit code 0 com os 13 testes do bloco TDD (incl. concorrência) passando
- [ ] `git diff --stat -- packages/studio/src/pages` retorna vazio nesta task (zero mudanças em páginas — DIP provado)
- [ ] `metrics.snapshot().datasource_calls_total.listAgents` retorna ≥ 1 no teste de métricas (wiring pilar c)
- [ ] `pnpm run check` (raiz) retorna exit code 0; `wc -l src/data/reflection-datasource.ts` ≤ 500

#### DoD
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0 (M5 + novos); `pnpm --filter @theokit/studio typecheck` retorna exit code 0; `CHANGELOG.md` contém a entry sob `[Unreleased]`

### T3.2 — e2e: Vite server real + fixture demo-project (métrica do Goal)

#### Objective
Teste e2e `studio_e2e_reflection_and_run` subindo `createServer` do Vite com `theokitStudio()` na fixture `demo-project`, exercitando reflection + static + run de ponta a ponta.

#### Why this step
1. **What:** e2e node-env: sobe o dev server real (port 0), asserta `GET /_studio/api/health` (200), `GET /_studio/api/agents` (agent da fixture com tools), `GET /_studio/agents` (HTML com config injetado), e `POST .../run` com um **stream stub determinístico** injetado por env de teste (LLM real fora de teste — determinismo, `testing.md § 6`); mede a métrica do Goal.
2. **Why now:** é o oráculo do Goal e o teste de integração da fronteira (`testing.md § 2` — boundaries com implementações reais: Vite real, fs real, HTTP real; só o LLM stubado). Espelha o harness do theokit (`cli-dev.test.ts` real server + `safe-close`).

#### Evidence
- Harness real-server do ecossistema: `../theokit/tests/unit/cli-dev.test.ts:15-45`.
- Blueprint §"Coverage Corner 1 — Integration Tests" (subseção theokit/Q5): fixture real + port 0 + teardown com timeout.

#### Files to edit
```
packages/studio/tests/e2e/studio-e2e.test.ts (NEW) — o e2e (pragma node, timeout maior)
packages/studio/tests/fixtures/demo-project/ — vite.config? não: server montado programaticamente
packages/studio/plugin/run-endpoint.ts — seam de injeção do streamFactory (já em T1.4 via deps)
packages/studio/vitest.config.ts — include tests/e2e
```

#### Deep file dependency analysis
- `studio-e2e.test.ts`: usa `createServer` de `vite` (devDep existente) com `plugins: [theokitStudio(...)]`, `root: fixture`; `THEOKIT_STUDIO_DIST` aponta um spa fake mínimo (não exige build da SPA no teste — o build real é validado na Integration Validation).
- Streaming determinístico: o plugin aceita `options.streamFactory` (injetado no e2e) — mesma seam DIP de T1.4.

#### Deep Dives
- Teardown: `server.close()` com race de timeout (padrão `safe-close.ts` do theokit).
- O run real com LLM fica FORA do e2e (custo/flake); a Integration Validation inclui um smoke manual documentado com key real (evidência de dogfood, não gate de CI).

#### Tasks
1. RED e2e (4 asserts).
2. Ajustes GREEN (o que faltar de wiring).
3. Gates.

#### TDD
```
RED:     test_studio_e2e_reflection_and_run() — health 200; agents contém "support" com tools;
         GET /_studio/agents devolve HTML com __STUDIO_CONFIG__ live; POST run → ≥1 linha kind=message e linha done
GREEN:   wiring restante
REFACTOR: none expected
VERIFY:  pnpm --filter @theokit/studio test tests/e2e/
```

#### Concurrency tests
(none — single-threaded) — a cancellation do stream já é coberta em T1.4/T3.1

#### Acceptance Criteria
- [ ] `pnpm --filter @theokit/studio test tests/e2e/` retorna exit code 0 em < 20s de wall-clock
- [ ] O servidor sobe com `port: 0` e o teste lê a porta efetiva do server (sem porta hardcoded)
- [ ] O teardown fecha o server com race de timeout (padrão `safe-close`) — sem handles abertos (vitest não pendura)
- [ ] `pnpm run check` (raiz) retorna exit code 0

#### DoD
- [ ] `pnpm --filter @theokit/studio test` retorna exit code 0; `pnpm --filter @theokit/studio typecheck` retorna exit code 0; `CHANGELOG.md` contém a entry sob `[Unreleased]`

---

## Phase 4: Cross-repo wiring no theokit dev

**Objective:** `theokit dev` monta o Studio por default (dep + registro no vite-plugin), fechando o DoD "reflection endpoint no dev server".

### T4.1 — Registro do plugin no theokit + smoke test (repo ../theokit)

#### Objective
Adicionar `@theokit/studio` como dependência do `theokit` e registrar `theokitStudio()` na composição de plugins do dev, com teste no repo theokit.

#### Why this step
1. **What:** no repo `../theokit` (branch develop deles, convenções deles): adiciona a dependência (workspace/link em dev), registra o plugin em `theoPluginAsync`/`configure-server-hook` (1-3 linhas), e um teste unit no padrão deles (`tests/unit/`) assertando `GET /_studio/api/health` 200 sob `startDevServer` da fixture existente.
2. **Why now:** DoD do M1 exige o endpoint NO dev server do theokit; D1 encolheu isto para diff mínimo. Depende do pacote publicável (P1–P3 prontos). Q2 (vite.config do usuário) é verificada aqui e vira documentação do caminho alternativo.

#### Evidence
- Ponto de registro: `../theokit/packages/theo/src/vite-plugin/configure-server-hook.ts:88-127` / `index.ts:413-437`.
- Harness deles: `../theokit/tests/unit/cli-dev.test.ts:15-45`.

#### Files to edit
```
../theokit/packages/theo/package.json — dependência @theokit/studio (CROSS-REPO)
../theokit/packages/theo/src/vite-plugin/index.ts OU configure-server-hook.ts — registro (CROSS-REPO)
../theokit/tests/unit/cli-dev-studio.test.ts (NEW, CROSS-REPO) — smoke /_studio/api/health
```

#### Deep file dependency analysis
- Diff no theokit é aditivo (novo plugin no array + dep); ordem: registrado ANTES do api-middleware genérico para `/_studio/api/*` não cair no 404 deles (evidência da ordem em `configure-server-hook.ts:88-127`).
- Commit no repo theokit segue as regras DELES (CHANGELOG deles, gates deles); este plano só fixa o escopo do diff.

#### Deep Dives
- Versionamento: até o `@theokit/studio` ser publicado no npm, o link é workspace/`file:`/pnpm overrides — o smoke roda contra o build local. A publicação real acontece no `/release` deste repo (changesets já configurado).
- Se o ciclo do theokit bloquear o merge imediato: o M1 deste repo fecha com e2e local verde + PR aberto lá (estado honesto reportado; checkbox do ROADMAP só flipa com o DoD completo — decisão do humano no release).

#### Tasks
1. Verificar Q2 (dev.ts: configFile do usuário?) e registrar a resposta no log.
2. RED no repo theokit (smoke test).
3. GREEN (dep + registro).
4. Gates do repo theokit (typecheck/lint/test deles) + CHANGELOG deles.

#### TDD
```
RED:     test_theokit_dev_serves_studio_health() — startDevServer(fixture onda1-hello-theo) → GET /_studio/api/health 200
GREEN:   dep + registro
REFACTOR: none expected
VERIFY:  (no repo theokit) pnpm test tests/unit/cli-dev-studio.test.ts
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] (no repo theokit) `pnpm test tests/unit/cli-dev-studio.test.ts` retorna exit code 0 — `GET /_studio/api/health` responde 200 sob `startDevServer`
- [ ] `git -C ../theokit diff --stat` do wiring retorna ≤ ~30 linhas alteradas (dep + registro + teste)
- [ ] Os gates do repo theokit (`pnpm typecheck`, lint deles, testes tocados) retornam exit code 0 no diff

#### DoD
- [ ] Commit no develop do theokit (ou PR aberto — estado reportado honestamente no log de implementação)
- [ ] `CHANGELOG.md` do theokit contém a entry (convenção deles)

---

## Coverage Matrix

| # | Gap / Requirement (ROADMAP § M1 DoD + blueprint) | Task(s) | Resolution |
|---|---|---|---|
| 1 | Reflection endpoint expondo registry vivo (agents) sem manifest | T1.1, T1.2 | plugin + scan + ssrLoadModule + compileAgentModule por request |
| 2 | Reflection de tools/skills/workflows | T1.3 | agregação via CompiledAgentOptions + discoverSkills; procedência honesta |
| 3 | Chat playground contra agente registrado com eventos tipados live | T1.4, T3.1 | run endpoint NDJSON + RunEvents; adapter runAgent AsyncIterable |
| 4 | SPA servida em `/_studio` same-origin | T2.1, T2.2 | base './' + dist embarcado + static serve + fallback + config injetado |
| 5 | Works with Docker absent / graceful degradation | T3.1 (health/offline), D5 | híbrido honesto; offline instrui; 503 acionável sem dist |
| 6 | Troca do adapter fixtures→real via DIP sem tocar páginas | T3.1 | ReflectionDataSource decorando FixtureDataSource |
| 7 | Endpoint no dev server DO theokit (DoD literal) | T4.1 | dep + registro + smoke no repo theokit |
| 8 | Prova end-to-end (métrica do Goal) | T3.2 | e2e Vite real + fixture |
| 9 | Segurança: origem no run; traversal no static | T1.4, T2.2 | testes negativos dedicados |
| 10 | Blueprint R5 — procedência honesta do gap SDK na reflection agregada | T1.3 | workflows expõem `source: "subagent"` citando theokit-sdk#123 (issue já aberta no discover); D2 supera o gap para o caso dev |

**Coverage: 10/10 gaps covered (100%)**

## Global Definition of Done

- [ ] Todas as fases completas (P1→P4 + Integration Validation)
- [ ] Todos os testes passando — `pnpm --filter @theokit/studio test` verde (suíte M5 + ~35 novos)
- [ ] Zero type errors — `pnpm --filter @theokit/studio typecheck`
- [ ] Zero lint — `pnpm run check` (RAIZ — gate canônico)
- [ ] File-size budget ≤ 500 LoC por arquivo (`architecture.md`)
- [ ] CHANGELOG.md `[Unreleased]` atualizado por mudança (Unbreakable Rule 6)
- [ ] Backward compat: shape M5 de `__STUDIO_CONFIG__` continua válido; interface `StudioDataSource` inalterada
- [ ] **Runtime-metric proof:** `datasource_calls_total.listAgents` (reflection) e `runAgent` observados não-zero no e2e/teste de composition root
- [ ] Fronteira plugin↔SPA sem imports cruzados (grep no review)
- [ ] Plan archived após merge do PR de release

## Failure scenarios (when I/O external)

| Dependency | Failure mode | How the test reproduces it | Expected behavior |
|---|---|---|---|
| fetch SPA → reflection API (HTTP) | dev server ausente / fetch reject | stub de fetch rejeitando (T3.1 `health_offline_when_fetch_rejects`) | estado offline honesto; UI instrui; sem throw não-tratado |
| fetch SPA → run stream (HTTP) | linha NDJSON malformada mid-stream | parser recebe linha inválida (T3.1) | `MalformedStreamLineError` com contexto; eventos anteriores preservados |
| fetch SPA → run stream (HTTP) | erro do agent mid-stream | linha `{kind:"error"}` (T3.1) | erro tipado após yields; playground mostra erro no chat (UI existente) |
| plugin → fs (agents/) | dir ausente / módulo quebrado | fixture sem dir; módulo que lança (T1.2) | `{items:[], hint}`; degradação por item com `error` |
| plugin → fs (dist SPA) | dist ausente | spaDir inexistente (T2.2) | 503 `STUDIO_ASSETS_MISSING` com hint de build |
| plugin → LLM provider (via SDK) | API key ausente | env vazio (T1.4) | 424 `PROVIDER_KEY_MISSING` nomeando a var |
| plugin → LLM provider | cliente desconecta mid-run | close do req (T1.4 concurrency) | abort propagado; sem escrita pós-close; generator finalizado |
| requests cross-origin ao run | Origin externo | header Origin forjado (T1.4) | 403 antes de qualquer trabalho |

## Final Phase: Integration Validation (MANDATORY)

**Objective:** validar a cadeia completa em workload real.

### Execution

```
pnpm --filter @theokit/studio test              # unit + integration + e2e
pnpm --filter @theokit/studio test:coverage     # ≥ 90% nos arquivos alterados
pnpm --filter @theokit/studio typecheck
pnpm run check                                  # lint canônico (RAIZ)
pnpm run build                                  # SPA (dist/spa) + plugin (dist/plugin)
```

Chaos/failure pass: os cenários de `## Failure scenarios` são exercitados pelos testes citados em cada linha (T1.2/T1.4/T2.2/T3.1) — re-rodados na suíte completa.

Smoke real (evidência dogfood, não gate de CI): subir o e2e server manualmente OU `theokit dev` na fixture (pós-P4) com key real e conversar com o agent no playground — registrar em `knowledge-base/dogfood/evidence/` se o run real for executado.

### Acceptance Criteria

- [ ] Suítes verdes (unit + integration + e2e)
- [ ] Coverage ≥ 90% nos arquivos alterados (críticos: parser NDJSON, traversal guard, run handler → 100%)
- [ ] Zero type errors; zero lint (gate raiz)
- [ ] Runtime-metric proof observado (métricas não-zero)
- [ ] Failure scenarios todos exercitados
- [ ] `pnpm run build` produz artefatos embarcáveis (dist/spa com base relativa + dist/plugin ESM)

### If Validation Fails

1. Separar falhas causadas pelo plano vs pré-existentes.
2. Corrigir todas as causadas pelo plano antes de declarar completo.
3. Re-rodar a cadeia.
4. Pré-existentes: logar no PR, não bloqueiam.
