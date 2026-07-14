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

describe("Shell (T2.1)", () => {
  it("root_redirects_to_playground", async () => {
    renderShell(["/"]);
    expect(await screen.findByRole("heading", { name: /playground/i, level: 1 })).toBeTruthy();
  });

  it("sidebar_navigates_to_all_five_surfaces", async () => {
    renderShell(["/playground"]);
    const surfaces = [
      { item: /events/i, heading: /events/i },
      { item: /memory/i, heading: /memory/i },
      { item: /knowledge/i, heading: /knowledge/i },
      { item: /traces/i, heading: /traces/i },
      { item: /playground/i, heading: /playground/i },
    ];
    let headingsVisitadas = 0;
    for (const s of surfaces) {
      await userEvent.click(screen.getByRole("button", { name: s.item }));
      expect(await screen.findByRole("heading", { name: s.heading, level: 1 })).toBeTruthy();
      headingsVisitadas += 1;
    }
    expect(headingsVisitadas).toBe(5);
  });

  it("breadcrumb_reflects_active_route", async () => {
    renderShell(["/knowledge"]);
    const breadcrumb = await screen.findByRole("navigation", { name: /breadcrumb/i });
    expect(within(breadcrumb).getByText(/knowledge/i)).toBeTruthy();
  });

  it("unknown_route_renders_not_found_empty_state", async () => {
    renderShell(["/nope"]);
    expect(await screen.findByText(/not found/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /playground/i })).toBeTruthy();
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
    // Sidebar sobrevive e continua navegável:
    await userEvent.click(screen.getByRole("button", { name: /memory/i }));
    expect(await screen.findByRole("heading", { name: /memory/i, level: 1 })).toBeTruthy();
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
});
