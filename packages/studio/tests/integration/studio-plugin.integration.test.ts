// @vitest-environment node
import { createServer, type ViteDevServer } from "vite";
import { theokitStudio } from "../../plugin";

// Integração da fronteira REAL (testing.md § 2): Vite dev server de verdade com o plugin
// montado — HTTP real, sem mocks. O e2e completo (agents + run + SPA) chega em T3.2;
// este teste ancora o wiring pilar (b) de theokitStudio desde T1.1.

let server: ViteDevServer;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({
    root: import.meta.dirname,
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
});
