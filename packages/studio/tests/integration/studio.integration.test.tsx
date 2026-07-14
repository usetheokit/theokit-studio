import { render, screen } from "@testing-library/react";
import { App } from "../../src/app";
import { DataSourceProvider, useDataSource } from "../../src/data/datasource";
import { createFixtureDataSource } from "../../src/data/fixture-datasource";
import { metrics } from "../../src/data/metrics";

// Teste de integração incremental (Fase Final expande para as 5 superfícies + prova
// completa de métricas, per plano § Final Phase — reconciliado no log da iteração 1).
describe("Studio integration", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("mounts_the_full_app_shell", () => {
    render(<App />);
    expect(screen.getByTestId("studio-smoke")).toBeTruthy();
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
