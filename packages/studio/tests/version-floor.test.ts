import { describe, expect, it } from "vitest";

/**
 * Anti-vacuity floor: is the suite exercising the versions this package declares?
 *
 * Written because 15 failures went green after a three-line change to test fixtures, in an item
 * previously characterised as "seven majors of migration". A green that cheap deserves to be
 * disbelieved until something independent confirms the new code is the code being run.
 *
 * It took four attempts, and every wrong one was the same defect — a probe that cannot detect the
 * condition it screens for:
 *
 *  1. `require("<pkg>/package.json")` — neither package lists that subpath in `exports`, so it
 *     failed on resolution while looking like it failed on version;
 *  2. walking up from a `createRequire` resolution — fails identically;
 *  3. CJS resolution of `@theokit/agents/bridge`, whose `exports` entry declares only `import` and
 *     `types`. `ERR_PACKAGE_PATH_NOT_EXPORTED` is the CORRECT answer to the wrong question;
 *  4. `import.meta.resolve`, which Vite's SSR transform does not provide.
 *
 * All four were archaeology about a version STRING. The assertion that survived asks the modules
 * themselves what they expose — which is both harder to fake and closer to what actually matters:
 * a manifest can claim any range, but only the loaded module can answer whether the API the code
 * was migrated onto is really there.
 */

describe("the loaded modules are the ones the manifest declares", () => {
  it("test_bridge_exposes_the_7x_authoring_api_and_not_the_0_39_one", async () => {
    // `AgentBuilder.create()` replaced `agent()` between 0.39 and 7.x, and it is the whole content
    // of this migration. If `agent` were still reachable the migration would have been
    // unnecessary; if `AgentBuilder` were missing, the fixtures could not compile at all.
    const bridge = (await import("@theokit/agents/bridge")) as Record<string, unknown>;
    expect(bridge.AgentBuilder, "AgentBuilder is the 7.x authoring entry point").toBeTruthy();
    expect(bridge.agent, "`agent` is the 0.39 entry point and must be gone").toBeUndefined();
  });

  it("test_bridge_still_exposes_what_the_plugin_consumes", async () => {
    // The production side of this package imports exactly these two. They survived the seven
    // majors intact — which is why the migration turned out to be three lines in fixtures rather
    // than a rewrite, and why saying so out loud belongs in a test rather than a commit message.
    const bridge = (await import("@theokit/agents/bridge")) as Record<string, unknown>;
    expect(typeof bridge.compileAgentModule).toBe("function");
    expect(typeof bridge.streamAgentUIMessages).toBe("function");
  });

  it("test_sdk_exposes_the_4_49_config_trust_wiring_family", async () => {
    // The measured floor: 4.40 had 0 of these 7, 4.45 had 1, 4.47 had 4, 4.48 had 6, 4.49 has all
    // 7. Asking for the symbols rather than the number means the probe keeps working when the
    // version moves, and fails honestly if a resolution quirk downgrades the package underneath.
    const sdk = (await import("@theokit/sdk")) as Record<string, unknown>;
    for (const symbol of [
      "foldLayers",
      "verifyLayerOrdering",
      "applySecurityFloor",
      "resolveTrustPosture",
      "auditEnvReachability",
      "recordWiring",
    ]) {
      expect(typeof sdk[symbol], `@theokit/sdk must expose ${symbol} (4.49 floor)`).toBe(
        "function",
      );
    }
  });
});
