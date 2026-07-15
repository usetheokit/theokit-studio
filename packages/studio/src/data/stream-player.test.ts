import { createFixtureDataSource } from "./fixture-datasource";
import { DEFAULT_RUN, LONG_RUN } from "./fixtures/run-script";
import { metrics } from "./metrics";
import { play } from "./stream-player";

const collect = async <E>(iterable: AsyncIterable<E>): Promise<E[]> => {
  const out: E[] = [];
  for await (const item of iterable) {
    out.push(item);
  }
  return out;
};

describe("stream player (T1.2 — ADR D3)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("yields_all_events_in_script_order_with_zero_delay", async () => {
    const events = await collect(play(DEFAULT_RUN, { delayMs: 0 }));
    expect(events.map((e) => e.type)).toEqual(DEFAULT_RUN.map((s) => s.event.type));
    expect(events.length).toBe(DEFAULT_RUN.length);
  });

  it("default_script_covers_five_categories_and_ends_with_turn_ended", async () => {
    const types = DEFAULT_RUN.map((s) => s.event.type);
    expect(types).toContain("text-delta");
    expect(types).toContain("tool-call-started");
    expect(types).toContain("tool-call-completed");
    expect(types).toContain("permission_denied");
    expect(types).toContain("rate_limit");
    expect(types.at(-1)).toBe("turn-ended");
  });

  it("abort_signal_stops_playback_without_rejection", async () => {
    const controller = new AbortController();
    let count = 0;
    for await (const _event of play(DEFAULT_RUN, { delayMs: 0, signal: controller.signal })) {
      count += 1;
      if (count === 3) {
        controller.abort();
      }
    }
    expect(count).toBe(3);
  });

  it("pre_aborted_signal_yields_nothing", async () => {
    const controller = new AbortController();
    controller.abort();
    const events = await collect(play(DEFAULT_RUN, { delayMs: 0, signal: controller.signal }));
    expect(events.length).toBe(0);
  });

  it("empty_script_completes_without_yield", async () => {
    const events = await collect(play([], { delayMs: 0 }));
    expect(events.length).toBe(0);
  });

  it("out_of_order_timestamps_clamp_delay_to_zero", async () => {
    const script = [
      { at: 100, event: { type: "a" } },
      { at: 50, event: { type: "b" } },
      { at: 10, event: { type: "c" } },
    ];
    const start = Date.now();
    const events = await collect(play(script));
    expect(events.map((e) => e.type)).toEqual(["a", "b", "c"]);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("concurrent_players_do_not_share_state", async () => {
    const [a, b] = await Promise.all([
      collect(play(DEFAULT_RUN, { delayMs: 0 })),
      collect(play(LONG_RUN, { delayMs: 0 })),
    ]);
    expect(a.length).toBe(DEFAULT_RUN.length);
    expect(b.length).toBe(LONG_RUN.length);
  });

  it("long_script_has_100_plus_events", () => {
    expect(LONG_RUN.length).toBeGreaterThanOrEqual(100);
  });

  it("runAgent_streams_default_script_and_increments_metric", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const events = await collect(ds.runAgent("support-agent", "cadê meu pedido?"));
    expect(events.length).toBe(DEFAULT_RUN.length);
    expect(metrics.snapshot().stream_events_played_total.total).toBe(DEFAULT_RUN.length);
    expect(metrics.snapshot().datasource_calls_total.runAgent).toBe(1);
  });
});
