import { EmptyState } from "@usetheo/ui";
import type { ReactElement } from "react";
import type { RouteObject } from "react-router";
import { redirect } from "react-router";
import {
  DatasetsPage,
  EvaluationOverviewPage,
  ExperimentsPage,
  ScorersPage,
} from "../pages/evaluation";
import { EventsPage } from "../pages/events";
import { KnowledgePage } from "../pages/knowledge";
import { LogsPage } from "../pages/logs";
import { McpServersPage } from "../pages/mcp-servers";
import { MemoryPage } from "../pages/memory";
import { MetricsPage } from "../pages/metrics";
import { PlannedSurfacePage } from "../pages/planned";
import { PlaygroundPage } from "../pages/playground";
import { ProcessorsPage } from "../pages/processors";
import { PromptsPage } from "../pages/prompts";
import { RequestContextPage } from "../pages/request-context";
import { SettingsPage } from "../pages/settings";
import { ToolsPage } from "../pages/tools";
import { TracesPage } from "../pages/traces";
import { WorkflowsPage } from "../pages/workflows";
import { WorkspacesPage } from "../pages/workspaces";
import { SURFACES } from "./nav-items";
import { RouteError } from "./route-error";
import { Shell, SurfacePlaceholder } from "./shell";

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="This route does not exist in Studio."
      data-testid="not-found"
    />
  );
}

// Páginas reais deste M5; toda surface fora deste mapa renderiza o placeholder
// honesto (PlannedSurfacePage) — IA Mastra-parity, dogfood 2026-07-14.
const IMPLEMENTED_PAGES: Record<string, ReactElement> = {
  "/agents": <PlaygroundPage />,
  "/prompts": <PromptsPage />,
  "/workflows": <WorkflowsPage />,
  "/processors": <ProcessorsPage />,
  "/mcp-servers": <McpServersPage />,
  "/tools": <ToolsPage />,
  "/workspaces": <WorkspacesPage />,
  "/request-context": <RequestContextPage />,
  "/evaluation": <EvaluationOverviewPage />,
  "/evaluation/scorers": <ScorersPage />,
  "/evaluation/datasets": <DatasetsPage />,
  "/evaluation/experiments": <ExperimentsPage />,
  "/observability/events": <EventsPage />,
  "/observability/metrics": <MetricsPage />,
  "/observability/traces": <TracesPage />,
  "/observability/logs": <LogsPage />,
  "/memory/memories": <MemoryPage />,
  "/knowledge/collections": <KnowledgePage />,
  "/settings": <SettingsPage />,
};

// Redirects de compat: paths pré-drill-down continuam funcionando (deep links).
const LEGACY_REDIRECTS: Record<string, string> = {
  playground: "/agents",
  events: "/observability/events",
  traces: "/observability/traces",
};

export function buildRoutes(extraChildren: RouteObject[] = []): RouteObject[] {
  return [
    {
      path: "/",
      element: <Shell />,
      hydrateFallbackElement: <SurfacePlaceholder title="Loading" />,
      children: [
        { index: true, loader: () => redirect("/agents"), element: null },
        ...Object.entries(LEGACY_REDIRECTS).map(
          ([from, to]): RouteObject => ({
            path: from,
            loader: () => redirect(to),
            element: null,
          }),
        ),
        ...SURFACES.map(
          (s): RouteObject => ({
            path: s.path.slice(1),
            element: IMPLEMENTED_PAGES[s.path] ?? <PlannedSurfacePage path={s.path} />,
            errorElement: <RouteError />,
            handle: { label: s.label },
          }),
        ),
        ...extraChildren.map((r) => ({ errorElement: <RouteError />, ...r })),
        { path: "*", element: <NotFound /> },
      ],
    },
  ];
}

export const routes: RouteObject[] = buildRoutes();
