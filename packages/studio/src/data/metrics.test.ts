import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { metrics } from "./metrics";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INCREMENT_CALL_RE = /metrics\.increment\(\s*"([^"]+)"/g;

/** Nomes de contador que aparecem num `metrics.increment("...")` fora de arquivo de teste. */
function emittersFoundInProductionSource(dir = SRC_ROOT, found = new Set<string>()): Set<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "test") emittersFoundInProductionSource(full, found);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
    for (const match of readFileSync(full, "utf8").matchAll(INCREMENT_CALL_RE)) {
      found.add(match[1] as string);
    }
  }
  return found;
}

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
  // "ninguém conta".
  //
  // O oráculo VARRE o código de produção em vez de travar uma lista literal (review
  // F-tests-4 / F-arch-7): a versão anterior tinha o nome deste teste mas só comparava com
  // `["datasource_calls_total"]`, então adicionar um contador sem emissor e atualizar a
  // literal deixava o teste verde — exatamente o defeito que ele diz pegar.
  it("every_declared_counter_has_a_production_emitter", () => {
    const declared = new Set(Object.keys(metrics.snapshot()));
    const emitted = emittersFoundInProductionSource();
    expect([...declared].sort()).toEqual([...emitted].sort());
  });

  it("snapshot_returns_a_copy_not_a_live_reference", () => {
    metrics.increment("datasource_calls_total", "health");
    const snap = metrics.snapshot();
    metrics.increment("datasource_calls_total", "health");
    expect(snap.datasource_calls_total.health).toBe(1);
  });
});
