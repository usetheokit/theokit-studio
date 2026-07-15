---
slug: studio-ux-shell
milestone_id: M5
created_at: 2026-07-14
goal: Entregar a SPA packages/studio com 5 superfícies navegáveis sobre fixtures, verificada por suite Vitest verde + typecheck + lint no monorepo
---

# Plan: Studio UX shell — 5 superfícies sobre fixtures (M5)

> **Version 1.1** (2026-07-14 — 2 MUST-FIX + 6 SHOULD-TEST absorvidos de
> `knowledge-base/reviews/studio-ux-shell-plan-edge-cases-2026-07-14.md`)
>
> Cria o pacote `packages/studio` (SPA React + Vite + `@theokit/ui`) com
> Playground, Event Inspector, Memory, Knowledge e Traces-placeholder navegáveis sobre uma
> camada de dados fixture-backed (`StudioDataSource`, DIP), estados
> empty/loading/offline em toda tab backed-by-serviço, e suite de testes
> unit/component verde. Nada é descartável: M1/M2/M3 trocam a implementação da
> DataSource sem tocar as telas.

## Goal

Enable desenvolvedores TheoKit a navegar e iterar a experiência completa do Studio
(5 superfícies) sem Docker e sem serviços, so that a UX do M5 é validável e o M1 herda o
shell pronto, measured by `pnpm -r test` + `pnpm -r typecheck` + `pnpm check` verdes no
monorepo com as 5 rotas renderizando em testes de componente (incluindo os estados
empty/loading/offline de cada tab de serviço).

## Context

O ROADMAP § M5 (grill `knowledge-base/grills/studio-ux-shell-feature-grill.md`) decidiu
UX-first: validar a experiência antes de integrar. O blueprint
`knowledge-base/discoveries/blueprints/studio-ux-shell-blueprint.md` (SHIPPABLE 100)
extraiu os padrões do Mastra Playground (shell/rotas/estados/pipeline de eventos) e o
contrato de dados do Genkit Dev UI (list/run-stream/traces/health). Decisões já
resolvidas no grill: Traces é **placeholder only** (out-of-scope "trace UI from scratch"
permanece); fixtures derivam dos tipos publicados do `@theokit/sdk` 3.x; gaps de UI viram
contribuição upstream, não fork.

## Baseline Context (deep review of current state)

### Files that will be touched

| File | LoC today | Last commit (sha + date) | Why it exists today | Invariants to preserve |
|---|---|---|---|---|
| `package.json` (root) | 26 | `e0e97d6` (2026-07-14) | Scripts do monorepo (`pnpm -r build/test/typecheck`, `biome check .`) | Scripts `build/test/typecheck/check` continuam funcionando com o novo pacote |
| `pnpm-workspace.yaml` | 2 | `e0e97d6` (2026-07-14) | Declara `packages/*` | Não muda — `packages/studio` já é coberto pelo glob |
| `CHANGELOG.md` | 33 | `d23685c` (2026-07-14) | Keep a Changelog | Entradas novas só em `[Unreleased]` |
| `biome.json` (NEW) | 0 | — | (root não tem config do Biome; script `check` existe mas sem config) | — |
| `packages/studio/**` (NEW — pacote inteiro) | 0 | — | (não existe; primeiro pacote do monorepo) | — |

Verificação de hoje: `packages/` não existe (`ls` 2026-07-14); Node v22.22.2 e pnpm 9.15.0
locais satisfazem `engines`.

### Current callers / dependents

(none — greenfield: nenhum símbolo existente é modificado; o repo não tem código de
produção. O único consumidor futuro declarado é `theokit dev` (M1), fora deste repo.)

### Domain glossary

- **Superfície/tab** — uma das 5 áreas navegáveis do Studio (Playground, Events, Memory, Knowledge, Traces).
- **StudioDataSource** — interface única de dados que as telas consomem (DIP); no M5 a implementação é `FixtureDataSource`.
- **Fixture** — dado estático tipado que simula respostas dos serviços/SDK; deriva dos tipos publicados do `@theokit/sdk` 3.4.x.
- **`InteractionUpdate`** — união tipada de updates de streaming do SDK (TextDelta, ToolCallStarted/Completed, StepStarted…) — `@theokit/sdk` `dist/run-*.d.ts:608` (verificado no tarball 3.4.1).
- **`RunEvent`** — união tipada de eventos de run do SDK (tool-progress, permission-denied, rate-limit, task-*) — `dist/run-*.d.ts:177`.
- **Graceful degradation** — invariante 4 do CLAUDE.md: Studio útil sem Docker; tabs de serviço instruem `theokit studio up`.

### Architecture boundaries affected

- `rules/architecture.md § 2 (DIP)` — o domínio da UI define `StudioDataSource`; adapters
  (fixtures agora; HTTP/SDK no M1+) implementam. Direção: telas → interface ← adapter.
- `rules/architecture.md § 1` — composition root no entrypoint da SPA (`main.tsx`): é lá
  que `FixtureDataSource` é injetada no provider; nunca dentro de componentes.
- CLAUDE.md invariantes 4 (graceful degradation), 5 (não reconstruir trace UI — placeholder
  only), 7 (UI com `@theokit/ui`).

## Prior Art & Related Work

- **Internal blueprint:** `knowledge-base/discoveries/blueprints/studio-ux-shell-blueprint.md`
  — Blueprint §"T1" (shell/rotas/sidebar), §"T2" (catálogo de estados), §"T3" (pipeline
  evento→UI), §"T4" (contrato StudioDataSource), §"ADRs D1–D4", §"Recommendations 1–7".
- **Patterns skills:** (nenhuma `*-patterns` instalada em `.claude/skills/` — verificado 2026-07-14.)
- **Reference projects:**
  `.claude/knowledge-base/references/mastra/packages/playground/src/App.tsx:484` (mapa de
  rotas explícito); `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/EmptyState/EmptyState.tsx:1`
  (shape do EmptyState); `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/router.ts:110`
  (vocabulário list/run/traces do contrato de dev UI);
  `.claude/knowledge-base/references/mastra/packages/playground/src/startup-error.ts:1`
  (startup error em DOM puro).
- **External:** `@theokit/ui@1.0.3` e `@usetheo/ui@0.15.0` (npm view 2026-07-14 — exports
  verificados: ChatThread/ChatComposer/AgentStream/useAgentStream em `@theokit/ui`;
  EmptyState/Skeleton/Sidebar/PageShell/Tabs em `@usetheo/ui`); `@theokit/sdk@3.4.1`
  (tarball inspecionado — uniões `RunEvent`/`InteractionUpdate`).

## Objective

- [ ] `packages/studio` builda, typechecka e passa lint no monorepo (`pnpm -r build`, `pnpm -r typecheck`, `pnpm check`)
- [ ] `StudioDataSource` definida no domínio da UI; `FixtureDataSource` cobre agents/tools/skills/workflows, run-stream, memories, knowledge e health
- [ ] 5 rotas navegáveis com sidebar + breadcrumb; ErrorBoundary por rota; startup-error em DOM puro
- [ ] Playground: enviar mensagem → playback do stream fixture → mensagens/tool calls renderizadas
- [ ] Event Inspector: lista viva dos eventos tipados crus do mesmo run, filtrável por tipo
- [ ] Memory e Knowledge: browsers com dados fixture + retrieval playground fake com scores; Traces: placeholder offline
- [ ] Estados empty/loading/offline exercitados por teste em toda tab backed-by-serviço

## Dependencies

Por Unbreakable Rule 9 (não reinventar) e rung 4 da parsimony ladder (reusar o que o
ecossistema já tem). Versões pinned (range `^` gravado no package.json do pacote).

| Dependência | Versão | Papel | Rule 9 (por que não reimplementar / por que esta) |
|---|---|---|---|
| `react` / `react-dom` | ^19.2.7 | runtime da SPA | padrão do ecossistema; peer do @theokit/ui |
| `react-router` | ^7.18.1 | rotas explícitas + deep-linking | padrão da categoria (Mastra usa v7 — Blueprint §"T1"); ≥7.18.1 = CLEAN no OSV (7.13.x tinha 3 HIGH); v8 existe — pin por ADR D6 |
| `@theokit/ui` | ^1.0.3 | componentes agent-surface (ChatThread, AgentStream, ToolCallCard…) | invariante 7 do CLAUDE.md — dogfooding do pilar de UI; 0 CVEs (OSV 2026-07-14) |
| `@usetheo/ui` | ^0.15.0 | primitivos genéricos (EmptyState, Skeleton, Sidebar, PageShell, Tabs) | já é dependência do @theokit/ui; catálogo T2 sem código novo; 0 CVEs |
| `@theokit/sdk` | ^3.4.1 | **types-only** (fixtures tipadas com `InteractionUpdate`/`RunEvent`) | mitiga fixture drift (grill risco 1); import type não entra no bundle; 0 CVEs |
| `tailwindcss` + `@tailwindcss/vite` | ^4.3.2 | styling (peer do @theokit/ui) | exigido pelo design system; 0 CVEs |
| `vite` | ^7.3.6 | dev server + build | ≥7.3.6 = CLEAN no OSV (7.3.4 flagava GHSA-fx2h HIGH); v8 existe — pin por ADR D6 |
| `@vitejs/plugin-react` | ^5.0.0 | plugin React do Vite | compatível com vite 7; 0 CVEs |
| `typescript` | ^5.8.0 | strict typecheck | LOCKADO por CLAUDE.md § Toolchain (TS 5.8) — v7 existe mas o lock é o ADR |
| `vitest` + `@vitest/coverage-v8` | ^3.2.7 | unit/component tests + coverage | ≥3.2.6 corrige GHSA-5xrq (CRITICAL — Vitest UI server RCE); 3.2.7 = última 3.x, CLEAN no OSV; v4 existe — pin por ADR D6 |
| `@testing-library/react` + `@testing-library/user-event` + `jsdom` | ^16.3.2 / ^14.6.1 / ^26.0.0 | component tests | padrão da categoria (Mastra idem — Blueprint §"Corner 1"); 0 CVEs |
| `@biomejs/biome` | ^2.4.0 (root, já declarado) | lint/format | já no root; 0 CVEs |

Explicitamente FORA do M5 (YAGNI, Blueprint §"Recommendations for the project" (rec. 7)): `@tanstack/react-query`
(sem rede), `zustand` (Context basta), `msw` (sem fronteira HTTP), `@xyflow/react`,
`recharts`, Playwright (e2e adiado para M1 — Blueprint ADR D4).

## ADRs

### D1 — Rotas explícitas + sidebar de seções (padrão Mastra)

**Decision:** mapa de rotas explícito num módulo de rotas; sidebar com 3 seções (Playground;
Observability: Events, Traces; Data: Memory, Knowledge); breadcrumb via metadata de rota;
ErrorBoundary por rota.

**Rationale:** Blueprint §"T1" e ADR D1 do blueprint — padrão comprovado da referência
primária, mapeia 1:1 nas 5 superfícies; SRP por página (`rules/architecture.md § 3`).

**Alternatives considered:** file-based routing/meta-framework — rejeitado (SPA embutida em
dev server, sem SSR; peers usam CSR); tabs sem router — rejeitado (perde deep-linking que o
M1 precisa em `/_studio/...`).

**Consequences:** paths estáveis entre M5→M1; navegação testável por component test.

### D2 — `StudioDataSource` no domínio da UI; `FixtureDataSource` como único adapter do M5

**Decision:** interface única com list de entidades (agents/tools/skills/workflows),
`runAgent()` retornando stream tipado, memories, knowledge (collections/documents/query) e
`health()`; implementação fixtures injetada no composition root via React Context.

**Rationale:** DIP (`rules/architecture.md § 2`); vocabulário validado pelo contrato do
Genkit (Blueprint §"T4"). Fixtures importam `import type` do `@theokit/sdk` — o risco de
fixture drift fica confinado a um módulo (grill risco 1).

**Alternatives considered:** MSW mockando HTTP — rejeitado (YAGNI: não existe fronteira
HTTP no M5; MSW entra quando adapters reais existirem); fixtures inline nos componentes —
rejeitado (impede a troca limpa no M1; viola DIP).

**Consequences:** M1/M2/M3 implementam novos adapters sem tocar telas; testes de componente
injetam DataSource determinística (inclusive variantes offline/empty/slow).

### D3 — Playback de stream por async generator com timers controláveis

**Decision:** o run fixture é um roteiro (array tipado de `InteractionUpdate | RunEvent`)
reproduzido por um async generator com delay parametrizável (0ms em teste, ~30-80ms em dev)
e cancelamento por `AbortSignal`.

**Rationale:** espelha o pipeline evento→UI do Mastra (Blueprint §"T3": narrowing por
discriminated union → dict de renderers) usando os tipos reais do SDK; delay 0 mantém os
testes determinísticos (`rules/testing.md § 6` — sem tempo real em unit test).

**Alternatives considered:** WebSocket/SSE fake — rejeitado (reintroduz fronteira de rede
que o M5 não tem); reproduzir com `setInterval` sem AbortSignal — rejeitado (vaza playback
após unmount; cancelamento é o teste de concorrência da fase).

**Consequences:** o contrato de streaming da DataSource já nasce igual ao que o M1 precisa
(`Run.stream()` real é um async iterable); o inspector e o chat consomem o MESMO run.

### D4 — Estados como componentes de primeira classe reusando `@usetheo/ui`

**Decision:** `EmptyState`/`Skeleton` vêm de `@usetheo/ui`; o Studio adiciona apenas
`ServiceOfflineState` (composição de EmptyState com instrução `theokit studio up`) e o
startup-error em DOM puro no bootstrap.

**Rationale:** rung 4 da parsimony ladder — `@usetheo/ui@0.15` já exporta
EmptyState/Skeleton/Sidebar/PageShell (verificado no tarball 2026-07-14); Blueprint §"T2" e
CLAUDE.md invariante 4. Não reconstruir o que o design system já tem (Rule 9).

**Alternatives considered:** implementar catálogo próprio de estados — rejeitado (duplica o
design system; era o risco 2 do grill e o inventário provou que não é necessário).

**Consequences:** gap real remanescente do design system (se surgir) vira issue upstream
com evidência concreta, não fork local.

### D5 — Observabilidade dev: contador de chamadas da DataSource

**Decision:** módulo `metrics.ts` com contadores em memória (`datasource_calls_total` por
método, `stream_events_played_total`), expostos em `window.__STUDIO_METRICS__` em dev e
assertados não-zero no teste de integração da Fase Final.

**Rationale:** wiring triad do `rules/cycle-implement.md` exige métrica de runtime; numa
SPA fixtures-only o equivalente honesto é o contador em memória inspecionável — sem
inventar backend de telemetria (KISS).

**Alternatives considered:** OTLP/console.log espalhado — rejeitados (OTLP é escopo M2;
logs soltos não são assertáveis).

**Consequences:** o "metric proof" do Global DoD é executável em teste; M2 pode redirecionar
os contadores para o exporter real.

### D6 — Pinning de majors: versão validada-pela-referência sobre latest

**Decision:** react-router pinado em ^7 (não ^8), vite em ^7 (não ^8), vitest em ^3 (não
^4) e typescript em ^5.8 (não ^7) — sempre na última patch CLEAN do major pinado
(auditoria OSV 2026-07-14: react-router ≥7.18.1, vite ≥7.3.6, vitest ≥3.2.7).

**Rationale:** TS 5.8 é lock explícito do CLAUDE.md § Toolchain. Os demais: os padrões do
blueprint foram extraídos de referências rodando esses majors; adotar majors lançados
recentemente (RR8/vite8/vitest4) adicionaria incógnitas de breaking-changes a um milestone
cujo objetivo é UX, não upgrade de toolchain. Dentro do major pinado, usar SEMPRE a patch
mais recente (as antigas carregavam 1 CRITICAL + 4 HIGH corrigidas).

**Alternatives considered:** adotar latest majors (RR8, vite 8, vitest 4) — rejeitado para
o M5 (risco de fricção sem valor de UX; vira chore pós-M5 com changelog review); pinar as
patches antigas citadas pelo Mastra — rejeitado (CVEs conhecidas: GHSA-5xrq CRITICAL no
vitest 3.2.4, GHSA-49rj/8646/8x6r HIGH no react-router 7.13.x).

**Consequences:** upgrade de majors registrado como chore pós-M5; `/deps-audit` não flagra
`major_outdated_unpinned` (pin justificado por este ADR).

## Drawbacks & Risks

| Drawback / Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| Fixture drift: roteiros divergem do comportamento real do `Run.stream()` mesmo com tipos corretos (semântica de ordem/timing) | Medium | Fixtures importam `import type` do SDK; roteiro revisado no spike M2; TODO(M1) marcado no módulo de fixtures | paulo |
| `@theokit/ui` 1.x pode ter bugs/lacunas em componentes pouco usados (AgentStream/ChatThread em contexto novo) | Medium | Smoke component test por componente adotado ANTES de compor a tela (T0.1 AC); fallback: compor com primitivos `@usetheo/ui` + issue upstream | paulo |
| UX validada só contra fixtures pode "mentir" sobre latência/volume reais (listas grandes, streams longos) | Low | Fixtures incluem 1 cenário de volume (lista 50+ itens) e 1 stream longo (100+ eventos); revalidação no M1 com dados reais | paulo |
| Tailwind v4 + preset do design system em monorepo pnpm pode ter fricção de setup (peer deps, CSS layers) | Low | T0.1 valida o pipeline CSS com um smoke visual test antes de qualquer tela | paulo |

## Unresolved Questions

- Q1 — O preset Tailwind do `@theokit/ui` (`./preset.css`/`tokens-v4.css`) cobre dark mode
  por padrão ou o Studio precisa configurar `ThemeProvider` explicitamente? (resolver no
  T0.1 lendo o README do pacote; não bloqueia o plano)
- Q2 — `useAgentStream` do `@theokit/ui` aceita um async iterable arbitrário ou espera um
  transport próprio? (resolver no T3.1; fallback: estado local + `ChatThread` controlado)

## Dependency Graph

```
Phase 0 (scaffold) ──▶ Phase 1 (data layer) ──▶ Phase 2 (shell) ──▶ Phase 3 (playground+events)
                                                        │                      │
                                                        └──────▶ Phase 4 (memory/knowledge/traces)
                                                                               │
                                                Phase 5 (Integration Validation) ◀──┘
```

Phase 3 e Phase 4 podem rodar em paralelo após Phase 2. Phase 5 é barreira final.

---

## Phase 0: Scaffold do workspace

**Objective:** `packages/studio` existe, builda, typechecka, linta e roda um teste trivial no monorepo.

### T0.1 — Criar pacote studio + toolchain (Vite, TS strict, Vitest, Biome, Tailwind v4, design system)

#### Objective
Pacote `@theokit/studio` com Vite+React+TS strict, Vitest+Testing Library+jsdom, Tailwind v4
com preset do `@theokit/ui`, e `biome.json` no root — tudo verde nos scripts do monorepo.

#### Why this step (action + reasoning)
1. **O que faz:** cria `packages/studio` (package.json, tsconfig, vite.config, vitest
   config, index.html, `src/main.tsx` mínimo com `TheoUIProvider`), adiciona `biome.json`
   no root e um smoke test que renderiza um componente do design system.
2. **Por que agora:** todo o resto depende do pipeline (D4/risco Tailwind); o smoke com
   componente real do `@theokit/ui` valida o risco 2 (gaps/fricção do design system) antes
   de qualquer tela. Baseline: root `package.json:11-18` já roda `pnpm -r`, então o pacote
   novo entra nos gates automaticamente.

#### Evidence
Root scripts: `package.json:11-18` (`e0e97d6`). `packages/` inexistente (ls 2026-07-14).
Exports do design system verificados: `@theokit/ui@1.0.3` npm view (agent components) e
`@usetheo/ui@0.15.0` tarball (EmptyState/Sidebar/Skeleton). Toolchain lockada:
`CLAUDE.md § Toolchain`.

#### Files to edit
```
biome.json (NEW) — config raiz do Biome (recommended rules, formatter)
packages/studio/package.json (NEW) — nome @theokit/studio, private até M1, scripts build/test/typecheck
packages/studio/tsconfig.json (NEW) — strict, jsx react-jsx, bundler resolution
packages/studio/vite.config.ts (NEW) — @vitejs/plugin-react + @tailwindcss/vite
packages/studio/vitest.config.ts (NEW) — environment jsdom, setup file, coverage v8
packages/studio/src/test/setup.ts (NEW) — @testing-library/jest-dom
packages/studio/index.html (NEW) — mount #root
packages/studio/src/main.tsx (NEW) — bootstrap mínimo (App placeholder com TheoUIProvider)
packages/studio/src/index.css (NEW) — @import do preset/tokens do @theokit/ui + tailwind
packages/studio/src/app.smoke.test.tsx (NEW) — RED test do smoke
```

#### Deep file dependency analysis
- `biome.json` — hoje inexiste e `pnpm check` roda sem config (comportamento default);
  passa a governar lint/format de todo o monorepo. Nenhum downstream além dos scripts root.
- `packages/studio/*` — greenfield; consumidos apenas pelos scripts `pnpm -r` do root.
- `src/main.tsx` — composition root (`rules/architecture.md § 1`); T1/T2 vão injetar a
  DataSource aqui.

#### Deep Dives
- TS strict on; `moduleResolution: bundler`; `types: ["vitest/globals"]` se globals.
- CSS: importar `@theokit/ui/fonts.css` + `tokens-v4.css`/`preset` conforme README do
  pacote (resolve Q1); validar que uma classe do design system pinta no smoke.
- Edge: `pnpm -r test` não pode falhar em pacote sem testes — o smoke já evita.

#### Tasks
1. Escrever `biome.json` root (extends recommended; ignore dist/coverage).
2. Criar estrutura `packages/studio` com configs acima.
3. `pnpm install` no root (lockfile ganha o pacote).
4. RED: smoke test; GREEN: `main.tsx`/`App` mínimo com um `Badge`/`Button` do design system.
5. Rodar os 4 comandos do monorepo e ajustar até verde.

#### TDD
```
RED:     app.smoke.test.tsx :: renders_design_system_component_inside_provider() —
         render(<App />) e expect(screen.getByTestId('studio-smoke')).toBeInTheDocument();
         componente interno usa <Badge> do @usetheo/ui (prova pipeline CSS/provider)
GREEN:   App mínimo com TheoUIProvider + Badge
REFACTOR: extrair Provider wrapper de teste para src/test/render.tsx
VERIFY:  pnpm --filter @theokit/studio test
ASSERT shape: expect(smokeElement).toBeTruthy() — componente do design system montado
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] `pnpm --filter @theokit/studio test` verde com o smoke test
- [ ] `pnpm -r typecheck` zero erros; `pnpm check` zero warnings; `pnpm -r build` gera `packages/studio/dist/`
- [ ] Vite dev server sobe (`pnpm --filter @theokit/studio dev`) e serve o App placeholder
- [ ] Q1 (preset/tema) respondida e anotada em comentário no `index.css`

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test` retorna exit 0 com o smoke test incluído
- [ ] `pnpm -r typecheck`, `pnpm check` e `pnpm -r build` retornam exit 0
- [ ] CHANGELOG `[Unreleased] § Added` contém a entry do scaffold (verificar com `grep studio CHANGELOG.md`)
- [ ] `wc -l` ≤ 500 em cada arquivo criado

---

## Phase 1: Camada de dados (DIP) + fixtures tipadas

**Objective:** `StudioDataSource` definida e `FixtureDataSource` completa, 100% testada, sem UI.

### T1.1 — Interface `StudioDataSource` + entidades + fixtures de registry/memory/knowledge/health

#### Objective
Contrato de dados das 5 superfícies + fixtures estáticas tipadas + contadores de métrica.

#### Why this step (action + reasoning)
1. **O que faz:** cria `src/data/types.ts` (entidades: AgentSummary, ToolSummary,
   SkillSummary, WorkflowSummary, MemoryRecord, KnowledgeCollection/Document/Chunk,
   RetrievalResult, ServiceHealth), `src/data/datasource.ts` (interface), fixtures em
   `src/data/fixtures/*.ts`, `src/data/metrics.ts` (D5) e `FixtureDataSource` (sem stream —
   T1.2).
2. **Por que agora:** todas as telas dependem do contrato (D2); definir antes das telas
   impede fixtures inline (anti-pattern rejeitado no D2). Vocabulário vem do Blueprint §"T4".

#### Evidence
Blueprint §"T4" (tabela list/run/traces/health do Genkit —
`.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/router.ts:110`);
ROADMAP § M5 DoD (5 superfícies); tipos SDK verificados no tarball 3.4.1.

#### Files to edit
```
packages/studio/src/data/types.ts (NEW) — entidades das superfícies
packages/studio/src/data/datasource.ts (NEW) — interface StudioDataSource + Context/hook useDataSource
packages/studio/src/data/metrics.ts (NEW) — contadores em memória (D5)
packages/studio/src/data/fixtures/registry.ts (NEW) — agents/tools/skills/workflows (inclui cenário 50+ itens)
packages/studio/src/data/fixtures/memory.ts (NEW) — memories com escopos
packages/studio/src/data/fixtures/knowledge.ts (NEW) — collections/documents/chunks + resultados de query com scores
packages/studio/src/data/fixture-datasource.ts (NEW) — implementação (métodos não-stream)
packages/studio/src/data/fixture-datasource.test.ts (NEW) — RED tests
packages/studio/src/data/metrics.test.ts (NEW) — RED tests
```

#### Deep file dependency analysis
- `datasource.ts` — novo; consumido por todas as páginas (T2-T4) via hook `useDataSource()`.
- `fixture-datasource.ts` — implementa a interface; único lugar que importa fixtures.
- `metrics.ts` — incrementado pela FixtureDataSource; lido pelo teste de integração (Fase 5).

#### Deep Dives
- Interface (assinaturas): `listAgents(): Promise<AgentSummary[]>`, idem tools/skills/
  workflows; `getMemories(scope?): Promise<MemoryRecord[]>`; `listCollections()`,
  `listDocuments(collectionId)`, `query(collectionId, text): Promise<RetrievalResult[]>`;
  `health(): Promise<Record<'memory'|'lens'|'rag', ServiceHealth>>`.
- `ServiceHealth = { status: 'online' | 'offline'; hint?: string }` — no M5 fixtures
  retornam `offline` para lens (Traces placeholder) e `online` p/ memory/rag (dados fake).
- Variantes de teste: `createFixtureDataSource({ scenario: 'default' | 'empty' | 'offline' })`
  — alimenta os testes de estado do T2.2/T4.
- Edge: query com string vazia retorna `[]` + erro tipado `EmptyQueryError` (fail-fast,
  `rules/error-handling.md § 2`).

#### Pseudo-code / Signatures
```pseudocode
interface StudioDataSource:
  listAgents/listTools/listSkills/listWorkflows
  runAgent(agentId, prompt, signal): AsyncIterable<StudioRunEvent>   # T1.2
  getMemories(scope?) ; listCollections() ; listDocuments(id) ; query(id, text)
  health()

# Example
ds = createFixtureDataSource({scenario:'default'})
await ds.listAgents()        -> [{id:'support-agent', name:'Support Agent', ...}, ...]
await ds.query('docs','x')   -> [{chunkId, documentId, score: 0.92, excerpt}, ...]
metrics.snapshot().datasource_calls_total.listAgents == 1
```

#### Tasks
1. RED tests da interface/fixtures/metrics.
2. GREEN: tipos + fixtures + FixtureDataSource (não-stream) + metrics.
3. REFACTOR: extrair helpers de cenário.

#### TDD
```
RED:  fixture-datasource.test.ts :: lists_agents_tools_skills_workflows_from_fixtures() —
      await ds.listAgents() tem length > 0 e shape AgentSummary (expect().toMatchObject)
RED:  fixture-datasource.test.ts :: empty_scenario_returns_empty_lists() —
      createFixtureDataSource({scenario:'empty'}) → listAgents() === []
RED:  fixture-datasource.test.ts :: query_returns_scored_chunks_sorted_desc() —
      scores ordenados desc e ≤ 1.0
RED:  fixture-datasource.test.ts :: query_with_blank_text_throws_EmptyQueryError() —
      await expect(ds.query('docs','  ')).rejects.toBeInstanceOf(EmptyQueryError)
RED:  fixture-datasource.test.ts :: query_unknown_collection_throws_UnknownCollectionError() —
      erro tipado com o collectionId na mensagem (EC-5; não retornar [] silencioso)
RED:  metrics.test.ts :: increments_counter_per_datasource_call() —
      após 2 chamadas, snapshot().datasource_calls_total.listAgents === 2
GREEN: implementar o mínimo
REFACTOR: dedup de builders de fixture
VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(agents.length).toBeGreaterThan(0); expect(snapshotCount).toBe(2)
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] Todos os RED tests acima verdes; coverage do diretório `src/data/` ≥ 90% (v8)
- [ ] Nenhum componente React importado em `src/data/` (camada pura — verificar por grep no review)
- [ ] `EmptyQueryError` tipado com mensagem contextual (`rules/error-handling.md`)

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` da feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado

### T1.2 — Roteiro de run + playback por async generator (stream tipado do SDK)

#### Objective
`runAgent()` reproduz um roteiro tipado (`InteractionUpdate | RunEvent` do `@theokit/sdk`)
como async iterable com delay parametrizável e cancelamento por AbortSignal.

#### Why this step (action + reasoning)
1. **O que faz:** cria `src/data/fixtures/run-script.ts` (roteiros: default com text deltas
   + tool call + permission-denied + rate-limit + completion; e `long` com 100+ eventos) e
   `src/data/stream-player.ts` (generator com delay/AbortSignal), integrando em
   `FixtureDataSource.runAgent()`.
2. **Por que agora:** é o coração do M5 (playground + inspector consomem o MESMO run — D3);
   separado do T1.1 porque introduz assincronia/cancelamento com testes próprios.

#### Evidence
Uniões verificadas no tarball do SDK 3.4.1: `RunEvent` (`dist/run-*.d.ts:177`) e
`InteractionUpdate` (`dist/run-*.d.ts:608`). Padrão de pipeline: Blueprint §"T3"
(`.claude/knowledge-base/references/mastra/packages/playground/src/lib/ai-ui/chat/use-chat-send-handler.ts:42`).

#### Files to edit
```
packages/studio/src/data/fixtures/run-script.ts (NEW) — roteiros tipados (import type do @theokit/sdk)
packages/studio/src/data/stream-player.ts (NEW) — async generator (delayMs, AbortSignal)
packages/studio/src/data/fixture-datasource.ts — runAgent() delega ao player
packages/studio/src/data/stream-player.test.ts (NEW) — RED tests (inclui cancelamento)
```

#### Deep file dependency analysis
- `run-script.ts` — único módulo com `import type { InteractionUpdate, RunEvent } from '@theokit/sdk'`;
  se o SDK 3.x mudar shapes, o typecheck quebra AQUI (mitigação do fixture drift).
- `stream-player.ts` — genérico (`play<T>(script, {delayMs, signal})`); sem dependência de fixtures.
- `fixture-datasource.ts` — passa a expor `runAgent`; T3 consome.

#### Deep Dives
- `StudioRunEvent = { at: number; event: InteractionUpdate | RunEvent }` (at = offset ms
  sugerido; player usa `delayMs ?? at-diff`).
- Cancelamento: checar `signal.aborted` antes de cada yield; `return` limpo (não throw) —
  unmount de componente não pode gerar unhandled rejection.
- Delay 0 em teste (determinístico — `rules/testing.md § 6`); delay real em dev.
- Edge: roteiro vazio → iterable completa sem yield; completion sempre último evento no
  roteiro default.

#### Pseudo-code / Signatures
```pseudocode
async function* play<T>(script: {at:number; event:T}[], opts: {delayMs?: number; signal?: AbortSignal}):
  for item in script:
    if opts.signal?.aborted: return
    await sleep(opts.delayMs ?? item.at - prev.at)
    yield item.event

# Example
events = [e async for e of play(DEFAULT_RUN, {delayMs: 0})]
events[0].type == 'text-delta'; last(events).type endsWith 'completed'
```

#### Tasks
1. RED tests do player (ordem, delay 0, cancelamento, roteiro vazio).
2. GREEN: player + roteiros + integração no runAgent.
3. REFACTOR: tipos compartilhados em types.ts.

#### TDD
```
RED:  stream-player.test.ts :: yields_all_events_in_script_order_with_zero_delay() —
      colhe via for-await e compara array de types com o roteiro
RED:  stream-player.test.ts :: abort_signal_stops_playback_without_rejection() —
      aborta após 3º evento; expect(count).toBe(3) e a promise resolve (não rejeita)
RED:  stream-player.test.ts :: empty_script_completes_without_yield() — count === 0
RED:  stream-player.test.ts :: out_of_order_timestamps_clamp_delay_to_zero() —
      roteiro com `at` decrescente completa na ordem do array (EC-3; Math.max(0, diff))
RED:  stream-player.test.ts :: pre_aborted_signal_yields_nothing() —
      signal abortado ANTES do play() → zero eventos, resolve limpo (EC-4)
RED:  fixture-datasource.test.ts :: runAgent_streams_default_script_and_increments_metric() —
      consome tudo; metrics.snapshot().stream_events_played_total > 0
GREEN / REFACTOR / VERIFY: pnpm --filter @theokit/studio test
```

#### Concurrency tests

- `abort_signal_stops_playback_without_rejection()` (acima) — cancellation propagation:
  o generator para no abort; prova de que unmount não vaza playback.
- `concurrent_players_do_not_share_state()` — concurrent test: dois `play()` via
  `Promise.all` colhem roteiros independentes completos (happens-before observation +
  isolamento de estado).

#### Acceptance Criteria
- [ ] Testes acima verdes; coverage `src/data/` ≥ 90%
- [ ] `run-script.ts` compila com `import type` do `@theokit/sdk` (typecheck falha se o SDK divergir)
- [ ] Roteiro default cobre ≥ 5 categorias de evento (text deltas, tool call started/completed, permission-denied, rate-limit, completion) — verificado por assert de tipos em `stream-player.test.ts`

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

---

## Phase 2: Shell da SPA (rotas, sidebar, estados)

**Objective:** navegação completa entre 5 rotas com estados de serviço corretos e bootstrap defensivo.

### T2.1 — Rotas + sidebar + breadcrumb + providers + startup-error

#### Objective
Shell navegável: `/` (redirect p/ `/playground`), `/playground`, `/events`, `/memory`,
`/knowledge`, `/traces` com sidebar de 3 seções, header com breadcrumb, ErrorBoundary por
rota e startup-error em DOM puro.

#### Why this step (action + reasoning)
1. **O que faz:** `src/app/routes.tsx` (mapa explícito), `src/app/shell.tsx` (Sidebar do
   `@usetheo/ui` + PageShell + breadcrumb via metadata), integra `DataSourceProvider` no
   `main.tsx` (composition root) e `src/bootstrap.ts` com try/catch → `renderStartupError`.
2. **Por que agora:** D1; todas as telas das fases 3-4 montam dentro deste chrome. Padrões:
   Blueprint §"T1" (rotas/sidebar/breadcrumb) e §"Corner 3" (bootstrap defensivo do Mastra —
   `.claude/knowledge-base/references/mastra/packages/playground/src/startup-error.ts:1`).

#### Evidence
Blueprint §"T1"/§"ADR D1"; sidebar/PageShell disponíveis em `@usetheo/ui@0.15` (tarball).

#### Files to edit
```
packages/studio/src/app/routes.tsx (NEW) — createBrowserRouter com as 6 entradas + metadata (label, icon, section)
packages/studio/src/app/shell.tsx (NEW) — Sidebar + header/breadcrumb + Outlet + ErrorBoundary
packages/studio/src/app/route-error.tsx (NEW) — errorElement por rota
packages/studio/src/main.tsx — injeta DataSourceProvider + RouterProvider
packages/studio/src/bootstrap.ts (NEW) — dynamic import de main; catch → startup-error
packages/studio/src/startup-error.ts (NEW) — DOM puro, role="alert", stack em dev
packages/studio/index.html — script aponta para bootstrap.ts
packages/studio/src/app/shell.test.tsx (NEW) — RED tests de navegação (inclui crash de rota — EC-2)
packages/studio/src/startup-error.test.ts (NEW) — RED test
packages/studio/src/bootstrap.test.ts (NEW) — RED test de config malformada (EC-8)
```

#### Deep file dependency analysis
- `routes.tsx` — fonte única do mapa rota→página→seção; sidebar e breadcrumb derivam dele
  (DRY: navegação declarada uma vez).
- `main.tsx` — passa a ser composition root real (injeta FixtureDataSource).
- Páginas das fases 3-4 são lazy placeholders aqui (`<ComingSoon/>` interno) até suas fases.

#### Deep Dives
- Metadata de rota: `{ path, label, section: 'playground'|'observability'|'data', icon }` —
  sidebar renderiza agrupado; breadcrumb lê `useMatches()`.
- ErrorBoundary: `errorElement` por rota (isola crash de página — padrão Mastra
  `.claude/knowledge-base/references/mastra/packages/playground/src/components/layout.tsx:92`).
- Edge: rota desconhecida → NotFound com EmptyState + link para `/playground`.

#### Tasks
1. RED tests (navegação por click na sidebar, breadcrumb, 404, startup-error).
2. GREEN: routes/shell/bootstrap.
3. REFACTOR: extrair `nav-items.ts`.

#### TDD
```
RED:  shell.test.tsx :: sidebar_navigates_to_all_five_surfaces() —
      user-event click em cada item; expect(await screen.findByRole('heading', {name})) por página
RED:  shell.test.tsx :: unknown_route_renders_not_found_empty_state() —
      MemoryRouter em '/nope' → getByText(/not found/i) + link p/ playground
RED:  shell.test.tsx :: breadcrumb_reflects_active_route() — navega p/ /knowledge; breadcrumb contém 'Knowledge'
RED:  startup-error.test.ts :: renders_alert_with_stack_in_dev_mode() —
      renderStartupError(new Error('boom'), {mode:'development'}) → container role=alert contém 'boom'
RED:  shell.test.tsx :: route_crash_renders_error_element_and_sidebar_survives() —
      página que lança no render → errorElement visível E sidebar continua navegável (EC-2)
RED:  bootstrap.test.ts :: malformed_studio_config_falls_back_to_fixtures_with_warning() —
      window.__STUDIO_CONFIG__ = 42 → app monta com fixtures; console.warn chamado 1x (EC-8)
GREEN / REFACTOR / VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(headingsVisitadas).toBe(5); expect(alertEl.textContent).toContain('boom')
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] 5 superfícies alcançáveis via sidebar — `sidebar_navigates_to_all_five_surfaces()` verde; deep-link por URL renderiza a página certa (assert de heading em `shell.test.tsx`)
- [ ] Crash simulado numa página não derruba o shell — `route_crash_renders_error_element_and_sidebar_survives()` verde em `shell.test.tsx`
- [ ] Startup-error acessível (`role="alert"`) — a11y não sacrificada (parsimony guardrail)

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

### T2.2 — Estados de serviço: ServiceOfflineState + gating por health()

#### Objective
Toda tab backed-by-serviço decide entre conteúdo/empty/loading/offline a partir de
`health()` + dados, com componentes de estado reusados do design system.

#### Why this step (action + reasoning)
1. **O que faz:** cria `src/app/service-state.tsx` (`ServiceOfflineState` compondo
   `EmptyState` com instrução `theokit studio up`; `ServiceGate` que resolve
   health+loading) e o hook `useServiceHealth(service)`.
2. **Por que agora:** D4 + invariante 4 (graceful degradation) — o gating é transversal às
   fases 3-4; implementado uma vez aqui, consumido por Memory/Knowledge/Traces.

#### Evidence
Blueprint §"T2" (catálogo de estados; ConfigGuard offline do Mastra —
`.claude/knowledge-base/references/mastra/packages/playground/src/App.tsx:730`);
`EmptyState`/`Skeleton` em `@usetheo/ui@0.15` (tarball).

#### Files to edit
```
packages/studio/src/app/service-state.tsx (NEW) — ServiceOfflineState + ServiceGate + useServiceHealth
packages/studio/src/app/service-state.test.tsx (NEW) — RED tests das 3 variantes
```

#### Deep Dives
- `ServiceGate({service, children})`: loading → `Skeleton`; offline → `ServiceOfflineState`
  (mensagem por serviço: memory/lens/rag; hint com comando `theokit studio up`); online →
  children.
- Edge: `health()` rejeitando (fixture pode simular) → tratar como offline com hint de erro
  (fail-clear, sem engolir: loga via metrics counter `health_errors_total`).

#### Tasks
1. RED tests com `createFixtureDataSource({scenario:'offline'})` e `'default'`.
2. GREEN + REFACTOR.

#### TDD
```
RED:  service-state.test.tsx :: shows_skeleton_while_health_pending() — promessa pendente → getByTestId('service-skeleton')
RED:  service-state.test.tsx :: shows_offline_state_with_studio_up_hint_when_service_offline() —
      scenario offline → getByText(/theokit studio up/)
RED:  service-state.test.tsx :: renders_children_when_service_online() — conteúdo visível
RED:  service-state.test.tsx :: health_rejection_renders_offline_and_increments_error_metric() —
      ds.health() rejeita → offline + metrics.health_errors_total === 1
GREEN / REFACTOR / VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(hint.textContent).toContain('theokit studio up'); expect(errorCount).toBe(1)
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] 4 testes acima verdes; `ServiceGate` usado pelas tabs nas fases 3-4 (verificado na Fase 5 por grep)
- [ ] Mensagem offline inclui o comando exato `theokit studio up` (contrato do ROADMAP § M5)

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

---

## Phase 3: Playground + Event Inspector

**Objective:** enviar mensagem → stream fixture reproduz → chat renderiza partes; inspector mostra os eventos crus do mesmo run.

### T3.1 — Playground: seletor de agente + chat com playback do stream

#### Objective
Página `/playground`: seleciona agente (fixtures), envia prompt, consome
`runAgent()` e renderiza text deltas/tool calls/estados com componentes `@theokit/ui`.

#### Why this step (action + reasoning)
1. **O que faz:** `src/pages/playground/` com hook `useRunPlayback` (consome o async
   iterable, agrega em mensagens/partes via reducer com discriminated unions — padrão
   Blueprint §"T3") e composição com `ChatThread`/`ChatComposer`/`ToolCallCard` (resolve Q2:
   se `useAgentStream` do design system aceitar iterable, usar; senão, estado local).
2. **Por que agora:** é a superfície nº 1 do DoD; depende de T1.2 (stream) e T2.1 (shell).

#### Evidence
Blueprint §"T3" (fluxo evento→UI em camadas;
`.claude/knowledge-base/references/mastra/packages/playground/src/lib/ai-ui/messages/message-row.tsx:198`);
componentes verificados em `@theokit/ui@1.0.3` (ChatThread/ChatComposer/useAgentStream).

#### Files to edit
```
packages/studio/src/pages/playground/index.tsx (NEW) — página (agent selector + chat)
packages/studio/src/pages/playground/use-run-playback.ts (NEW) — hook: runAgent → estado de mensagens/eventos
packages/studio/src/pages/playground/event-to-part.ts (NEW) — converter InteractionUpdate/RunEvent → partes de UI
packages/studio/src/pages/playground/playground.test.tsx (NEW) — RED tests
packages/studio/src/pages/playground/event-to-part.test.ts (NEW) — RED tests do converter puro
packages/studio/src/app/routes.tsx — troca placeholder pela página real
```

#### Deep file dependency analysis
- `use-run-playback.ts` — consome `useDataSource().runAgent` com AbortController atado ao
  unmount (cancelamento do D3/T1.2); publica também a lista crua de eventos (consumida pelo
  inspector via contexto de run compartilhado).
- `event-to-part.ts` — função pura (testável sem DOM): switch exaustivo sobre `type` com
  `never` check (fail-fast em tipo novo do SDK).

#### Deep Dives
- Reducer: text-delta concatena na mensagem assistant corrente; tool-call-started abre
  ToolCall pendente; tool-call-completed fecha; permission-denied/rate-limit viram partes
  de sistema visíveis; completion fecha o turn (isRunning=false).
- Edge: enviar novo prompt durante run ativo → aborta o anterior (signal) e inicia novo;
  roteiro vazio → mensagem de sistema "sem eventos".
- Exaustividade: `default: assertNever(event)` com fallback visual "evento desconhecido"
  em runtime (não crashar UI; logar em metrics `unknown_events_total`).

#### Pseudo-code / Signatures
```pseudocode
function eventToPatch(event): StatePatch  # pura
  switch event.type:
    'text-delta'          -> appendText(delta)
    'tool-call-started'   -> openToolCall(id, name, input)
    'tool-call-completed' -> closeToolCall(id, output)
    'permission-denied' | 'rate-limit' -> systemNotice(kind, detail)
    *completed/turn-ended -> finishTurn()
    default               -> unknown(event)  # metrics++

# Example: DEFAULT_RUN (T1.2) produz 1 turn com 1 tool call fechada e 1 notice de rate-limit
```

#### Tasks
1. RED tests do converter puro; RED tests da página (fluxo completo com delay 0).
2. GREEN: hook + página + converter. 3. REFACTOR: extrair reducer.

#### TDD
```
RED:  event-to-part.test.ts :: converts_text_deltas_into_accumulated_assistant_text() —
      aplica 3 deltas; texto final === concatenação
RED:  event-to-part.test.ts :: tool_call_lifecycle_opens_and_closes_card_state() —
      started+completed → 1 tool part com output preenchido
RED:  event-to-part.test.ts :: unknown_event_type_maps_to_unknown_part_not_throw() —
      objeto {type:'zzz'} → part unknown; não lança
RED:  playground.test.tsx :: sending_prompt_plays_stream_and_renders_final_message() —
      seleciona agente, digita, envia (user-event); findByText do texto final do roteiro;
      tool call visível (getByText do nome da tool do roteiro)
RED:  playground.test.tsx :: unmount_during_run_aborts_playback() —
      unmount no meio; sem act() warnings/unhandled rejection (spy em console.error === 0 calls)
RED:  playground.test.tsx :: blank_prompt_send_is_noop_and_no_run_starts() —
      envia '   ' → nenhum evento no RunLog; metrics.runAgent não incrementa; botão
      desabilitado sem agente selecionado (EC-1)
GREEN / REFACTOR / VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(finalText).toBe(expectedFromScript); expect(consoleErrorCalls).toBe(0)
```

#### Concurrency tests

- `unmount_during_run_aborts_playback()` (acima) — cancellation propagation do hook até
  o player (unmount aborta o run).
- `new_prompt_aborts_previous_run()` — concurrent test: segundo send durante run ativo
  cancela o run 1 (contagem de eventos congelada) e o run 2 completa — sem interleaving
  de estado.

#### Acceptance Criteria
- [ ] Fluxo completo send → stream → mensagem final + tool card — `sending_prompt_plays_stream_and_renders_final_message()` verde em `playground.test.tsx`
- [ ] Converter puro com switch exaustivo (`assertNever`) — typecheck quebra se o SDK adicionar tipo
- [ ] Zero `act()` warnings na suite da página

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

### T3.2 — Event Inspector: timeline crua dos eventos tipados com filtro

#### Objective
Página `/events`: tabela/timeline dos eventos crus do último run (tipo, timestamp,
payload expandível), filtrável por categoria (text/tool/permission/rate-limit/task).

#### Why this step (action + reasoning)
1. **O que faz:** contexto `RunLogProvider` (guarda eventos do run corrente — alimentado
   pelo playground), página com lista virtualizável simples + filtro + `<details>` de
   payload JSON; estado vazio quando nenhum run aconteceu.
2. **Por que agora:** DoD do M5 ("event inspector rendering typed events live"); consome o
   MESMO run do playground (D3) — inspector e chat provam a dupla leitura do stream.

#### Evidence
ROADMAP § M1 DoD (inspector de `Run.stream()`); Blueprint §"T3" (inventário de tipos);
componentes candidatos: `AgentTimeline`/`AgentEvent` (`@theokit/ui@1.0.3` npm view).

#### Files to edit
```
packages/studio/src/app/run-log.tsx (NEW) — RunLogProvider + useRunLog (append por evento)
packages/studio/src/pages/events/index.tsx (NEW) — página com filtro + lista + empty state
packages/studio/src/pages/events/events.test.tsx (NEW) — RED tests
packages/studio/src/pages/playground/use-run-playback.ts — publica eventos no RunLogProvider
packages/studio/src/app/routes.tsx — página real
```

#### Deep Dives
- Categoria derivada do `type` por prefixo (função pura `categorize(type)` com teste).
- Empty state: `EmptyState` com CTA "Run an agent in the Playground" (link).
- Edge: 100+ eventos (roteiro `long`) renderizam sem estourar (lista simples com key
  estável; virtualização real só se necessário — YAGNI anotado).

#### Tasks
1. RED tests. 2. GREEN provider+página. 3. REFACTOR.

#### TDD
```
RED:  events.test.tsx :: empty_state_with_playground_cta_when_no_run_yet() — getByText(/run an agent/i)
RED:  events.test.tsx :: renders_one_row_per_event_of_last_run() —
      popula RunLogProvider com DEFAULT_RUN; nº de rows === nº de eventos
RED:  events.test.tsx :: filter_by_category_shows_only_matching_events() —
      seleciona 'tool'; todas as rows visíveis têm categoria tool
RED:  events.test.tsx :: long_script_renders_all_rows() — roteiro long (100+) → rows === length
RED:  events.test.tsx :: filter_with_zero_matches_shows_no_match_message() —
      categoria sem eventos no roteiro → no-match (≠ empty state) (EC-7)
GREEN / REFACTOR / VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(rowCount).toBe(eventCount); expect(visibleCategories).toEqual(selecionadas)
```

#### Concurrency tests

(none — single-threaded) — o provider recebe eventos já serializados pelo hook do playground.

#### Acceptance Criteria
- [ ] Os 5 testes de `events.test.tsx` retornam verde; payload de cada row expandível via `<details>` com JSON serializado
- [ ] Filtro cobre as 5 categorias com contador por categoria ≥ 0 visível — assert em `filter_by_category_shows_only_matching_events()`

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

---

## Phase 4: Memory + Knowledge + Traces placeholder

**Objective:** browsers de dados fake com estados corretos; Traces honesto como placeholder.

### T4.1 — Memory browser

#### Objective
Página `/memory` atrás de `ServiceGate('memory')`: lista de memórias com escopo, busca
client-side e painel de detalhe read-only.

#### Why this step (action + reasoning)
1. **O que faz:** página com `DataTable`/lista (`@usetheo/ui`) sobre
   `getMemories()`, filtro por escopo, detalhe com `MemoryEditor` read-only se aplicável
   (senão painel próprio simples).
2. **Por que agora:** DoD M5 superfície 3; depende de T1.1 + T2.2. Estados
   empty/offline herdados do ServiceGate (DRY).

#### Evidence
ROADMAP § M3 (Memory tab over theo-memory REST — aqui fixtures); componente `MemoryEditor`
em `@theokit/ui@1.0.3` (npm view); Blueprint §"Recommendations for the project" (rec. 3).

#### Files to edit
```
packages/studio/src/pages/memory/index.tsx (NEW)
packages/studio/src/pages/memory/memory.test.tsx (NEW)
packages/studio/src/app/routes.tsx — página real
```

#### Deep Dives
- Empty (`scenario:'empty'`) → EmptyState "No memories yet" com hint de wiring do agente.
- Busca client-side pura (função filtrável testada isoladamente). Edge: termo sem match →
  NoMatch (≠ empty — Blueprint §"T2").

#### Tasks
1. RED tests. 2. GREEN. 3. REFACTOR.

#### TDD
```
RED:  memory.test.tsx :: lists_memories_grouped_by_scope() — rows > 0; escopos visíveis
RED:  memory.test.tsx :: empty_scenario_shows_no_memories_empty_state() — getByText(/no memories/i)
RED:  memory.test.tsx :: search_without_match_shows_no_match_state_not_empty_state() —
      digita 'zzz' → getByText(/no.*match/i) e queryByText(/no memories/i) === null
RED:  memory.test.tsx :: offline_scenario_shows_service_offline_state() — getByText(/theokit studio up/)
GREEN / REFACTOR / VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(scopeRows.length).toBeGreaterThan(0); expect(noMatchVisible).toBe(true)
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] Os 4 testes de `memory.test.tsx` retornam verde; distinção empty vs no-match comprovada por `search_without_match_shows_no_match_state_not_empty_state()`

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

### T4.2 — Knowledge browser + retrieval playground fake

#### Objective
Página `/knowledge` atrás de `ServiceGate('rag')`: collections → documents → chunks, e um
retrieval playground (query → chunks com score/strategy).

#### Why this step (action + reasoning)
1. **O que faz:** master-detail (collections/documents) + painel de query que chama
   `ds.query()` e renderiza resultados ordenados por score com destaque do excerpt.
2. **Por que agora:** DoD M5 superfície 4; validação do input de query na fronteira
   (EmptyQueryError → mensagem inline, fail-fast).

#### Evidence
ROADMAP § M3 (Knowledge tab: collections/documents/chunks + retrieval playground);
Blueprint §"T4" (query com scores).

#### Files to edit
```
packages/studio/src/pages/knowledge/index.tsx (NEW)
packages/studio/src/pages/knowledge/knowledge.test.tsx (NEW)
packages/studio/src/app/routes.tsx — página real
```

#### Deep Dives
- Scores exibidos com 2 casas + barra proporcional; strategy label vinda da fixture.
- Edge: query vazia → erro inline (não chama datasource — validação na fronteira,
  `rules/error-handling.md § 2`); collection sem documentos → EmptyState local.

#### Tasks
1. RED tests. 2. GREEN. 3. REFACTOR.

#### TDD
```
RED:  knowledge.test.tsx :: browses_collections_documents_chunks() —
      click em collection → documents; click em document → chunks visíveis
RED:  knowledge.test.tsx :: retrieval_query_renders_scored_results_sorted_desc() —
      digita query, submete; scores renderizados em ordem desc
RED:  knowledge.test.tsx :: blank_query_shows_inline_validation_error_without_datasource_call() —
      submete '  '; getByText(/query.*empty|informe/i); metrics.query_calls não incrementa
RED:  knowledge.test.tsx :: offline_scenario_shows_service_offline_state() — getByText(/theokit studio up/)
RED:  knowledge.test.tsx :: collection_without_documents_shows_local_empty_state() —
      seleciona collection vazia da fixture → EmptyState local (EC-6)
GREEN / REFACTOR / VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(scores).toEqual(sortedDesc); expect(queryCallsWithBlank).toBe(0)
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] Os 5 testes de `knowledge.test.tsx` retornam verde; validação de fronteira comprovada por `blank_query_shows_inline_validation_error_without_datasource_call()` (contador de chamadas === 0)

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

### T4.3 — Traces placeholder (honesto)

#### Objective
Página `/traces` SEMPRE em `ServiceOfflineState` no M5, com copy explicando que a
visualização é do theo-lens (embed no M2) — NUNCA árvore de trace mockada.

#### Why this step (action + reasoning)
1. **O que faz:** página mínima: `ServiceGate('lens')` (fixture de health retorna offline
   p/ lens) + copy com o plano (M2 embeda lens-web) e link p/ ROADMAP.
2. **Por que agora:** out-of-scope "trace UI from scratch" é decisão travada do grill;
   a tab existe para a navegação ficar completa e o estado ser honesto (Rule 3).

#### Evidence
Grill § decisões estruturais (Traces placeholder); CLAUDE.md invariante 5; ROADMAP § M2.

#### Files to edit
```
packages/studio/src/pages/traces/index.tsx (NEW)
packages/studio/src/pages/traces/traces.test.tsx (NEW)
packages/studio/src/app/routes.tsx — página real
```

#### Tasks
1. RED test. 2. GREEN. 3. (sem refactor esperado)

#### TDD
```
RED:  traces.test.tsx :: always_renders_offline_placeholder_with_lens_explanation() —
      getByText(/theo-lens/) e getByText(/theokit studio up/); expect(queryByTestId('trace-tree')).toBeNull()
GREEN / VERIFY: pnpm --filter @theokit/studio test
ASSERT shape: expect(traceTreeEl).toBeNull(); expect(lensCopy).toBeTruthy()
```

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- [ ] Teste verde; nenhuma renderização de spans/árvore no código da página (grep sem `span`/`trace-tree` component)

#### DoD (Definition of Done)
- [ ] `pnpm --filter @theokit/studio test`, `pnpm -r typecheck` e `pnpm check` retornam exit 0
- [ ] CHANGELOG `[Unreleased]` contém a entry desta task (verificar com `grep` do slug/feature)
- [ ] `wc -l` ≤ 500 em cada arquivo tocado pela task

---

## Coverage Matrix

| # | Gap / Requirement (fonte) | Task(s) | Resolution |
|---|---|---|---|
| 1 | SPA em `packages/studio` com `@theokit/ui`, standalone via Vite (ROADMAP M5 DoD-1) | T0.1, T2.1 | scaffold + shell navegável |
| 2 | Playground com chat mockado (M5 DoD-2a) | T1.2, T3.1 | stream fixture + chat |
| 3 | Event Inspector com eventos tipados de `Run.stream()` (M5 DoD-2b) | T1.2, T3.2 | roteiro tipado + timeline filtrável |
| 4 | Memory browser (M5 DoD-2c) | T4.1 | lista/escopo/busca sobre fixtures |
| 5 | Knowledge + retrieval playground fake com scores (M5 DoD-2d) | T4.2 | master-detail + query |
| 6 | Traces placeholder only (M5 DoD-2e + out-of-scope lock) | T4.3 | offline state honesto |
| 7 | Camada de dados DIP com fixtures dos tipos do SDK (M5 DoD-3) | T1.1, T1.2 | StudioDataSource + FixtureDataSource |
| 8 | Estados empty/loading/offline em toda tab de serviço (M5 DoD-4) | T2.2, T4.1, T4.2, T4.3 | ServiceGate + testes por estado |
| 9 | Build + testes + typecheck verdes no monorepo (M5 DoD-5) | T0.1, Fase Final | gates do monorepo |
| 10 | Blueprint Rec-4 (pipeline discriminated unions) | T3.1 | converter exaustivo com assertNever |
| 11 | Blueprint Rec-6 (config-injection seam p/ M1) | T2.1 | bootstrap lê `window.__STUDIO_CONFIG__` opcional (default fixtures) |
| 12 | Wiring triad — métrica de runtime (cycle-implement) | T1.1 (D5), Fase Final | contadores + assert não-zero |

**Coverage: 12/12 gaps covered (100%)**

## Global Definition of Done

- [ ] Todas as fases completas; `pnpm -r build && pnpm -r test && pnpm -r typecheck && pnpm check` verdes na raiz
- [ ] Coverage ≥ 90% em `packages/studio/src/data/` e ≥ 80% no pacote (v8) — `pnpm --filter @theokit/studio test -- --coverage`
- [ ] Zero type errors (`tsc --noEmit` strict); zero lint warnings (Biome)
- [ ] Todo arquivo ≤ 500 LoC (`rules/architecture.md` default)
- [ ] CHANGELOG.md `[Unreleased]` atualizado a cada task (Unbreakable Rule 6)
- [ ] Runtime-metric proof: `datasource_calls_total` e `stream_events_played_total` assertados não-zero no teste de integração da Fase Final
- [ ] 5 rotas + estados offline/empty verificados por teste (matriz acima)
- [ ] Plan archived após merge (mover para `knowledge-base/plans/completed/`)

## Failure scenarios (when I/O external)

(none — no external I/O touched)

Fixtures são in-bundle; não há HTTP/DB/queue no M5 (a menção a WebSocket/SSE no ADR D3 é
uma alternativa REJEITADA, não I/O do plano). As falhas simuláveis (health rejeitando,
query inválida) são in-process e cobertas em T2.2/T4.2.

## Final Phase: Integration Validation (MANDATORY)

**Objective:** validar a cadeia completa no monorepo + prova de métrica em teste de integração.

### Execution

```
pnpm -r build
pnpm -r test
pnpm --filter @theokit/studio test -- --coverage
pnpm -r typecheck
pnpm check
```

Teste de integração dedicado (`packages/studio/src/app/integration.test.tsx`):
monta o App inteiro com FixtureDataSource, navega pelas 5 superfícies, executa um run no
playground, e asserta `window`-independent: `metrics.snapshot().datasource_calls_total`
agregado > 0 e `stream_events_played_total` ≥ length do roteiro default.

### Acceptance Criteria

- [ ] Todos os comandos acima exit 0
- [ ] Coverage ≥ 90% em `src/data/`, ≥ 80% no pacote
- [ ] `integration.test.tsx` navega as 5 superfícies e asserta `datasource_calls_total` > 0 e `stream_events_played_total` ≥ length do roteiro default
- [ ] Zero act() warnings / unhandled rejections — `pnpm --filter @theokit/studio test` com stderr limpo (spy de `console.error` === 0 calls nos testes de página)

### If Validation Fails

1. Classificar falha: causada pelo plano vs pré-existente (repo é greenfield — tudo é do plano).
2. Corrigir e re-rodar a cadeia completa.
3. Nada pré-existente para documentar (primeiro pacote do monorepo).
