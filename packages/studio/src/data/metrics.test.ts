import { metrics } from "./metrics";

describe("metrics (T1.1 — ADR D5)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("increments_counter_per_datasource_call", () => {
    metrics.increment("datasource_calls_total", "listAgents");
    metrics.increment("datasource_calls_total", "listAgents");
    const snapshotCount = metrics.snapshot().datasource_calls_total.listAgents;
    expect(snapshotCount).toBe(2);
  });

  it("reset_clears_all_counters", () => {
    metrics.increment("datasource_calls_total");
    metrics.reset();
    const afterReset = metrics.snapshot().datasource_calls_total.total ?? 0;
    expect(afterReset).toBe(0);
  });

  // M7 T3.1: um contador declarado sem emissor aparece zerado para sempre em
  // window.__STUDIO_METRICS__ — e quem lê conclui "não houve erro" onde o certo é
  // "ninguém conta". Esta é a trava contra reintroduzir um nome sem emissor.
  it("every_declared_counter_has_a_production_emitter", () => {
    const declared = Object.keys(metrics.snapshot());
    expect(declared).toEqual(["datasource_calls_total"]);
  });

  it("snapshot_returns_a_copy_not_a_live_reference", () => {
    metrics.increment("datasource_calls_total", "health");
    const snap = metrics.snapshot();
    metrics.increment("datasource_calls_total", "health");
    expect(snap.datasource_calls_total.health).toBe(1);
  });
});
