import { createFixtureDataSource } from "./fixture-datasource";
import { metrics } from "./metrics";
import { createReflectionDataSource } from "./reflection-datasource";

// ReflectionDataSource (T3.1, ADR D5): adapter live sobre /_studio/api/* decorando o
// FixtureDataSource. Com o Studio reduzido ao Agent Builder, a reflection cobre agents
// e skills; as sessões de build seguem no fallback de fixtures (rotuladas na UI).

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function makeDs(routes: Record<string, () => Response | Promise<Response>>) {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    const key = Object.keys(routes).find((r) => url.includes(r));
    if (!key) throw new Error(`no stub route for ${url}`);
    const r = routes[key];
    if (!r) throw new Error(`no stub route for ${url}`);
    return r();
  };
  return createReflectionDataSource({
    fallback: createFixtureDataSource({ scenario: "default" }),
    fetchImpl,
  });
}

beforeEach(() => {
  metrics.reset();
});

describe("createReflectionDataSource (T3.1)", () => {
  it("test_list_agents_maps_reflection_payload_to_agent_summary", async () => {
    const ds = makeDs({
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
    const ds = makeDs({
      "/api/agents": () =>
        jsonResponse({
          items: [{ name: "nested", filePath: "agents/nested/index.ts", error: "boom" }],
        }),
    });

    const agents = await ds.listAgents();

    expect(agents[0]?.description).toBe("⚠ failed to load: boom");
  });

  it("test_list_skills_maps_reflection_payload", async () => {
    const ds = makeDs({
      "/api/skills": () =>
        jsonResponse({ items: [{ name: "triage", description: "Classifies tickets" }] }),
    });

    const skills = await ds.listSkills();

    expect(skills).toEqual([{ id: "triage", name: "triage", description: "Classifies tickets" }]);
  });

  it("test_reflection_error_status_raises_actionable_error", async () => {
    const ds = makeDs({ "/api/agents": () => jsonResponse({}, 500) });

    await expect(ds.listAgents()).rejects.toThrow(/responded 500 — is the dev server running\?/);
  });

  it("test_builder_sessions_delegate_to_fixture_fallback", async () => {
    const ds = makeDs({});

    const sessions = await ds.listBuilderSessions();

    expect(sessions.length).toBeGreaterThan(0);
    // Métrica contada pelo fallback (uma vez — sem dupla contagem no decorator).
    expect(metrics.snapshot().datasource_calls_total?.listBuilderSessions).toBe(1);
  });
});
