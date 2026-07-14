// Fonte única do mapa rota → superfície e do registry de menus (D1 — padrão Mastra
// para o conteúdo; padrão theo-cloud dashboard para a navegação drill-down).
// DRY: sidebar, breadcrumb, rotas e PageHeaders derivam daqui. Extraído de routes.tsx
// para quebrar o ciclo de import routes ↔ shell (F-arch-1 do review).
import {
  Activity,
  BarChart3,
  BookOpen,
  BookOpenText,
  Bot,
  Boxes,
  Braces,
  Brain,
  ClipboardCheck,
  Cpu,
  Database,
  FlaskConical,
  FolderKanban,
  Gauge,
  History,
  LayoutGrid,
  ListChecks,
  type LucideIcon,
  Plug,
  ScrollText,
  Search,
  Server,
  Settings,
  Share2,
  Telescope,
  Users,
  Waypoints,
  Webhook,
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
  // Memory — submenu espelhando o theo-cloud dashboard (menu `memory`).
  {
    path: "/memory",
    label: "Overview",
    icon: LayoutGrid,
    description: "Memory at a glance: scopes, entities and recent activity.",
    implemented: false,
  },
  {
    path: "/memory/memories",
    label: "Memories",
    icon: ListChecks,
    description: "Scoped memories from theo-memory: what the agent remembers.",
    implemented: true,
  },
  {
    path: "/memory/episodes",
    label: "Episodes",
    icon: History,
    description: "Bi-temporal event timeline over the subject's memories.",
    implemented: false,
  },
  {
    path: "/memory/playground",
    label: "Playground",
    icon: FlaskConical,
    description: "Live remember / recall / reflect surface against theo-memory.",
    implemented: false,
  },
  {
    path: "/memory/entities",
    label: "Entities",
    icon: Users,
    description: "Entities extracted from memories and their attributes.",
    implemented: false,
  },
  {
    path: "/memory/graph",
    label: "Graph",
    icon: Share2,
    description: "Entity relation graph view over the memory store.",
    implemented: false,
  },
  {
    path: "/memory/skills",
    label: "Skills",
    icon: Boxes,
    description: "Read-only skill library learned from memories.",
    implemented: false,
  },
  {
    path: "/memory/exports",
    label: "Exports",
    icon: BookOpen,
    description: "Export memory snapshots for backup or analysis.",
    implemented: false,
  },
  {
    path: "/memory/webhooks",
    label: "Webhooks",
    icon: Webhook,
    description: "Webhooks fired on memory writes and reflections.",
    implemented: false,
  },
  // Knowledge Base — submenu espelhando o theo-cloud dashboard (menu `rag`).
  {
    path: "/knowledge",
    label: "Overview",
    icon: LayoutGrid,
    description: "Knowledge base at a glance: collections, documents and retrieval.",
    implemented: false,
  },
  {
    path: "/knowledge/collections",
    label: "Collections",
    icon: Boxes,
    description: "Collections, documents and the theo-rag retrieval playground.",
    implemented: true,
  },
  {
    path: "/knowledge/connectors",
    label: "Connectors",
    icon: Plug,
    description: "Connectors that ingest external sources into collections.",
    implemented: false,
  },
  {
    path: "/knowledge/documents",
    label: "Documents",
    icon: ScrollText,
    description: "All documents across collections with chunking details.",
    implemented: false,
  },
  {
    path: "/knowledge/ask",
    label: "Ask",
    icon: Search,
    description: "Ask questions against the knowledge base and inspect answers.",
    implemented: false,
  },
  {
    path: "/knowledge/analytics",
    label: "Analytics",
    icon: Activity,
    description: "Retrieval quality and usage analytics for the knowledge base.",
    implemented: false,
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
        items: [
          {
            label: "Memory",
            path: "/memory/memories",
            icon: Brain,
            drillsInto: "memory",
          },
          {
            label: "Knowledge Base",
            path: "/knowledge/collections",
            icon: BookOpenText,
            drillsInto: "knowledge",
          },
        ],
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
  memory: {
    id: "memory",
    title: "Memory",
    parent: "main",
    groups: [
      {
        items: [
          item("/memory"),
          item("/memory/memories"),
          item("/memory/episodes"),
          item("/memory/playground"),
          item("/memory/entities"),
          item("/memory/graph"),
          item("/memory/skills"),
          item("/memory/exports"),
          item("/memory/webhooks"),
        ],
      },
    ],
  },
  knowledge: {
    id: "knowledge",
    title: "Knowledge Base",
    parent: "main",
    groups: [
      {
        items: [
          item("/knowledge"),
          item("/knowledge/collections"),
          item("/knowledge/connectors"),
          item("/knowledge/documents"),
          item("/knowledge/ask"),
          item("/knowledge/analytics"),
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
  if (pathname.startsWith("/memory")) {
    return "memory";
  }
  if (pathname.startsWith("/knowledge")) {
    return "knowledge";
  }
  return "main";
}
