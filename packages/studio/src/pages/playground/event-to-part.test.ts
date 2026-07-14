import { DEFAULT_RUN } from "../../data/fixtures/run-script";
import { metrics } from "../../data/metrics";
import { applyEvent, initialPlayback, type PlaybackState } from "./event-to-part";

const runAll = (events: ReadonlyArray<(typeof DEFAULT_RUN)[number]["event"]>): PlaybackState =>
  events.reduce((s, e) => applyEvent(s, e), initialPlayback);

describe("event-to-part (T3.1 — converter puro)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("converts_text_deltas_into_accumulated_assistant_text", () => {
    const state = runAll([
      { type: "text-delta", text: "a " },
      { type: "text-delta", text: "b " },
      { type: "text-delta", text: "c" },
    ]);
    const textParts = state.parts.filter((p) => p.kind === "text");
    expect(textParts.length).toBe(1);
    const finalText = textParts[0]?.kind === "text" ? textParts[0].text : "";
    expect(finalText).toBe("a b c");
  });

  it("tool_call_lifecycle_opens_and_closes_card_state", () => {
    const started = DEFAULT_RUN[3]?.event;
    const completed = DEFAULT_RUN[4]?.event;
    if (!started || !completed) throw new Error("fixture");
    const state = runAll([started, completed]);
    const tools = state.parts.filter((p) => p.kind === "tool");
    expect(tools.length).toBe(1);
    const tool = tools[0];
    if (tool?.kind !== "tool") throw new Error("shape");
    expect(tool.done).toBe(true);
    expect(tool.name).toBe("lookupOrder");
    expect(tool.result).toBeTruthy();
  });

  it("permission_denied_and_rate_limit_become_visible_notices", () => {
    const denied = DEFAULT_RUN[5]?.event;
    const limited = DEFAULT_RUN[6]?.event;
    if (!denied || !limited) throw new Error("fixture");
    const state = runAll([denied, limited]);
    const notices = state.parts.filter((p) => p.kind === "notice");
    expect(notices.length).toBe(2);
    expect(notices.map((n) => (n.kind === "notice" ? n.notice : ""))).toEqual([
      "permission-denied",
      "rate-limit",
    ]);
  });

  it("turn_ended_finishes_the_run", () => {
    const state = runAll([{ type: "text-delta", text: "x" }, { type: "turn-ended" }]);
    expect(state.isRunning).toBe(false);
  });

  it("unknown_event_type_maps_to_unknown_part_not_throw", () => {
    const bogus = { type: "zzz-novo-evento" } as unknown as (typeof DEFAULT_RUN)[number]["event"];
    const state = applyEvent(initialPlayback, bogus);
    const unknown = state.parts.filter((p) => p.kind === "unknown");
    expect(unknown.length).toBe(1);
    expect(metrics.snapshot().unknown_events_total.total).toBe(1);
  });

  it("full_default_run_produces_one_turn_with_tool_and_notices", () => {
    const state = runAll(DEFAULT_RUN.map((s) => s.event));
    expect(state.isRunning).toBe(false);
    expect(state.parts.some((p) => p.kind === "tool" && p.done)).toBe(true);
    expect(state.parts.filter((p) => p.kind === "notice").length).toBe(2);
    const expectedFromScript = "Olá! Vou verificar o status do seu pedido.";
    const firstText = state.parts.find((p) => p.kind === "text");
    expect(firstText?.kind === "text" ? firstText.text : "").toBe(expectedFromScript);
  });
});
