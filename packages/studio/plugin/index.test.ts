// @vitest-environment node
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, ViteDevServer } from "vite";
import { theokitStudio } from "./index";

// Fake-Vite harness (mirrors ../theokit/tests/integration/api-middleware-coverage.test.ts):
// the plugin registers ONE connect middleware via configureServer; the test captures the
// handler and invokes it with instrumented req/res — no real HTTP server (boundary unit).

interface FakeRes {
  statusCode: number | undefined;
  headers: Record<string, string>;
  body: string;
  ended: boolean;
  touched: boolean;
  res: ServerResponse;
}

function makeRes(): FakeRes {
  const state: FakeRes = {
    statusCode: undefined,
    headers: {},
    body: "",
    ended: false,
    touched: false,
    res: undefined as unknown as ServerResponse,
  };
  state.res = {
    writeHead(code: number, headers?: Record<string, string>) {
      state.touched = true;
      state.statusCode = code;
      Object.assign(state.headers, headers ?? {});
      return state.res;
    },
    setHeader(name: string, value: string) {
      state.touched = true;
      state.headers[name] = value;
      return state.res;
    },
    write(chunk: unknown) {
      state.touched = true;
      state.body += String(chunk);
      return true;
    },
    end(chunk?: unknown) {
      state.touched = true;
      if (chunk !== undefined) state.body += String(chunk);
      state.ended = true;
      return state.res;
    },
    get writableEnded() {
      return state.ended;
    },
    // M6 EC-2: a REAL getter — it reflects whether writeHead already committed the head. A
    // frozen literal would make the committed-response guard unreachable (finding #68).
    get headersSent() {
      return state.statusCode !== undefined;
    },
    get destroyed() {
      return false;
    },
  } as unknown as ServerResponse;
  return state;
}

function makeReq(url: string, method = "GET"): IncomingMessage {
  return {
    url,
    method,
    headers: { host: "localhost:5173" },
    on() {},
  } as unknown as IncomingMessage;
}

function captureHandler(): Connect.NextHandleFunction {
  let handler: Connect.NextHandleFunction | undefined;
  const server = {
    middlewares: {
      use(fn: Connect.NextHandleFunction) {
        handler = fn;
      },
    },
    config: { root: process.cwd() },
  } as unknown as ViteDevServer;
  const plugin = theokitStudio();
  (plugin.configureServer as (s: ViteDevServer) => void)(server);
  if (!handler) throw new Error("plugin did not register a middleware via configureServer");
  return handler;
}

async function run(handler: Connect.NextHandleFunction, url: string, method = "GET") {
  const state = makeRes();
  let nextCalls = 0;
  await new Promise<void>((resolve) => {
    // A settled flag stops the rescheduling (SEPA pre-COMMIT T1.1: no orphan polling left alive
    // after the resolve — a latent handle would become a flake as the harness is reused).
    let settled = false;
    const settle = () => {
      settled = true;
      resolve();
    };
    handler(makeReq(url, method), state.res, () => {
      nextCalls += 1;
      settle();
    });
    // handlers that answer without next(): we await the end()
    const wait = () => {
      if (settled) return;
      if (state.ended) {
        settle();
        return;
      }
      setTimeout(wait, 5);
    };
    wait();
  });
  return { state, nextCalls };
}

describe("theokitStudio plugin — dispatcher + health (T1.1)", () => {
  it("test_health_endpoint_returns_ok_and_version", async () => {
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/api/health");
    expect(state.statusCode).toBe(200);
    const body = JSON.parse(state.body) as { ok: boolean; studio: string };
    expect(body.ok).toBe(true);
    expect(typeof body.studio).toBe("string");
  });

  it("test_unknown_api_route_returns_typed_404_envelope", async () => {
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/api/nope");
    expect(state.statusCode).toBe(404);
    const body = JSON.parse(state.body) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("/_studio/api/nope");
  });

  it("test_non_studio_request_passes_through_untouched", async () => {
    const handler = captureHandler();
    const { state, nextCalls } = await run(handler, "/app");
    // BOTH halves (SEPA pre-RED): next() exactly once AND res untouched.
    expect(nextCalls).toBe(1);
    expect(state.touched).toBe(false);
  });

  it("test_studio_prefix_requires_boundary", async () => {
    const handler = captureHandler();
    // /_studioX is NOT our namespace → untouched passthrough.
    const miss = await run(handler, "/_studioX/api/health");
    expect(miss.nextCalls).toBe(1);
    expect(miss.state.touched).toBe(false);
    // exactly /_studio (no slash) IS our namespace → handled (never next()).
    const exact = await run(handler, "/_studio");
    expect(exact.nextCalls).toBe(0);
    expect(exact.state.ended).toBe(true);
  });

  it("test_dispatch_decides_on_pathname_ignoring_query", async () => {
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/api/health?x=1&tab=tools");
    expect(state.statusCode).toBe(200);
    expect((JSON.parse(state.body) as { ok: boolean }).ok).toBe(true);
  });
});

describe("reserved namespace before the SPA fallback (M6 T2.1)", () => {
  it("svc_namespace_without_route_returns_typed_404_json", async () => {
    // CLAUDE.md pins /_studio/svc/{lens,memory,rag}/* as a proxy. While it does not exist,
    // returning the SPA's HTML on a contract route is a contract defect (finding #49).
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/svc/lens/v1/traces");

    expect(state.statusCode).toBe(404);
    expect(JSON.parse(state.body).error.code).toBe("NOT_FOUND");
  });

  it("svc_namespace_404_is_extension_independent", async () => {
    // The original bug: .../query fell into the SPA (HTML 200) while .../index.json hit the
    // known-extension branch (JSON 404). Same documented namespace, two answers.
    const handler = captureHandler();
    const a = await run(handler, "/_studio/svc/rag/v1/query");
    const b = await run(handler, "/_studio/svc/rag/v1/index.json");

    expect(a.state.statusCode).toBe(b.state.statusCode);
    expect(a.state.headers["Content-Type"]).toBe(b.state.headers["Content-Type"]);
  });

  it("bare_svc_path_is_also_reserved", async () => {
    // EC-3: without the trailing slash the prefix did not match and the bug survived at the edge.
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/svc");

    expect(state.statusCode).toBe(404);
  });

  it("reserved_namespace_requires_separator", async () => {
    // EC-7: guards against the unsafe startsWith("/_studio/svc") form with no separator.
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/svcfoo");

    expect(state.statusCode).not.toBe(404);
  });
});

describe("an error after the head is committed does not become an unhandled rejection (M6 T1.3)", () => {
  it("dispatcher_error_after_committed_head_does_not_reject", async () => {
    // This is the test review F-tests-1 flagged as DECLARED in the plan and never written.
    // It has to enter the real ERROR path (review F-dom-1: the first version killed the mutant
    // through an ARRANGE assertion on the fake, not through behaviour). That is why the chosen
    // route is /_studio/svc/*, which calls sendErrorEnvelope — over a response whose head has
    // ALREADY been committed.
    const handler = captureHandler();
    const state = makeRes();
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onRejection);

    try {
      state.res.writeHead(200, { "Content-Type": "text/plain" });

      await new Promise<void>((resolve) => {
        handler(makeReq("/_studio/svc/lens/v1/traces"), state.res, () => resolve());
        const wait = () => (state.ended ? resolve() : setTimeout(wait, 5));
        wait();
      });
      await new Promise((r) => setTimeout(r, 30));

      expect(rejections).toHaveLength(0);
      // The original status stands — the head is gone, it cannot be rewritten to 404...
      expect(state.statusCode).toBe(200);
      // ...but the error DOES reach the client, in the body (ADR A1). This is the assertion that
      // dies if the headersSent guard disappears from sendErrorEnvelope.
      expect(state.body).toContain("NOT_FOUND");
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });
});
