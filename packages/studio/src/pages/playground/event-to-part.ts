// Converter puro evento→parte de UI (Blueprint §"T3": narrowing por discriminated union +
// dict de renderers). Grafias REAIS do SDK 3.4: updates kebab-case, run events snake_case
// (log iteração 3 — o pseudo-code do plano usava grafia errada).
import type { StudioRunEvent } from "../../data/fixtures/run-script";
import { metrics } from "../../data/metrics";

export type StudioEvent = StudioRunEvent["event"];

export interface UserPart {
  kind: "user";
  text: string;
}
export interface TextPart {
  kind: "text";
  text: string;
}
export interface ToolPart {
  kind: "tool";
  callId: string;
  name: string;
  args?: unknown;
  result?: unknown;
  done: boolean;
}
export interface NoticePart {
  kind: "notice";
  notice: "permission-denied" | "rate-limit" | "tripwire";
  detail: string;
}
export interface UnknownPart {
  kind: "unknown";
  type: string;
}
export type ChatPart = UserPart | TextPart | ToolPart | NoticePart | UnknownPart;

export interface PlaybackState {
  parts: ChatPart[];
  isRunning: boolean;
}

export const initialPlayback: PlaybackState = { parts: [], isRunning: false };

const appendText = (state: PlaybackState, text: string): PlaybackState => {
  const last = state.parts.at(-1);
  if (last?.kind === "text") {
    return {
      ...state,
      parts: [...state.parts.slice(0, -1), { kind: "text", text: last.text + text }],
    };
  }
  return { ...state, parts: [...state.parts, { kind: "text", text }] };
};

const upsertTool = (
  state: PlaybackState,
  callId: string,
  patch: Omit<ToolPart, "kind" | "callId">,
): PlaybackState => {
  const idx = state.parts.findIndex((p) => p.kind === "tool" && p.callId === callId);
  const part: ToolPart = { kind: "tool", callId, ...patch };
  if (idx === -1) {
    return { ...state, parts: [...state.parts, part] };
  }
  const parts = [...state.parts];
  parts[idx] = part;
  return { ...state, parts };
};

const notice = (state: PlaybackState, part: NoticePart): PlaybackState => ({
  ...state,
  parts: [...state.parts, part],
});

// Switch EXAUSTIVO: o guard `never` no default quebra o typecheck se o SDK 3.x adicionar
// um tipo novo (alarme de drift); em runtime o fallback é gracioso (unknown + métrica).
export function applyEvent(state: PlaybackState, event: StudioEvent): PlaybackState {
  switch (event.type) {
    case "text-delta":
      return appendText(state, event.text);
    case "tool-call-started":
    case "partial-tool-call":
      return upsertTool(state, event.callId, {
        name: event.toolCall.name,
        args: event.toolCall.args,
        done: false,
      });
    case "tool-call-completed":
      return upsertTool(state, event.callId, {
        name: event.toolCall.name,
        args: event.toolCall.args,
        result: event.toolCall.result,
        done: true,
      });
    case "permission_denied":
      return notice(state, {
        kind: "notice",
        notice: "permission-denied",
        detail: `${event.toolName}: ${event.message}`,
      });
    case "rate_limit":
      return notice(state, {
        kind: "notice",
        notice: "rate-limit",
        detail: `rate limited (attempt ${event.attempt}${
          event.retryAfterMs !== undefined ? `, retry in ${event.retryAfterMs}ms` : ""
        })`,
      });
    case "tripwire":
      return notice(state, { kind: "notice", notice: "tripwire", detail: "processor tripwire" });
    case "turn-ended":
      return { ...state, isRunning: false };
    // Meta-eventos: não viram parte de chat (o Event Inspector mostra o stream cru).
    case "thinking-delta":
    case "thinking-completed":
    case "token-delta":
    case "step-started":
    case "step-completed":
    case "user-message-appended":
    case "summary":
    case "summary-started":
    case "summary-completed":
    case "shell-output-delta":
    case "tool_progress":
    case "task_started":
    case "task_updated":
    case "task_completed":
    case "compact_boundary":
    case "completion_check":
      return state;
    default: {
      // Drift guard em compile-time; fallback gracioso em runtime.
      const _exhaustive: never = event;
      void _exhaustive;
      metrics.increment("unknown_events_total");
      return {
        ...state,
        parts: [...state.parts, { kind: "unknown", type: (event as { type: string }).type ?? "?" }],
      };
    }
  }
}
