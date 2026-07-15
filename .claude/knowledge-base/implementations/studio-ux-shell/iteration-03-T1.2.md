# Iteração 3 — T1.2 (run-script + stream player) — 2026-07-14

RED (stream-player.test.ts falhando — módulos ausentes) → GREEN (roteiros com shapes REAIS
do SDK, sem casts) → REFACTOR (organizeImports/format) → WIRING → COMMIT.

## Decisões (SEPA pre-COMMIT: GO)

1. Shapes escritos contra `dist/run-*.d.ts@3.4.1` sem `as` casts — o typecheck é o alarme
   de drift real. Grafias REAIS: updates kebab-case (`text-delta`, `tool-call-started`,
   `turn-ended`); RunEvents snake_case (`permission_denied`, `rate_limit`).
2. **Nota para T3.1 (SEPA):** o pseudo-code do plano grafa `'permission-denied'|'rate-limit'`
   — o converter/categorize DEVE usar os nomes reais acima (copiar o plano quebraria o
   narrowing silenciosamente).
3. **Semântica lazy do runAgent (SEPA):** o contador `datasource_calls_total.runAgent`
   incrementa no primeiro `next()` do generator (não na chamada) — comportamento de async
   generator JS; ajuda o EC-1 (run nunca iterado não conta).
4. Coverage src/data 93.05% (player e run-script 100%). Suite 28/28.
5. Dívida viva para T2.1: negative-case do throw de `useDataSource` sem provider.

Wiring: play a/b PASS; runAgent a/b PASS; c N/A (prova de métrica na Fase Final).
