import { renderStartupError } from "./startup-error";

describe("startup error (T2.1)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"><span>app antiga</span></div>';
  });

  it("renders_alert_with_stack_in_dev_mode", () => {
    renderStartupError(new Error("boom"), { mode: "development" });
    const alertEl = document.querySelector('[role="alert"]');
    if (!alertEl) throw new Error("role=alert não renderizado");
    expect(alertEl.textContent).toContain("TheoKit Studio failed to start");
    expect(alertEl.textContent).toContain("boom");
  });

  it("hides_stack_in_production_mode", () => {
    renderStartupError(new Error("segredo interno"), { mode: "production" });
    const alertEl = document.querySelector('[role="alert"]');
    if (!alertEl) throw new Error("role=alert não renderizado");
    expect(alertEl.textContent).not.toContain("segredo interno");
    expect(alertEl.textContent).toContain("development mode");
  });
});
