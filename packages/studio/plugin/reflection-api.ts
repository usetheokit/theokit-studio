import { join, relative } from "node:path";
import { compileAgentModule } from "@theokit/agents/bridge";
import { type AgentFileNode, scanStudioAgents } from "./agent-scan";

/**
 * Agent reflection (T1.2, ADR D2): fs scan + injected load (DIP — production uses
 * `server.ssrLoadModule`, hot reload for free; NEVER cache between requests) + the bridge's
 * public `compileAgentModule`. A load/compile failure degrades ONLY that item.
 */
export interface ReflectionTool {
  name: string;
  description: string;
}

export interface ReflectionAgent {
  name: string;
  /** path relative to the project root (stable for display; never absolute). */
  filePath: string;
  model?: string;
  tools?: ReflectionTool[];
  /** declared subagent names (via @SubAgents; builder agents → []). */
  subagents?: string[];
  /**
   * The SDK's SkillsSettings kept as an object: an ABSENT `enabled` means "every discovered
   * skill", not "none" (a distinction a flattened array would lose).
   */
  skills?: { enabled?: string[]; autoInject?: boolean };
  error?: string;
}

export interface ListAgentsDeps {
  projectRoot: string;
  agentsDir?: string;
  /** loader for the agent's module (production: ssrLoadModule; tests: a stub). */
  load: (filePath: string) => Promise<unknown>;
  /** EC-6: an agent whose import side effect hangs must not freeze the reflection. */
  loadTimeoutMs?: number;
}

export interface ListAgentsResult {
  items: ReflectionAgent[];
  hint?: string;
}

const DEFAULT_LOAD_TIMEOUT_MS = 10_000;

async function loadWithTimeout(
  load: (filePath: string) => Promise<unknown>,
  filePath: string,
  timeoutMs: number,
): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(filePath),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`load timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    // The timer is always cleared (SEPA T1.2) — no 10s handle left alive per request.
    clearTimeout(timer);
  }
}

function toReflectionAgent(
  node: AgentFileNode,
  projectRoot: string,
  compiled: ReturnType<typeof compileAgentModule>,
): ReflectionAgent {
  return {
    name: node.name,
    filePath: relative(projectRoot, node.filePath).replace(/\\/g, "/"),
    model: compiled.model,
    tools: compiled.tools.map((t) => ({ name: t.name, description: t.description })),
    subagents: Object.keys(compiled.agents),
    skills: compiled.skills
      ? { enabled: compiled.skills.enabled, autoInject: compiled.skills.autoInject }
      : undefined,
  };
}

/** Enumerates the project's agents with compiled metadata — the heart of the reflection. */
export async function listReflectionAgents(deps: ListAgentsDeps): Promise<ListAgentsResult> {
  const nodes = scanStudioAgents(deps.projectRoot, deps.agentsDir);
  if (nodes.length === 0) {
    return {
      items: [],
      hint: `no agents found — create ${deps.agentsDir ?? "agents"}/<name>.ts in the project root`,
    };
  }
  const timeoutMs = deps.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
  const items: ReflectionAgent[] = [];
  for (const node of nodes) {
    const relPath = relative(deps.projectRoot, node.filePath).replace(/\\/g, "/");
    try {
      const mod = await loadWithTimeout(deps.load, node.filePath, timeoutMs);
      items.push(toReflectionAgent(node, deps.projectRoot, compileAgentModule(mod, relPath)));
    } catch (error) {
      // Per-item degradation carrying the REAL message (fail-clear) — never a silent empty list.
      items.push({
        name: node.name,
        filePath: relPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { items };
}

// ————— Aggregates (T1.3) — pure functions, testable without IO —————

export interface AggregatedTool extends ReflectionTool {
  /** how many agents use the tool (deduped by name; the first description wins). */
  usedBy: number;
}

export interface AggregatedWorkflow {
  id: string;
  name: string;
  agent: string;
  source: "subagent";
  note: string;
}

const WORKFLOW_NOTE =
  "subagent declared on the agent (enumerating workflow instances is an SDK gap — theokit-sdk#123)";

/** Aggregates tools/workflows from the compiled agents. Degraded items (error) are skipped. */
export function aggregateReflection(agents: ReflectionAgent[]): {
  tools: AggregatedTool[];
  workflows: AggregatedWorkflow[];
} {
  const byName = new Map<string, { description: string; usedBy: number }>();
  const workflows: AggregatedWorkflow[] = [];
  for (const agent of agents) {
    if (agent.error) continue;
    for (const tool of agent.tools ?? []) {
      const seen = byName.get(tool.name);
      if (seen) {
        seen.usedBy += 1;
      } else {
        byName.set(tool.name, { description: tool.description, usedBy: 1 });
      }
    }
    for (const sub of agent.subagents ?? []) {
      workflows.push({
        id: `${agent.name}/${sub}`,
        name: sub,
        agent: agent.name,
        source: "subagent",
        note: WORKFLOW_NOTE,
      });
    }
  }
  const tools = [...byName.entries()]
    .map(([name, v]) => ({ name, description: v.description, usedBy: v.usedBy }))
    .sort((a, b) => a.name.localeCompare(b.name));
  workflows.sort((a, b) => a.id.localeCompare(b.id));
  return { tools, workflows };
}

// ————— Skills (T1.3) —————

export interface ReflectionSkill {
  name: string;
  description: string;
  category?: string;
}

export interface ListSkillsDeps {
  projectRoot: string;
  /**
   * injected discover (DIP): default = @theokit/sdk/skills' discoverSkills over the ecosystem
   * convention `<root>/.theokit/skills/<name>/SKILL.md`. The real discoverSkills NEVER throws
   * (missing dir → []); the degraded branch covers injected discovers.
   */
  discover?: (dir: string) => Promise<ReflectionSkill[]>;
}

export interface ListSkillsResult {
  items: ReflectionSkill[];
  /** names of skills with invalid frontmatter (skipped — visible, never silent). */
  invalid?: string[];
  degraded?: string;
}

/** Enumerates skills from the `.theokit/skills` convention with honest degradation. */
export async function listReflectionSkills(deps: ListSkillsDeps): Promise<ListSkillsResult> {
  const skillsDir = join(deps.projectRoot, ".theokit/skills");
  try {
    if (deps.discover) {
      return { items: await deps.discover(skillsDir) };
    }
    const { discoverSkills } = await import("@theokit/sdk/skills");
    const invalid: string[] = [];
    const skills = await discoverSkills(skillsDir, {
      // A malformed skill is skipped — but never silently (error-handling.md § 2).
      onInvalidSkill: (info: { name: string; code: string; message: string }) =>
        invalid.push(`${info.name}: ${info.code} — ${info.message}`),
    });
    return {
      items: skills.map((s) => ({
        name: s.name,
        description: s.description,
        category: s.category,
      })),
      invalid: invalid.length > 0 ? invalid : undefined,
    };
  } catch (error) {
    return {
      items: [],
      degraded: error instanceof Error ? error.message : String(error),
    };
  }
}
