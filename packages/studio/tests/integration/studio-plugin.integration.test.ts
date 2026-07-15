// @vitest-environment node
import { join } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { theokitStudio } from "../../plugin";
import { scanStudioAgents } from "../../plugin/agent-scan";
import { listReflectionAgents } from "../../plugin/reflection-api";

// Integração da fronteira REAL (testing.md § 2): Vite dev server de verdade com o plugin
// montado — HTTP real, ssrLoadModule real sobre a fixture demo-project, sem mocks.
// O e2e completo (run + SPA) chega em T3.2; este ancora o wiring pilar (b) desde T1.1.

let server: ViteDevServer;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({
    root: join(import.meta.dirname, "../fixtures/demo-project"),
    configFile: false,
    logLevel: "silent",
    plugins: [theokitStudio()],
    server: { port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("vite dev server did not expose a network address");
  }
  baseUrl = `http://localhost:${address.port}`;
}, 30_000);

afterAll(async () => {
  // Teardown com race de timeout (padrão safe-close do theokit) — nunca pendurar o vitest.
  await Promise.race([server.close(), new Promise((r) => setTimeout(r, 5_000))]);
});

describe("theokitStudio on a real Vite dev server (T1.1 integration)", () => {
  it("test_health_responds_over_real_http", async () => {
    const res = await fetch(`${baseUrl}/_studio/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; studio: string };
    expect(body.ok).toBe(true);
    expect(typeof body.studio).toBe("string");
  });

  it("test_unknown_api_route_404_envelope_over_real_http", async () => {
    const res = await fetch(`${baseUrl}/_studio/api/definitely-not-a-route`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("test_agents_reflection_over_real_http_with_real_ssr_load", async () => {
    const res = await fetch(`${baseUrl}/_studio/api/agents`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ name: string; model?: string; tools?: Array<{ name: string }> }>;
    };
    const support = body.items.find((a) => a.name === "support");
    expect(support?.model).toBe("anthropic/claude-sonnet-4-6");
    expect(support?.tools?.[0]?.name).toBe("lookupOrder");
    // Item degradado (nested exporta não-agent) presente com error — nunca omitido.
    expect(body.items.find((a) => a.name === "nested")).toBeTruthy();
  });

  it("test_http_view_matches_fs_scan_and_direct_call", async () => {
    // Invariante de integração: a visão HTTP == verdade do fs (scanStudioAgents) ==
    // chamada direta do handler (listReflectionAgents com o MESMO loader do server).
    const fixtureRoot = join(import.meta.dirname, "../fixtures/demo-project");
    const scanned = scanStudioAgents(fixtureRoot).map((n) => n.name);
    const direct = await listReflectionAgents({
      projectRoot: fixtureRoot,
      load: (file) => server.ssrLoadModule(file),
    });
    const res = await fetch(`${baseUrl}/_studio/api/agents`);
    const body = (await res.json()) as { items: Array<{ name: string }> };
    expect(body.items.map((a) => a.name)).toEqual(scanned);
    expect(direct.items.map((a) => a.name)).toEqual(scanned);
  });
});
