// Entry point defensivo (T2.1): único módulo com side-effect de boot. Falha de load do
// bundle/router renderiza startup-error em DOM puro em vez de tela branca.
import { renderStartupError } from "./startup-error";

export interface StudioConfig {
  scenario: "default" | "empty" | "offline";
}

const VALID_SCENARIOS = new Set(["default", "empty", "offline"]);

// Seam do M1 (Blueprint Rec-6): o host (theokit dev) injeta window.__STUDIO_CONFIG__.
// Validação na fronteira (EC-8): config malformada → warn 1× + fallback fixtures.
export function parseStudioConfig(raw: unknown): StudioConfig {
  if (raw === undefined || raw === null) {
    return { scenario: "default" };
  }
  if (
    typeof raw === "object" &&
    "scenario" in raw &&
    typeof (raw as { scenario: unknown }).scenario === "string" &&
    VALID_SCENARIOS.has((raw as { scenario: string }).scenario)
  ) {
    return { scenario: (raw as { scenario: StudioConfig["scenario"] }).scenario };
  }
  console.warn(
    "TheoKit Studio: malformed window.__STUDIO_CONFIG__ — falling back to default fixtures",
    raw,
  );
  return { scenario: "default" };
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

// Auto-boot apenas fora de teste (module side-effect guardado — SEPA Phase 2).
if (!import.meta.env.TEST) {
  // Falha já renderizada via startup-error (fail-loud único); catch evita unhandled
  // rejection duplicada no console do browser.
  bootstrap().catch(() => {});
}
