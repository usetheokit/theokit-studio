# TheoKit Studio — Contract

Local dev UI for the TheoKit stack (Mastra Studio / Genkit Dev UI category), differentiated by
being backed by the real `theo-data` services (theo-memory, theo-lens, theo-rag) over a single
Postgres instance, orchestrated by docker compose.

## Locked names

| Thing | Locked value |
|---|---|
| npm package | `@theokit/studio` |
| Repo | `usetheodev/theokit-studio` |
| CLI surface | `theokit studio up` / `theokit studio down` (thin compose wrapper; lives in `theokit` CLI, implemented against this repo's compose) — **planejado, ainda não existe**; a montagem do Studio no `theokit dev` também está pendente (ver `docs/theokit-dev-integration.md`) |
| Compose file | `docker-compose.studio.yaml` (this repo is its home) — **pendente**, o arquivo ainda não existe (M0 aberto) |
| Postgres image | `pgvector/pgvector:pg16` — ONE instance, THREE databases: `themem`, `theolens`, `therag` |
| Studio route in dev server | `/_studio` (SPA), `/_studio/api/*` (reflection), `/_studio/svc/{lens,memory,rag}/*` (same-origin proxy — **pendente**: hoje o namespace responde 404 tipado, nunca HTML) |
| Default service ports | theo-memory `:8080`, theo-lens `:4318` (OTLP), theo-rag `:8787`, postgres `:5432` — all overridable by env |

## Architecture invariants (from docs/theokit-studio-arquitetura-proposta.md)

> **Reconciliado em 2026-08-04 (M7).** Em `74a96c6` o Studio foi reduzido a uma superfície
> única (o Agent Builder) e vinte telas saíram. Os invariantes 4 e 5 abaixo descreviam
> comportamento dessas telas; ficam marcados como **suspensos**, não apagados — voltam a valer
> se as superfícies de serviço retornarem (decisão de produto em aberto, Q1 do plano
> `docs-dead-surface-reconciliation`). O que o produto entrega hoje está no README.

1. **Reflection over manifest.** Agent/tool/skill discovery comes from the live `@theokit/sdk`
   registry via a reflection endpoint in `theokit dev` (Genkit/Mastra pattern). No static
   manifest files (LangGraph lesson).
2. **Dev server is the gateway.** In dev, Studio talks same-origin through the `theokit dev`
   proxy. Traefik/ForwardAuth multi-tenant edge is a production/theo-cloud concern — never a
   Studio requirement.
3. **One pg instance, three databases.** Each service keeps its own migrations untouched and
   auto-migrates its own database on boot. Never merge them into one database/schema.
4. **Graceful degradation.** Studio must load and be useful with Docker absent — today that
   means the Agent Builder has no service dependency on its path. Docker is an amplifier, not a
   prerequisite. *(SUSPENSO desde `74a96c6`, a parte sobre playground + event inspector e sobre
   abas de serviço detectarem serviço offline: essas telas não existem, e o valor de config
   `scenario: "offline"` que as servia foi removido em M7.)*
5. **Do not rebuild trace UI.** theo-lens owns trace visualization. *(SUSPENSO desde
   `74a96c6`: o Studio não tem aba de traces e não embute lens-web. A metade que continua
   valendo é a proibição — se a superfície voltar, ela embute, nunca reimplementa.)*
6. **Dev-only scope.** Studio is single-tenant, auth-off-by-default, "development and debugging
   purposes only" (ADK wording). Multi-tenant production dashboards = Theo Cloud. No GA cloud
   claims (ecosystem honesty rule).
7. **UI built with `@theokit/ui`** (current major) — Studio dogfoods the UI pillar.

## Ecosystem relationships

- **Consumes:** `@theokit/sdk` (registry + `Run.stream()` typed events + `exporter: "otlp"`),
  `@theokit/ui` (components), theo-memory REST (`/v1/*`, has `@usetheo/memory/theokit` binding),
  theo-lens OTLP ingest + read API + web UI, theo-rag REST (`@usetheo/rag-sdk` is zero-deps).
- **Consumed by:** `theokit` (`theokit dev` mounts the Studio; `theokit studio` subcommand).
- **Never:** hard dependency from any theo-data service back onto Studio.

## Toolchain (locked, mirrors the ecosystem)

pnpm 9.15 (corepack) · Node ≥22.12 (`.nvmrc`) · TypeScript 5.8 strict · tsup · Vitest · Biome 2.4
· Changesets · Zod peer. Dual ESM+CJS only if a consumer needs CJS; default ESM-only (UI package).

## Rules (inherited from ~/.claude/CLAUDE.md — highlights)

- Branch discipline: work on `develop`; `main` is release-only. No `git checkout`/`revert`/
  `reset --hard`/force-push.
- TDD: failing test before production code; bug fix starts with a regression test.
- CHANGELOG (Keep a Changelog + SemVer) updated with every change, `[Unreleased]` first.
- Fail fast/loud/clear; no swallowed errors; typed errors.
- Honesty about pre-release status everywhere (services are pre-release; SDK cluster still
  migrating 2.x → 3.x — Studio targets `@theokit/sdk` 3.x).
- All work flows through the cycle skills (discover → plan → implement → code-quality → review
  → release), no hand-rolling.

## Known cross-repo gotchas

- theo-memory embedding dimension is fixed at first migration by `THEOMEM_EMBEDDER`
  (local=384 / openai=1536) — compose must pin it and document.
- theo-lens accepts OTLP **http/json only** (protobuf deferred) — validate the SDK `otlp`
  exporter protocol before wiring (spike, see ROADMAP M2).
- theo-lens currently pins `@theokit/ui@0.18.x` while current is 1.x — expect alignment work
  when embedding lens-web.
- theo-rag worker is fixed at 1 replica (pg-boss token bucket) — fine for dev, don't scale it
  in compose.
