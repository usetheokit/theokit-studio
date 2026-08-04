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

// Sonda para os casos que precisam TROCAR o datasource entre renders (o `wrapper` do
// renderHook é fixo e não recebe `initialProps`).
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

  // Review F-tests-5: sem isto, o mutante `[ds]` -> `[]` sobrevive à suíte inteira — ou seja,
  // a lista de dependências que o M7 editou não estava travada por teste nenhum.
  // `renderHook` não repassa `initialProps` ao wrapper, então a troca de datasource é feita
  // por uma sonda de componente com `rerender`.
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

  // Review F-arch-9: um load que dá certo depois de um que falhou tem de limpar o alerta.
  // Inalcançável enquanto `ds` for estável, mas o CHANGELOG promete que um botão de refresh
  // "volta em poucas linhas" — e voltaria trazendo este bug junto.
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

  // Review F-tests-8: o branch `String(error)` para rejeição não-Error não tinha teste.
  it("surfaces_a_non_error_rejection_as_a_string", async () => {
    const failing: StudioDataSource = {
      ...fixtures(),
      listSkills: () => Promise.reject("boom"),
    };
    render(<Probe ds={failing} />);
    expect(await screen.findByText("error: boom")).toBeTruthy();
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
