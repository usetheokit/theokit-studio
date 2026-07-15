import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { App } from "./app";
import { buildRoutes } from "./app/routes";
import type { StudioConfig } from "./bootstrap";
import { DataSourceProvider } from "./data/datasource";
import { createFixtureDataSource } from "./data/fixture-datasource";
import { metrics } from "./data/metrics";
import { createReflectionDataSource } from "./data/reflection-datasource";
import "./index.css";

// Composition root (architecture.md § 1): o único lugar que conhece o adapter concreto.
// M5: fixtures; M1 troca por adapter real via window.__STUDIO_CONFIG__ (seam EC-8).
export function mount(rootEl: HTMLElement, config: StudioConfig): void {
  // Ponto ÚNICO do default de mode (obrigação T2.1) — nenhum outro arquivo lê config.mode.
  const live = config.mode === "live";
  const fixtures = createFixtureDataSource({
    scenario: config.scenario,
    streamDelayMs: 40,
  });
  // D5: live = reflection para agents/tools/skills/workflows/run/health; resto delega
  // ao fixture (rotulado). Fixtures mode = comportamento M5 intacto.
  const dataSource = live ? createReflectionDataSource({ fallback: fixtures }) : fixtures;
  // Observabilidade dev (ADR D5): contadores inspecionáveis no console do browser.
  (window as Window & { __STUDIO_METRICS__?: unknown }).__STUDIO_METRICS__ = {
    snapshot: () => metrics.snapshot(),
  };
  // SPA servida sob prefixo (M1): rotas resolvem relativo ao basename injetado pelo host.
  const router = createBrowserRouter(buildRoutes([], { live }), {
    basename: config.basePath ?? "/",
  });
  createRoot(rootEl).render(
    <DataSourceProvider value={dataSource}>
      <App router={router} />
    </DataSourceProvider>,
  );
}
