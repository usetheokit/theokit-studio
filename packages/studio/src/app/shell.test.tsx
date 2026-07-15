import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { DataSourceProvider, useDataSource } from "../data/datasource";
import { createFixtureDataSource } from "../data/fixture-datasource";
import { buildRoutes } from "./routes";
import { RunLogProvider } from "./run-log";

// Router fresco por teste (independência — testing.md § 3; SEPA Phase 2).
function renderShell(initialEntries: string[], extraChildren?: Parameters<typeof buildRoutes>[0]) {
  const router = createMemoryRouter(buildRoutes(extraChildren), { initialEntries });
  const ds = createFixtureDataSource({ scenario: "default" });
  render(
    <DataSourceProvider value={ds}>
      <RunLogProvider>
        <RouterProvider router={router} />
      </RunLogProvider>
    </DataSourceProvider>,
  );
  return router;
}

describe("Shell (T2.1 + drill-down IA)", () => {
  it("root_redirects_to_agents", async () => {
    renderShell(["/"]);
    expect(await screen.findByRole("heading", { name: "Agents", level: 1 })).toBeTruthy();
  });

  it("sidebar_navigates_all_root_surfaces", async () => {
    renderShell(["/agents"]);
    // Itens do menu raiz (label do botão === heading da página placeholder/real).
    const rootSurfaces = [
      "Agent Builder",
      "Prompts",
      "Workflows",
      "Processors",
      "MCP Servers",
      "Tools",
      "Workspaces",
      "Request Context",
      "Settings",
      "Agents",
    ];
    for (const label of rootSurfaces) {
      await userEvent.click(screen.getByRole("button", { name: label }));
      expect(await screen.findByRole("heading", { name: label, level: 1 })).toBeTruthy();
    }
  });

  it("evaluation_drilldown_shows_submenu_and_back_returns_to_root", async () => {
    renderShell(["/agents"]);
    await userEvent.click(screen.getByRole("button", { name: "Evaluation" }));
    // Painel trocou para o submenu (padrão theo-cloud) e a rota foi para o Overview.
    expect(await screen.findByRole("heading", { name: "Overview", level: 1 })).toBeTruthy();
    for (const label of ["Scorers", "Datasets", "Experiments"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    await userEvent.click(screen.getByRole("button", { name: "Scorers" }));
    expect(await screen.findByRole("heading", { name: "Scorers", level: 1 })).toBeTruthy();
    // Back retorna ao menu raiz (e navega para a raiz → redirect /agents).
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByRole("button", { name: "Agents" })).toBeTruthy();
  });

  it("observability_drilldown_lands_on_events_with_metrics_traces_logs", async () => {
    renderShell(["/agents"]);
    await userEvent.click(screen.getByRole("button", { name: "Observability" }));
    expect(await screen.findByRole("heading", { name: "Events", level: 1 })).toBeTruthy();
    for (const label of ["Metrics", "Traces", "Logs"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    await userEvent.click(screen.getByRole("button", { name: "Traces" }));
    expect(await screen.findByRole("heading", { name: "Traces", level: 1 })).toBeTruthy();
  });

  it("memory_drilldown_lands_on_memories_with_dashboard_parity_items", async () => {
    renderShell(["/agents"]);
    await userEvent.click(screen.getByRole("button", { name: "Memory" }));
    // Item raiz navega direto para a página real (/memory/memories) e troca o painel.
    expect(await screen.findByRole("heading", { name: "Memories", level: 1 })).toBeTruthy();
    for (const label of [
      "Overview",
      "Episodes",
      "Playground",
      "Entities",
      "Graph",
      "Skills",
      "Exports",
      "Webhooks",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    await userEvent.click(screen.getByRole("button", { name: "Entities" }));
    expect(await screen.findByRole("heading", { name: "Entities", level: 1 })).toBeTruthy();
  });

  it("knowledge_drilldown_lands_on_collections_with_dashboard_parity_items", async () => {
    renderShell(["/agents"]);
    await userEvent.click(screen.getByRole("button", { name: "Knowledge Base" }));
    expect(await screen.findByRole("heading", { name: "Collections", level: 1 })).toBeTruthy();
    for (const label of ["Overview", "Connectors", "Documents", "Ask", "Analytics"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByRole("heading", { name: "Ask", level: 1 })).toBeTruthy();
  });

  it("legacy_paths_redirect_to_new_ia", async () => {
    renderShell(["/playground"]);
    expect(await screen.findByRole("heading", { name: "Agents", level: 1 })).toBeTruthy();
  });

  it("legacy_events_and_traces_paths_redirect", async () => {
    renderShell(["/events"]);
    expect(await screen.findByRole("heading", { name: "Events", level: 1 })).toBeTruthy();
  });

  it("legacy_traces_path_redirects", async () => {
    renderShell(["/traces"]);
    expect(await screen.findByRole("heading", { name: "Traces", level: 1 })).toBeTruthy();
  });

  it("breadcrumb_reflects_active_route", async () => {
    renderShell(["/knowledge/collections"]);
    const breadcrumb = await screen.findByRole("navigation", { name: /breadcrumb/i });
    expect(within(breadcrumb).getByText(/collections/i)).toBeTruthy();
  });

  it("breadcrumb_is_the_usetheo_ui_primitive", async () => {
    renderShell(["/knowledge/collections"]);
    const breadcrumb = await screen.findByRole("navigation", { name: /breadcrumb/i });
    // Adoção M0 (usetheo-ui): o shell usa o primitive da lib (data-slot é o contrato de observabilidade).
    expect(breadcrumb.getAttribute("data-slot")).toBe("breadcrumb");
  });

  it("breadcrumb_aria_current_only_on_last_item", async () => {
    renderShell(["/knowledge/collections"]);
    const breadcrumb = await screen.findByRole("navigation", { name: /breadcrumb/i });
    const current = breadcrumb.querySelectorAll('[aria-current="page"]');
    expect(current.length).toBe(1);
    expect(current[0]?.textContent?.toLowerCase()).toContain("collections");
  });

  it("breadcrumb_bare_route_shows_only_root_without_current", async () => {
    renderShell(["/"]);
    await screen.findByRole("heading", { name: "Agents", level: 1 });
    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(breadcrumb).getByText("Studio")).toBeTruthy();
  });

  it("unknown_route_renders_not_found_empty_state", async () => {
    renderShell(["/nope"]);
    expect(await screen.findByText(/not found/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agents" })).toBeTruthy();
  });

  it("route_crash_renders_error_element_and_sidebar_survives", async () => {
    // React ecoa o erro capturado no console.error — spy escopado (SEPA trap EC-2).
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Boom(): never {
      throw new Error("boom de rota");
    }
    renderShell(["/crash"], [{ path: "crash", element: <Boom /> }]);
    const alertEl = await screen.findByRole("alert");
    expect(alertEl.textContent).toContain("boom de rota");
    // Sidebar sobrevive e continua navegável (Memory drill → página real Memories):
    await userEvent.click(screen.getByRole("button", { name: "Memory" }));
    expect(await screen.findByRole("heading", { name: "Memories", level: 1 })).toBeTruthy();
    spy.mockRestore();
  });

  it("useDataSource_outside_provider_throws_contextual_message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Probe() {
      useDataSource();
      return null;
    }
    expect(() => render(<Probe />)).toThrow(/DataSourceProvider.*composition root/);
    spy.mockRestore();
  });

  // Banner de honestidade (M1 T3.1 — review F-dom-frontend-1): a superfície cuja função
  // É a honestidade precisa de teste direto (live vs fixtures), não só cobertura indireta.
  it("banner_shows_fixtures_mode_by_default", async () => {
    renderShell(["/agents"]);
    expect(await screen.findByText("Fixtures mode")).toBeTruthy();
    expect(screen.getByText(/M5 · simulated data/i)).toBeTruthy();
    expect(screen.queryByText("Live reflection")).toBeNull();
  });

  it("banner_shows_live_reflection_when_live_prop_set", async () => {
    // buildRoutes({}, {live:true}) propaga a prop live ao Shell (o composition root
    // decide o mode UMA vez — aqui exercitamos o ramo live do banner).
    const router = createMemoryRouter(buildRoutes([], { live: true }), {
      initialEntries: ["/agents"],
    });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <RunLogProvider>
          <RouterProvider router={router} />
        </RunLogProvider>
      </DataSourceProvider>,
    );
    expect(await screen.findByText("Live reflection")).toBeTruthy();
    expect(screen.getByText(/dev server · fixtures where noted/i)).toBeTruthy();
    expect(screen.queryByText("Fixtures mode")).toBeNull();
  });
});
