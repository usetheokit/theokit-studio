import type { MemoryRecord } from "../types";

export const fixtureMemories: readonly MemoryRecord[] = Object.freeze([
  {
    id: "mem-001",
    scope: "user",
    content: "Prefers replies in Portuguese; timezone America/Sao_Paulo",
    createdAt: "2026-07-10T14:22:00Z",
    entities: ["language", "timezone"],
  },
  {
    id: "mem-002",
    scope: "user",
    content: "Pro plan customer since 2026-03; opened 4 billing tickets so far",
    createdAt: "2026-07-11T09:10:00Z",
    entities: ["plan", "billing"],
  },
  {
    id: "mem-003",
    scope: "session",
    content: "In this session they are debugging the payment webhook",
    createdAt: "2026-07-14T11:02:00Z",
    entities: ["webhook", "payment"],
  },
  {
    id: "mem-004",
    scope: "agent",
    content: "refundOrder tool requires human approval above $500",
    createdAt: "2026-06-30T16:45:00Z",
    entities: ["refundOrder", "approval"],
  },
]);
