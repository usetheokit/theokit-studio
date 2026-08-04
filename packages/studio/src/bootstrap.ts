// Entry point defensivo (T2.1): único módulo com side-effect de boot. Falha de load do
// bundle/router renderiza startup-error em DOM puro em vez de tela branca.
import { renderStartupError } from "./startup-error";

export interface StudioConfig {
  /**
   * M7 T2.1: `"offline"` saiu do union. Era aceito na fronteira e nunca lido — nenhum consumidor
   * o distinguia de `"default"`. Entrada aceita e ignorada é falha silenciosa
   * (`rules/error-handling.md` § 2), então agora cai no caminho de valor inválido: warning
   * nomeando o valor + fallback para `"default"`.
   */
  scenario: "default" | "empty";
  /** ausente = fixtures (shape M5 permanece válido; ponto ÚNICO do default nasce em T3.1 no composition root). */
  mode?: "fixtures" | "live";
  /** prefixo onde a SPA está servida (ex.: "/_studio"); normalizado no parse. */
  basePath?: string;
}

const VALID_SCENARIOS = new Set(["default", "empty"]);
const VALID_MODES = new Set(["fixtures", "live"]);

// Consumo do mode: `config.mode ?? "fixtures"` (helper resolveStudioMode nasce em T3.1
// junto do consumidor — o composition root híbrido; YAGNI até lá).

function parseBasePath(raw: unknown, warnings: string[]): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || raw.length === 0) {
    warnings.push(`basePath must be a non-empty string — ignoring ${JSON.stringify(raw)}`);
    return undefined;
  }
  // Forma normal: barra inicial garantida, trailing removida.
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.length > 1 ? withLead.replace(/\/+$/, "") : withLead;
}

// Seam do M1 (Blueprint Rec-6): o host (theokit dev) injeta window.__STUDIO_CONFIG__.
// Validação na fronteira (EC-8): config malformada → warn 1× + fallback fixtures.
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
      warnings.push(`invalid scenario ${JSON.stringify(input.scenario)}`);
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
    // 1× por boot (EC-8) — agregado, com contexto do que foi ignorado.
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

// Auto-boot apenas fora de teste (module side-effect guardado — SEPA Phase 2).
if (!import.meta.env.TEST) {
  // Falha já renderizada via startup-error (fail-loud único); catch evita unhandled
  // rejection duplicada no console do browser.
  bootstrap().catch(() => {});
}
