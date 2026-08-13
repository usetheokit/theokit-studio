import { screen } from "@testing-library/react";
import { createFixtureDataSource } from "./data/fixture-datasource";
import { metrics } from "./data/metrics";
import { mount } from "./main";

// T2.1 — the composition root passes the config's basename to createBrowserRouter:
// with the SPA served under /_studio, the routes resolve relative to that prefix.
describe("mount (composition root — basename wiring)", () => {
  function mountAt(path: string, config: Parameters<typeof mount>[1]) {
    // jsdom must be UNDER the basename before mounting (otherwise no route matches).
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
      // Strong assertion: the builder surface resolved UNDER the prefix (NotFound would render
      // in its place if the basename had not been applied).
      expect(await screen.findByTestId("builder-surface")).toBeTruthy();
    } finally {
      cleanup();
    }
  });

  it("test_root_under_basename_redirects_to_builder", async () => {
    // The root of the SPA served under a prefix must land on the builder — the redirect has to
    // honour the basename, or /_studio opens blank on the host.
    const cleanup = mountAt("/_studio", { scenario: "default", basePath: "/_studio" });
    try {
      expect(await screen.findByTestId("builder-surface")).toBeTruthy();
    } finally {
      cleanup();
    }
  });

  it("test_composition_root_selects_hybrid_in_live_mode", async () => {
    // The SINGLE point where mode defaults (T2.1 obligation): the decision lives HERE.
    // Live: agents come from the reflection (fetch stub); sessions still come from the fixture (D5).
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
      // M8 T1.1: the ONLY assertion separating the ternary's two branches is data that only the
      // reflection produces. The two earlier assertions were satisfied by BOTH branches — the label
      // comes from buildRoutes({ live }), which reads the boolean directly, and the counter
      // datasource_calls_total.listAgents is incremented by the fixture as well as by the
      // reflection. Reproduced: inverting the ternary, the suite still returned 3 passed.
      const liveAgent = await screen.findByText("live-agent");
      expect(liveAgent).toBeTruthy();
      // The label and the metric stay asserted — they do not prove the choice, but they pin
      // regressions of their own (an honest label, and wiring pillar c).
      expect(await screen.findByText(/live reflection/i)).toBeTruthy();
      expect(metrics.snapshot().datasource_calls_total?.listAgents).toBeGreaterThanOrEqual(1);
    } finally {
      cleanup();
      globalThis.fetch = realFetch;
    }
  });

  // Review F-tests-1: only ONE side of the ternary had been armed. Without this test, the
  // mutant `const live = true` passed the entire suite — the fixture-mode tests asserted only
  // `builder-surface`, which renders on BOTH branches. It was the milestone's own defect,
  // mirrored: the test name became honest while the other half of line 20 stayed bare.
  it("test_composition_root_selects_fixtures_when_mode_is_absent", async () => {
    const cleanup = mountAt("/_studio/builder", { scenario: "default", basePath: "/_studio" });
    try {
      // Data only the fixture produces — the reflection would return whatever the fetch stub said,
      // and there is no stub here: in live mode the relative fetch rejects and the list is empty.
      const fixtureAgent = await screen.findByText("Support Agent");
      expect(fixtureAgent).toBeTruthy();
      // And the origin label must say fixtures, not live.
      expect(screen.queryByText(/live reflection/i)).toBeNull();
    } finally {
      cleanup();
    }
  });

  // EC-1 + review F-tests-6: the discriminating assertion only works while "live-agent" exists
  // in NO fixture surface the page renders. The first version looked only at the agents; the
  // builder's sessions come from the fallback even in live mode (reflection-datasource.ts
  // delegates listBuilderSessions), so a session title carrying that name would return the test
  // to its hollow state without this pin noticing.
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
