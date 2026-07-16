# Implement Validation — m1-studio-table-stakes

**Date:** 2026-07-15
**Overall verdict:** BLOCKED (cross-repo coordination) — M1 core COMPLETE & validated; T4.1 pending human/release
**Tasks:** 8/9 committed · 1 honestly blocked with reason (T4.1)
**Completion promise:** `IMPLEMENTATION_COMPLETE` NOT emitted (DoD #7 unmet — endpoint in `theokit dev`). Honest BLOCKED > false completion (Unbreakable Rule 3).

## Real code gates — all green

| Gate | Command | Result |
|---|---|---|
| Tests (unit + integration + e2e) | `pnpm --filter @theokit/studio test` | ✅ 257/257 (36 files) |
| Typecheck | `pnpm --filter @theokit/studio typecheck` | ✅ exit 0 |
| Lint (canonical, repo root) | `pnpm run check` | ✅ exit 0 |
| Build (SPA + plugin) | `pnpm --filter @theokit/studio build` | ✅ dist/spa/index.html + dist/plugin/index.js |
| Coverage | `test:coverage` | ✅ 97.16% stmts / 90.32% branches (target 90%) |
| Goal oracle | `studio_e2e_reflection_and_run` | ✅ health + agents-with-tools + SPA-with-config + run-NDJSON |

## Consolidated gate (`run_validation.py`) — 11 checks

| Check | Status | Note |
|---|---|---|
| progress_schema | ✅ PASS | enum values corrected (T3.2 wiring.a=null test-only; T4.1 wiring.a=fail cross-repo caller absent) |
| npm test | ✅ PASS | 257/257 |
| npm run typecheck | ✅ PASS | — |
| wiring_triad | ✅ PASS | 221 symbols from diff, 197 resolved, **0 uncalled** (pillar a); independent recheck |
| test_obligations | ✅ PASS | concurrency + failure tests present where the plan promised them |
| code_quality | ⚠️ WARN | PASS_WITH_CAVEATS (89). Only cap: `symbol_fab_unverifiable_typescript` — the detector couldn't introspect via network; `tsc` PASS independently proves no fabricated symbol. NOT a real fabrication. |
| acceptance_criteria | ⚠️ WARN | 23 criteria are executable-by-human evidence (build-exit-0, import-resolves, wc-≤500) — all verified in the real-gates table above; surfaced for `/review`, never a silently-ticked box |
| patterns_consumption | N/A | plan cites no `*-patterns` skill (none exist) |
| npm run lint / coverage | SKIP | script-name mismatch (`check`/`test:coverage` run manually above — green) |
| **checkpoint_consistency** | ❌ FAIL (heuristic FP) | see below |

### checkpoint_consistency FAIL — heuristic false-positive (documented, not a code defect)

The gate flags: *"T4.1 is referenced by a real commit in git but the checkpoint marks it 'blocked'."*
Commit `89156b7` carries "(T4.1 parcial)" and did **preparatory** T4.1 work in THIS repo
(peer-vite compat fix `>=6 <9` + the ready-to-apply integration guide `docs/theokit-dev-integration.md`).
It did **not** implement T4.1's actual deliverable — the cross-repo registration inside the
`theokit` repo, which is coordination-blocked. The gate's own documented limitation
(*"relies on the commit-message task-id convention"*) cannot distinguish a *prep commit
referencing a task* from *the task's completion*. Keeping T4.1 `blocked` is the truthful
status (the milestone deliverable is not met); relabeling it `committed` to satisfy the
heuristic would misrepresent the cross-repo work as done. This FAIL is subsumed by the
overall BLOCKED verdict — there is no code to fix, so no validation halt-loop applies (a
coordination block halts per `cycle-implement § Stop conditions`, it does not iterate).

## Wiring triad (per new production symbol — verified during each task)

`theokitStudio`, `scanStudioAgents`, `listReflectionAgents`, `aggregateReflection`,
`listReflectionSkills`, `handleAgentRun`, `matchRunPath`, `resolveSpaDir`,
`createReflectionDataSource`, `parseNdjson` → pillar (a) caller + (b) integration test PASS.
Internal helpers (`sendErrorEnvelope`/`sendJson`, `serveStudio`, `chunkToStudioEvent`) →
pillar (a) PASS; pillar (b) via HTTP-real integration marker (exercised end-to-end).
Runtime metric (c): `datasource_calls_total.listAgents` observed ≥ 1 in the composition-root
live-mode test.

## T4.1 — BLOCKED (coordination). Pillar (a) ABSENT, not defer

Three independently-verified blockers (SEPA confirmed each against `git`):

1. **Coordination.** `../theokit` has an in-flight feature (`decorator-file-based-parity`)
   with uncommitted changes to `packages/theo/package.json` — the exact file T4.1 edits.
2. **Publish order.** `@theokit/studio` is `private:true`/`0.0.0`; the theokit workspace
   excludes it (sibling links removed 2026-06-10).
3. **Vite major (resolved here).** theokit on Vite 6; plugin peer relaxed `>=7 <9` → `>=6 <9`
   (connect middleware identical across Vite 5/6/7).

Ready-to-apply artifact: `docs/theokit-dev-integration.md`. Tracked in **theokit#133**.
Owner (per plan § Drawbacks): Paulo.

## Downstream

- **`/review`** MAY run on this repo's 8-committed-task M1-core delta (a coherent unit).
- **`/release`** of `@theokit/studio` publishes the package → unblocks blocker #2.
- ROADMAP M1 checkbox does NOT flip until T4.1 lands in theokit (`cycle-release § post-merge`:
  "sem DoD completo, sem flip").
- Ecosystem issues filed: theokit-sdk#123, theokit#132, theokit#133.
