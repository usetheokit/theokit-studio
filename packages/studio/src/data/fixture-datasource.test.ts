import { createFixtureDataSource } from "./fixture-datasource";
import { metrics } from "./metrics";
import { EmptyQueryError, UnknownCollectionError } from "./types";

describe("FixtureDataSource (T1.1)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("lists_agents_tools_skills_workflows_from_fixtures", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const agents = await ds.listAgents();
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
    });
    expect((await ds.listTools()).length).toBeGreaterThan(0);
    expect((await ds.listSkills()).length).toBeGreaterThan(0);
    expect((await ds.listWorkflows()).length).toBeGreaterThan(0);
  });

  it("default_scenario_includes_a_volume_list_of_50_plus_items", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const tools = await ds.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(50);
  });

  it("empty_scenario_returns_empty_lists", async () => {
    const ds = createFixtureDataSource({ scenario: "empty" });
    expect(await ds.listAgents()).toEqual([]);
    expect(await ds.getMemories()).toEqual([]);
    expect(await ds.listCollections()).toEqual([]);
  });

  it("query_returns_scored_chunks_sorted_desc", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const collections = await ds.listCollections();
    const first = collections[0];
    if (!first) throw new Error("fixture default sem collections");
    const results = await ds.query(first.id, "agent memory");
    expect(results.length).toBeGreaterThan(0);
    const scores = results.map((r) => r.score);
    const sortedDesc = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedDesc);
    for (const s of scores) {
      expect(s).toBeLessThanOrEqual(1.0);
    }
  });

  it("query_with_blank_text_throws_EmptyQueryError", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const collections = await ds.listCollections();
    const firstId = collections[0]?.id ?? "docs";
    await expect(ds.query(firstId, "   ")).rejects.toBeInstanceOf(EmptyQueryError);
  });

  it("query_unknown_collection_throws_UnknownCollectionError", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const err = await ds.query("nao-existe", "algo").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnknownCollectionError);
    expect((err as Error).message).toContain("nao-existe");
  });

  it("health_reports_lens_offline_and_memory_rag_online_in_default_scenario", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const health = await ds.health();
    expect(health.lens.status).toBe("offline");
    expect(health.memory.status).toBe("online");
    expect(health.rag.status).toBe("online");
  });

  it("offline_scenario_reports_every_service_offline", async () => {
    const ds = createFixtureDataSource({ scenario: "offline" });
    const health = await ds.health();
    expect(health.memory.status).toBe("offline");
    expect(health.rag.status).toBe("offline");
  });

  it("datasource_calls_increment_metrics", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    await ds.listAgents();
    await ds.listAgents();
    expect(metrics.snapshot().datasource_calls_total.listAgents).toBe(2);
  });

  it("memories_have_scope_and_content", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const memories = await ds.getMemories();
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0]).toMatchObject({
      id: expect.any(String),
      scope: expect.any(String),
      content: expect.any(String),
    });
  });

  it("documents_and_chunks_navigate_from_collection", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const collections = await ds.listCollections();
    const withDocs = collections.find((c) => c.documentCount > 0);
    if (!withDocs) throw new Error("fixture default sem collection com documentos");
    const docs = await ds.listDocuments(withDocs.id);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0]?.chunks.length).toBeGreaterThan(0);
  });

  it("default_scenario_has_an_empty_collection_for_EC6", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const collections = await ds.listCollections();
    expect(collections.some((c) => c.documentCount === 0)).toBe(true);
  });
});
