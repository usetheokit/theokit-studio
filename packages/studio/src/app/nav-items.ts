// Fonte única do mapa rota → superfície → seção (D1 — padrão Mastra; DRY: sidebar,
// breadcrumb e rotas derivam daqui). Extraído de routes.tsx para quebrar o ciclo de
// import routes ↔ shell (F-arch-1 do review; REFACTOR previsto no T2.1 do plano).
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
