import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { metrics } from "../../data/metrics";
import { MetricsPage } from "./index";

describe("Metrics (real in-memory dev metrics)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("empty_registry_shows_honest_empty_state", async () => {
    render(<MetricsPage />);
    expect(await screen.findByTestId("metrics-empty")).toBeTruthy();
  });

  it("recorded_metrics_appear_as_rows_after_refresh", async () => {
    render(<MetricsPage />);
    metrics.increment("datasource_calls_total", "listAgents");
    metrics.increment("datasource_calls_total", "listAgents");
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    const rows = await screen.findAllByTestId("metric-row");
    const agents = rows.find((r) => r.textContent?.includes("listAgents"));
    expect(agents?.textContent).toContain("datasource_calls_total");
    expect(agents?.textContent).toContain("2");
  });
});
