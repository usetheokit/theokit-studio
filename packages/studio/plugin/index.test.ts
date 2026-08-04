// @vitest-environment node
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, ViteDevServer } from "vite";
import { theokitStudio } from "./index";

// Harness fake-Vite (espelha ../theokit/tests/integration/api-middleware-coverage.test.ts):
// o plugin registra UM connect middleware via configureServer; o teste captura o handler
// e o invoca com req/res instrumentados — sem servidor HTTP real (unit da fronteira).

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
    // M6 EC-2: getter REAL — reflete se writeHead já comprometeu o head. Um literal
    // congelado tornaria o guard de resposta comprometida inalcançável (finding #68).
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
    // Flag settled interrompe o reagendamento (SEPA pre-COMMIT T1.1: sem polling órfão
    // vivo após o resolve — handle latente viraria flake conforme o harness é reusado).
    let settled = false;
    const settle = () => {
      settled = true;
      resolve();
    };
    handler(makeReq(url, method), state.res, () => {
      nextCalls += 1;
      settle();
    });
    // handlers que respondem sem next(): aguardamos o end()
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
    // As DUAS metades (SEPA pre-RED): next() exatamente 1× E res intocado.
    expect(nextCalls).toBe(1);
    expect(state.touched).toBe(false);
  });

  it("test_studio_prefix_requires_boundary", async () => {
    const handler = captureHandler();
    // /_studioX NÃO é nosso namespace → passthrough intocado.
    const miss = await run(handler, "/_studioX/api/health");
    expect(miss.nextCalls).toBe(1);
    expect(miss.state.touched).toBe(false);
    // /_studio exato (sem barra) É nosso namespace → tratado (nunca next()).
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

describe("namespace reservado antes do fallback da SPA (M6 T2.1)", () => {
  it("svc_namespace_without_route_returns_typed_404_json", async () => {
    // CLAUDE.md trava /_studio/svc/{lens,memory,rag}/* como proxy. Enquanto não existe,
    // devolver HTML da SPA numa rota de contrato é defeito de contrato (finding #49).
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/svc/lens/v1/traces");

    expect(state.statusCode).toBe(404);
    expect(JSON.parse(state.body).error.code).toBe("NOT_FOUND");
  });

  it("svc_namespace_404_is_extension_independent", async () => {
    // O bug original: .../query caía na SPA (HTML 200) e .../index.json batia no branch de
    // extensão conhecida (404 JSON). Mesmo namespace documentado, duas respostas.
    const handler = captureHandler();
    const a = await run(handler, "/_studio/svc/rag/v1/query");
    const b = await run(handler, "/_studio/svc/rag/v1/index.json");

    expect(a.state.statusCode).toBe(b.state.statusCode);
    expect(a.state.headers["Content-Type"]).toBe(b.state.headers["Content-Type"]);
  });

  it("bare_svc_path_is_also_reserved", async () => {
    // EC-3: sem a barra final o prefixo não casava e o bug sobrevivia na borda.
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/svc");

    expect(state.statusCode).toBe(404);
  });

  it("reserved_namespace_requires_separator", async () => {
    // EC-7: protege contra a forma insegura startsWith("/_studio/svc") sem separador.
    const handler = captureHandler();
    const { state } = await run(handler, "/_studio/svcfoo");

    expect(state.statusCode).not.toBe(404);
  });
});

describe("erro após head comprometido não vira unhandled rejection (M6 T1.3)", () => {
  it("dispatcher_error_after_committed_head_does_not_reject", async () => {
    // Este é o teste que a review F-tests-1 flagrou como DECLARADO no plano e nunca escrito.
    // Ele precisa entrar no caminho de ERRO de verdade (review F-dom-1: a primeira versão
    // matava o mutante por uma asserção de ARRANJO sobre o fake, não por comportamento).
    // Por isso a rota escolhida é /_studio/svc/*, que chama sendErrorEnvelope — sobre uma
    // resposta cujo head JÁ foi comprometido.
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
      // O status original permanece — o head já foi, não pode ser reescrito para 404...
      expect(state.statusCode).toBe(200);
      // ...mas o erro CHEGA ao cliente, no corpo (ADR A1). É esta asserção que morre se o
      // guard de headersSent sumir do sendErrorEnvelope.
      expect(state.body).toContain("NOT_FOUND");
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });
});
