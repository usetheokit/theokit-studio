import { render, screen } from "@testing-library/react";
import { LogsPage } from "./index";

describe("Logs (honest empty state)", () => {
  it("declares_no_logs_in_fixtures_mode_without_simulating", () => {
    render(<LogsPage />);
    const empty = screen.getByTestId("logs-empty");
    expect(empty.textContent).toContain("No logs in fixtures mode");
    expect(empty.textContent).toContain("theokit dev");
    // Nenhuma linha de log fabricada.
    expect(screen.queryAllByTestId("log-row").length).toBe(0);
  });
});
