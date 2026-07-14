import { render, screen } from "@testing-library/react";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { ProcessorsPage } from "./index";

describe("Processors (Mastra-parity clone)", () => {
  it("lists_processors_with_capability_matrix", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <ProcessorsPage />
      </DataSourceProvider>,
    );
    const rows = await screen.findAllByTestId("processor-row");
    expect(rows.length).toBe(2);
    const moderation = rows.find((r) => r.textContent?.includes("Moderation"));
    if (!moderation) throw new Error("processor row not found");
    // Moderation implementa input+stream+result → 3 marcas "yes".
    expect(moderation.querySelectorAll('[aria-label="yes"]').length).toBe(3);
    expect(moderation.querySelectorAll('[aria-label="no"]').length).toBe(1);
  });
});
