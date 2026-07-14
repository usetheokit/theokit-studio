import { Sidebar } from "@usetheo/ui";
import { Outlet, useLocation, useMatches, useNavigate } from "react-router";
import { SURFACES } from "./routes";

interface RouteHandle {
  label?: string;
  section?: string;
}

function Breadcrumb() {
  // @usetheo/ui não tem Breadcrumb (inventário SEPA) — nav mínimo lendo route handles.
  const matches = useMatches();
  const labels = matches
    .map((m) => (m.handle as RouteHandle | undefined)?.label)
    .filter((l): l is string => Boolean(l));
  return (
    <nav aria-label="breadcrumb" className="text-ui-sm border-b border-white/10 px-6 py-3">
      <ol className="flex gap-2 opacity-80">
        <li>Studio</li>
        {labels.map((label) => (
          <li key={label} aria-current="page">
            / {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SurfacePlaceholder({ title }: { title: string }) {
  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 opacity-70">Superfície em construção nesta fase do M5.</p>
    </section>
  );
}

const SECTIONS = ["Playground", "Observability", "Data"] as const;

export function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div data-testid="studio-smoke" className="flex min-h-screen">
      <Sidebar>
        <Sidebar.Header>TheoKit Studio</Sidebar.Header>
        {SECTIONS.map((section) => (
          <Sidebar.Section key={section} title={section}>
            {SURFACES.filter((s) => s.section === section).map((s) => (
              <Sidebar.Item
                key={s.path}
                active={location.pathname.startsWith(s.path)}
                onClick={() => navigate(s.path)}
              >
                {s.label}
              </Sidebar.Item>
            ))}
          </Sidebar.Section>
        ))}
        <Sidebar.Footer>M5 · fixtures</Sidebar.Footer>
      </Sidebar>
      <div className="flex min-h-screen flex-1 flex-col">
        <Breadcrumb />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
