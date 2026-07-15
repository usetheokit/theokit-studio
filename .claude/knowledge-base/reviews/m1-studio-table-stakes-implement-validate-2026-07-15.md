# Implement Validation — m1-studio-table-stakes

**Date:** 2026-07-15
**Verdict:** BLOCKED (cross-repo coordination) — M1 core COMPLETE, T4.1 pending human/release
**Tasks:** 8/9 committed · 1 honestly blocked with reason (T4.1)

## Terminal state (honest)

`<promise>IMPLEMENTATION_COMPLETE</promise>` is **NOT emitted** — the Global DoD item
"reflection endpoint NO dev server do theokit" (Objective #7) is not met because T4.1 is
BLOCKED on coordination, not on any code defect. Per Unbreakable Rule 3, honest BLOCKED >
false completion.

The M1 **core deliverable is complete and validated**: the `@theokit/studio/plugin` (reflection
API + run NDJSON + SPA at `/_studio`), the `ReflectionDataSource` hybrid, and the Goal oracle
e2e all pass. 7 of 8 plan objectives are closed. What remains (T4.1) is a cross-repo commit in
the `theokit` repo that the plan explicitly designed to be non-blocking for this repo's
deliverable (ADR D1 § Consequences + T4.1 Deep Dive escape hatch).

## Validation chain (this repo — all green)

| Gate | Command | Result |
|---|---|---|
| Tests (unit + integration + e2e) | `pnpm --filter @theokit/studio test` | ✅ 257/257 (36 files) |
| Typecheck | `pnpm --filter @theokit/studio typecheck` | ✅ exit 0 |
| Lint (canonical, repo root) | `pnpm run check` | ✅ exit 0 |
| Build (SPA + plugin) | `pnpm --filter @theokit/studio build` | ✅ dist/spa/index.html + dist/plugin/index.js |
| Coverage | `pnpm --filter @theokit/studio test:coverage` | ✅ 97.16% stmts / 90.32% branches (target 90%) |
| Checkpoint ↔ git | (manual cross-check) | ✅ every committed task points at an existing SHA |
| Goal oracle | `studio_e2e_reflection_and_run` | ✅ health + agents-with-tools + SPA-with-config + run-NDJSON |

Critical-path coverage: `agent-scan.ts` 100%, `http.ts` 100%, `run-endpoint.ts` 91%,
`static-serve.ts` 92% (traversal guard + fallback fully exercised), `bootstrap.ts` 96%.

## Wiring triad (per new production symbol)

Verified per-symbol during each task via `check_wiring.py`:

- `theokitStudio`, `scanStudioAgents`, `listReflectionAgents`, `aggregateReflection`,
  `listReflectionSkills`, `handleAgentRun`, `matchRunPath`, `resolveSpaDir`,
  `createReflectionDataSource`, `parseNdjson` — pillar (a) caller + (b) integration test PASS.
- Internal helpers (`sendErrorEnvelope`/`sendJson`, `serveStudio`, `chunkToStudioEvent`) —
  pillar (a) PASS; pillar (b) via HTTP-real integration marker (ADR-DEFER-WIRING-B, exercised
  end-to-end, not a nominal grep).
- Runtime metric (pillar c): `datasource_calls_total.listAgents` observed ≥ 1 in the
  composition-root live-mode test (`test_composition_root_selects_hybrid_in_live_mode`).

## T4.1 — BLOCKED (coordination), pillar (a) ABSENT (not defer)

Three independently-verified blockers (SEPA confirmed each against `git`):

1. **Coordination.** `../theokit` has an in-flight feature (`decorator-file-based-parity`,
   active halt-loop) with uncommitted changes to `packages/theo/package.json` — the exact file
   T4.1 edits. Committing alongside it is the M7 hazard raised to cross-repo scope.
2. **Publish order.** `@theokit/studio` is `private:true`/`0.0.0`; the theokit workspace does
   not include it (sibling-links removed 2026-06-10). No non-invasive resolution path exists.
3. **Vite major (resolved here).** theokit is on Vite 6; the plugin peer was `>=7 <9`. Fixed
   in this repo: relaxed to `>=6 <9` (connect middleware is identical across Vite 5/6/7).

Ready-to-apply artifact: `docs/theokit-dev-integration.md` (exact diff — dependency +
`plugins.push(theokitStudio())` + smoke test). Tracked in **theokit#133** (linked to #132).
Owner of the cross-repo drawback: Paulo (per plan § Drawbacks & Risks).

**Pillar (a) of T4.1's wiring triad is ABSENT by coordination** — the real caller in theokit's
`configure-server-hook` does not exist yet. The `docs/` snippet is documentation, not a caller.

## Downstream

- **`/review`** MAY run on this repo's delta (8 committed tasks — the M1 core is a coherent,
  reviewable unit). The BLOCKED T4.1 is documented, not silently skipped.
- **`/release`** of `@theokit/studio` publishes the package, which unblocks blocker #2. The
  ROADMAP M1 checkbox does NOT flip until T4.1 lands in theokit (cycle-release § post-merge:
  "sem DoD completo, sem flip").
- **Ecosystem issues filed** (Unbreakable Rule — máximo de contexto): theokit-sdk#123
  (tools/workflows enumeration), theokit#132 (RunEvent bridge seam), theokit#133 (dev-server
  registration).
