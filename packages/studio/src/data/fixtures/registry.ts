import type {
  AgentSummary,
  BuilderMessage,
  BuilderSessionDetail,
  BuilderSessionSummary,
  McpServerSummary,
  ProcessorSummary,
  PromptSummary,
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

export const fixtureBuilderSessions: readonly BuilderSessionSummary[] = Object.freeze([
  {
    id: "refine-support-tone",
    title: "Refine Support Agent tone",
    agentId: "support-agent",
    lastActivity: "2m",
    pinned: true,
  },
  {
    id: "refund-approvals",
    title: "Add refundOrder approvals to Support Agent",
    agentId: "support-agent",
    lastActivity: "1h",
    pinned: false,
  },
  {
    id: "scaffold-triage",
    title: "Scaffold a billing triage agent",
    lastActivity: "3h",
    pinned: false,
  },
  {
    id: "wire-websearch",
    title: "Wire webSearch into Research Agent",
    agentId: "research-agent",
    lastActivity: "1d",
    pinned: false,
  },
]);

// Detalhes das sessões do builder (transcript + work log + arquivos editados).
// Simulação claramente rotulada (fixtures mode) — mesma premissa dos runs
// roteirizados do playground.
export const fixtureBuilderSessionDetails: Readonly<Record<string, BuilderSessionDetail>> =
  Object.freeze({
    "refine-support-tone": {
      id: "refine-support-tone",
      title: "Refine Support Agent tone",
      agentId: "support-agent",
      lastActivity: "2m",
      pinned: true,
      workedFor: "2m 30s",
      workLog: [
        "Read agents/support-agent.ts and the current instructions",
        "Rewrote the instructions with a warmer, more concise tone",
        "Kept the $500 refund approval guardrail",
        "Updated the welcome copy in prompts/support-tone.md to match",
        "Ran the agent smoke test locally — replies read warmer and shorter",
      ],
      messages: [
        {
          role: "user",
          text: "The Support Agent sounds robotic. Make the tone warmer and more concise, and keep the refund guardrail.",
        },
        {
          role: "assistant",
          text: "Done — I rewrote the instructions with a warmer greeting and shorter sentences, kept the documentation citations, and preserved the $500 refund approval guardrail. I also aligned the shared tone prompt block so both stay consistent.",
        },
      ],
      files: [
        {
          path: "agents/support-agent.ts",
          additions: 4,
          deletions: 1,
          diff: `--- agents/support-agent.ts
+++ agents/support-agent.ts
 export const supportAgent = defineAgent({
   id: "support-agent",
   model: "claude-sonnet-4-6",
-  instructions: "Answer support tickets.",
+  instructions:
+    "Answer support tickets with a warm, concise tone. " +
+    "Cite documentation when it exists. Never promise refunds " +
+    "above $500 without human approval.",
   tools: [lookupOrder, refundOrder, searchDocs],
 });`,
        },
        {
          path: "prompts/support-tone.md",
          additions: 2,
          deletions: 2,
          diff: `--- prompts/support-tone.md
+++ prompts/support-tone.md
 # support-tone
-Reply formally.
-Keep answers complete.
+Reply warmly and get to the point.
+Prefer short sentences; link docs when they exist.`,
        },
      ],
    },
    "refund-approvals": {
      id: "refund-approvals",
      title: "Add refundOrder approvals to Support Agent",
      agentId: "support-agent",
      lastActivity: "1h",
      pinned: false,
      workedFor: "1m 12s",
      workLog: [
        "Inspected tools/refund-order.ts",
        "Added an approval hook for amounts above $500",
        "Verified the run pauses and waits for a human decision",
      ],
      messages: [
        { role: "user", text: "Require human approval on refundOrder above $500." },
        {
          role: "assistant",
          text: "Added an approval hook to refundOrder: amounts above $500 now pause the run and wait for a human decision.",
        },
      ],
      files: [
        {
          path: "tools/refund-order.ts",
          additions: 1,
          deletions: 0,
          diff: `--- tools/refund-order.ts
+++ tools/refund-order.ts
 export const refundOrder = defineTool({
   id: "refundOrder",
+  approval: { required: (input) => input.amount > 500 },
   run: async (input) => processRefund(input),
 });`,
        },
      ],
    },
    "scaffold-triage": {
      id: "scaffold-triage",
      title: "Scaffold a billing triage agent",
      lastActivity: "3h",
      pinned: false,
      workedFor: "3m 05s",
      workLog: [
        "Scaffolded agents/triage-agent.ts",
        "Added a severity classifier and the human handoff tool",
        "Registered the agent in the registry index",
      ],
      messages: [
        { role: "user", text: "Scaffold an agent that triages billing tickets by severity." },
        {
          role: "assistant",
          text: "Scaffolded triage-agent with a severity classifier and a handoff to the human queue for critical tickets.",
        },
      ],
      files: [
        {
          path: "agents/triage-agent.ts",
          additions: 6,
          deletions: 0,
          diff: `+++ agents/triage-agent.ts
+export const triageAgent = defineAgent({
+  id: "triage-agent",
+  model: "claude-haiku-4-5",
+  instructions: "Classify billing tickets by severity and route critical ones to a human.",
+  tools: [classifySeverity, handoffToHuman],
+});`,
        },
      ],
    },
    "wire-websearch": {
      id: "wire-websearch",
      title: "Wire webSearch into Research Agent",
      agentId: "research-agent",
      lastActivity: "1d",
      pinned: false,
      workedFor: "58s",
      workLog: [
        "Opened agents/research-agent.ts",
        "Added webSearch with the domain allowlist enforced at the tool boundary",
      ],
      messages: [
        { role: "user", text: "Give the Research Agent access to webSearch with the allowlist." },
        {
          role: "assistant",
          text: "Wired webSearch into research-agent with the domain allowlist enforced at the tool boundary.",
        },
      ],
      files: [
        {
          path: "agents/research-agent.ts",
          additions: 1,
          deletions: 1,
          diff: `--- agents/research-agent.ts
+++ agents/research-agent.ts
 export const researchAgent = defineAgent({
   id: "research-agent",
   model: "claude-opus-4-8",
-  tools: [readFile],
+  tools: [readFile, webSearch],
 });`,
        },
      ],
    },
  });

// Resposta roteirizada para sessões novas iniciadas na home do builder.
export const BUILDER_SCRIPTED_REPLY: Readonly<BuilderMessage> = Object.freeze({
  role: "assistant",
  text: "Here is a first pass — I scaffolded the agent definition on the right. Tell me what to adjust (tools, guardrails, model) and I will iterate.",
});

export const BUILDER_SCRIPTED_FILES = Object.freeze([
  {
    path: "agents/new-agent.ts",
    additions: 6,
    deletions: 0,
    diff: `+++ agents/new-agent.ts
+export const newAgent = defineAgent({
+  id: "new-agent",
+  model: "claude-fable-5",
+  instructions: "Describe the agent behavior here.",
+  tools: [],
+});`,
  },
]);

export const BUILDER_SCRIPTED_WORK_LOG = Object.freeze({
  workedFor: "45s",
  steps: [
    "Scaffolded agents/new-agent.ts from the registry template",
    "Left instructions and tools as editable placeholders",
  ],
});

export const fixturePrompts: readonly PromptSummary[] = Object.freeze([
  {
    id: "support-tone",
    name: "support-tone",
    description: "Shared tone-of-voice block for support-facing agents",
    version: "v3",
    usedBy: 2,
    content:
      "You are speaking with a TheoKit customer. Be concise, cite documentation when it exists, and never promise refunds above $500 without human approval.",
  },
  {
    id: "safety-guardrails",
    name: "safety-guardrails",
    description: "Baseline safety rules referenced by every agent",
    version: "v1",
    usedBy: 3,
    content:
      "Never reveal internal system details. Refuse requests for credentials or secrets. Escalate destructive actions to a human operator.",
  },
  {
    id: "research-citations",
    name: "research-citations",
    description: "Citation discipline for research outputs",
    version: "v2",
    usedBy: 1,
    content:
      "Every claim must cite at least two independent sources. Mark uncertain findings explicitly instead of guessing.",
  },
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
