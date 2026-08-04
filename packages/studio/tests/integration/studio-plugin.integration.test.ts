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

// chmod 000 é no-op para root (uid 0): o teste passaria por motivo errado.
const SKIP_IF_ROOT = process.getuid?.() === 0;

// Integração da fronteira REAL (testing.md § 2): Vite dev server de verdade com o plugin
// montado — HTTP real, ssrLoadModule real sobre a fixture demo-project, sem mocks.
// O e2e completo (run + SPA) chega em T3.2; este ancora o wiring pilar (b) desde T1.1.

let server: ViteDevServer;
let baseUrl: string;
let spaTmp: string;

beforeAll(async () => {
  // SPA fake para o static serving (o build real é validado na Integration Validation).
  spaTmp = mkdtempSync(join(tmpdir(), "studio-it-spa-"));
  mkdirSync(join(spaTmp, "assets"), { recursive: true });
  writeFileSync(
    join(spaTmp, "index.html"),
    "<!doctype html><html><head></head><body>studio-it</body></html>",
  );
  writeFileSync(join(spaTmp, "assets/app.js"), "console.log('it')");
  process.env.THEOKIT_STUDIO_DIST = spaTmp;
  // streamFactory determinístico injetado via options (DIP) — LLM real fica fora de
  // teste (testing.md § 6); env do teste garante a key para o run endpoint.
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
  // Teardown com race de timeout (padrão safe-close do theokit) — nunca pendurar o vitest.
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
    // Item degradado (nested exporta não-agent) presente com error — nunca omitido.
    expect(body.items.find((a) => a.name === "nested")).toBeTruthy();
  });

  it("test_tools_workflows_and_skills_aggregates_over_real_http", async () => {
    // T1.3: agregados derivados da compilação real + skills da convenção .theokit/skills.
    const tools = (await (await fetch(`${baseUrl}/_studio/api/tools`)).json()) as {
      items: Array<{ name: string; usedBy: number }>;
    };
    // lookupOrder é compartilhada por support e team/support (fixture) → usedBy 2.
    expect(tools.items.find((t) => t.name === "lookupOrder")?.usedBy).toBe(2);
    const workflows = (await (await fetch(`${baseUrl}/_studio/api/workflows`)).json()) as {
      items: unknown[];
    };
    expect(Array.isArray(workflows.items)).toBe(true);
    const skills = (await (await fetch(`${baseUrl}/_studio/api/skills`)).json()) as {
      items: Array<{ name: string }>;
    };
    expect(skills.items.map((s) => s.name)).toEqual(["demo-skill"]);

    // Paridade HTTP == chamada direta (mesmo loader do server) — o endpoint é uma
    // projeção fiel das funções puras, nunca uma segunda implementação.
    const fixtureRoot = join(import.meta.dirname, "../fixtures/demo-project");
    const direct = await listReflectionAgents({
      projectRoot: fixtureRoot,
      load: (file) => server.ssrLoadModule(file),
    });
    expect(aggregateReflection(direct.items).tools).toEqual(tools.items);
    const directSkills = await listReflectionSkills({ projectRoot: fixtureRoot });
    expect(directSkills.items).toEqual(skills.items);
  });

  // M7 T4.1: estes dois recursos passam a ser DOCUMENTADOS no README como API host-facing.
  // A forma (`{items: [...]}`) já era coberta pelo teste acima; o que faltava era fixar o
  // status e o content-type — documentar uma superfície sem fixar seu contrato só adia a
  // mentira. O contrato do run endpoint fica para o M8, que já o traz no DoD (EC-4).
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

  // M8 T2.1: o guard de 405 (run-endpoint.ts:153-156) era o ÚNICO dos oito guards de
  // handleAgentRun sem teste — medido por cobertura antes da refatoração do T3.2. Ele protege o
  // endpoint que gasta tokens reais do provider do usuário.
  it("test_run_endpoint_rejects_non_post_with_405", async () => {
    const res = await fetch(`${baseUrl}/_studio/api/agents/support/run`);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body).toMatchObject({ error: { code: "METHOD_NOT_ALLOWED" } });
  });

  // Review F-xval-4: este teste NÃO prova ordem de guard — o path não casa `matchRunPath`, então
  // o dispatcher responde no ramo de namespace reservado (plugin/index.ts:121) e `handleAgentRun`
  // nunca é chamado. A trava de ordem real vive em `run-endpoint.test.ts`, no nível unitário.
  // O que este teste protege de fato é o 404 tipado do namespace reservado — vale manter, com o
  // nome honesto.
  it("test_reserved_api_namespace_returns_typed_404", async () => {
    const res = await fetch(`${baseUrl}/_studio/api/definitely-not-a-run-route`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("test_run_endpoint_streams_ndjson_over_real_http", async () => {
    // T1.4: POST run com sessionId + parse NDJSON incremental sobre HTTP real.
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
    // handleAgentRun exercitado na fronteira real via matchRunPath do dispatcher.
    const nested = await fetch(`${baseUrl}/_studio/api/agents/team/support/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "nested ping" }),
    });
    expect(nested.status).toBe(200);
  });

  it("test_spa_served_with_injected_config_over_real_http", async () => {
    // T2.2: fallback SPA + asset sobre HTTP real, com o config injetado no HTML.
    const page = await fetch(`${baseUrl}/_studio/builder`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("window.__STUDIO_CONFIG__");
    expect(html).toContain('"basePath":"/_studio"');
    const asset = await fetch(`${baseUrl}/_studio/assets/app.js?v=cache-bust`);
    expect(asset.status).toBe(200);
    const traversal = await fetch(`${baseUrl}/_studio/%2e%2e/secret.txt`);
    expect([400, 403, 404]).toContain(traversal.status);
    // Paridade: o dir que o server serviu é exatamente o que resolveSpaDir resolve
    // do MESMO env (o override do teste) — o serving não tem 2ª lógica de resolução.
    expect(resolveSpaDir({ env: process.env })).toBe(spaTmp);
  });

  it("test_reflection_datasource_against_the_real_server", async () => {
    // O loop do M1 que a SPA ainda percorre: ReflectionDataSource (react-free) → HTTP
    // real → plugin → ssrLoadModule → compileAgentModule. O adapter é o mesmo código
    // que o browser roda; aqui exercitado na fronteira real (testing.md § 2).
    // (O contrato NDJSON do run endpoint segue coberto em
    // test_run_endpoint_streams_ndjson_over_real_http — a SPA reduzida ao Agent Builder
    // não consome mais o stream.)
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
    // M6 T2.1 sobre HTTP REAL (review F-wire-3: o comportamento novo só tinha teste de
    // módulo). O bug era dependente de extensão — as duas formas precisam responder igual.
    const noExt = await fetch(`${baseUrl}/_studio/svc/rag/v1/query`);
    const withExt = await fetch(`${baseUrl}/_studio/svc/rag/v1/index.json`);

    expect(noExt.status).toBe(404);
    expect(withExt.status).toBe(404);
    expect(noExt.headers.get("content-type")).toBe(withExt.headers.get("content-type"));
    expect(((await noExt.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
    // EC-3: a forma sem barra final também é reservada.
    expect((await fetch(`${baseUrl}/_studio/svc`)).status).toBe(404);
  });

  it.skipIf(SKIP_IF_ROOT)("test_unreadable_asset_does_not_kill_the_dev_server", async () => {
    // A cadeia que o M6 existe para matar, reproduzida no nível em que ela matava o
    // processo: asset ilegível -> EACCES -> envelope de erro -> servidor SEGUE VIVO.
    const locked = join(spaTmp, "assets", "locked.css");
    writeFileSync(locked, "body{}");
    chmodSync(locked, 0o000);
    try {
      const failed = await fetch(`${baseUrl}/_studio/assets/locked.css`);
      expect(failed.status).not.toBe(200);

      // A prova de vida: a requisição SEGUINTE ainda é atendida.
      const alive = await fetch(`${baseUrl}/_studio/api/health`);
      expect(alive.status).toBe(200);
    } finally {
      chmodSync(locked, 0o644);
      rmSync(locked, { force: true });
    }
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
