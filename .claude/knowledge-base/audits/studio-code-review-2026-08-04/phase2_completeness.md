# Phase 2 — Completeness audit

**Target:** `packages/studio` · **Method:** stub scan + export-orphan analysis +
promise-vs-implementation check · **Coverage at close:** 24/48 files (50%)

## The organising fact

The target was refactored **one commit before this review**: `74a96c6` removed 20
SPA surfaces (−7224 LoC). Every finding below is residue of that cut. This is not
a coincidence to note in passing — it is the reason the completeness lens was the
right one to point here first.

## Findings

| # | Severity | Finding | Where |
|---|---|---|---|
| 1 | **high** | README advertises five surfaces the SPA no longer ships | `../../README.md:5,11-14,23` |
| 6 | **high** | ROADMAP DoD bullets became unsatisfiable — and feed the acceptance gate | `../../ROADMAP.md:89,91,105,116` |
| 2 | **medium** | Config accepts `scenario:"offline"` but nothing reads it | `src/bootstrap.ts:13` |
| 7 | **medium** | Lint suppression justified by a test that does not exist | `src/app/use-listing.ts:20` |
| 3 | low | Four of five metric counters can never be non-zero | `src/data/metrics.ts:4` |
| 4 | low | `useListing` exposes a `reload()` no caller invokes | `src/app/use-listing.ts:40` |
| 5 | low | Two of three builder nav entries lead to empty screens | `src/pages/builder/index.tsx:120,131` |
| 8 | low | Plugin endpoints kept with no in-repo consumer after the cut | `plugin/index.ts:79` |

Findings 6, 7 and 8 were added **after** the quality gate, which caught them as
misses. Findings 1 and 5 were corrected after the gate too — see § Gate below.

### 1 — README advertises removed surfaces (high)

> "a chat playground, typed event-stream inspector, trace explorer, memory
> browser, and knowledge (RAG) inspector" — `README.md:5`

All five are gone. `src/app/routes.tsx:20-28` has exactly one element route, and
it is `<AgentBuilderPage/>`. Line 23 goes further and promises the playground
degrades gracefully without Docker — a graceful degradation of a screen that no
longer exists.

Severity is high because this is the package's front door: the first action a new
adopter takes after reading it fails. It also breaches the project's own
public-copy honesty rule at its most visible point.

### 2 — `scenario:"offline"` accepted then ignored (medium)

`bootstrap.ts:6` types it, `:13` validates it, `types.ts:51` declares it — and
`fixture-datasource.ts:26` reads only `scenario === "empty"`. The value used to
drive the service health map consumed by the deleted tabs.

An input accepted at a validated boundary and then silently dropped is precisely
the failure mode the project's error-handling rule exists to prevent: the host
gets no warning, no fallback notice, just default behaviour under a different
name.

### 6 — ROADMAP DoD bullets became unsatisfiable (high)

The same drift class as finding 1, with a sharper consequence. `ROADMAP.md:89`
still requires "Chat playground against any registered agent; event inspector
rendering `Run.stream()` typed events live" for M1; `:105` requires a Traces tab;
`:116-118` require Memory and Knowledge tabs. All three milestones are `[ ]`.

These bullets are not prose. `cycle-acceptance` reads the Definition-of-done
bullets *verbatim* as the acceptance criteria set, and a criterion that cannot be
exercised is recorded `not_exercised` — which blocks the checkbox flip. M1, M2
and M3 are now unacceptable by construction.

### 7 — a suppression justified by a test that does not exist (medium)

> `// biome-ignore … removê-lo quebraria o refresh (coberto por teste)`
> — `src/app/use-listing.ts:20`

There is no `use-listing` test, and no test anywhere asserts `reload()`. The
warrant was presumably true before `74a96c6`, when the deleted surfaces' refresh
buttons exercised it. A false warrant on a lint escape hatch is worse than no
warrant: the next reader trusts the parenthesis and stops checking.

### 3, 4, 5, 8 — dead surface left behind (low)

Zero-forever counters on `window.__STUDIO_METRICS__` (3) read as "this path never
ran" rather than "this path is gone". A dead `reload()` on a shared hook (4)
invites the next reader to wire a refresh the builder was never designed for. Two
of the three nav entries never pay off (5) — honest placeholder copy is why this
is low rather than medium. And two plugin endpoints plus the whole run path now
have no consumer outside their own tests (8).

## Explicit no-issues verdicts

All six `plugin/*` components: no stubs, no orphan exports, no documented promise
without an implementation. `theokitStudio()` — the package's only published export
— matches the signature documented in `docs/theokit-dev-integration.md`, and every
internal handler is reachable from the dispatcher plus the integration suite.

**Stated limit:** those verdicts come from the three Phase-2 scans, not from a
line-by-line read. Deep inspection of `plugin/*` is Phase 3's job, and the
run-endpoint (network + stream boundary) and static-serve (path traversal) are
the two files that most deserve it.

## What the scans did NOT find (negative results worth recording)

- **No stubs anywhere.** No `TODO`/`FIXME`/`unimplemented`/`NotImplementedError`
  in any non-fixture file, and zero `@ts-ignore`/`@ts-expect-error`. There are
  **four** `biome-ignore` suppressions (`use-listing.ts:20`,
  `session-view.tsx:171,179,227`), each carrying a written justification — but
  one of those justifications is false, which is finding 7.
- **No broken imports or unreachable modules** — `tsc --noEmit` is clean, so the
  cut left no dangling reference.
- **Symbol-level orphan analysis produced 21 hits, all false positives** —
  exported TypeScript interfaces consumed as parameter types inside their own
  module (`StudioPluginOptions`, `ListAgentsDeps`, …). Reporting those as dead
  code would have been noise; the real residue is at member level, which is
  where findings 3-5 come from.

## Gate

Independent adversarial evaluation (`loop-code-review:quality-evaluator`):
**score 0.80 as recorded in the database, PASS** (threshold 0.70), **zero
discards** — the evaluator opened every cited file, re-ran every grep, and
confirmed all five original non-info claims were literally true. (Its closing
message rounded the same verdict to 0.82; the database row is authoritative.)

It did not rubber-stamp them. Four corrections were applied before closing:

| What the gate caught | Correction |
|---|---|
| Finding 5 cited `:117` (inside `SkillsView`) and quantified the nav two contradictory ways — "one third" in the DB, "two of six" in the write-up | Re-cited to `:120`/`:131`; the nav has **three** entries, so it is two of three |
| Finding 1's `file` column (`README.md`) does not resolve against the target root | Repointed to `../../README.md` — it is two levels up, not one |
| The six `plugin/*` files were marked `inspected` while this document disclaimed a line-by-line read — and phases 3-5 gate on that number | Reclassified to `sampled`; deep-read coverage is honestly 18/48 (37.5%), scan coverage 24/48 (50%) |
| The no-issues verdict for `plugin-run-endpoint` used a **test-coverage** argument to dismiss a **consumer** problem — the same reasoning finding 4 rejects one row earlier | Registered as finding 8, stated honestly |

Three misses it found became findings 6, 7 and 8.

**One item deliberately not filed.** The evaluator noted that `CLAUDE.md:16` and
the architecture proposal lock `/_studio/svc/{lens,memory,rag}/*` as a same-origin
proxy the plugin never implements, and that such paths fall through to
`serveStudio` and return SPA HTML. That is scheduled M2/M3 work, so it is not
drift — but the fall-through-to-HTML behaviour on a documented route is a
**Phase 3** question, carried forward.
