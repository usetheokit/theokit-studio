import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataSourceProvider } from "../../data/datasource";
import { createFixtureDataSource } from "../../data/fixture-datasource";
import { ProcessorsPage } from "./index";

function renderProcessors() {
  render(
    <DataSourceProvider value={createFixtureDataSource({ scenario: "default" })}>
      <ProcessorsPage />
    </DataSourceProvider>,
  );
}

async function openModeration() {
  const rows = await screen.findAllByTestId("processor-row");
  const moderation = rows.find((r) => r.textContent?.includes("Moderation"));
  if (!moderation) throw new Error("processor row not found");
  await userEvent.click(moderation);
}

describe("Processors (Mastra-parity clone)", () => {
  it("lists_processors_with_capability_matrix", async () => {
    renderProcessors();
    const rows = await screen.findAllByTestId("processor-row");
    expect(rows.length).toBe(2);
    const moderation = rows.find((r) => r.textContent?.includes("Moderation"));
    if (!moderation) throw new Error("processor row not found");
    // Moderation implementa input+stream+result → 3 marcas "yes".
    expect(moderation.querySelectorAll('[aria-label="yes"]').length).toBe(3);
    expect(moderation.querySelectorAll('[aria-label="no"]').length).toBe(1);
  });

  it("row_click_opens_detail_with_phases_and_disabled_run", async () => {
    renderProcessors();
    await openModeration();
    // Painel de identidade: fases implementadas como badges + attached count.
    expect(await screen.findByText(/attached to 1 agent/i)).toBeTruthy();
    expect(screen.getByTestId("processor-output")).toBeTruthy();
    // Run desabilitado em fixtures mode (honestidade — nada de run simulado).
    const runButton = screen.getByRole("button", { name: /run processor/i }) as HTMLButtonElement;
    expect(runButton.disabled).toBe(true);
    // Test message editável.
    expect(screen.getByRole("textbox", { name: /test message/i })).toBeTruthy();
  });

  it("phase_select_offers_only_implemented_hooks", async () => {
    renderProcessors();
    await openModeration();
    await userEvent.click(await screen.findByRole("combobox", { name: /phase/i }));
    const options = await screen.findAllByRole("option");
    const labels = options.map((o) => o.textContent);
    // Moderation NÃO implementa "step" — a opção não pode existir.
    expect(labels).toContain("input");
    expect(labels).toContain("stream");
    expect(labels).toContain("result");
    expect(labels).not.toContain("step");
    // Selecionar uma fase atualiza a descrição contextual.
    await userEvent.click(screen.getByRole("option", { name: "result" }));
    expect(screen.getByText(/final result before it returns/i)).toBeTruthy();
  });

  it("back_button_returns_to_processor_list", async () => {
    renderProcessors();
    await openModeration();
    await userEvent.click(screen.getByRole("button", { name: /all processors/i }));
    expect((await screen.findAllByTestId("processor-row")).length).toBe(2);
  });
});
