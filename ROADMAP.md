# TheoKit Studio — Roadmap

> Created 2026-07-14 from `docs/theokit-studio-arquitetura-proposta.md` (architecture) and
> `docs/studio-deep-research-2026-07-14.md` (verified competitive research). Per-milestone task
> decomposition is the job of `/to-plan`.

## Vision

The local dev UI of the TheoKit stack — Mastra Studio / Genkit Dev UI experience — with a
differentiator no peer has: **dev/prod parity**. Traces, memories, and knowledge live in the
same production-grade Apache-2.0 services the user deploys with (theo-lens, theo-memory,
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
- [ ] `docker-compose.studio.yaml`: `pgvector/pgvector:pg16` + init script creating `themem`,
      `theolens`, `therag` databases; the 3 services pointed at their own database, each
      auto-migrating on boot; healthchecks wired; `--wait` boot validated end-to-end.
- [ ] Dev-mode defaults: auth off / single workspace (`THEOLENS_REQUIRE_CREDENTIAL=0`, memory
      ALPHA mode, rag dev mode); `THEOMEM_EMBEDDER` pinned + documented.
- [ ] Zero-key boot verified or honestly documented (does rag-api run on the stub embedder?).
- [ ] Ports overridable by env; no collisions out of the box (8080/4318/8787/5432).

**Dependencies:** none (foundation).
**Top risks:** service images not published → build-from-sibling-repo contexts; memory
embedding-dim drift if embedder changes after first migration.

### M1 — [ ] Studio table-stakes (reflection + SPA, no Docker required)

**Objective:** The Mastra/Genkit experience inside `theokit dev`: playground + live typed events.

**Definition of done:**
- [ ] Reflection endpoint in the dev server exposing the live registry (agents/tools/skills/
      workflows) from `@theokit/sdk` — no manifest.
- [ ] Studio SPA (built with current `@theokit/ui`) served at `/_studio`, same origin.
- [ ] Chat playground against any registered agent; event inspector rendering `Run.stream()`
      typed events live (text deltas, tool calls, permissions, rate-limit, completion).
- [ ] Works with Docker absent; service tabs show actionable "run `theokit studio up`" state.

**Dependencies:** none (parallel to M0).
**Top risks:** dev-server integration surface in `theokit` (Vite plugin vs server route);
SDK 3.x adoption ahead of the rest of the cluster.

### M2 — [ ] Traces seam (SDK → theo-lens → Studio)

**Objective:** One agent run in the playground produces a durable, inspectable trace.

**Definition of done:**
- [ ] Spike verified: SDK `exporter: "otlp"` emits OTLP **http/json** with `gen_ai` semconv
      that lens maps to typed columns (model/provider/tokens) — or gap fixed in the SDK.
- [ ] `theokit dev` auto-configures the SDK exporter at the lens endpoint when the stack is up.
- [ ] Traces tab embeds/links lens-web through the same-origin proxy; trace tree + cost visible.
- [ ] Traces survive dev-server hot-reload and restart (the differentiator, demonstrated).

**Dependencies:** M0, M1.
**Top risks:** protocol mismatch (protobuf vs http/json); lens `@theokit/ui` 0.18.x vs 1.x drift.

### M3 — [ ] Memory + Knowledge tabs

**Objective:** Inspect what the agent knows and remembers.

**Definition of done:**
- [ ] Memory tab over theo-memory REST: scoped memories, entities, temporal graph view.
- [ ] Knowledge tab over theo-rag REST: collections/documents/chunks browser + retrieval
      playground (query → retrieved chunks with scores/strategy).
- [ ] Agent-side wiring documented: `@usetheo/memory/theokit` binding + a RAG tool path
      (`@usetheo/rag-sdk` or MCP) exercised in one example.

**Dependencies:** M0, M1.
**Top risks:** memory dashboards overlap with theo-cloud M3 plans — keep Studio dev-only.

### M4 — [ ] Differentiators

**Objective:** The features that made LangGraph "the only real agent IDE" — grounded in lens.

**Definition of done:**
- [ ] Run replay surfaced in Studio (lens session replay over persisted traces).
- [ ] Evals in the dev UI (lens evaluators; ADK-style "save session as eval case" flow).
- [ ] MCP inspector embedded (official Inspector pattern) covering the stack's MCP servers.

**Dependencies:** M2, M3.
**Top risks:** replay semantics (re-execution vs playback) must be honest — playback first.

### M5 — [x] Studio UX shell (all screens on fixtures, no integration)

> Added 2026-07-14 by `/roadmap-feature studio-ux-shell` (grill:
> `knowledge-base/grills/studio-ux-shell-feature-grill.md`). UX-first: validate the full
> Studio experience (Mastra Studio / Genkit Dev UI category) before investing in integration.
> Nothing is throwaway — offline/empty states are already a product requirement (graceful
> degradation invariant) and `@theokit/ui` dogfooding starts here.

**Objective:** The real Studio SPA with every surface navigable on mocked data (fixtures),
runnable standalone — so the experience can be seen, iterated, and locked before M0–M3 wire
real services in.

**Definition of done:**
- [ ] SPA at `packages/studio` built with `@theokit/ui` (current major), running standalone
      via Vite dev server — no `theokit dev`, no Docker required.
- [ ] 5 surfaces navigable: Playground (mocked chat), Event Inspector (typed `Run.stream()`
      fixtures: text deltas, tool calls, permissions, rate-limit, completion), Memory
      browser, Knowledge/RAG inspector (fake retrieval playground with scores), Traces
      **placeholder only** (offline state / future lens-web embed — never a mocked trace tree;
      trace UI stays out of scope, theo-lens owns it).
- [ ] Data layer behind an interface (DIP): fixtures today; M1/M2/M3 swap in real
      implementations without touching the screens. Fixtures derived from published
      `@theokit/sdk` 3.x types — never hand-invented shapes.
- [ ] Empty/loading/offline states present on every service-backed tab.
- [ ] Build + tests + typecheck green in the monorepo.

**Dependencies:** none (parallel to M0/M1; external: `@theokit/ui` 1.x available).
**Top risks:** fixture drift vs real `@theokit/sdk` 3.x types (mitigate: import SDK types);
`@theokit/ui` 1.x gaps for Studio-grade components (event-stream viewer, graph view) —
treat as upstream contributions, not local forks.

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
