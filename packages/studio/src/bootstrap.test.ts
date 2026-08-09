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

  // M7 T2.1: "offline" was accepted at the boundary and read by nobody — a silent failure
  // (rules/error-handling.md § 2). It is now treated like any other invalid value.
  it("scenario_offline_is_rejected_with_warning_naming_it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStudioConfig({ scenario: "offline" })).toEqual({ scenario: "default" });
    const message = warn.mock.calls[0]?.[0];
    expect(message).toContain('invalid scenario "offline"');
    warn.mockRestore();
  });

  // EC-5: the two surviving values must not become collateral damage of the narrowing.
  it.each(["default", "empty"])("scenario_%s_is_accepted_without_warning", (value) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStudioConfig({ scenario: value })).toEqual({ scenario: value });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  // Review F-tests-8: the type guard `typeof input.scenario === "string"` had no test —
  // removing it left the suite green because `Set.has(42)` is false too.
  it.each([
    42,
    null,
    ["empty"],
    { scenario: "empty" },
  ])("non_string_scenario_%s_falls_back_with_warning", (value) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStudioConfig({ scenario: value })).toEqual({ scenario: "default" });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  // F-arch-8: naming only the rejected value does not tell the operator what to migrate to.
  it("invalid_scenario_warning_names_the_accepted_set", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parseStudioConfig({ scenario: "offline" });
    expect(warn.mock.calls[0]?.[0]).toContain('(expected "default" | "empty")');
    warn.mockRestore();
  });

  // EC-6: an absent key is a VALID case, not an invalid one.
  it("config_without_scenario_key_uses_default_without_warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStudioConfig({})).toEqual({ scenario: "default" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("bootstrap config M1 (mode/basePath — T2.1)", () => {
  it("test_parse_accepts_live_mode_and_base_path", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // The M1-only shape (no scenario) is valid and raises NO warning — the host injects {mode, basePath}.
    const config = parseStudioConfig({ mode: "live", basePath: "/_studio" });
    expect(config.mode).toBe("live");
    expect(config.basePath).toBe("/_studio");
    expect(config.scenario).toBe("default");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("test_parse_defaults_mode_fixtures_for_m5_shape", () => {
    // The M5 {scenario} shape stays valid; an absent mode resolves to fixtures.
    const config = parseStudioConfig({ scenario: "empty" });
    expect(config.scenario).toBe("empty");
    // mode absent in the M5 shape — consumption resolves fixtures via `?? "fixtures"`.
    expect(config.mode).toBeUndefined();
    expect(parseStudioConfig({ mode: "live" }).mode).toBe("live");
  });

  it("test_parse_invalid_mode_falls_back_with_warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = parseStudioConfig({ mode: "prod" });
    expect(config.mode).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("test_parse_normalizes_malformed_base_path_with_warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Non-string → ignored with a warning (the same pattern as scenario).
    expect(parseStudioConfig({ mode: "live", basePath: 42 }).basePath).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    // Normalising the valid variants (no warning): leading slash added, trailing one removed.
    expect(parseStudioConfig({ basePath: "_studio" }).basePath).toBe("/_studio");
    expect(parseStudioConfig({ basePath: "/_studio/" }).basePath).toBe("/_studio");
  });
});
