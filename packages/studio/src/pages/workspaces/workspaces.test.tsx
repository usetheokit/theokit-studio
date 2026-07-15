import { render, screen } from "@testing-library/react";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { WorkspacesPage } from "./index";

describe("Workspaces (Mastra-parity clone)", () => {
  it("lists_workspace_files_with_dirs_and_sizes", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <WorkspacesPage />
      </DataSourceProvider>,
    );
    expect(await screen.findByText("Demo Workspace")).toBeTruthy();
    const files = screen.getAllByTestId("workspace-file");
    expect(files.length).toBe(3);
    const readme = files.find((f) => f.textContent?.includes("README.md"));
    expect(readme?.textContent).toContain("162 B");
  });

  it("empty_scenario_shows_honest_empty_state", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "empty" })}>
        <WorkspacesPage />
      </DataSourceProvider>,
    );
    expect(await screen.findByTestId("workspaces-empty")).toBeTruthy();
  });
});
