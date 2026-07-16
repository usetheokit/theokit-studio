// @vitest-environment node
import { join } from "node:path";
import {
  aggregateReflection,
  listReflectionAgents,
  listReflectionSkills,
  type ReflectionAgent,
} from "./reflection-api";

// Endpoint de reflection (T1.2): scan + load INJETADO (DIP — produção usa ssrLoadModule)
// + compileAgentModule (@theokit/agents/bridge, ADR D2). Degradação POR ITEM: um módulo
// quebrado nunca derruba a lista (error-handling.md § 2 — fail-fast por fronteira de item).

const FIXTURE = join(import.meta.dirname, "../tests/fixtures/demo-project");

// Módulos reais da fixture carregados via import dinâmico do vitest (node env) —
// mesmo shape que o ssrLoadModule entrega (namespace com default export).
const realLoad = (file: string) => import(/* @vite-ignore */ file) as Promise<unknown>;

describe("listReflectionAgents (T1.2)", () => {
  it("test_agents_endpoint_compiles_metadata_per_agent", async () => {
    const { items } = await listReflectionAgents({ projectRoot: FIXTURE, load: realLoad });
    const support = items.find((a) => a.name === "support");
    expect(support).toBeTruthy();
    expect(support?.error).toBeUndefined();
    expect(support?.model).toBe("anthropic/claude-sonnet-4-6");
    expect(support?.tools).toEqual([
      { name: "lookupOrder", description: "Look up an order by id in the demo store" },
    ]);
    expect(support?.filePath).toBe("agents/support.ts");
  });

  it("test_agents_endpoint_degrades_per_item_on_broken_module", async () => {
    const load = (file: string) =>
      file.endsWith("support.ts") && !file.includes("team")
        ? Promise.reject(new Error("boom: import-time side effect exploded"))
        : realLoad(file);
    const { items } = await listReflectionAgents({ projectRoot: FIXTURE, load });
    const broken = items.find((a) => a.name === "support");
    // Mensagem REAL preservada no item (fail-clear) — nunca string genérica.
    expect(broken?.error).toContain("boom: import-time side effect exploded");
    // Os demais seguem íntegros.
    const ok = items.find((a) => a.name === "team/support");
    expect(ok?.error).toBeUndefined();
    expect(ok?.model).toBeTruthy();
  });

  it("test_agents_endpoint_hints_when_no_agents_dir", async () => {
    const { items, hint } = await listReflectionAgents({
      projectRoot: join(FIXTURE, ".."),
      load: realLoad,
    });
    expect(items).toEqual([]);
    expect(hint).toContain("agents/");
  });

  it("test_agent_load_timeout_degrades_that_item", async () => {
    const load = (file: string) =>
      file.endsWith("tools.ts")
        ? new Promise<unknown>(() => {}) // nunca resolve (EC-6)
        : realLoad(file);
    const { items } = await listReflectionAgents({
      projectRoot: FIXTURE,
      load,
      loadTimeoutMs: 50,
    });
    const stuck = items.find((a) => a.name === "tools");
    expect(stuck?.error).toMatch(/load timeout after 50ms/);
    expect(items.find((a) => a.name === "support")?.error).toBeUndefined();
  });

  it("test_agents_endpoint_exposes_subagents_and_module_error_for_non_agent_export", async () => {
    const { items } = await listReflectionAgents({ projectRoot: FIXTURE, load: realLoad });
    // nested/index.ts exporta um não-agent → compileAgentModule lança → degradação por item.
    const nested = items.find((a) => a.name === "nested");
    expect(nested?.error).toBeTruthy();
    // Agents do builder não declaram subagents (via só por @SubAgents decorator) —
    // o campo existe e é [] honesto; a agregação de workflows (T1.3) é testada puro.
    const team = items.find((a) => a.name === "team/support");
    expect(team?.subagents).toEqual([]);
  });

  it("test_agents_expose_skills_settings_per_agent", async () => {
    // Obrigação T1.2→T1.3: skills por-agent como OBJETO {enabled?, autoInject?} —
    // enabled ausente significa "todas as descobertas", não "nenhuma" (SkillsSettings do SDK).
    const { items } = await listReflectionAgents({ projectRoot: FIXTURE, load: realLoad });
    const team = items.find((a) => a.name === "team/support");
    expect(team?.skills?.enabled).toEqual(["demo-skill"]);
    const support = items.find((a) => a.name === "support");
    expect(support?.skills?.enabled).toBeUndefined();
  });
});

describe("aggregateReflection — pura, sem IO (T1.3)", () => {
  const stub: ReflectionAgent[] = [
    {
      name: "billing",
      filePath: "agents/billing.ts",
      tools: [
        { name: "refund", description: "Refund an order" },
        { name: "lookupOrder", description: "primeira descrição vence" },
      ],
      subagents: ["triage"],
    },
    {
      name: "support",
      filePath: "agents/support.ts",
      tools: [{ name: "lookupOrder", description: "descrição divergente — perde" }],
      subagents: [],
    },
    // Item degradado (pós-T1.2): sem tools/subagents — a agregação pula sem crash.
    { name: "broken", filePath: "agents/broken.ts", error: "boom" },
  ];

  it("test_tools_endpoint_dedups_by_name_and_counts_usedBy", () => {
    const { tools } = aggregateReflection(stub);
    // Ordenado por name; dedup com primeira descrição vencendo; usedBy conta agents.
    expect(tools).toEqual([
      { name: "lookupOrder", description: "primeira descrição vence", usedBy: 2 },
      { name: "refund", description: "Refund an order", usedBy: 1 },
    ]);
  });

  it("test_workflows_endpoint_lists_subagents_with_honest_source", () => {
    const { workflows } = aggregateReflection(stub);
    expect(workflows).toEqual([
      {
        id: "billing/triage",
        name: "triage",
        agent: "billing",
        source: "subagent",
        note: "subagent declarado no agent (enumeração de instâncias de workflow é gap do SDK — theokit-sdk#123)",
      },
    ]);
  });
});

describe("listReflectionSkills (T1.3)", () => {
  it("test_skills_discovered_from_theokit_skills_convention", async () => {
    // Convenção do ecossistema: <root>/.theokit/skills/<name>/SKILL.md
    // (compile-skills.ts do bridge; discoverSkills recebe o DIR da convenção).
    const result = await listReflectionSkills({ projectRoot: FIXTURE });
    expect(result.items.map((s) => s.name)).toEqual(["demo-skill"]);
    expect(result.degraded).toBeUndefined();
  });

  it("test_skills_empty_without_convention_dir_is_honest_not_degraded", async () => {
    const result = await listReflectionSkills({ projectRoot: join(FIXTURE, "..") });
    expect(result.items).toEqual([]);
    expect(result.degraded).toBeUndefined();
  });

  it("test_skills_endpoint_degrades_honestly_when_discover_fails", async () => {
    // discoverSkills real NUNCA lança — o branch degraded existe para discover
    // injetado (DIP) que rejeita (ex.: fs corrompido via adapter futuro).
    const result = await listReflectionSkills({
      projectRoot: FIXTURE,
      discover: () => Promise.reject(new Error("skills store unreachable")),
    });
    expect(result.items).toEqual([]);
    expect(result.degraded).toContain("skills store unreachable");
  });
});
