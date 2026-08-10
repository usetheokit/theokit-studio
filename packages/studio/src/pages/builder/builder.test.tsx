import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { AgentBuilderPage } from "./index";

function renderBuilder() {
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
      <AgentBuilderPage />
    </DataSourceProvider>,
  );
}

function renderBuilderWith(overrides: Record<string, unknown>) {
  const ds = { ...createFixtureDataSource({ scenario: "default" }), ...overrides };
  render(
    <DataSourceProvider value={ds as never}>
      <AgentBuilderPage />
    </DataSourceProvider>,
  );
}

async function submitPrompt(text: string) {
  await screen.findByText("What should we build?");
  await userEvent.type(screen.getByRole("textbox", { name: /build instructions/i }), text);
  await userEvent.click(screen.getByRole("button", { name: /start build session/i }));
}

async function openPinnedSession() {
  const sessions = await screen.findAllByTestId("builder-session");
  const refine = sessions.find((s) => s.textContent?.includes("Refine Support Agent tone"));
  if (!refine) throw new Error("session not found");
  await userEvent.click(refine);
  await screen.findByTestId("builder-session-view");
}

describe("Agent Builder (code-assistant, three-pane)", () => {
  it("sidebar_has_app_structure_new_session_search_nav_sections", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    // Structural order: New session, Search, navigation, Pinned/Projects/Tasks.
    expect(screen.getByRole("button", { name: /new session/i })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: /search sessions/i })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: /builder views/i });
    expect(within(nav).getByRole("button", { name: "Skills" })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Scheduled" })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Templates" })).toBeTruthy();
    expect(screen.getByText("Pinned")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("Tasks")).toBeTruthy();
  });

  it("nav_entries_navigate_to_their_views", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    // Skills: the REAL list via listSkills (closes the consumer that was missing).
    await userEvent.click(screen.getByRole("button", { name: "Skills" }));
    const skills = await screen.findAllByTestId("builder-skill");
    expect(skills.length).toBe(2);
    expect(skills[0]?.textContent).toContain("summarize");
    // Scheduled and Templates: honest empty states.
    await userEvent.click(screen.getByRole("button", { name: "Scheduled" }));
    expect(await screen.findByTestId("builder-scheduled-view")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Templates" }));
    expect(await screen.findByTestId("builder-templates-view")).toBeTruthy();
    // New session volta para a home.
    await userEvent.click(screen.getByRole("button", { name: /new session/i }));
    expect(await screen.findByText("What should we build?")).toBeTruthy();
  });

  // M8 T4.1: the original test summed four behaviours ("worklog and edited files and review
  // panel"). Precedent from genkit: when one behaviour has two conditions, they become two
  // tests whose names differ in the condition — not one test with two assertion blocks.
  // A multi-behaviour test fails without saying which behaviour broke.
  it("session_work_log_expands_on_click", async () => {
    renderBuilder();
    await openPinnedSession();
    const workToggle = screen.getByRole("button", { name: /worked for 2m 30s/i });
    expect(workToggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(workToggle);
    const log = screen.getByTestId("builder-worklog");
    expect(log.textContent).toContain("Rewrote the instructions");
  });

  it("session_edited_files_card_shows_both_counter_levels", async () => {
    renderBuilder();
    await openPinnedSession();
    const card = screen.getByTestId("builder-edited-files");
    expect(card.textContent).toContain("Edited 2 files");
    expect(card.textContent).toContain("+6");
    expect(card.textContent).toContain("-3");
    expect(card.textContent).toContain("prompts/support-tone.md");
  });

  // Undo is an honest fake door — disabled, not silently inert.
  it("session_undo_is_disabled", async () => {
    renderBuilder();
    await openPinnedSession();
    const card = screen.getByTestId("builder-edited-files");
    const undo = within(card).getByRole("button", { name: /undo/i }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
  });

  it("session_opens_with_details_panel_by_default", async () => {
    renderBuilder();
    await openPinnedSession();
    const details = screen.getByTestId("builder-details");
    expect(details.textContent).toContain("Branch details");
    expect(details.textContent).toContain("Pull request status unavailable");
    expect(screen.getAllByTestId("builder-artifact-item").length).toBe(2);
  });

  it("review_button_opens_the_diff_panel", async () => {
    renderBuilder();
    await openPinnedSession();
    const card = screen.getByTestId("builder-edited-files");
    await userEvent.click(within(card).getByRole("button", { name: /^review$/i }));
    const review = await screen.findByTestId("builder-review");
    expect(review.textContent).toContain("Unstaged");
    const commit = within(review).getByRole("button", { name: /commit/i }) as HTMLButtonElement;
    expect(commit.disabled).toBe(true);
    expect(screen.getAllByTestId("review-file-diff").length).toBe(2);
    expect(screen.getAllByTestId("diff-line-add").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("diff-line-del").length).toBeGreaterThan(0);
  });

  it("review_file_tree_filters_the_diffs", async () => {
    renderBuilder();
    await openPinnedSession();
    // Opens the Review from "Changes" in the details panel.
    await userEvent.click(screen.getByRole("button", { name: /changes/i }));
    const review = await screen.findByTestId("builder-review");
    // <CodeReviewPanel>'s file tree: buttons whose title is the full path (the lib exposes no
    // per-item testid — selector adjusted, behaviour identical to the previous manual panel).
    const treeFiles = within(review)
      .getAllByRole("button")
      .filter((b) => b.getAttribute("title")?.includes("/"));
    expect(treeFiles.length).toBe(2);
    const tone = treeFiles.find((f) => f.getAttribute("title")?.includes("support-tone.md"));
    if (!tone) throw new Error("tree file not found");
    await userEvent.click(tone);
    const diffs = screen.getAllByTestId("review-file-diff");
    expect(diffs.length).toBe(1);
    expect(diffs[0]?.getAttribute("data-path")).toBe("prompts/support-tone.md");
    // "All files" restores both diffs.
    await userEvent.click(screen.getByRole("button", { name: /all files/i }));
    expect(screen.getAllByTestId("review-file-diff").length).toBe(2);
  });

  it("artifact_click_opens_review_filtered_and_close_returns_to_details", async () => {
    renderBuilder();
    await openPinnedSession();
    const artifacts = screen.getAllByTestId("builder-artifact-item");
    const tone = artifacts.find((a) => a.textContent?.includes("support-tone.md"));
    if (!tone) throw new Error("artifact not found");
    await userEvent.click(tone);
    // The Review opens already filtered on the clicked artifact.
    await screen.findByTestId("builder-review");
    const diffs = screen.getAllByTestId("review-file-diff");
    expect(diffs.length).toBe(1);
    expect(diffs[0]?.getAttribute("data-path")).toBe("prompts/support-tone.md");
    // Closing the Review returns to the details panel.
    await userEvent.click(screen.getByRole("button", { name: /close review/i }));
    expect(await screen.findByTestId("builder-details")).toBeTruthy();
  });

  // M8 T4.1 (finding #80): the assertions were literal widths ("54%", "46%", "50%"), which
  // coupled the test to the keyboard step and the initial width — changing the step from 4 to 5
  // broke an accessibility test without anything accessible having broken. It now asserts
  // DIRECTION (left shrinks, right grows) and LIMIT (the lower clamp), which is the contract.
  const widthOf = (el: HTMLElement) => Number.parseFloat(el.style.width);

  it("arrow_keys_resize_the_chat_pane_in_the_pressed_direction", async () => {
    renderBuilder();
    await openPinnedSession();
    const separator = screen.getByRole("separator", { name: /resize chat/i });
    const chatPane = screen.getByTestId("builder-chat-pane") as HTMLElement;
    const initial = widthOf(chatPane);
    // Review F-tests-4: the rewrite lost this assertion. The initial ratio is a product decision,
    // separate from the keyboard STEP — decoupling from the step did not require dropping the default.
    expect(initial).toBe(54);
    expect(separator.getAttribute("aria-valuenow")).toBe("54");
    separator.focus();

    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    const afterShrink = widthOf(chatPane);
    expect(afterShrink).toBeLessThan(initial);

    await userEvent.keyboard("{ArrowRight}");
    expect(widthOf(chatPane)).toBeGreaterThan(afterShrink);
  });

  // Review F-tests-5: `clampPct` has TWO limits and only the lower one had a test. A mutant
  // `Math.min(75, …)` -> `Math.min(100, …)` survived.
  it("chat_pane_width_clamps_at_the_upper_bound", async () => {
    renderBuilder();
    await openPinnedSession();
    const separator = screen.getByRole("separator", { name: /resize chat/i });
    const chatPane = screen.getByTestId("builder-chat-pane") as HTMLElement;
    separator.focus();
    for (let i = 0; i < 30; i++) {
      await userEvent.keyboard("{ArrowRight}");
    }
    expect(widthOf(chatPane)).toBe(75);
    expect(separator.getAttribute("aria-valuenow")).toBe("75");
  });

  it("chat_pane_width_clamps_at_the_lower_bound", async () => {
    renderBuilder();
    await openPinnedSession();
    const separator = screen.getByRole("separator", { name: /resize chat/i });
    const chatPane = screen.getByTestId("builder-chat-pane") as HTMLElement;
    separator.focus();
    for (let i = 0; i < 30; i++) {
      await userEvent.keyboard("{ArrowLeft}");
    }
    expect(widthOf(chatPane)).toBe(25);
    expect(separator.getAttribute("aria-valuenow")).toBe("25");
  });

  it("minimize_panel_gives_chat_full_width_and_restore_brings_it_back", async () => {
    renderBuilder();
    await openPinnedSession();
    expect(screen.getByTestId("builder-details")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /minimize side panel/i }));
    // The panel disappears, the chat takes 100%, the splitter disappears.
    expect(screen.queryByTestId("builder-details")).toBeNull();
    expect((screen.getByTestId("builder-chat-pane") as HTMLElement).style.width).toBe("100%");
    expect(screen.queryByRole("separator", { name: /resize chat/i })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /restore side panel/i }));
    expect(screen.getByTestId("builder-details")).toBeTruthy();
    expect(screen.getByRole("separator", { name: /resize chat/i })).toBeTruthy();
  });

  it("minimize_chat_leaves_panel_fullscreen_and_only_one_side_hides", async () => {
    renderBuilder();
    await openPinnedSession();
    await userEvent.click(screen.getByRole("button", { name: /minimize chat/i }));
    expect(screen.queryByTestId("builder-chat-pane")).toBeNull();
    expect(screen.getByTestId("builder-details")).toBeTruthy();
    // Minimising the panel while the chat is hidden swaps the minimised side — never a blank screen.
    await userEvent.click(screen.getByRole("button", { name: /minimize side panel/i }));
    expect(screen.getByTestId("builder-chat-pane")).toBeTruthy();
    expect(screen.queryByTestId("builder-details")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /restore side panel/i }));
    expect(screen.getByTestId("builder-details")).toBeTruthy();
    expect(screen.getByTestId("builder-chat-pane")).toBeTruthy();
  });

  it("home_submit_starts_scripted_session_with_scaffold_files", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.type(
      screen.getByRole("textbox", { name: /build instructions/i }),
      "Create a billing reconciliation agent",
    );
    await userEvent.click(screen.getByRole("button", { name: /start build session/i }));
    expect(await screen.findByTestId("builder-session-view")).toBeTruthy();
    expect(screen.getByTestId("builder-edited-files").textContent).toContain("agents/new-agent.ts");
    expect(screen.getByRole("button", { name: /worked for 45s/i })).toBeTruthy();
  });

  it("follow_up_message_appends_to_the_transcript", async () => {
    renderBuilder();
    await openPinnedSession();
    await userEvent.type(
      screen.getByRole("textbox", { name: /session message/i }),
      "Also mention the docs link.",
    );
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    const messages = screen.getAllByTestId("builder-message");
    expect(messages.length).toBe(4);
    expect(messages[3]?.textContent).toContain("Applied");
  });

  it("search_filters_sidebar_sessions", async () => {
    renderBuilder();
    await screen.findAllByTestId("builder-session");
    await userEvent.type(screen.getByRole("searchbox", { name: /search sessions/i }), "triage");
    const filtered = screen.getAllByTestId("builder-session");
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.textContent).toContain("triage");
  });

  // M8 T4.1: the original test summed four independent behaviours of the composer.
  it("composer_fake_door_actions_are_disabled", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    const attach = screen.getByRole("button", { name: /add attachment/i }) as HTMLButtonElement;
    expect(attach.disabled).toBe(true);
    const mic = screen.getByRole("button", { name: /voice input/i }) as HTMLButtonElement;
    expect(mic.disabled).toBe(true);
  });

  // Approval mode is REAL local config (<ApprovalModeSelector> from @theokit/ui: dropdown-menu,
  // not a combobox — selector adjusted, behaviour identical).
  it("composer_approval_mode_selection_persists_in_the_control", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("button", { name: /approval mode/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Auto-approve edits" }));
    const control = screen.getByRole("button", { name: /approval mode/i });
    expect(control.textContent).toContain("Auto-approve edits");
  });

  it("composer_model_picker_shows_name_with_effort", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    const picker = screen.getByRole("button", { name: /model picker/i });
    expect(picker.textContent).toContain("Fable 5");
    expect(picker.textContent).toContain("Medium");
  });

  // Review F-tests-9: model and effort are two menus and two independent states
  // (setModel/setEffort). This name was mine and still carried "_and_".
  it("composer_model_picker_applies_the_selected_model", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("button", { name: /model picker/i }));
    const sonnet = await screen.findByRole("menuitemradio", { name: /sonnet 4\.6/i });
    expect(sonnet.textContent).toContain("Fast and balanced");
    expect(sonnet.textContent).toContain("claude-sonnet-4-6");
    await userEvent.click(sonnet);
    expect(screen.getByRole("button", { name: /model picker/i }).textContent).toContain(
      "Sonnet 4.6",
    );
  });

  it("composer_effort_selection_applies_to_the_picker", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("button", { name: /model picker/i }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "High" }));
    expect(screen.getByRole("button", { name: /model picker/i }).textContent).toContain("High");
  });

  it("project_row_lists_the_new_project_option", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("combobox", { name: /^project$/i }));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toContain("New project");
  });

  it("datasource_rejection_surfaces_as_visible_alert", async () => {
    const broken = {
      ...createFixtureDataSource({ scenario: "default" }),
      listBuilderSessions: () => Promise.reject(new Error("builder backend down")),
    };
    render(
      <DataSourceProvider value={broken}>
        <AgentBuilderPage />
      </DataSourceProvider>,
    );
    expect((await screen.findByRole("alert")).textContent).toContain("builder backend down");
  });

  // M8 T2.2: the WRITE error paths had no test. The listing one did
  // (datasource_rejection_surfaces_as_visible_alert, just above), but the boundary that matters
  // here is the write one: a typed error must become visible state, never an unhandled rejection
  // (rules/error-handling.md § 2). M7 found a real bug in this same boundary class.
  it("start_session_rejection_surfaces_as_visible_error", async () => {
    renderBuilderWith({
      startBuilderSession: () => Promise.reject(new Error("disk is full")),
    });
    await submitPrompt("Create a billing reconciliation agent");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("disk is full");
  });

  // Review F-xval-2: the ROADMAP names TWO paths (index.tsx:198 and :210) and only the second
  // was covered. :198 is the empty-prompt guard — a silent early return, not a visible error:
  // submitting blank must neither start a session nor call the datasource.
  it("blank_prompt_does_not_start_a_session", async () => {
    const startBuilderSession = vi.fn();
    renderBuilderWith({ startBuilderSession });
    await screen.findByText("What should we build?");
    await userEvent.type(screen.getByRole("textbox", { name: /build instructions/i }), "   ");
    await userEvent.click(screen.getByRole("button", { name: /start build session/i }));
    expect(startBuilderSession).not.toHaveBeenCalled();
  });

  // Review F-r2-9: `openById`'s `.catch` (index.tsx:192) is the READ sibling of the write path
  // the DoD names — same `role="alert"` surface, zero coverage.
  it("open_session_rejection_surfaces_as_visible_error", async () => {
    renderBuilderWith({
      getBuilderSession: () => Promise.reject(new Error("session vanished")),
    });
    const sessions = await screen.findAllByTestId("builder-session");
    const first = sessions[0];
    if (!first) throw new Error("no session in the sidebar");
    await userEvent.click(first);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("session vanished");
  });

  // Review F-r2-9: the `target !== "new"` branch of index.tsx:204's ternary was never exercised —
  // starting a session against an existing agent had no end-to-end test.
  it("start_session_forwards_the_selected_target_agent", async () => {
    const startBuilderSession = vi.fn().mockResolvedValue({
      id: "draft-1",
      title: "t",
      lastActivity: "now",
      pinned: false,
      workedFor: "1s",
      workLog: [],
      messages: [],
      files: [],
    });
    renderBuilderWith({ startBuilderSession });
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("combobox", { name: /target agent/i }));
    await userEvent.click(await screen.findByRole("option", { name: /support agent/i }));
    await userEvent.type(
      screen.getByRole("textbox", { name: /build instructions/i }),
      "tune the tone",
    );
    await userEvent.click(screen.getByRole("button", { name: /start build session/i }));
    const [, targetArg] = startBuilderSession.mock.calls[0] ?? [];
    expect(targetArg).not.toBeUndefined();
  });

  // EC-6: the `String(error)` branch for a non-Error rejection — exactly what M7 found
  // uncovered in useListing.
  it("start_session_non_error_rejection_surfaces_as_string", async () => {
    renderBuilderWith({
      startBuilderSession: () => Promise.reject("boom"),
    });
    await submitPrompt("Create a billing reconciliation agent");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("boom");
  });

  it("empty_scenario_shows_no_sessions_in_sidebar", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "empty" })}>
        <AgentBuilderPage />
      </DataSourceProvider>,
    );
    expect(await screen.findByText("What should we build?")).toBeTruthy();
    expect(screen.queryAllByTestId("builder-session").length).toBe(0);
    expect(screen.getByText(/no matching sessions/i)).toBeTruthy();
  });

  it("intent_card_click_fills_the_composer_starter", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    // <IntentSelector layout="tiles"> from @theokit/ui: buttons with aria-pressed, sem
    // data-testid per tile — selector adjusted, behaviour identical (a click fills it in).
    const guardrails = screen.getByRole("button", { name: /guardrails/i });
    await userEvent.click(guardrails);
    const composer = screen.getByRole("textbox", {
      name: /build instructions/i,
    }) as HTMLTextAreaElement;
    expect(composer.value).toContain("Tighten the guardrails");
  });
});
