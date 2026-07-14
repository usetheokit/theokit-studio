import { render, screen } from "@testing-library/react";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { McpServersPage } from "./index";

describe("MCP Servers (Mastra-parity clone)", () => {
  it("lists_servers_with_url_and_counts", async () => {
    render(
      <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
        <McpServersPage />
      </DataSourceProvider>,
    );
    const rows = await screen.findAllByTestId("mcp-server-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("Demo MCP Server");
    expect(rows[0]?.textContent).toContain("http://localhost:8787/mcp/demo-mcp-server/sse");
    expect(rows[0]?.textContent).toContain("5");
  });
});
