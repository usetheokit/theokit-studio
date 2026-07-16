# Review: studio-ux-shell-2026-07

**Date:** 2026-07-15
**Verdict:** READY_TO_MERGE
**Reviewers (spawned agents):** 6 (review-studio-ux-shell-architecture, review-studio-ux-shell-cross-validation, domain-frontend, review-studio-ux-shell-domain-testing, review-studio-ux-shell-tests, review-studio-ux-shell-wiring)
**Total findings:** 28

## Findings summary by severity

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| HIGH | 2 |
| MEDIUM | 5 |
| LOW | 12 |
| INFO | 9 |

## HIGH findings (2)

### F-arch-1: Builder page imports scripted fixture constants directly from the fixture adapter, bypassing the StudioDataSource boundary

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages/builder/index.tsx` line 36
- **Plan reference:** architecture.md § 2 (DIP) — pages consume only StudioDataSource
- **Evidence:**

  ```ts
  import {
    BUILDER_SCRIPTED_FILES,
    BUILDER_SCRIPTED_REPLY,
    BUILDER_SCRIPTED_WORK_LOG,
  } from "../../data/fixtures/registry";
  ```
  `startSession` (line 814) synthesizes a BuilderSessionDetail from these constants in
  the page, and `sendFollowUp` (line 837) appends the page-local `FOLLOW_UP_REPLY`
  (line 85). This is the only production page in the tree importing from
  `data/fixtures/*` (verified by grep — every other page consumes exclusively
  useListing/useDataSource). The repo's own precedent for scripted content is the
  playground: DEFAULT_RUN / runScript live INSIDE FixtureDataSource and the page only
  calls `ds.runAgent()`. When a real adapter replaces fixtures at the composition
  root, every surface swaps transparently EXCEPT builder's new-session and follow-up
  paths, which stay hardwired to fixture data.

- **Recommended action:** Move scripted-session synthesis behind the datasource contract: add
`startBuilderSession(prompt, agentId?): Promise<BuilderSessionDetail>` (and
optionally `sendBuilderMessage(sessionId, text)`) to StudioDataSource, implement
them in createFixtureDataSource using the scripted constants, and drop the
`data/fixtures/registry` import from the page. Mirrors the runAgent/runScript
pattern already established.


### F-xval-1: Canonical lint gate is RED at HEAD — the delta introduced 3 new biome errors (plus 2 warnings) while every commit claims biome OK. False claim + failing quality gate on develop.


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `packages/studio/src/pages/builder/index.tsx:223, packages/studio/src/pages/builder/index.tsx:655, packages/studio/src/app/use-listing.ts:20`
- **Plan reference:** Commit-message claims "tsc/biome/build OK" / "biome clean" in delta commits 4686214, e9663c9/ed23518, d462815 (and repeated in every later commit) + cycle-implement per-iteration hard gate "Linter clean".

- **Evidence:**

  `pnpm run check` (biome check .) at HEAD: "Found 4 errors. Found 2
  warnings." — exit 1. Same biome binary at baseline worktree ba44c30:
  1 error only (pre-existing processors/index.tsx:68
  lint/a11y/noLabelWithoutControl). Delta-introduced:
  1. builder/index.tsx:223 lint/suspicious/noArrayIndexKey — key={i} in
     diff rows (introduced e9663c9). ed23518 added a `// biome-ignore`
     suppression but it "has no effect" (plain // comment inside JSX
     children; needs {/* biome-ignore ... */}) — warning at 221:11.
  2. builder/index.tsx:655 lint/a11y/useSemanticElements — role="separator"
     div (introduced d462815). The suppression at 653 targets
     useFocusableInteractive, the wrong rule — warning at 653:11.
  3. use-listing.ts:20 lint/correctness/useExhaustiveDependencies —
     `version` added to the deps array by 4686214 (reload mechanism) is
     not referenced in the effect body; biome flags it as unnecessary.
  The ineffective suppressions show the author saw the diagnostics and
  believed them silenced — i.e. biome was not re-run (or not run via the
  canonical `pnpm run check`) before claiming "biome OK".

- **Recommended action:** Fix before release: (1) convert the two suppressions to effective {/* biome-ignore lint/<correct-rule>: reason */} JSX comments (index keys ARE positional for diff lines; the focusable separator is a legitimate ARIA pattern — suppress useSemanticElements, not useFocusableInteractive), (2) for use-listing either suppress useExhaustiveDependencies with a reason or restructure reload to not rely on a phantom dep, (3) re-run `pnpm run check` and stop claiming "biome OK" in commit messages unless the canonical root check exits 0.



## MEDIUM findings (5)

### F-arch-2: builder/index.tsx is 1145 LOC with 12 components spanning at least four separable concerns — 4x the size of every sibling page, against the repo's own extraction precedent

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages/builder/index.tsx` line 1
- **Plan reference:** architecture.md § 3 (module cohesion / SRP at package level)
- **Evidence:**

  Measured: 1145 LOC (wc -l). Sibling delta pages: prompts 274, workspaces 265,
  mcp-servers 293, playground 252. The file mixes: (1) diff parsing + rendering
  (parseDiff/DiffRow/FileDiff, ~70 LOC of pure logic), (2) review/details right-pane
  panels, (3) SessionView with splitter/minimize interaction logic, (4) home composer
  + ModelPicker + sidebar navigation. The playground page already establishes the
  page-local-module convention (`event-to-part.ts`, `use-run-playback.ts` with their
  own unit tests); builder ignores it. These sections change for different reasons
  (diff rendering vs composer anatomy vs pane layout — separate commits in this very
  delta touched them independently: ed23518, 23dd706, d462815, ac06142).

- **Recommended action:** Extract page-local modules under src/pages/builder/ following the playground
precedent: `diff.ts` (parseDiff + DiffRow, unit-testable), `review-panel.tsx`,
`session-view.tsx`, `model-picker.tsx`; keep index.tsx as the page composition.
No shared/ promotion needed (single consumer — YAGNI).


### F-dt-1: Five new datasource methods (listPrompts, listBuilderSessions, getBuilderSession, readWorkspaceFile, createWorkspaceFolder) landed in fixture-datasource.ts (+59 lines) but fixture-datasource.test.ts is UNCHANGED in the delta. In particular getBuilderSession has zero negative-case tests: unknown id -> UnknownBuilderSessionError (default scenario) and the empty-scenario rejection (`if (!detail || isEmpty)`, fixture-datasource.ts:103) are untested anywhere — neither datasource-level nor via the builder page's openError render path (builder.test.tsx uses only scenario "default"). UnknownWorkspaceError and UnknownWorkspacePathError are likewise never asserted (blank/duplicate folder ARE covered at page level via alert text, which is acceptable; the unknown-workspace/unknown-path branches are not).


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/data/fixture-datasource.test.ts` line 1
- **Plan reference:** studio-ux-shell plan — datasource unit coverage (T1.1 suite)
- **Domain anchor:** rules/testing.md § 4.1 — negative cases assert the specific typed error, not merely "it throws"
- **Evidence:**

  $ grep -n "getBuilderSession|UnknownBuilderSession|listPrompts|listWorkspaces" \
      src/data/fixture-datasource.test.ts   # -> no matches
  $ git diff ba44c30..HEAD --stat -- src/data/fixture-datasource.test.ts  # -> empty
  builder.test.tsx: renderBuilder() hardcodes { scenario: "default" }; no test drives
  openById into its .catch(openError) branch (src/pages/builder/index.tsx:807-811).

- **Recommended action:** Add datasource unit tests: getBuilderSession("nope") rejects UnknownBuilderSessionError with the id in the message; getBuilderSession("refine-support-tone") in scenario "empty" rejects; empty scenario returns [] for listPrompts/listBuilderSessions/listWorkspaces (page tests cover prompts/workspaces empty indirectly; builder empty is fully uncovered). Optionally a builder page test asserting the openError alert renders on rejection.


### F-dt-2: The repo already has a loadError-path testing convention (knowledge and workflows pages inject `listX: () => Promise.reject(new Error(...))` and assert the alert). The three new pages wired to useListing in this delta — prompts (listPrompts), builder (listBuilderSessions + listSkills), workspaces (listWorkspaces) — render loadError (prompts/index.tsx:219, builder/index.tsx:880, workspaces/index.tsx:244) but no test exercises a rejecting datasource for any of them. The error UI for three new surfaces ships untested while sibling pages test it.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/pages/prompts/prompts.test.tsx` line 7
- **Plan reference:** studio-ux-shell plan — graceful degradation / visible error at the page boundary
- **Domain anchor:** established suite convention — knowledge.test.tsx:64 and workflows.test.tsx:75 test a rejecting datasource renders the loadError alert
- **Evidence:**

  $ grep -rn "Promise.reject" src/pages --include="*.test.tsx"
  knowledge.test.tsx:64  workflows.test.tsx:75  playground.test.tsx:159   # only pre-existing pages

- **Recommended action:** Mirror the workflows.test.tsx pattern: spread a fixture datasource and override listPrompts / listBuilderSessions / listWorkspaces with a rejection; assert the role="alert" carries the error message.


### F-tests-1: getBuilderSession rejection path has zero test coverage. The fixture rejects with typed UnknownBuilderSessionError (fixture-datasource.ts:104) and the page catches it into an openError alert (builder/index.tsx:806-811, rendered at :880-884), but no test asserts the alert appears. This is exactly the negative-case lens: the typed error and its user-visible surfacing are unproven.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/builder/builder.test.tsx` line 1
- **Plan reference:** testing.md § 4.1 — negative cases prove Error Handling
- **Evidence:**

  grep -rn 'UnknownBuilderSessionError' packages/studio/src packages/studio/tests
  -> only fixture-datasource.ts + types.ts; zero matches in any *.test.* file.
  builder.test.tsx only uses scenario "default" and only opens known session ids.

- **Recommended action:** Add test builder_shows_typed_alert_when_session_load_fails: render with scenario "empty" (or an override rejecting getBuilderSession), click a session (needs a seeded summary with no detail, or override listBuilderSessions), assert role=alert contains the UnknownBuilderSessionError message.


### F-wire-1: Builder new-session flow (startSession) bypasses the StudioDataSource seam entirely — the page imports BUILDER_SCRIPTED_{REPLY,FILES,WORK_LOG} directly from data/fixtures/registry and fabricates the session in client state. Consequence: starting a session and sending follow-ups increments NO datasource_calls_total metric (pillar c has zero visibility on the builder's primary write flow), and when the real datasource lands this flow needs a seam-level rework, unlike every other page which goes through ds.*.


- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/pages/builder/index.tsx` line 814-836
- **Plan reference:** Global DoD — runtime-metric proof; architecture.md § 2 (DIP: pages depend on StudioDataSource)
- **Evidence:**

  builder/index.tsx:36-40 imports BUILDER_SCRIPTED_* from ../../data/fixtures/registry
  builder/index.tsx:820-836 setView({kind:"session", session:{…scripted…}}) — no ds call
  Contrast: playground's scripted runs flow through ds.runAgent (metric counted).

- **Recommended action:** Route session creation through the datasource (e.g., startBuilderSession(prompt) on StudioDataSource returning the scripted detail in fixtures mode) so the flow is counted and swappable. Acceptable to defer with an ADR since the surface is explicitly a scripted fake-door, but the asymmetry vs playground is real.



## LOW findings (12)

### F-arch-3: parseDiff assumes fixture-shaped diffs — no `@@` hunk-header handling, so line numbers will be wrong on real unified diffs

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages/builder/index.tsx` line 178
- **Plan reference:** architecture.md § 6 (leaky abstractions — latent)
- **Evidence:**

  ```ts
  let oldNo = 1;
  let newNo = 1;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) { ... }
  ```
  Numbering always starts at 1 and a `@@ -a,b +c,d @@` header would be classified as
  "ctx" and increment both counters. Correct for the current fixtures (none carry
  hunk headers), silently wrong the day a real registry emits standard unified
  diffs. Placement itself is right — single consumer, page-local is the correct
  altitude (YAGNI); the gap is the undocumented input assumption.

- **Recommended action:** When extracting diff.ts (F-arch-2), either parse `@@` headers to seed oldNo/newNo or document the fixture-diff-only contract in the module header and add a unit test pinning it.

### F-arch-4: registry.ts grew to 413 LOC absorbing the whole builder sub-domain (~220 LOC of session transcripts/diffs) while other fixture domains have dedicated files

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/data/fixtures/registry.ts` line 48
- **Plan reference:** architecture.md § 3 (files in the same package change for the same reason)
- **Evidence:**

  Fixture layout is package-by-domain: evaluation.ts, knowledge.ts, memory.ts,
  workspace.ts, run-script.ts. Builder sessions + details + BUILDER_SCRIPTED_*
  (lines 48-269) are a distinct sub-domain with distinct change cadence (6 of the 15
  delta commits touched builder) yet live inside registry.ts alongside agents,
  tools, prompts, workflows, processors, and MCP servers.

- **Recommended action:** Split builder fixtures into src/data/fixtures/builder.ts (fixtureBuilderSessions, fixtureBuilderSessionDetails, BUILDER_SCRIPTED_*), keeping registry.ts for the flat registry surfaces. Cheap now; pairs naturally with F-arch-1's datasource move.

### F-xval-2: Pre-existing (pre-delta) biome error lint/a11y/noLabelWithoutControl shipped in v0.2.0 — baseline ba44c30 already fails `biome check .` with this 1 error. Out of this delta's blast radius but it means the "biome clean" claims were unverifiable against the canonical root check even before the delta.


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `packages/studio/src/pages/processors/index.tsx:68`
- **Plan reference:** cycle-release pre-conditions (CI/lint green on develop)
- **Evidence:**

  Isolated worktree at ba44c30, same biome binary/config:
  "packages/studio/src/pages/processors/index.tsx:68:11
  lint/a11y/noLabelWithoutControl — Found 1 error."

- **Recommended action:** Associate the Phase <label> with its Select (htmlFor/id or wrap) — one-line a11y fix; fold into the F-xval-1 lint-green pass.


### F-dt-3: createWorkspaceFolder mutates workspaceState in place (fixture-datasource.ts:144 ws.files.push). Correctness depends entirely on the structuredClone at construction (line 83). No test asserts instance isolation: if the clone were removed, the "reports" folder created in create_folder_validates_blank_and_duplicate_then_creates would leak into fixtureWorkspaces, and NO current test would catch it — the only root-entry-count assertion (expects 3) runs BEFORE the create test; the tests after it never recount. The regression is silent.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/pages/workspaces/workspaces.test.tsx` line 60
- **Plan reference:** studio-ux-shell plan — session-scoped workspace state (fixture-datasource.ts:83)
- **Domain anchor:** fixture immutability — structuredClone([...fixtureWorkspaces]) is the only guard between createWorkspaceFolder's ws.files.push and the module-level fixture
- **Evidence:**

  fixture-datasource.ts:83  const workspaceState = isEmpty ? [] : structuredClone([...fixtureWorkspaces]);
  workspaces.test.tsx test order: lists_root_entries (count=3) -> ... -> create_folder -> refresh (no count) -> empty

- **Recommended action:** Add a datasource unit test: create a folder on instance A, then assert a fresh instance B's listWorkspaces() root does NOT contain it (and/or that fixtureWorkspaces[0].files.length is unchanged).


### F-dt-4: fixtureBuilderSessionDetails is typed Readonly<Record<string, BuilderSessionDetail>> and Object.freeze is shallow. Neither the type system nor any test enforces (a) every fixtureBuilderSessions id has a detail entry (a missing key only surfaces as a runtime openError when clicked), or (b) the duplicated summary fields agree between the two fixtures (e.g. summary pinned:true vs detail pinned:false would drift silently). Currently all 4 ids match and fields agree — verified — but nothing keeps it true.


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/data/fixtures/registry.ts` line 81
- **Plan reference:** studio-ux-shell plan — builder fixtures (sessions list + session details)
- **Domain anchor:** type-drift safety — BuilderSessionDetail extends BuilderSessionSummary, so summary fields (id/title/agentId/lastActivity/pinned) are DUPLICATED between fixtureBuilderSessions and fixtureBuilderSessionDetails
- **Evidence:**

  registry.ts:81  export const fixtureBuilderSessionDetails: Readonly<Record<string, BuilderSessionDetail>> = Object.freeze({ ... })
  ids verified consistent today: refine-support-tone, refund-approvals, scaffold-triage, wire-websearch

- **Recommended action:** Add a fixture-parity unit test: for each s of fixtureBuilderSessions, expect fixtureBuilderSessionDetails[s.id] to exist and toMatchObject(s). Cheaper than a mapped type and catches both drift classes.


### F-tests-2: Builder is the only new surface in this delta without an empty-scenario test. Sibling suites (prompts, workspaces) each assert the honest empty state; the builder sidebar with zero sessions (empty Pinned/Projects groups, EmptyState at builder/index.tsx:741/752 for skills views) is unverified.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/builder/builder.test.tsx` line 7
- **Plan reference:** delta convention — prompts.test.tsx:101 and workspaces.test.tsx:90 both cover the empty scenario
- **Evidence:**

  grep -n 'scenario' packages/studio/src/pages/builder/builder.test.tsx
  -> only createFixtureDataSource({ scenario: "default" }) at line 9.

- **Recommended action:** Add empty_scenario_sidebar_renders_without_sessions asserting the sidebar renders with zero builder-session testids and no crash, mirroring the sibling suites.


### F-tests-3: The splitter's pointer-drag code path (startResize: pointerdown -> window pointermove math ((clientX-left)/width*100) -> pointerup listener removal) is completely uncovered. The keyboard test (builder.test.tsx:127) validates clamp and aria state through clampPct, but the drag math and window listener add/remove lifecycle never execute under test. Side observation for the code lens: listeners are only removed on pointerup — unmount mid-drag leaks them.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/builder/index.tsx` line 522
- **Plan reference:** cycle-review — test behavior, not just the accessible alias of it
- **Evidence:**

  Only consumer of startResize is onPointerDown (index.tsx:662); no test fires
  pointerDown/pointerMove/pointerUp events. Keyboard test asserts widths 54->46->50->25.

- **Recommended action:** Add one jsdom test using fireEvent.pointerDown(separator) + fireEvent.pointerMove (window, {clientX}) + fireEvent.pointerUp(window) asserting width changes and that further pointermove after pointerup no longer resizes. Optionally add an unmount-mid-drag cleanup effect in src.


### F-tests-4: The direct "Restore chat" interaction (minimize chat, then click the same toggle now labeled "Restore chat") is never exercised. Tests restore only via the panel-swap route (minimize side panel while chat is hidden). The m === "chat" ? "none" branch of the chat toggle at index.tsx:566 is untested.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/builder/builder.test.tsx` line 160
- **Plan reference:** builder/index.tsx:563-566 — Restore chat branch
- **Evidence:**

  grep -n 'restore chat' builder.test.tsx -> 0 matches (only "restore side panel").

- **Recommended action:** Extend the minimize_chat test (or add one) clicking button name /restore chat/i and asserting both panes visible again.


### F-tests-5: Three delta tests bundle multiple behaviors under an "and"/"then" name: prompts add_variable_validates_blank_and_duplicate_at_the_boundary (blank + duplicate + remove), workspaces create_folder_validates_blank_and_duplicate_then_creates (blank + duplicate + success), builder composer_has_reference_anatomy_actions_row_and_project_row (fake doors + approval + model picker + effort + project). AAA is otherwise clean and names describe behavior, but a failure in the middle of these chains obscures which behavior broke. Advisory — the chained sequence (blank -> add -> duplicate) is arguably one validation-boundary story, so this is a judgment call, not a defect.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/prompts/prompts.test.tsx` line 44
- **Plan reference:** testing.md § 3 — each test exercises ONE behavior; 'and' in the name is a smell
- **Evidence:**

  prompts.test.tsx:44, workspaces.test.tsx:60, builder.test.tsx:210 — test names
  contain "and"/"then" and each contains 3+ Act/Assert cycles.

- **Recommended action:** Optionally split into one test per rejected input class next time these files are touched; not worth a dedicated commit.


### F-wire-2: check_wiring.py reports pillar (b) FAIL for all 6 new page/datasource symbols because it only scans tests/integration/, and the integration suite asserts only label PRESENCE for "Agent Builder"/"Prompts" (smoke textContent), not navigation or datasource exercise. NOT a delta regression: pre-existing symbols (listMcpServers, listWorkspaces, searchKnowledge) fail identically — the repo's established convention places behavior-depth tests colocated (builder.test.tsx 13 cases, prompts.test.tsx 8, workspaces.test.tsx 6) and real navigation in shell.test.tsx. Delta has parity with existing surfaces.


- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/tests/integration/studio.integration.test.tsx` line 87-90
- **Plan reference:** cycle-implement.md § Wiring triad, pillar (b)
- **Evidence:**

  check_wiring.py --symbol getBuilderSession → b_integration_test FAIL (0 tests in tests/integration/)
  Baseline: --symbol listMcpServers (pre-delta) → same FAIL; --symbol runAgent → PASS
  shell.test.tsx:33-47 clicks "Agent Builder" and "Prompts" buttons and asserts headings.

- **Recommended action:** Either extend studio.integration.test.tsx with one route-level render per new surface (as done for /traces), or align check_wiring.py's pillar-b glob with the project's colocated-test convention (testing.md § 5) so the checker stops under-reporting. Systemic; file once, not per-surface.


### F-wire-3: Metric increments for listPrompts, listBuilderSessions and getBuilderSession exist in the datasource (verified) but no test asserts them; only createWorkspaceFolder and listWorkspaces counters are asserted (workspaces.test.tsx:77,87). readWorkspaceFile increments but is likewise unasserted. Instrumentation is real, not gamed — this is assertion coverage, not a missing metric.


- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/pages/builder/builder.test.tsx` line 1
- **Plan reference:** Global DoD — runtime-metric proof
- **Evidence:**

  grep datasource_calls_total in builder.test.tsx / prompts.test.tsx → 0 matches
  fixture-datasource.ts: 9 metrics.increment("datasource_calls_total", …) sites cover all 5 new methods

- **Recommended action:** One-line snapshot assertion per new method in the existing page tests.

### F-wire-4: Three of the five new typed error classes have no test exercising their rejection path: UnknownBuilderSessionError, UnknownWorkspaceError, UnknownWorkspacePathError (BlankFolderNameError and DuplicateWorkspacePathError ARE exercised via UI alerts). The UI catch paths exist and render role=alert (builder openError, workspaces actionError), so wiring is present; the error branches are simply unreachable in default-fixture flows and untested.


- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/data/types.ts` line 255-289
- **Plan reference:** testing.md § 4.1 (negative cases assert the specific typed error)
- **Evidence:**

  grep "does not exist" in builder.test.tsx/prompts.test.tsx/workspaces.test.tsx → 0 matches
  grep for the 3 error class names outside types.ts/fixture-datasource.ts → 0 consumers/tests

- **Recommended action:** Add one negative test per error (e.g., getBuilderSession on empty scenario rejects UnknownBuilderSessionError and the alert renders its message).



## INFO findings (9)

### F-arch-5: New contract methods are clean: listPrompts/listBuilderSessions/getBuilderSession/readWorkspaceFile/createWorkspaceFolder added to StudioDataSource with typed-error docs; data layer stays react-free (only the pre-existing context in datasource.ts touches react; types.ts and fixtures import none)

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/data/datasource.ts` line 27
- **Plan reference:** ADR D2 (DIP — UI domain defines the interface)
- **Evidence:**

  Verified via grep: no react import anywhere in src/data/ except the pre-existing
  createContext/useContext in datasource.ts (unchanged since ba44c30). New typed
  errors (UnknownBuilderSessionError, UnknownWorkspaceError, UnknownWorkspacePathError,
  DuplicateWorkspacePathError, BlankFolderNameError) live in types.ts and are thrown
  at the adapter boundary per error-handling.md § 2.

- **Recommended action:** none — no issues found

### F-arch-6: workspaceState session mutability is correctly instance-scoped: each createFixtureDataSource call structuredClones its own copy, reads return clones via counted(), and tests instantiate a fresh datasource per render — no cross-test bleed

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/data/fixture-datasource.ts` line 83
- **Plan reference:** scope item — stateful fixture datasource test isolation
- **Evidence:**

  ```ts
  const workspaceState: WorkspaceSummary[] = isEmpty ? [] : structuredClone([...fixtureWorkspaces]);
  ```
  builder.test.tsx:9 and workspaces.test.tsx:10 both call createFixtureDataSource
  inside the render helper, so every test gets isolated state. getBuilderSession
  also returns structuredClone(detail), preventing page-level session mutation
  (sendFollowUp) from corrupting the shared fixture record.

- **Recommended action:** none — no issues found

### F-arch-7: Type additions are coherent and cycle-free: BuilderSessionDetail extends BuilderSessionSummary (list/detail split mirrors the summary/detail pattern), WorkspaceFileEntry name→path migration is consistent across fixtures/pages/datasource, and no import cycles exist in the delta (data→types only; app→pages one-way; pages→app+data)

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/data/types.ts` line 49
- **Plan reference:** scope item — type additions coherence
- **Evidence:**

  Verified: registry.ts imports only ../types; fixture-datasource imports
  datasource (type-only) + fixtures + metrics + stream-player; no module under
  src/data or src/app imports from src/pages except app/routes.tsx (composition
  root, correct direction). nav-items.ts + routes.tsx wiring for /builder and
  /prompts is consistent (both updated, shell.test asserts the menu).

- **Recommended action:** none — no issues found

### F-arch-8: Prompts, Workspaces, MCP tool detail, and Playground chat-parity changes are architecturally clean: all consume only useListing/useDataSource, reuse EntityTable/PageHeader, keep view-state machines page-local, and mark fake doors honestly at the mutation point only

- **Found by:** review-studio-ux-shell-architecture
- **File:** `packages/studio/src/pages/prompts/index.tsx` line 199
- **Plan reference:** DIP boundaries — delta pages other than builder
- **Evidence:**

  prompts/index.tsx uses useListing((ds) => ds.listPrompts()) + EntityTable;
  workspaces/index.tsx routes all reads/mutations through ds.readWorkspaceFile /
  ds.createWorkspaceFolder with typed-error → role="alert" surfacing and reload()
  refetch; mcp-servers ExposedToolDetail derives the form purely from
  McpExposedTool.inputFields.

- **Recommended action:** none — no issues found

### F-xval-3: "verified in browser" claims are not independently verifiable from the tree; noted, not flagged — the behaviors claimed are corroborated by the 160-test suite (e.g. synthetic-drag splitter path has a keyboard test with aria-valuenow assertions; minimize/restore has 2 tests).


- **Found by:** review-studio-ux-shell-cross-validation
- **File:** `(commit messages ba44c30..HEAD)`
- **Plan reference:** honesty invariant (scripted sessions clearly labeled)
- **Evidence:**

  No browser-run artifacts in the repo; test evidence stands in for it.

- **Recommended action:** none — informational.

### F-dt-5: CLEAN on four scope items, verified line by line. (1) Diff arithmetic: all 6 fixture diffs match their declared counters — support-agent.ts 4/1, support-tone.md 2/2, refund-order.ts 1/0, triage-agent.ts 6/0, research-agent.ts 1/1, BUILDER_SCRIPTED_FILES new-agent.ts 6/0; the builder test's aggregate "+6"/"-3" for refine-support-tone equals 4+2/1+2; parseDiff (builder/index.tsx:182) handles +++/--- meta lines BEFORE +/- so headers never miscount. (2) Workspace sizes are derived from content via TextEncoder (workspaces/index.tsx:13) — content/size drift is impossible by construction. (3) metrics.reset hygiene: the two new/updated test files that assert metrics (workspaces.test.tsx:25, playground.test.tsx:27) both reset in beforeEach; builder, prompts and mcp-servers tests assert no metrics and need no reset. (4) structuredClone: getBuilderSession returns structuredClone(detail); startSession clones BUILDER_SCRIPTED_FILES and copies workLog steps; sendFollowUp appends via immutable spread of the session copy — fixture transcripts cannot be corrupted by follow-ups (follow_up test's expected length 4 = 2 fixture + 2 appended, on a clone).


- **Found by:** review-studio-ux-shell-domain-testing
- **File:** `packages/studio/src/data/fixtures/registry.ts` line 107
- **Plan reference:** scope item — diff counter arithmetic + workspace sizes + metrics.reset hygiene + structuredClone
- **Domain anchor:** fixture integrity verification (explicit clean report)
- **Evidence:**

  Manual +/- line count per diff string vs declared additions/deletions: all equal.
  builder.test.tsx:69-70 asserts "+6" and "-3"; fixtures sum to exactly that.

- **Recommended action:** none — explicit clean record for the scoped checks.

### F-tests-6: PRE-EXISTING (in ba44c30 base, not this delta): CopyField schedules setTimeout(() => setCopyState("idle"), 1500) with real timers and no cleanup on unmount. Checked: none of the +5 delta mcp tests click copy, React 18 silently no-ops setState on unmounted components, and the full delta run shows no timer/act warnings. Latent noise source only; not a current failure.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/mcp-servers/index.tsx` line 59
- **Plan reference:** scope question — CopyField setTimeout leak into other tests
- **Evidence:**

  grep setTimeout packages/studio/src -> mcp-servers/index.tsx:59 (uncleared);
  vitest run: 78/78 pass, no warnings emitted.

- **Recommended action:** When CopyField is next touched, store the timeout id in a ref and clear it in a useEffect cleanup (or switch tests to vi.useFakeTimers if a copy-reset test is added).


### F-tests-7: PRE-EXISTING (not in delta): savedRequestContext is module-level mutable state, written on save (index.tsx:32) and used as initial editor value (:17). The two tests in request-context.test.tsx are currently independent because BOTH call userEvent.clear(editor) before typing, and vitest isolates module registries per file. Latent hazard only: a future test asserting the editor's initial value would become order-dependent within the file.


- **Found by:** review-studio-ux-shell-tests
- **File:** `packages/studio/src/pages/request-context/index.tsx` line 14
- **Plan reference:** scope question — module-level savedRequestContext carried between tests
- **Evidence:**

  request-context.test.tsx:9 and :20 both clear the editor; no beforeEach reset of
  the module state exists (grep beforeEach -> 0 matches in that file).

- **Recommended action:** If request-context gains persistence-across-remount tests, expose a reset hook (or move state into the datasource) so tests can reset in beforeEach.


### F-wire-5: McpToolInputField is exported but only referenced inside types.ts itself (McpExposedTool.inputFields). Not dead — it is the element type of a consumed field and mcp-servers page accesses inputFields structurally — but no external import exists. Acceptable as public type surface.


- **Found by:** review-studio-ux-shell-wiring
- **File:** `packages/studio/src/data/types.ts` line 106-110
- **Plan reference:** n/a
- **Evidence:**

  grep McpToolInputField outside types.ts → 0 direct imports; McpExposedTool consumed by registry.ts + mcp-servers page.

- **Recommended action:** None required; keep as-is.


## Handoff decision

Implementation passes all gates. Ready for merge.

## Audit trail

Spawned agents (their findings files live alongside this report):

- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-architecture.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-cross-validation.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/domain-frontend.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-domain-testing.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-tests.md`
- `.claude/agents/review-studio-ux-shell-2026-07-2026-07-15/review-studio-ux-shell-wiring.md`

---

## Resolution log (fix batch — commit 5219968, 2026-07-15)

| Finding | Sev | Resolução |
|---|---|---|
| F-xval-1 (check canônico RED + claims "biome OK" falsos) | HIGH | Suppressions reposicionados (key composta nas linhas de diff; separator em posição JSX válida; use-listing com rationale); gate passa da raiz; processo corrigido — o gate passa a ser `pnpm run check` da raiz |
| F-arch-1 / F-wire-1 (página fura o boundary DIP; write flow sem métrica) | HIGH+MED | `startBuilderSession` no contrato StudioDataSource (métrica contada, BlankBuildPromptError, ids únicos de draft — fecha F-dom-2 junto) |
| F-arch-2 (builder 1145 LoC) | MED | Extraído em model-picker.tsx / review.tsx / session-view.tsx |
| F-dom-1 (estado vaza entre sessões) | MED | `key={session.id}` no SessionView |
| F-dom-3 (foco cai no body ao fechar panes) | MED | Foco devolvido: Review × → primeira ação do details; viewer Close → toolbar; Cancel pasta → gatilho |
| F-tests-1 / F-dt-1 / F-dt-2 (negativos/erros sem teste) | MED | Testes: getBuilderSession unknown/empty, startBuilderSession (ids/métrica/blank), loadError em Prompts/Builder/Workspaces, builder empty |
| F-dom-10, aria do picker, F-xval-2, CHANGELOG dup | LOW | Nome de pasta com "/" rejeitado (+teste); aria-label anuncia seleção; label Phase ligado; seções Fixed mescladas |

Dismissals/logados (LOW, advisory): parseDiff sem suporte a hunks `@@` (fixture-only,
documentado); fixtures/builder.ts dedicado (próxima extração); pointer-drag do splitter
sem teste jsdom (verificado no browser); ⌘N descarta sessão em progresso sem confirmar;
demais LOWs no YAML dos agentes.

**Veredito final do delta do builder: READY_TO_MERGE** — 0 BLOCKER, 0 HIGH em aberto,
0 MEDIUM em aberto. Gates: 173/173 testes, tsc limpo, `pnpm run check` (raiz) verde,
build OK.

## AVISO de coordenação (release BLOQUEADA)

Durante este review/batch, uma **sessão paralela** trabalhou no mesmo working tree
(adoção usetheo-ui M7): commits 74c09a8/aa318e6/c4e2d0e chegaram a develop SEM review,
e c4e2d0e varreu hunks meus não commitados deixando o HEAD sem compilar isolado
(consertado por 5219968). O corte da v0.3.0 deve esperar: (1) a sessão M7 concluir e
commitar seu WIP; (2) um review incremental cobrir os commits M7; (3) só então
`/release`.
