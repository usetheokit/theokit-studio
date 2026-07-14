import { act, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { App } from "../../src/app";
import { buildRoutes } from "../../src/app/routes";
import { ServiceGate, ServiceOfflineState, useServiceHealth } from "../../src/app/service-state";
import { Shell } from "../../src/app/shell";
import { bootstrap, parseStudioConfig } from "../../src/bootstrap";
import { DataSourceProvider, useDataSource } from "../../src/data/datasource";
import { createFixtureDataSource } from "../../src/data/fixture-datasource";
import { metrics } from "../../src/data/metrics";
import { mount } from "../../src/main";
import { TracesPage } from "../../src/pages/traces";
import { renderStartupError } from "../../src/startup-error";

// Teste de integração incremental (Fase Final expande para as 5 superfícies + prova
// completa de métricas, per plano § Final Phase — reconciliado no log da iteração 1).
describe("Studio integration", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("mounts_the_full_app_shell", async () => {
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );
    expect(await screen.findByTestId("studio-smoke")).toBeTruthy();
  });

  it("data_layer_serves_a_component_through_provider_and_counts_metrics", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });

    function Probe() {
      const source = useDataSource();
      void source.listAgents();
      return <span data-testid="probe">ok</span>;
    }

    render(
      <DataSourceProvider value={ds}>
        <Probe />
      </DataSourceProvider>,
    );
    expect(await screen.findByTestId("probe")).toBeTruthy();
    expect(metrics.snapshot().datasource_calls_total.listAgents).toBe(1);
  });

  it("boot_path_mounts_the_app_via_mount_and_parsed_config", async () => {
    document.body.innerHTML = '<div id="boot-root"></div>';
    const rootEl = document.getElementById("boot-root");
    if (!rootEl) throw new Error("setup");
    await act(async () => {
      mount(rootEl, parseStudioConfig({ scenario: "default" }));
    });
    await waitFor(() => {
      expect(rootEl.querySelector('[data-testid="studio-smoke"]')).toBeTruthy();
    });
    document.body.innerHTML = "";
  });

  it("bootstrap_without_root_renders_startup_error_alert", async () => {
    document.body.innerHTML = "";
    await expect(bootstrap()).rejects.toThrow(/#root/);
    const alertEl = document.querySelector('[role="alert"]');
    expect(alertEl?.textContent).toContain("TheoKit Studio failed to start");
    document.body.innerHTML = "";
  });

  it("startup_error_direct_render_is_accessible", () => {
    document.body.innerHTML = '<div id="root"></div>';
    renderStartupError(new Error("integration boom"), { mode: "development" });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("integration boom");
    document.body.innerHTML = "";
  });

  it("shell_renders_three_nav_sections_directly", async () => {
    const router = createMemoryRouter([
      { path: "/", element: <Shell />, children: [{ index: true, element: <div /> }] },
    ]);
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <RouterProvider router={router} />
      </DataSourceProvider>,
    );
    const smoke = await screen.findByTestId("studio-smoke");
    for (const section of ["Playground", "Observability", "Data"]) {
      expect(smoke.textContent).toContain(section);
    }
  });

  it("traces_route_renders_TracesPage_with_lens_offline_placeholder", async () => {
    // Rota real (/traces → TracesPage) + render direto do componente: mesmo resultado.
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/traces"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );
    expect((await screen.findAllByText(/theo-lens/)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/theokit studio up/)).toBeTruthy();
    expect(screen.queryByTestId("trace-tree")).toBeNull();
  });

  it("traces_page_direct_render_matches_route_behavior", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <TracesPage />
      </DataSourceProvider>,
    );
    expect((await screen.findAllByText(/theo-lens/)).length).toBeGreaterThan(0);
  });

  it("service_offline_state_renders_actionable_hint_directly", () => {
    render(<ServiceOfflineState service="rag" />);
    expect(screen.getByTestId("service-offline").textContent).toContain("theokit studio up");
    expect(screen.getByTestId("service-offline").textContent).toContain("theo-rag");
  });

  it("service_gate_resolves_health_end_to_end_for_online_service", async () => {
    function HealthProbe() {
      const health = useServiceHealth("memory");
      return <span data-testid="health-state">{health}</span>;
    }
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <ServiceGate service="memory">
          <p>memory content online</p>
        </ServiceGate>
        <HealthProbe />
      </DataSourceProvider>,
    );
    expect(await screen.findByText("memory content online")).toBeTruthy();
    expect((await screen.findByTestId("health-state")).textContent).toBe("online");
  });

  it("playground_run_then_events_inspector_shows_the_same_run", async () => {
    // Jornada completa: PlaygroundPage (useRunPlayback → applyEvent) publica no
    // RunLogProvider; EventsPage (categorize) mostra o MESMO run após navegar.
    const userEvent = (await import("@testing-library/user-event")).default;
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/playground"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );
    const agentRows = await screen.findAllByTestId("agent-row");
    const supportRow = agentRows.find((r) => r.textContent?.includes("Support Agent"));
    if (!supportRow) throw new Error("agent row not found: Support Agent");
    await userEvent.click(supportRow);
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "status?");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/arrives on the 16th/)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /events/i }));
    const rows = await screen.findAllByTestId("event-row");
    expect(rows.length).toBeGreaterThan(0);
    expect(metrics.snapshot().stream_events_played_total.total).toBeGreaterThan(0);
    expect(metrics.snapshot().datasource_calls_total.runAgent).toBe(1);
  });

  it("memory_and_knowledge_tabs_render_fixture_data_through_the_gate", async () => {
    // Cadeia exercitada: rota /memory → MemoryPage → ServiceGate('memory') → getMemories;
    // navegação → KnowledgePage → ServiceGate('rag') → listCollections/listDocuments.
    const userEvent = (await import("@testing-library/user-event")).default;
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/memory"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );
    expect((await screen.findAllByTestId("memory-row")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /knowledge/i }));
    await userEvent.click(await screen.findByRole("button", { name: /product docs/i }));
    expect(await screen.findByRole("button", { name: /getting-started/i })).toBeTruthy();
  });

  it("final_phase_all_five_surfaces_navigable_with_nonzero_metrics", async () => {
    // Fase Final do plano: navega as 5 superfícies no app inteiro e prova as métricas
    // do Global DoD (datasource_calls_total > 0; stream_events ≥ roteiro default).
    const userEvent = (await import("@testing-library/user-event")).default;
    const { DEFAULT_RUN } = await import("../../src/data/fixtures/run-script");
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/playground"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );
    // 1. Playground: run completo
    const agentRows = await screen.findAllByTestId("agent-row");
    const supportRow = agentRows.find((r) => r.textContent?.includes("Support Agent"));
    if (!supportRow) throw new Error("agent row not found: Support Agent");
    await userEvent.click(supportRow);
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "where is my order?");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/arrives on the 16th/)).toBeTruthy();
    // 2. Events
    await userEvent.click(screen.getByRole("button", { name: /events/i }));
    expect((await screen.findAllByTestId("event-row")).length).toBe(DEFAULT_RUN.length);
    // 3. Memory
    await userEvent.click(screen.getByRole("button", { name: /memory/i }));
    expect((await screen.findAllByTestId("memory-row")).length).toBeGreaterThan(0);
    // 4. Knowledge
    await userEvent.click(screen.getByRole("button", { name: /knowledge/i }));
    expect(await screen.findByRole("button", { name: /product docs/i })).toBeTruthy();
    // 5. Traces (placeholder honesto)
    await userEvent.click(screen.getByRole("button", { name: /traces/i }));
    expect((await screen.findAllByText(/theo-lens/)).length).toBeGreaterThan(0);

    // Prova de métricas (wiring pillar c — ADR D5)
    const snap = metrics.snapshot();
    const datasourceTotal = Object.values(snap.datasource_calls_total).reduce((a, b) => a + b, 0);
    expect(datasourceTotal).toBeGreaterThan(0);
    expect(snap.stream_events_played_total.total).toBeGreaterThanOrEqual(DEFAULT_RUN.length);
    expect(snap.datasource_calls_total.runAgent).toBe(1);
  });

  it("useRunLog_outside_provider_throws_contextual_message", async () => {
    const { useRunLog } = await import("../../src/app/run-log");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Probe() {
      useRunLog();
      return null;
    }
    expect(() => render(<Probe />)).toThrow(/RunLogProvider.*composition root/);
    spy.mockRestore();
  });

  it("route_error_renders_non_error_thrown_values", async () => {
    const { RouteError } = await import("../../src/app/route-error");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const router = createMemoryRouter([
      {
        path: "/",
        element: <div />,
        errorElement: <RouteError />,
        loader: () => {
          throw "string crua";
        },
      },
    ]);
    render(<RouterProvider router={router} />);
    expect((await screen.findByRole("alert")).textContent).toContain("string crua");
    spy.mockRestore();
  });

  it("run_stream_plays_end_to_end_through_the_datasource", async () => {
    // Exercita o pipeline runAgent → play (stream-player) → eventos tipados do SDK.
    const ds = createFixtureDataSource({ scenario: "default" });
    const types: string[] = [];
    for await (const event of ds.runAgent("support-agent", "status do pedido?")) {
      types.push(event.type);
    }
    expect(types.at(-1)).toBe("turn-ended");
    expect(metrics.snapshot().stream_events_played_total.total).toBeGreaterThan(0);
  });
});
