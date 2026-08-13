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

// Composition root (architecture.md § 1): the only place that knows the concrete adapter.
// M5: fixtures; M1 swaps in the real adapter via window.__STUDIO_CONFIG__ (the EC-8 seam).
export function mount(rootEl: HTMLElement, config: StudioConfig): void {
  // The SINGLE point where mode defaults (T2.1 obligation) — no other file reads config.mode.
  const live = config.mode === "live";
  const fixtures = createFixtureDataSource({ scenario: config.scenario });
  // D5: live = the reflection for agents/tools/skills/workflows/run/health; the rest delegates
  // to the fixture (labelled). Fixtures mode = M5 behaviour intact.
  const dataSource = live ? createReflectionDataSource({ fallback: fixtures }) : fixtures;
  // Dev observability (ADR D5): counters inspectable from the browser console.
  (window as Window & { __STUDIO_METRICS__?: unknown }).__STUDIO_METRICS__ = {
    snapshot: () => metrics.snapshot(),
  };
  // SPA served under a prefix (M1): routes resolve relative to the basename the host injects.
  const router = createBrowserRouter(buildRoutes({ live }), {
    basename: config.basePath ?? "/",
  });
  createRoot(rootEl).render(
    <DataSourceProvider value={dataSource}>
      <App router={router} />
    </DataSourceProvider>,
  );
}
