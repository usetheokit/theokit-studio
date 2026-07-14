import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { App } from "./app";
import { routes } from "./app/routes";
import type { StudioConfig } from "./bootstrap";
import { DataSourceProvider } from "./data/datasource";
import { createFixtureDataSource } from "./data/fixture-datasource";
import { metrics } from "./data/metrics";
import "./index.css";

// Composition root (architecture.md § 1): o único lugar que conhece o adapter concreto.
// M5: fixtures; M1 troca por adapter real via window.__STUDIO_CONFIG__ (seam EC-8).
export function mount(rootEl: HTMLElement, config: StudioConfig): void {
  const dataSource = createFixtureDataSource({
    scenario: config.scenario,
    streamDelayMs: 40,
  });
  // Observabilidade dev (ADR D5): contadores inspecionáveis no console do browser.
  (window as Window & { __STUDIO_METRICS__?: unknown }).__STUDIO_METRICS__ = {
    snapshot: () => metrics.snapshot(),
  };
  const router = createBrowserRouter(routes);
  createRoot(rootEl).render(
    <DataSourceProvider value={dataSource}>
      <App router={router} />
    </DataSourceProvider>,
  );
}
