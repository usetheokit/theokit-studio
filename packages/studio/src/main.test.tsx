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

  // EC-1: a asserção acima só discrimina enquanto "live-agent" NÃO existir no fixture. Sem esta
  // trava, adicionar um agente com esse nome ao registry devolveria o teste ao estado oco em
  // silêncio — o defeito que este milestone existe para matar, repetido com um passo a mais.
  it("the_discriminating_name_is_absent_from_the_fixtures", async () => {
    const fixtureAgents = await createFixtureDataSource({ scenario: "default" }).listAgents();
    const names = fixtureAgents.map((a) => a.name);
    expect(names).not.toContain("live-agent");
  });
});
