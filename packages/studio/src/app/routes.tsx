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

// Superfície única: o Agent Builder em tela cheia. A raiz redireciona para ela e
// qualquer outro path cai no NotFound — não há mais shell nem navegação lateral.
export function buildRoutes(opts: { live?: boolean } = {}): RouteObject[] {
  return [
    {
      path: "/",
      loader: () => redirect("/builder"),
      element: null,
      // O redirect resolve no primeiro tick; o fallback evita a tela branca (e o warning
      // de hidratação sem HydrateFallback) enquanto o loader roda.
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
