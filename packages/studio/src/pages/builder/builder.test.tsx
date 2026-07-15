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

describe("Agent Builder (code-assistant home)", () => {
  it("shows_greeting_intent_cards_and_session_lists", async () => {
    renderBuilder();
    expect(await screen.findByText("What should we build?")).toBeTruthy();
    // 4 intenções de construção.
    expect(screen.getAllByTestId("builder-intent").length).toBe(4);
    // Sessões das fixtures: 1 pinned + 3 recentes.
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
    // Continua editável (fake door só no envio).
    await userEvent.type(composer, "reveals internal details.");
    expect(composer.value).toContain("reveals internal details.");
  });

  it("target_agent_select_offers_new_agent_and_fixture_agents", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    await userEvent.click(screen.getByRole("combobox", { name: /target agent/i }));
    const options = await screen.findAllByRole("option");
    const labels = options.map((o) => o.textContent);
    expect(labels).toContain("New agent");
    expect(labels).toContain("Support Agent");
    await userEvent.click(screen.getByRole("option", { name: "Support Agent" }));
    expect(screen.getByRole("combobox", { name: /target agent/i }).textContent).toContain(
      "Support Agent",
    );
  });

  it("session_start_is_honest_fake_door_in_fixtures_mode", async () => {
    renderBuilder();
    await screen.findByText("What should we build?");
    const start = screen.getByRole("button", {
      name: /start build session/i,
    }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    const newSession = screen.getByRole("button", { name: /new session/i }) as HTMLButtonElement;
    expect(newSession.disabled).toBe(true);
    expect(screen.getByText(/disabled in fixtures mode/i)).toBeTruthy();
  });
});
