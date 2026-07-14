# Blueprint: Studio UX shell — padrões de UI/UX do Mastra Playground e Genkit Dev UI

> **Version 1.0** — Sintetiza a investigação do código-fonte do Mastra Playground
> (`packages/playground` + `packages/playground-ui`) e do contrato do Genkit Dev UI
> (reflection API + serving + smoke test) para fundamentar o plano do M5: a SPA
> `packages/studio` com 5 superfícies sobre fixtures, camada de dados atrás de interface
> (DIP) e estados empty/loading/offline como cidadãos de primeira classe.

**Slug:** `studio-ux-shell`
**Source plan:** `.claude/knowledge-base/discoveries/plans/studio-ux-shell-plan.md`
**Owner:** paulo
**Generated:** 2026-07-14 via `/discover-execute` (halt-loop inline; snapshot dos clones: 2026-07-14, branch main)
**Confidence verdict:** SHIPPABLE (100 — 2026-07-14, zero hard/soft caps; 40 citações únicas verificadas, 0 fabricadas)

## Context

ROADMAP § M5 (UX shell fixtures-only) exige decidir estrutura de telas, navegação, camada
de dados mockada e estratégia de testes ANTES do `/to-plan`. O deep-research anterior
(`docs/studio-deep-research-2026-07-14.md`) cobriu arquiteturas em prosa; este blueprint lê
o código real. Guard de licença: nenhum path `/ee/` foi lido ou citado (carve-out comercial
do Mastra).

## Objective

Permitir que o plano do M5 especifique telas, navegação, interface da camada de dados e
test plan do `packages/studio` sem re-trabalho quando M1/M2/M3 integrarem dados reais.

---

## Coverage Corner 1 — Integration Tests

### mastra (Q4)

| Nível | Runner | O que cobre | Mock ou real |
|---|---|---|---|
| Unit/component | Vitest + Testing Library | hooks, componentes, lógica | MSW — rede mockada, hooks reais |
| Integration (data-fetching) | Vitest + React Query + MSW | fluxos de fetching, cache, gating | MSW server compartilhado |
| E2E | Playwright | jornadas cross-page com streaming | **servidor Mastra real** (kitchen-sink) |

- **Padrão MSW**: os testes nunca mockam os hooks de data-fetching com `vi.mock()`; mockam
  apenas a rede via handlers `http.get()/patch()` sobre um server MSW compartilhado —
  `.claude/knowledge-base/references/mastra/packages/playground/src/test/msw-server.ts:11`;
  exemplo com fixtures tipadas em
  `.claude/knowledge-base/references/mastra/packages/playground/src/domains/agents/components/__tests__/composer-model-settings.test.tsx:18`.
- **Kitchen-sink**: app Mastra real usada como alvo do e2e, com agents/workflows/MCPs
  declarados em
  `.claude/knowledge-base/references/mastra/packages/playground/e2e/kitchen-sink/src/mastra/index.ts:25`;
  sobe via `pnpm -C ./kitchen-sink dev` na porta 4111
  (`.claude/knowledge-base/references/mastra/packages/playground/e2e/playwright.config.ts:4`);
  reset de estado entre testes via endpoint dedicado `POST /e2e/reset-storage`
  (`.claude/knowledge-base/references/mastra/packages/playground/e2e/kitchen-sink/src/mastra/index.ts:66`).

### genkit (Q5)

O smoke `dev_ui_test.ts` define "Dev UI funcional" com 8 assertions encadeadas
(`.claude/knowledge-base/references/genkit/tests/src/dev_ui_test.ts:19`): UI carrega →
action listada (`testFlow`) → editor de input renderiza e aceita edição → botão Run executa
→ output aparece → "View trace" acessível → trace detail carrega. Harness Puppeteer com
polling de health por 30s
(`.claude/knowledge-base/references/genkit/tests/src/utils.ts:26`), rodando contra a app de
teste `dev-ui-gallery`
(`.claude/knowledge-base/references/genkit/js/testapps/dev-ui-gallery/README.md:1`).

**Leitura para o M5 (pirâmide de `rules/testing.md § 2`):** unit/component contra a camada
de dados fixture (sem MSW — ver ADR D4), e o equivalente do smoke do Genkit vira o
checklist de aceite manual/e2e do shell.

---

## Coverage Corner 2 — Dependencies

### mastra (Q6)

Runtime deps do `packages/playground` (citações em
`.claude/knowledge-base/references/mastra/packages/playground/package.json:30` e seguintes):

| Papel | Dependência | Versão |
|---|---|---|
| Routing | `react-router` | ^7.13.1 |
| Server state | `@tanstack/react-query` | ^5.90.21 |
| Client state | `zustand` | ^5.0.12 |
| Cliente tipado | `@mastra/client-js` | workspace |
| Chat/stream hooks | `@mastra/react` | workspace |
| Toasts | `sonner` | ^2.0.7 |
| Primitivos UI | `@radix-ui/react-dialog` (+dropdown etc.) | ^1.x |
| Graph view | `@xyflow/react` | ^12.10.1 |
| Charts | `recharts` | ^3.8.0 |
| Markdown | `react-markdown` | ^9.1.0 |
| Ícones | `lucide-react` | ^0.522.0 |
| Forms | `react-hook-form` + `zod` | ^7.71 / ^3.25 |
| Code editor | `@uiw/react-codemirror` | ^4.25.11 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | 4.2.2 |
| Build | `vite` | ^7.3.1 |
| Test mocking | `msw` (dev) | ^2.6.0 |

O `playground-ui` expõe os mesmos fundamentos como peerDeps (`@tanstack/react-query`,
`tailwindcss` ^4) — `.claude/knowledge-base/references/mastra/packages/playground-ui/package.json:1`.

### genkit

Serving da UI usa Express + tRPC no pacote de tools
(`.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/router.ts:110`);
a UI em si é distribuída pré-buildada (fora do repo — ADR D3 do plano), então não há
inventário de deps de tela investigável.

**Leitura para o M5 (rung 4 da parsimony ladder):** o Studio já tem `@theokit/ui` como
pilar; das deps do Mastra, as candidatas mínimas para o shell fixtures-only são router +
markdown + ícones — server-state lib (React Query) só se justifica quando M1 trouxer rede
real; zustand/recharts/xyflow ficam fora do M5 (YAGNI).

---

## Coverage Corner 3 — Tools

### mastra (Q7)

- **Dev standalone:** `pnpm dev` com `MASTRA_AUTO_DETECT_URL=true`
  (`.claude/knowledge-base/references/mastra/packages/playground/package.json:30`); Vite na
  porta 3000; servidor Mastra esperado em 4111
  (`.claude/knowledge-base/references/mastra/packages/playground/vite.config.ts:246`).
- **Descoberta do server via placeholders no HTML:** plugin Vite substitui
  `%%MASTRA_SERVER_HOST%%`/`%%MASTRA_SERVER_PORT%%`/`%%MASTRA_API_PREFIX%%`
  (`.claude/knowledge-base/references/mastra/packages/playground/vite.config.ts:12`) — o
  build é agnóstico de ambiente e o host injeta a configuração.
- **Proxy dev:** `/api/*` e `/voice/*` → `localhost:4111`
  (`.claude/knowledge-base/references/mastra/packages/playground/vite.config.ts:258`).
- **Bootstrap defensivo:** entry `index.html` → `src/bootstrap.ts` captura falha de load e
  renderiza erro em DOM puro, sem React
  (`.claude/knowledge-base/references/mastra/packages/playground/src/bootstrap.ts:1`,
  `.claude/knowledge-base/references/mastra/packages/playground/src/startup-error.ts:1`).

### genkit (Q3 — serving)

- Assets da UI baixados de GCS e servidos por `express.static` com fallback SPA para
  `index.html`
  (`.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:37` e
  `:349`); porta default 4000 com fallback 4000-4099
  (`.claude/knowledge-base/references/genkit/genkit-tools/cli/src/commands/ui-start.ts:50`);
  health-check `/api/__health` + metadata em `.genkit/tools.json`
  (`.claude/knowledge-base/references/genkit/genkit-tools/cli/src/commands/ui-start.ts:131`).

**Leitura para o M5:** o `packages/studio` roda `vite dev` puro sem servidor nenhum
(fixtures in-bundle); os padrões que ficam são: build agnóstico com injeção de config pelo
host (placeholder pattern do Mastra — vira o seam do M1 para `theokit dev`), bootstrap
defensivo com startup-error, e health/offline detection como estado de UI.

---

## Coverage Corner 4 — Techniques

### T1 — Shell da SPA: rotas explícitas + sidebar hierárquica + breadcrumbs (Q1)

| Aspecto | Padrão Mastra | Citação |
|---|---|---|
| Rotas | React Router com mapa explícito em App.tsx (`/agents`, `/agents/:id/chat`, `/tools`, `/mcps`, `/observability`, `/logs`…) | `.claude/knowledge-base/references/mastra/packages/playground/src/App.tsx:484` |
| Navegação | `nav-items.tsx` declara 3 seções (Primitives / Evaluation / Observability) + bottom nav (Settings/Resources) | `.claude/knowledge-base/references/mastra/packages/playground/src/lib/nav/nav-items.tsx:58` |
| Sidebar | `AppSidebar` (logo + search/command + seções + versão no rodapé) sobre compound `MainSidebar` | `.claude/knowledge-base/references/mastra/packages/playground/src/components/ui/app-sidebar.tsx:42`, `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/MainSidebar/main-sidebar.tsx:23` |
| Breadcrumbs | route `handle` metadata (`navHandle`/`navCrumb`) alimenta `RouteHeader` | `.claude/knowledge-base/references/mastra/packages/playground/src/lib/nav/index.ts:10`, `.claude/knowledge-base/references/mastra/packages/playground/src/lib/route-header/route-header.tsx:22` |
| Layouts | `Layout` (chrome completo com ErrorBoundary por rota, Toaster, ThemeProvider) + `MinimalLayout` | `.claude/knowledge-base/references/mastra/packages/playground/src/components/layout.tsx:102`, `.claude/knowledge-base/references/mastra/packages/playground/src/App.tsx:205` |

### T2 — Estados padronizados: empty / loading / no-match / error / offline (Q1)

Catálogo do design system (inventário amostral — cap de 10 hotspots, per plano EC-2):

| Estado | Componente | Shape | Citação |
|---|---|---|---|
| Empty | `EmptyState` (iconSlot/titleSlot/descriptionSlot/actionSlot) | ícone → título → descrição → ação (link p/ docs) | `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/EmptyState/EmptyState.tsx:1` |
| Loading | `Skeleton` (shimmer) + `DataListSkeleton`/`ItemListSkeleton` (linhas × colunas) | placeholder estrutural da lista | `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/Skeleton/skeleton.tsx:1`, `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/DataList/data-list-skeleton.tsx:1` |
| No-match | `DataListNoMatch` (busca sem resultado ≠ empty) | mensagem custom | `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/DataList/data-list-no-match.tsx:1` |
| Error | `ErrorState` (title/message/action) + diferenciação 401/403 na página | ícone vermelho → título → mensagem → retry | `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/ErrorState/ErrorState.tsx:1`, `.claude/knowledge-base/references/mastra/packages/playground/src/pages/agents/index.tsx:17` |
| Offline/não-configurado | `PlaygroundConfigGuard` fullscreen quando `baseUrl` ausente | logo + form de configuração | `.claude/knowledge-base/references/mastra/packages/playground/src/domains/configuration/components/playground-config-guard.tsx:1`, `.claude/knowledge-base/references/mastra/packages/playground/src/App.tsx:730` |
| Startup error | `renderStartupError` em DOM puro (pré-React) | `<main role="alert">` com stack em dev | `.claude/knowledge-base/references/mastra/packages/playground/src/startup-error.ts:1` |

Uso real do trio empty/loading/no-match numa lista:
`.claude/knowledge-base/references/mastra/packages/playground/src/domains/agents/components/agent-list/agents-list.tsx:35`
e empty dedicado
`.claude/knowledge-base/references/mastra/packages/playground/src/domains/agents/components/agent-list/no-agents-info.tsx:1`.

### T3 — Pipeline evento→UI do chat (Q2)

Fluxo em camadas no Mastra (todas as citações abaixo):

1. `useChat()` (`@mastra/react`) recebe chunks tipados; `onChunk` despacha —
   `.claude/knowledge-base/references/mastra/packages/playground/src/lib/ai-ui/chat/use-chat-send-handler.ts:230`.
2. Narrowing por discriminated union de chunks (`asHandledStreamChunk`) —
   `.claude/knowledge-base/references/mastra/packages/playground/src/lib/ai-ui/chat/use-chat-send-handler.ts:42`.
3. `ChatProvider` agrega `messages` e expõe 4 contexts memoizados (messages/running/send/tasks)
   — `.claude/knowledge-base/references/mastra/packages/playground/src/lib/ai-ui/chat/chat-provider.tsx:84` e `:317`.
4. Conversor de parts especiais para o formato renderizável (`om-parts-converter.ts` mapeia
   parts custom em `dynamic-tool` com `state: input-available|output-available`) —
   `.claude/knowledge-base/references/mastra/packages/playground/src/services/om-parts-converter.ts:243`.
5. `MessageRow` roteia por tipo de part via dict de renderers discriminado (text /
   reasoning / tool-invocation / dynamic-tool / file / data-*) —
   `.claude/knowledge-base/references/mastra/packages/playground/src/lib/ai-ui/messages/message-row.tsx:198`.
6. `ToolCard` roteia tool calls para renderers especializados (badge custom quando
   `toolName` casa com um tipo interno) —
   `.claude/knowledge-base/references/mastra/packages/playground/src/lib/ai-ui/tools/tool-card.tsx:60`.

Insight-chave: **tipagem por discriminated unions TS + narrowing em runtime, sem validação
de schema em runtime**; erros de stream viram mensagem renderizável
(`.claude/knowledge-base/references/mastra/packages/playground/src/services/stream-error-message.ts:1`).

### T4 — Contrato de dados de um Dev UI (Q3)

Operações que o Genkit expõe e que definem a interface mínima de uma camada de dados de
dev UI (citações por linha):

| Operação | Shape | Citação |
|---|---|---|
| List actions | `Record<key, Action{name, description, inputSchema, outputSchema, metadata}>` | `.claude/knowledge-base/references/genkit/genkit-tools/common/src/types/action.ts:48`, `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/router.ts:110` |
| Run action | `{key, input, context}` → `{result, telemetry:{traceId}}` | `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:154` |
| Run action (stream) | chunked JSON `\n`-delimited; traceId via header antes do 1º chunk | `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:202` |
| List traces | `{limit, continuationToken, filter}` → `{traces: TraceData[], continuationToken}` | `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/router.ts:137`, `.claude/knowledge-base/references/genkit/genkit-tools/common/src/types/apis.ts:53` |
| Get/stream trace | `TraceData{traceId, spans: Record<spanId, SpanData>}`; SSE p/ updates | `.claude/knowledge-base/references/genkit/genkit-tools/common/src/types/trace.ts:139`, `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:296` |
| Health | `/api/__health` | `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/server.ts:337` |

---

## Cross-cutting Comparison

| Dimensão | mastra playground | genkit dev ui |
|---|---|---|
| Fonte das telas | 100% no repo (React) | pré-buildada (Angular, fora do repo) |
| Descoberta de entidades | cliente tipado `@mastra/client-js` sobre REST do server | reflection API (OpenAPI) + tRPC |
| Streaming | chunks tipados via hook `useChat` | chunked JSON + SSE p/ traces |
| Estados de indisponibilidade | ConfigGuard + startup-error + 401/403 dedicados | health polling no CLI |
| Testes | Vitest+MSW (unit) / Playwright vs server real (e2e) | smoke Puppeteer (8 assertions) |
| Config do host | placeholders `%%…%%` injetados no HTML | metadata `.genkit/tools.json` |

## ADRs

### D1 — Shell: rotas explícitas + sidebar de seções + estados por rota

**Decision:** o `packages/studio` adota o padrão Mastra: mapa de rotas explícito, sidebar
com seções nomeadas (Studio: *Playground*, *Observability* [Traces], *Data* [Memory,
Knowledge]), breadcrumb via route metadata, ErrorBoundary por rota.

**Rationale:** é o padrão comprovado da referência primária
(`.claude/knowledge-base/references/mastra/packages/playground/src/App.tsx:484`,
`.claude/knowledge-base/references/mastra/packages/playground/src/lib/nav/nav-items.tsx:58`)
e mapeia 1:1 nas 5 superfícies do M5. SRP por página; composição por compound components.

**Alternatives considered:** file-based routing (framework meta tipo Next) — rejeitado:
SPA embutida em dev server não precisa de SSR e o padrão da categoria é CSR (Mastra e
Genkit); tabs sem router — rejeitado: perde deep-linking (`/_studio/agents/:id`), que o M1
vai precisar.

**Consequences:** rotas do M5 já nascem com os paths que o `theokit dev` montará em
`/_studio`; navegação e breadcrumbs ficam estáveis entre M5→M1.

### D2 — Camada de dados: interface `StudioDataSource` com implementação fixtures

**Decision:** o domínio da UI define uma interface única de dados (list
agents/tools/skills/workflows; run agent com stream tipado; list/get memories; list
collections + retrieval query; service health) — assinada a partir do contrato do Genkit
(T4) e das superfícies do Mastra (T1); o M5 entrega `FixtureDataSource`; M1/M2/M3 trocam a
implementação sem tocar telas.

**Rationale:** DIP (`rules/architecture.md § 2` — domínio define a interface, adapter
implementa). O contrato reflection do Genkit
(`.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/router.ts:110`)
prova que list/run/stream/traces/health é o vocabulário suficiente de um dev UI.

**Alternatives considered:** MSW para mockar rede desde o M5 — rejeitado (YAGNI: não há
rede no M5; MSW entra se/quando os adapters reais precisarem de testes de fronteira);
fixtures hardcoded direto nos componentes — rejeitado (mata a troca limpa no M1).

**Consequences:** o "fixture drift" (risco nº 1 do grill) fica confinado a um módulo:
fixtures derivam dos tipos do `@theokit/sdk` 3.x importados na interface.

### D3 — Estados como cidadãos do design system

**Decision:** o M5 implementa o catálogo T2 com `@theokit/ui`: EmptyState, Skeleton
estrutural, NoMatch (≠ empty), ErrorState com retry, e um `ServiceOfflineState` por tab
backed-by-serviço instruindo `theokit studio up` (equivalente do `PlaygroundConfigGuard`
do Mastra). Startup-error em DOM puro no bootstrap.

**Rationale:** graceful degradation é invariante do produto (CLAUDE.md § 4); o Mastra
demonstra o custo baixo de padronizar
(`.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/EmptyState/EmptyState.tsx:1`).
Distinguir no-match de empty evita UX mentirosa em buscas.

**Alternatives considered:** tratar offline como erro genérico — rejeitado: a instrução
acionável ("rode `theokit studio up`") é o produto no M5.

**Consequences:** produz a lista de gaps concreta para o `@theokit/ui` (risco nº 2 do
grill) cedo: EmptyState/ErrorState/Skeleton/Sidebar compound/DataList são os candidatos a
contribuição upstream se faltarem.

### D4 — Testes do M5: unit/component contra fixtures; e2e adiado para M1

**Decision:** Vitest + Testing Library contra `FixtureDataSource` injetado (sem MSW, sem
Playwright no M5); o checklist do smoke do Genkit (8 assertions de Q5) vira o roteiro de
verificação manual do DoD e o esqueleto do e2e do M1.

**Rationale:** pirâmide de `rules/testing.md § 2` — a fronteira de rede não existe no M5,
então testes de fronteira seriam teatro; o e2e do Mastra só faz sentido com server real
(`.claude/knowledge-base/references/mastra/packages/playground/e2e/playwright.config.ts:4`),
que é exatamente o cenário do M1+.

**Alternatives considered:** Playwright contra fixtures já no M5 — rejeitado (custo alto,
prova pouco além do que component tests provam sem rede).

**Consequences:** DoD "build + testes + typecheck verdes" é atendível sem Docker/serviços;
o M1 herda um roteiro e2e pronto.

## Recommendations for the project

| # | Recommendation | Linked to | Priority |
|---|---|---|---|
| 1 | Estruturar `packages/studio` com rotas explícitas + sidebar de 3 seções + breadcrumb via route metadata | Q1, D1, `rules/architecture.md § 3` | HIGH |
| 2 | Definir `StudioDataSource` (list/run-stream/memories/knowledge/health) no domínio da UI; entregar `FixtureDataSource` com fixtures derivadas dos tipos `@theokit/sdk` 3.x | Q3, D2, `rules/architecture.md § 2` | HIGH |
| 3 | Implementar catálogo de estados (Empty/Skeleton/NoMatch/Error/ServiceOffline/startup-error) reusando `@theokit/ui`; gap vira contribuição upstream | Q1, D3, CLAUDE.md invariante 4 | HIGH |
| 4 | Pipeline evento→UI com discriminated unions dos eventos `Run.stream()` + dict de renderers por tipo de part (padrão T3) | Q2, D2 | HIGH |
| 5 | Test plan: Vitest+Testing Library com DataSource injetado; roteiro de aceite = 8 assertions do smoke Genkit adaptadas | Q4, Q5, D4, `rules/testing.md § 2` | HIGH |
| 6 | Vite standalone com config-injection pattern (placeholders/`window.__STUDIO_CONFIG__`) para o seam do M1 com `theokit dev` | Q7, D1 | MEDIUM |
| 7 | Deps mínimas no M5: router + ícones + markdown; adiar React Query/zustand/xyflow para quando houver rede/grafo real | Q6, parsimony ladder rung 4 | MEDIUM |

## Blocked questions (if any)

(nenhuma — 7/7 respondidas)

## Halt-loop progress (audit trail)

- Iterations used: 2 (iteração 1: 4 frentes de pesquisa paralelas; iteração 2: síntese)
- Questions answered: 7 / 7
- Questions blocked: 0
- Citations verified: ver sanity check pós-promise no log da sessão
- Promise emitted at iteration: 2
- Nota de engine: halt-loop dirigido inline pelo agente principal (Stop hook de sessão já
  ativo via /goal; ralph-loop concorrente violaria `rules/loop-engine-convention.md § Anti-patterns`)

## Related

- Discovery plan: `.claude/knowledge-base/discoveries/plans/studio-ux-shell-plan.md`
- Edge-case review: `.claude/knowledge-base/reviews/studio-ux-shell-edge-cases-2026-07-14.md`
- Project rules citadas: `.claude/rules/architecture.md`, `.claude/rules/testing.md`
