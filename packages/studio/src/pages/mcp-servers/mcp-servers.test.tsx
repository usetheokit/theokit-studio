import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { McpServersPage } from "./index";

function renderMcpServers() {
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
      <McpServersPage />
    </DataSourceProvider>,
  );
}

async function openDemoServer() {
  const rows = await screen.findAllByTestId("mcp-server-row");
  const demo = rows.find((r) => r.textContent?.includes("Demo MCP Server"));
  if (!demo) throw new Error("mcp server row not found");
  await userEvent.click(demo);
}

describe("MCP Servers (Mastra-parity clone)", () => {
  it("lists_servers_with_url_and_counts", async () => {
    renderMcpServers();
    const rows = await screen.findAllByTestId("mcp-server-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("Demo MCP Server");
    expect(rows[0]?.textContent).toContain("http://localhost:8787/mcp/demo-mcp-server/sse");
    expect(rows[0]?.textContent).toContain("5");
  });

  it("row_click_opens_detail_with_three_transports_and_version", async () => {
    renderMcpServers();
    await openDemoServer();
    expect(await screen.findByText(/version 1\.0\.0/i)).toBeTruthy();
    const transports = screen.getAllByTestId("mcp-transport");
    expect(transports.length).toBe(3);
    const byTag = (tag: string) => transports.find((t) => t.textContent?.includes(tag));
    expect(byTag("HTTP")?.textContent).toContain("http://localhost:8787/mcp/demo-mcp-server/mcp");
    expect(byTag("SSE")?.textContent).toContain("http://localhost:8787/mcp/demo-mcp-server/sse");
    expect(byTag("CLI")?.textContent).toContain(
      "npx -y mcp-remote http://localhost:8787/mcp/demo-mcp-server/sse",
    );
  });

  it("detail_lists_available_tools_with_agent_and_workflow_wrappers", async () => {
    renderMcpServers();
    await openDemoServer();
    const tools = await screen.findAllByTestId("mcp-exposed-tool");
    expect(tools.length).toBe(5);
    const names = tools.map((t) => t.textContent ?? "");
    expect(names.some((n) => n.includes("lookupOrder"))).toBe(true);
    expect(names.some((n) => n.includes("ask_supportAgent"))).toBe(true);
    expect(names.some((n) => n.includes("run_customerOnboarding"))).toBe(true);
  });

  it("back_button_returns_to_server_list", async () => {
    renderMcpServers();
    await openDemoServer();
    await userEvent.click(screen.getByRole("button", { name: /all mcp servers/i }));
    expect((await screen.findAllByTestId("mcp-server-row")).length).toBe(1);
  });
});
