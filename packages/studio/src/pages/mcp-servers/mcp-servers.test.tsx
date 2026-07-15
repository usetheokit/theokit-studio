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

  it("exposed_tool_click_opens_tool_detail_with_input_form_and_disabled_submit", async () => {
    renderMcpServers();
    await openDemoServer();
    const tools = await screen.findAllByTestId("mcp-exposed-tool");
    const refund = tools.find((t) => t.textContent?.includes("refundOrder"));
    if (!refund) throw new Error("exposed tool not found");
    await userEvent.click(refund);

    expect(await screen.findByTestId("mcp-tool-detail")).toBeTruthy();
    // Form derivado do input schema da fixture (2 campos do refundOrder).
    expect(screen.getByLabelText(/order id/i)).toBeTruthy();
    expect(screen.getByLabelText(/amount \(usd\)/i)).toBeTruthy();
    // Submit desabilitado em fixtures mode (honestidade — nada de invocação simulada).
    const submit = screen.getByRole("button", { name: /submit/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByText(/output/i)).toBeTruthy();
  });

  it("tool_detail_back_returns_to_server_detail", async () => {
    renderMcpServers();
    await openDemoServer();
    const tools = await screen.findAllByTestId("mcp-exposed-tool");
    await userEvent.click(tools[0] as HTMLElement);
    await screen.findByTestId("mcp-tool-detail");
    await userEvent.click(screen.getByRole("button", { name: "Demo MCP Server" }));
    // De volta ao detail do server: transportes visíveis de novo.
    expect((await screen.findAllByTestId("mcp-transport")).length).toBe(3);
  });

  it("back_button_returns_to_server_list", async () => {
    renderMcpServers();
    await openDemoServer();
    await userEvent.click(screen.getByRole("button", { name: /all mcp servers/i }));
    expect((await screen.findAllByTestId("mcp-server-row")).length).toBe(1);
  });

  it("copy_button_writes_endpoint_to_clipboard_and_confirms", async () => {
    // Review F-domtest-4: interação de copy nunca era exercitada.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderMcpServers();
    await openDemoServer();
    const copyButtons = screen.getAllByRole("button", { name: /^copy:/i });
    const first = copyButtons[0];
    if (!first) throw new Error("copy button not found");
    await userEvent.click(first);
    expect(writeText).toHaveBeenCalledWith("http://localhost:8787/mcp/demo-mcp-server/mcp");
  });

  it("copy_failure_shows_visible_feedback_not_silent_noop", async () => {
    // Review F-front-3: falha de clipboard vira feedback visível.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    renderMcpServers();
    await openDemoServer();
    const first = screen.getAllByRole("button", { name: /^copy:/i })[0];
    if (!first) throw new Error("copy button not found");
    await userEvent.click(first);
    expect(await screen.findByText(/copy failed/i)).toBeTruthy();
  });
});
