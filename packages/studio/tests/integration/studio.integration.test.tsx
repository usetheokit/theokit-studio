import { act, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { App } from "../../src/app";
import { buildRoutes } from "../../src/app/routes";
import { bootstrap, parseStudioConfig } from "../../src/bootstrap";
import { DataSourceProvider, useDataSource } from "../../src/data/datasource";
import { createFixtureDataSource } from "../../src/data/fixture-datasource";
import { metrics } from "../../src/data/metrics";
import { mount } from "../../src/main";
import { renderStartupError } from "../../src/startup-error";

// Integration of the SPA reduced to a single surface: the Agent Builder. Covers the boot path
// (bootstrap → mount → route) and the error boundaries that survive the cut.
describe("Studio integration", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("mounts_the_builder_surface_from_the_root_route", async () => {
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );

    expect(await screen.findByTestId("builder-surface")).toBeTruthy();
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
      expect(rootEl.querySelector('[data-testid="builder-surface"]')).toBeTruthy();
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

  it("unknown_route_renders_not_found_instead_of_a_blank_screen", async () => {
    const router = createMemoryRouter(buildRoutes(), { initialEntries: ["/observability/traces"] });
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <App router={router} />
      </DataSourceProvider>,
    );

    expect(await screen.findByTestId("not-found")).toBeTruthy();
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
          throw "raw string";
        },
      },
    ]);

    render(<RouterProvider router={router} />);

    expect((await screen.findByRole("alert")).textContent).toContain("raw string");
    spy.mockRestore();
  });
});
