// @vitest-environment node
import { join } from "node:path";
import {
  aggregateReflection,
  listReflectionAgents,
  listReflectionSkills,
  type ReflectionAgent,
} from "./reflection-api";

// Reflection endpoint (T1.2): scan + INJECTED load (DIP — production uses ssrLoadModule) +
// compileAgentModule (@theokit/agents/bridge, ADR D2). PER-ITEM degradation: one broken
// module never brings the list down (error-handling.md § 2 — fail fast at the item boundary).

const FIXTURE = join(import.meta.dirname, "../tests/fixtures/demo-project");

// Real fixture modules loaded through vitest's dynamic import (node env) — the same shape
// ssrLoadModule delivers (a namespace with a default export).
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
    // The REAL message is preserved on the item (fail-clear) — never a generic string.
    expect(broken?.error).toContain("boom: import-time side effect exploded");
    // The rest stay intact.
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
        ? new Promise<unknown>(() => {}) // never resolves (EC-6)
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
    // nested/index.ts exports a non-agent → compileAgentModule throws → per-item degradation.
    const nested = items.find((a) => a.name === "nested");
    expect(nested?.error).toBeTruthy();
    // Builder agents declare no subagents (only via the @SubAgents decorator) — the field exists
    // and is an honest []; the workflow aggregation (T1.3) is tested purely.
    const team = items.find((a) => a.name === "team/support");
    expect(team?.subagents).toEqual([]);
  });

  it("test_agents_expose_skills_settings_per_agent", async () => {
    // T1.2→T1.3 obligation: per-agent skills as an OBJECT {enabled?, autoInject?} — an absent
    // enabled means "every discovered skill", not "none" (the SDK's SkillsSettings).
    const { items } = await listReflectionAgents({ projectRoot: FIXTURE, load: realLoad });
    const team = items.find((a) => a.name === "team/support");
    expect(team?.skills?.enabled).toEqual(["demo-skill"]);
    const support = items.find((a) => a.name === "support");
    expect(support?.skills?.enabled).toBeUndefined();
  });
});

describe("aggregateReflection — pure, no IO (T1.3)", () => {
  const stub: ReflectionAgent[] = [
    {
      name: "billing",
      filePath: "agents/billing.ts",
      tools: [
        { name: "refund", description: "Refund an order" },
        { name: "lookupOrder", description: "the first description wins" },
      ],
      subagents: ["triage"],
    },
    {
      name: "support",
      filePath: "agents/support.ts",
      tools: [{ name: "lookupOrder", description: "a divergent description — loses" }],
      subagents: [],
    },
    // A degraded item (post-T1.2): no tools/subagents — the aggregation skips it without crashing.
    { name: "broken", filePath: "agents/broken.ts", error: "boom" },
  ];

  it("test_tools_endpoint_dedups_by_name_and_counts_usedBy", () => {
    const { tools } = aggregateReflection(stub);
    // Sorted by name; deduped with the first description winning; usedBy counts agents.
    expect(tools).toEqual([
      { name: "lookupOrder", description: "the first description wins", usedBy: 2 },
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
        note: "subagent declared on the agent (enumerating workflow instances is an SDK gap — theokit-sdk#123)",
      },
    ]);
  });
});

describe("listReflectionSkills (T1.3)", () => {
  it("test_skills_discovered_from_theokit_skills_convention", async () => {
    // Ecosystem convention: <root>/.theokit/skills/<name>/SKILL.md
    // (the bridge's compile-skills.ts; discoverSkills receives the convention's DIR).
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
    // The real discoverSkills NEVER throws — the degraded branch exists for an injected (DIP)
    // discover that rejects (e.g. a corrupted fs through some future adapter).
    const result = await listReflectionSkills({
      projectRoot: FIXTURE,
      discover: () => Promise.reject(new Error("skills store unreachable")),
    });
    expect(result.items).toEqual([]);
    expect(result.degraded).toContain("skills store unreachable");
  });
});
