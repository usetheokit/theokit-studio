import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { DatasetsPage, EvaluationOverviewPage, ExperimentsPage, ScorersPage } from "./index";

function renderWithProviders(element: React.ReactElement) {
  // Overview usa <Link> — precisa de um router mínimo.
  const router = createMemoryRouter([{ path: "/", element }]);
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
      <RouterProvider router={router} />
    </DataSourceProvider>,
  );
}

describe("Evaluation (Mastra-parity clone)", () => {
  it("overview_shows_counts_linking_to_the_three_surfaces", async () => {
    renderWithProviders(<EvaluationOverviewPage />);
    const cards = await screen.findAllByTestId("evaluation-card");
    expect(cards.length).toBe(3);
    const scorersCard = cards.find((c) => c.textContent?.includes("Scorers"));
    expect(scorersCard?.textContent).toContain("2");
    expect(scorersCard?.getAttribute("href")).toBe("/evaluation/scorers");
  });

  it("scorers_table_shows_source_badge_and_agents", async () => {
    renderWithProviders(<ScorersPage />);
    const rows = await screen.findAllByTestId("scorer-row");
    expect(rows.length).toBe(2);
    expect(rows[0]?.textContent).toContain("Relevancy Scorer");
    expect(rows[0]?.textContent).toContain("CODE");
  });

  it("datasets_table_shows_version_target_and_experiments_badge", async () => {
    renderWithProviders(<DatasetsPage />);
    const rows = await screen.findAllByTestId("dataset-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("support-questions");
    expect(rows[0]?.textContent).toContain("v1");
    expect(rows[0]?.textContent).toContain("2 (100%)");
  });

  it("experiments_table_shows_status_and_success_rate", async () => {
    renderWithProviders(<ExperimentsPage />);
    const rows = await screen.findAllByTestId("experiment-row");
    expect(rows.length).toBe(2);
    expect(rows[0]?.textContent).toContain("completed");
    expect(rows[0]?.textContent).toContain("5 (100%)");
  });
});
