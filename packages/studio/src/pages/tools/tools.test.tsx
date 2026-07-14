import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { ToolsPage } from "./index";

describe("Tools (Mastra-parity clone)", () => {
  it("lists_all_registered_tools_including_volume_scenario", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <ToolsPage />
      </DataSourceProvider>,
    );
    const rows = await screen.findAllByTestId("tool-row");
    // 3 tools nomeadas + 52 do cenário de volume (Drawback 3 do plano).
    expect(rows.length).toBe(55);
  });

  it("filter_narrows_tools_by_name", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <ToolsPage />
      </DataSourceProvider>,
    );
    await screen.findAllByTestId("tool-row");
    await userEvent.type(screen.getByRole("searchbox", { name: /filter tools/i }), "websearch");
    const rows = screen.getAllByTestId("tool-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("webSearch");
  });
});
