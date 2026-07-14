// ÚNICO módulo que importa tipos do @theokit/sdk (mitigação do fixture drift — risco 1 do
// grill/ADR D2): shapes escritos SEM casts — se o SDK 3.x mudar, o typecheck quebra AQUI.
// Shapes verificados em dist/run-*.d.ts@3.4.1 (updates: kebab-case; run events: snake_case).
// TODO(M1): revisar semântica de ordem/timing contra um Run.stream() real (Drawback 1).
import type { InteractionUpdate, RunEvent } from "@theokit/sdk";
import type { StudioRunEvent } from "../types";

export type { StudioRunEvent };

const e = (at: number, event: InteractionUpdate | RunEvent): StudioRunEvent => ({ at, event });

// Roteiro default: cobre as 5 categorias exigidas pelo plano (text deltas, tool call
// started/completed, permission-denied, rate-limit, completion/turn-ended) com o evento
// terminal SEMPRE por último.
export const DEFAULT_RUN: readonly StudioRunEvent[] = Object.freeze([
  e(0, { type: "step-started", stepId: 0 }),
  e(40, { type: "text-delta", text: "Hi! Let me check " }),
  e(80, { type: "text-delta", text: "the status of your order." }),
  e(120, {
    type: "tool-call-started",
    callId: "tc-1",
    modelCallId: "mc-1",
    toolCall: { callId: "tc-1", name: "lookupOrder", args: { orderId: "ORD-1234" } },
  }),
  e(300, {
    type: "tool-call-completed",
    callId: "tc-1",
    modelCallId: "mc-1",
    toolCall: {
      callId: "tc-1",
      name: "lookupOrder",
      args: { orderId: "ORD-1234" },
      result: { status: "shipped", eta: "2026-07-16" },
    },
  }),
  e(340, {
    type: "permission_denied",
    toolName: "refundOrder",
    toolCallId: "tc-2",
    source: "plugin",
    message: "Refunds above $500 require human approval",
  }),
  e(380, { type: "rate_limit", attempt: 1, retryAfterMs: 1200 }),
  e(520, { type: "text-delta", text: " Your order has shipped — it arrives on the 16th." }),
  e(560, {
    type: "turn-ended",
    usage: { inputTokens: 812, outputTokens: 96, cacheReadTokens: 512, cacheWriteTokens: 0 },
  }),
]);

// Roteiro de volume (Drawback 3): 100+ eventos para validar o inspector com stream longo.
export const LONG_RUN: readonly StudioRunEvent[] = Object.freeze([
  e(0, { type: "step-started", stepId: 0 }),
  ...Array.from(
    { length: 110 },
    (_, i): StudioRunEvent => e(10 * (i + 1), { type: "text-delta", text: `token-${i + 1} ` }),
  ),
  e(1200, { type: "turn-ended" }),
]);
