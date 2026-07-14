import { useRouteError } from "react-router";

// errorElement por rota (D1): crash de página fica confinado ao Outlet — o shell
// (sidebar/navegação) sobrevive (EC-2).
export function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <section role="alert" className="p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 opacity-80">
        Erro nesta página — as demais superfícies seguem funcionando.
      </p>
      <pre className="mt-4 overflow-auto rounded bg-black/30 p-3 text-sm">{message}</pre>
    </section>
  );
}
