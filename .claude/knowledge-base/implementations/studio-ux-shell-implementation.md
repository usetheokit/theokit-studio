# Implementation contract — studio-ux-shell (M5)

**Plan:** `.claude/knowledge-base/plans/studio-ux-shell-plan.md` (v1.1, SHIPPABLE 96.4)
**Branch:** develop · **Started:** 2026-07-14
**Engine note:** halt-loop dirigido inline pelo agente principal — um Stop hook de sessão
(/goal) já está ativo; ralph-loop concorrente violaria
`rules/loop-engine-convention.md § Anti-patterns` (mesma decisão registrada no discover).
Contrato por iteração (RED-confirm-fail → GREEN-parsimony → REFACTOR → WIRING → COMMIT →
progress → mini-review por fase) é honrado integralmente.
**SEPA:** agente persistente `implement-studio-ux-shell-sepa` (spawn 2026-07-14) consultado
pre-RED / post-GREEN / pre-COMMIT via mensagens; logs em `studio-ux-shell/sepa-iterations/`.
**Pre-condition audit:** plan SHIPPABLE ✓ · develop ✓ · tree clean ✓ · node 22.22.2 ✓ ·
pnpm 9.15.0 ✓ · TDD shape gate all_pass ✓ (após plan-improve dos shapes).
**Wiring pillar (c):** plano declara métricas dev in-memory (ADR D5) com prova via teste de
integração (Fase Final) — `.wiring-evidence.json` não se aplica (SPA sem infra de evidence
writer); a prova de métrica é o assert `metrics.snapshot() > 0` no `integration.test.tsx`,
conforme Global DoD do plano.

## Ordered task list

| # | Task | Phase | Status |
|---|---|---|---|
| 1 | T0.1 — scaffold pacote + toolchain | Phase 0 | pending |
| 2 | T1.1 — StudioDataSource + fixtures + metrics | Phase 1 | pending |
| 3 | T1.2 — run-script + stream player | Phase 1 | pending |
| 4 | T2.1 — rotas + sidebar + bootstrap | Phase 2 | pending |
| 5 | T2.2 — ServiceGate + estados | Phase 2 | pending |
| 6 | T3.1 — Playground | Phase 3 | pending |
| 7 | T3.2 — Event Inspector | Phase 3 | pending |
| 8 | T4.1 — Memory | Phase 4 | pending |
| 9 | T4.2 — Knowledge | Phase 4 | pending |
| 10 | T4.3 — Traces placeholder | Phase 4 | pending |
| 11 | Final — Integration Validation | Final | pending |

Mini-review de fase após fechar cada Phase 0/1/2/3/4 (mini_review.py).
