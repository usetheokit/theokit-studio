import { render, screen } from "@testing-library/react";
import { SettingsPage } from "./index";

describe("Settings (Mastra-parity clone)", () => {
  it("shows_theme_and_readonly_stack_connection", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Theme mode")).toBeTruthy();
    const rows = screen.getAllByTestId("settings-row");
    expect(rows.length).toBe(5);
    const memory = rows.find((r) => r.textContent?.includes("theo-memory"));
    expect(memory?.textContent).toContain("http://localhost:8080");
    // Read-only em fixtures mode: nenhum input editável nesta página.
    expect(screen.queryAllByRole("textbox").length).toBe(0);
  });
});
