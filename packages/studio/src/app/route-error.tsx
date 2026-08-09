import { useRouteError } from "react-router";

// A per-route errorElement (D1): a page crash stays confined to the Outlet — the shell
// (sidebar/navigation) survives (EC-2).
export function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <section role="alert" className="p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 opacity-80">This page hit an error — every other surface keeps working.</p>
      <pre className="mt-4 overflow-auto rounded bg-black/30 p-3 text-sm">{message}</pre>
    </section>
  );
}
