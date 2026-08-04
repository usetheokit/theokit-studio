# Phase 4 — Test audit

**Suite:** 119 tests, 16 files, all passing, 5.97s wall clock ·
**Measured coverage (v8):** 95.65% stmts / 89.46% branch / 94.5% funcs ·
**Findings:** 18 (1 high, 9 medium, 7 low, 1 info — after the gate) ·
**Coverage at close:** 39/48 (81%)

## The pyramid is sound

| Tier | Files | Tests | Share |
|---|---:|---:|---:|
| Unit | 13 | 103 | 86.6% |
| Integration | 2 | 15 | 12.6% |
| E2E | 1 | 1 | 0.8% |

*(The auditor first reported 96/15/1 — which sums to 112, not 119. The gate caught
the arithmetic; the per-file counts in its own evidence field were right all along.)*

Not top-heavy, not an hourglass. The unit tier works through **injected seams**
(`load`, `discover`, `fetchImpl`, `streamFactory`, `env`) with **zero `vi.mock`**
in the entire suite — dependency injection instead of module patching. The
integration tier spins a real Vite dev server on port 0 and calls it over real
HTTP with real `ssrLoadModule`.

The integration tier earns its weight: `studio-plugin.integration.test.ts:180-193`
asserts **HTTP response == direct handler call == filesystem scan**. That parity
check makes a silent second implementation of an endpoint structurally impossible.

Hygiene is clean: zero `.skip`/`.only`/`.todo`, no snapshots, no fixed ports,
`randomUUID` asserted by shape not value. The module-level `metrics` singleton is
reset before use in the five files that assert on it — four via `beforeEach`, and
`src/main.test.tsx:45` inside the test body.

One axis the auditor did **not** measure, and the gate did: **test granularity**.
22 test names repo-wide contain `_and_`, against this project's own `testing.md § 3`.
`builder.test.tsx:57` makes 15 assertions across four distinct behaviours; `:215`
makes 10 across five surfaces. A red there tells you a quarter of the builder broke,
not what broke. Filed medium.

## The finding that matters: 100% statements, untested where it kills

Phase 3's headline defect is `plugin/http.ts:13` — a guard that omits
`res.headersSent` and thereby converts any post-header throw into a process exit.
Coverage reports `http.ts` at **100% statements but 50% branch**.

The auditor did not take the summary table's word for it. It read
`coverage/coverage-final.json` directly:

```
b: {'0': [17], '1': [0], '2': [12], '3': [0]}
branchMap[1] = { line: 13, start col 42, end col 49 }   // the `return;`
```

`sendErrorEnvelope` ran **17 times**, `sendJson` **12 times**, and the guard
short-circuited **zero times in all 29**. The 100% statement figure is an
artifact of how v8 folds `return;` into the if-statement span — every call that
falls *through* the guard marks the statement covered.

Two facts make this structural rather than accidental:

1. **There is no `plugin/http.test.ts` at all.** The module is only ever reached
   through three consumers.
2. **All three fake responses make the guard unreachable by construction.**
   `static-serve.test.ts:48` hardwires `get destroyed() { return false; }`;
   `run-endpoint.test.ts:47` and `index.test.ts:51` define `writableEnded` and
   never define `destroyed` (undefined → falsy). **None defines `headersSent`** —
   so the *corrected* guard Phase 3 recommends could not even be asserted today
   without rewriting the harnesses.

The canonical error envelope that every handler funnels its failures through has
never once been invoked on an already-committed response — which is precisely the
state in which it kills the dev server.

## A test of mine that cannot fail for its own reason

`src/main.test.tsx:67` — `test_composition_root_selects_hybrid_in_live_mode`.

The name claims it proves the composition root picks the reflection adapter in
live mode. It cannot. `main.tsx:16` derives `live` from `config.mode` and passes
it to **two** places: the adapter selection (`:20`) and the router (`:26`). The
badge the test asserts on renders from the router prop, so it is green whichever
adapter was chosen. And `datasource_calls_total.listAgents` is incremented by
**both** adapters. Invert line 20 and the test still passes.

This is post-refactor residue, and it is mine: before `74a96c6` the test asserted
`findByText("live-agent")` — data only the reflection adapter can produce — and
`queryByText("Support Agent")` **null**, proving the fixture data was absent. I
replaced both with weaker proxies when the surfaces those assertions lived on were
deleted, and kept the original name. The test survived; its discriminating power
did not.

That is the exact failure mode the phase was told to hunt — "tests that now assert
less than their name implies" — and the audit found it in the reviewer's own work.

## Which 10% is uncovered

The number is not the story; the distribution is. The uncovered lines are
**disproportionately the defensive branches**:

| Uncovered | What it is | Verdict |
|---|---|---|
| `http.ts:13,20` | both response guards | the process-killing defect (high) |
| `run-endpoint.ts:154-156` | the 405 non-POST guard | untested — and the harness declares an unused `method?: string` seam clearly meant for it |
| `static-serve.ts:145-148` | the asset-branch 403 | all three traversal payloads use `.txt`, absent from `CONTENT_TYPES`, so only the SPA-fallback guard ever runs |
| `bootstrap.ts:90` | the `mount` call | `bootstrap()` is only ever exercised through its **failure** path; the boot chain is proven piecewise, never end to end |
| `builder/index.tsx:198-200,210` | both write-path error branches | the one failure test rejects a *read*; this is why Phase 3's error-slot collision is untestable today |
| `use-listing.ts:40` (func, not stmt) | `reload()` | zero executions, zero callers — while the comment at `:20` claims "(coberto por teste)". This is a **function**-coverage gap: `use-listing.ts` has no uncovered statement lines |

The last row closes a loop across three phases: Phase 2 found the dead `reload()`,
Phase 2 found the false suppression warrant, Phase 3 found the sticky `loadError`
it hides — and Phase 4 now shows the branch is unreachable by test because the only
trigger for a second load is never pulled.

## Determinism

No wall-clock dependence, no unseeded randomness in assertions, no order
dependence — and concurrency is tested with explicit gates rather than timing.
One exception, filed low: `plugin/index.test.ts:105` polls with a recursive
`setTimeout(wait, 5)`. The highest flakiness score assigned is 0.30, for
`studio-plugin.integration.test.ts` — and the reason is not timing but **env
leakage**: it sets `ANTHROPIC_API_KEY` and never restores it, and *deletes*
`THEOKIT_STUDIO_DIST` rather than restoring the prior value. Its sibling e2e file
does symmetric save/restore **and documents the exact hazard** — so the fix is
already written, one file over.

## No loop-back

The gaps found here point at defects Phase 3 already registered (`http.ts`,
`run-endpoint` 405, the error-slot collision, `use-listing`). Nothing suggests a
defect *class* Phase 3 missed, so `LOOP_BACK_TO_CODE_REVIEW` is not emitted.

## Honest overall assessment

This is a genuinely strong suite for dev-only tooling — behavioural assertions
rather than structural ones, concurrency tested with explicit gates rather than
timing (one 5ms poll excepted), real-boundary integration, and no mocking
framework at all. The criticism is narrow and specific: the uncovered 10% is not random
trivia, and the single branch containing the package's only process-killing defect
is inside it.

## Gate

Independent adversarial evaluation: **score 0.82, PASS**, **zero discards**.

The evaluator re-derived the headline byte-for-byte from `coverage-final.json`
(`b: {'0':[17],'1':[0],'2':[12],'3':[0]}`, `branchMap[1]` at line 13 cols 42-49)
and recomputed the aggregate independently: 95.66 / 89.46 / 94.51 against the
claimed 95.65 / 89.46 / 94.5.

Most importantly, it **tried to kill the self-incriminating finding empirically**:
it inverted the ternary at `src/main.tsx:20`, ran `src/main.test.tsx`, and watched
all 3 tests pass — then restored the file and verified a clean tree
(`git status --short` empty, md5 identical to backup). The finding survived the
experiment designed to disprove it.

Corrections applied after the gate:

| What the gate found | Correction |
|---|---|
| Pyramid arithmetic: 96+15+1 = 112 ≠ 119 | Unit is **103 tests / 86.6%** |
| Severity calculus inconsistent: the e2e oracle never constructing the production `streamFactory` was rated `info`, while the same class (a test asserting less than its name) was `medium` | Raised to **medium** |
| Finding anchored at `builder.test.tsx:252`, a test unrelated to its claim | Re-anchored to `src/app/use-listing.ts:40` |
| Three unmeasured axes: test granularity, CSS-literal assertions, fixture-cardinality coupling | Filed as three new findings |
| "No sleeps" contradicted this phase's own finding about a 5ms poll | Sentence corrected |
| `use-listing.ts:32` listed as an uncovered statement | It is a **function**-coverage gap at `:40`; the file has no uncovered statements |

A note on process: the first attempt at the severity correction updated the wrong
row (a `LIKE '%studio-e2e%'` match hit the pyramid verdict instead of the oracle
finding). It was caught by reading the result back and reverted before the phase
closed — recorded here because an unverified bulk `UPDATE` on the evidence store
is exactly the kind of silent corruption this audit exists to prevent.
