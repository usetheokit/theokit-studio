import { screen } from "@testing-library/react";
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
      mount(rootEl, { scenario: "default", mode: "live", basePath: "/_studio" });
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
});
