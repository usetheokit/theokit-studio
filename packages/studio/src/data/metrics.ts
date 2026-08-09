// In-memory dev counters (ADR D5). Exposed on window.__STUDIO_METRICS__ by the bootstrap
// (T2.1) and asserted non-zero in the integration test (Global DoD — wiring pillar c).

// M7 T3.1: only a name with an emitter in production belongs here. Four names
// (stream_events_played_total, health_errors_total, unknown_events_total,
// reflection_chunks_dropped_total) were removed: they were born with the screens cut in
// `74a96c6` and stayed at zero forever — anyone reading `health_errors_total: {}` concluded
// "there were no errors" when the fact was "nobody counts". `metrics.test.ts` pins the match.
export type CounterName = "datasource_calls_total";

type CounterLabels = Record<string, number>;
type MetricsSnapshot = Record<CounterName, CounterLabels>;

const emptyState = (): MetricsSnapshot => ({
  datasource_calls_total: {},
});

let state = emptyState();

export const metrics = {
  increment(counter: CounterName, label = "total"): void {
    const labels = state[counter];
    labels[label] = (labels[label] ?? 0) + 1;
  },
  snapshot(): MetricsSnapshot {
    return structuredClone(state);
  },
  // reset() exists for independence between tests (testing.md § 3 — SEPA brief).
  reset(): void {
    state = emptyState();
  },
};
