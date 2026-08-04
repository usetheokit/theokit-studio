---
slug: docs-dead-surface-reconciliation
milestone_id: M7
name: Reconciliação de documentação e superfície morta
generated_by: roadmap-feature
date: 2026-08-04
status: completed
evidence_source: code-review-output/code-review.db
---

# Grill — M7 Reconciliação de documentação e superfície morta

**Q1 — What is this feature and why NOW (what changed)?**

Commit `74a96c6` removed 20 SPA surfaces (−7,224 LoC) one commit before the review. The
documentation did not follow. The README still sells "a chat playground, typed event-stream
inspector, trace explorer, memory browser, and knowledge (RAG) inspector" — all five deleted.

More consequential: the Definition-of-done bullets of M1, M2 and M3 are read **verbatim** by
`cycle-acceptance` as the acceptance criteria set. A criterion that cannot be exercised is recorded
`not_exercised`, which blocks the checkbox flip. Those three milestones became unacceptable by
construction. The roadmap stopped describing a plan and started describing an abandoned one.

**Q2 — Which milestones must be `[x]` before this can start?**

None. Touches `src/*` and documentation — disjoint from M6's `plugin/*`.

**Q3 — Verifiable Definition of Done?**

Six bullets. Note that the M1/M2/M3 reconciliation bullet lives HERE and not in M6: the user's
chosen option showed it under M6, but with the three-way grouping, documentation reconciliation is
M7's subject. Putting a product decision inside a hardening milestone would muddy both.

**Q4 — Top 2 NEW risks?**

1. Rewriting M1/M2/M3 DoD is a product decision, not an engineering task. Without someone with the
   authority to say whether those screens return or leave the plan, this milestone stalls — and
   while it stalls, `cycle-acceptance` cannot accept M1, M2 or M3.
2. Removing the consumer-less endpoints may break an external host already integrated: the package
   was published at `v0.3.0`, so "no consumer in this repo" does not prove "no consumer".

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

