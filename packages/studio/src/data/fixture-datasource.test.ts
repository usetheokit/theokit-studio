import { createFixtureDataSource } from "./fixture-datasource";
import { metrics } from "./metrics";

describe("FixtureDataSource (the Agent Builder contract)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("lists_agents_and_skills_from_fixtures", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    const agents = await ds.listAgents();
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
    });
    expect((await ds.listSkills()).length).toBeGreaterThan(0);
  });

  it("empty_scenario_returns_empty_lists", async () => {
    const ds = createFixtureDataSource({ scenario: "empty" });
    expect(await ds.listAgents()).toEqual([]);
    expect(await ds.listSkills()).toEqual([]);
    expect(await ds.listBuilderSessions()).toEqual([]);
  });

  it("datasource_calls_increment_metrics", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    await ds.listAgents();
    await ds.listAgents();
    expect(metrics.snapshot().datasource_calls_total.listAgents).toBe(2);
  });
});

describe("builder sessions (review F-tests-1/F-dt-1)", () => {
  it("getBuilderSession_unknown_id_rejects_typed_error", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    await expect(ds.getBuilderSession("nope")).rejects.toThrow(
      /Builder session 'nope' does not exist/,
    );
  });

  it("getBuilderSession_rejects_in_empty_scenario", async () => {
    const ds = createFixtureDataSource({ scenario: "empty" });
    await expect(ds.getBuilderSession("refine-support-tone")).rejects.toThrow(/does not exist/);
  });

  it("startBuilderSession_returns_scripted_session_with_unique_ids_and_metric", async () => {
    metrics.reset();
    const ds = createFixtureDataSource({ scenario: "default" });
    const a = await ds.startBuilderSession("Build a billing agent");
    const b = await ds.startBuilderSession("Another one", "support-agent");
    expect(a.id).not.toBe(b.id);
    expect(a.messages[0]?.text).toBe("Build a billing agent");
    expect(a.files.length).toBeGreaterThan(0);
    expect(b.agentId).toBe("support-agent");
    expect(metrics.snapshot().datasource_calls_total.startBuilderSession).toBe(2);
  });

  it("startBuilderSession_blank_prompt_rejects_typed_error", async () => {
    const ds = createFixtureDataSource({ scenario: "default" });
    await expect(ds.startBuilderSession("   ")).rejects.toThrow(/must not be blank/);
  });
});
