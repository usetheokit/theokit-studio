// @vitest-environment node
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { Readable } from "node:stream";
import { handleAgentRun, matchRunPath, type RunStreamInput } from "./run-endpoint";

// Run endpoint (T1.4, ramo degradado do D4 — spike Q1: bridge sem seam de RunEvent,
// theokit#132): NDJSON {message|done|error}; `run-event` fica RESERVADO no vocabulário
// (o parser de T3.1 trata o superset). Origem verificada ANTES de ler o body; provider
// key espelha a convenção do theokit (agent-middleware.ts:231 — apiKey only, first-match).

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
    // M6 EC-2: headersSent explícito (não `undefined` implícito), refletindo writeHead.
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
    // Percent-encoding malformado → kind discriminado (EC-5: nunca URIError não-tratada).
    expect(matchRunPath("/_studio/api/agents/%/run")).toEqual({ kind: "malformed" });
  });

  it("test_agent_literally_named_malformed_still_resolves", () => {
    // Regressão (SEPA pre-COMMIT T1.4): sentinel string colidia com o domínio de
    // nomes válidos — um agent agents/malformed.ts era tratado como erro de encoding.
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
    // Conclusão NORMAL não dispara abort (close pós-end é no-op).
    expect(calls[0]?.input.signal.aborted).toBe(false);
  });

  it("test_run_stream_contains_no_run_event_lines", async () => {
    // Lock do contrato degradado (D4/theokit#132): só message|done até o bridge expor o seam.
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
    // sessionId do body preservado (continuidade multi-turn do playground).
    expect(calls[0]?.input.sessionId).toBe("sess-42");
    await run(
      "/_studio/api/agents/support/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    // Ausente → UUID gerado por request.
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
    // ANTES de qualquer trabalho: agent não carregado, stream não criado, body não lido.
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
    // Nomeia as 3 vars em ordem de prioridade (paridade com o resolver do theokit).
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

  it("test_broken_agent_returns_422_with_module_error", async () => {
    const { deps } = makeDeps();
    const state = await run(
      "/_studio/api/agents/nested/run",
      makeReq({ body: JSON.stringify({ message: "hi" }) }),
      deps,
    );
    // nested/index.ts exporta não-agent → compile falha → erro tipado, nunca 500 cru.
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
    // done NUNCA após error.
    expect(lines.some((l) => l.kind === "done")).toBe(false);
    expect(state.ended).toBe(true);
  });

  it("test_late_write_after_end_is_dropped_by_guard", async () => {
    // Generator tenta yield após o response encerrar (erro no meio) — guard descarta
    // sem throw (EC-7: write-after-end nunca derruba o processo).
    // Barreira determinística (review F-dom-test): o generator espera um gate que o
    // teste resolve DEPOIS do close — sem race de wall-clock (testing.md § 6).
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
        await gate; // só prossegue quando o teste liberar (após o close)
        if (!input.signal.aborted) lateYieldReached = true;
        yield { type: "text-delta", delta: "late" };
      },
    });
    const req = makeReq({ body: JSON.stringify({ message: "hi" }) });
    const state = makeRes();
    const done = handleAgentRun("/_studio/api/agents/support/run", req, state.res, deps);
    await firstChunk.promise; // 1º chunk garantidamente escrito
    (req as unknown as Readable).emit("close");
    openGate(); // libera o generator já com o signal abortado
    await done;
    expect(lateYieldReached).toBe(false);
    const kinds = parseLines(state.body).map((l) => l.kind);
    expect(kinds.filter((k) => k === "message").length).toBe(1);
  });

  it("test_client_disconnect_aborts_the_stream", async () => {
    // Barreira determinística (review F-dom-test): ordering imposta, não torcida.
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
          await gate; // aguarda o teste emitir close + liberar
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
    // Cancellation propagation: signal abortado (determinístico), generator finalizado.
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
