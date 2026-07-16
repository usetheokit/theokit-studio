# Review: m1-studio-table-stakes

**Date:** 2026-07-15
**Reviewers (spawned agents):** 7 — architecture, tests, wiring, cross-validation, domain-api-design, domain-testing, domain-frontend
**Findings:** 0 BLOCKER · 0 HIGH · 5 MEDIUM (all addressed or documented) · ~8 LOW · ~20 INFO
**Verdict:** READY_TO_MERGE (M1 core; T4.1 cross-repo pending coordination — see below)

## Verdict rationale

Per `cycle-review.md § Verdicts`: `READY_TO_MERGE` requires no BLOCKER and ≤ 2 HIGH with
documented mitigation. This review found **0 BLOCKER, 0 HIGH**. The 5 MEDIUM findings were
either **fixed in the review batch** (commit after this report's inputs) or documented as
conscious, honest divergences with a follow-up. Seven independent reviewers converged that
the M1 core is architecturally sound, deeply tested, honestly wired, and faithful to the plan.

## MEDIUM findings — resolution

| # | Finding (converged reviewers) | Resolution |
|---|---|---|
| F-arch-5 / F-dom-api-1 | API-key resolution is a fixed-priority list decoupled from the compiled agent's provider — a wrong key surfaces as an opaque upstream 401 mid-stream, not a typed 424 | **Documented** as a conscious theokit-parity limitation in `run-endpoint.ts` + **followup F5** (resolve the env var from `compiled.model`). Not fixed now — the provider→var mapping is deferred and the current behavior is deliberate parity with theokit dev. |
| F-dom-test-1/2 (= F-tests-2) | Two run-endpoint concurrency tests drive abort via competing wall-clock `setTimeout` → CI-flake vector (testing.md § 6) | **FIXED** — replaced with a deterministic gate/deferred barrier (ordering enforced, not raced). Production code was already correct; only the test timing was fragile. |
| F-dom-frontend-1 | The honesty banner (live vs fixtures) had no direct unit test — a gap on the very surface whose purpose is honesty | **FIXED** — 2 shell tests added (`banner_shows_fixtures_mode_by_default`, `banner_shows_live_reflection_when_live_prop_set`). |
| F-arch-9 | The D5 "decorator" is a `...fallback` spread-clone, safe only while the fallback is stateless closures | **Documented** — invariant comment added; a future `this`-bound class adapter would need explicit delegation. |

## Key positives (verified by ≥ 1 reviewer, not assumed)

- **DIP seam exact**: `ReflectionDataSource` implements the *unchanged* `StudioDataSource`; `git diff --stat` confirms **zero page changes** in the M1 range (the one `playground/index.tsx` touch in the wider `855ff42..HEAD` base is M7 residue, not an M1 commit — F-dom-frontend-2/F-xval-5).
- **plugin↔src boundary clean in both directions** (grep-verified); composition root is the single authority on the concrete adapter AND the single reader of `config.mode`.
- **Test depth genuine**: 9 integration tests against a **real Vite dev server** (real HTTP + `ssrLoadModule` + `compileAgentModule`), only the LLM stubbed; the e2e Goal oracle asserts the exact metric. Both lenses (edge + typed-negative) covered on every security boundary.
- **Wiring triad 12/12 honest**: all callers functionally real; the 2 `ADR-DEFER-WIRING-B` markers (`serveStudio`, `chunkToStudioEvent`) are legitimately exercised over real HTTP end-to-end, not gaming.
- **Convention fidelity**: `agent-scan` mirrors the theokit LOCKED source **exactly** (13 subfolders) — the code follows the real source, not the plan's shorter prose (fidelity, not drift).
- **Honesty invariant maintained in live mode**: fixtures-backed surfaces stay labeled; the banner distinguishes "Live reflection" vs "Fixtures mode".
- **HTTP contract disciplined**: typed error envelope through 100% of error paths; semantic status codes (400/403/404/405/422/424/503); NDJSON transport correct; same-origin before token spend.

## Cross-validation summary

- Plan tasks: 9 · Fully implemented: 8 (T1.1–T3.2) · Blocked with reason: 1 (T4.1) · Diverged: 0
- Plan frozen before first `/implement` commit (no mid-flight edits).
- Every task maps to a commit with its T-id; all 5 ADRs (D1–D5) respected.
- Coverage Matrix 10/10 verified.
- Every documented deviation (skillsEnabled, workflow shape, mode-optional, mapper decision (c), abort-LSP) is honestly logged and code-consistent.

## Quality gates summary

- `pnpm --filter @theokit/studio test`: **259/259 PASS** (36 files; +2 banner tests from review batch)
- `pnpm --filter @theokit/studio typecheck`: PASS
- `pnpm run check` (canonical): PASS
- Coverage: 97.16% stmts / 90.32% branches (critical paths — NDJSON parser, traversal guard, run handler — fully exercised)
- `/code-quality`: PASS_WITH_CAVEATS (only cap `symbol_fab_unverifiable`; tsc independently proves no fabrication)
- e2e Goal oracle `studio_e2e_reflection_and_run`: PASS

## T4.1 — cross-repo, BLOCKED (coordination) — reviewer-confirmed honest

Cross-validation independently verified all 3 blockers: `npm view @theokit/studio` returns 404
(unpublished, v0.0.0); theokit pins Vite ^6 vs studio's Vite ^7 (real major mismatch — peer
widened to `>=6 <9` to bridge, correct); theokit has a feature in flight. Pillar (a) legitimately
ABSENT (not gaming). `IMPLEMENTATION_COMPLETE` correctly not emitted. **The ROADMAP M1 checkbox
MUST NOT flip until T4.1's DoD closes** — a human decision at release (`cycle-release § post-merge`).

## Spawned agents (audit trail)

`.claude/agents/review-m1-studio-table-stakes-2026-07-15/`: architecture.md, tests.md,
wiring.md, cross-validation.md, domain-api-design.md, domain-testing.md, domain-frontend.md
(+ per-agent findings in `findings/`).

## Handoff decision

**READY_TO_MERGE** for the M1-core delta (8 committed tasks). Next steps, gated on human/coordination:

1. `/release` of `@theokit/studio` → publishes the package (unblocks T4.1 blocker #2).
2. Apply `docs/theokit-dev-integration.md` in the `theokit` repo once its in-flight feature lands
   (theokit#133) → closes T4.1.
3. Only then does the ROADMAP M1 checkbox flip. Until then, M1 is "core complete + reviewed,
   cross-repo wiring pending".

Ecosystem issues filed (Unbreakable Rule): theokit-sdk#123, theokit#132, theokit#133.
