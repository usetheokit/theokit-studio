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

// Padrão agents-first (Mastra): a entrada é a lista de agentes; o chat abre no clique.
async function pickAgent(name = "Support Agent") {
  const rows = await screen.findAllByTestId("agent-row");
  const row = rows.find((r) => r.textContent?.includes(name));
  if (!row) throw new Error(`agent row not found: ${name}`);
  await userEvent.click(row);
}

describe("Playground (T3.1)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("sending_prompt_plays_stream_and_renders_final_message", async () => {
    renderPlayground();
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
    await pickAgent();
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "   ");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(metrics.snapshot().datasource_calls_total.runAgent ?? 0).toBe(0);
    expect(metrics.snapshot().stream_events_played_total.total ?? 0).toBe(0);
  });

  it("composer_not_rendered_until_agent_picked", async () => {
    renderPlayground();
    await screen.findAllByTestId("agent-row");
    expect(screen.queryByRole("textbox", { name: /prompt/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /send/i })).toBeNull();
  });

  it("filter_narrows_agents_list_and_no_match_shows_empty_row", async () => {
    renderPlayground();
    await screen.findAllByTestId("agent-row");
    const filter = screen.getByRole("searchbox", { name: /filter agents/i });
    await userEvent.type(filter, "support");
    const rows = screen.getAllByTestId("agent-row");
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("Support Agent");
    await userEvent.clear(filter);
    await userEvent.type(filter, "zzz-nonexistent");
    expect(screen.queryAllByTestId("agent-row").length).toBe(0);
    expect(screen.getByText(/no agents match/i)).toBeTruthy();
  });

  it("chat_shows_agent_tabs_with_only_chat_enabled", async () => {
    renderPlayground();
    await pickAgent();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Chat",
      "Editor",
      "Evaluate",
      "Review",
      "Traces",
    ]);
    const chat = tabs[0] as HTMLButtonElement;
    expect(chat.getAttribute("aria-selected")).toBe("true");
    expect(chat.disabled).toBe(false);
    // Fake doors honestos: as demais abas chegam em milestones futuros.
    for (const tab of tabs.slice(1)) {
      expect((tab as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("chat_empty_state_greets_and_memory_notice_is_honest", async () => {
    renderPlayground();
    await pickAgent();
    expect(screen.getByText("How can I help you today?")).toBeTruthy();
    const notice = screen.getByTestId("chat-memory-notice");
    expect(notice.textContent).toContain("Memory not enabled");
    expect(notice.textContent).toContain("theo-memory");
  });

  it("back_button_returns_to_agents_list", async () => {
    renderPlayground();
    await pickAgent();
    expect(screen.getByRole("textbox", { name: /prompt/i })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /all agents/i }));
    expect((await screen.findAllByTestId("agent-row")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("textbox", { name: /prompt/i })).toBeNull();
  });

  it("unmount_during_run_aborts_playback", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ds = createFixtureDataSource({ scenario: "default", streamDelayMs: 30 });
    const { unmount } = render(
      <DataSourceProvider value={ds}>
        <PlaygroundPage />
      </DataSourceProvider>,
    );
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
    await pickAgent();
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/adapter crashed/)).toBeTruthy();
    const sendButton = screen.getByRole("button", { name: /send/i }) as HTMLButtonElement;
    expect(sendButton.disabled).toBe(false);
  });
});

describe("Playground — painel de params (M7 T3.2)", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("test_params_panel_renders_sliders_and_model_combobox", async () => {
    renderPlayground();
    await pickAgent();
    expect(document.body.querySelectorAll('[data-slot="slider"]').length).toBe(2);
    expect(screen.getByRole("combobox", { name: /model/i })).toBeTruthy();
    expect(screen.getByText(/temperature/i)).toBeTruthy();
    expect(screen.getByText(/top.p/i)).toBeTruthy();
  });

  it("test_params_flow_into_run_request", async () => {
    const ds = renderPlayground();
    const spy = vi.spyOn(ds, "runAgent");
    await pickAgent();
    await userEvent.type(screen.getByRole("textbox", { name: /prompt/i }), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      "hi",
      expect.anything(),
      expect.objectContaining({ temperature: expect.any(Number), topP: expect.any(Number) }),
    );
  });
});
