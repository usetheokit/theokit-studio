// Contadores dev in-memory (ADR D5). Expostos em window.__STUDIO_METRICS__ pelo bootstrap
// (T2.1) e assertados não-zero no teste de integração (Global DoD — wiring pillar c).

// M7 T3.1: só entra aqui nome que tem emissor em produção. Quatro nomes
// (stream_events_played_total, health_errors_total, unknown_events_total,
// reflection_chunks_dropped_total) foram removidos: nasceram com as telas cortadas em `74a96c6`
// e ficaram zerados para sempre — quem lia `health_errors_total: {}` concluía "não houve erro"
// quando o fato era "ninguém conta". `metrics.test.ts` trava a correspondência.
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
  // reset() existe para independência entre testes (testing.md § 3 — SEPA brief).
  reset(): void {
    state = emptyState();
  },
};
