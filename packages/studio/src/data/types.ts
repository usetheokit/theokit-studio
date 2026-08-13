// Entities of the Studio's surface — the Agent Builder (fixtures; the dev server's reflection
// swaps the adapter). A 100% react-free layer (architecture.md § 2).

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  model?: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
}

export interface BuilderSessionSummary {
  id: string;
  title: string;
  /** the session's target agent (when one already exists). */
  agentId?: string;
  /** relative activity shown in the list (display-ready fixture, e.g. "2m"). */
  lastActivity: string;
  pinned: boolean;
}

export interface BuilderMessage {
  role: "user" | "assistant";
  text: string;
}

export interface BuilderArtifactFile {
  /** path of the changed file (e.g. "agents/support-agent.ts"). */
  path: string;
  additions: number;
  deletions: number;
  /** unified diff shown in the review panel (coloured +/-). */
  diff: string;
}

export interface BuilderSessionDetail extends BuilderSessionSummary {
  messages: BuilderMessage[];
  /** duration shown in the worklog (display-ready fixture, e.g. "2m 30s"). */
  workedFor: string;
  /** the worklog's steps (expandable in the thread). */
  workLog: string[];
  /** files edited by the session (the Review panel on the right). */
  files: BuilderArtifactFile[];
}

// M7 T2.1: `"offline"` removed — no consumer distinguished it from `"default"`
// (`fixture-datasource.ts` only branches on `"empty"`), so it was surface accepted and ignored.
export type FixtureScenario = "default" | "empty";

// Typed errors from the data boundary (error-handling.md § 2 — fail fast, context in the message).

export class BlankBuildPromptError extends Error {
  constructor() {
    super("Build prompt must not be blank — describe what to build");
    this.name = "BlankBuildPromptError";
  }
}

export class UnknownBuilderSessionError extends Error {
  constructor(sessionId: string) {
    super(`Builder session '${sessionId}' does not exist`);
    this.name = "UnknownBuilderSessionError";
  }
}
