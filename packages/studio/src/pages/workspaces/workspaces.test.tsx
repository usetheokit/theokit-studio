import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { metrics } from "../../data/metrics";
import { WorkspacesPage } from "./index";

function renderWorkspaces(scenario: "default" | "empty" = "default") {
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario })}>
      <WorkspacesPage />
    </DataSourceProvider>,
  );
}

async function findEntry(name: string): Promise<HTMLElement> {
  const entries = await screen.findAllByTestId("workspace-file");
  const entry = entries.find((e) => e.textContent?.includes(name));
  if (!entry) throw new Error(`workspace entry not found: ${name}`);
  return entry;
}

describe("Workspaces (Mastra-parity clone)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("lists_root_entries_with_dirs_first_and_file_sizes", async () => {
    renderWorkspaces();
    expect(await screen.findByText("Demo Workspace")).toBeTruthy();
    const entries = screen.getAllByTestId("workspace-file");
    // Raiz: data/, notes/ e README.md (filhos de pastas não aparecem na raiz).
    expect(entries.length).toBe(3);
    expect(entries[0]?.textContent).toContain("data");
    expect(entries[1]?.textContent).toContain("notes");
    expect(entries[2]?.textContent).toMatch(/README\.md.*B/);
  });

  it("folder_click_navigates_in_and_breadcrumb_root_returns", async () => {
    renderWorkspaces();
    await userEvent.click(await findEntry("data"));
    // Dentro de data/: só orders.csv.
    const inside = screen.getAllByTestId("workspace-file");
    expect(inside.length).toBe(1);
    expect(inside[0]?.textContent).toContain("orders.csv");
    // Voltar pela raiz do breadcrumb.
    await userEvent.click(screen.getByRole("button", { name: /go to workspace root/i }));
    expect(screen.getAllByTestId("workspace-file").length).toBe(3);
  });

  it("file_click_opens_viewer_with_content_and_close_hides_it", async () => {
    renderWorkspaces();
    await userEvent.click(await findEntry("README.md"));
    const viewer = await screen.findByTestId("workspace-file-viewer");
    expect(viewer.textContent).toContain("Demonstration workspace for TheoKit Studio");
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByTestId("workspace-file-viewer")).toBeNull();
  });

  it("create_folder_validates_blank_and_duplicate_then_creates", async () => {
    renderWorkspaces();
    await screen.findAllByTestId("workspace-file");
    await userEvent.click(screen.getByRole("button", { name: /new folder/i }));
    // Vazio → erro tipado visível, nada criado.
    await userEvent.click(screen.getByRole("button", { name: /create folder/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("must not be blank");
    // Duplicado ("data" já existe na raiz) → erro tipado.
    await userEvent.type(screen.getByRole("textbox", { name: /folder name/i }), "data");
    await userEvent.click(screen.getByRole("button", { name: /create folder/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("already exists");
    // Nome válido → pasta aparece na listagem (via refresh do datasource de sessão).
    await userEvent.clear(screen.getByRole("textbox", { name: /folder name/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /folder name/i }), "reports");
    await userEvent.click(screen.getByRole("button", { name: /create folder/i }));
    // findByText espera o refetch assíncrono trazer a pasta nova.
    expect(await screen.findByText("reports")).toBeTruthy();
    expect(metrics.snapshot().datasource_calls_total.createWorkspaceFolder).toBe(3);
  });

  it("refresh_button_refetches_from_the_datasource", async () => {
    renderWorkspaces();
    await screen.findAllByTestId("workspace-file");
    const before = metrics.snapshot().datasource_calls_total.listWorkspaces ?? 0;
    await userEvent.click(screen.getByRole("button", { name: /refresh files/i }));
    // Nova chamada real contada (wiring pillar c).
    await screen.findAllByTestId("workspace-file");
    expect(metrics.snapshot().datasource_calls_total.listWorkspaces).toBe(before + 1);
  });

  it("datasource_rejection_surfaces_as_visible_alert", async () => {
    const broken = {
      ...createFixtureDataSource({ scenario: "default" }),
      listWorkspaces: () => Promise.reject(new Error("workspace service down")),
    };
    render(
      <DataSourceProvider value={broken}>
        <WorkspacesPage />
      </DataSourceProvider>,
    );
    expect((await screen.findByRole("alert")).textContent).toContain("workspace service down");
  });

  it("folder_name_with_slash_is_rejected_at_the_boundary", async () => {
    renderWorkspaces();
    await screen.findAllByTestId("workspace-file");
    await userEvent.click(screen.getByRole("button", { name: /new folder/i }));
    await userEvent.type(screen.getByRole("textbox", { name: /folder name/i }), "a/b");
    await userEvent.click(screen.getByRole("button", { name: /create folder/i }));
    expect((await screen.findByRole("alert")).textContent).toContain("must not contain '/'");
  });

  it("empty_scenario_shows_honest_empty_state", async () => {
    renderWorkspaces("empty");
    expect(await screen.findByTestId("workspaces-empty")).toBeTruthy();
  });
});
