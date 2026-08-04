# TheoKit Studio — Roadmap

> Created 2026-07-14 from `docs/theokit-studio-arquitetura-proposta.md` (architecture) and
> `docs/studio-deep-research-2026-07-14.md` (verified competitive research). Per-milestone task
> decomposition is the job of `/to-plan`.

> **Preâmbulo pré-`74a96c6` (nota de 2026-08-04, M7).** As seções Vision, Problem, Scope,
> Success criteria e North-star abaixo descrevem a intenção de produto de 2026-07-14, quando o
> Studio tinha cinco superfícies. Em `74a96c6` vinte telas foram removidas e o produto ficou com
> o Agent Builder apenas; M2 e M3 estão cancelados. **O que o Studio entrega hoje está no
> README, não aqui.** Reescrever esta seção é decisão de produto em aberto (Q1 do plano
> `docs-dead-surface-reconciliation`) — o texto fica preservado, e não apagado, porque é o
> registro de por que os milestones existem.

## Vision

The local dev UI of the TheoKit stack — Mastra Studio / Genkit Dev UI experience — with a
differentiator no peer has: **dev/prod parity**. Traces, memories, and knowledge live in the
same Apache-2.0 services the user deploys with (theo-lens, theo-memory,
theo-rag), on one Postgres, up with one command. Everything survives hot-reloads and restarts —
the #1 documented pain of LangGraph's dev server.

## Problem

Developers building agents on TheoKit have no visual surface to inspect what their agent did:
no playground, no trace view, no memory browser. Peers (Mastra, Genkit, LangGraph, ADK) all
ship one — it is table-stakes in 2026 — but all of them treat dev data as ephemeral or push you
to a proprietary cloud UI.

## Users

- **Primary:** developers running `theokit dev` locally (external OSS adopters + internal Theo teams).
- **Secondary:** teams graduating from local Studio to Theo Cloud dashboards (funnel, not Studio scope).

## Scope

### In scope (V1)
- Unified docker compose (single pg16+pgvector instance, 3 databases, 3 services) + `theokit studio up`.
- Studio SPA embedded in `theokit dev` (same origin): playground, typed event inspector,
  traces (via theo-lens), memory browser, knowledge/RAG inspector.
- Reflection endpoint in the dev server over the live `@theokit/sdk` registry.
- Graceful degradation without Docker.

### Explicitly out of scope
- **Multi-tenant / auth'd Studio** — that is Theo Cloud's dashboard (pre-release). Studio is
  dev-only, single-tenant, auth-off.
- **Visual (no-code) agent builder** — different product category (Flowise/Langflow/Dify).
- **Building a trace UI from scratch** — theo-lens owns trace visualization.
- **Traefik/ForwardAuth edge in dev compose** — production topology, not Studio's.

## Constraints

TypeScript, pnpm 9.15, Node ≥22.12, TS 5.8 strict, Vitest, Biome, Changesets (locked toolchain).
`develop` single-trunk, release-only `main`. Studio targets `@theokit/sdk` 3.x. Services are
pre-release — label honestly. Real-LLM validation via OpenRouter (env key, never persisted).
Zero-API-key boot is a goal (local embedders/stubs), not yet verified for theo-rag.

## Success criteria

**V1 ship criterion:** `theokit studio up && theokit dev` on a fresh `create-theokit` app gives a
working playground + live event inspector + a trace visible in the Traces tab after one agent
run against a real LLM, with evidence recorded. Studio also loads with Docker absent (degraded).

**North-star:** time-from-`create-theokit`-to-first-inspected-trace (extends the ecosystem's
time-to-first-working-agent).

---

## Milestones

### M0 — [ ] Unified data stack (compose walking skeleton)

**Objective:** One command brings up postgres (single instance) + theo-memory + theo-lens +
theo-rag, healthy.

**Definition of done:**
- [ ] `docker-compose.studio.yaml` declares `pgvector/pgvector:pg16` plus an init script that creates the `themem`, `theolens` and `therag` databases.
- [ ] Each of the 3 services points at its own database and auto-migrates on boot; healthchecks are wired and a `--wait` boot is validated end-to-end.
- [ ] Dev-mode defaults are set: auth off / single workspace (`THEOLENS_REQUIRE_CREDENTIAL=0`, memory ALPHA mode, rag dev mode), with `THEOMEM_EMBEDDER` pinned and documented.
- [ ] Zero-key boot is verified or honestly documented (does rag-api run on the stub embedder?).
- [ ] Ports are overridable by env with no collisions out of the box (8080/4318/8787/5432).

**Dependencies:** none (foundation).
**Top risks:** service images not published → build-from-sibling-repo contexts; memory
embedding-dim drift if embedder changes after first migration.

### M1 — [ ] Studio table-stakes (reflection + SPA, no Docker required)

**Objective:** The Mastra/Genkit experience inside `theokit dev`: playground + live typed events.

> **Escopo reconciliado em 2026-08-04 (M7).** Dois critérios originais foram cancelados porque as
> telas que exigiam saíram em `74a96c6`. Eles ficam registrados **aqui, fora do bloco de
> Definition of done**, e não como bullets: o extrator de `cycle-acceptance` lê todo `- [ ]` do
> bloco como critério, então uma nota de cancelamento ali dentro tornaria o milestone
> permanentemente `NOT_VALIDATED` — o oposto do que esta reconciliação existe para resolver.
>
> - CANCELADO 2026-08-04: "Chat playground against any registered agent; event inspector
>   rendering `Run.stream()` typed events live (text deltas, tool calls, permissions,
>   rate-limit, completion)" — a tela foi removida em `74a96c6`; retomada é decisão de produto em
>   aberto (Q1 do plano `docs-dead-surface-reconciliation`).
> - CANCELADO 2026-08-04: "Works with Docker absent; service tabs show actionable
>   "run `theokit studio up`" state" — não existem abas de serviço desde `74a96c6`; a metade que
>   sobrevive (degradação graciosa) está no último bullet do DoD abaixo.

**Definition of done:**
- [ ] Reflection endpoint in the dev server exposes the live `@theokit/sdk` registry (agents, tools, skills, workflows) with no manifest file — `GET /_studio/api/agents` responds 200 with an `items` envelope.
- [ ] Studio SPA (built with current `@theokit/ui`) is served at `/_studio`, same origin as the dev server.
- [ ] A prompt submitted at `/builder` starts a build session that renders the assistant reply, the work log and the proposed files in the review pane, and the target-agent selector is populated from `GET /_studio/api/agents`. **Escopo honesto (2026-08-04, M7): a resposta do assistente e os arquivos propostos são fixtures roteirizados — o Builder não escreve arquivo em disco. Escrita real é escopo de um milestone futuro, não deste.**
- [ ] Studio loads and the Agent Builder works with Docker absent — no service dependency on the builder path.

**Dependencies:** none (parallel to M0).
**Top risks:** dev-server integration surface in `theokit` (Vite plugin vs server route);
SDK 3.x adoption ahead of the rest of the cluster.




### M5 — [x] Studio UX shell (all screens on fixtures, no integration)

> Added 2026-07-14 by `/roadmap-feature studio-ux-shell` (grill:
> `knowledge-base/grills/studio-ux-shell-feature-grill.md`). UX-first: validate the full
> Studio experience (Mastra Studio / Genkit Dev UI category) before investing in integration.
> Nothing is throwaway — offline/empty states are already a product requirement (graceful
> degradation invariant) and `@theokit/ui` dogfooding starts here.

**Objective:** The real Studio SPA with every surface navigable on mocked data (fixtures),
runnable standalone — so the experience can be seen, iterated, and locked before M0–M3 wire
real services in.

> **Entregue e depois revertido em parte.** Este milestone foi aceito quando as 5 superfícies
> existiam. Em `74a96c6` elas foram removidas e o Studio ficou com o Agent Builder apenas. O
> checkbox permanece `[x]` porque o trabalho *foi* entregue — o registro histórico não se
> reescreve; o que o produto tem hoje está no README, não aqui. (Nota de 2026-08-04, M7.)

**Definition of done:**
- [ ] SPA at `packages/studio` built with `@theokit/ui` (current major), running standalone via Vite dev server — no `theokit dev` and no Docker required.
- [ ] 5 surfaces navigable on fixtures: Playground (mocked chat), Event Inspector (typed `Run.stream()` fixtures), Memory browser, Knowledge/RAG inspector, and Traces as a placeholder only. **Superadas em 2026-08-04 (M7): removidas em `74a96c6`; ver README § Scope.**
- [ ] Data layer behind an interface (DIP), with fixtures derived from published `@theokit/sdk` 3.x types rather than hand-invented shapes, so M1/M2/M3 can swap in real implementations without touching the screens.
- [ ] Empty/loading/offline states present on every service-backed tab. **Superado em 2026-08-04 (M7): não existem abas de serviço desde `74a96c6`.**
- [ ] Build + tests + typecheck green in the monorepo.

**Dependencies:** none (parallel to M0/M1; external: `@theokit/ui` 1.x available).
**Top risks:** fixture drift vs real `@theokit/sdk` 3.x types (mitigate: import SDK types);
`@theokit/ui` 1.x gaps for Studio-grade components (event-stream viewer, graph view) —
treat as upstream contributions, not local forks.

---

### M6 — [x] Plugin hardening (blockers da code review)

> Added 2026-08-04 by `/roadmap-feature` (slug: `plugin-hardening`). See CHANGELOG `[Unreleased] § Added`.
> Evidence: `code-review-output/code-review.db` — findings #46, #47, #68, plus the contract and
> error-handling rows on `plugin/index.ts`, `plugin/agent-scan.ts`, `src/data/reflection-datasource.ts`.

**Objective:** Eliminar o defeito que derruba o dev server do usuário e fechar as lacunas de
contrato e de tratamento de erro na fronteira HTTP do plugin — a superfície publicada do pacote.

**Definition of done:**

- [ ] `sendErrorEnvelope` e `sendJson` (`plugin/http.ts:13,20`) verificam `res.headersSent`, e o branch de asset (`plugin/static-serve.ts:154`) lê o arquivo ANTES de comprometer o head — regressão provada por um teste que falha antes da correção e passa depois.
- [ ] Existe `plugin/http.test.ts` exercitando o helper sobre uma resposta já comprometida, e os três fakes (`static-serve.test.ts:48`, `run-endpoint.test.ts:47`, `index.test.ts:51`) expõem `headersSent` — hoje o guard corrigido não seria assertável sem reescrevê-los.
- [ ] `/_studio/svc/{lens,memory,rag}/*` responde envelope 404 tipado em vez de HTML da SPA, com a mesma resposta independentemente da extensão da URL (`plugin/index.ts:98`).
- [ ] `scanStudioAgents` (`plugin/agent-scan.ts:35`) trata diretório ilegível sem derrubar a reflection inteira, com caso negativo coberto por teste.
- [ ] `ReflectionDataSource` propaga o envelope de erro tipado do servidor em vez de `Error` genérico (`src/data/reflection-datasource.ts:39`).
- [ ] Suíte verde e cobertura de branch de `plugin/http.ts` sai de 50% para 100%, medida por `npx vitest run --coverage`.

**Dependencies:** none — o código auditado já está em `main` desde `v0.3.0`; nada bloqueia.

**Top risks (new — pre-existing risks documented elsewhere in roadmap):**

1. Inverter a ordem read/commit em `serveStudio` pode alterar Content-Type ou cache de assets; a
   asserção de paridade HTTP == chamada direta == scan do fs (`studio-plugin.integration.test.ts:180`)
   é a rede que pega isso.
2. Expor `headersSent` nos três fakes toca harnesses de três arquivos; simplificá-los demais pode
   mascarar asserções que hoje passam por outro motivo.

**Why now (from grill Q1):**

A cadeia de crash foi reproduzida duas vezes de forma independente (revisor no Node v22.22.2 e o
gate de qualidade contra o `serveStudio` real, exit code 1). Não é uma corrida rara: `readFileSync`
lança `EACCES` depois de `existsSync` e `statSync` passarem, então um único asset ilegível derruba o
dev server em toda requisição. O pacote foi publicado em `v0.3.0` — o defeito está no artefato que
outros projetos montam. A correção é de ~10 minutos; o que custa é o teste que a torna assertável.

---

### M7 — [ ] Reconciliação de documentação e superfície morta

> Added 2026-08-04 by `/roadmap-feature` (slug: `docs-dead-surface-reconciliation`).
> Evidence: `code-review-output/code-review.db` — findings #1, #12, #2, #3, #4, #5, #7, #8.

**Objective:** Fazer a documentação e a superfície de configuração descreverem o produto que existe
hoje — uma única tela — e remover o resíduo deixado pelo corte de 20 telas em `74a96c6`.

**Definition of done:**

- [ ] README (hero, tabela de features e a promessa de degradação graciosa) descreve o Agent Builder como superfície única; nenhuma menção a playground, traces, memory ou knowledge como entregues (`README.md:5,11-14,23`).
- [ ] DoD de M1, M2 e M3 reconciliado com o escopo entregue E reescrito em bullets de uma única linha (a quebra em múltiplas linhas trunca o critério nos extratores) — nenhum bullet exige tela removida; cada milestone é reescrito ou cancelado com razão datada.
- [ ] `scenario:"offline"` removido de `FixtureScenario` e `VALID_SCENARIOS`, ou passa a ter efeito observável — hoje é aceito na fronteira e silenciosamente ignorado (`src/bootstrap.ts:13`).
- [ ] `CounterName` contém apenas contadores emitidos em produção; `reload()`/`version` e o warrant falso de lint em `src/app/use-listing.ts:20,40` removidos ou corrigidos.
- [ ] Decisão registrada sobre `/_studio/api/{tools,workflows}` e o run endpoint: documentados como API host-facing no README do pacote, ou removidos (`plugin/index.ts:79`).
- [ ] `npm run check`, `npm run typecheck` e a suíte verdes; nenhum finding de completude aberto sem justificativa registrada.

**Dependencies:** none — toca `src/*` e documentação, disjunto de M6.

**Top risks (new — pre-existing risks documented elsewhere in roadmap):**

1. Reescrever o DoD de M1/M2/M3 é decisão de produto, não de engenharia. Sem alguém com autoridade
   para dizer se aquelas telas voltam ou saem do plano, este milestone trava — e enquanto travar,
   `cycle-acceptance` não consegue aceitar M1, M2 nem M3.
2. Remover os endpoints sem consumidor pode quebrar um host externo já integrado: o pacote foi
   publicado em `v0.3.0`, então a ausência de consumidor *neste repo* não prova ausência de consumidor.

**Why now (from grill Q1):**

O README é a porta de entrada do pacote e hoje é falso: a primeira coisa que um adotante tenta —
abrir o playground — não existe. Pior, os bullets de Definition of done de M1/M2/M3 são lidos
*verbatim* pelo `cycle-acceptance` como critérios de aceitação, e o refactor os tornou
inexercitáveis. O roadmap deixou de ser um plano e virou registro de um plano abandonado.

---

### M8 — [ ] Qualidade da suíte e manutenibilidade

> Added 2026-08-04 by `/roadmap-feature` (slug: `test-quality-maintainability`).
> Evidence: `code-review-output/code-review.db` — findings #64, #66, #69, #70, #74, #16, #17, #15, plus the maturity rows.

**Objective:** Devolver poder discriminante aos testes que o perderam no refactor e reduzir a
densidade de decisão onde ela é real — sem refatorar por estética.

**Definition of done:**

- [ ] `test_composition_root_selects_hybrid_in_live_mode` volta a FALHAR quando o ternário de `src/main.tsx:20` é invertido; a prova é executada e registrada no log do milestone.
- [ ] Guards hoje descobertos ganham teste: 405 não-POST (`plugin/run-endpoint.ts:154`), 403 do branch de asset com extensão conhecida (`plugin/static-serve.ts:145`) e os dois caminhos de erro de escrita do builder (`src/pages/builder/index.tsx:198,210`).
- [ ] `handleAgentRun` (CC=18) e `SessionView` (CC=16) abaixo de 15, medidos pela mesma regra ESLint `complexity` com `variant: "classic"` usada na auditoria — ou ADR registrando por que permanecem.
- [ ] Spread `{...opts.fallback}` substituído por delegações explícitas (`src/data/reflection-datasource.ts:50`), tornando visível em tempo de compilação o que hoje só falha em runtime.
- [ ] Os dois testes multi-comportamento divididos (`builder.test.tsx:57,215`) e as asserções em CSS literal trocadas por direção e limite.
- [ ] Os 32 findings `low` da auditoria triados: cada um FIXED ou com razão registrada para adiar.
- [ ] Cobertura de branch não regride abaixo dos 89,46% medidos na auditoria.

**Dependencies:** M7 — ambos editam `src/pages/builder/index.tsx` e `session-view.tsx`; M7 remove
código morto de lá que M8 refatoraria à toa.

**Top risks (new — pre-existing risks documented elsewhere in roadmap):**

1. Reduzir a complexidade de `handleAgentRun` mexe no endpoint de run, a fronteira de rede mais
   afiada do pacote. Refatorar sem alterar comportamento exige que os casos negativos existam
   *antes* — o que faz este item depender do trabalho de teste listado acima dele.
2. Triagem de 32 findings `low` é terreno fértil para bikeshedding (nomes de variável, ternários).
   Sem timebox declarado, o milestone não fecha.

**Why now (from grill Q1):**

A auditoria encontrou um teste que não pode falhar pelo motivo que o nome afirma — e o avaliador
provou isso invertendo a lógica de produção e vendo a suíte seguir verde. Um teste assim é pior que
teste nenhum: ele reporta uma garantia que não existe. Enquanto ele estiver no lugar, qualquer
refatoração do composition root passa despercebida.

---


## Decisions log

- 2026-07-14 — Studio lives in its **own repo** (`usetheodev/theokit-studio`), consumed by
  `theokit dev` as `@theokit/studio` (Paulo; supersedes the proposal's packages/studio lean).
- 2026-07-14 — The unified compose lives **here** (this repo is the home of the data-stack DX).
- 2026-07-14 — Single pg instance / three databases; dev-server-as-gateway; graceful
  degradation; lens owns trace UI (see CLAUDE.md invariants).

## Unresolved at inception

- SDK `otlp` exporter protocol/semconv compatibility with lens (M2 spike).
- theo-rag zero-key boot (stub embedder via env?) — affects M0 DoD.
- Whether service images are published to a registry or built from sibling checkouts in M0.
- Exact `theokit` integration surface (Vite plugin vs dev-server route) — decide in M1 planning.

---

## State-of-the-art references

Cloned under `.claude/knowledge-base/references/` (gitignored and read-only by project
convention — this table IS the catalog). Consumed by `/discover-plan` during downstream cycles.

| Peer | Repo | License | Supports milestone(s) | Added by |
|---|---|---|---|---|
| mastra | `mastra-ai/mastra` | Apache-2.0 (⚠ `ee/` dirs under separate commercial license — never port code from `ee/`) | M5, M1 | roadmap-feature (2026-07-14) |
| genkit | `genkit-ai/genkit` | Apache-2.0 | M5, M1 | roadmap-feature (2026-07-14) |

---

## Milestones retirados do loop (cancelados / bloqueados por decisão de produto)

> **Nota de 2026-08-04 (M7).** Os três blocos abaixo saíram da lista de milestones ativos e foram
> rebaixados a `####` de propósito. O super-loop de `cycle-roadmap` seleciona milestones por
> `### M<N> — [ ]` com dependências satisfeitas; enquanto estes ficassem lá, o loop os escolheria
> e travaria em `MILESTONE_BLOCKED` para sempre, porque nenhum dos seus critérios é exercitável
> contra o produto atual. O texto original fica **preservado por inteiro** — cancelar não é
> apagar. Se a decisão de produto trouxer as superfícies de volta, cada um retorna como milestone
> novo com DoD reescrito, não reabrindo estes.
>
> - **M2 e M3** — cancelados: dependiam inteiramente das abas removidas em `74a96c6`.
> - **M4** — bloqueado, não cancelado: dois dos três critérios pressupõem a aba de traces do M2.
>   O terceiro (MCP inspector) é independente e pode virar milestone próprio quando for priorizado.

#### M2 — [ ] Traces seam (SDK → theo-lens → Studio)

**Objective:** One agent run in the playground produces a durable, inspectable trace.

> **CANCELADO em 2026-08-04 (M7).** A aba Traces saiu em `74a96c6` junto com as outras 19 telas.
> Os quatro critérios originais dependiam dela e nenhum é exercitável contra o produto atual. O
> milestone permanece `[ ]` — cancelado não é entregue. Retomá-lo é decisão de produto em aberto
> (Q1 do plano `docs-dead-surface-reconciliation`); se voltar, entra como milestone novo com DoD
> reescrito, não reabrindo este.

**Definition of done (histórico — não é mais lido como critério de aceitação):**
- [ ] CANCELADO 2026-08-04 (M7): "Spike verified: SDK `exporter: otlp` emits OTLP http/json with `gen_ai` semconv that lens maps to typed columns" — sem aba Traces, não há consumidor do spike neste pacote.
- [ ] CANCELADO 2026-08-04 (M7): "`theokit dev` auto-configures the SDK exporter at the lens endpoint" — a configuração é do `theokit dev`, não do Studio; migra para o repo do CLI se for retomada.
- [ ] CANCELADO 2026-08-04 (M7): "Traces tab embeds/links lens-web through the same-origin proxy" — a aba foi removida em `74a96c6`.
- [ ] CANCELADO 2026-08-04 (M7): "Traces survive dev-server hot-reload and restart" — o diferenciador dependia da aba removida.

**Dependencies:** M0, M1.
**Top risks:** protocol mismatch (protobuf vs http/json); lens `@theokit/ui` 0.18.x vs 1.x drift.

#### M3 — [ ] Memory + Knowledge tabs

**Objective:** Inspect what the agent knows and remembers.

> **CANCELADO em 2026-08-04 (M7).** As abas Memory e Knowledge saíram em `74a96c6`. O milestone
> permanece `[ ]` — cancelado não é entregue. Retomá-lo é decisão de produto em aberto (Q1 do
> plano `docs-dead-surface-reconciliation`).

**Definition of done (histórico — não é mais lido como critério de aceitação):**
- [ ] CANCELADO 2026-08-04 (M7): "Memory tab over theo-memory REST: scoped memories, entities, temporal graph view" — a aba foi removida em `74a96c6`.
- [ ] CANCELADO 2026-08-04 (M7): "Knowledge tab over theo-rag REST: collections/documents/chunks browser + retrieval playground" — a aba foi removida em `74a96c6`.
- [ ] CANCELADO 2026-08-04 (M7): "Agent-side wiring documented: `@usetheo/memory/theokit` binding + a RAG tool path exercised in one example" — sem as abas, não há superfície neste pacote que exercite o binding.

**Dependencies:** M0, M1.
**Top risks:** memory dashboards overlap with theo-cloud M3 plans — keep Studio dev-only.

#### M4 — [ ] Differentiators

**Objective:** The features that made LangGraph "the only real agent IDE" — grounded in lens.

> **Escopo pressupõe superfícies canceladas (nota de 2026-08-04, M7).** Os dois primeiros
> critérios abaixo são construídos sobre a aba de traces, removida em `74a96c6` e cancelada em
> M2. Enquanto a decisão de produto sobre o retorno dessas superfícies estiver aberta (Q1 do
> plano `docs-dead-surface-reconciliation`), M4 não é planejável — o terceiro critério (MCP
> inspector) é independente e poderia virar milestone próprio.

**Definition of done (histórico — não é mais lido como critério de aceitação):**
- [ ] Run replay surfaced in Studio (lens session replay over persisted traces). **Pressupõe a aba de traces cancelada em M2.**
- [ ] Evals in the dev UI (lens evaluators; ADK-style "save session as eval case" flow). **Pressupõe a aba de traces cancelada em M2.**
- [ ] MCP inspector embedded (official Inspector pattern) covering the stack's MCP servers.

**Dependencies (histórico):** M2, M3 — ambos cancelados. Se M4 for retomado, volta como
milestone novo com dependências reescritas.
**Top risks:** replay semantics (re-execution vs playback) must be honest — playback first.
