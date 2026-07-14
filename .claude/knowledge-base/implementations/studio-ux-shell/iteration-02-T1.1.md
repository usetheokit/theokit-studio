# Iteração 2 — T1.1 (data layer) — 2026-07-14

RED (17 novos testes falhando por módulos ausentes) → GREEN → REFACTOR (biome migrate +
organizeImports) → WIRING → COMMIT.

## Decisões (per SEPA pre-RED + pre-COMMIT)

1. Erros tipados em `types.ts` (não errors.ts novo) — respeita Files-to-edit, KISS.
2. Contradição do plano (query vazia "retorna [] + erro") resolvida a favor do RED test:
   LANÇA `EmptyQueryError`, nunca retorna [] (autoridade do teste; error-handling.md).
3. `metrics` com `reset()` + snapshot deep-copy (`structuredClone`) — independência de testes.
4. Factory com seam `overrides.health` (T2.2 testa health rejeitando sem monkey-patch).
5. Split honesto T1.1/T1.2: interface SEM `runAgent` neste commit; **T1.2 editará
   `datasource.ts` (adiciona runAgent + import StudioRunEvent) além do seu Files-to-edit —
   registrado AQUI para o diff-cohesion do mini-review** (recomendação SEPA).
6. `main.tsx` injeta `DataSourceProvider` + `createFixtureDataSource` (composition root —
   pillar a real, não no-op).
7. Suite após T1.1: **18/18** (15 data/metrics + 1 smoke + 2 integration) — correção do
   miscount 19/19 apontado pelo SEPA.
8. Débito anotado para T2.1: negative-case do `useDataSource` sem provider (throw contextual).

Wiring: createFixtureDataSource/metrics/useDataSource/DataSourceProvider → a: PASS, b: PASS
(integration test real), c: N/A. Coverage src/data/ = 91.22% lines (≥90 AC ✓).
