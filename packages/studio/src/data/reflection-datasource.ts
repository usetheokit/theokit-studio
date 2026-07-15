import type { RunAgentParams, StudioDataSource } from "./datasource";
import { metrics } from "./metrics";
import type {
  AgentSummary,
  ServiceHealthMap,
  SkillSummary,
  StudioEvent,
  ToolSummary,
  WorkflowSummary,
} from "./types";

/**
 * Adapter live do M1 (ADR D5 — decorator sobre o FixtureDataSource): superfícies
 * cobertas pela reflection falam com `/_studio/api/*`; o resto delega ao fallback
 * (que segue rotulado como fixtures na UI). Camada react-free (architecture.md § 2).
 *
 * O mapeador `chunkToStudioEvent` é a anti-corrupção do stream (decisão (c), SEPA
 * T3.1): o vocabulário `StudioEvent` da UI é o contrato — chunk do bridge NUNCA vaza
 * cru (o switch exaustivo de event-to-part.ts leria campos errados em silêncio).
 */

/** Linha NDJSON que não parseia — erro tipado com a linha no contexto (fail-clear). */
export class MalformedStreamLineError extends Error {
  constructor(line: string) {
    super(`malformed NDJSON line from the run stream: ${line}`);
    this.name = "MalformedStreamLineError";
  }
}

/** Linha `{kind:"error"}` do run — o servidor reportou falha mid-stream. */
export class RunStreamError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`agent run failed (${code}): ${message}`);
    this.name = "RunStreamError";
    this.code = code;
  }
}

/** Parser NDJSON incremental: buffer de linha parcial + flush do resto sem \n (EC-11). */
export async function* parseNdjson(
  chunks: AsyncIterable<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = (line: string): Record<string, unknown> => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      throw new MalformedStreamLineError(line);
    }
  };
  for await (const chunk of chunks) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx = buffer.indexOf("\n");
    while (idx >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.length > 0) yield parse(line);
      idx = buffer.indexOf("\n");
    }
  }
  const rest = buffer.trim();
  if (rest.length > 0) yield parse(rest);
}

/** Shape mínimo dos UIMessageChunks do bridge que a reflection traduz. */
interface BridgeChunk {
  type: string;
  delta?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

/**
 * Traduz um UIMessageChunk do bridge para o vocabulário `StudioEvent` da UI.
 * `toolNames` é estado POR RUN (callId → nome — o chunk de output não carrega o nome).
 * Não-mapeável → null + métrica `reflection_chunks_dropped_total` (visível, nunca cru).
 */
export function chunkToStudioEvent(
  raw: unknown,
  toolNames: Map<string, string>,
): StudioEvent | null {
  const chunk = raw as BridgeChunk;
  switch (chunk.type) {
    case "text-delta":
      return { type: "text-delta", text: chunk.delta ?? "" };
    case "reasoning-delta":
      return { type: "thinking-delta", text: chunk.delta ?? "" };
    case "tool-input-available": {
      const callId = chunk.toolCallId ?? "unknown-call";
      const name = chunk.toolName ?? "unknown-tool";
      toolNames.set(callId, name);
      return {
        type: "tool-call-started",
        callId,
        modelCallId: callId,
        toolCall: { callId, name, args: chunk.input },
      };
    }
    case "tool-output-available":
    case "tool-output-error": {
      const callId = chunk.toolCallId ?? "unknown-call";
      const name = toolNames.get(callId) ?? "unknown-tool";
      return {
        type: "tool-call-completed",
        callId,
        modelCallId: callId,
        toolCall: { callId, name, result: chunk.output ?? chunk.errorText },
      };
    }
    case "finish":
      return { type: "turn-ended" };
    default:
      metrics.increment("reflection_chunks_dropped_total", chunk.type || "unknown");
      return null;
  }
}

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

const OFFLINE_HINT = "theokit studio up";

/** Cria o datasource live (reflection + delegação). */
export function createReflectionDataSource(opts: ReflectionDataSourceOptions): StudioDataSource {
  const base = opts.baseUrl ?? "";
  const doFetch = opts.fetchImpl ?? fetch;
  // Continuidade multi-turn (SEPA T3.1): um sessionId estável POR AGENT — sem ele o
  // agent seria amnésico a cada POST (conversationStorage do SDK é keyed por sessionId).
  const sessions = new Map<string, string>();
  let paramsWarned = false;

  async function getJson<T>(path: string, method: string): Promise<T> {
    metrics.increment("datasource_calls_total", method);
    const res = await doFetch(`${base}/_studio/api${path}`);
    if (!res.ok) {
      throw new Error(`reflection ${path} responded ${res.status} — is the dev server running?`);
    }
    return (await res.json()) as T;
  }

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

    async listTools(): Promise<ToolSummary[]> {
      const { items } = await getJson<{
        items: Array<{ name: string; description: string; usedBy: number }>;
      }>("/tools", "listTools");
      return items.map((t) => ({
        id: t.name,
        name: t.name,
        description: t.description,
        usedBy: t.usedBy,
      }));
    },

    async listSkills(): Promise<SkillSummary[]> {
      const { items } = await getJson<{ items: Array<{ name: string; description: string }> }>(
        "/skills",
        "listSkills",
      );
      return items.map((s) => ({ id: s.name, name: s.name, description: s.description }));
    },

    async listWorkflows(): Promise<WorkflowSummary[]> {
      const { items } = await getJson<{
        items: Array<{ id: string; name: string; agent: string; note: string }>;
      }>("/workflows", "listWorkflows");
      // Shape do T1.3 (par agent/subagent); steps/runs vazios são honestos — a
      // reflection enumera declarações, não execuções (theokit-sdk#123).
      return items.map((w) => ({
        id: w.id,
        name: w.name,
        description: `subagent de ${w.agent} — ${w.note}`,
        steps: [],
        inputLabel: "",
        recentRuns: [],
      }));
    },

    async health(): Promise<ServiceHealthMap> {
      metrics.increment("datasource_calls_total", "health");
      const theoData = {
        memory: { status: "offline", hint: OFFLINE_HINT },
        lens: { status: "offline", hint: OFFLINE_HINT },
        rag: { status: "offline", hint: OFFLINE_HINT },
      } as const;
      try {
        const res = await doFetch(`${base}/_studio/api/health`);
        return {
          ...theoData,
          studio: res.ok
            ? { status: "online" }
            : { status: "offline", hint: `dev server respondeu ${res.status}` },
        };
      } catch {
        metrics.increment("health_errors_total", "studio");
        // Offline honesto — a UI instrui; nunca throw na superfície de health.
        return { ...theoData, studio: { status: "offline", hint: "dev server unreachable" } };
      }
    },

    async *runAgent(
      agentId: string,
      prompt: string,
      signal?: AbortSignal,
      params?: RunAgentParams,
    ): AsyncIterable<StudioEvent> {
      metrics.increment("datasource_calls_total", "runAgent");
      if (params && Object.keys(params).length > 0 && !paramsWarned) {
        paramsWarned = true;
        // Honestidade: o run endpoint não tem destino para model/temperature/topP —
        // nunca enviar campos que o server descartaria em silêncio (gap registrado).
        console.warn(
          "TheoKit Studio: generation params (model/temperature/topP) are not supported by the live run endpoint yet — ignored",
        );
      }
      let sessionId = sessions.get(agentId);
      if (sessionId === undefined) {
        sessionId = crypto.randomUUID();
        sessions.set(agentId, sessionId);
      }
      const res = await doFetch(`${base}/_studio/api/agents/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, sessionId }),
        signal,
      });
      if (!res.ok || res.body === null) {
        throw new RunStreamError("HTTP_ERROR", `run responded ${res.status}`);
      }
      // Abort cancela o READER explícito (for-await travaria o lock e body.cancel()
      // rejeitaria em stream locked): um body pendurado nunca segura a iteração.
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      const cancelReader = () => {
        void reader.cancel().catch(() => {});
      };
      if (signal) {
        if (signal.aborted) cancelReader();
        else signal.addEventListener("abort", cancelReader, { once: true });
      }
      async function* readerChunks(): AsyncGenerator<Uint8Array> {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) return;
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      }
      const toolNames = new Map<string, string>();
      for await (const line of parseNdjson(readerChunks())) {
        if (signal?.aborted) break;
        const kind = line.kind;
        if (kind === "done") return;
        if (kind === "error") {
          const err = (line.error ?? {}) as { code?: string; message?: string };
          throw new RunStreamError(err.code ?? "RUN_FAILED", err.message ?? "unknown error");
        }
        if (kind === "run-event") {
          // Reservado (theokit#132): quando o bridge expuser o seam, os RunEvents do
          // SDK chegam aqui já no vocabulário da UI.
          yield line.event as StudioEvent;
          continue;
        }
        if (kind === "message") {
          const mapped = chunkToStudioEvent(line.chunk, toolNames);
          if (mapped !== null) yield mapped;
          continue;
        }
        metrics.increment("reflection_chunks_dropped_total", String(kind ?? "unknown-kind"));
      }
      // Abort → RETURN limpo (LSP — contrato do fixture stream-player: quem cancelou
      // foi o consumidor, não é erro; nenhum implementador de runAgent lança no abort).
    },
  };
}
