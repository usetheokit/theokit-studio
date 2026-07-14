import { render, screen } from "@testing-library/react";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { TracesPage } from "./index";

describe("Traces placeholder (T4.3)", () => {
  it("always_renders_offline_placeholder_with_lens_explanation", async () => {
    // Fixture default: lens SEMPRE offline no M5 (invariante 5 — trace UI é do theo-lens).
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <TracesPage />
      </DataSourceProvider>,
    );
    const lensCopy = (await screen.findAllByText(/theo-lens/))[0];
    expect(lensCopy).toBeTruthy();
    expect(screen.getByText(/theokit studio up/)).toBeTruthy();
    const traceTreeEl = screen.queryByTestId("trace-tree");
    expect(traceTreeEl).toBeNull();
  });
});
