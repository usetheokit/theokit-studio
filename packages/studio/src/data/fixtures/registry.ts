import type {
  AgentSummary,
  BuilderMessage,
  BuilderSessionDetail,
  BuilderSessionSummary,
  SkillSummary,
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

export const fixtureSkills: readonly SkillSummary[] = Object.freeze([
  { id: "summarize", name: "summarize", description: "Summarizes long documents" },
  { id: "triage", name: "triage", description: "Classifies and prioritizes tickets" },
]);
