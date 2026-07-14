import type { MemoryRecord } from "../types";

export const fixtureMemories: readonly MemoryRecord[] = Object.freeze([
  {
    id: "mem-001",
    scope: "user",
    content: "Prefere respostas em português; timezone America/Sao_Paulo",
    createdAt: "2026-07-10T14:22:00Z",
    entities: ["idioma", "timezone"],
  },
  {
    id: "mem-002",
    scope: "user",
    content: "Cliente do plano Pro desde 2026-03; já abriu 4 tickets sobre billing",
    createdAt: "2026-07-11T09:10:00Z",
    entities: ["plano", "billing"],
  },
  {
    id: "mem-003",
    scope: "session",
    content: "Nesta sessão está debugando o webhook de pagamento",
    createdAt: "2026-07-14T11:02:00Z",
    entities: ["webhook", "pagamento"],
  },
  {
    id: "mem-004",
    scope: "agent",
    content: "Ferramenta refundOrder exige aprovação humana acima de R$ 500",
    createdAt: "2026-06-30T16:45:00Z",
    entities: ["refundOrder", "aprovação"],
  },
]);
