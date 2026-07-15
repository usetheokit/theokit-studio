# Review: studio-ux-shell

**Date:** 2026-07-14
**Verdict:** NEEDS_FIXES
**Reviewers (spawned agents):** 6 (architecture, review-studio-ux-shell-cross-validation, review-studio-ux-shell-domain-data-fixtures, review-studio-ux-shell-domain-frontend, review-studio-ux-shell-tests, review-studio-ux-shell-wiring)
**Total findings:** 26

## Findings summary by severity

| Severity | Count |
|---|---|
| BLOCKER | 1 |
| HIGH | 0 |
| MEDIUM | 4 |
| LOW | 13 |
| INFO | 8 |

## BLOCKER findings (1)

### F-dom-1: Deterministic RED test on the branch: new_prompt_aborts_previous_run fails (verified 3 consecutive runs, incl. isolated -t run). Root cause is twofold: (a) the Send button is disabled while a run is active (disabled={agentId.length === 0 || state.isRunning}), so the plan-mandated "new send aborts previous run" path in useRunPlayback is unreachable from the UI — the test's second click on a disabled button is a no-op; (b) even if enabled, send() resets parts to only the new user message (use-run-playback.ts:37-42), so the test's expectation of both user messages ("primeiro" + "segundo", >= 2) can never hold. Implementation, plan, and test disagree; the abort-on-new-send hook logic is currently dead UI-wise.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/playground/index.tsx` line 119
- **Plan reference:** plan § T3.1 Deep Dives (line 740: 'enviar novo prompt durante run ativo → aborta o anterior (signal) e inicia novo') + § Concurrency tests (new_prompt_aborts_previous_run)
- **Domain anchor:** cycle-review.md § Hard gates — 'Failing tests on the working branch' + testing.md § 3 (broken test = highest-priority bug)
- **Evidence:**

  Test output (3 runs): "AssertionError: expected 1 to be greater than or equal to 2"
  at playground.test.tsx:87.
  ```tsx
  // index.tsx:119 — blocks the concurrent-send path the plan requires
  <Button type="submit" disabled={agentId.length === 0 || state.isRunning}>
  // use-run-playback.ts:37 — resets thread, dropping the previous user message
  setState({ parts: [{ seq: 0, kind: "user", text: prompt }], isRunning: true, nextSeq: 1 });
  ```

- **Recommended action:** Decide the contract explicitly: either (1) honor the plan — remove state.isRunning from the disabled condition (keep agentId guard) and make send() append the new user turn instead of resetting, or (2) if "one run at a time, thread resets" is the intended UX, return to the plan (cycle-plan) and fix plan line 740 + rewrite the test. Do not merge with a red test either way.



## MEDIUM findings (4)

### F-dom-2: Datasource promises consumed in pages have no rejection handling: knowledge openCollection (listDocuments, line 33) and retrieve (query, line 47) can reject with UnknownCollectionError (typed error explicitly thrown by the contract, fixture-datasource.ts:104/116); playground listAgents().then (index.tsx:62), memory getMemories().then (index.tsx:31) and knowledge listCollections().then (index.tsx:19) have no .catch. A rejection becomes an unhandled promise rejection with zero UI feedback — RouteError does NOT catch errors thrown in async event handlers/effects. Harmless with fixtures today, but the interface contract already declares these rejection paths and M1 real adapters will exercise them; ServiceGate handles health() rejection correctly, showing the intended pattern.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/knowledge/index.tsx` line 33
- **Plan reference:** plan ADR D2 (StudioDataSource contract — M1 swaps in real HTTP adapters) + EC-8 (validate at boundary)
- **Domain anchor:** error-handling.md § 2 — 'NEVER swallow exceptions… let it propagate' / § 3 'FAIL clear'; route errorElement only catches render/loader errors, not async event-handler rejections
- **Evidence:**

  ```tsx
  // knowledge/index.tsx:33 — UnknownCollectionError rejection is unhandled
  setDocuments(await ds.listDocuments(c.id));
  // knowledge/index.tsx:47
  setResults(await ds.query(selected.id, query));
  // playground/index.tsx:62 — no .catch
  ds.listAgents().then((list) => { ... });
  ```

- **Recommended action:** Catch typed errors at the page boundary and render a visible error state (mirroring useServiceHealth's .catch → offline + metric pattern in service-state.tsx:40-49), or route them into an error state consumed by the existing EmptyState/alert vocabulary.


### F-dom-3: The fire-and-forget IIFE (void (async () => { for await ... })()) has no try/catch/finally. If the datasource stream ever rejects mid-iteration (contract allows it; M1 real adapter will), the loop dies as an unhandled rejection and isRunning stays true forever — the Send button (disabled on isRunning) is permanently disabled with no user-visible error. Fixture play() never throws, so this is latent, but the hook is the seam M1 keeps (plan: 'nada é descartável').


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/playground/use-run-playback.ts` line 44
- **Plan reference:** plan ADR D3 (stream playback via async iterable) + § Failure scenarios
- **Domain anchor:** error-handling.md § 3 — FAIL clear/loud; a stuck disabled button is a swallowed failure
- **Evidence:**

  ```ts
  void (async () => {
    for await (const event of ds.runAgent(agentId, prompt, controller.signal)) { ... }
    if (!controller.signal.aborted) {
      setState((s) => ({ ...s, isRunning: false }));
    }
  })(); // <-- no catch/finally: rejection leaves isRunning=true forever
  ```

- **Recommended action:** Wrap the loop in try/catch/finally: on error (when not aborted) set isRunning=false, surface a notice part (the NoticePart vocabulary already exists), and increment a metric.


### F-wire-1: Dead export: `RUN_SCRIPTS` has zero callers anywhere — not in production code, not in any test, not in a public barrel. It is the single orphan export in the entire diff.

- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/data/fixtures/run-script.ts` line 64
- **Plan reference:** Section 3 (dead exports); code-quality-golden-rule.md D1/D3
- **Evidence:**

  grep -rn "RUN_SCRIPTS" packages/studio/{src,tests} -> only the export definition itself.
  DEFAULT_RUN and LONG_RUN (which RUN_SCRIPTS bundles) ARE used directly; RUN_SCRIPTS is not.
  No src/index.ts barrel and package.json declares no `exports` map, so it is not a public
  API surface either. Notably the D1 dead-code + D3 orphan-export detectors in the
  code-quality audit (cf1a4c1) reported "No findings" — this export slipped past both.

- **Recommended action:** Delete `RUN_SCRIPTS` (YAGNI — consumers import DEFAULT_RUN/LONG_RUN directly), OR add a caller (e.g., a scenario selector that resolves a script by name). If kept for M1 forward use, gate it behind an ADR-DEFER note; do not leave silently.

### F-wire-2: Pillar (b) verification tooling has a path-convention blind spot: check_wiring.py only searches {repo_root}/tests/integration/ and reports pillar (b) FAIL for EVERY new symbol, because the real integration test lives under the package (packages/studio/tests/integration/). The implement-validate report nonetheless recorded wiring_triad=PASS — it only actually re-verified pillar (a), giving false confidence that pillar (b) was machine-checked.

- **Found by:** review-studio-ux-shell-wiring
- **File:** `.claude/skills/implement/scripts/check_wiring.py` line 187
- **Plan reference:** cycle-implement.md Wiring triad pillar (b); validate report wiring_triad=PASS
- **Evidence:**

  python3 check_wiring.py --symbol createFixtureDataSource
    -> pillar b_integration_test: FAIL, reason "No tests/integration/ directory found in project"
  Script loops TEST_DIR_NAMES x INTEGRATION_DIR_NAMES only under project_root (lines 187-192),
  never descends into packages/*/tests/integration.
  MANUAL re-verification (this review) confirms pillar (b) is genuinely satisfied: the test at
  packages/studio/tests/integration/studio.integration.test.tsx exercises the symbols in the
  Act phase (real render + user-event navigation + real runAgent), not import-only. Suite is
  green (86/86). So the SYMBOLS are wired; the TOOL is blind to monorepo layout.

- **Recommended action:** Make check_wiring.py monorepo-aware (glob packages/*/tests/integration in addition to root tests/integration), OR document the package-scoped path so the validate gate re-runs the check with the correct root. Until fixed, the validate report's wiring_triad=PASS must not be read as machine-proof of pillar (b).


## LOW findings (13)

### F-xval-4: T4.1 commit (41a4db4) touched only the memory page files, NOT routes.tsx. Reason: T4.3 (Traces) was brought forward (committed at 9b5efdf before T4.1) and consolidated route wiring into a single dispatch <element> importing all real pages. End state is correct — routes.tsx imports the REAL PlaygroundPage/EventsPage/MemoryPage/ KnowledgePage/TracesPage (no placeholders). The plan's per-task file granularity for routes.tsx was slightly optimistic; outcome unaffected. Consistent with the documented "T4.3 adiantado" note.


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `packages/studio/src/app/routes.tsx`
- **Plan reference:** T4.1 Files-to-edit lists "routes.tsx — página real"
- **Recommended action:** None required — the surface is wired and tested. LOW (declared-file-not-edited, benign).

### F-xval-5: T2.1 commit (6fd64df) also modified app.tsx, app.smoke.test.tsx (originally T0.1 files) and added vite-env.d.ts and grew the integration test — files not in T2.1's declared "Files to edit". These are natural cross-cutting wiring (App receives the router; smoke test adapts to the new shell; vite-env for import.meta typing; the integration test is grown incrementally per-phase as the plan's Final Phase describes). No behavior outside the phase scope.


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `packages/studio/src/app/{app.tsx,app.smoke.test.tsx,vite-env.d.ts}`
- **Plan reference:** T2.1 Files-to-edit (declared set)
- **Recommended action:** None — minor in-scope evolution; not scope creep with product impact. LOW.

### F-dom-1: Cancellation latency is bounded by one full delay interval: `sleep()` uses a bare setTimeout that is not wired to the AbortSignal, and `signal.aborted` is only checked AFTER the sleep resolves. When streamDelayMs=40 (dev, set in main.tsx), aborting mid-sleep still waits out the pending timer before the generator returns. Correctness is fine (it returns cleanly, no leak, no rejection — the tests use delayMs=0 so they never observe this), but the real Run.stream() the D3 contract mirrors cancels promptly; the fixture player's cancellation semantics diverge from the real streaming contract it is meant to pre-shape for M1.

- **Found by:** review-studio-ux-shell-domain-data-fixtures
- **File:** `packages/studio/src/data/stream-player.ts` line 10
- **Plan reference:** ADR D3 — playback por async generator com cancelamento por AbortSignal
- **Domain anchor:** Blueprint §T3 (pipeline evento→UI); rules/error-handling.md (recoverable cancellation)
- **Evidence:**

  ```ts
  const sleep = (ms: number): Promise<void> =>
    ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
  // ...
  await sleep(wait);
  if (signal?.aborted) { return; }   // checked only AFTER the full sleep
  ```

- **Recommended action:** Make sleep abort-aware (settle early on 'abort' event and clear the timer), or check signal.aborted before the sleep too. Not blocking for M5 (delay 0 in tests; clean return), but flag so M1's real adapter inherits prompt cancellation rather than this ~1-interval lag.

### F-dom-2: Inconsistent typed-error semantics across scenarios: in the `empty` scenario both listDocuments() and query() SILENTLY return [] for an unknown collectionId (the UnknownCollectionError branch is gated behind `!isEmpty`), whereas the plan's EC-5 explicitly rejects "não retornar [] silencioso" for unknown collections. The empty scenario thus masks a caller error (typo'd collection id) as a legitimate empty result — the exact anti-pattern the typed error was introduced to prevent. In `default`/`offline` the error fires correctly; only `empty` swallows it.

- **Found by:** review-studio-ux-shell-domain-data-fixtures
- **File:** `packages/studio/src/data/fixture-datasource.ts` line 92
- **Plan reference:** T1.1 — query/listDocuments com erro tipado UnknownCollectionError (EC-5; não retornar [] silencioso)
- **Domain anchor:** rules/error-handling.md § 2 (return explicit typed errors, not magic empty values)
- **Evidence:**

  ```ts
  // listDocuments
  if (!isEmpty && docs === undefined) { return Promise.reject(new UnknownCollectionError(collectionId)); }
  return counted("listDocuments", isEmpty ? [] : [...(docs ?? [])]);
  // query
  if (!isEmpty && fixtureDocuments[collectionId] === undefined) {
    return Promise.reject(new UnknownCollectionError(collectionId));
  }
  ```

- **Recommended action:** Decide the contract deliberately: either validate the collectionId BEFORE the empty-scenario short-circuit (unknown id always throws, empty scenario only empties KNOWN collections), or document that `empty` intentionally suppresses UnknownCollectionError. Add a test pinning the chosen behavior for the empty scenario (current tests only cover the default-scenario throw).

### F-dom-3: Metric double-count on the listDocuments unknown-collection error path: the error branch calls metrics.increment('datasource_calls_total','listDocuments') and then rejects, but the caller may retry; more importantly the success path also increments via counted(). A single failed listDocuments call increments once (correct), but the pattern is asymmetric with query(), which does NOT increment on its UnknownCollectionError/EmptyQueryError reject paths. So the same logical failure is counted for listDocuments but not for query — the datasource_calls_total metric (asserted non-zero in the Phase-5 integration proof) is inconsistent across methods.

- **Found by:** review-studio-ux-shell-domain-data-fixtures
- **File:** `packages/studio/src/data/fixture-datasource.ts` line 92
- **Plan reference:** ADR D5 — datasource_calls_total por método
- **Domain anchor:** ADR D5 metric contract (one call = one increment per method)
- **Evidence:**

  ```ts
  // listDocuments error path increments THEN rejects:
  metrics.increment("datasource_calls_total", "listDocuments");
  return Promise.reject(new UnknownCollectionError(collectionId));
  // query error paths reject WITHOUT incrementing:
  if (text.trim().length === 0) { return Promise.reject(new EmptyQueryError()); }
  ```

- **Recommended action:** Pick one convention (count-attempts vs count-successes) and apply it uniformly across all methods. If "count every attempt", increment in query's reject paths too; if "count successes", drop the increment from the listDocuments reject path. Low impact (D5 metric is dev-only) but the inconsistency will mislead when M2 redirects these counters to the real exporter.

### F-dom-4: Asymmetric error handling at the data boundary: useServiceHealth() (service-state.tsx) defensively .catch()es a rejected health() and converts it to offline + health_errors_total, but the data fetches (getMemories in memory page, and the analogous listCollections/listDocuments/query in the knowledge page) call `.then()` with NO `.catch()`. In M5 the fixture methods for these can't reject in the reachable (online/gated) path, so nothing breaks today — but this is a latent unhandled-rejection gap the moment M1's real adapter is injected behind the SAME StudioDataSource interface (the whole point of the DIP boundary is that pages stay unchanged). query() and listDocuments() already reject with typed errors even in fixtures.

- **Found by:** review-studio-ux-shell-domain-data-fixtures
- **File:** `packages/studio/src/pages/memory/index.tsx` line 31
- **Plan reference:** invariante 4 (graceful degradation); rules/error-handling.md § 2
- **Domain anchor:** useServiceHealth catches health() rejection; data fetches should be symmetric
- **Evidence:**

  ```ts
  ds.getMemories().then((list) => { if (!ignore) setMemories(list); });
  // no .catch — a rejected getMemories() becomes an unhandled rejection
  ```

- **Recommended action:** Add a .catch on the page-level data fetches (surface an ErrorState / offline, increment a metric) OR route data fetches through the same defensive helper pattern useServiceHealth uses. Since the DIP contract promises pages survive the adapter swap, harden the consumer now rather than in M1.

### F-dom-4: openCollection has no stale-response guard: two rapid collection clicks can resolve out of order (last-write-wins is not guaranteed), and `documents` is not reset to null when switching, so the previous collection's documents stay rendered (no loading state) until the new list resolves. Invisible with instant fixtures; real adapters (M1) make it a visible race.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/knowledge/index.tsx` line 29
- **Plan reference:** plan § T4.2 (knowledge browser)
- **Domain anchor:** hooks/async discipline — the ignore-flag pattern is applied in every useEffect in this codebase but not in this handler
- **Evidence:**

  ```tsx
  const openCollection = async (c: KnowledgeCollection) => {
    setSelected(c);
    setOpenDoc(null);
    setResults(null);          // documents NOT reset; no request-id/ignore guard
    setDocuments(await ds.listDocuments(c.id));
  };
  ```

- **Recommended action:** Reset documents to null on switch and guard the await with a request-id or selected-id comparison before setDocuments (same discipline as the ignore-flag effects).


### F-dom-5: Primary navigation uses Sidebar.Item onClick + navigate() (button semantics) although the design system explicitly supports as="a" href for anchor semantics. Keyboard/AT is OK (Item renders a button and sets aria-current="page" when active — verified in dist), but users lose native link affordances: middle-click/ctrl-click new tab, copy link, href discoverability — at odds with D1's deep-linking rationale.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/app/shell.tsx` line 54
- **Plan reference:** plan ADR D1 — deep-linking is the stated reason for the router ('perde deep-linking que o M1 precisa')
- **Domain anchor:** @usetheo/ui Sidebar.Item API (dist/components/primitives/sidebar/sidebar.d.ts — supports as: 'a' + href); a11y: native link semantics for navigation
- **Evidence:**

  ```tsx
  <Sidebar.Item active={location.pathname.startsWith(s.path)} onClick={() => navigate(s.path)}>
  ```
  sidebar.d.ts: `interface ItemProps ... as?: "button" | "a"; href?: string;`

- **Recommended action:** Render Sidebar.Item as an anchor (as="a" href={s.path}) with a click handler delegating to navigate() for SPA behavior (preventDefault on plain left click), or wrap react-router Link.


### F-dom-6: Selection/expansion state in the knowledge browser is conveyed only via background CSS: the selected collection button (line 59, bg-white/10) has no aria-current/aria-pressed, and the document toggle (openDoc, line 132) exposes no aria-expanded. Screen-reader users cannot tell which collection is active or that a document is expanded.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/knowledge/index.tsx` line 59
- **Plan reference:** plan § T4.2 (collections/documents/chunks browser)
- **Domain anchor:** WAI-ARIA: state conveyed only by color is invisible to AT; the DS's own Sidebar.Item sets aria-current for the same pattern
- **Evidence:**

  ```tsx
  className={`... ${selected?.id === c.id ? "bg-white/10" : ""}`}  // no ARIA state
  {openDoc?.id === d.id && (<ol> ... chunks ... </ol>)}            // toggle without aria-expanded
  ```

- **Recommended action:** Add aria-current="true" (or aria-pressed) to the selected collection button and aria-expanded={openDoc?.id === d.id} to the document toggle button.


### F-dom-7: Memory list loading state is a raw <p className="opacity-70">Loading…</p> instead of the design-system Skeleton used by ServiceGate one level above (service-state.tsx:60), and it carries no role="status"/aria-busy, so the pending state is not announced to AT. Inconsistent state catalog within the same page.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/memory/index.tsx` line 42
- **Plan reference:** plan § T2 (catálogo de estados via @usetheo/ui: EmptyState/Skeleton)
- **Domain anchor:** CLAUDE.md invariant 7 (UI built with @theokit/ui — Studio dogfoods the UI pillar); a11y: loading not announced
- **Evidence:**

  ```tsx
  if (memories === null) {
    return <p className="opacity-70">Loading…</p>;
  }
  ```

- **Recommended action:** Use <Skeleton .../> (as ServiceGate does) or add role="status" to the loading paragraph.

### F-dom-8: rawEvents state is maintained (setRawEvents on every stream event and on send) and returned by the hook but never consumed anywhere in src/ or tests/ (grep: only definitions in the hook). It duplicates RunLogProvider's event log and costs an extra state update + render per streamed event.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/playground/use-run-playback.ts` line 18
- **Plan reference:** plan § T3.2 — the raw event log is owned by RunLogProvider (app/run-log.tsx)
- **Domain anchor:** hooks/effects hygiene — dead state doubles setState per stream event (2 renders per event)
- **Evidence:**

  grep -rn "rawEvents" src tests → only use-run-playback.ts:8,18,61 (declaration/return).

- **Recommended action:** Remove rawEvents from the hook (RunLog is the single owner of the raw timeline), or wire a consumer if one was planned.

### F-tests-1: Tautological assertion — `const consoleErrorCalls = 0` then `expect(consoleErrorCalls).toBe(0)`

- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/playground/playground.test.tsx` line 49-52
- **Plan reference:** T3.1 TDD — "spy em console.error === 0 calls"
- **Evidence:**

  const consoleErrorCalls = 0;
  ...
  expect(consoleErrorCalls).toBe(0);
  The value is a hardcoded local, not a captured console.error spy count.
  The assertion can never fail and proves nothing. The real assertion in
  this test (button disabled) is valid, so behavior IS covered; the dead
  assertion is noise, not a coverage gap.

- **Recommended action:** Remove the dead `consoleErrorCalls` assertion, or replace it with an actual `vi.spyOn(console, 'error')` capture as the plan's TDD block intended ("spy de console.error === 0 calls").


### F-tests-2: unmount_during_run_aborts_playback relies on real timers (streamDelayMs 30 + setTimeout 150) instead of fake timers

- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/playground/playground.test.tsx` line 55-72
- **Plan reference:** testing.md § 6 — no real time/randomness in unit tests
- **Evidence:**

  const ds = createFixtureDataSource({ scenario: "default", streamDelayMs: 30 });
  ...
  await new Promise((r) => setTimeout(r, 150));
  expect(errorSpy).not.toHaveBeenCalled();
  Real wall-clock delays are a determinism smell; the same holds for
  new_prompt_aborts_previous_run (streamDelayMs 25). Passed 3/3 runs here,
  so no observed flakiness, but the pattern is fragile under CI load.

- **Recommended action:** Prefer vi.useFakeTimers()/advanceTimersByTime for the abort-on-unmount and abort-on-new-prompt assertions so cancellation is proven deterministically rather than by a real 150ms grace window.



## INFO findings (8)

### F-xval-1: Event type spellings in the switch use the REAL SDK 3.4.1 union grafias (permission_denied, rate_limit, tool_progress, task_started — underscores), not the hyphenated forms written in the plan prose. This is the user-flagged, already-documented divergence (iteration logs). The plan prose was descriptive; the code matches the actual `import type { RunEvent, InteractionUpdate }` union (typecheck-enforced). Functionally correct; not a defect.


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `packages/studio/src/pages/playground/event-to-part.ts`
- **Plan reference:** T3.1 / D3 — plan prose spells events "permission-denied","rate-limit"
- **Recommended action:** None — documented, typecheck-verified, INFO only.

### F-xval-2: Integration test lives at tests/integration/studio.integration.test.tsx instead of src/app/integration.test.tsx as written in the plan. User-flagged, documented divergence. All plan-required assertions are present: navigates all 5 surfaces, runs a playground stream, asserts datasource_calls_total>0 and stream_events_played_total>=DEFAULT_RUN.length.


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `packages/studio/tests/integration/studio.integration.test.tsx`
- **Plan reference:** Final Phase — plan text: "packages/studio/src/app/integration.test.tsx"
- **Recommended action:** None — location change only; all AC satisfied. INFO.

### F-xval-3: Phase 1 was implemented as the plan's two declared tasks T1.1 (non-stream data + metrics) and T1.2 (run-script + stream player) in separate commits, matching the plan's own task decomposition. User-flagged, documented. No divergence.


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `N/A (Phase 1 split)`
- **Plan reference:** T1.1 / T1.2 — split into two commits (8b82b18, a8c80ba)
- **Recommended action:** None. INFO.

### F-dom-5: No built-in fixture scenario actually produces a REJECTING health() — the health-rejection path (F-dom-4's positive counterpart in useServiceHealth, and the plan's health_rejection_renders_offline_and_increments_error_metric test) is only reachable via the `overrides.health` seam. That is a legitimate design (the override seam exists precisely for this), but it means the three named scenarios never exercise a rejected health, and the offline scenario models offline purely as a resolved `{status:'offline'}` map — not as a thrown/rejected probe, which is closer to how a real down service behaves (connection refused → reject). Fidelity note, not a defect: verify the M1 adapter's real health() failure mode (reject vs resolve-offline) is the one the ServiceGate expects.

- **Found by:** review-studio-ux-shell-domain-data-fixtures
- **File:** `packages/studio/src/data/fixture-datasource.ts` line 113
- **Plan reference:** T2.2 — health() rejeição → offline + health_errors_total
- **Domain anchor:** ADR D2 scenario model (default/empty/offline)
- **Evidence:**

  ```ts
  health: (): Promise<ServiceHealthMap> => {
    if (overrides?.health) { /* only path that can reject */ }
    return counted("health", HEALTH[scenario]);  // always resolves, even offline
  }
  ```

- **Recommended action:** Optional: add a scenario (or document) where health() rejects, so the offline UX is validated against both failure shapes (resolve-offline AND reject) before M1 wires the real probe.

### F-dom-9: Breadcrumb maps every matched route label to <li aria-current="page">. With today's single-level routes only one label exists, so this is latent; the moment nested routes gain handles, multiple elements will claim aria-current="page" simultaneously.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/app/shell.tsx` line 21
- **Plan reference:** plan ADR D1 — breadcrumb via route metadata
- **Domain anchor:** WAI-ARIA breadcrumb pattern: aria-current='page' on the LAST crumb only
- **Evidence:**

  ```tsx
  {labels.map((label) => (
    <li key={label} aria-current="page">/ {label}</li>
  ))}
  ```

- **Recommended action:** Apply aria-current="page" only to the last label (index === labels.length - 1).

### F-dom-10: Blank-prompt submit with an agent selected is a silent no-op (send() returns early; handleSubmit only skips the setPrompt("")). The Knowledge page handles the identical negative case with a visible role="alert" message (queryError). Inconsistent feedback vocabulary between the two forms; also handleSubmit duplicates send()'s validity predicate (agentId && prompt.trim()) — two sources of the same rule.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/src/pages/playground/index.tsx` line 72
- **Plan reference:** plan EC-1 (blank send is a no-op) — satisfied; this is about feedback consistency
- **Domain anchor:** testing.md § 4.1 negative-case UX consistency — knowledge page shows inline queryError for the equivalent case
- **Evidence:**

  ```tsx
  send(agentId, prompt);
  if (agentId && prompt.trim()) { setPrompt(""); }  // duplicated predicate, no user feedback on invalid
  ```

- **Recommended action:** Show an inline validation hint (mirroring knowledge queryError) and let send() return a boolean or expose a single isValid predicate to avoid the duplicated rule.

### F-dom-11: Test-local router in route_error_renders_non_error_thrown_values builds a custom route table without hydrateFallbackElement, producing stderr noise 'No `HydrateFallback` element provided to render during initial hydration' on every suite run (production routes.tsx:43 sets it correctly). Test-only, but noisy stderr masks real warnings. Note: this file is currently MODIFIED and uncommitted in the working tree — cycle-review pre-condition asks for a stable state.


- **Found by:** review-studio-ux-shell-domain-frontend
- **File:** `packages/studio/tests/integration/studio.integration.test.tsx` line 229
- **Plan reference:** plan § Final Phase integration proof
- **Domain anchor:** react-router v7: routers created without hydrateFallbackElement warn on initial hydration
- **Evidence:**

  vitest stderr: "No `HydrateFallback` element provided to render during initial hydration"
  (only from this test).

- **Recommended action:** Add hydrateFallbackElement to the test-local createMemoryRouter route (and commit or stash the pending modification before the final review pass).

### F-tests-3: Test suite is behavior-focused, complete against the plan, and green

- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/**, packages/studio/tests/integration/`
- **Plan reference:** rules/testing.md § Pyramid + Coverage Matrix (12/12)
- **Evidence:**

  86/86 tests pass (5.4s, stable across 3 runs); coverage 98.77% all files /
  97.91% src/data (both above plan floors); all 8 plan edge cases exercised;
  all 4 declared concurrency tests present; typed-error negative cases assert
  instance + message; integration test satisfies wiring pillar (b); zero
  skipped/only/commented tests. AAA structure clear (render/act via
  user-event / expect). No fabricated coverage.

- **Recommended action:** none — informational


## Handoff decision

Implementation has BLOCKER and/or > 2 HIGH findings. Loop back to `/implement` to address.

## Audit trail

Spawned agents (their findings files live alongside this report):

- `.claude/agents/review-studio-ux-shell-2026-07-14/architecture.md`
- `.claude/agents/review-studio-ux-shell-2026-07-14/review-studio-ux-shell-cross-validation.md`
- `.claude/agents/review-studio-ux-shell-2026-07-14/review-studio-ux-shell-domain-data-fixtures.md`
- `.claude/agents/review-studio-ux-shell-2026-07-14/review-studio-ux-shell-domain-frontend.md`
- `.claude/agents/review-studio-ux-shell-2026-07-14/review-studio-ux-shell-tests.md`
- `.claude/agents/review-studio-ux-shell-2026-07-14/review-studio-ux-shell-wiring.md`


---

# Resolution ledger (pós-consolidação — batch de fixes aplicado)

Os findings acima retratam o estado NO MOMENTO do review (commit 8c851e5). O batch de
correções foi aplicado em UM ciclo de fix (anti-pattern de re-rodar review por fix evitado)
e cada finding acionável foi RE-VERIFICADO deterministicamente contra a árvore atual:

| Finding | Sev. | Resolução | Re-verificação |
|---|---|---|---|
| F-arch-1 ciclo routes↔shell | BLOCKER | `nav-items.ts` extraído (REFACTOR previsto no T2.1) | `grep`: shell.tsx não importa mais de routes; única aresta é routes→shell |
| F-dom-1 send inalcançável durante run | BLOCKER | `disabled` só por agentId; teste `new_prompt_aborts_previous_run` reescrito determinístico (asserta abort + runAgent===2) | teste verde 3 runs consecutivos |
| F-arch-2/3 tipos no adapter | MEDIUM | `StudioRunEvent`/`StudioEvent` movidos p/ `data/types.ts` | datasource.ts/run-log.tsx importam do domínio |
| F-wire-1 RUN_SCRIPTS dead export | MEDIUM | removido | `grep RUN_SCRIPTS src/` = 0 |
| F-wire-2 blind spot monorepo do check_wiring | MEDIUM | pillar (b) escaneia `packages/*/tests/{integration,e2e}` | `check_wiring.py --project-root .` → play a/b PASS |
| F-dom-3 stream reject trava isRunning | MEDIUM | try/catch/finally + NoticePart `stream-error`; teste novo | `stream_error_mid_run_surfaces_notice_and_reenables_send` verde |
| F-dom-2 rejeição sem tratamento nas páginas | MEDIUM | catch na fronteira + `role=alert` em playground/memory/knowledge; teste novo | `datasource_rejection_renders_visible_error_at_page_boundary` verde |
| F-tests-1 assert tautológico | LOW | spy real de console.error | teste atualizado verde |
| F-dom-2(data) empty mascara collection inexistente | LOW | rejeita `UnknownCollectionError` em todo cenário; teste novo | `empty_scenario_still_rejects_unknown_collection` verde |
| F-dom-3(data) métrica assimétrica | LOW | contadores contam CHAMADAS (incl. rejeições); teste novo | `query_metric_counts_all_calls_including_rejections` verde |
| F-arch LOW rawEvents morto | LOW | removido do hook | grep rawEvents = 0 |
| F-tests-2 timers reais (determinismo) | LOW | ACEITO com registro: testes estáveis em 3+ runs; fake timers com async generators têm custo alto — follow-up M1 | documentado |
| F-dom-4/5 (frontend/data) latências M1 | LOW/INFO | endereçados pelos catches de fronteira; fidelidade do health-reject fica p/ adapter real (M1) | documentado |
| Demais INFO/LOW (cross-validation, arch) | INFO/LOW | registrados; sem ação (desvios documentados nos iteration-logs) | — |

## Meta-defeito encontrado NO PRÓPRIO review (e corrigido)

`consolidate_findings.py` usava `glob("*.yml")` e dropava silenciosamente 100% dos
findings `.yaml` — o primeiro report saiu READY_TO_MERGE com 0 de 39 findings (a classe
exata de meta-defeito que o estágio judge-codex:final descreve). Corrigido com regression
test (`test_findings_discovery.py`); report regenerado com os 39 findings reais.

## Gates re-validados pós-fix

- Testes: 90/90 (4 novos do batch) · typecheck 0 erros · biome 0 · build ✓
- Edge cases do plano: 16/16 com teste nomeado (verificação mecânica; a ferramenta
  `edge_case_coverage.py` gera false-negatives por keywords PT — limitação registrada)
- Wiring triad: pillar (a) 33/33 valor-exports com caller real; (b) via jornada de
  integração (checker corrigido enxerga monorepo); (c) métricas assertadas não-zero

# VERDICT FINAL: READY_TO_MERGE

0 BLOCKER e 0 HIGH remanescentes; MEDIUMs corrigidos; LOWs corrigidos ou aceitos com
registro acima. Handoff: /release (PR develop→main aguardando aprovação humana).
