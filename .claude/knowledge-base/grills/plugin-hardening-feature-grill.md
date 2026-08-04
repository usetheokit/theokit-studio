---
slug: plugin-hardening
milestone_id: M6
name: Plugin hardening (blockers da code review)
generated_by: roadmap-feature
date: 2026-08-04
status: completed
evidence_source: code-review-output/code-review.db
---

# Grill — M6 Plugin hardening (blockers da code review)

**Q1 — What is this feature and why NOW (what changed)?**

A full 5-phase `loop-code-review` of `packages/studio` closed on 2026-08-04 with 81 findings.
Among them is a chain that **kills the user's dev server**: `plugin/http.ts:13` guards on
`writableEnded || destroyed` but omits `res.headersSent`, and `plugin/static-serve.ts:154` commits
the 200 head *before* the read that can throw. `readFileSync` raises `EACCES` deterministically
after `existsSync` and `statSync` both pass — so one unreadable asset kills the server on every
request, not on a rare race.

Reproduced twice independently: by the reviewer on Node v22.22.2, and by the quality gate against
the real `serveStudio` (process exit code 1). What changed is that this is now *known*, and the
package was published at `v0.3.0` — the defect ships in the artifact other projects mount.

**Q2 — Which milestones must be `[x]` before this can start?**

None. The audited code is on `main` since `v0.3.0`; nothing blocks. M6 and M7 touch disjoint
trees (`plugin/*` vs `src/*` + docs) and were explicitly declared parallel by the user.

**Q3 — Verifiable Definition of Done?**

Six bullets, each anchored to a finding with file:line — see the milestone block in ROADMAP.md.
The load-bearing one is that the regression must be **proved by a test that fails before the
fix**, because Phase 4 showed the guard branch is unreachable by the current harnesses.

**Q4 — Top 2 NEW risks?**

1. Inverting the read/commit order in `serveStudio` may alter Content-Type or caching of assets.
2. Exposing `headersSent` on the three fakes touches harnesses in three test files; over-
   simplifying them could mask assertions that currently pass for a different reason.

## Provenance of the answers

This grill was NOT answered from memory or intuition. Q1, Q3 and Q4 were derived from the
evidence store produced by the `loop-code-review` full run that closed immediately before this
skill was invoked: `code-review-output/code-review.db` (81 findings, 24 components, 16 test-audit
rows, 3 quality gates — all PASS, zero discards). Every DoD bullet traces to a finding with a
`file` and `line` column in that database.

The three genuinely open decisions were put to the user with `AskUserQuestion` and are recorded
below verbatim:

1. **Grouping** — 81 findings across three milestones (M6 plugin / M7 docs+dead surface /
   M8 tests+maintainability), rather than one milestone or an ad-hoc hotfix path.
2. **Dependency chain** — M6 and M7 free and parallel; M8 depends on M7 because both edit
   `src/pages/builder/index.tsx` and `session-view.tsx`.
3. **Scope of the 32 `low` findings** — triage is the deliverable: each one FIXED or with a
   recorded reason to defer. Neither "fix all" nor "out of scope".

## Out-of-scope cross-check (Step 3 — MANDATORY)

Keyword overlap detected between this feature and the ROADMAP item
*"Visual (no-code) agent builder — different product category (Flowise/Langflow/Dify)"*,
on the token `builder`.

**User verdict: FALSE POSITIVE.** The out-of-scope item refers to a visual no-code product
category. The Agent Builder in this codebase is a chat-driven code assistant, delivered in M5 and
already `[x]`. Recorded as `out_of_scope_overlap_false_positive: "Visual (no-code) agent builder"`.
No item was removed from the out-of-scope section.

## SOTA delta (Step 5)

Skipped — **No**. This is remediation of defects found in this repository's own code. No peer
project informs how to add `res.headersSent` to a guard or how to reconcile a README. The
existing reference set (mastra, genkit) is untouched; `_catalog.md` was not modified.

