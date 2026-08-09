import { render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DataSourceProvider, type StudioDataSource } from "../data/datasource";
import { createFixtureDataSource } from "../data/fixture-datasource";
import { useListing } from "./use-listing";

function wrapperFor(ds: StudioDataSource) {
  return ({ children }: { children: ReactNode }) => (
    <DataSourceProvider value={ds}>{children}</DataSourceProvider>
  );
}

const fixtures = () => createFixtureDataSource({ scenario: "default" });

// A probe for the cases that need to SWAP the datasource between renders (renderHook's
// `wrapper` is fixed and receives no `initialProps`).
function ListingProbe() {
  const { items, loadError } = useListing((d) => d.listSkills());
  return (
    <output>
      <span>items: {items.map((s) => s.name).join(",") || "none"}</span>
      <span>error: {loadError ?? "none"}</span>
    </output>
  );
}

function Probe({ ds }: { ds: StudioDataSource }) {
  return (
    <DataSourceProvider value={ds}>
      <ListingProbe />
    </DataSourceProvider>
  );
}

describe("useListing", () => {
  // M7 T3.2: `reload` was returned and none of the three call sites in builder/index.tsx
  // destructured it. It existed only to increment `version`, which existed only to be the
  // effect's dependency, which existed only to justify the `biome-ignore`. All three fall together.
  it("exposes_only_items_and_load_error", () => {
    const { result } = renderHook(() => useListing(async () => []), {
      wrapper: wrapperFor(fixtures()),
    });
    const keys = Object.keys(result.current).sort();
    expect(keys).toEqual(["items", "loadError"].sort());
  });

  it("loads_items_from_the_injected_datasource", async () => {
    const { result } = renderHook(() => useListing((d) => d.listAgents()), {
      wrapper: wrapperFor(fixtures()),
    });
    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(0);
    });
    expect(result.current.loadError).toBeNull();
  });

  // Review F-tests-5: without this, the mutant `[ds]` -> `[]` survives the whole suite — that
  // is, the dependency list M7 edited was pinned by no test at all.
  // `renderHook` does not forward `initialProps` to the wrapper, so the datasource swap is done
  // through a component probe with `rerender`.
  it("refetches_when_the_datasource_changes", async () => {
    const skillsFrom = (name: string): StudioDataSource => ({
      ...fixtures(),
      listSkills: () => Promise.resolve([{ id: name, name, description: "" }]),
    });
    const { rerender } = render(<Probe ds={skillsFrom("from-first")} />);
    expect(await screen.findByText("items: from-first")).toBeTruthy();

    rerender(<Probe ds={skillsFrom("from-second")} />);

    expect(await screen.findByText("items: from-second")).toBeTruthy();
  });

  // Review F-arch-9: a load that succeeds after one that failed has to clear the alert.
  // Unreachable while `ds` is stable, but the CHANGELOG promises a refresh button "comes back
  // in a few lines" — and it would come back bringing this bug with it.
  it("clears_a_previous_load_error_when_a_later_load_succeeds", async () => {
    const failing: StudioDataSource = {
      ...fixtures(),
      listSkills: () => Promise.reject(new Error("reflection offline")),
    };
    const healthy: StudioDataSource = {
      ...fixtures(),
      listSkills: () => Promise.resolve([{ id: "a", name: "back", description: "" }]),
    };
    const { rerender } = render(<Probe ds={failing} />);
    expect(await screen.findByText("error: reflection offline")).toBeTruthy();

    rerender(<Probe ds={healthy} />);

    expect(await screen.findByText("items: back")).toBeTruthy();
    expect(screen.getByText("error: none")).toBeTruthy();
  });

  // Review F-tests-8: the `String(error)` branch for a non-Error rejection had no test.
  it("surfaces_a_non_error_rejection_as_a_string", async () => {
    const failing: StudioDataSource = {
      ...fixtures(),
      listSkills: () => Promise.reject("boom"),
    };
    render(<Probe ds={failing} />);
    expect(await screen.findByText("error: boom")).toBeTruthy();
  });

  // Page boundary: a typed error becomes visible state, never an unhandled rejection.
  it("surfaces_a_rejection_as_load_error_instead_of_throwing", async () => {
    const failing: StudioDataSource = {
      ...fixtures(),
      listAgents: () => Promise.reject(new Error("reflection offline")),
    };
    const { result } = renderHook(() => useListing((d) => d.listAgents()), {
      wrapper: wrapperFor(failing),
    });
    await waitFor(() => {
      expect(result.current.loadError).toBe("reflection offline");
    });
    expect(result.current.items).toEqual([]);
  });
});
