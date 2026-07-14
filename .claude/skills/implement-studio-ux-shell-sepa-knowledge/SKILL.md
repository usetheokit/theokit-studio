---
name: implement-studio-ux-shell-sepa-knowledge
description: |
  Domain knowledge skill paired with the SEPA agent for plan studio-ux-shell. Consult ALWAYS during /implement cycle when reasoning about TDD, SOLID, Clean Code, DRY, design patterns, OR wiring triad — this skill hydrates community best practices on top of plan-specific context (ADRs + edge-case findings + project rules). Triggering phrases: "review this against community standards", "what's the canonical pattern", "is this idiomatic", "best practice for react spa fixtures dev-ui".
allowed-tools: Read Glob Grep WebSearch WebFetch
model: opus
disable-model-invocation: false
---

# SEPA knowledge skill — studio-ux-shell

You are the knowledge layer for the SEPA auditing the `/implement` halt-loop on plan
`studio-ux-shell`. Give SEPA accurate, plan-specific knowledge so findings cite canonical
sources, not training-data recall.

## Plan goal (verbatim)

> Enable desenvolvedores TheoKit a navegar e iterar a experiência completa do Studio
> (5 superfícies) sem Docker e sem serviços, so that a UX do M5 é validável e o M1 herda o
> shell pronto, measured by `pnpm -r test` + `pnpm -r typecheck` + `pnpm check` verdes no
> monorepo com as 5 rotas renderizando em testes de componente.

## ADR summary

| ID | Decision |
|---|---|
| D1 | Rotas explícitas + sidebar de seções (padrão Mastra) |
| D2 | `StudioDataSource` no domínio da UI; `FixtureDataSource` único adapter do M5 (DIP) |
| D3 | Playback de stream por async generator com timers controláveis + AbortSignal |
| D4 | Estados de 1ª classe reusando `@usetheo/ui` (EmptyState/Skeleton) + ServiceOfflineState |
| D5 | Observabilidade dev: contadores em memória (`datasource_calls_total`, `stream_events_played_total`) |
| D6 | Pinning de majors: versão validada-pela-referência (RR ^7.18.1, vite ^7.3.6, vitest ^3.2.11, TS 5.8) |

## Edge cases absorbed (MUST honor in tests)

- EC-1: blank prompt send é no-op (playground)
- EC-2: crash de rota → errorElement + sidebar sobrevive
- EC-3: `at` fora de ordem → clamp delay ≥ 0
- EC-4: signal pré-abortado → zero yields
- EC-5: query em collection desconhecida → `UnknownCollectionError` tipado
- EC-6: collection sem documentos → EmptyState local
- EC-7: filtro do inspector sem matches → no-match ≠ empty
- EC-8: `window.__STUDIO_CONFIG__` malformado → fallback fixtures + warn

## Project rules relevant

`architecture.md` (DIP § 2, composition root § 1), `testing.md` (pirâmide § 2, AAA § 3,
edge vs negative § 4.1, determinismo § 6), `error-handling.md` (typed errors, fail-fast),
`parsimony-ladder.md` (pre-write GREEN).

## Domain keywords (WebSearch)

react spa dev-ui fixtures, async generator abort signal testing, testing-library react
act warnings, vite tailwind v4 setup, discriminated union exhaustive switch typescript.
