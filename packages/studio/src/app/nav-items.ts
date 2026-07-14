// Fonte única do mapa rota → superfície e do registry de menus (D1 — padrão Mastra
// para o conteúdo; padrão theo-cloud dashboard para a navegação drill-down).
// DRY: sidebar, breadcrumb, rotas e PageHeaders derivam daqui. Extraído de routes.tsx
// para quebrar o ciclo de import routes ↔ shell (F-arch-1 do review).
import {
  Activity,
  BarChart3,
  BookOpenText,
  Bot,
  Braces,
  Brain,
  ClipboardCheck,
  Cpu,
  Database,
  FlaskConical,
  FolderKanban,
  Gauge,
  LayoutGrid,
  type LucideIcon,
  ScrollText,
  Server,
  Settings,
  Telescope,
  Waypoints,
  Workflow,
  Wrench,
} from "lucide-react";

export interface SurfaceMeta {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** true = página real neste M5; false = placeholder honesto (surface planejada). */
  implemented: boolean;
}

export function getSurface(path: string): SurfaceMeta {
  const s = SURFACES.find((x) => x.path === path);
  if (!s) {
    throw new Error(`Unknown surface: ${path}`);
  }
  return s;
}

export const SURFACES: readonly SurfaceMeta[] = Object.freeze([
  {
    path: "/agents",
    label: "Agents",
    icon: Bot,
    description: "Chat with any registered agent and watch the typed event stream live.",
    implemented: true,
  },
  {
    path: "/workflows",
    label: "Workflows",
    icon: Workflow,
    description: "Inspect registered workflows and step through their runs.",
    implemented: false,
  },
  {
    path: "/processors",
    label: "Processors",
    icon: Cpu,
    description: "Input and output processors that shape every agent turn.",
    implemented: false,
  },
  {
    path: "/mcp-servers",
    label: "MCP Servers",
    icon: Server,
    description: "MCP servers exposed to your agents and the tools they provide.",
    implemented: false,
  },
  {
    path: "/tools",
    label: "Tools",
    icon: Wrench,
    description: "Registered tools with their schemas and a direct invocation playground.",
    implemented: false,
  },
  {
    path: "/workspaces",
    label: "Workspaces",
    icon: FolderKanban,
    description: "Workspaces group agents, tools and data per project.",
    implemented: false,
  },
  {
    path: "/request-context",
    label: "Request Context",
    icon: Braces,
    description: "Inspect the request context propagated through every run.",
    implemented: false,
  },
  {
    path: "/evaluation",
    label: "Overview",
    icon: LayoutGrid,
    description: "Evaluation at a glance: scorers, datasets and experiments.",
    implemented: false,
  },
  {
    path: "/evaluation/scorers",
    label: "Scorers",
    icon: Gauge,
    description: "Scorers grade agent outputs against your quality criteria.",
    implemented: false,
  },
  {
    path: "/evaluation/datasets",
    label: "Datasets",
    icon: Database,
    description: "Datasets of prompts and expected outputs used by experiments.",
    implemented: false,
  },
  {
    path: "/evaluation/experiments",
    label: "Experiments",
    icon: FlaskConical,
    description: "Experiments run scorers over datasets across agent versions.",
    implemented: false,
  },
  {
    path: "/observability/events",
    label: "Events",
    icon: Activity,
    description: "Raw timeline of the typed Run.stream() events from the last run.",
    implemented: true,
  },
  {
    path: "/observability/metrics",
    label: "Metrics",
    icon: BarChart3,
    description: "Runtime metrics from the dev loop: runs, tokens and latency.",
    implemented: false,
  },
  {
    path: "/observability/traces",
    label: "Traces",
    icon: Waypoints,
    description: "Durable traces via theo-lens — the embed lands in M2.",
    implemented: true,
  },
  {
    path: "/observability/logs",
    label: "Logs",
    icon: ScrollText,
    description: "Structured logs emitted by agents and services.",
    implemented: false,
  },
  {
    path: "/memory",
    label: "Memory",
    icon: Brain,
    description: "Scoped memories from theo-memory: what the agent remembers.",
    implemented: true,
  },
  {
    path: "/knowledge",
    label: "Knowledge",
    icon: BookOpenText,
    description: "Collections, documents and the theo-rag retrieval playground.",
    implemented: true,
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Studio preferences and dev-server configuration.",
    implemented: false,
  },
]);

// ---------------------------------------------------------------------------
// Menu registry — drill-down sidebar (padrão theo-cloud dashboard / Vercel).
// `main` é a raiz; submenus referenciam `parent` para o back button. A URL é a
// source of truth de qual menu está ativo (resolveActiveMenu) — browser
// back/forward também navega a sidebar corretamente.
// ---------------------------------------------------------------------------

export interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Clicar troca o painel da sidebar pelo submenu referenciado (a rota também navega). */
  drillsInto?: string;
}

export interface MenuGroup {
  /** Subtítulo uppercase opcional acima do grupo (padrão Vercel de clusters nomeados). */
  title?: string;
  items: MenuItem[];
}

export interface MenuDefinition {
  id: string;
  /** Título exibido no header com back button do submenu. */
  title: string;
  parent?: string;
  groups: MenuGroup[];
}

const item = (path: string): MenuItem => {
  const s = getSurface(path);
  return { label: s.label, path: s.path, icon: s.icon };
};

export const MENUS: Record<string, MenuDefinition> = {
  main: {
    id: "main",
    title: "TheoKit Studio",
    groups: [
      {
        items: [
          item("/agents"),
          item("/workflows"),
          item("/processors"),
          item("/mcp-servers"),
          item("/tools"),
          item("/workspaces"),
          item("/request-context"),
        ],
      },
      {
        items: [
          {
            label: "Evaluation",
            path: "/evaluation",
            icon: ClipboardCheck,
            drillsInto: "evaluation",
          },
          {
            label: "Observability",
            path: "/observability/events",
            icon: Telescope,
            drillsInto: "observability",
          },
        ],
      },
      {
        title: "Data",
        items: [item("/memory"), item("/knowledge")],
      },
      {
        items: [item("/settings")],
      },
    ],
  },
  evaluation: {
    id: "evaluation",
    title: "Evaluation",
    parent: "main",
    groups: [
      {
        items: [
          item("/evaluation"),
          item("/evaluation/scorers"),
          item("/evaluation/datasets"),
          item("/evaluation/experiments"),
        ],
      },
    ],
  },
  observability: {
    id: "observability",
    title: "Observability",
    parent: "main",
    groups: [
      {
        items: [
          item("/observability/events"),
          item("/observability/metrics"),
          item("/observability/traces"),
          item("/observability/logs"),
        ],
      },
    ],
  },
};

/** Accessor fail-fast — menu inexistente é bug de programação, não estado de UI. */
export function getMenu(id: string): MenuDefinition {
  const m = MENUS[id];
  if (!m) {
    throw new Error(`Unknown menu: ${id}`);
  }
  return m;
}

/** URL → menu ativo. A URL é a source of truth (sem stack manual de estado). */
export function resolveActiveMenu(pathname: string): string {
  if (pathname.startsWith("/evaluation")) {
    return "evaluation";
  }
  if (pathname.startsWith("/observability")) {
    return "observability";
  }
  return "main";
}
