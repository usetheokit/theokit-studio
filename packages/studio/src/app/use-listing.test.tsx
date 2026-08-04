import { renderHook, waitFor } from "@testing-library/react";
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

describe("useListing", () => {
  // M7 T3.2: `reload` era devolvido e nenhum dos três call sites em builder/index.tsx o
  // desestruturava. Ele existia só para incrementar `version`, que existia só para ser
  // dependência do efeito, que existia só para justificar o `biome-ignore`. Os três caem juntos.
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

  // Fronteira de página: erro tipado vira estado visível, nunca unhandled rejection.
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
