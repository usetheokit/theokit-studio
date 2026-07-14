// Contadores dev in-memory (ADR D5). Expostos em window.__STUDIO_METRICS__ pelo bootstrap
// (T2.1) e assertados não-zero no teste de integração (Global DoD — wiring pillar c).

export type CounterName =
  | "datasource_calls_total"
  | "stream_events_played_total"
  | "health_errors_total"
  | "unknown_events_total";

type CounterLabels = Record<string, number>;
type MetricsSnapshot = Record<CounterName, CounterLabels>;

const emptyState = (): MetricsSnapshot => ({
  datasource_calls_total: {},
  stream_events_played_total: {},
  health_errors_total: {},
  unknown_events_total: {},
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
  // reset() existe para independência entre testes (testing.md § 3 — SEPA brief).
  reset(): void {
    state = emptyState();
  },
};
