import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { WorkflowsPage } from "./index";

function renderWorkflows() {
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
      <WorkflowsPage />
    </DataSourceProvider>,
  );
}

describe("Workflows (Mastra-parity clone)", () => {
  it("lists_workflows_with_name_description_and_step_count", async () => {
    renderWorkflows();
    const rows = await screen.findAllByTestId("workflow-row");
    expect(rows.length).toBe(2);
    expect(rows[0]?.textContent).toContain("customer-onboarding");
    expect(rows[0]?.textContent).toContain("4");
  });

  it("filter_narrows_workflow_list", async () => {
    renderWorkflows();
    await screen.findAllByTestId("workflow-row");
    await userEvent.type(screen.getByRole("searchbox", { name: /filter workflows/i }), "escala");
    const rows = screen.getAllByTestId("workflow-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("ticket-escalation");
  });

  it("row_click_opens_detail_with_step_graph_and_disabled_run", async () => {
    renderWorkflows();
    const rows = await screen.findAllByTestId("workflow-row");
    const onboarding = rows.find((r) => r.textContent?.includes("customer-onboarding"));
    if (!onboarding) throw new Error("workflow row not found");
    await userEvent.click(onboarding);

    const graph = await screen.findByTestId("workflow-graph");
    expect(graph.textContent).toContain("Start");
    expect(graph.textContent).toContain("verify-account");
    expect(graph.textContent).toContain("schedule-checkin");
    expect(graph.textContent).toContain("End");
    // Run desabilitado em fixtures mode (honestidade — nada de run simulado).
    const runButton = screen.getByRole("button", { name: /run/i }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(true);
    // Recent runs do fixture aparecem.
    expect(screen.getAllByTestId("workflow-run").length).toBe(3);
  });

  it("back_button_returns_to_workflow_list", async () => {
    renderWorkflows();
    await userEvent.click((await screen.findAllByTestId("workflow-row"))[0] as HTMLElement);
    await screen.findByTestId("workflow-graph");
    await userEvent.click(screen.getByRole("button", { name: /all workflows/i }));
    expect((await screen.findAllByTestId("workflow-row")).length).toBe(2);
  });

  it("empty_scenario_shows_no_registry_state_not_filter_message", async () => {
    // Review F-domtest-1: registry vazio ≠ "no match for your filter".
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "empty" })}>
        <WorkflowsPage />
      </DataSourceProvider>,
    );
    expect(await screen.findByText(/no workflows registered yet/i)).toBeTruthy();
    expect(screen.queryByText(/match your filter/i)).toBeNull();
  });

  it("datasource_rejection_surfaces_as_visible_alert", async () => {
    // Review F-domtest-2: caminho de erro do useListing renderiza role=alert.
    const broken = {
      ...createFixtureDataSource({ scenario: "default" }),
      listWorkflows: () => Promise.reject(new Error("registry unreachable")),
    };
    render(
      <DataSourceProvider value={broken}>
        <WorkflowsPage />
      </DataSourceProvider>,
    );
    const alertEl = await screen.findByRole("alert");
    expect(alertEl.textContent).toContain("registry unreachable");
  });
});
