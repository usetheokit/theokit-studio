import { render, screen } from "@testing-library/react";
import { App } from "../../src/app";

// Seed do teste de integração (Fase Final expande: navegação nas 5 superfícies + prova de
// métricas não-zero, per plano § Final Phase).
describe("Studio integration", () => {
  it("mounts_the_full_app_shell", () => {
    render(<App />);
    expect(screen.getByTestId("studio-smoke")).toBeTruthy();
  });
});
