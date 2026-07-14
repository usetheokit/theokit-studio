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

async function pickAgent(name = "Support Agent") {
  await userEvent.click(screen.getByRole("combobox", { name: /agent/i }));
  await userEvent.click(await screen.findByRole("option", { name }));
}

describe("Playground (T3.1)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("sending_prompt_plays_stream_and_renders_final_message", async () => {
    renderPlayground();
    await screen.findByRole("combobox", { name: /agent/i });
    await pickAgent();
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "where is my order?");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const finalText = await screen.findByText(/arrives on the 16th/);
    expect(finalText).toBeTruthy();
    expect(screen.getByText("lookupOrder")).toBeTruthy();
    expect(screen.getByText(/human approval/)).toBeTruthy();
    expect(screen.getByText(/rate limit/i)).toBeTruthy();
  });

  it("blank_prompt_send_is_noop_and_no_run_starts", async () => {
    renderPlayground();
    await screen.findByRole("combobox", { name: /agent/i });
    await pickAgent();
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "   ");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(metrics.snapshot().datasource_calls_total.runAgent ?? 0).toBe(0);
    expect(metrics.snapshot().stream_events_played_total.total ?? 0).toBe(0);
  });

  it("send_button_disabled_without_agent_selected", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPlayground();
    await screen.findByRole("combobox", { name: /agent/i });
    const button = screen.getByRole("button", { name: /send/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("unmount_during_run_aborts_playback", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ds = createFixtureDataSource({ scenario: "default", streamDelayMs: 30 });
    const { unmount } = render(
      <DataSourceProvider value={ds}>
        <PlaygroundPage />
      </DataSourceProvider>,
    );
    await screen.findByRole("combobox", { name: /agent/i });
    await pickAgent();
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    unmount();
    // dá tempo do playback (30ms/evento) tentar continuar após unmount
    await new Promise((r) => setTimeout(r, 150));
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("new_prompt_aborts_previous_run", async () => {
    // Determinístico (review F-dom-1): o send DURANTE run ativo deve ser possível pela UI
    // (contrato do plano: "novo send aborta o anterior e inicia novo").
    const ds = createFixtureDataSource({ scenario: "default", streamDelayMs: 25 });
    renderPlayground(ds);
    await screen.findByRole("combobox", { name: /agent/i });
    await pickAgent();
    const box = screen.getByRole("textbox", { name: /prompt/i });
    await userEvent.type(box, "primeiro");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    // run 1 ativo (delay 25ms/evento); botão DEVE aceitar novo send
    await userEvent.type(box, "segundo");
    const sendButton = screen.getByRole("button", { name: /send/i }) as HTMLButtonElement;
    expect(sendButton.disabled).toBe(false);
    await userEvent.click(sendButton);
    // run 2 assume: turno do usuário é "segundo" (thread resetada) e run 2 completa
    expect(await screen.findByText("segundo")).toBeTruthy();
    expect(screen.queryByText("primeiro")).toBeNull();
    expect(await screen.findByText(/arrives on the 16th/)).toBeTruthy();
    expect(metrics.snapshot().datasource_calls_total.runAgent).toBe(2);
  });

  it("stream_error_mid_run_surfaces_notice_and_reenables_send", async () => {
    // F-dom-3: stream rejeitando não pode deixar isRunning=true para sempre.
    const broken = {
      ...createFixtureDataSource({ scenario: "default" }),
      runAgent(): AsyncIterable<never> {
        return {
          [Symbol.asyncIterator]() {
            return {
              next: (): Promise<IteratorResult<never>> =>
                Promise.reject(new Error("adapter crashed mid-run")),
            };
          },
        };
      },
    };
    renderPlayground(broken as unknown as ReturnType<typeof createFixtureDataSource>);
    await screen.findByRole("combobox", { name: /agent/i });
    await pickAgent();
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/adapter crashed/)).toBeTruthy();
    const sendButton = screen.getByRole("button", { name: /send/i }) as HTMLButtonElement;
    expect(sendButton.disabled).toBe(false);
  });
});
