import type {
  AgentSummary,
  McpServerSummary,
  ProcessorSummary,
  SkillSummary,
  ToolSummary,
  WorkflowSummary,
} from "../types";

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
  { id: "web-search", name: "webSearch", description: "Web search with allowlist", usedBy: 2 },
  { id: "read-file", name: "readFile", description: "Reads workspace files", usedBy: 1 },
  { id: "write-file", name: "writeFile", description: "Writes workspace files", usedBy: 1 },
  ...Array.from({ length: 52 }, (_, i) => ({
    id: `mcp-tool-${i + 1}`,
    name: `mcpTool${i + 1}`,
    description: `Tool ${i + 1} exposed by a sample MCP server`,
    usedBy: i % 3 === 0 ? 1 : 0,
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
    description: "Customer onboarding flow from signup to first value",
    inputLabel: "Customer email",
    steps: [
      { id: "verify-account", name: "verify-account", description: "Verify the new account" },
      {
        id: "provision-workspace",
        name: "provision-workspace",
        description: "Provision the customer workspace",
      },
      {
        id: "send-welcome",
        name: "send-welcome",
        description: "Send the welcome sequence",
      },
      {
        id: "schedule-checkin",
        name: "schedule-checkin",
        description: "Schedule the first check-in",
      },
    ],
    recentRuns: [
      { id: "3f2a9c1d-run", status: "success", finishedAt: "2026-07-14T17:39:00Z" },
      { id: "8b1e4f7a-run", status: "success", finishedAt: "2026-07-14T16:02:00Z" },
      { id: "c9d02e5b-run", status: "failed", finishedAt: "2026-07-13T22:14:00Z" },
    ],
  },
  {
    id: "escalation",
    name: "ticket-escalation",
    description: "Escalates unresolved tickets to a human queue",
    inputLabel: "Ticket ID",
    steps: [
      { id: "classify", name: "classify", description: "Classify severity and topic" },
      { id: "attempt-answer", name: "attempt-answer", description: "Try an automated answer" },
      { id: "handoff", name: "handoff", description: "Hand off to the on-call human" },
    ],
    recentRuns: [{ id: "77aa01bc-run", status: "success", finishedAt: "2026-07-14T12:30:00Z" }],
  },
]);

export const fixtureProcessors: readonly ProcessorSummary[] = Object.freeze([
  {
    id: "unicode-normalizer",
    name: "Unicode Normalizer",
    hooks: { input: true, step: false, stream: false, result: false },
    usedBy: 1,
  },
  {
    id: "moderation",
    name: "Moderation",
    hooks: { input: true, step: false, stream: true, result: true },
    usedBy: 1,
  },
]);

export const fixtureMcpServers: readonly McpServerSummary[] = Object.freeze([
  {
    id: "demo-mcp-server",
    name: "Demo MCP Server",
    version: "1.0.0",
    url: "http://localhost:8787/mcp/demo-mcp-server/sse",
    httpUrl: "http://localhost:8787/mcp/demo-mcp-server/mcp",
    agents: 1,
    tools: 5,
    workflows: 1,
    availableTools: [
      {
        name: "lookupOrder",
        description: "Look up an order by its ID",
        kind: "tool",
        inputFields: [{ name: "orderId", label: "Order ID", required: true }],
      },
      {
        name: "refundOrder",
        description: "Refund an order (requires human approval above $500)",
        kind: "tool",
        inputFields: [
          { name: "orderId", label: "Order ID", required: true },
          { name: "amount", label: "Amount (USD)", required: true },
        ],
      },
      {
        name: "searchDocs",
        description: "Search the product documentation",
        kind: "tool",
        inputFields: [{ name: "query", label: "Query", required: true }],
      },
      {
        name: "ask_supportAgent",
        description:
          "Ask agent 'Support Agent' a question. Agent description: Answers support tickets with access to the knowledge base",
        kind: "agent",
        inputFields: [{ name: "question", label: "Question", required: true }],
      },
      {
        name: "run_customerOnboarding",
        description:
          "Run workflow 'customer-onboarding'. Workflow description: Customer onboarding flow from signup to first value",
        kind: "workflow",
        inputFields: [{ name: "customerEmail", label: "Customer email", required: true }],
      },
    ],
  },
]);
