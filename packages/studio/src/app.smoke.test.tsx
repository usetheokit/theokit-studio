import { render, screen } from "@testing-library/react";
import { App } from "./app";

describe("App smoke (T0.1)", () => {
  it("renders_design_system_component_inside_provider", () => {
    render(<App />);
    const smokeElement = screen.getByTestId("studio-smoke");
    expect(smokeElement).toBeTruthy();
    expect(smokeElement.textContent).toContain("TheoKit Studio");
  });
});
