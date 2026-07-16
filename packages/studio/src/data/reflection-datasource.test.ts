import { createFixtureDataSource } from "./fixture-datasource";
import { metrics } from "./metrics";
import {
  chunkToStudioEvent,
  createReflectionDataSource,
  MalformedStreamLineError,
  parseNdjson,
  RunStreamError,
} from "./reflection-datasource";
import type { StudioEvent } from "./types";

// ReflectionDataSource (T3.1, ADR D5): adapter live sobre /_studio/api/* decorando o
// FixtureDataSource (superfícies não-reflection). Parser NDJSON trata o SUPERSET
// {message|run-event|error|done} (run-event reservado — theokit#132). O mapeador
// chunkToStudioEvent é a camada anti-corrupção (decisão (c) do SEPA: o vocabulário da
// UI é o contrato; chunk do bridge nunca vaza cru — evidência event-to-part.ts guard never).

function ndjsonResponse(lines: unknown[], status = 200): Response {
  const body = lines.map((l) => JSON.stringify(l)).join("\n");
  return new Response(body, { status, headers: { "Content-Type": "application/x-ndjson" } });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function makeDs(routes: Record<string, () => Response | Promise<Response>>) {
  const calls: Array<{ url: string; body?: unknown }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const key = Object.keys(routes).find((r) => url.includes(r));
    if (!key) throw new Error(`no stub route for ${url}`);
    const r = routes[key];
    if (!r) throw new Error(`no stub route for ${url}`);
    return r();
  };
  const ds = createReflectionDataSource({
    fallback: createFixtureDataSource({ scenario: "default" }),
    fetchImpl,
  });
  return { ds, calls };
}

async function collect(iter: AsyncIterable<StudioEvent>): Promise<StudioEvent[]> {
  const out: StudioEvent[] = [];
  for await (const e of iter) out.push(e);
  return out;
}

beforeEach(() => {
  metrics.reset();
});

describe("parseNdjson (T3.1)", () => {
  async function* chunksOf(...parts: string[]) {
    for (const p of parts) yield new TextEncoder().encode(p);
  }

  it("test_ndjson_parser_handles_split_lines_across_chunks", async () => {
    const lines: unknown[] = [];
    for await (const l of parseNdjson(
      chunksOf('{"kind":"mes', 'sage","chunk":1}\n{"kind":"done"}\n'),
    )) {
      lines.push(l);
    }
    expect(lines).toEqual([{ kind: "message", chunk: 1 }, { kind: "done" }]);
  });

  it("test_ndjson_parser_flushes_trailing_line_without_newline", async () => {
    const lines: unknown[] = [];
    for await (const l of parseNdjson(chunksOf('{"kind":"done"}'))) lines.push(l);
    expect(lines).toEqual([{ kind: "done" }]);
  });

  it("test_ndjson_malformed_line_raises_typed_error_with_context", async () => {
    await expect(async () => {
      for await (const _ of parseNdjson(chunksOf("{nope}\n"))) {
        // nunca chega
      }
    }).rejects.toThrow(MalformedStreamLineError);
    await expect(async () => {
      for await (const _ of parseNdjson(chunksOf("{nope}\n"))) {
        // nunca chega
      }
    }).rejects.toThrow(/\{nope\}/);
  });
});

describe("chunkToStudioEvent (T3.1 — anti-corrupção)", () => {
  it("test_text_delta_chunk_maps_to_studio_text_delta", () => {
    const out = chunkToStudioEvent({ type: "text-delta", id: "t1", delta: "hello" }, new Map());
    expect(out).toEqual({ type: "text-delta", text: "hello" });
  });

  it("test_tool_chunks_map_with_call_state_for_names", () => {
    const names = new Map<string, string>();
    const started = chunkToStudioEvent(
      { type: "tool-input-available", toolCallId: "c1", toolName: "lookupOrder", input: { id: 1 } },
      names,
    );
    expect(started).toMatchObject({
      type: "tool-call-started",
      callId: "c1",
      toolCall: { callId: "c1", name: "lookupOrder", args: { id: 1 } },
    });
    // Output NÃO carrega o nome — vem do estado por run (SEPA: upsert sem nome corromperia).
    const completed = chunkToStudioEvent(
      { type: "tool-output-available", toolCallId: "c1", output: "ok" },
      names,
    );
    expect(completed).toMatchObject({
      type: "tool-call-completed",
      callId: "c1",
      toolCall: { callId: "c1", name: "lookupOrder", result: "ok" },
    });
  });

  it("test_unmappable_chunk_is_dropped_with_metric_never_leaked_raw", () => {
    const out = chunkToStudioEvent({ type: "data-checkpoint", sessionId: "x" }, new Map());
    expect(out).toBeNull();
    expect(metrics.snapshot().reflection_chunks_dropped_total?.["data-checkpoint"]).toBe(1);
  });
});

describe("createReflectionDataSource (T3.1)", () => {
  it("test_list_agents_maps_reflection_payload_to_agent_summary", async () => {
    const { ds } = makeDs({
      "/api/agents": () =>
        jsonResponse({
          items: [
            {
              name: "support",
              filePath: "agents/support.ts",
              model: "anthropic/claude-sonnet-4-6",
              tools: [],
            },
          ],
        }),
    });
    const agents = await ds.listAgents();
    expect(agents).toEqual([
      {
        id: "support",
        name: "support",
        description: "agents/support.ts",
        model: "anthropic/claude-sonnet-4-6",
      },
    ]);
    expect(metrics.snapshot().datasource_calls_total?.listAgents).toBe(1);
  });

  it("test_broken_agent_maps_with_visible_error_marker", async () => {
    const { ds } = makeDs({
      "/api/agents": () =>
        jsonResponse({
          items: [{ name: "nested", filePath: "agents/nested/index.ts", error: "boom" }],
        }),
    });
    const agents = await ds.listAgents();
    expect(agents[0]?.description).toBe("⚠ failed to load: boom");
  });

  it("test_run_agent_yields_mapped_events_and_stops_on_done", async () => {
    const { ds } = makeDs({
      "/run": () =>
        ndjsonResponse([
          { kind: "message", chunk: { type: "text-delta", id: "t", delta: "hi" } },
          // run-event reservado (superset): passa direto como StudioEvent (RunEvent do SDK).
          { kind: "run-event", event: { type: "rate_limit", attempt: 1 } },
          { kind: "done" },
          { kind: "message", chunk: { type: "text-delta", id: "t", delta: "NUNCA" } },
        ]),
    });
    const events = await collect(ds.runAgent("support", "oi"));
    expect(events).toEqual([
      { type: "text-delta", text: "hi" },
      { type: "rate_limit", attempt: 1 },
    ]);
  });

  it("test_run_agent_error_line_raises_after_prior_events", async () => {
    const { ds } = makeDs({
      "/run": () =>
        ndjsonResponse([
          { kind: "message", chunk: { type: "text-delta", id: "t", delta: "parcial" } },
          { kind: "error", error: { code: "RUN_FAILED", message: "provider exploded" } },
        ]),
    });
    const seen: StudioEvent[] = [];
    await expect(async () => {
      for await (const e of ds.runAgent("support", "oi")) seen.push(e);
    }).rejects.toThrow(RunStreamError);
    expect(seen).toEqual([{ type: "text-delta", text: "parcial" }]);
  });

  it("test_run_agent_keeps_stable_session_id_per_agent", async () => {
    const { ds, calls } = makeDs({ "/run": () => ndjsonResponse([{ kind: "done" }]) });
    await collect(ds.runAgent("support", "primeiro"));
    await collect(ds.runAgent("support", "segundo"));
    await collect(ds.runAgent("billing", "outro agent"));
    const runCalls = calls.filter((c) => c.url.includes("/run"));
    const [c1, c2, c3] = runCalls as Array<{ body: { sessionId?: string } }>;
    const s1 = c1?.body.sessionId;
    const s2 = c2?.body.sessionId;
    const s3 = c3?.body.sessionId;
    // Multi-turn: mesmo agent → MESMO sessionId (memória de conversa); agents ≠ → ids ≠.
    expect(s1).toBeTruthy();
    expect(s1).toBe(s2);
    expect(s3).not.toBe(s1);
  });

  it("test_run_agent_ignores_generation_params_with_visible_warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { ds, calls } = makeDs({ "/run": () => ndjsonResponse([{ kind: "done" }]) });
    await collect(ds.runAgent("support", "oi", undefined, { temperature: 0.2, model: "x" }));
    // Honestidade: params sem destino no run endpoint NÃO são enviados (nunca campos
    // silenciosamente descartados pelo server) — warn 1× documenta a limitação.
    const body = calls[0]?.body as Record<string, unknown>;
    expect(body.temperature).toBeUndefined();
    expect(body.model).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    await collect(ds.runAgent("support", "de novo", undefined, { topP: 0.5 }));
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("test_non_reflection_surfaces_delegate_to_fixture_fallback", async () => {
    const { ds } = makeDs({});
    const prompts = await ds.listPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    // Métrica contada pelo fallback (uma vez — sem dupla contagem no decorator).
    expect(metrics.snapshot().datasource_calls_total?.listPrompts).toBe(1);
  });

  it("test_health_studio_online_theo_data_offline_in_live_mode", async () => {
    const { ds } = makeDs({ "/api/health": () => jsonResponse({ ok: true, studio: "0.0.0" }) });
    const health = await ds.health();
    expect(health.studio.status).toBe("online");
    for (const svc of ["memory", "lens", "rag"] as const) {
      expect(health[svc].status).toBe("offline");
      expect(health[svc].hint).toContain("theokit studio up");
    }
  });

  it("test_health_offline_when_fetch_rejects", async () => {
    const ds = createReflectionDataSource({
      fallback: createFixtureDataSource({ scenario: "default" }),
      fetchImpl: () => Promise.reject(new Error("dev server down")),
    });
    const health = await ds.health();
    expect(health.studio.status).toBe("offline");
    expect(health.studio.hint).toContain("dev server");
  });

  it("test_list_tools_and_workflows_map_aggregates", async () => {
    const { ds } = makeDs({
      "/api/tools": () =>
        jsonResponse({ items: [{ name: "lookupOrder", description: "Look up", usedBy: 2 }] }),
      "/api/workflows": () =>
        jsonResponse({
          items: [
            {
              id: "billing/triage",
              name: "triage",
              agent: "billing",
              source: "subagent",
              note: "n",
            },
          ],
        }),
    });
    const tools = await ds.listTools();
    expect(tools[0]).toMatchObject({ id: "lookupOrder", name: "lookupOrder", usedBy: 2 });
    const workflows = await ds.listWorkflows();
    expect(workflows[0]).toMatchObject({ id: "billing/triage", name: "triage", steps: [] });
  });
});

describe("abort propagation (T3.1 — concorrência)", () => {
  it("test_abort_signal_cancels_run_agent_iteration", async () => {
    const controller = new AbortController();
    const encoder = new TextEncoder();
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        pulls += 1;
        if (pulls === 1) {
          c.enqueue(
            encoder.encode(
              '{"kind":"message","chunk":{"type":"text-delta","id":"t","delta":"1"}}\n',
            ),
          );
        }
        // segunda pull nunca entrega — o abort deve encerrar a iteração
      },
    });
    const fetchImpl: typeof fetch = async (_url, init) => {
      expect(init?.signal).toBe(controller.signal);
      return new Response(body, { status: 200 });
    };
    const ds = createReflectionDataSource({
      fallback: createFixtureDataSource({ scenario: "default" }),
      fetchImpl,
    });
    const seen: StudioEvent[] = [];
    for await (const e of ds.runAgent("support", "oi", controller.signal)) {
      seen.push(e);
      controller.abort();
    }
    // Abort → iteração TERMINA (return limpo — LSP com o contrato do fixture; nunca throw).
    expect(seen.length).toBe(1);
  });
});
