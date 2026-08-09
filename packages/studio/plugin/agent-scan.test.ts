// @vitest-environment node
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanStudioAgents } from "./agent-scan";

// chmod 000 is a no-op for root (uid 0): the test would pass for the wrong reason.
const SKIP_IF_ROOT = process.getuid?.() === 0;

// Contract: a faithful mirror of ../theokit/packages/theo/src/server/scan/agent-scan.ts
// (LOCKED convention; the plan's ADR D3 — the SOURCE is the authority, verified 2026-07-15):
// extensions .ts/.tsx/.js/.jsx; test exclusion /\.(test|spec)$/ over the rel WITHOUT its
// extension; 13 composition subfolders excluded (intermediate directories only — a flat file
// "tools.ts" IS a valid agent); index collapsed; root index ignored; \\ normalised; sorted.

const FIXTURE = join(import.meta.dirname, "../tests/fixtures/demo-project");

describe("scanStudioAgents — the theokit convention contract (T1.2)", () => {
  it("test_scan_discovers_top_level_agents_and_collapses_index", () => {
    const names = scanStudioAgents(FIXTURE).map((n) => n.name);
    // Deterministic ordering by name (an fs walk guarantees none).
    expect(names).toEqual(["nested", "support", "team/support", "tools"]);
  });

  it("test_scan_excludes_composition_subfolders_and_tests_but_keeps_flat_files", () => {
    const names = scanStudioAgents(FIXTURE).map((n) => n.name);
    // tools/ignored.ts está sob diretório de composição → fora.
    expect(names).not.toContain("tools/ignored");
    // skip.test.ts casa /\.(test|spec)$/ no rel sem extensão → fora.
    expect(names).not.toContain("skip.test");
    expect(names).not.toContain("skip");
    // BUT the flat file "tools.ts" is a valid agent (the exclusion looks at directories only).
    expect(names).toContain("tools");
    // index.ts at the root of agents/ is ignored (an empty name does not route).
    expect(names).not.toContain("index");
  });

  it("test_scan_preserves_nested_names_with_slash", () => {
    const node = scanStudioAgents(FIXTURE).find((n) => n.name === "team/support");
    expect(node).toBeTruthy();
    expect(node?.filePath.endsWith("team/support.ts")).toBe(true);
  });

  it("test_scan_returns_empty_when_agents_dir_missing_or_not_a_directory", () => {
    const tmp = mkdtempSync(join(tmpdir(), "studio-scan-"));
    try {
      // Missing dir → [] without throwing.
      expect(scanStudioAgents(tmp)).toEqual([]);
      // "agents" exists but is a FILE → [] (parity with statSync().isDirectory()).
      writeFileSync(join(tmp, "agents"), "not a dir");
      expect(scanStudioAgents(tmp)).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("test_scan_honors_custom_agents_dir_name", () => {
    const tmp = mkdtempSync(join(tmpdir(), "studio-scan-"));
    try {
      mkdirSync(join(tmp, "core/agents"), { recursive: true });
      writeFileSync(join(tmp, "core/agents/billing.ts"), "export default {}");
      expect(scanStudioAgents(tmp, "core/agents").map((n) => n.name)).toEqual(["billing"]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("a scan resilient to an unreadable directory (M6 T3.1)", () => {
  it.skipIf(SKIP_IF_ROOT)("unreadable_subdirectory_is_skipped_not_fatal", () => {
    // scanStudioAgents has TWO consumers (reflection-api.ts:85, run-endpoint.ts:173): an EACCES
    // in one subfolder brought down the entire reflection AND the run with a 500.
    const tmp = mkdtempSync(join(tmpdir(), "studio-scan-eacces-"));
    const agents = join(tmp, "agents");
    mkdirSync(join(agents, "locked"), { recursive: true });
    writeFileSync(join(agents, "support.ts"), "export default {}");
    writeFileSync(join(agents, "locked", "hidden.ts"), "export default {}");
    chmodSync(join(agents, "locked"), 0o000);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const names = scanStudioAgents(tmp).map((n) => n.name);

      // Degrades per directory: whatever is readable keeps being served.
      expect(names).toContain("support");
      // And the skip is VISIBLE — swallowing it silently is forbidden (error-handling.md § 2).
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      chmodSync(join(agents, "locked"), 0o755);
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
