import type { AgentSummary, SkillSummary, ToolSummary, WorkflowSummary } from "../types";

export const fixtureAgents: readonly AgentSummary[] = Object.freeze([
  {
    id: "support-agent",
    name: "Support Agent",
    description: "Answers support tickets with access to the knowledge base",
    model: "claude-sonnet-4-6",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Researches topics in depth with search tools",
    model: "claude-opus-4-8",
  },
  {
    id: "coding-agent",
    name: "Coding Agent",
    description: "Writes and reviews code with repository access",
    model: "claude-fable-5",
  },
]);

// Cenário de volume (Drawback 3 do plano): 50+ itens para validar listas grandes.
export const fixtureTools: readonly ToolSummary[] = Object.freeze([
  { id: "web-search", name: "webSearch", description: "Web search with allowlist" },
  { id: "read-file", name: "readFile", description: "Reads workspace files" },
  { id: "write-file", name: "writeFile", description: "Writes workspace files" },
  ...Array.from({ length: 52 }, (_, i) => ({
    id: `mcp-tool-${i + 1}`,
    name: `mcpTool${i + 1}`,
    description: `Tool ${i + 1} exposed by a sample MCP server`,
  })),
]);

export const fixtureSkills: readonly SkillSummary[] = Object.freeze([
  { id: "summarize", name: "summarize", description: "Summarizes long documents" },
  { id: "triage", name: "triage", description: "Classifies and prioritizes tickets" },
]);

export const fixtureWorkflows: readonly WorkflowSummary[] = Object.freeze([
  {
    id: "onboarding",
    name: "customer-onboarding",
    description: "Customer onboarding flow",
    steps: 4,
  },
  {
    id: "escalation",
    name: "ticket-escalation",
    description: "Ticket escalation flow",
    steps: 3,
  },
]);
