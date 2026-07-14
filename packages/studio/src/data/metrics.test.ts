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
    metrics.increment("stream_events_played_total");
    metrics.reset();
    expect(metrics.snapshot().stream_events_played_total.total ?? 0).toBe(0);
  });

  it("snapshot_returns_a_copy_not_a_live_reference", () => {
    metrics.increment("datasource_calls_total", "health");
    const snap = metrics.snapshot();
    metrics.increment("datasource_calls_total", "health");
    expect(snap.datasource_calls_total.health).toBe(1);
  });
});
