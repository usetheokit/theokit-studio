// @vitest-environment node
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { Readable } from "node:stream";
import { handleAgentRun, matchRunPath, type RunStreamInput } from "./run-endpoint";

// Run endpoint (T1.4, D4's degraded branch — spike Q1: the bridge has no RunEvent seam,
// theokit#132): NDJSON {message|done|error}; `run-event` stays RESERVED in the vocabulary
// (T3.1's parser handles the superset). Origin verified BEFORE reading the body; the provider
// key mirrors theokit's convention (agent-middleware.ts:231 — apiKey only, first match).

const FIXTURE = join(import.meta.dirname, "../tests/fixtures/demo-project");
const realLoad = (file: string) => import(/* @vite-ignore */ file) as Promise<unknown>;

interface FakeRes {
  statusCode: number | undefined;
  headers: Record<string, string>;
  body: string;
  ended: boolean;
  res: ServerResponse;
}

function makeRes(): FakeRes {
  const state: FakeRes = {
    statusCode: undefined,
    headers: {},
    body: "",
    ended: false,
    res: undefined as unknown as ServerResponse,
  };
  state.res = {
    writeHead(code: number, headers?: Record<string, string>) {
      state.statusCode = code;
      Object.assign(state.headers, headers ?? {});
      return state.res;
    },
    write(chunk: unknown) {
      if (state.ended) throw new Error("write after end");
      state.body += String(chunk);
      return true;
    },
    end(chunk?: unknown) {
      if (chunk !== undefined) state.body += String(chunk);
      state.ended = true;
      return state.res;
    },
    get writableEnded() {
      return state.ended;
    },
    // M6 EC-2: headersSent is explicit (not an implicit `undefined`), mirroring writeHead.
    get headersSent() {
      return state.statusCode !== undefined;
    },
  } as unknown as ServerResponse;
  return state;
}

interface FakeReqOptions {
  body?: string;
  origin?: string;
  method?: string;
}

function makeReq(opts: FakeReqOptions = {}): IncomingMessage & { bodySubscribed: boolean } {
  const req = Readable.from(opts.body === undefined ? [] : [opts.body]) as Readable & {
    method: string;
    headers: Record<string, string | undefined>;
    bodySubscribed: boolean;
  };
  req.method = opts.method ?? "POST";
  req.headers = { host: "localhost:5173", origin: opts.origin };
  req.bodySubscribed = false;
  const origOn = req.on.bind(req);
  req.on = ((event: string, listener: (...args: unknown[]) => void) => {
    if (event === "data" || event === "readable") req.bodySubscribed = true;
    return origOn(event, listener);
  }) as typeof req.on;
  return req as unknown as IncomingMessage & { bodySubscribed: boolean };
}

function parseLines(body: string): Array<{ kind: string; [k: string]: unknown }> {
  return body
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as { kind: string });
}

interface RunCall {
  input: RunStreamInput;
}

function makeDeps(overrides: Partial<Parameters<typeof handleAgentRun>[3]> = {}) {
  const calls: RunCall[] = [];
  const loadCalls: string[] = [];
  const deps = {
    projectRoot: FIXTURE,
    load: (file: string) => {
      loadCalls.push(file);
      return realLoad(file);
    },
    env: { ANTHROPIC_API_KEY: "test-key" } as Record<string, string | undefined>,
    streamFactory: async function* (_c: unknown, _k: string, input: RunStreamInput) {
      calls.push({ input });
      yield { type: "text-delta", delta: "hello" };
      yield { type: "text-delta", delta: " world" };
    },
    ...overrides,
  };
  return { deps, calls, loadCalls };
}

async function run(
  pathname: string,
  req: IncomingMessage,
  deps: Parameters<typeof handleAgentRun>[3],
) {
  const state = makeRes();
  await handleAgentRun(pathname, req, state.res, deps);
  return state;
}

describe("matchRunPath (T1.4)", () => {
  it("test_nested_agent_name_with_slash_resolves", () => {
    expect(matchRunPath("/_studio/api/agents/team/support/run")).toEqual({
      kind: "match",
      name: "team/support",
    });
    expect(matchRunPath("/_studio/api/agents/team%2Fsupport/run")).toEqual({
      kind: "match",
      name: "team/support",
    });
    expect(matchRunPath("/_studio/api/agents/support")).toBeNull();
    // Malformed percent-encoding → discriminated kind (EC-5: never an unhandled URIError).
    expect(matchRunPath("/_studio/api/agents/%/run")).toEqual({ kind: "malformed" });
  });

  it("test_agent_literally_named_malformed_still_resolves", () => {
    // Regression (SEPA pre-COMMIT T1.4): the sentinel string collided with the domain of
    // valid names — an agent at agents/malformed.ts was treated as an encoding error.
    expect(matchRunPath("/_studio/api/agents/malformed/run")).toEqual({
      kind: "match",
      name: "malformed",
    });
  });
});

describe("handleAgentRun (T1.4)", () => {
  it("test_run_streams_ndjson_message_chunks_then_done", async () => {
    const { deps, calls } = makeDeps();
    const state = await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    expect(state.statusCode).toBe(200);
    expect(state.headers["Content-Type"]).toBe("application/x-ndjson");
    const lines = parseLines(state.body);
    expect(lines.map((l) => l.kind)).toEqual(["message", "message", "done"]);
    // NORMAL completion does not fire abort (a post-end close is a no-op).
    expect(calls[0]?.input.signal.aborted).toBe(false);
  });

  it("test_run_stream_contains_no_run_event_lines", async () => {
    // Locks the degraded contract (D4/theokit#132): only message|done until the bridge exposes the seam.
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    const kinds = new Set(parseLines(state.body).map((l) => l.kind));
    expect([...kinds].every((k) => k === "message" || k === "done")).toBe(true);
  });

  it("test_session_id_from_body_reused_and_defaulted", async () => {
    const { deps, calls } = makeDeps();
    await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi", sessionId: "sess-42" }) }),
      deps,
    );
    // The body's sessionId is preserved (the playground's multi-turn continuity).
    expect(calls[0]?.input.sessionId).toBe("sess-42");
    await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    // Absent → a UUID generated per request.
    expect(calls[1]?.input.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("test_cross_origin_request_rejected_before_any_work", async () => {
    const { deps, loadCalls, calls } = makeDeps();
    const req = makeReq({
      body: JSON.stringify({ message: "hi" }),
      origin: "http://evil.example:9999",
    });
    const state = await run("/_studio/api/agents/support/run", req, deps);
    expect(state.statusCode).toBe(403);
    expect(parseLines(state.body)[0]).toBeTruthy();
    expect(JSON.parse(state.body).error.code).toBe("ORIGIN_FORBIDDEN");
    // BEFORE any work: agent not loaded, stream not created, body not read.
    expect(loadCalls.length).toBe(0);
    expect(calls.length).toBe(0);
    expect(req.bodySubscribed).toBe(false);
  });

  it("test_opaque_origin_null_rejected_403", async () => {
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }), origin: "null" }),
      deps,
    );
    expect(state.statusCode).toBe(403);
  });

  it("test_malformed_origin_header_rejected_403_not_500", async () => {
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }), origin: "not-a-url" }),
      deps,
    );
    expect(state.statusCode).toBe(403);
  });

  it("test_missing_api_key_returns_424_with_expected_vars", async () => {
    const { deps } = makeDeps({ env: {} });
    const state = await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    expect(state.statusCode).toBe(424);
    const err = JSON.parse(state.body).error as { code: string; message: string };
    expect(err.code).toBe("PROVIDER_KEY_MISSING");
    // Names the 3 vars in priority order (parity with theokit's resolver).
    for (const v of ["OPENROUTER_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]) {
      expect(err.message).toContain(v);
    }
  });

  it("test_blank_message_rejected_400", async () => {
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "   " }) }),
      deps,
    );
    expect(state.statusCode).toBe(400);
    expect(JSON.parse(state.body).error.code).toBe("BAD_REQUEST");
  });

  it("test_malformed_json_body_rejected_400", async () => {
    const { deps } = makeDeps();
    const state = await run("/_studio/api/agents/support/run", makeReq({ body: "{nope" }), deps);
    expect(state.statusCode).toBe(400);
    expect(JSON.parse(state.body).error.code).toBe("BAD_REQUEST");
  });

  it("test_unknown_agent_404", async () => {
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/ghost/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    expect(state.statusCode).toBe(404);
    expect(JSON.parse(state.body).error.code).toBe("AGENT_NOT_FOUND");
  });

  // M8 T2.1 / review F-arch-2: the guards' ORDER is a contract and can only be pinned HERE.
  // The equivalent integration test does not serve: the dispatcher pre-checks `matchRunPath`
  // (plugin/index.ts:105) and answers 404 + NOT_FOUND + the SAME message as guard 1, so the
  // assertion cannot tell the two origins apart and guard 1 could be deleted without going RED.
  it("test_unmatched_route_is_404_even_when_the_method_is_wrong", async () => {
    const { deps } = makeDeps();
    const state = await run("/_studio/api/not-a-run-route", makeReq({ method: "GET" }), deps);
    expect(state.statusCode).toBe(404);
    expect(JSON.parse(state.body).error.code).toBe("NOT_FOUND");
  });

  // Review F-tests-3 / F-xval-3: guard #2 (malformed percent-encoding) and guard #1 (a route
  // that does not match) were NOT covered as a RESPONSE — the existing test asserts the return
  // value of
  // `matchRunPath`, not the HTTP envelope. #2 is reachable in production: `/…/agents/%/run` casa
  // prefix and suffix, so the dispatcher dispatches and the guard fires.
  it("test_malformed_percent_encoding_in_agent_name_rejected_400", async () => {
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/%/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    expect(state.statusCode).toBe(400);
    const body = JSON.parse(state.body);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toContain("percent-encoding");
  });

  it("test_broken_agent_returns_422_with_module_error", async () => {
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/nested/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    // nested/index.ts exports a non-agent → compile fails → typed error, never a raw 500.
    expect(state.statusCode).toBe(422);
    expect(JSON.parse(state.body).error.code).toBe("AGENT_INVALID");
  });

  it("test_mid_stream_error_emits_error_line_and_ends_without_done", async () => {
    const { deps } = makeDeps({
      streamFactory: async function* () {
        yield { type: "text-delta", delta: "partial" };
        throw new Error("provider exploded mid-run");
      },
    });
    const state = await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    const lines = parseLines(state.body);
    expect(lines.map((l) => l.kind)).toEqual(["message", "error"]);
    expect(JSON.stringify(lines[1])).toContain("provider exploded mid-run");
    // done NEVER after an error.
    expect(lines.some((l) => l.kind === "done")).toBe(false);
    expect(state.ended).toBe(true);
  });

  it("test_late_write_after_end_is_dropped_by_guard", async () => {
    // The generator tries to yield after the response ended (an error mid-way) — the guard
    // discards without throwing (EC-7: a write-after-end never brings the process down).
    // Deterministic barrier (review F-dom-test): the generator awaits a gate the test resolves
    // AFTER the close — no wall-clock race (testing.md § 6).
    let lateYieldReached = false;
    let openGate = () => {};
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const firstChunk = createDeferred();
    const { deps } = makeDeps({
      streamFactory: async function* (_c, _k, input: RunStreamInput) {
        yield { type: "text-delta", delta: "one" };
        firstChunk.resolve();
        await gate; // proceeds only once the test releases it (after the close)
        if (!input.signal.aborted) lateYieldReached = true;
        yield { type: "text-delta", delta: "late" };
      },
    });
    const req = makeReq({ body: JSON.stringify({ message: "hi" }) });
    const state = makeRes();
    const done = handleAgentRun("/_studio/api/agents/support/run", req, state.res, deps);
    await firstChunk.promise; // the first chunk is guaranteed written
    (req as unknown as Readable).emit("close");
    openGate(); // releases the generator with the signal already aborted
    await done;
    expect(lateYieldReached).toBe(false);
    const kinds = parseLines(state.body).map((l) => l.kind);
    expect(kinds.filter((k) => k === "message").length).toBe(1);
  });

  it("test_client_disconnect_aborts_the_stream", async () => {
    // Deterministic barrier (review F-dom-test): ordering enforced, not hoped for.
    let finallyRan = false;
    let observedAborted = false;
    let openGate = () => {};
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const firstChunk = createDeferred();
    const { deps } = makeDeps({
      streamFactory: async function* (_c, _k, input: RunStreamInput) {
        try {
          yield { type: "text-delta", delta: "chunk-1" };
          firstChunk.resolve();
          await gate; // waits for the test to emit close and release
          observedAborted = input.signal.aborted;
          yield { type: "text-delta", delta: "chunk-2" };
        } finally {
          finallyRan = true;
        }
      },
    });
    const req = makeReq({ body: JSON.stringify({ message: "hi" }) });
    const state = makeRes();
    const done = handleAgentRun("/_studio/api/agents/support/run", req, state.res, deps);
    await firstChunk.promise;
    (req as unknown as Readable).emit("close");
    openGate();
    await done;
    // Cancellation propagation: signal aborted (deterministically), generator finalised.
    expect(observedAborted).toBe(true);
    expect(finallyRan).toBe(true);
  });
});

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
