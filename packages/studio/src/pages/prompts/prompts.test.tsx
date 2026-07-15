import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { PromptsPage } from "./index";

function renderPrompts(scenario: "default" | "empty" = "default") {
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario })}>
      <PromptsPage />
    </DataSourceProvider>,
  );
}

describe("Prompts (Mastra-parity clone)", () => {
  it("lists_prompt_blocks_with_version_and_usage", async () => {
    renderPrompts();
    const rows = await screen.findAllByTestId("prompt-row");
    expect(rows.length).toBe(3);
    const guardrails = rows.find((r) => r.textContent?.includes("safety-guardrails"));
    expect(guardrails?.textContent).toContain("v1");
    expect(guardrails?.textContent).toContain("3");
  });

  it("create_prompt_is_honest_fake_door_in_fixtures_mode", async () => {
    renderPrompts();
    await screen.findAllByTestId("prompt-row");
    const create = screen.getByRole("button", { name: /create prompt/i }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
  });

  it("row_click_opens_readonly_detail_with_published_content", async () => {
    renderPrompts();
    const rows = await screen.findAllByTestId("prompt-row");
    const tone = rows.find((r) => r.textContent?.includes("support-tone"));
    if (!tone) throw new Error("prompt row not found");
    await userEvent.click(tone);

    expect(await screen.findByTestId("prompt-detail")).toBeTruthy();
    expect(screen.getByText(/referenced by 2 agents/i)).toBeTruthy();
    expect(screen.getByText(/never promise refunds above \$500/i)).toBeTruthy();
    // Read-only em fixtures: nenhum editor de texto no detail.
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText(/read-only in fixtures mode/i)).toBeTruthy();
  });

  it("back_button_returns_to_prompt_list", async () => {
    renderPrompts();
    await userEvent.click((await screen.findAllByTestId("prompt-row"))[0] as HTMLElement);
    await screen.findByTestId("prompt-detail");
    await userEvent.click(screen.getByRole("button", { name: /all prompts/i }));
    expect((await screen.findAllByTestId("prompt-row")).length).toBe(3);
  });

  it("empty_scenario_shows_no_prompts_state_not_filter_message", async () => {
    renderPrompts("empty");
    expect(await screen.findByText(/no prompts yet/i)).toBeTruthy();
    expect(screen.queryByText(/match your filter/i)).toBeNull();
  });
});
