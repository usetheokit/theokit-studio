import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestContextPage } from "./index";

describe("Request Context (Mastra-parity clone)", () => {
  it("invalid_json_shows_typed_error_and_does_not_save", async () => {
    render(<RequestContextPage />);
    const editor = screen.getByRole("textbox", { name: /request context json/i });
    await userEvent.clear(editor);
    await userEvent.type(editor, "not json");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("must be valid JSON");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("valid_json_saves_with_confirmation", async () => {
    render(<RequestContextPage />);
    const editor = screen.getByRole("textbox", { name: /request context json/i });
    await userEvent.clear(editor);
    // userEvent.type trata { como início de tecla especial — duplicar escapa o literal.
    await userEvent.type(editor, '{{"tenant": "acme"}');
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Saved at");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
