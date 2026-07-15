import { relative } from "node:path";
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
