import { render, screen } from "@testing-library/react";
import { DataSourceProvider } from "../data/datasource";
import { createFixtureDataSource } from "../data/fixture-datasource";
import { metrics } from "../data/metrics";
import { ServiceGate } from "./service-state";

function renderGate(ds: ReturnType<typeof createFixtureDataSource>, service: "memory" | "rag") {
  return render(
    <DataSourceProvider value={ds}>
      <ServiceGate service={service}>
        <p>conteúdo online</p>
      </ServiceGate>
    </DataSourceProvider>,
  );
}

describe("ServiceGate (T2.2)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("shows_skeleton_while_health_pending", () => {
    const ds = createFixtureDataSource({
      scenario: "default",
      overrides: { health: () => new Promise(() => {}) },
    });
    renderGate(ds, "memory");
    expect(screen.getByTestId("service-skeleton")).toBeTruthy();
  });

  it("shows_offline_state_with_studio_up_hint_when_service_offline", async () => {
    const ds = createFixtureDataSource({ scenario: "offline" });
    renderGate(ds, "memory");
    const hint = await screen.findByText(/theokit studio up/);
    expect(hint.textContent).toContain("theokit studio up");
  });

  it("renders_children_when_service_online", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    renderGate(ds, "memory");
    expect(await screen.findByText("conteúdo online")).toBeTruthy();
  });

  it("health_rejection_renders_offline_and_increments_error_metric", async () => {
    const ds = createFixtureDataSource({
      scenario: "default",
      overrides: { health: () => Promise.reject(new Error("health indisponível")) },
    });
    renderGate(ds, "rag");
    expect(await screen.findByText(/theokit studio up/)).toBeTruthy();
    const errorCount = metrics.snapshot().health_errors_total.total;
    expect(errorCount).toBe(1);
  });
});
