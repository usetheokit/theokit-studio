import { createFixtureDataSource } from "./fixture-datasource";
import { metrics } from "./metrics";
import { createReflectionDataSource } from "./reflection-datasource";

// ReflectionDataSource (T3.1, ADR D5): a live adapter over /_studio/api/* decorating the
// FixtureDataSource. With the Studio reduced to the Agent Builder, the reflection covers
// agents and skills; build sessions stay on the fixture fallback (labelled in the UI).

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

// M8 T3.1: a BEHAVIOUR pin across the mechanism swap (spread -> explicit delegation). This
// test passes before and after on purpose — the proof of the change is at COMPILE time
// (removing a delegation becomes a TS2741 error), recorded in the milestone's log.
describe("delegation to the fallback (T3.1)", () => {
  it("delegates_unimplemented_methods_to_the_fallback", async () => {
    const listBuilderSessions = vi.fn().mockResolvedValue([]);
    const fallback = { ...createFixtureDataSource({ scenario: "default" }), listBuilderSessions };
    const ds = createReflectionDataSource({ fallback });
    await ds.listBuilderSessions();
    expect(listBuilderSessions).toHaveBeenCalledTimes(1);
  });

  // Review F-arch-3: the compiler catches a MISSING MEMBER (TS2741) but does NOT catch arity —
  // `(prompt) => fallback.startBuilderSession(prompt)` compiles and silently drops targetAgentId,
  // becoming `agentId: undefined` on every session created in live mode. Both delegated methods
  // that take an argument need a test; the test above only covers the one that takes none.
  it("forwards_every_argument_of_the_delegated_methods", async () => {
    const getBuilderSession = vi.fn().mockResolvedValue({ id: "s-1" });
    const startBuilderSession = vi.fn().mockResolvedValue({ id: "s-2" });
    const fallback = {
      ...createFixtureDataSource({ scenario: "default" }),
      getBuilderSession,
      startBuilderSession,
    };
    const ds = createReflectionDataSource({ fallback });

    await ds.getBuilderSession("s-1");
    expect(getBuilderSession).toHaveBeenCalledWith("s-1");

    await ds.startBuilderSession("build me a thing", "support-agent");
    expect(startBuilderSession).toHaveBeenCalledWith("build me a thing", "support-agent");
  });
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
    // The metric is counted by the fallback (once — no double counting in the decorator).
    expect(metrics.snapshot().datasource_calls_total?.listBuilderSessions).toBe(1);
  });
});

describe("the server's typed error envelope (M6 T4.1)", () => {
  it("reflection_error_envelope_is_propagated_with_code", async () => {
    // The plugin assembles {error:{code,message}} carefully and the client threw it away,
    // building a generic Error from the status. Offline detection degraded into string
    // comparison (finding #48). Precedent: GenkitError carries status + code.
    const ds = makeDs({
      "/api/agents": () => jsonResponse({ error: { code: "NOT_FOUND", message: "sem rota" } }, 404),
    });

    const err = await ds.listAgents().catch((e: unknown) => e);

    expect((err as { code?: string }).code).toBe("NOT_FOUND");
    expect((err as Error).message).toContain("sem rota");
  });

  it("non_envelope_error_body_falls_back_to_status_message", async () => {
    // EC-5: fetch's body is a SINGLE-READ stream. Trying res.json() and falling back to
    // res.text() in the catch throws "body used already" — the negative case would be impossible.
    const ds = makeDs({
      "/api/agents": () => new Response("<html>502 Bad Gateway</html>", { status: 502 }),
    });

    await expect(ds.listAgents()).rejects.toThrow(/responded 502/);
  });

  it("envelope_without_code_falls_back_to_status_message", async () => {
    // EC-8: valid JSON, incomplete envelope — it must not throw a SyntaxError.
    const ds = makeDs({
      "/api/agents": () => jsonResponse({ error: { message: "message only" } }, 500),
    });

    const err = await ds.listAgents().catch((e: unknown) => e);

    expect((err as Error).message).toContain("message only");
  });
});
