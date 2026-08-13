import type { StudioDataSource } from "./datasource";
import { metrics } from "./metrics";
import type { AgentSummary, SkillSummary } from "./types";

/**
 * M1's live adapter (ADR D5 — a decorator over FixtureDataSource): the surfaces covered by
 * the reflection (`/_studio/api/*`) talk to the dev server; the rest delegates to the
 * fallback (which stays labelled as fixtures in the UI). A react-free layer
 * (architecture.md § 2).
 *
 * With the Studio reduced to the Agent Builder, the reflection feeds the target-agent
 * selector and the skills list; build sessions stay on the fixture fallback.
 */

export interface ReflectionDataSourceOptions {
  /** surfaces outside the reflection delegate here (labelled fixtures — D5). */
  fallback: StudioDataSource;
  /** fetch prefix; defaults to "" (ABSOLUTE /_studio/api paths — the SPA lives under a route). */
  baseUrl?: string;
  /** test seam (jsdom with no server); defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/** A reflection error that preserves the `code` from the server's envelope (M6 T4.1). */
export class ReflectionRequestError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ReflectionRequestError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Rebuilds a TYPED error from the `{error:{code,message}}` envelope the plugin sends. Before,
 * the client discarded the envelope and built a generic `Error` from the status — offline
 * detection degraded into string comparison (finding #48).
 *
 * The body is read EXACTLY ONCE as text (M6 EC-5): `fetch`'s body is a single-read stream, so
 * trying `res.json()` and falling back to `res.text()` in the catch throws
 * `TypeError: body used already` — the negative case would be impossible to satisfy.
 */
async function toTypedError(res: Response, path: string): Promise<ReflectionRequestError> {
  const fallback = `reflection ${path} responded ${res.status} — is the dev server running?`;
  let raw = "";
  try {
    raw = await res.text();
  } catch {
    return new ReflectionRequestError("HTTP_ERROR", fallback, res.status);
  }
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: unknown; message?: unknown } };
    const code = typeof parsed.error?.code === "string" ? parsed.error.code : "HTTP_ERROR";
    const message =
      typeof parsed.error?.message === "string"
        ? `reflection ${path} responded ${res.status}: ${parsed.error.message}`
        : fallback;
    return new ReflectionRequestError(code, message, res.status);
  } catch {
    // A non-JSON body (proxy HTML, empty response) is an expected NEGATIVE case, not an exception.
    return new ReflectionRequestError("HTTP_ERROR", fallback, res.status);
  }
}

interface ReflectionAgentPayload {
  name: string;
  filePath: string;
  model?: string;
  error?: string;
}

/** Creates the live datasource (reflection + delegation). */
export function createReflectionDataSource(opts: ReflectionDataSourceOptions): StudioDataSource {
  const base = opts.baseUrl ?? "";
  const doFetch = opts.fetchImpl ?? fetch;

  async function getJson<T>(path: string, method: string): Promise<T> {
    metrics.increment("datasource_calls_total", method);
    const res = await doFetch(`${base}/_studio/api${path}`);
    if (!res.ok) {
      throw await toTypedError(res, path);
    }
    return (await res.json()) as T;
  }

  // M8 T3.1: EXPLICIT delegation, method by method, in place of `...opts.fallback`.
  // Precedent: genkit's `Registry` delegates each operation to its `parent` (lookupAction,
  // lookupPlugin, lookupValue, lookupSchema) and never spreads the parent object.
  //
  // The gain is at COMPILE time, with a limit worth naming (review F-arch-3): the compiler
  // catches a MISSING MEMBER (TS2741) — with the spread, a new method on `StudioDataSource`
  // silently fell through to the fixture and only failed at runtime. It does NOT catch arity: a
  // delegation that forgets an argument compiles cleanly. That is why the two methods taking an
  // argument have forwarding tests in `reflection-datasource.test.ts`.
  // This also retires the invariant the spread forced us to document — that it was only correct
  // because the fallback is an object of stateless closures.
  const { fallback } = opts;
  return {
    listBuilderSessions: () => fallback.listBuilderSessions(),
    getBuilderSession: (sessionId) => fallback.getBuilderSession(sessionId),
    startBuilderSession: (prompt, targetAgentId) =>
      fallback.startBuilderSession(prompt, targetAgentId),

    async listAgents(): Promise<AgentSummary[]> {
      const { items } = await getJson<{ items: ReflectionAgentPayload[] }>("/agents", "listAgents");
      return items.map((a) => ({
        id: a.name,
        name: a.name,
        // A degraded item is VISIBLE, never masked (EC-9).
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
