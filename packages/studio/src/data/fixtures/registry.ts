import type { AgentSummary, SkillSummary, ToolSummary, WorkflowSummary } from "../types";

export const fixtureAgents: readonly AgentSummary[] = Object.freeze([
  {
    id: "support-agent",
    name: "Support Agent",
    description: "Responde tickets de suporte com acesso à base de conhecimento",
    model: "claude-sonnet-4-6",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Investiga tópicos em profundidade com ferramentas de busca",
    model: "claude-opus-4-8",
  },
  {
    id: "coding-agent",
    name: "Coding Agent",
    description: "Escreve e revisa código com acesso ao repositório",
    model: "claude-fable-5",
  },
]);

// Cenário de volume (Drawback 3 do plano): 50+ itens para validar listas grandes.
export const fixtureTools: readonly ToolSummary[] = Object.freeze([
  { id: "web-search", name: "webSearch", description: "Busca na web com allowlist" },
  { id: "read-file", name: "readFile", description: "Lê arquivos do workspace" },
  { id: "write-file", name: "writeFile", description: "Escreve arquivos no workspace" },
  ...Array.from({ length: 52 }, (_, i) => ({
    id: `mcp-tool-${i + 1}`,
    name: `mcpTool${i + 1}`,
    description: `Ferramenta ${i + 1} exposta por um servidor MCP de exemplo`,
  })),
]);

export const fixtureSkills: readonly SkillSummary[] = Object.freeze([
  { id: "summarize", name: "summarize", description: "Resume documentos longos" },
  { id: "triage", name: "triage", description: "Classifica e prioriza tickets" },
]);

export const fixtureWorkflows: readonly WorkflowSummary[] = Object.freeze([
  { id: "onboarding", name: "customer-onboarding", description: "Fluxo de onboarding", steps: 4 },
  {
    id: "escalation",
    name: "ticket-escalation",
    description: "Escalonamento de tickets",
    steps: 3,
  },
]);
