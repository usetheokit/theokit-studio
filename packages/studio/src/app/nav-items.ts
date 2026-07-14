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
    description: "Converse com qualquer agente registrado e veja o stream tipado ao vivo.",
  },
  {
    path: "/events",
    label: "Events",
    section: "Observability",
    icon: Activity,
    description: "Timeline crua dos eventos tipados de Run.stream() do último run.",
  },
  {
    path: "/traces",
    label: "Traces",
    section: "Observability",
    icon: Waypoints,
    description: "Traces duráveis via theo-lens — o embed chega no M2.",
  },
  {
    path: "/memory",
    label: "Memory",
    section: "Data",
    icon: Brain,
    description: "Memórias com escopo do theo-memory: o que o agente lembra.",
  },
  {
    path: "/knowledge",
    label: "Knowledge",
    section: "Data",
    icon: BookOpenText,
    description: "Collections, documentos e retrieval playground do theo-rag.",
  },
]);
