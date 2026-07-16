// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanStudioAgents } from "./agent-scan";

// Contrato: espelho fiel de ../theokit/packages/theo/src/server/scan/agent-scan.ts
// (convenção LOCKED; ADR D3 do plano — o FONTE é a autoridade, verificado 2026-07-15):
// extensões .ts/.tsx/.js/.jsx; exclusão de teste /\.(test|spec)$/ sobre o rel SEM extensão;
// 13 subpastas de composição excluídas (só diretórios intermediários — arquivo plano
// "tools.ts" É agent válido); index colapsado; index raiz ignorado; \\ normalizado; sort.

const FIXTURE = join(import.meta.dirname, "../tests/fixtures/demo-project");

describe("scanStudioAgents — contrato da convenção theokit (T1.2)", () => {
  it("test_scan_discovers_top_level_agents_and_collapses_index", () => {
    const names = scanStudioAgents(FIXTURE).map((n) => n.name);
    // Ordenação determinística por name (fs walk não garante ordem).
    expect(names).toEqual(["nested", "support", "team/support", "tools"]);
  });

  it("test_scan_excludes_composition_subfolders_and_tests_but_keeps_flat_files", () => {
    const names = scanStudioAgents(FIXTURE).map((n) => n.name);
    // tools/ignored.ts está sob diretório de composição → fora.
    expect(names).not.toContain("tools/ignored");
    // skip.test.ts casa /\.(test|spec)$/ no rel sem extensão → fora.
    expect(names).not.toContain("skip.test");
    expect(names).not.toContain("skip");
    // MAS o arquivo plano "tools.ts" é um agent válido (a exclusão olha só diretórios).
    expect(names).toContain("tools");
    // index.ts na raiz de agents/ é ignorado (nome vazio não roteia).
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
      // Dir ausente → [] sem throw.
      expect(scanStudioAgents(tmp)).toEqual([]);
      // "agents" existente mas ARQUIVO → [] (paridade com statSync().isDirectory()).
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
