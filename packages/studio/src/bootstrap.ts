// Defensive entry point (T2.1): the only module with a boot side effect. A bundle/router
// load failure renders startup-error in plain DOM instead of a blank screen.
import { renderStartupError } from "./startup-error";

export interface StudioConfig {
  /**
   * M7 T2.1: `"offline"` left the union. It was accepted at the boundary and never read — no
   * consumer distinguished it from `"default"`. Input accepted and ignored is a silent failure
   * (`rules/error-handling.md` § 2), so it now takes the invalid-value path: a warning naming
   * the value + a fallback to `"default"`.
   */
  scenario: "default" | "empty";
  /** absent = fixtures (the M5 shape stays valid; the SINGLE default point is born in T3.1 at the composition root). */
  mode?: "fixtures" | "live";
  /** the prefix the SPA is served under (e.g. "/_studio"); normalised on parse. */
  basePath?: string;
}

const VALID_SCENARIOS = new Set(["default", "empty"]);
const VALID_MODES = new Set(["fixtures", "live"]);

// Consuming the mode: `config.mode ?? "fixtures"` (the resolveStudioMode helper is born in
// T3.1 alongside its consumer — the hybrid composition root; YAGNI until then).

function parseBasePath(raw: unknown, warnings: string[]): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || raw.length === 0) {
    warnings.push(`basePath must be a non-empty string — ignoring ${JSON.stringify(raw)}`);
    return undefined;
  }
  // Normal form: leading slash guaranteed, trailing one removed.
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.length > 1 ? withLead.replace(/\/+$/, "") : withLead;
}

// The M1 seam (Blueprint Rec-6): the host (theokit dev) injects window.__STUDIO_CONFIG__.
// Boundary validation (EC-8): a malformed config → one warning + a fixtures fallback.
export function parseStudioConfig(raw: unknown): StudioConfig {
  if (raw === undefined || raw === null) {
    return { scenario: "default" };
  }
  if (typeof raw !== "object") {
    console.warn(
      "TheoKit Studio: malformed window.__STUDIO_CONFIG__ — falling back to default fixtures",
      raw,
    );
    return { scenario: "default" };
  }
  const input = raw as { scenario?: unknown; mode?: unknown; basePath?: unknown };
  const warnings: string[] = [];

  let scenario: StudioConfig["scenario"] = "default";
  if (input.scenario !== undefined) {
    if (typeof input.scenario === "string" && VALID_SCENARIOS.has(input.scenario)) {
      scenario = input.scenario as StudioConfig["scenario"];
    } else {
      warnings.push(
        `invalid scenario ${JSON.stringify(input.scenario)} (expected ${[...VALID_SCENARIOS].map((s) => `"${s}"`).join(" | ")})`,
      );
    }
  }

  let mode: StudioConfig["mode"];
  if (input.mode !== undefined) {
    if (typeof input.mode === "string" && VALID_MODES.has(input.mode)) {
      mode = input.mode as StudioConfig["mode"];
    } else {
      warnings.push(`invalid mode ${JSON.stringify(input.mode)}`);
    }
  }

  const basePath = parseBasePath(input.basePath, warnings);

  if (warnings.length > 0) {
    // Once per boot (EC-8) — aggregated, with context on what was ignored.
    console.warn(
      `TheoKit Studio: window.__STUDIO_CONFIG__ partially malformed (${warnings.join("; ")}) — invalid fields fell back to defaults`,
      raw,
    );
  }

  const config: StudioConfig = { scenario };
  if (mode !== undefined) config.mode = mode;
  if (basePath !== undefined) config.basePath = basePath;
  return config;
}

export async function bootstrap(): Promise<void> {
  try {
    const { mount } = await import("./main");
    const config = parseStudioConfig(
      (window as Window & { __STUDIO_CONFIG__?: unknown }).__STUDIO_CONFIG__,
    );
    const rootEl = document.getElementById("root");
    if (!rootEl) {
      throw new Error("TheoKit Studio: #root element not found in the host document");
    }
    mount(rootEl, config);
  } catch (error) {
    renderStartupError(error, { mode: import.meta.env.MODE });
    throw error;
  }
}

// Auto-boot outside tests only (the module side effect is guarded — SEPA Phase 2).
if (!import.meta.env.TEST) {
  // The failure is already rendered via startup-error (a single fail-loud); the catch avoids a
  // duplicate unhandled rejection in the browser console.
  bootstrap().catch(() => {});
}
