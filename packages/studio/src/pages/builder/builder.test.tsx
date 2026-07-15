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
    // Undo é fake door honesto; Review é real (abre o painel de diffs).
    const undo = within(card).getByRole("button", { name: /undo/i }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    // Default à direita: painel de DETALHES (Branch details + Artifacts).
    const details = screen.getByTestId("builder-details");
    expect(details.textContent).toContain("Branch details");
    expect(details.textContent).toContain("Pull request status unavailable");
    expect(screen.getAllByTestId("builder-artifact-item").length).toBe(2);
    // Abrir o Review pelo botão do card.
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
    // Abre o Review a partir de "Changes" no painel de detalhes.
    await userEvent.click(screen.getByRole("button", { name: /changes/i }));
    await screen.findByTestId("builder-review");
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

  it("artifact_click_opens_review_filtered_and_close_returns_to_details", async () => {
    renderBuilder();
    await openPinnedSession();
    const artifacts = screen.getAllByTestId("builder-artifact-item");
    const tone = artifacts.find((a) => a.textContent?.includes("support-tone.md"));
    if (!tone) throw new Error("artifact not found");
    await userEvent.click(tone);
    // Review abre já filtrado no artefato clicado.
    await screen.findByTestId("builder-review");
    const diffs = screen.getAllByTestId("review-file-diff");
    expect(diffs.length).toBe(1);
    expect(diffs[0]?.getAttribute("data-path")).toBe("prompts/support-tone.md");
    // Fechar o Review volta ao painel de detalhes.
    await userEvent.click(screen.getByRole("button", { name: /close review/i }));
    expect(await screen.findByTestId("builder-details")).toBeTruthy();
  });

  it("chat_width_is_resizable_via_separator_keyboard", async () => {
    renderBuilder();
    await openPinnedSession();
    const separator = screen.getByRole("separator", { name: /resize chat/i });
    const chatPane = screen.getByTestId("builder-chat-pane") as HTMLElement;
    expect(chatPane.style.width).toBe("54%");
    // Setas redimensionam (acessível sem mouse); clamp em 25–75.
    separator.focus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(chatPane.style.width).toBe("46%");
    await userEvent.keyboard("{ArrowRight}");
    expect(chatPane.style.width).toBe("50%");
    for (let i = 0; i < 20; i++) {
      await userEvent.keyboard("{ArrowLeft}");
    }
    expect(chatPane.style.width).toBe("25%");
    expect(separator.getAttribute("aria-valuenow")).toBe("25");
  });

  it("minimize_panel_gives_chat_full_width_and_restore_brings_it_back", async () => {
    renderBuilder();
    await openPinnedSession();
    expect(screen.getByTestId("builder-details")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /minimize side panel/i }));
    // Painel some, chat ocupa 100%, splitter some.
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
    // Minimizar o painel com o chat escondido troca o lado minimizado — nunca tela vazia.
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
    // Model picker refinado: nome amigável + esforço num só controle.
    const picker = screen.getByRole("button", { name: /model picker/i });
    expect(picker.textContent).toContain("Fable 5");
    expect(picker.textContent).toContain("Medium");
    await userEvent.click(picker);
    // Painel com modelos (nome + descrição + id mono) e esforço.
    const sonnet = await screen.findByRole("menuitemradio", { name: /sonnet 4\.6/i });
    expect(sonnet.textContent).toContain("Fast and balanced");
    expect(sonnet.textContent).toContain("claude-sonnet-4-6");
    await userEvent.click(sonnet);
    expect(screen.getByRole("button", { name: /model picker/i }).textContent).toContain(
      "Sonnet 4.6",
    );
    await userEvent.click(screen.getByRole("button", { name: /model picker/i }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "High" }));
    expect(screen.getByRole("button", { name: /model picker/i }).textContent).toContain("High");
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
