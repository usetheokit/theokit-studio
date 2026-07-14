import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RunLogProvider } from "../../app/run-log";
import { DEFAULT_RUN, LONG_RUN } from "../../data/fixtures/run-script";
import { categorize } from "./categorize";
import { EventsPage } from "./index";

function renderEvents(initialEvents = DEFAULT_RUN.map((s) => s.event)) {
  // Router mínimo: a página usa <Link> (CTA para o playground).
  const router = createMemoryRouter([{ path: "/", element: <EventsPage /> }]);
  render(
    <RunLogProvider initialEvents={initialEvents}>
      <RouterProvider router={router} />
    </RunLogProvider>,
  );
}

describe("Event Inspector (T3.2)", () => {
  it("empty_state_with_playground_cta_when_no_run_yet", () => {
    renderEvents([]);
    expect(screen.getByText(/run an agent/i)).toBeTruthy();
  });

  it("renders_one_row_per_event_of_last_run", () => {
    renderEvents();
    const rows = screen.getAllByTestId("event-row");
    const eventCount = DEFAULT_RUN.length;
    const rowCount = rows.length;
    expect(rowCount).toBe(eventCount);
  });

  it("filter_by_category_shows_only_matching_events", async () => {
    renderEvents();
    await userEvent.click(screen.getByRole("combobox", { name: /category/i }));
    await userEvent.click(await screen.findByRole("option", { name: /^tool \(/ }));
    const rows = screen.getAllByTestId("event-row");
    const visibleCategories = rows.map((r) => within(r).getByTestId("event-category").textContent);
    const selecionadas = rows.map(() => "tool");
    expect(visibleCategories).toEqual(selecionadas);
    expect(rows.length).toBe(2); // tool-call-started + tool-call-completed no DEFAULT_RUN
  });

  it("filter_with_zero_matches_shows_no_match_message", async () => {
    // DEFAULT_RUN não tem eventos task_* → categoria task fica vazia (EC-7)
    renderEvents();
    await userEvent.click(screen.getByRole("combobox", { name: /category/i }));
    await userEvent.click(await screen.findByRole("option", { name: /^task \(/ }));
    expect(screen.getByText(/no events match/i)).toBeTruthy();
    expect(screen.queryByText(/run an agent/i)).toBeNull(); // no-match ≠ empty
  });

  it("long_script_renders_all_rows", () => {
    renderEvents(LONG_RUN.map((s) => s.event));
    expect(screen.getAllByTestId("event-row").length).toBe(LONG_RUN.length);
  });

  it("row_payload_is_expandable_json", () => {
    renderEvents();
    const first = screen.getAllByTestId("event-row")[0];
    if (!first) throw new Error("sem rows");
    const details = within(first).getByRole("group"); // <details>
    expect(details.querySelector("pre")?.textContent).toContain("step-started");
  });
});

describe("categorize (T3.2 — pura)", () => {
  it("maps_types_to_five_categories_plus_lifecycle", () => {
    expect(categorize("text-delta")).toBe("text");
    expect(categorize("tool-call-started")).toBe("tool");
    expect(categorize("tool_progress")).toBe("tool");
    expect(categorize("permission_denied")).toBe("permission");
    expect(categorize("rate_limit")).toBe("rate-limit");
    expect(categorize("task_started")).toBe("task");
    expect(categorize("turn-ended")).toBe("lifecycle");
    expect(categorize("qualquer-coisa")).toBe("lifecycle");
  });
});
