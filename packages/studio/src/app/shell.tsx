import { Breadcrumb, Sidebar } from "@usetheo/ui";
import { ArrowLeft, ChevronRight, FlaskConical, Hexagon } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useMatches, useNavigate } from "react-router";
import { getMenu, MENUS, type MenuDefinition, resolveActiveMenu } from "./nav-items";

interface RouteHandle {
  label?: string;
}

function ShellBreadcrumb() {
  // Trilha via route handles sobre o primitive Breadcrumb do @usetheo/ui (adoção M0).
  const matches = useMatches();
  const labels = matches
    .map((m) => (m.handle as RouteHandle | undefined)?.label)
    .filter((l): l is string => Boolean(l));
  return (
    <Breadcrumb className="text-sm">
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <span className="text-muted-foreground">Studio</span>
        </Breadcrumb.Item>
        {labels.map((label, index) => (
          <Fragment key={label}>
            <Breadcrumb.Separator>
              <span className="text-muted-foreground/50">/</span>
            </Breadcrumb.Separator>
            <Breadcrumb.Item>
              {index === labels.length - 1 ? (
                <Breadcrumb.Page className="font-medium">{label}</Breadcrumb.Page>
              ) : (
                <span className="text-muted-foreground">{label}</span>
              )}
            </Breadcrumb.Item>
          </Fragment>
        ))}
      </Breadcrumb.List>
    </Breadcrumb>
  );
}

export function SurfacePlaceholder({ title }: { title: string }) {
  return (
    <section className="p-8">
      <h1 className="font-semibold text-xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">Surface under construction in this M5 phase.</p>
    </section>
  );
}

function LogoMark() {
  return (
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
  );
}

export function Shell({ live = false }: { live?: boolean } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Drill-down (padrão theo-cloud dashboard / Vercel): o menu ativo é derivado
  // da URL — browser back/forward também navega a sidebar corretamente.
  const activeMenuId = resolveActiveMenu(location.pathname);
  const activeMenu = getMenu(activeMenuId);

  // Direção do slide: push (entrar em submenu) desliza da direita; pop (voltar)
  // desliza da esquerda — mesma affordance do dashboard theo-cloud.
  const prevMenuIdRef = useRef(activeMenuId);
  const [slideDirection, setSlideDirection] = useState<"none" | "push" | "pop">("none");
  useEffect(() => {
    const prev = prevMenuIdRef.current;
    if (prev === activeMenuId) {
      return;
    }
    const prevDepth = MENUS[prev]?.parent ? 1 : 0;
    const currentDepth = activeMenu.parent ? 1 : 0;
    setSlideDirection(currentDepth > prevDepth ? "push" : "pop");
    prevMenuIdRef.current = activeMenuId;
    const t = setTimeout(() => setSlideDirection("none"), 200);
    return () => clearTimeout(t);
  }, [activeMenuId, activeMenu.parent]);

  const isActive = (path: string) => {
    // Submenu: match exato (senão "Overview" /evaluation acenderia em /evaluation/scorers).
    if (activeMenu.parent) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const renderPanel = (menu: MenuDefinition) => (
    <>
      {menu.parent ? (
        <Sidebar.Header className="px-3 py-3">
          <div className="flex w-full flex-col">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label={`Back to ${MENUS[menu.parent]?.title ?? "main menu"}`}
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              <span>Back</span>
            </button>
            <p className="truncate px-2 pt-2 text-[11px] text-muted-foreground uppercase tracking-widest">
              {menu.title}
            </p>
          </div>
        </Sidebar.Header>
      ) : (
        <Sidebar.Header className="px-4 py-4">
          <LogoMark />
        </Sidebar.Header>
      )}
      {menu.groups.map((group) => (
        // Key estável: título do grupo ou o path do primeiro item (únicos por menu).
        <Sidebar.Section key={group.title ?? group.items[0]?.path} title={group.title}>
          {group.items.map((navItem) => {
            const Icon = navItem.icon;
            return (
              <Sidebar.Item
                key={navItem.path}
                icon={Icon}
                active={isActive(navItem.path)}
                aria-current={isActive(navItem.path) ? "page" : undefined}
                onClick={() => navigate(navItem.path)}
                title={navItem.label}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate">{navItem.label}</span>
                  {navItem.drillsInto && (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </span>
              </Sidebar.Item>
            );
          })}
        </Sidebar.Section>
      ))}
    </>
  );

  const slideClass =
    slideDirection === "push"
      ? "animate-[slidein-right_180ms_ease-out]"
      : slideDirection === "pop"
        ? "animate-[slidein-left_180ms_ease-out]"
        : "";

  return (
    <div data-testid="studio-smoke" className="flex h-screen overflow-hidden bg-background">
      {/* Keyframes colocalizados (padrão theo-cloud) — sem poluir o index.css global. */}
      <style>{`
        @keyframes slidein-right {
          from { transform: translateX(12%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slidein-left {
          from { transform: translateX(-12%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <Sidebar className="w-60 shrink-0">
        <div key={activeMenuId} className={`flex h-full flex-col ${slideClass}`}>
          {renderPanel(activeMenu)}
          <Sidebar.Footer className="mt-auto px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-2">
              <FlaskConical
                className={`size-3.5 ${live ? "text-emerald-400" : "text-amber-400"}`}
                aria-hidden
              />
              <div className="leading-tight">
                <span className="block font-medium text-foreground text-xs">
                  {live ? "Live reflection" : "Fixtures mode"}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {live ? "dev server · fixtures where noted" : "M5 · simulated data"}
                </span>
              </div>
            </div>
          </Sidebar.Footer>
        </div>
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-border/40 border-b bg-background/80 px-8 backdrop-blur">
          <ShellBreadcrumb />
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
