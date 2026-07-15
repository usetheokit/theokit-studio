# Iteração 1 — T0.1 (scaffold) — 2026-07-14

RED → GREEN → REFACTOR → WIRING → COMMIT concluídos.

## Decisões e desvios registrados (per SEPA pre-COMMIT)

1. **Pin vitest ^3.2.7** (plano dizia ^3.2.11, versão inexistente no registry — latest do
   major 3 é 3.2.7, ≥3.2.6 corrige GHSA-5xrq CRITICAL). Edição de plano durante implement
   justificada: correção FACTUAL de registro (o espírito do ADR D6 — "última patch CLEAN do
   major" — permanece intacto). Plano + deps-audit corrigidos. SEPA verificou
   independentemente e aprovou.
2. **TheoUIProvider** no lugar de ThemeProvider cru (lib exige `themes`; provider compõe
   builtinThemes + Toaster). Tema/modo explicitados: violet-forge/dark. Q1 do plano
   RESPONDIDA e anotada no index.css.
3. **Polyfills de teste**: CSS.escape + matchMedia (jsdom não fornece; theme-provider usa).
4. **Integration seed**: `packages/studio/tests/integration/studio.integration.test.tsx`
   criado já no T0.1 (pillar b do wiring). DECISÃO: a Fase Final EXPANDE ESTE arquivo (o
   path `src/app/integration.test.tsx` do plano § Final Phase fica reconciliado aqui — o
   local `tests/integration/` é o exigido pelo check_wiring.py).
5. **_comments top-level** no package.json (chave-comentário dentro de devDependencies
   trava o pnpm resolvendo como pacote — root-cause do install de 35min morto).
6. **render.tsx helper adiado** para T2.1 (export sem uso violaria dead-code gate).
7. **Wiring T0.1**: symbol `App` — a: PASS (main.tsx) / b: PASS (integration seed) / c: N/A.

Gates: test 2/2 ✓ typecheck ✓ build ✓ biome 0 warnings ✓ vite dev serve ✓.
SEPA: GO após entry no CHANGELOG (feita).
