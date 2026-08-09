// @vitest-environment node
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { theokitStudio } from "../../plugin";
import { scanStudioAgents } from "../../plugin/agent-scan";
import {
  aggregateReflection,
  listReflectionAgents,
  listReflectionSkills,
} from "../../plugin/reflection-api";
import { resolveSpaDir } from "../../plugin/static-serve";
import { createFixtureDataSource } from "../../src/data/fixture-datasource";
import { createReflectionDataSource } from "../../src/data/reflection-datasource";

// chmod 000 is a no-op for root (uid 0): the test would pass for the wrong reason.
const SKIP_IF_ROOT = process.getuid?.() === 0;

// REAL boundary integration (testing.md § 2): an actual Vite dev server with the plugin
// mounted — real HTTP, real ssrLoadModule over the demo-project fixture, no mocks.
// The full e2e (run + SPA) lands in T3.2; this anchors wiring pillar (b) from T1.1 on.

let server: ViteDevServer;
let baseUrl: string;
let spaTmp: string;

beforeAll(async () => {
  // Fake SPA for the static serving (the real build is validated in Integration Validation).
  spaTmp = mkdtempSync(join(tmpdir(), "studio-it-spa-"));
  mkdirSync(join(spaTmp, "assets"), { recursive: true });
  writeFileSync(
    join(spaTmp, "index.html"),
    "<!doctype html><html><head></head><body>studio-it</body></html>",
  );
  writeFileSync(join(spaTmp, "assets/app.js"), "console.log('it')");
  process.env.THEOKIT_STUDIO_DIST = spaTmp;
  // A deterministic streamFactory injected via options (DIP) — a real LLM stays out of the
  // tests (testing.md § 6); the test env supplies the key the run endpoint needs.
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "integration-test-key";
  server = await createServer({
    root: join(import.meta.dirname, "../fixtures/demo-project"),
    configFile: false,
    logLevel: "silent",
    plugins: [
      theokitStudio({
        streamFactory: async function* (_compiled, _apiKey, input) {
          yield { type: "text-delta", delta: `echo: ${input.message}` };
        },
      }),
    ],
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
  // Teardown racing a timeout (theokit's safe-close pattern) — never hang vitest.
  await Promise.race([server.close(), new Promise((r) => setTimeout(r, 5_000))]);
  delete process.env.THEOKIT_STUDIO_DIST;
  rmSync(spaTmp, { recursive: true, force: true });
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
    // The degraded item (nested exports a non-agent) is present with an error — never omitted.
    expect(body.items.find((a) => a.name === "nested")).toBeTruthy();
  });

  it("test_tools_workflows_and_skills_aggregates_over_real_http", async () => {
    // T1.3: aggregates derived from the real compilation + skills from the .theokit/skills convention.
    const tools = (await (await fetch(`${baseUrl}/_studio/api/tools`)).json()) as {
      items: Array<{ name: string; usedBy: number }>;
    };
    // lookupOrder is shared by support and team/support (fixture) → usedBy 2.
    expect(tools.items.find((t) => t.name === "lookupOrder")?.usedBy).toBe(2);
    const workflows = (await (await fetch(`${baseUrl}/_studio/api/workflows`)).json()) as {
      items: unknown[];
    };
    expect(Array.isArray(workflows.items)).toBe(true);
    const skills = (await (await fetch(`${baseUrl}/_studio/api/skills`)).json()) as {
      items: Array<{ name: string }>;
    };
    expect(skills.items.map((s) => s.name)).toEqual(["demo-skill"]);

    // HTTP parity == direct call (the server's own loader) — the endpoint is a faithful
    // projection of the pure functions, never a second implementation.
    const fixtureRoot = join(import.meta.dirname, "../fixtures/demo-project");
    const direct = await listReflectionAgents({
      projectRoot: fixtureRoot,
      load: (file) => server.ssrLoadModule(file),
    });
    expect(aggregateReflection(direct.items).tools).toEqual(tools.items);
    const directSkills = await listReflectionSkills({ projectRoot: fixtureRoot });
    expect(directSkills.items).toEqual(skills.items);
  });

  // M7 T4.1: these two resources become DOCUMENTED in the README as host-facing API.
  // The shape (`{items: [...]}`) was already covered by the test above; what was missing was
  // pinning the status and the content-type — documenting a surface without pinning its
  // contract only postpones the lie. The run endpoint's contract lands in M8, whose DoD
  // already carries it (EC-4).
  it.each([
    "/_studio/api/tools",
    "/_studio/api/workflows",
  ])("test_host_facing_%s_responds_200_json_items_envelope", async (path) => {
    const res = await fetch(`${baseUrl}${path}`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/json");
    const body = await res.json();
    expect(body).toMatchObject({ items: expect.any(Array) });
  });

  // M8 T2.1: the 405 guard (run-endpoint.ts:153-156) was the ONLY one of handleAgentRun's
  // eight guards without a test — measured by coverage before T3.2's refactor. It protects the
  // endpoint that spends real tokens from the user's provider.
  it("test_run_endpoint_rejects_non_post_with_405", async () => {
    const res = await fetch(`${baseUrl}/_studio/api/agents/support/run`);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body).toMatchObject({ error: { code: "METHOD_NOT_ALLOWED" } });
  });

  // Review F-xval-4: this test does NOT prove guard order — the path does not match
  // `matchRunPath`, so the dispatcher answers on the reserved-namespace branch
  // (plugin/index.ts:121) and `handleAgentRun` is never called. The real order pin lives in
  // `run-endpoint.test.ts`, at the unit level. What this test actually protects is the reserved
  // namespace's typed 404 — worth keeping, under an honest name.
  it("test_reserved_api_namespace_returns_typed_404", async () => {
    const res = await fetch(`${baseUrl}/_studio/api/definitely-not-a-run-route`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("test_run_endpoint_streams_ndjson_over_real_http", async () => {
    // T1.4: POST run with sessionId + incremental NDJSON parsing over real HTTP.
    const res = await fetch(`${baseUrl}/_studio/api/agents/support/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping", sessionId: "it-session" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/x-ndjson");
    const lines = (await res.text())
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as { kind: string; chunk?: { delta?: string } });
    expect(lines.map((l) => l.kind)).toEqual(["message", "done"]);
    expect(lines[0]?.chunk?.delta).toBe("echo: ping");
    // handleAgentRun exercised at the real boundary via the dispatcher's matchRunPath.
    const nested = await fetch(`${baseUrl}/_studio/api/agents/team/support/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "nested ping" }),
    });
    expect(nested.status).toBe(200);
  });

  it("test_spa_served_with_injected_config_over_real_http", async () => {
    // T2.2: SPA fallback + asset over real HTTP, with the config injected into the HTML.
    const page = await fetch(`${baseUrl}/_studio/builder`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("window.__STUDIO_CONFIG__");
    expect(html).toContain('"basePath":"/_studio"');
    const asset = await fetch(`${baseUrl}/_studio/assets/app.js?v=cache-bust`);
    expect(asset.status).toBe(200);
    const traversal = await fetch(`${baseUrl}/_studio/%2e%2e/secret.txt`);
    expect([400, 403, 404]).toContain(traversal.status);
    // Parity: the dir the server served is exactly what resolveSpaDir resolves from the SAME
    // env (the test's override) — the serving has no second resolution logic.
    expect(resolveSpaDir({ env: process.env })).toBe(spaTmp);
  });

  it("test_reflection_datasource_against_the_real_server", async () => {
    // The M1 loop the SPA still walks: ReflectionDataSource (react-free) → real HTTP →
    // plugin → ssrLoadModule → compileAgentModule. The adapter is the same code the browser
    // runs; here exercised at the real boundary (testing.md § 2).
    // (The run endpoint's NDJSON contract stays covered by
    // test_run_endpoint_streams_ndjson_over_real_http — the SPA, reduced to the Agent Builder,
    // no longer consumes the stream.)
    const ds = createReflectionDataSource({
      fallback: createFixtureDataSource({ scenario: "default" }),
      baseUrl,
      fetchImpl: fetch,
    });

    const agents = await ds.listAgents();
    expect(agents.map((a) => a.id)).toContain("support");
    expect(agents.find((a) => a.id === "nested")?.description).toContain("failed to load");
    expect((await ds.listSkills()).map((s) => s.name)).toEqual(["demo-skill"]);
  });

  it("test_reserved_svc_namespace_returns_404_over_real_http", async () => {
    // M6 T2.1 over REAL HTTP (review F-wire-3: the new behaviour had only a module-level test).
    // The bug was extension-dependent — both forms must answer the same.
    const noExt = await fetch(`${baseUrl}/_studio/svc/rag/v1/query`);
    const withExt = await fetch(`${baseUrl}/_studio/svc/rag/v1/index.json`);

    expect(noExt.status).toBe(404);
    expect(withExt.status).toBe(404);
    expect(noExt.headers.get("content-type")).toBe(withExt.headers.get("content-type"));
    expect(((await noExt.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
    // EC-3: the form without a trailing slash is reserved too.
    expect((await fetch(`${baseUrl}/_studio/svc`)).status).toBe(404);
  });

  it.skipIf(SKIP_IF_ROOT)("test_unreadable_asset_does_not_kill_the_dev_server", async () => {
    // The chain M6 exists to kill, reproduced at the level where it killed the process:
    // unreadable asset -> EACCES -> error envelope -> the server STAYS ALIVE.
    const locked = join(spaTmp, "assets", "locked.css");
    writeFileSync(locked, "body{}");
    chmodSync(locked, 0o000);
    try {
      const failed = await fetch(`${baseUrl}/_studio/assets/locked.css`);
      expect(failed.status).not.toBe(200);

      // The proof of life: the NEXT request is still served.
      const alive = await fetch(`${baseUrl}/_studio/api/health`);
      expect(alive.status).toBe(200);
    } finally {
      chmodSync(locked, 0o644);
      rmSync(locked, { force: true });
    }
  });

  it("test_http_view_matches_fs_scan_and_direct_call", async () => {
    // Integration invariant: the HTTP view == the fs truth (scanStudioAgents) == the handler
    // called directly (listReflectionAgents with the server's OWN loader).
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
