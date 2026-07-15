import { render, screen } from "@testing-library/react";
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

describe("Agent Builder (code-assistant, three-pane)", () => {
  it("shows_greeting_intent_cards_and_session_lists", async () => {
    renderBuilder();
    expect(await screen.findByText("What should we build?")).toBeTruthy();
    expect(screen.getAllByTestId("builder-intent").length).toBe(4);
    const sessions = await screen.findAllByTestId("builder-session");
    expect(sessions.length).toBe(4);
    expect(sessions[0]?.textContent).toContain("Refine Support Agent tone");
    expect(sessions[0]?.textContent).toContain("2m");
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

  it("session_click_opens_chat_with_transcript_and_diff_artifact", async () => {
    renderBuilder();
    const sessions = await screen.findAllByTestId("builder-session");
    const refine = sessions.find((s) => s.textContent?.includes("Refine Support Agent tone"));
    if (!refine) throw new Error("session not found");
    await userEvent.click(refine);

    expect(await screen.findByTestId("builder-session-view")).toBeTruthy();
    // Transcript da fixture (user + assistant) com rótulo honesto.
    const messages = screen.getAllByTestId("builder-message");
    expect(messages.length).toBe(2);
    expect(messages[0]?.textContent).toContain("sounds robotic");
    expect(screen.getByText("Simulated session")).toBeTruthy();
    // Viewer à direita: nome do arquivo + diff com linhas +/- coloridas.
    const artifact = screen.getByTestId("builder-artifact");
    expect(artifact.textContent).toContain("agents/support-agent.ts");
    expect(screen.getAllByTestId("diff-line-add").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("diff-line-del").length).toBeGreaterThan(0);
  });

  it("home_submit_starts_scripted_session_with_scaffold_artifact", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.type(
      screen.getByRole("textbox", { name: /build instructions/i }),
      "Create a billing reconciliation agent",
    );
    await userEvent.click(screen.getByRole("button", { name: /start build session/i }));

    expect(await screen.findByTestId("builder-session-view")).toBeTruthy();
    const messages = screen.getAllByTestId("builder-message");
    expect(messages[0]?.textContent).toContain("billing reconciliation");
    expect(messages[1]?.textContent).toContain("first pass");
    expect(screen.getByTestId("builder-artifact").textContent).toContain("agents/new-agent.ts");
  });

  it("blank_home_submit_is_noop", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("button", { name: /start build session/i }));
    expect(screen.queryByTestId("builder-session-view")).toBeNull();
  });

  it("follow_up_message_appends_to_the_transcript", async () => {
    renderBuilder();
    const sessions = await screen.findAllByTestId("builder-session");
    await userEvent.click(sessions[0] as HTMLElement);
    await screen.findByTestId("builder-session-view");
    await userEvent.type(
      screen.getByRole("textbox", { name: /session message/i }),
      "Also mention the docs link.",
    );
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    const messages = screen.getAllByTestId("builder-message");
    expect(messages.length).toBe(4);
    expect(messages[2]?.textContent).toContain("docs link");
    expect(messages[3]?.textContent).toContain("Applied");
  });

  it("new_session_returns_to_home_and_search_filters_tasks", async () => {
    renderBuilder();
    const sessions = await screen.findAllByTestId("builder-session");
    await userEvent.click(sessions[0] as HTMLElement);
    await screen.findByTestId("builder-session-view");
    await userEvent.click(screen.getByRole("button", { name: /new session/i }));
    expect(await screen.findByText("What should we build?")).toBeTruthy();
    // Busca filtra as listas da sidebar.
    await userEvent.type(screen.getByRole("searchbox", { name: /search sessions/i }), "triage");
    const filtered = screen.getAllByTestId("builder-session");
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.textContent).toContain("triage");
  });

  it("target_agent_select_offers_new_agent_and_fixture_agents", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("combobox", { name: /target agent/i }));
    const options = await screen.findAllByRole("option");
    const labels = options.map((o) => o.textContent);
    expect(labels).toContain("New agent");
    expect(labels).toContain("Support Agent");
  });
});
