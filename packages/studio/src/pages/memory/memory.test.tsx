import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import {
  createFixtureDataSource,
  type FixtureDataSourceOptions,
} from "../../data/fixture-datasource";
import { MemoryPage } from "./index";

function renderMemory(options: FixtureDataSourceOptions = { scenario: "default" }) {
  render(
    <DataSourceProvider value={createFixtureDataSource(options)}>
      <MemoryPage />
    </DataSourceProvider>,
  );
}

describe("Memory browser (T4.1)", () => {
  it("lists_memories_grouped_by_scope", async () => {
    renderMemory();
    const scopeRows = await screen.findAllByTestId("memory-row");
    expect(scopeRows.length).toBeGreaterThan(0);
    const scopesVisiveis = scopeRows.map((r) => r.textContent ?? "");
    expect(scopesVisiveis.some((t) => t.includes("user"))).toBe(true);
    expect(scopesVisiveis.some((t) => t.includes("session"))).toBe(true);
    expect(screen.getByText(/payment webhook/)).toBeTruthy();
  });

  it("empty_scenario_shows_no_memories_empty_state", async () => {
    renderMemory({ scenario: "empty" });
    expect(await screen.findByText(/no memories yet/i)).toBeTruthy();
  });

  it("search_without_match_shows_no_match_state_not_empty_state", async () => {
    renderMemory();
    await screen.findAllByTestId("memory-row");
    await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "zzz-inexistente");
    const noMatchVisible = (await screen.findByText(/no memories match/i)) !== null;
    expect(noMatchVisible).toBe(true);
    expect(screen.queryByText(/no memories yet/i)).toBeNull();
  });

  it("offline_scenario_shows_service_offline_state", async () => {
    renderMemory({ scenario: "offline" });
    expect(await screen.findByText(/theokit studio up/)).toBeTruthy();
  });

  it("scope_filter_narrows_the_list", async () => {
    renderMemory();
    await screen.findAllByTestId("memory-row");
    await userEvent.click(screen.getByRole("combobox", { name: /scope/i }));
    await userEvent.click(await screen.findByRole("option", { name: "agent" }));
    const rows = screen.getAllByTestId("memory-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("refundOrder");
  });
});
