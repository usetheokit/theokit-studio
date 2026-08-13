import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { relative } from "node:path";
import { compileAgentModule, streamAgentUIMessages } from "@theokit/agents/bridge";
import { scanStudioAgents } from "./agent-scan";
import { sendErrorEnvelope } from "./http";

/**
 * Run endpoint (T1.4, ADR D4 — degraded branch): `POST /_studio/api/agents/{name}/run`
 * streams NDJSON. Line vocabulary: `message` | `done` | `error` — `run-event` is a
 * RESERVED member (the bridge has no RunEvent seam; theokit#132) that T3.1's parser already
 * treats as a superset. Origin is verified BEFORE reading the body (a run spends real tokens —
 * parity with theokit's mountAgent CSRF defence).
 */

const RUN_PREFIX = "/_studio/api/agents/";
const RUN_SUFFIX = "/run";

// Mirror of theokit's INTERNAL convention (provider-resolver.ts:58-75 — first match by
// priority; agent-middleware.ts:231 uses resolveProvider().apiKey and DISCARDS baseUrl, so
// "apiKey only" is bug-compatible with the ecosystem's dev path).
//
// DELIBERATE LIMITATION (review F-arch-5 / F-dom-api-1): the key is resolved from this fixed
// list, DECOUPLED from the agent's `compiled.model`. With any key set, a wrong provider shows
// up only as an opaque upstream 401 mid-stream, not as a typed 424 at the boundary. This is
// the same process-global semantics as theokit dev (deliberate parity). Followup F5: select
// the env var from the provider inferred out of `compiled.model`, once the provider→var
// mapping is available.
const PROVIDER_ENV_PRIORITY = [
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
] as const;

/** Input handed to the stream factory (default: the bridge's streamAgentUIMessages). */
export interface RunStreamInput {
  message: string;
  sessionId: string;
  signal: AbortSignal;
  cwd?: string;
}

export type RunStreamFactory = (
  compiled: ReturnType<typeof compileAgentModule>,
  apiKey: string,
  input: RunStreamInput,
) => AsyncIterable<unknown>;

export interface RunEndpointDeps {
  projectRoot: string;
  agentsDir?: string;
  load: (filePath: string) => Promise<unknown>;
  /** test/e2e seam (DIP); production uses the real bridge. */
  streamFactory?: RunStreamFactory;
  /** injected env (tests); production uses process.env. */
  env?: Record<string, string | undefined>;
}

/** Discriminated match result — no sentinels colliding with valid names
 * (error-handling.md § 2: a legitimate agent may be called "malformed"). */
export type RunPathMatch = { kind: "match"; name: string } | { kind: "malformed" } | null;

/**
 * Extracts the agent name from the run path. Nested names keep their `/` (EC-2 — parity with
 * theokit's agentPath). Malformed percent-encoding → kind "malformed" (EC-5: never an
 * unhandled URIError).
 */
export function matchRunPath(pathname: string): RunPathMatch {
  if (!pathname.startsWith(RUN_PREFIX) || !pathname.endsWith(RUN_SUFFIX)) return null;
  const raw = pathname.slice(RUN_PREFIX.length, -RUN_SUFFIX.length);
  if (raw.length === 0) return null;
  try {
    return { kind: "match", name: decodeURIComponent(raw) };
  } catch {
    return { kind: "malformed" };
  }
}

function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (origin === undefined) return true; // curl/same-origin fetch sem header
  if (origin === "null") return false; // opaque origin (EC-8) — always rejected
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false; // malformed Origin → typed rejection, never a URIError/500
  }
}

function resolveApiKey(env: Record<string, string | undefined>): string | undefined {
  for (const key of PROVIDER_ENV_PRIORITY) {
    const value = env[key];
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks).toString("utf8");
}

interface RunRequestBody {
  message: string;
  sessionId: string;
}

function parseRunBody(raw: string): RunRequestBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const message = (parsed as { message?: unknown }).message;
  if (typeof message !== "string" || message.trim().length === 0) return null;
  const sessionId = (parsed as { sessionId?: unknown }).sessionId;
  return {
    message,
    // the client's sessionId is preserved (multi-turn continuity — the SDK's
    // conversationStorage is keyed by sessionId; parity with theokit's parseAgentRequestBody).
    sessionId: typeof sessionId === "string" && sessionId.length > 0 ? sessionId : randomUUID(),
  };
}

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson",
  "Transfer-Encoding": "chunked",
  "Cache-Control": "no-store",
};

/** Handles the run with boundary defences; errors ALWAYS become a typed envelope/line. */
/** Refusal envelope: status + code + message, in the shape the boundary already answers. */
type RunRefusal = { kind: "refused"; status: number; code: string; message: string };

/** A run's executable context: everything the streaming needs, already validated. */
type RunContext = {
  kind: "ready";
  body: NonNullable<ReturnType<typeof parseRunBody>>;
  apiKey: string;
  compiled: ReturnType<typeof compileAgentModule>;
};

/**
 * Resolves the request into an executable context, or into the reason it is refused.
 *
 * M8 T3.2: the eight guards lived inline in `handleAgentRun`, which measured CCN 20. The
 * extraction names a real concept — "validate and resolve the request before spending the
 * provider's tokens" — rather than an arbitrary slice: the guards' ORDER is the contract
 * (route before method, origin before reading the body), and it now lives in one place.
 */
async function resolveRunRequest(
  pathname: string,
  req: IncomingMessage,
  deps: RunEndpointDeps,
): Promise<RunRefusal | RunContext> {
  const match = matchRunPath(pathname);
  if (match === null) {
    return refuse(404, "NOT_FOUND", `no studio api route matches ${pathname}`);
  }
  if (match.kind === "malformed") {
    return refuse(400, "BAD_REQUEST", "malformed percent-encoding in agent name");
  }
  const name = match.name;
  if (req.method !== "POST") {
    return refuse(405, "METHOD_NOT_ALLOWED", `use POST for ${pathname}`);
  }
  // Origin BEFORE any work (reading the body, loading the agent, creating the stream):
  // a run spends real tokens from the user's provider.
  if (!isSameOrigin(req)) {
    return refuse(403, "ORIGIN_FORBIDDEN", "cross-origin agent runs are not allowed");
  }
  const body = parseRunBody(await readBody(req));
  if (body === null) {
    return refuse(
      400,
      "BAD_REQUEST",
      "request body must be JSON with a non-empty `message` string",
    );
  }
  const node = scanStudioAgents(deps.projectRoot, deps.agentsDir).find((n) => n.name === name);
  if (!node) {
    return refuse(404, "AGENT_NOT_FOUND", `no agent named "${name}" in the project`);
  }
  const apiKey = resolveApiKey(deps.env ?? process.env);
  if (apiKey === undefined) {
    return refuse(
      424,
      "PROVIDER_KEY_MISSING",
      `no provider API key found — set one of ${PROVIDER_ENV_PRIORITY.join(", ")} in the dev server environment`,
    );
  }
  try {
    const mod = await deps.load(node.filePath);
    const compiled = compileAgentModule(mod, relative(deps.projectRoot, node.filePath));
    return { kind: "ready", body, apiKey, compiled };
  } catch (error) {
    return refuse(422, "AGENT_INVALID", error instanceof Error ? error.message : String(error));
  }
}

function refuse(status: number, code: string, message: string): RunRefusal {
  return { kind: "refused", status, code, message };
}

export async function handleAgentRun(
  pathname: string,
  req: IncomingMessage,
  res: ServerResponse,
  deps: RunEndpointDeps,
): Promise<void> {
  const resolved = await resolveRunRequest(pathname, req, deps);
  if (resolved.kind === "refused") {
    sendErrorEnvelope(res, resolved.status, resolved.code, resolved.message);
    return;
  }
  const { body, apiKey, compiled } = resolved;

  const controller = new AbortController();
  req.on("close", () => {
    // close also fires on NORMAL completion (post-end) — abort only on a real disconnect.
    if (!res.writableEnded) controller.abort();
  });

  // Universal guard (EC-7): NO write after end/abort — silently discarded.
  const writeLine = (line: Record<string, unknown>): void => {
    if (res.writableEnded || controller.signal.aborted) return;
    res.write(`${JSON.stringify(line)}\n`);
  };

  res.writeHead(200, NDJSON_HEADERS);
  const streamFactory: RunStreamFactory =
    deps.streamFactory ??
    ((c, k, input) =>
      // cwd stays out: the published 0.39.0 StreamAgentOptions does not accept it yet
      // (it landed in the 0.40 worktree); RunStreamInput carries it for injected factories.
      streamAgentUIMessages(c, k, {
        message: input.message,
        sessionId: input.sessionId,
        signal: input.signal,
      }));
  try {
    const stream = streamFactory(compiled, apiKey, {
      message: body.message,
      sessionId: body.sessionId,
      signal: controller.signal,
      cwd: deps.projectRoot,
    });
    for await (const chunk of stream) {
      if (controller.signal.aborted) break;
      writeLine({ kind: "message", chunk });
    }
    if (!controller.signal.aborted) {
      writeLine({ kind: "done" }); // done ONLY on the success path — never after an error
    }
  } catch (error) {
    writeLine({
      kind: "error",
      error: {
        code: "RUN_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
    });
  } finally {
    if (!res.writableEnded) res.end();
  }
}
