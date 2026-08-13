import { EmptyState } from "@usetheo/ui";
import type { RouteObject } from "react-router";
import { redirect } from "react-router";
import { AgentBuilderPage } from "../pages/builder";
import { RouteError } from "./route-error";

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="Studio serves the Agent Builder only."
      data-testid="not-found"
    />
  );
}

// A single surface: the Agent Builder, full screen. The root redirects to it and any other
// path lands on NotFound — there is no shell and no side navigation any more.
export function buildRoutes(opts: { live?: boolean } = {}): RouteObject[] {
  return [
    {
      path: "/",
      loader: () => redirect("/builder"),
      element: null,
      // The redirect resolves on the first tick; the fallback avoids the blank screen (and the
      // hydration warning for a missing HydrateFallback) while the loader runs.
      hydrateFallbackElement: <div aria-busy="true" />,
    },
    {
      path: "/builder",
      element: <AgentBuilderPage live={opts.live ?? false} />,
      errorElement: <RouteError />,
    },
    { path: "*", element: <NotFound /> },
  ];
}

export const routes: RouteObject[] = buildRoutes();
