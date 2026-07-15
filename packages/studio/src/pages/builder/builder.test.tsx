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
    // Ordem estrutural: New session, Search, navegação, Pinned/Projects/Tasks.
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
    // Skills: lista REAL via listSkills (fecha o consumidor que faltava).
    await userEvent.click(screen.getByRole("button", { name: "Skills" }));
    const skills = await screen.findAllByTestId("builder-skill");
    expect(skills.length).toBe(2);
    expect(skills[0]?.textContent).toContain("summarize");
    // Scheduled e Templates: empty states honestos.
    await userEvent.click(screen.getByRole("button", { name: "Scheduled" }));
    expect(await screen.findByTestId("builder-scheduled-view")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Templates" }));
    expect(await screen.findByTestId("builder-templates-view")).toBeTruthy();
    // New session volta para a home.
    await userEvent.click(screen.getByRole("button", { name: /new session/i }));
    expect(await screen.findByText("What should we build?")).toBeTruthy();
  });

  it("session_opens_with_worklog_edited_files_and_review_panel", async () => {
    renderBuilder();
    await openPinnedSession();
    // Work log expansível.
    const workToggle = screen.getByRole("button", { name: /worked for 2m 30s/i });
    expect(workToggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(workToggle);
    const log = screen.getByTestId("builder-worklog");
    expect(log.textContent).toContain("Rewrote the instructions");
    // Card "Edited 2 files" com contadores agregados e por arquivo.
    const card = screen.getByTestId("builder-edited-files");
    expect(card.textContent).toContain("Edited 2 files");
    expect(card.textContent).toContain("+6");
    expect(card.textContent).toContain("-3");
    expect(card.textContent).toContain("prompts/support-tone.md");
    // Undo é fake door honesto; Review é real (foca o painel).
    const undo = within(card).getByRole("button", { name: /undo/i }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    // Painel Review: toolbar agregada + Commit fake door + diffs por arquivo.
    const review = screen.getByTestId("builder-review");
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
    const treeFiles = screen.getAllByTestId("review-tree-file");
    expect(treeFiles.length).toBe(2);
    const tone = treeFiles.find((f) => f.textContent?.includes("support-tone.md"));
    if (!tone) throw new Error("tree file not found");
    await userEvent.click(tone);
    const diffs = screen.getAllByTestId("review-file-diff");
    expect(diffs.length).toBe(1);
    expect(diffs[0]?.getAttribute("data-path")).toBe("prompts/support-tone.md");
    // "All files" restaura os dois diffs.
    await userEvent.click(screen.getByRole("button", { name: /all files/i }));
    expect(screen.getAllByTestId("review-file-diff").length).toBe(2);
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

  it("composer_has_reference_anatomy_actions_row_and_project_row", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    // Linha de ações dentro do composer: + (fake door), approval mode, esforço, mic, seta.
    const attach = screen.getByRole("button", { name: /add attachment/i }) as HTMLButtonElement;
    expect(attach.disabled).toBe(true);
    const mic = screen.getByRole("button", { name: /voice input/i }) as HTMLButtonElement;
    expect(mic.disabled).toBe(true);
    // Approval mode é config local REAL.
    await userEvent.click(screen.getByRole("combobox", { name: /approval mode/i }));
    await userEvent.click(await screen.findByRole("option", { name: "Auto-approve edits" }));
    expect(screen.getByRole("combobox", { name: /approval mode/i }).textContent).toContain(
      "Auto-approve edits",
    );
    // Esforço ao lado do modelo.
    await userEvent.click(screen.getByRole("combobox", { name: /reasoning effort/i }));
    await userEvent.click(await screen.findByRole("option", { name: "High" }));
    expect(screen.getByRole("combobox", { name: /reasoning effort/i }).textContent).toContain(
      "High",
    );
    // Linha do projeto ABAIXO do composer.
    await userEvent.click(screen.getByRole("combobox", { name: /^project$/i }));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toContain("New project");
  });

  it("intent_card_click_fills_the_composer_starter", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    const cards = screen.getAllByTestId("builder-intent");
    const guardrails = cards.find((c) => c.textContent?.includes("guardrails"));
    if (!guardrails) throw new Error("intent card not found");
    await userEvent.click(guardrails);
    const composer = screen.getByRole("textbox", {
      name: /build instructions/i,
    }) as HTMLTextAreaElement;
    expect(composer.value).toContain("Tighten the guardrails");
  });
});
