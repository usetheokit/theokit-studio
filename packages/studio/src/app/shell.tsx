import { Sidebar } from "@usetheo/ui";
import { FlaskConical, Hexagon } from "lucide-react";
import { Outlet, useLocation, useMatches, useNavigate } from "react-router";
import { SURFACES } from "./nav-items";

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
    <nav aria-label="breadcrumb" className="flex items-center text-sm">
      <ol className="flex items-center gap-2">
        <li className="text-muted-foreground">Studio</li>
        {labels.map((label) => (
          <li key={label} aria-current="page" className="flex items-center gap-2">
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium text-foreground">{label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SurfacePlaceholder({ title }: { title: string }) {
  return (
    <section className="p-8">
      <h1 className="font-semibold text-xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">Superfície em construção nesta fase do M5.</p>
    </section>
  );
}

const SECTIONS = ["Playground", "Observability", "Data"] as const;

export function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div data-testid="studio-smoke" className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="w-60 shrink-0">
        <Sidebar.Header className="px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary-deep to-primary/60 shadow-[0_0_20px_-4px] shadow-primary/60">
              <Hexagon className="size-4 text-primary-foreground" aria-hidden />
            </div>
            <div className="leading-tight">
              <span className="sr-only">TheoKit Studio</span>
              <span
                aria-hidden
                className="block font-display font-semibold text-foreground text-sm tracking-tight"
              >
                TheoKit
              </span>
              <span
                aria-hidden
                className="block text-[11px] text-muted-foreground tracking-widest uppercase"
              >
                Studio
              </span>
            </div>
          </div>
        </Sidebar.Header>
        {SECTIONS.map((section) => (
          <Sidebar.Section key={section} title={section}>
            {SURFACES.filter((s) => s.section === section).map((s) => (
              <Sidebar.Item
                key={s.path}
                icon={s.icon}
                active={location.pathname.startsWith(s.path)}
                onClick={() => navigate(s.path)}
              >
                {s.label}
              </Sidebar.Item>
            ))}
          </Sidebar.Section>
        ))}
        <Sidebar.Footer className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-2">
            <FlaskConical className="size-3.5 text-amber-400" aria-hidden />
            <div className="leading-tight">
              <span className="block font-medium text-foreground text-xs">Fixtures mode</span>
              <span className="block text-[11px] text-muted-foreground">M5 · dados simulados</span>
            </div>
          </div>
        </Sidebar.Footer>
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-border/40 border-b bg-background/80 px-8 backdrop-blur">
          <Breadcrumb />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-muted-foreground text-xs">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
              dev server
            </span>
          </div>
        </div>
        <main className="relative flex-1 overflow-auto">
          {/* Atmosfera Violet Forge: glow radial sutil no topo do conteúdo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-80 [background:radial-gradient(600px_240px_at_65%_-40%,oklch(0.45_0.18_296/0.28),transparent_70%)]"
          />
          <div className="relative">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
