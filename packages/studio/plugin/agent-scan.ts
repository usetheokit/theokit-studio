import { type Dirent, existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

/**
 * A faithful mirror of theokit's LOCKED convention
 * (`../theokit/packages/theo/src/server/scan/agent-scan.ts`, verified 2026-07-15 @ 53e3582d;
 * the plan's ADR D3 — a reimplementation with a contract test; deduplicate once theokit
 * exports `scanAgents` publicly, followup F1).
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

/** A discovered agent file. `name` keeps the `/` for nested ones (e.g. "team/support"). */
export interface AgentFileNode {
  filePath: string;
  name: string;
}

function walk(dir: string, visit: (absPath: string) => void): void {
  // Degrades PER DIRECTORY (M6 ADR A4): scanStudioAgents has two consumers (reflection-api.ts,
  // run-endpoint.ts), so an EACCES in one subfolder brought down the entire reflection AND the
  // run. The unreadable directory is skipped — and the skip is VISIBLE, because swallowing the
  // error silently is forbidden (error-handling.md § 2).
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
    // Composition looks only at the intermediate DIRECTORIES — the file may have any name.
    const dirs = rel.split("/").slice(0, -1);
    if (dirs.some((segment) => AGENT_SUBFOLDERS.has(segment))) return;
    if (rel.endsWith("/index")) rel = rel.slice(0, -6);
    // A root index does not route (an empty name is useless to the playground).
    if (rel === "index" || rel === "") return;
    results.push({ filePath: absPath, name: rel });
  });
  // Deterministic ordering (testing.md § 6) — an fs walk's order is not guaranteed.
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}
