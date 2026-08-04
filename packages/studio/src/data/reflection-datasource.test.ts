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

// M8 T3.1: trava de COMPORTAMENTO durante a troca de mecanismo (spread -> delegação
// explícita). Este teste passa antes e depois de propósito — a prova da mudança é de
// COMPILAÇÃO (remover uma delegação vira erro TS2741), registrada no log do milestone.
describe("delegação ao fallback (T3.1)", () => {
  it("delegates_unimplemented_methods_to_the_fallback", async () => {
    const listBuilderSessions = vi.fn().mockResolvedValue([]);
    const fallback = { ...createFixtureDataSource({ scenario: "default" }), listBuilderSessions };
    const ds = createReflectionDataSource({ fallback });
    await ds.listBuilderSessions();
    expect(listBuilderSessions).toHaveBeenCalledTimes(1);
  });

  // Review F-arch-3: o compilador cobra MEMBRO ausente (TS2741), mas NÃO cobra aridade —
  // `(prompt) => fallback.startBuilderSession(prompt)` compila e perde o targetAgentId em
  // silêncio, virando `agentId: undefined` em toda sessão criada no modo live. Os dois métodos
  // delegados que levam argumento precisam de teste; o teste acima só cobre o que não leva.
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
    // Métrica contada pelo fallback (uma vez — sem dupla contagem no decorator).
    expect(metrics.snapshot().datasource_calls_total?.listBuilderSessions).toBe(1);
  });
});

describe("envelope de erro tipado do servidor (M6 T4.1)", () => {
  it("reflection_error_envelope_is_propagated_with_code", async () => {
    // O plugin monta {error:{code,message}} com cuidado e o cliente jogava fora, montando
    // um Error genérico a partir do status. Detecção de offline degradava para comparação
    // de string (finding #48). Precedente: GenkitError carrega status + code.
    const ds = makeDs({
      "/api/agents": () => jsonResponse({ error: { code: "NOT_FOUND", message: "sem rota" } }, 404),
    });

    const err = await ds.listAgents().catch((e: unknown) => e);

    expect((err as { code?: string }).code).toBe("NOT_FOUND");
    expect((err as Error).message).toContain("sem rota");
  });

  it("non_envelope_error_body_falls_back_to_status_message", async () => {
    // EC-5: o body do fetch é stream de LEITURA ÚNICA. Tentar res.json() e cair para
    // res.text() no catch lança "body used already" — o caso negativo seria impossível.
    const ds = makeDs({
      "/api/agents": () => new Response("<html>502 Bad Gateway</html>", { status: 502 }),
    });

    await expect(ds.listAgents()).rejects.toThrow(/responded 502/);
  });

  it("envelope_without_code_falls_back_to_status_message", async () => {
    // EC-8: JSON válido, envelope incompleto — não pode lançar SyntaxError.
    const ds = makeDs({
      "/api/agents": () => jsonResponse({ error: { message: "só mensagem" } }, 500),
    });

    const err = await ds.listAgents().catch((e: unknown) => e);

    expect((err as Error).message).toContain("só mensagem");
  });
});
