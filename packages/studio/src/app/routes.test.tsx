import { render, screen } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { App } from "../app";
import { DataSourceProvider } from "../data/datasource";
import { createFixtureDataSource } from "../data/fixture-datasource";
import { buildRoutes } from "./routes";

// O Studio foi reduzido a uma única superfície: o Agent Builder em tela cheia.
// Estes testes fixam o contrato de roteamento dessa redução.
function renderAt(path: string) {
  const router = createMemoryRouter(buildRoutes(), { initialEntries: [path] });
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
      <App router={router} />
    </DataSourceProvider>,
  );
}

describe("routes (Studio reduzido ao Agent Builder)", () => {
  it("root_redirects_to_builder", async () => {
    renderAt("/");

    expect(await screen.findByTestId("builder-surface")).toBeTruthy();
  });

  it("builder_renders_at_its_own_path", async () => {
    renderAt("/builder");

    expect(await screen.findByTestId("builder-surface")).toBeTruthy();
  });

  it.each([
    "/agents",
    "/prompts",
    "/memory/memories",
    "/observability/traces",
    "/settings",
  ])("removed_surface_%s_renders_not_found", async (path) => {
    renderAt(path);

    expect(await screen.findByTestId("not-found")).toBeTruthy();
  });

  it("builder_renders_without_shell_chrome", async () => {
    renderAt("/builder");
    await screen.findByTestId("builder-surface");

    // Tela cheia: sem sidebar de navegação do shell, sem breadcrumb.
    expect(screen.queryByTestId("studio-smoke")).toBeNull();
    expect(screen.queryByText("dev server")).toBeNull();
  });
});
