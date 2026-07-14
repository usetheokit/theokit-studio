# SEPA initial brief — studio-ux-shell (2026-07-14)

(resumo verbatim dos achados do agente persistente `implement-studio-ux-shell-sepa`)

- T3.1↔T3.2 sequenciamento (EC-1): RED do T3.1 asserta via metrics/estado local, não RunLog (nasce no T3.2).
- RunLogProvider deve montar ACIMA das rotas (shell/composition root) para sobreviver à navegação.
- Inspector é "last run", não "live" (abort-on-unmount mata stream ao navegar) — copy honesto.
- `metrics.ts` precisa de `reset()`/factory para independência de testes (`testing.md § 3`).
- `bootstrap.ts` como função exportada `bootstrap()` (testável em jsdom; EC-8).
- `routes.tsx` exporta route objects (data router); testes usam `createMemoryRouter` (errorElement só funciona em data router no RR7).
- Script test = `vitest run` (não watch) para não travar `pnpm -r test`.
- `@theokit/sdk` types-only → devDependencies (com comentário) para não flagrar dep runtime não usada.
- Q1 gate no pre-COMMIT do T0.1; Q2 gate no pre-COMMIT do T3.1.
- Nenhum [CRITICAL]; ordem de fases consistente com o dependency graph.
