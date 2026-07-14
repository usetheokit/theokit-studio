# Discovery Plan: Studio UX shell — padrões de UI/UX do Mastra Playground e Genkit Dev UI

> **Version 1.1** (2026-07-14 — MUST-FIX EC-1 + checkpoints EC-2/EC-3 absorvidos do edge-case
> review `knowledge-base/reviews/studio-ux-shell-edge-cases-2026-07-14.md`)
>
> Investigar como o Mastra Playground (fonte completa disponível) e o Genkit
> Dev UI (reflection API + serving layer; UI é pré-buildada) estruturam suas SPAs de dev:
> shell/navegação, playground de chat com eventos streamados, estados empty/loading/offline,
> camada de dados, dependências, tooling e estratégia de testes. O blueprint resultante
> fundamenta o plano do M5 (Studio UX shell sobre fixtures, sem integração).

**Slug:** `studio-ux-shell`
**Owner:** paulo
**Created:** 2026-07-14
**Time budget:** 7h total (mastra 5h, genkit 2h — ver ADR D1)

## Context

O ROADMAP.md § M5 (adicionado 2026-07-14 via `/roadmap-feature`, grill em
`knowledge-base/grills/studio-ux-shell-feature-grill.md`) define o UX shell: SPA real em
`packages/studio` com `@theokit/ui`, 5 superfícies navegáveis sobre fixtures, camada de dados
atrás de interface (DIP, per `rules/architecture.md § 2`), estados empty/loading/offline em
toda tab backed-by-serviço. O `docs/studio-deep-research-2026-07-14.md` já mapeou as
arquiteturas em prosa (reflection API do Genkit, dev-server+SPA do Mastra), mas **nenhuma
investigação leu o código-fonte das telas** — este discovery fecha esse gap antes do
`/to-plan M5`. Riscos do grill que este discovery mitiga: fixture drift (Q3 mapeia os shapes
reais que a camada de dados deve espelhar) e gaps do `@theokit/ui` (Q1/Q2 produzem o
inventário de componentes que o Studio exige).

## Objective

O blueprint deve permitir decidir **a estrutura de telas, navegação, camada de dados mockada e
estratégia de testes do `packages/studio`** sem re-trabalho quando M1/M2/M3 integrarem dados
reais.

- [ ] Todas as research questions respondidas com citações a `.claude/knowledge-base/references/`
- [ ] Tabela comparativa Mastra × Genkit populada (superfícies, dados, estados)
- [ ] Recomendações: ≥ 1 proposta de decisão concreta por research question
- [ ] Inventário de componentes de UI necessários (input para gap-check do `@theokit/ui`)
- [ ] `/discover-confidence` verdict ≥ SHIPPABLE_WITH_CAVEATS

## In-Scope / Out-of-Scope

### In-Scope (per reference project)

| Project | In-scope subdirectories | Reason |
|---|---|---|
| `.claude/knowledge-base/references/mastra/` | `packages/playground/src/` (App.tsx, pages/, domains/, services/, lib/nav/, store/, hooks/), `packages/playground/e2e/`, `packages/playground/package.json`, `packages/playground/vite.config.ts`, `packages/playground-ui/src/` (ds/, domains/, components-exports.test.ts), `packages/playground-ui/package.json` | Referência primária de UX: única com código-fonte completo das telas (playground = app; playground-ui = design system + domains) |
| `.claude/knowledge-base/references/genkit/` | `genkit-tools/reflectionApi.yaml`, `genkit-tools/cli/src/commands/ui-start.ts`, `genkit-tools/cli/src/commands/start.ts`, `genkit-tools/common/`, `tests/src/dev_ui_test.ts`, `js/testapps/dev-ui-gallery/` | Referência de contrato de dados (reflection API) e de serving/teste de Dev UI |

### Out-of-Scope (explicit)

| Project / Subdir | Why excluded |
|---|---|
| `mastra/**/ee/**` (inclui `packages/playground/src/ee/`, `packages/playground-ui/src/ee/`) | Licença comercial separada (`ee/LICENSE`) — NUNCA ler/portar (gate de licença do catálogo, ROADMAP § State-of-the-art references) |
| `mastra/packages/{cli,core,memory,rag,server,...}` e demais dirs fora de playground/playground-ui | M5 é UI-only; backend do Mastra não fundamenta o UX shell |
| `mastra/docs/`, `mastra/examples/`, `mastra/templates/` | Docs/exemplos, não fonte de verdade das telas |
| `genkit/go/`, `genkit/py/`, `genkit/js/` (exceto `js/testapps/dev-ui-gallery/`) | Runtimes/SDKs — fora do escopo de UI |
| UI Angular pré-buildada do Genkit | Fonte não está no repo clonado (ver ADR D3) — nunca afirmar feature sem ler fonte |
| `**/node_modules/`, `**/dist/`, build artifacts | Artefatos |

## ADRs

### D1 — Time budget + stop conditions

**Decision:** mastra 5h, genkit 2h.

**Rationale:** Mastra é o único peer com fonte completa das telas — mergulho mais profundo;
Genkit contribui contrato de dados (reflection API) e padrões de serving/teste, investigação
mais estreita. Alternativas consideradas: split igual (desperdiça budget no Genkit sem fonte
de UI); só Mastra (perde o contrato de reflection que o M1 consumirá).

**Stop condition — per question (mandatory):** quando a Fase A de uma questão retornar vazio
após 3 tentativas com variantes de query (pattern → kind → path alternativo → escopo mais
largo), marcar a questão BLOCKED com razão "Fase A exhausted" e seguir para a próxima. Não
preencher com hotspots de outra questão.

**Stop condition — per project (mandatory):** budget do projeto esgotado com questões
pendentes → marcar todas as restantes daquele projeto BLOCKED com razão "budget exhausted" e
avançar. Se todo projeto restante estiver nesse estado, emitir `<promise>BLUEPRINT_BLOCKED</promise>`
(nunca `BLUEPRINT_COMPLETE` com questões bloqueadas).

**Anti-pattern:** NUNCA fabricar respostas de Fase B para fechar questão com Fase A esgotada
(Unbreakable Rule 3).

**Consequences:** questões bloqueadas viram seed do próximo discovery; blueprint as expõe em
`## Blocked questions`.

### D2 — Investigation depth

**Decision:** Fase A por ast-grep/Grep para mapa de hotspots; Fase B com Read integral apenas
dos hotspots. No `playground-ui/src/ds/`, inventariar componentes por listagem + leitura de
exports (não ler cada componente linha a linha).

**Rationale:** o objetivo é padrões de composição e inventário de superfícies/componentes, não
reimplementação pixel-perfect. Ler ds/ inteiro (centenas de arquivos) estouraria o budget sem
ganho para o M5 (KISS). Alternativa considerada: leitura end-to-end de playground-ui — rejeitada
por budget.

**Consequences:** detalhes de estilização interna dos componentes ficam de fora; se o plano do
M5 precisar deles, novo discovery estreito.

### D3 — Genkit Dev UI: investigar contrato e serving, não telas

**Decision:** para o Genkit, responder questões via `reflectionApi.yaml`, comandos de serving
(`ui-start.ts`, `start.ts`), `genkit-tools/common/` e `tests/src/dev_ui_test.ts` — declarar
honestamente que o código Angular das telas NÃO está no repo clonado.

**Rationale:** verificado em 2026-07-14: não existe diretório de fonte da UI no clone (a UI é
distribuída pré-buildada). Afirmar padrões de tela do Genkit sem fonte violaria a regra
cross-project ("never claim a project feature without reading its source") e criaria citações
fabricadas (hard cap do discover-confidence).

**Consequences:** padrões de tela vêm 100% do Mastra; o Genkit contribui o contrato
action-list/run/stream que inspira a interface da camada de dados fixture-backed do M5
(alinhado a `rules/architecture.md § 2` — domínio define a interface, adapter implementa).

### D4 — Testes das referências lidos sob a lente da pirâmide

**Decision:** mapear a estratégia de testes do Mastra playground contra a pirâmide de
`rules/testing.md § 2` (unit/integration/e2e) e capturar o que é mockado vs real.

**Rationale:** o M5 é fixtures-only — a fronteira mock/real das referências é exatamente a
decisão que o plano do M5 precisa tomar. Alternativa: pular testes — rejeitada (corner
obrigatório e DoD do M5 exige suite verde).

**Consequences:** Q4/Q5 produzem o esqueleto do test plan do M5.

## Research Questions

| # | Question | Corner | Reference project(s) | Fase A (broad) | Fase B (deep — Read) | Expected answer shape |
|---|---|---|---|---|---|---|
| Q1 | Como o Mastra playground compõe o shell da SPA — roteamento, navegação lateral, mapa de páginas/superfícies — e quais padrões de estado empty/loading/error usa nas telas backed-by-serviço? | techniques | `.claude/knowledge-base/references/mastra/packages/playground/` | Glob em `.claude/knowledge-base/references/mastra/packages/playground/src/pages/` + `.claude/knowledge-base/references/mastra/packages/playground/src/lib/nav/` p/ mapa de rotas; Grep `-i "empty\|skeleton\|offline\|fallback"` em `.claude/knowledge-base/references/mastra/packages/playground-ui/src/ds/components/` | Read `.claude/knowledge-base/references/mastra/packages/playground/src/App.tsx`, entradas de pages/ e nav/, componentes de empty-state encontrados | Tabela rota → página → domain/componente; catálogo de padrões de estado com `path:line` |
| Q2 | Como o Mastra renderiza o chat do playground e o stream de eventos tipados do agente (text deltas, tool calls) — que camada converte eventos do runtime em UI? | techniques | `.claude/knowledge-base/references/mastra/` | Grep `stream\|onChunk\|parts` em `.claude/knowledge-base/references/mastra/packages/playground/src/services/` e `.claude/knowledge-base/references/mastra/packages/playground/src/domains/conversation/` | Read `.claude/knowledge-base/references/mastra/packages/playground/src/services/om-parts-converter.ts`, `.claude/knowledge-base/references/mastra/packages/playground/src/services/mastra-runtime-state.ts`, arquivos-chave de domains/conversation/ | Diagrama de fluxo evento→UI + inventário de tipos de parte renderizados, com citações |
| Q3 | Que superfícies e operações o contrato do Genkit Dev UI expõe (reflection API: list/run/stream de actions, traces) e como o CLI serve a UI — o que a interface da camada de dados fixture-backed do M5 deve espelhar? | techniques | `.claude/knowledge-base/references/genkit/` | SKIP Fase A (text-shape) — targets conhecidos: `.claude/knowledge-base/references/genkit/genkit-tools/reflectionApi.yaml`, `.claude/knowledge-base/references/genkit/genkit-tools/cli/src/commands/ui-start.ts`, `.claude/knowledge-base/references/genkit/genkit-tools/cli/src/commands/start.ts` | Read os 3 arquivos + APENAS `.claude/knowledge-base/references/genkit/genkit-tools/common/src/types/`, `.claude/knowledge-base/references/genkit/genkit-tools/common/src/manager/`, `.claude/knowledge-base/references/genkit/genkit-tools/common/src/server/` (EC-1: demais subpacotes de common/ out-of-scope) | Tabela endpoint → operação → shape de resposta; padrão de serving; proposta de interface p/ StudioDataSource |
| Q4 | Como o Mastra testa o playground — o que roda unit (Vitest) vs e2e (Playwright kitchen-sink) e o que é mockado vs real em cada nível? | tests | `.claude/knowledge-base/references/mastra/packages/playground/` | Glob em `.claude/knowledge-base/references/mastra/packages/playground/e2e/`; Grep `mock\|msw\|fixture` em `.claude/knowledge-base/references/mastra/packages/playground/src/` | Read `.claude/knowledge-base/references/mastra/packages/playground/e2e/playwright.config.ts`, amostra de e2e/tests/ e e2e/kitchen-sink/, `.claude/knowledge-base/references/mastra/packages/playground/src/services/__tests__/`, `.claude/knowledge-base/references/mastra/packages/playground/src/bootstrap.test.ts` | Tabela nível → runner → o que cobre → mock/real, mapeada à pirâmide de `rules/testing.md` |
| Q5 | O que o smoke de Dev UI do Genkit (`dev_ui_test.ts`) valida — que assertions definem "a Dev UI está funcional"? | tests | `.claude/knowledge-base/references/genkit/` | SKIP Fase A (arquivo único conhecido) | Read `.claude/knowledge-base/references/genkit/tests/src/dev_ui_test.ts` + contexto de `.claude/knowledge-base/references/genkit/js/testapps/dev-ui-gallery/` | Lista de assertions → critério de aceite equivalente p/ o smoke do M5 |
| Q6 | Quais dependências runtime sustentam playground e playground-ui (router, data-fetching/state, streaming, componentes) e em que versões? | deps | `.claude/knowledge-base/references/mastra/` | SKIP Fase A (text-shape) — targets: `.claude/knowledge-base/references/mastra/packages/playground/package.json`, `.claude/knowledge-base/references/mastra/packages/playground-ui/package.json` | Read ambos package.json; classificar deps por papel (routing/state/streaming/UI) | Tabela dep → versão → papel → equivalente já disponível no toolchain TheoKit (rung 4 da parsimony ladder) |
| Q7 | Como o playground roda standalone em dev — Vite config, scripts, portas, proxy — e o que isso implica para o `packages/studio` rodar sem `theokit dev`? | tools | `.claude/knowledge-base/references/mastra/packages/playground/` | SKIP Fase A (text-shape) — targets: `.claude/knowledge-base/references/mastra/packages/playground/vite.config.ts`, `.claude/knowledge-base/references/mastra/packages/playground/index.html` | Read os 2 + scripts do package.json + `.claude/knowledge-base/references/mastra/packages/playground/src/bootstrap.ts` (como a app descobre o server) | Receita de dev standalone + lista de assunções de ambiente que o M5 substitui por fixtures |

## Coverage Matrix

| Corner | Questions mapped | Status |
|---|---|---|
| Integration tests | Q4, Q5 | Covered |
| Dependencies | Q6 | Covered |
| Tools | Q7 | Covered |
| Techniques | Q1, Q2, Q3 | Covered |

**Coverage: 4/4 corners covered (100%)**

## Halt-loop Checkpoints

| Checkpoint | Assertion | Action if fails |
|---|---|---|
| Before answering Qx | Todo path declarado na Fase A existe em `.claude/knowledge-base/references/` | Marcar Qx BLOCKED "path not found", continuar |
| Per-question Fase A budget | Fase A retornou ≥ 1 hotspot OU 3 variantes tentadas | Após 3 retries vazios, BLOCKED "Fase A exhausted"; continuar |
| ee/ guard | Nenhum path lido/citado contém `/ee/` | Descartar o hotspot; se era o único, registrar a lacuna honestamente (nunca ler ee/) |
| Hotspot cap (EC-2) | Fase B lê ≤ 10 hotspots representativos por questão (Q1: priorizar `playground-ui/src/ds/components/` + 1 uso real por padrão) | Selecionar os 10 mais representativos; registrar no blueprint que o inventário é amostral |
| Type-following (EC-3) | Definições de tipos seguidas apenas via `packages/playground/src/vendor/@mastra/core` — nunca `mastra/packages/core/` | Usar a cópia vendorizada; se ausente, registrar shape observado no uso, sem expandir escopo |
| After answering Qx | Seção do blueprint de Qx tem ≥ 1 citação `path:line` | Re-iterar Qx (1 retry max) |
| Mid-loop sanity | Citações a `.claude/knowledge-base/references/` ≥ 1 / 200 palavras de prosa | Adicionar citações (1 retry max) |
| Per-project time budget | Budget do projeto não esgotado | Esgotado → BLOCKED nas questões restantes; avançar projeto |
| Before promising complete | 4/4 corners com seções populadas no blueprint | Recusar promise, continuar iterando |

## Acceptance Criteria

- [ ] Todas as questões respondidas OU explicitamente BLOCKED com razão
- [ ] 4 coverage corners com seções populadas no blueprint
- [ ] Toda citação aponta para path real em `.claude/knowledge-base/references/{...}`
- [ ] Nenhuma citação contém `/ee/` (guard de licença)
- [ ] ≥ 1 seção de ADR no blueprint sintetizando decisões para o M5
- [ ] Inventário de componentes de UI (input do gap-check `@theokit/ui`) presente
- [ ] Time budget respeitado por projeto
- [ ] `/discover-confidence` ≥ SHIPPABLE_WITH_CAVEATS
- [ ] Blueprint salvo em `.claude/knowledge-base/discoveries/blueprints/studio-ux-shell-blueprint.md`

## Global Definition of Done

- [ ] Todas as fases do cycle-discover completadas (plan → edge-cases → plan-confidence → execute → confidence → improve se necessário)
- [ ] Verdict final do `/discover-confidence` registrado no header do blueprint
- [ ] Zero citações fabricadas
- [ ] Coverage Matrix 100%
- [ ] ADRs citam princípios do projeto: D2 (KISS), D3 (`rules/architecture.md § 2` DIP), D4 (`rules/testing.md § 2` pirâmide)
