import { Button, Select, Textarea } from "@usetheo/ui";
import { ArrowUp, Bot, Bug, FolderKanban, Pin, Plus, ShieldCheck, Wrench } from "lucide-react";
import { useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import type { BuilderSessionSummary } from "../../data/types";

const surface = getSurface("/builder");

// Intenções de construção (cards da home do builder). Clicar preenche o composer
// com um ponto de partida — comportamento local real; só a execução é gated.
const BUILD_INTENTS = [
  {
    id: "new-agent",
    label: "Create a new agent from scratch",
    starter: "Create a new agent that ",
    icon: Bot,
    tile: "bg-sky-500/15 text-sky-400",
  },
  {
    id: "add-tools",
    label: "Add tools to an existing agent",
    starter: "Add a tool to the Support Agent that ",
    icon: Wrench,
    tile: "bg-violet-500/15 text-violet-400",
  },
  {
    id: "tune-guardrails",
    label: "Tune instructions and guardrails",
    starter: "Tighten the guardrails so the agent never ",
    icon: ShieldCheck,
    tile: "bg-emerald-500/15 text-emerald-400",
  },
  {
    id: "diagnose-run",
    label: "Diagnose a failing run",
    starter: "Diagnose why the last run of ",
    icon: Bug,
    tile: "bg-amber-500/15 text-amber-400",
  },
] as const;

function SessionRow({ session }: { session: BuilderSessionSummary }) {
  return (
    <li
      data-testid="builder-session"
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40"
    >
      {session.pinned && <Pin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="min-w-0 flex-1 truncate text-foreground">{session.title}</span>
      <span className="shrink-0 text-muted-foreground text-xs">{session.lastActivity}</span>
    </li>
  );
}

// Home do Agent Builder: assistente de código especializado em construir agentes.
// Sessões à esquerda (fixtures), intenções + composer com barra de contexto no centro.
// Fixtures-only: o envio da sessão é fake door honesto até o registry real.
export function AgentBuilderPage() {
  const { items: sessions, loadError } = useListing((ds) => ds.listBuilderSessions());
  const { items: agents } = useListing((ds) => ds.listAgents());
  const [target, setTarget] = useState("new");
  const [prompt, setPrompt] = useState("");

  const pinned = sessions.filter((s) => s.pinned);
  const recent = sessions.filter((s) => !s.pinned);

  return (
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-auto border-border/40 border-r px-4 py-5 md:flex">
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="Builder sessions land with the real registry"
            className="w-full justify-start gap-1.5"
          >
            <Plus className="size-4" aria-hidden />
            New session
          </Button>
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Pinned
              </h2>
              <ul className="space-y-0.5">
                {pinned.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Recent sessions
            </h2>
            <ul className="space-y-0.5">
              {recent.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </ul>
          </section>
        </aside>
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto px-8 py-6">
          <div className="w-full max-w-2xl">
            <h2 className="text-center font-display font-semibold text-2xl text-foreground tracking-tight">
              What should we build?
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BUILD_INTENTS.map((intent) => {
                const Icon = intent.icon;
                return (
                  <button
                    key={intent.id}
                    type="button"
                    data-testid="builder-intent"
                    onClick={() => setPrompt(intent.starter)}
                    className="flex min-h-24 flex-col justify-between rounded-xl border border-border/40 bg-card/60 p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <span
                      className={`flex size-7 items-center justify-center rounded-lg ${intent.tile}`}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="mt-3 font-medium text-foreground text-xs leading-snug">
                      {intent.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6">
              {/* Barra de contexto (alvo da sessão) acoplada ao topo do composer */}
              <div className="mx-3 flex items-center justify-between gap-3 rounded-t-xl border border-border/40 border-b-0 bg-card/60 px-4 pt-1.5 pb-3 text-muted-foreground text-xs">
                <span className="flex items-center gap-2">
                  <Bot className="size-3.5" aria-hidden />
                  <Select value={target} onValueChange={setTarget}>
                    <Select.Trigger
                      aria-label="Target agent"
                      size="sm"
                      className="h-6 border-0 bg-transparent px-1 text-xs shadow-none"
                    >
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="new">New agent</Select.Item>
                      {agents.map((a) => (
                        <Select.Item key={a.id} value={a.id}>
                          {a.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </span>
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="size-3.5" aria-hidden />
                  Demo Workspace
                </span>
              </div>
              <div className="-mt-1.5 relative rounded-2xl border border-border/60 bg-card p-3 shadow-black/20 shadow-lg transition-colors focus-within:border-primary/50">
                <Textarea
                  aria-label="Build instructions"
                  className="min-h-[56px] w-full resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the agent to build…"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-muted-foreground text-xs">
                    claude-fable-5
                  </span>
                  <Button
                    size="sm"
                    disabled
                    aria-label="Start build session"
                    title="Builder sessions land with the real registry"
                    className="size-8 rounded-full p-0"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-center text-muted-foreground text-xs">
                Build sessions are disabled in fixtures mode — the assistant attaches when Studio
                connects to a real registry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
