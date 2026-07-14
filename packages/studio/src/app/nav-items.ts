// Fonte única do mapa rota → superfície → seção (D1 — padrão Mastra; DRY: sidebar,
// breadcrumb e rotas derivam daqui). Extraído de routes.tsx para quebrar o ciclo de
// import routes ↔ shell (F-arch-1 do review; REFACTOR previsto no T2.1 do plano).
import {
  Activity,
  BookOpenText,
  Brain,
  type LucideIcon,
  MessagesSquare,
  Waypoints,
} from "lucide-react";

export interface SurfaceMeta {
  path: string;
  label: string;
  section: "Playground" | "Observability" | "Data";
  icon: LucideIcon;
  description: string;
}

export function getSurface(path: string): SurfaceMeta {
  const s = SURFACES.find((x) => x.path === path);
  if (!s) {
    throw new Error(`Surface desconhecida: ${path}`);
  }
  return s;
}

export const SURFACES: readonly SurfaceMeta[] = Object.freeze([
  {
    path: "/playground",
    label: "Playground",
    section: "Playground",
    icon: MessagesSquare,
    description: "Chat with any registered agent and watch the typed event stream live.",
  },
  {
    path: "/events",
    label: "Events",
    section: "Observability",
    icon: Activity,
    description: "Raw timeline of the typed Run.stream() events from the last run.",
  },
  {
    path: "/traces",
    label: "Traces",
    section: "Observability",
    icon: Waypoints,
    description: "Durable traces via theo-lens — the embed lands in M2.",
  },
  {
    path: "/memory",
    label: "Memory",
    section: "Data",
    icon: Brain,
    description: "Scoped memories from theo-memory: what the agent remembers.",
  },
  {
    path: "/knowledge",
    label: "Knowledge",
    section: "Data",
    icon: BookOpenText,
    description: "Collections, documents and the theo-rag retrieval playground.",
  },
]);
