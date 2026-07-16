// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { theokitStudio } from "../../plugin";

// ORÁCULO CONTRATUAL do Goal do plano m1-studio-table-stakes (§ Goal): este teste é a
// métrica que a Integration Validation e o /release citam. A sobreposição com
// tests/integration/ é INTENCIONAL e sancionada (SEPA T3.2): lá, fronteiras granulares
// que localizam regressão; aqui, o contrato de ponta a ponta num único assert nomeado.
// NÃO deletar um dos dois como "duplicado".

let server: ViteDevServer;
let baseUrl: string;
let spaTmp: string;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  // Env com save/restore (nunca vazar para outros testes do worker).
  savedEnv.THEOKIT_STUDIO_DIST = process.env.THEOKIT_STUDIO_DIST;
  savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  spaTmp = mkdtempSync(join(tmpdir(), "studio-e2e-spa-"));
  mkdirSync(join(spaTmp, "assets"), { recursive: true });
  // index COM </head> — o caminho normal da injeção (EC-13 é o excepcional).
  writeFileSync(
    join(spaTmp, "index.html"),
    "<!doctype html><html><head><title>Studio</title></head><body></body></html>",
  );
  process.env.THEOKIT_STUDIO_DIST = spaTmp;
  process.env.ANTHROPIC_API_KEY = "e2e-test-key";
  server = await createServer({
    root: join(import.meta.dirname, "../fixtures/demo-project"),
    configFile: false,
    logLevel: "silent",
    plugins: [
      theokitStudio({
        // LLM real fora de teste (testing.md § 6) — o run real é smoke manual documentado.
        streamFactory: async function* (_compiled, _apiKey, input) {
          yield { type: "text-delta", id: "t", delta: `echo: ${input.message}` };
        },
      }),
    ],
    server: { port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("no server address");
  baseUrl = `http://localhost:${address.port}`;
}, 30_000);

afterAll(async () => {
  await Promise.race([server.close(), new Promise((r) => setTimeout(r, 5_000))]);
  // Restore simétrico: reatribuir vaza a string "undefined" (truthy) para o worker —
  // uma ANTHROPIC_API_KEY="undefined" faria um run subsequente passar do 424 com key falsa.
  for (const key of ["THEOKIT_STUDIO_DIST", "ANTHROPIC_API_KEY"] as const) {
    const saved = savedEnv[key];
    if (saved === undefined) delete process.env[key];
    else process.env[key] = saved;
  }
  rmSync(spaTmp, { recursive: true, force: true });
});

describe("M1 Goal oracle", () => {
  it("studio_e2e_reflection_and_run", async () => {
    // (1) health responde — o Studio detecta o dev server (graceful degradation seam).
    const health = await fetch(`${baseUrl}/_studio/api/health`);
    expect(health.status).toBe(200);
    expect(((await health.json()) as { ok: boolean }).ok).toBe(true);

    // (2) reflection enumera o agent da fixture COM tools (registry vivo, sem manifest).
    const agents = (await (await fetch(`${baseUrl}/_studio/api/agents`)).json()) as {
      items: Array<{ name: string; tools?: Array<{ name: string }> }>;
    };
    const support = agents.items.find((a) => a.name === "support");
    expect(support).toBeTruthy();
    expect(support?.tools?.map((t) => t.name)).toContain("lookupOrder");

    // (3) a SPA é servida em /_studio com o config live injetado no HTML.
    const page = await fetch(`${baseUrl}/_studio/agents`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("window.__STUDIO_CONFIG__");
    expect(html).toContain('"mode":"live"');

    // (4) POST run streama NDJSON: toda linha parseia com kind; ≥1 message; última done.
    const run = await fetch(`${baseUrl}/_studio/api/agents/support/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "e2e ping", sessionId: "e2e-session" }),
    });
    expect(run.status).toBe(200);
    const lines = (await run.text())
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as { kind: string });
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) expect(typeof line.kind).toBe("string");
    expect(lines.filter((l) => l.kind === "message").length).toBeGreaterThanOrEqual(1);
    expect(lines.at(-1)?.kind).toBe("done");
  }, 20_000);
});
