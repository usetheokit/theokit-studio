---
slug: test-quality-maintainability
milestone_id: M8
name: Qualidade da suíte e manutenibilidade
generated_by: roadmap-feature
date: 2026-08-04
status: completed
evidence_source: code-review-output/code-review.db
---

# Grill — M8 Qualidade da suíte e manutenibilidade

**Q1 — What is this feature and why NOW (what changed)?**

Phase 4 found a test that cannot fail for the reason its name claims —
`test_composition_root_selects_hybrid_in_live_mode` (`src/main.test.tsx:67`). The quality gate did
not take that on faith: it inverted the production ternary at `src/main.tsx:20`, ran the file,
watched all three tests stay green, then restored the file and verified a clean tree.

The test was weakened during `74a96c6` — the assertions that gave it discriminating power lived on
surfaces that were deleted, and were replaced with proxies while the name was kept. A test like
that is worse than no test: it reports a guarantee that does not exist.

**Q2 — Which milestones must be `[x]` before this can start?**

**M7.** Both edit `src/pages/builder/index.tsx` and `session-view.tsx`; M7 deletes dead code from
those files that M8 would otherwise refactor for nothing. Declared by the user, who rejected both
the fully-serial and the fully-parallel alternatives.

**Q3 — Verifiable Definition of Done?**

Seven bullets. Two are worth calling out: the live-mode test must be **proved** to fail under an
inverted ternary (the same experiment the gate ran), and complexity must be measured with the same
tool and settings used in the audit — ESLint `complexity` with `variant: "classic"` — so the
before/after numbers are comparable rather than merely plausible.

**Q4 — Top 2 NEW risks?**

1. Reducing `handleAgentRun`'s complexity means editing the run endpoint, the sharpest network
   boundary in the package. Refactoring without behaviour change requires the negative cases to
   exist *first* — which makes that DoD bullet depend on the test bullet above it.
2. Triaging 32 `low` findings is fertile ground for bikeshedding (variable names, ternaries).
   Without a declared timebox, the milestone does not close.

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

