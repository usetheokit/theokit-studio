# Review: studio-ux-shell-2026-07

**Date:** 2026-07-15
**Verdict:** READY_TO_MERGE
**Reviewers (spawned agents):** 6 (review-studio-ux-shell-architecture, cross-validation, domain-frontend, review-studio-ux-shell-domain-testing, review-studio-ux-shell-tests, review-studio-ux-shell-wiring)
**Total findings:** 29

## Findings summary by severity

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| HIGH | 2 |
| MEDIUM | 6 |
| LOW | 13 |
| INFO | 8 |

## HIGH findings (2)

### F-arch-1: getSavedRequestContext is an exported symbol with ZERO callers and zero test references — dead export. Worse, the page's success message claims the saved context is "applied to fixture runs in this session", but nothing reads savedRequestContext: FixtureDataSource.runAgent never consumes it. The UI claim is not backed by a caller (wiring pillar (a) missing; honest-copy violation).


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages/request-context/index.tsx` line 13
- **Plan reference:** dogfood commit 5b9a5c3 (Request Context surface); wiring triad pillar (a)
- **Evidence:**

  ```ts
  // request-context/index.tsx:11-15
  let savedRequestContext = "{}";
  export function getSavedRequestContext(): string {
    return savedRequestContext;
  }
  // index.tsx:72 — "Saved at {savedAt} — applied to fixture runs in this session."
  ```
  `grep -rn getSavedRequestContext packages/studio` → only the definition site.
  fixture-datasource.ts runAgent (lines 91-97) plays runScript; no context input.
  Per code-quality-golden-rule § 2 this is `dead_code_unallowlisted_typescript`
  (FAIL_HARD cap) when /code-quality runs.

- **Recommended action:** Either (a) wire it: have the fixture runAgent (or the run-script echo event) read the saved context so the claim is true and the export has a caller + test; or (b) delete the export, keep savedRequestContext module-private, and soften the copy to "Saved for this session (not yet consumed by fixture runs)". Secondary: module-level mutable state leaks across tests (testing.md § 3 — the valid_json test persists '{"tenant":"acme"}' into any later render); acceptable for fixtures ONLY with an exported reset or context-based store.


### F-wire-1: getSavedRequestContext is a dead export AND the Request Context save is a UI-only no-op — the success message claims 'applied to fixture runs in this session' but nothing ever reads savedRequestContext.

- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/pages/request-context/index.tsx` line 13
- **Plan reference:** wiring triad pillar (a) + (b) — cycle-implement.md § Wiring triad; error-handling/honesty (Rule 3)
- **Evidence:**

  grep -rn getSavedRequestContext src tests → only the definition (index.tsx:13).
  Not called by RequestContextPage itself, not by playground/runAgent, not by any test
  (request-context.test.tsx never imports it).
  check_wiring.py verdict: HALT — pillar b_integration_test FAIL ("not exercised in any
  integration test"). Pillar a reports PASS with callers_sample = the defining file itself
  (definition-only match) — a false pass under the DEEP check.
  UI copy at index.tsx:72 renders "Saved at {time} — applied to fixture runs in this
  session." — false: fixture-datasource.runAgent (fixture-datasource.ts:91) takes no
  request context; the module-level savedRequestContext is write-only.

- **Recommended action:** Either (1) wire the seam: have the playground run path (or fixture runAgent options) consume getSavedRequestContext and add an integration test proving the saved context reaches a run; or (2) delete the export, keep the page as an editor, and soften the saved-status copy to not claim application to runs (honest-placeholder pattern already used elsewhere, e.g. processor run disabled state).



## MEDIUM findings (6)

### F-arch-2: SurfaceMeta.implemented is declared and hand-maintained for all 33 surfaces but consumed NOWHERE — routes.tsx keeps a parallel IMPLEMENTED_PAGES record as the real source of truth. Dual representation of the same knowledge ("which surfaces are real in M5") with no consistency check; drift is silent (flip implemented: true without adding the page → user gets PlannedSurfacePage while metadata claims implemented). DRY violation on business knowledge, plus a dead field.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/app/nav-items.ts` line 44
- **Plan reference:** dogfood commit 44def7c (Mastra-parity IA)
- **Evidence:**

  ```ts
  // nav-items.ts:44 — /** true = página real neste M5; false = placeholder ... */
  implemented: boolean;
  // routes.tsx:42 — const IMPLEMENTED_PAGES: Record<string, ReactElement> = { ... }
  // routes.tsx:88 — element: IMPLEMENTED_PAGES[s.path] ?? <PlannedSurfacePage .../>
  ```
  `grep -rn implemented packages/studio/src` → no consumer of the field outside
  nav-items.ts (hits are unrelated: processors implementedHooks, planned copy).

- **Recommended action:** Pick ONE source of truth: either delete the `implemented` field (routes' IMPLEMENTED_PAGES map is sufficient), or keep it and add a test asserting `Object.keys(IMPLEMENTED_PAGES)` === `SURFACES.filter(s => s.implemented).map(p)` so the two can never drift.


### F-arch-3: Half-done DRY extraction. useListing's own comment says "Agents/Memory/Knowledge já repetiam o mesmo useEffect com ignore-flag" — yet after the extraction those three original duplicators were NOT migrated: PlaygroundPage (203-220), MemoryPage (33-48), KnowledgePage (26-41) and EvaluationOverviewPage (36-56) still hand-roll the identical ignore-flag effect. The tree now holds the hook PLUS 4 hand-rolled copies of the same load/error-boundary logic.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages/playground/index.tsx` line 203
- **Plan reference:** use-listing.ts DRY rationale (rule-of-3 comment)
- **Evidence:**

  ```ts
  // playground/index.tsx:203-220 — verbatim shape of useListing's body
  useEffect(() => {
    let ignore = false;
    ds.listAgents().then((list) => { if (!ignore) setAgents(list); })
      .catch((error: unknown) => { if (!ignore) setLoadError(...); });
    return () => { ignore = true; };
  }, [ds]);
  ```
  useListing consumers: workspaces, workflows, evaluation(list pages), tools,
  processors, mcp-servers — but not playground/memory/knowledge.

- **Recommended action:** Migrate PlaygroundPage, MemoryPage and KnowledgePage to useListing (memory's scope-dependent reload may need a deps param or a keyed wrapper). Evaluation Overview's Promise.all multi-load is a legitimate exception — leave it or add a note. The rule-of-3 call itself was correct; finish the refactor.


### F-arch-4: AgentsTable structurally duplicates EntityTable — search filter + grid header + clickable rows + empty state, with near-identical class strings (grid-cols-[200px_1fr_180px], "border-border/30 border-b last:border-b-0", hover:bg-card, the same absolute-positioned Search icon). Agents IS a registry list (the canonical Mastra one); with 5 EntityTable consumers the rule-of-3 is long past — the 6th copy staying bespoke reintroduces the drift EntityTable was extracted to prevent.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages/playground/index.tsx` line 60
- **Plan reference:** entity-table.tsx header comment (declared consumers)
- **Evidence:**

  ```tsx
  // playground/index.tsx:91-96 vs entity-table.tsx:58-65 — same table chrome
  <div className="mt-4 overflow-hidden rounded-xl border border-border/40">
    <div className="grid grid-cols-[200px_1fr_180px] gap-4 border-border/40 border-b bg-card/80 ...">
  ```

- **Recommended action:** Render the agents list through EntityTable (columns: Name w/ Bot tile, Description, Model; onRowClick=onPick; rowTestId="agent-row"). If EntityTable lacks anything AgentsTable needs, that gap is the signal to extend the shared component, not to fork it.


### F-domtest-1: Scenario 'empty' is wired for all 7 new list methods in the fixture datasource (listWorkflows, listProcessors, listMcpServers, listScorers, listDatasets, listExperiments, listWorkspaces — fixture-datasource.ts:82-89) but is asserted NOWHERE for them. `empty_scenario_returns_empty_lists` still only checks the three pre-delta methods (listAgents, getMemories, listCollections), and not a single new page test renders with scenario 'empty' (only memory.test.tsx:30 does, pre-existing). The empty-registry rendering path of every new surface is untested.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/data/fixture-datasource.test.ts` line 30
- **Plan reference:** studio-ux-shell plan — fixture scenarios contract (default/empty/offline)
- **Domain anchor:** .claude/rules/testing.md § 4.1 — edge cases (empty-but-valid list is the canonical edge)
- **Evidence:**

  ```ts
  // fixture-datasource.test.ts:30-35 — unchanged by the delta
  it("empty_scenario_returns_empty_lists", async () => {
    const ds = createFixtureDataSource({ scenario: "empty" });
    expect(await ds.listAgents()).toEqual([]);
    expect(await ds.getMemories()).toEqual([]);
    expect(await ds.listCollections()).toEqual([]);
  });
  ```
  grep for `scenario: "empty"` across src/pages/**/*.test.tsx hits only
  memory.test.tsx:30. workflows/processors/mcp-servers/tools/workspaces/
  evaluation tests all hardcode scenario "default".
  Concrete untested behavior: entity-table.tsx:94 renders `emptyText`
  ("No workflows match your filter.") for a genuinely empty registry — a
  misleading message (nothing was filtered) that no test would catch; and
  WorkspacesPage (workspaces/index.tsx:27-61) renders only the header with
  zero items — no empty state at all, also never exercised.

- **Recommended action:** Extend empty_scenario_returns_empty_lists to the 7 new methods (cheap, one test), and add at least one page-level scenario:"empty" test per new surface family (workflows, processors, mcp-servers, tools, workspaces, evaluation) asserting the honest empty-registry copy — which will force fixing the "match your filter" wording for the unfiltered-empty case.


### F-domtest-2: The useListing catch branch (error → loadError → role="alert" rendering) has ZERO tests: no direct hook test, and none of the 6 consuming pages (workflows, processors, mcp-servers, tools, workspaces, evaluation ×4 sub-pages) injects a rejecting datasource. EvaluationOverviewPage duplicates the same load/catch boilerplate inline (evaluation/index.tsx:36-56) and is equally untested on the error path. This is the exact pattern the pre-delta suite proved for other surfaces (knowledge.test.tsx:64 rejects listDocuments; playground.test.tsx:121 tests stream rejection) — the new pages regressed the discipline.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/app/use-listing.ts` line 26
- **Plan reference:** studio-ux-shell plan — typed error becomes visible state at the page boundary
- **Domain anchor:** .claude/rules/testing.md § 4.1 — negative cases prove error handling; .claude/rules/error-handling.md § 4
- **Evidence:**

  ```ts
  // use-listing.ts:26-30 — no test reaches this branch
  .catch((error: unknown) => {
    if (!ignore) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  });
  ```
  grep for reject/mockRejected/loadError in src/pages/{workflows,processors,
  mcp-servers,tools,workspaces,evaluation}/*.test.tsx → 0 hits. All six pages
  render `{loadError && <p role="alert">...}` (e.g. workflows/index.tsx:128-130)
  — production UI branch with no caller in any test.

- **Recommended action:** One shared test is enough for the hook (render any consumer with a datasource whose list method rejects a typed Error; assert role="alert" shows the message and no rows render). Add a sibling test for EvaluationOverviewPage's inline Promise.all catch (rejection of ONE of the three lists must surface, not hang counts at 0 silently).


### F-tests-1: Known flake reproduced in dogfood (one cold-cache run failed 5 shell/integration tests on timeouts, then 2 runs green 126/126) is a real margin problem: no explicit testTimeout is configured, so the suite rides vitest's 5000ms default. The heaviest test (shell sidebar_navigates_all_root_surfaces) measures 1078ms warm and ~3s cold — 60% of budget before CPU contention from parallel file workers and first-run vite transforms (collect alone was 2.71s warm). A 5s ceiling on a 3s cold baseline is a coin-flip on slow CI, and per the project rule an intermittent failure is a bug, not weather.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/vitest.config.ts` line 6
- **Plan reference:** rules/testing.md § 3 — "Flaky tests are bugs — fix or delete"
- **Evidence:**

  vitest.config.ts test block: environment/globals/setupFiles/css/coverage only —
  no testTimeout/hookTimeout keys.
  Verbose run (warm): sidebar_navigates_all_root_surfaces 1078ms,
  final_phase_all_five_surfaces 709ms, playground_run_then_events 639ms.
  Dogfood report: 1 cold-cache run -> 5 timeout failures in shell/integration;
  2 subsequent full runs green (126/126).

- **Recommended action:** Set an explicit margin in vitest.config.ts (e.g., testTimeout: 15000) — all heavy tests are event-driven (findBy*/waitFor), so a larger ceiling costs nothing on green runs. Optionally split sidebar_navigates_all_root_surfaces (8 click+assert iterations in one test) into a test.each so no single test accumulates the whole navigation budget.



## LOW findings (13)

### F-arch-5: EntityTable hand-rolls a raw <input> with bespoke Tailwind while the sibling AgentsTable uses the design-system Input from @usetheo/ui for the same filter affordance. Inconsistent dogfooding of the UI pillar inside the same delta.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/app/entity-table.tsx` line 49
- **Plan reference:** CLAUDE.md architecture invariant 7 (UI built with @theokit/ui)
- **Evidence:**

  ```tsx
  // entity-table.tsx:49-56
  <input type="search" aria-label={filterLabel} className="h-9 w-full rounded-lg border ..." />
  // playground/index.tsx:82-89
  <Input type="search" aria-label="Filter agents" className="pl-9" ... />
  ```

- **Recommended action:** Use the @usetheo/ui Input primitive in EntityTable (className="pl-9" for the icon inset), matching AgentsTable — then F-arch-4's migration erases the inconsistency entirely.


### F-arch-6: Submenu back button hardcodes navigate("/") while its aria-label promises "Back to {parent title}". Correct today (every submenu's parent is "main" and "/" redirects to /agents), but the MENUS registry supports arbitrary nesting via `parent` — the first nested submenu will get a back button that jumps to Agents instead of its parent menu, and the label already lies structurally.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/app/shell.tsx` line 117
- **Plan reference:** dogfood commit 44def7c (drill-down sidebar)
- **Evidence:**

  ```tsx
  // shell.tsx:117-119
  onClick={() => navigate("/")}
  aria-label={`Back to ${MENUS[menu.parent]?.title ?? "main menu"}`}
  ```

- **Recommended action:** Derive the target from the registry: navigate to the parent menu's first item path (getMenu(menu.parent).groups[0].items[0].path) instead of "/". One line, removes the latent contract break.


### F-arch-7: resolveActiveMenu re-encodes URL-prefix knowledge that already lives in MENUS (each submenu's item paths share the prefix). Adding a new submenu to MENUS without updating this if-chain silently leaves the sidebar on "main". KISS defends the explicit chain, but nothing guards the two against drift.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/app/nav-items.ts` line 444
- **Plan reference:** dogfood commit 44def7c (URL as source of truth for active menu)
- **Evidence:**

  ```ts
  if (pathname.startsWith("/evaluation")) return "evaluation";
  // ... one branch per submenu, hand-synced with MENUS keys
  ```

- **Recommended action:** Either derive it (return the submenu whose id-prefixed paths match, falling back to "main") or add a unit test asserting every non-main MENUS key is resolvable from its own items' paths. Test-guard is the cheaper fix.


### F-arch-8: StudioDataSource is now a 16-method header interface spanning three future backends (SDK registry, theo-memory, theo-rag) plus health. Each page consumes 1-2 methods (ISP § 13.4: header vs role interfaces). Acceptable while the only implementer is FixtureDataSource, but every M1+ real adapter will be forced to implement all three service domains or wrap a composite. Flagging as a tracked trade-off, not a defect — ADR D2 chose the single contract deliberately.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/data/datasource.ts` line 24
- **Plan reference:** ADR D2 (single data contract); extension adds 6 methods this delta
- **Evidence:**

  ```ts
  export interface StudioDataSource {
    listAgents/...Workspaces (10 registry methods); runAgent;
    getMemories; listCollections/listDocuments/query; health();
  }
  ```

- **Recommended action:** No change now (YAGNI). When the first real adapter lands (M1), split into role interfaces (RegistrySource / MemorySource / KnowledgeSource / HealthSource) composed into StudioDataSource, so per-service adapters stay independent. Record that intent in the ADR or plan for M1.


### F-domtest-3: getMenu (throws "Unknown menu: {id}", nav-items.ts:435-441) and getSurface (throws "Unknown surface: {path}", nav-items.ts:47-53) have no negative test — nothing asserts the fail-fast contract. resolveActiveMenu is exercised only indirectly through shell.test.tsx drill-down clicks (positive paths); its fallback-to-"main" and its prefix-matching edge ("/memoryfoo".startsWith("/memory") → resolves to the "memory" submenu for a nonexistent route) are unasserted. There is no nav-items.test.ts at all despite the file growing to 459 lines of pure, trivially unit-testable logic.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/app/nav-items.ts` line 435
- **Plan reference:** delta commit 44def7c — drill-down IA; fail-fast accessors
- **Domain anchor:** .claude/rules/error-handling.md § 2 (typed, explicit errors) + testing.md § 4.1 (negative case asserts the specific error)
- **Evidence:**

  grep for "Unknown menu|Unknown surface|resolveActiveMenu|getMenu|getSurface"
  across src/**/*.test.* and tests/ → 0 hits.
  ```ts
  // nav-items.ts:444-458 — prefix match; "/memoryfoo" hits the "memory" branch
  if (pathname.startsWith("/memory")) { return "memory"; }
  ```

- **Recommended action:** Add a small nav-items.test.ts: getMenu("nope") / getSurface("/nope") throw with the exact message; resolveActiveMenu table test including "/", "/agents", "/evaluation/scorers", and the "/memoryfoo" edge (decide and pin the intended behavior — segment-boundary match vs raw prefix).


### F-domtest-4: CopyField's failure branch contradicts its own comment and is untested. The comment says "a falha vira feedback visível, nunca exceção engolida sem sinal", but the catch only does setCopied(false) — the default state — so a clipboard failure produces NO visible feedback (icon stays as Copy, user thinks nothing happened). No test clicks the copy button at all (success or failure), even though jsdom's missing navigator.clipboard makes the failure branch the one that would actually execute in the test environment — i.e. the easiest negative test in the whole delta was skipped.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/pages/mcp-servers/index.tsx` line 50
- **Plan reference:** delta commit 343e155 — MCP server detail view, transports with copy
- **Domain anchor:** .claude/rules/error-handling.md § 5 — swallowed error with no signal; testing.md § 4.1 negative case
- **Evidence:**

  ```ts
  // mcp-servers/index.tsx:50-60
  // Progressive enhancement: clipboard pode não existir (http não-seguro/jsdom);
  // a falha vira feedback visível, nunca exceção engolida sem sinal.
  try {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch {
    setCopied(false);   // <- indistinguishable from "never clicked"
  }
  ```
  grep "clipboard" in src/**/*.test.* → 0 hits.

- **Recommended action:** Either make the comment true (render a visible failure state, e.g. brief "Copy failed" text) and test it, or fix the comment to admit the silent degradation. Test success via a stubbed navigator.clipboard and failure via the jsdom default (undefined clipboard).


### F-tests-2: The shared EntityTable emptyText branch (visible.length === 0) is never exercised by any test. Filter tests in workflows/tools narrow to exactly 1 match but never to 0, and no test asserts the "No ... match your filter." strings shipped by 4 consumer pages (workflows, tools, mcp-servers, evaluation x3). Playground's no-match test covers its own bespoke list, not EntityTable. One component-level test closes the gap for all consumers.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/app/entity-table.tsx` line 93
- **Plan reference:** rules/testing.md § 4.1 — edge cases vs negative cases (empty-but-valid list)
- **Evidence:**

  grep -rn "match your filter" across *.test.* -> 0 matches.
  entity-table.tsx:93-95 renders the empty <li>; consumers pass emptyText at
  tools/index.tsx:28, workflows/index.tsx:145, mcp-servers/index.tsx:168,
  evaluation/index.tsx:132,184,262.

- **Recommended action:** Add one test (in workflows.test.tsx or a new entity-table.test.tsx): filter_with_no_match_shows_empty_text — type "zzz-nonexistent", assert 0 rows and the emptyText string is visible.


### F-tests-3: CopyField (the headline of commit 343e155 "transports with copy") has zero test coverage: neither the clipboard success path (icon flips to Check) nor the documented no-clipboard fallback (comment at line 51 says clipboard may not exist in jsdom/insecure http — exactly the branch a jsdom test would hit) is asserted. The mcp-servers tests assert transport URLs render but never click the copy button.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/mcp-servers/index.tsx` line 48
- **Plan reference:** rules/testing.md § 4.1 — negative cases prove error handling / fallback
- **Evidence:**

  grep -n "copy" mcp-servers.test.tsx -> 0 interaction with the button; only
  aria-label text rendering is implicitly present. CopyField handleCopy at
  index.tsx:50-54 has an untested guard branch.

- **Recommended action:** Add copy_button_writes_transport_url_to_clipboard (stub navigator.clipboard.writeText via vi.fn, assert called with the URL and the Check state appears) and, if the guard silently no-ops without clipboard, assert that behavior explicitly.


### F-tests-4: Two timing-coupled tests are green but probabilistic in WHAT they prove. (a) unmount_during_run_aborts_playback sleeps a raw 150ms (setTimeout) and asserts console.error was NOT called — a weak oracle that passes vacuously if playback happens to finish before unmount matters. (b) new_prompt_aborts_previous_run relies on streamDelayMs 25 keeping run 1 alive while the second send is typed; every assertion (thread reset, runAgent === 2, "primeiro" gone) also holds if run 1 already completed, so the abort path is exercised only when the race is won. Neither test can flake (they pass both ways) — the cost is silent coverage loss, not red CI.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/playground/playground.test.tsx` line 96
- **Plan reference:** rules/testing.md § 6 — time/randomness in unit tests
- **Evidence:**

  playground.test.tsx unmount test: `await new Promise((r) => setTimeout(r, 150))`
  + errorSpy.not.toHaveBeenCalled() as the only oracle.
  new_prompt test comment acknowledges timing design ("run 1 ativo (delay 25ms/evento)").

- **Recommended action:** Prefer a deterministic abort oracle: expose an abort counter/metric from useRunPlayback (e.g., runs_aborted_total) and assert it === 1, or use vi.useFakeTimers to hold run 1 provably mid-flight at the moment of the second send/unmount.


### F-tests-5: A handful of new test names join two behaviors with "and" where the body really does assert two behaviors: filter_narrows_agents_list_and_no_match_shows_empty_row (narrowing + empty state), evaluation_drilldown_shows_submenu_and_back_returns_to_root (drill-down + back), row_click_opens_detail_with_phases_and_disabled_run (detail render + run-disabled invariant). Most other "and" names are one behavior with a compound observable outcome and are fine. Advisory only.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/playground/playground.test.tsx` line 1
- **Plan reference:** rules/testing.md § 3 — "and" in the test name is a smell
- **Evidence:**

  grep '_and_' across the new test files -> ~8 names; the three above assert
  separable behaviors in one test body.

- **Recommended action:** When touching these files next, split the genuinely two-behavior tests; do not churn the suite solely for naming.


### F-wire-2: listSkills has no production UI consumer — the chain fixtureSkills -> listSkills terminates at fixture-datasource.test.ts; no page lists skills.

- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/data/datasource.ts` line 27
- **Plan reference:** wiring triad pillar (a) — dead-export watch
- **Evidence:**

  grep -rn listSkills src tests → interface (datasource.ts:27), impl
  (fixture-datasource.ts:80-81), and fixture-datasource.test.ts:20 only.
  PRE-EXISTING: listSkills already had no page consumer at b7e9d99 (git grep confirms),
  so this was NOT introduced by the delta — but the delta added 10+ Mastra-parity listing
  surfaces and still ships no Skills surface, leaving the method orphan.

- **Recommended action:** Track explicitly: either add a Skills surface (or fold skills into an existing page) in a follow-up task, or remove listSkills/fixtureSkills until a consumer exists (YAGNI). Out-of-delta, so advisory only for this incremental review.


### F-wire-3: Test legacy_events_and_traces_paths_redirect exercises only /events; the /traces redirect is covered only indirectly (integration test entering via '/traces').

- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/app/shell.test.tsx` line 111
- **Plan reference:** testing.md § 3 — test names describe behavior
- **Evidence:**

  shell.test.tsx:111-114: renderShell(["/events"]) + one assertion on the Events heading.
  No renderShell(["/traces"]) anywhere in shell.test.tsx. Coverage exists via
  tests/integration/studio.integration.test.tsx:109 (initialEntries ["/traces"]), so the
  redirect is NOT untested — but the shell test name over-claims.

- **Recommended action:** Rename to legacy_events_path_redirects, or add the missing renderShell(["/traces"]) assertion so the name is honest.


### F-wire-4: The six new datasource methods increment datasource_calls_total (instrumentation verified in code) but no test asserts the counter for any of them; fixture-datasource.test.ts has zero cases for the new methods.

- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/data/fixture-datasource.test.ts` line 1
- **Plan reference:** wiring triad pillar (c) — runtime metric observed, not just instrumented
- **Evidence:**

  fixture-datasource.ts:84-89 route all six through counted() -> metrics.increment
  ("datasource_calls_total", method) — pillar (c) instrumentation PRESENT.
  grep listProcessors|listMcpServers|listScorers|listDatasets|listExperiments|
  listWorkspaces in fixture-datasource.test.ts → no matches. Metric assertions in the
  suite cover only listAgents/runAgent (integration lines 47, 175, 234) plus an
  aggregate sum (line 231). New methods are exercised transitively via page tests,
  but their metric emission is never observed by an assertion.

- **Recommended action:** Add one table-driven case in fixture-datasource.test.ts asserting metrics.snapshot().datasource_calls_total[method] === 1 after calling each new list method (mirrors the existing listAgents pattern).



## INFO findings (8)

### F-arch-9: No cycle regression. Verified import graph: routes.tsx → shell.tsx → nav-items.ts → (lucide-react only); pages import app/{nav-items,page-header, entity-table,use-listing} but never routes.tsx or shell.tsx. File-level graph is acyclic; the nav-items extraction continues to hold under the drill-down rework.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/app/routes.tsx` line 26
- **Plan reference:** previous review F-arch-1 (routes ↔ shell cycle)
- **Evidence:**

  shell.tsx:5 imports only ./nav-items; nav-items.ts:5-36 imports only lucide-react.

- **Recommended action:** none — keep nav-items dependency-light.

### F-arch-10: DIP boundaries hold across the delta. types.ts, fixtures/*, metrics.ts, fixture-datasource.ts contain zero react imports; the only react touch in src/data is the deliberate context seam in datasource.ts (fail-fast useDataSource). All 6 new contract methods are implemented in FixtureDataSource with the counted() metric wrapper (wiring pillar c) and typed-error boundaries preserved. New pages consume data exclusively through useDataSource/useListing — no page imports fixture-datasource directly. MetricsPage importing the data/metrics singleton directly is internal stable code, not an infrastructure boundary (DIP vs KISS — acceptable).


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/data/types.ts` line 1
- **Plan reference:** plan T1.1 (react-free data layer); architecture.md § 1-2
- **Evidence:**

  grep react in src/data/fixtures/*.ts → no hits; only @theokit/sdk types in
  types.ts:176 (envelope-only, adapter isolation per F-arch-2/3 of prior review).

- **Recommended action:** none.

### F-arch-11: EntityTable is NOT over-engineered: 9 props, every one exercised by the 5 current consumers; render-prop columns are the canonical shape; the only default (rowTestId) is used. No speculative knobs (no sorting/pagination/ selection scaffolding). Local filter state keeps it self-contained (SRP: presentational list w/ filter). Genericity is justified by real consumers, not anticipation.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/app/entity-table.tsx` line 12
- **Plan reference:** scope question — EntityTable genericity vs over-engineering
- **Evidence:**

  Consumers: workflows, processors, mcp-servers, tools, evaluation (scorers/
  datasets/experiments) — all pass distinct columns/grid/matches.

- **Recommended action:** none (see F-arch-4/F-arch-5 for the two adjacent gaps).

### F-arch-12: Remaining changed files clean from the architecture lens: new pages (workflows, processors, mcp-servers, tools, workspaces, evaluation, metrics, logs, settings, planned) each hold one surface responsibility, use PageHeader + getSurface (single metadata source), honest disabled affordances in fixtures mode; detail-view selection is consistent in-memory state across pages (not URL-addressable — a deliberate, uniform trade-off; deep-linking to details can come with the real registry). No `any`, no console.*, no @ts-ignore anywhere in the diff; naming conventions (kebab-case files, PascalCase components) hold; ES modules throughout.


- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages`
- **Plan reference:** remaining delta files
- **Evidence:**

  git diff b7e9d99..HEAD grep scans: 0 hits for `: any|as any|@ts-ignore`,
  0 hits for `console.`.

- **Recommended action:** none.

### F-domtest-5: CLEAN — new fixtures (registry: workflows/processors/mcp; evaluation: scorers/datasets/experiments; workspace) are deterministic and drift-safe: hardcoded ISO timestamps (no Date.now/Math.random anywhere in src/data/fixtures), every array Object.freeze'd, every fixture typed against ../types so drift from the type contract is compiler-enforced, and the datasource structuredClones on read so the shallow freeze cannot leak mutations to consumers. Date rendering in pages pins locale "en-US" and no test asserts a formatted date, so no timezone flakiness. request-context uses new Date().toLocaleTimeString() in UI but its tests assert only the "Saved at" prefix — safe.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/data/fixtures/registry.ts` line 10
- **Plan reference:** delta commits 5b9a5c3 / 343e155 / b502eaa — new fixture families
- **Domain anchor:** testing.md § 6 — no time/randomness in fixtures; fixture determinism
- **Evidence:**

  registry.ts:10/32/44/49/93/108, evaluation.ts:3/20/33, workspace.ts:3 — all
  Object.freeze; fixture-datasource.ts:71-74 structuredClone via counted().

- **Recommended action:** none — record as clean.

### F-domtest-6: CLEAN — metrics.reset hygiene holds across the delta: every test file that asserts on the metrics singleton has beforeEach(metrics.reset()) — new pages/metrics/metrics.test.tsx:7-9, plus the pre-existing fixture-datasource, playground, knowledge, service-state, stream-player, event-to-part and tests/integration/studio.integration.test.tsx:19. New page tests that do NOT assert metrics correctly omit the reset (no false hygiene requirement).


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/pages/metrics/metrics.test.tsx` line 7
- **Plan reference:** metrics singleton hygiene (prior review convention)
- **Domain anchor:** testing.md § 3 — test independence, no shared mutable state
- **Evidence:**

  grep "metrics.snapshot|metrics.increment" across tests → 9 files; each of the
  9 also greps positive for metrics.reset in a beforeEach.

- **Recommended action:** none — record as clean.

### F-domtest-7: CLEAN — pyramid balance is sane after the delta: ~13 new/expanded component test files (~46 component tests: workflows 4, processors 4, mcp 4, evaluation 4, tools 2, workspaces 1, request-context 2, settings 1, logs 1, metrics 2, plus expanded shell 15) against a modestly grown integration suite (17 tests, one new shell-parity case). Unit/component-heavy, integration at the boundary — correct shape. The gaps are coverage holes (F-domtest-1/2), not balance holes.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/tests/integration/studio.integration.test.tsx` line 17
- **Plan reference:** test pyramid balance after the delta
- **Domain anchor:** testing.md § 2 — pyramid: many unit/component, moderate integration
- **Evidence:**

  it() counts: shell.test.tsx 15, integration 17, page tests 44 across 15 files.

- **Recommended action:** none — record as clean.

### F-tests-6: Positive findings worth recording: (1) honest-empty-state discipline is TESTED, not just implemented — logs asserts zero fabricated log rows, metrics asserts the empty registry, processors/workflows assert run buttons are disabled in fixtures mode; (2) request-context has a true negative case asserting the specific typed message ("must be valid JSON") per error-handling rules; (3) date assertions are deliberately avoided despite toLocaleString rendering, keeping the suite timezone-safe; (4) no .skip/.only anywhere; (5) processors' Radix Select test asserts an option is ABSENT (labels not.toContain "step") — a rare and valuable negative assertion.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/logs/logs.test.tsx` line 1
- **Plan reference:** testing.md § 1 — tests as executable documentation
- **Evidence:**

  See determinism_checks and edge_cases_and_negative_balance above.

- **Recommended action:** none — keep the pattern.


## Handoff decision

Implementation passes all gates. Ready for merge.

## Audit trail

Spawned agents (their findings files live alongside this report):

- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-architecture.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/cross-validation.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/domain-frontend.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-domain-testing.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-tests.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-wiring.md`

---

## Resolution log (fix batch — commit 87d7a36, 2026-07-15)

Todos os findings acionáveis foram corrigidos no mesmo batch, em vez de despachar
READY_TO_MERGE com caveats:

| Finding | Sev | Resolução |
|---|---|---|
| F-arch-1 / F-wire-1 (dedup — mesmo defeito raiz) | HIGH | Export morto `getSavedRequestContext` removido; copy do save honesto ("runs consume it once Studio attaches to a real registry") |
| F-arch-2 | MEDIUM | Campo `SurfaceMeta.implemented` removido (rotas `IMPLEMENTED_PAGES` é a única fonte de verdade) |
| F-arch-3 / F-arch-4 | MEDIUM | Playground migrado para `useListing` + `EntityTable` compartilhados |
| F-tests-1 | MEDIUM | Flake corrigido no bound real: `asyncUtilTimeout: 5000` (Testing Library) + `testTimeout: 15000` (vitest); 2 runs completas consecutivas 132/132 |
| F-front-1 | MEDIUM | Status de run do workflow com `sr-only` text |
| F-front-3 / F-domtest-4 | MEDIUM | `CopyField` mostra "Copy failed" visível; testes de copy sucesso/falha com clipboard mockado |
| F-domtest-1 | MEDIUM | `noItemsText` no EntityTable (registry vazio ≠ filtro sem match) em todos os consumidores; empty state no Workspaces; testes de cenário empty |
| F-domtest-2 | MEDIUM | Teste de rejeição do datasource via `useListing` (role=alert) |
| F-xval-1, F-xval-2, F-wire-3 (LOWs baratos) | LOW | CHANGELOG reagrupado; strings PT de erro traduzidas; teste do redirect /traces |

### Dismissals com rationale (ADR-style)

- **F-front-2 (MEDIUM — sidebar items como button+navigate em vez de as="a")**:
  DISMISSED. O padrão `as="button"` + `navigate()` é decisão deliberada herdada do
  theo-cloud app-sidebar (EC-1: `as="a" href` produz full page reload que destrói o
  estado da SPA). Mitigação aplicada: `aria-current="page"` no item ativo. Revisitar
  quando o DS expor um `as` que integre com o router sem reload.
- **LOWs restantes (advisory por design, logados para o backlog)**: Enter-to-send +
  live region no chat; semântica de table nas listagens; contraste do HookMark "no";
  headings h2 em Settings/Workspaces/detalhes; teste de drift resolveActiveMenu×MENUS;
  ISP do StudioDataSource (split por adapter no M1); `listSkills` sem consumidor
  (pré-existente ao delta); testes de abort com sleeps probabilísticos.

### Limitações honestas desta run

- `edge_case_coverage.py` reportou 3.6% — artefato do matcher heurístico por keyword:
  os edge cases do plano estão em PT e os testes foram traduzidos para EN no delta.
  A cobertura real foi validada pelo agente de testes (negative/edge balance bom nas
  páginas interativas; thin apenas nas tabelas read-only, coberto por F-domtest-1).
- `check_wiring.py` pillar-(a) deu falso PASS no export morto (match por definição);
  o agente de wiring detectou manualmente. Candidato a melhoria do detector.

**Veredito final: READY_TO_MERGE** — 0 BLOCKER, 0 HIGH em aberto, 0 MEDIUM em aberto
(1 dismissed com rationale), LOWs logados. Gates: 132/132 testes (2 runs completas),
tsc limpo, biome limpo, build OK.
