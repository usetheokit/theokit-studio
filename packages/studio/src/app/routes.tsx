import { EmptyState } from "@usetheo/ui";
import type { RouteObject } from "react-router";
import { redirect } from "react-router";
import { TracesPage } from "../pages/traces";
import { RouteError } from "./route-error";
import { Shell, SurfacePlaceholder } from "./shell";

// Fonte única do mapa rota → superfície → seção (D1 — padrão Mastra; DRY: sidebar e
// breadcrumb derivam daqui).
export interface SurfaceMeta {
  path: string;
  label: string;
  section: "Playground" | "Observability" | "Data";
}

export const SURFACES: readonly SurfaceMeta[] = Object.freeze([
  { path: "/playground", label: "Playground", section: "Playground" },
  { path: "/events", label: "Events", section: "Observability" },
  { path: "/traces", label: "Traces", section: "Observability" },
  { path: "/memory", label: "Memory", section: "Data" },
  { path: "/knowledge", label: "Knowledge", section: "Data" },
]);

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="Essa rota não existe no Studio."
      data-testid="not-found"
    />
  );
}

// Páginas reais entram nas fases 3-4; os placeholders já renderizam o <h1> definitivo
// de cada superfície (SEPA: os testes de navegação sobrevivem à troca do miolo).
const placeholder = (label: string) => <SurfacePlaceholder title={label} />;

export function buildRoutes(extraChildren: RouteObject[] = []): RouteObject[] {
  return [
    {
      path: "/",
      element: <Shell />,
      hydrateFallbackElement: <SurfacePlaceholder title="Loading" />,
      children: [
        { index: true, loader: () => redirect("/playground"), element: null },
        ...SURFACES.map(
          (s): RouteObject => ({
            path: s.path.slice(1),
            element: s.path === "/traces" ? <TracesPage /> : placeholder(s.label),
            errorElement: <RouteError />,
            handle: { label: s.label, section: s.section },
          }),
        ),
        ...extraChildren.map((r) => ({ errorElement: <RouteError />, ...r })),
        { path: "*", element: <NotFound /> },
      ],
    },
  ];
}

export const routes: RouteObject[] = buildRoutes();
