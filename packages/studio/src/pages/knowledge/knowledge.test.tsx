import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import {
  createFixtureDataSource,
  type FixtureDataSourceOptions,
} from "../../data/fixture-datasource";
import { metrics } from "../../data/metrics";
import { KnowledgePage } from "./index";

function renderKnowledge(options: FixtureDataSourceOptions = { scenario: "default" }) {
  render(
    <DataSourceProvider value={createFixtureDataSource(options)}>
      <KnowledgePage />
    </DataSourceProvider>,
  );
}

describe("Knowledge browser (T4.2)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("browses_collections_documents_chunks", async () => {
    renderKnowledge();
    await userEvent.click(await screen.findByRole("button", { name: /product docs/i }));
    await userEvent.click(await screen.findByRole("button", { name: /getting-started/i }));
    expect(await screen.findByText(/theokit dev/)).toBeTruthy();
    expect(screen.getAllByTestId("chunk-row").length).toBe(3);
  });

  it("retrieval_query_renders_scored_results_sorted_desc", async () => {
    renderKnowledge();
    await userEvent.click(await screen.findByRole("button", { name: /product docs/i }));
    await userEvent.type(screen.getByRole("searchbox", { name: /query/i }), "memoria do agente");
    await userEvent.click(screen.getByRole("button", { name: /retrieve/i }));
    const results = await screen.findAllByTestId("retrieval-result");
    const scores = results.map((r) => Number(within(r).getByTestId("score").textContent));
    const sortedDesc = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedDesc);
    expect(scores[0]).toBeLessThanOrEqual(1);
  });

  it("blank_query_shows_inline_validation_error_without_datasource_call", async () => {
    renderKnowledge();
    await userEvent.click(await screen.findByRole("button", { name: /product docs/i }));
    await userEvent.type(screen.getByRole("searchbox", { name: /query/i }), "   ");
    await userEvent.click(screen.getByRole("button", { name: /retrieve/i }));
    expect(await screen.findByText(/query.*vazia|informe um texto/i)).toBeTruthy();
    const queryCallsWithBlank = metrics.snapshot().datasource_calls_total.query ?? 0;
    expect(queryCallsWithBlank).toBe(0);
  });

  it("collection_without_documents_shows_local_empty_state", async () => {
    renderKnowledge();
    await userEvent.click(await screen.findByRole("button", { name: /release notes/i }));
    expect(await screen.findByText(/no documents/i)).toBeTruthy();
  });

  it("datasource_rejection_renders_visible_error_at_page_boundary", async () => {
    // F-dom-2: erro tipado da datasource não pode virar unhandled rejection silenciosa.
    const broken = {
      ...createFixtureDataSource({ scenario: "default" }),
      listDocuments: () => Promise.reject(new Error("rag indisponível")),
    };
    render(
      <DataSourceProvider value={broken}>
        <KnowledgePage />
      </DataSourceProvider>,
    );
    await userEvent.click(await screen.findByRole("button", { name: /product docs/i }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/rag indisponível/)).toBeTruthy();
  });

  it("offline_scenario_shows_service_offline_state", async () => {
    renderKnowledge({ scenario: "offline" });
    expect(await screen.findByText(/theokit studio up/)).toBeTruthy();
  });
});
