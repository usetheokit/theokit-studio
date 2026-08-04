import { type Dirent, existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

/**
 * Espelho fiel da convenção LOCKED do theokit
 * (`../theokit/packages/theo/src/server/scan/agent-scan.ts`, verificado 2026-07-15 @ 53e3582d;
 * ADR D3 do plano — reimplementação com teste de contrato; deduplicar quando o theokit
 * exportar `scanAgents` publicamente, followup F1).
 */
const AGENT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const TEST_FILE = /\.(test|spec)$/;
const AGENT_SUBFOLDERS = new Set([
  "tools",
  "skills",
  "prompts",
  "lib",
  "hooks",
  "channels",
  "connections",
  "subagents",
  "schedules",
  "sandbox",
  "workflows",
  "evals",
  "memory",
]);

/** Um arquivo de agent descoberto. `name` preserva `/` em aninhados (ex.: "team/support"). */
export interface AgentFileNode {
  filePath: string;
  name: string;
}

function walk(dir: string, visit: (absPath: string) => void): void {
  // Degrada POR DIRETÓRIO (M6 ADR A4): scanStudioAgents tem dois consumidores
  // (reflection-api.ts, run-endpoint.ts), então um EACCES numa subpasta derrubava a
  // reflection inteira E o run. O diretório ilegível é pulado — e o pulo é VISÍVEL,
  // porque engolir o erro em silêncio é proibido (error-handling.md § 2).
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "UNKNOWN";
    console.warn(`theokit-studio: skipping unreadable agents directory ${dir} (${code})`);
    return;
  }
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, visit);
    } else if (AGENT_EXTENSIONS.has(extname(entry.name))) {
      visit(abs);
    }
  }
}

/** Scan da convenção top-level `agents/` (dir configurável, ex.: "core/agents"). */
export function scanStudioAgents(projectRoot: string, agentsDirName = "agents"): AgentFileNode[] {
  const agentsDir = join(projectRoot, agentsDirName);
  if (!existsSync(agentsDir) || !statSync(agentsDir).isDirectory()) {
    return [];
  }
  const results: AgentFileNode[] = [];
  walk(agentsDir, (absPath) => {
    let rel = relative(agentsDir, absPath).replace(/\\/g, "/");
    rel = rel.slice(0, -extname(rel).length);
    if (TEST_FILE.test(rel)) return;
    // Composição olha só os DIRETÓRIOS intermediários — o arquivo pode ter qualquer nome.
    const dirs = rel.split("/").slice(0, -1);
    if (dirs.some((segment) => AGENT_SUBFOLDERS.has(segment))) return;
    if (rel.endsWith("/index")) rel = rel.slice(0, -6);
    // index raiz não roteia (nome vazio é inútil para o playground).
    if (rel === "index" || rel === "") return;
    results.push({ filePath: absPath, name: rel });
  });
  // Ordenação determinística (testing.md § 6) — a ordem do fs walk não é garantida.
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}
