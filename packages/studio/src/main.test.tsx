import { screen } from "@testing-library/react";
import { metrics } from "./data/metrics";
import { mount } from "./main";

// T2.1 — o composition root passa o basename do config ao createBrowserRouter:
// com a SPA servida sob /_studio, as rotas resolvem relativo ao prefixo.
describe("mount (composition root — basename wiring)", () => {
  it("test_mount_wires_router_basename_from_config", async () => {
    // jsdom precisa estar SOB o basename antes do mount (senão nenhuma rota casa).
    window.history.replaceState(null, "", "/_studio/playground");
    const rootEl = document.createElement("div");
    document.body.appendChild(rootEl);
    try {
      mount(rootEl, { scenario: "default", basePath: "/_studio" });
      // (fixtures mode — o basename é ortogonal ao mode.)
      // Assert forte: a PÁGINA do playground resolveu sob o prefixo — a lista de
      // agents das fixtures carrega (o shell com studio-smoke renderiza até no
      // NotFound e não provaria o basename).
      const agentRow = await screen.findByText("Support Agent");
      expect(agentRow).toBeTruthy();
    } finally {
      rootEl.remove();
      window.history.replaceState(null, "", "/");
    }
  });

  it("test_composition_root_selects_hybrid_in_live_mode", async () => {
    // Ponto ÚNICO do default de mode (obrigação T2.1): a decisão vive AQUI.
    // Live: agents vêm da reflection (fetch stub); prompts seguem do fixture (D5).
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
      return new Response(JSON.stringify({ ok: true, studio: "test" }), { status: 200 });
    }) as typeof fetch;
    window.history.replaceState(null, "", "/_studio/playground");
    const rootEl = document.createElement("div");
    document.body.appendChild(rootEl);
    try {
      mount(rootEl, { scenario: "default", mode: "live", basePath: "/_studio" });
      // Agent da REFLECTION na lista (não os fixtures) + banner live no shell.
      expect(await screen.findByText("live-agent")).toBeTruthy();
      expect(screen.queryByText("Support Agent")).toBeNull();
      expect(screen.getByText(/live reflection/i)).toBeTruthy();
      // Wiring pilar (c): métrica da reflection observada não-zero.
      expect(metrics.snapshot().datasource_calls_total?.listAgents).toBeGreaterThanOrEqual(1);
    } finally {
      rootEl.remove();
      globalThis.fetch = realFetch;
      window.history.replaceState(null, "", "/");
    }
  });
});
