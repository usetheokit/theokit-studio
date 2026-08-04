import type { StudioDataSource } from "./datasource";
import { metrics } from "./metrics";
import type { AgentSummary, SkillSummary } from "./types";

/**
 * Adapter live do M1 (ADR D5 — decorator sobre o FixtureDataSource): as superfícies
 * cobertas pela reflection (`/_studio/api/*`) falam com o dev server; o resto delega ao
 * fallback (que segue rotulado como fixtures na UI). Camada react-free
 * (architecture.md § 2).
 *
 * Com o Studio reduzido ao Agent Builder, a reflection alimenta o seletor de agente-alvo
 * e a lista de skills; as sessões de build permanecem no fallback de fixtures.
 */

export interface ReflectionDataSourceOptions {
  /** superfícies fora da reflection delegam para cá (fixtures rotuladas — D5). */
  fallback: StudioDataSource;
  /** prefixo do fetch; default "" (paths ABSOLUTOS /_studio/api — a SPA vive sob rota). */
  baseUrl?: string;
  /** seam de teste (jsdom sem servidor); default fetch global. */
  fetchImpl?: typeof fetch;
}

interface ReflectionAgentPayload {
  name: string;
  filePath: string;
  model?: string;
  error?: string;
}

/** Cria o datasource live (reflection + delegação). */
export function createReflectionDataSource(opts: ReflectionDataSourceOptions): StudioDataSource {
  const base = opts.baseUrl ?? "";
  const doFetch = opts.fetchImpl ?? fetch;

  async function getJson<T>(path: string, method: string): Promise<T> {
    metrics.increment("datasource_calls_total", method);
    const res = await doFetch(`${base}/_studio/api${path}`);
    if (!res.ok) {
      throw new Error(`reflection ${path} responded ${res.status} — is the dev server running?`);
    }
    return (await res.json()) as T;
  }

  // INVARIANTE (review F-arch-9): a delegação por spread `...opts.fallback` só é correta
  // porque o fallback é um objeto de closures stateless (o FixtureDataSource). Um adapter
  // futuro baseado em classe com métodos `this`-bound quebraria silenciosamente sob o
  // spread — nesse caso, trocar por delegação explícita (this.fallback.método(...)).
  return {
    ...opts.fallback,

    async listAgents(): Promise<AgentSummary[]> {
      const { items } = await getJson<{ items: ReflectionAgentPayload[] }>("/agents", "listAgents");
      return items.map((a) => ({
        id: a.name,
        name: a.name,
        // Item degradado é VISÍVEL, nunca mascarado (EC-9).
        description: a.error ? `⚠ failed to load: ${a.error}` : a.filePath,
        model: a.model,
      }));
    },

    async listSkills(): Promise<SkillSummary[]> {
      const { items } = await getJson<{ items: Array<{ name: string; description: string }> }>(
        "/skills",
        "listSkills",
      );
      return items.map((s) => ({ id: s.name, name: s.name, description: s.description }));
    },
  };
}
