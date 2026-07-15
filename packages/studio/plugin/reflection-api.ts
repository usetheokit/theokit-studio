import { join, relative } from "node:path";
import { compileAgentModule } from "@theokit/agents/bridge";
import { type AgentFileNode, scanStudioAgents } from "./agent-scan";

/**
 * Reflection de agents (T1.2, ADR D2): scan fs + load injetado (DIP — produção usa
 * `server.ssrLoadModule`, hot-reload grátis; NUNCA cachear entre requests) +
 * `compileAgentModule` público do bridge. Falha de load/compile degrada SÓ o item.
 */
export interface ReflectionTool {
  name: string;
  description: string;
}

export interface ReflectionAgent {
  name: string;
  /** caminho relativo ao project root (estável para exibição; nunca absoluto). */
  filePath: string;
  model?: string;
  tools?: ReflectionTool[];
  /** nomes de subagents declarados (via @SubAgents; builder agents → []). */
  subagents?: string[];
  /**
   * SkillsSettings do SDK preservado como objeto: `enabled` AUSENTE significa
   * "todas as skills descobertas", não "nenhuma" (distinção que um array achatado perderia).
   */
  skills?: { enabled?: string[]; autoInject?: boolean };
  error?: string;
}

export interface ListAgentsDeps {
  projectRoot: string;
  agentsDir?: string;
  /** carregador do módulo do agent (produção: ssrLoadModule; teste: stub). */
  load: (filePath: string) => Promise<unknown>;
  /** EC-6: um agent com side-effect travado no import não pode congelar a reflection. */
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
    // Timer sempre limpo (SEPA T1.2) — sem handle de 10s vivo por request.
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

/** Enumera os agents do projeto com metadados compilados — o coração da reflection. */
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
      // Degradação por item com a mensagem REAL (fail-clear) — nunca lista vazia silenciosa.
      items.push({
        name: node.name,
        filePath: relPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { items };
}

// ————— Agregados (T1.3) — funções puras testáveis sem IO —————

export interface AggregatedTool extends ReflectionTool {
  /** quantos agents usam a tool (dedup por name; primeira descrição vence). */
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
  "subagent declarado no agent (enumeração de instâncias de workflow é gap do SDK — theokit-sdk#123)";

/** Agrega tools/workflows dos agents compilados. Itens degradados (error) são pulados. */
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
   * discover injetado (DIP): default = discoverSkills do @theokit/sdk/skills sobre a
   * convenção do ecossistema `<root>/.theokit/skills/<name>/SKILL.md`. discoverSkills
   * real NUNCA lança (dir ausente → []); o branch degraded cobre discovers injetados.
   */
  discover?: (dir: string) => Promise<ReflectionSkill[]>;
}

export interface ListSkillsResult {
  items: ReflectionSkill[];
  /** nomes de skills com frontmatter inválido (puladas — visíveis, nunca silenciosas). */
  invalid?: string[];
  degraded?: string;
}

/** Enumera skills da convenção `.theokit/skills` com degradação honesta. */
export async function listReflectionSkills(deps: ListSkillsDeps): Promise<ListSkillsResult> {
  const skillsDir = join(deps.projectRoot, ".theokit/skills");
  try {
    if (deps.discover) {
      return { items: await deps.discover(skillsDir) };
    }
    const { discoverSkills } = await import("@theokit/sdk/skills");
    const invalid: string[] = [];
    const skills = await discoverSkills(skillsDir, {
      // Skill malformada é pulada — mas nunca em silêncio (error-handling.md § 2).
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
