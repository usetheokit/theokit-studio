import { screen } from "@testing-library/react";
import { createFixtureDataSource } from "./data/fixture-datasource";
import { metrics } from "./data/metrics";
import { mount } from "./main";

// T2.1 — o composition root passa o basename do config ao createBrowserRouter:
// com a SPA servida sob /_studio, as rotas resolvem relativo ao prefixo.
describe("mount (composition root — basename wiring)", () => {
  function mountAt(path: string, config: Parameters<typeof mount>[1]) {
    // jsdom precisa estar SOB o basename antes do mount (senão nenhuma rota casa).
    window.history.replaceState(null, "", path);
    const rootEl = document.createElement("div");
    document.body.appendChild(rootEl);
    mount(rootEl, config);
    return () => {
      rootEl.remove();
      window.history.replaceState(null, "", "/");
    };
  }

  it("test_mount_wires_router_basename_from_config", async () => {
    const cleanup = mountAt("/_studio/builder", { scenario: "default", basePath: "/_studio" });
    try {
      // Assert forte: a superfície do builder resolveu SOB o prefixo (o NotFound
      // renderizaria no lugar dela se o basename não tivesse sido aplicado).
      expect(await screen.findByTestId("builder-surface")).toBeTruthy();
    } finally {
      cleanup();
    }
  });

  it("test_root_under_basename_redirects_to_builder", async () => {
    // A raiz da SPA servida sob prefixo tem de cair no builder — o redirect precisa
    // respeitar o basename, senão /_studio abre em branco no host.
    const cleanup = mountAt("/_studio", { scenario: "default", basePath: "/_studio" });
    try {
      expect(await screen.findByTestId("builder-surface")).toBeTruthy();
    } finally {
      cleanup();
    }
  });

  it("test_composition_root_selects_hybrid_in_live_mode", async () => {
    // Ponto ÚNICO do default de mode (obrigação T2.1): a decisão vive AQUI.
    // Live: agents vêm da reflection (fetch stub); sessões seguem do fixture (D5).
    metrics.reset();
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/_studio/api/agents")) {
        return new Response(
          JSON.stringify({
            items: [{ name: "live-agent", filePath: "agents/live-agent.ts", model: "m" }],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }) as typeof fetch;
    const cleanup = mountAt("/_studio/builder", {
      scenario: "default",
      mode: "live",
      basePath: "/_studio",
    });
    try {
      // M8 T1.1: a ÚNICA asserção que separa os dois ramos do ternário é o dado que só a
      // reflection produz. As duas asserções anteriores eram satisfeitas pelos DOIS ramos —
      // o rótulo vem de buildRoutes({ live }), que lê o booleano direto, e o contador
      // datasource_calls_total.listAgents é incrementado tanto pelo fixture quanto pela
      // reflection. Reproduzido: invertendo o ternário, a suíte devolvia 3 passed.
      const liveAgent = await screen.findByText("live-agent");
      expect(liveAgent).toBeTruthy();
      // O rótulo e a métrica continuam asseverados — não provam a escolha, mas travam
      // regressões próprias (rótulo honesto e wiring pilar c).
      expect(await screen.findByText(/live reflection/i)).toBeTruthy();
      expect(metrics.snapshot().datasource_calls_total?.listAgents).toBeGreaterThanOrEqual(1);
    } finally {
      cleanup();
      globalThis.fetch = realFetch;
    }
  });

  // Review F-tests-1: eu tinha armado UM lado do ternário. Sem este teste, o mutante
  // `const live = true` passava a suíte inteira — os testes de modo fixtures asseveravam só
  // `builder-surface`, que renderiza nos DOIS ramos. Era o mesmo defeito do milestone,
  // espelhado: o nome do teste ficou honesto e a outra metade da linha 20 seguiu nua.
  it("test_composition_root_selects_fixtures_when_mode_is_absent", async () => {
    const cleanup = mountAt("/_studio/builder", { scenario: "default", basePath: "/_studio" });
    try {
      // Dado que SÓ o fixture produz — a reflection devolveria o que o stub de fetch mandasse,
      // e aqui não há stub: em modo live o fetch relativo rejeita e a lista fica vazia.
      const fixtureAgent = await screen.findByText("Support Agent");
      expect(fixtureAgent).toBeTruthy();
      // E o rótulo de origem tem de dizer fixtures, não live.
      expect(screen.queryByText(/live reflection/i)).toBeNull();
    } finally {
      cleanup();
    }
  });

  // EC-1 + review F-tests-6: a asserção discriminante só funciona enquanto "live-agent" não
  // existir em NENHUMA superfície de fixture que a página renderiza. A primeira versão olhava
  // só para os agents; as sessões do builder vêm do fallback mesmo em modo live
  // (reflection-datasource.ts delega listBuilderSessions), então um título de sessão com esse
  // nome devolveria o teste ao estado oco sem esta trava perceber.
  it("the_discriminating_name_is_absent_from_every_rendered_fixture", async () => {
    const fx = createFixtureDataSource({ scenario: "default" });
    const rendered = [
      ...(await fx.listAgents()).map((a) => a.name),
      ...(await fx.listSkills()).map((s) => s.name),
      ...(await fx.listBuilderSessions()).map((s) => s.title),
    ];
    expect(rendered).not.toContain("live-agent");
  });
});
