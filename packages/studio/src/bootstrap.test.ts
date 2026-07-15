import { parseStudioConfig } from "./bootstrap";

describe("bootstrap config (T2.1 — EC-8, seam do M1)", () => {
  it("malformed_studio_config_falls_back_to_fixtures_with_warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = parseStudioConfig(42);
    expect(config).toEqual({ scenario: "default" });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("absent_config_uses_defaults_without_warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStudioConfig(undefined)).toEqual({ scenario: "default" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("valid_config_scenario_is_respected", () => {
    expect(parseStudioConfig({ scenario: "empty" })).toEqual({ scenario: "empty" });
  });

  it("invalid_scenario_value_falls_back_with_warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStudioConfig({ scenario: "hackz" })).toEqual({ scenario: "default" });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
