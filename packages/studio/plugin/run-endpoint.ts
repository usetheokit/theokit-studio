import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { relative } from "node:path";
import { compileAgentModule, streamAgentUIMessages } from "@theokit/agents/bridge";
import { scanStudioAgents } from "./agent-scan";
import { sendErrorEnvelope } from "./http";

/**
 * Run endpoint (T1.4, ADR D4 — ramo degradado): `POST /_studio/api/agents/{name}/run`
 * streama NDJSON. Vocabulário de linha: `message` | `done` | `error` — `run-event` é
 * membro RESERVADO (bridge sem seam de RunEvent; theokit#132) que o parser de T3.1 já
 * trata como superset. Origem verificada ANTES de ler o body (run gasta tokens reais —
 * paridade com a defesa CSRF do mountAgent do theokit).
 */

const RUN_PREFIX = "/_studio/api/agents/";
const RUN_SUFFIX = "/run";

// Espelho da convenção INTERNA do theokit (provider-resolver.ts:58-75 — first-match por
// prioridade; agent-middleware.ts:231 usa resolveProvider().apiKey e DESCARTA baseUrl,
// então "apiKey only" é bug-compatível com o caminho dev do ecossistema).
const PROVIDER_ENV_PRIORITY = [
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
] as const;

/** Input entregue à fábrica de stream (default: streamAgentUIMessages do bridge). */
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
  /** seam de teste/e2e (DIP); produção usa o bridge real. */
  streamFactory?: RunStreamFactory;
  /** env injetado (teste); produção usa process.env. */
  env?: Record<string, string | undefined>;
}

/** Resultado discriminado do match — sem sentinels colidindo com nomes válidos
 * (error-handling.md § 2: um agent legítimo pode se chamar "malformed"). */
export type RunPathMatch = { kind: "match"; name: string } | { kind: "malformed" } | null;

/**
 * Extrai o nome do agent do path do run. Nomes aninhados preservam `/` (EC-2 —
 * paridade com o agentPath do theokit). Percent-encoding malformado → kind
 * "malformed" (EC-5: nunca URIError não-tratada).
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
  if (origin === "null") return false; // opaque origin (EC-8) — sempre rejeitado
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false; // Origin malformado → rejeição tipada, nunca URIError/500
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
    // sessionId do cliente preservado (continuidade multi-turn — conversationStorage
    // do SDK é keyed por sessionId; paridade com parseAgentRequestBody do theokit).
    sessionId: typeof sessionId === "string" && sessionId.length > 0 ? sessionId : randomUUID(),
  };
}

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson",
  "Transfer-Encoding": "chunked",
  "Cache-Control": "no-store",
};

/** Trata o run com defesas na fronteira; erros SEMPRE viram envelope/linha tipada. */
export async function handleAgentRun(
  pathname: string,
  req: IncomingMessage,
  res: ServerResponse,
  deps: RunEndpointDeps,
): Promise<void> {
  const match = matchRunPath(pathname);
  if (match === null) {
    sendErrorEnvelope(res, 404, "NOT_FOUND", `no studio api route matches ${pathname}`);
    return;
  }
  if (match.kind === "malformed") {
    sendErrorEnvelope(res, 400, "BAD_REQUEST", "malformed percent-encoding in agent name");
    return;
  }
  const name = match.name;
  if (req.method !== "POST") {
    sendErrorEnvelope(res, 405, "METHOD_NOT_ALLOWED", `use POST for ${pathname}`);
    return;
  }
  // Origem ANTES de qualquer trabalho (ler body, carregar agent, criar stream):
  // um run gasta tokens reais do provider do usuário.
  if (!isSameOrigin(req)) {
    sendErrorEnvelope(res, 403, "ORIGIN_FORBIDDEN", "cross-origin agent runs are not allowed");
    return;
  }
  const body = parseRunBody(await readBody(req));
  if (body === null) {
    sendErrorEnvelope(
      res,
      400,
      "BAD_REQUEST",
      "request body must be JSON with a non-empty `message` string",
    );
    return;
  }
  const node = scanStudioAgents(deps.projectRoot, deps.agentsDir).find((n) => n.name === name);
  if (!node) {
    sendErrorEnvelope(res, 404, "AGENT_NOT_FOUND", `no agent named "${name}" in the project`);
    return;
  }
  const apiKey = resolveApiKey(deps.env ?? process.env);
  if (apiKey === undefined) {
    sendErrorEnvelope(
      res,
      424,
      "PROVIDER_KEY_MISSING",
      `no provider API key found — set one of ${PROVIDER_ENV_PRIORITY.join(", ")} in the dev server environment`,
    );
    return;
  }
  let compiled: ReturnType<typeof compileAgentModule>;
  try {
    const mod = await deps.load(node.filePath);
    compiled = compileAgentModule(mod, relative(deps.projectRoot, node.filePath));
  } catch (error) {
    sendErrorEnvelope(
      res,
      422,
      "AGENT_INVALID",
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  const controller = new AbortController();
  req.on("close", () => {
    // close também dispara na conclusão NORMAL (pós-end) — abort só em disconnect real.
    if (!res.writableEnded) controller.abort();
  });

  // Guard universal (EC-7): NENHUMA escrita após end/abort — descartada em silêncio.
  const writeLine = (line: Record<string, unknown>): void => {
    if (res.writableEnded || controller.signal.aborted) return;
    res.write(`${JSON.stringify(line)}\n`);
  };

  res.writeHead(200, NDJSON_HEADERS);
  const streamFactory: RunStreamFactory =
    deps.streamFactory ??
    ((c, k, input) =>
      // cwd fica fora: StreamAgentOptions do 0.39.0 publicado ainda não o aceita
      // (chegou no worktree 0.40); RunStreamInput o carrega para factories injetadas.
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
      writeLine({ kind: "done" }); // done SÓ no caminho de sucesso — nunca após error
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
