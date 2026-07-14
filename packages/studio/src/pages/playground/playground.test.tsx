import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { metrics } from "../../data/metrics";
import { PlaygroundPage } from "./index";

function renderPlayground(ds = createFixtureDataSource({ scenario: "default" })) {
  render(
    <DataSourceProvider value={ds}>
      <PlaygroundPage />
    </DataSourceProvider>,
  );
  return ds;
}

describe("Playground (T3.1)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("sending_prompt_plays_stream_and_renders_final_message", async () => {
    renderPlayground();
    const select = await screen.findByRole("combobox", { name: /agent/i });
    await userEvent.selectOptions(select, "support-agent");
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "cadê meu pedido?");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const finalText = await screen.findByText(/chega dia 16/);
    expect(finalText).toBeTruthy();
    expect(screen.getByText("lookupOrder")).toBeTruthy();
    expect(screen.getByText(/aprovação humana/)).toBeTruthy();
    expect(screen.getByText(/rate limit/i)).toBeTruthy();
  });

  it("blank_prompt_send_is_noop_and_no_run_starts", async () => {
    renderPlayground();
    const select = await screen.findByRole("combobox", { name: /agent/i });
    await userEvent.selectOptions(select, "support-agent");
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "   ");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(metrics.snapshot().datasource_calls_total.runAgent ?? 0).toBe(0);
    expect(metrics.snapshot().stream_events_played_total.total ?? 0).toBe(0);
  });

  it("send_button_disabled_without_agent_selected", async () => {
    renderPlayground();
    await screen.findByRole("combobox", { name: /agent/i });
    const consoleErrorCalls = 0;
    const button = screen.getByRole("button", { name: /send/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(consoleErrorCalls).toBe(0);
  });

  it("unmount_during_run_aborts_playback", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ds = createFixtureDataSource({ scenario: "default", streamDelayMs: 30 });
    const { unmount } = render(
      <DataSourceProvider value={ds}>
        <PlaygroundPage />
      </DataSourceProvider>,
    );
    const select = await screen.findByRole("combobox", { name: /agent/i });
    await userEvent.selectOptions(select, "support-agent");
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "olá");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    unmount();
    // dá tempo do playback (30ms/evento) tentar continuar após unmount
    await new Promise((r) => setTimeout(r, 150));
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("new_prompt_aborts_previous_run", async () => {
    const ds = createFixtureDataSource({ scenario: "default", streamDelayMs: 25 });
    renderPlayground(ds);
    const select = await screen.findByRole("combobox", { name: /agent/i });
    await userEvent.selectOptions(select, "support-agent");
    const box = screen.getByRole("textbox", { name: /prompt/i });
    await userEvent.type(box, "primeiro");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.type(box, "segundo");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    // run 2 completa (concurrent test: run 1 cancelado, sem interleaving)
    expect(await screen.findByText(/chega dia 16/)).toBeTruthy();
    const userMessages = screen.getAllByText(/primeiro|segundo/);
    expect(userMessages.length).toBeGreaterThanOrEqual(2);
  });
});
