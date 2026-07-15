import { render, screen } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { App } from "./app";
import { buildRoutes } from "./app/routes";
import { DataSourceProvider } from "./data/datasource";
import { createFixtureDataSource } from "./data/fixture-datasource";

describe("App smoke (T0.1)", () => {
  it("renders_design_system_component_inside_provider", async () => {
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/playground"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );
    const smokeElement = await screen.findByTestId("studio-smoke");
    expect(smokeElement).toBeTruthy();
    expect(smokeElement.textContent).toContain("TheoKit Studio");
  });
});
