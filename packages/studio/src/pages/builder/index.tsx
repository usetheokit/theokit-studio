import {
  type ApprovalMode,
  ApprovalModeSelector,
  IntentSelector,
  ModelEffortPicker,
  SessionListItem,
} from "@theokit/ui";
import { Button, EmptyState, Select, Textarea } from "@usetheo/ui";
import {
  ArrowUp,
  Bot,
  Boxes,
  Bug,
  ChevronDown,
  Clock,
  FlaskConical,
  FolderKanban,
  LayoutTemplate,
  Mic,
  Plus,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useListing } from "../../app/use-listing";
import { useDataSource } from "../../data/datasource";
import type { BuilderMessage, BuilderSessionDetail } from "../../data/types";
import { SessionView } from "./session-view";

// Model options for the composer's <ModelEffortPicker> (from @theokit/ui).
const MODELS = [
  { id: "claude-fable-5", name: "Fable 5", blurb: "Deepest reasoning for complex builds" },
  { id: "claude-opus-4-8", name: "Opus 4.8", blurb: "Strong all-round builder" },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6", blurb: "Fast and balanced" },
  { id: "claude-haiku-4-5", name: "Haiku 4.5", blurb: "Snappy for quick edits" },
];

// The builder sidebar's navigable inner views (code-assistant app structure): home (new
// session), an open session, and the navigation entries.
type BuilderView =
  | { kind: "home" }
  | { kind: "session"; session: BuilderSessionDetail }
  | { kind: "skills" }
  | { kind: "scheduled" }
  | { kind: "templates" };

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

const FOLLOW_UP_REPLY: BuilderMessage = {
  role: "assistant",
  text: "Applied — the review panel on the right reflects the change. Anything else to adjust?",
};

// ---------------------------------------------------------------------------
// Views for the sidebar's navigation entries (Skills / Scheduled / Templates).
// ---------------------------------------------------------------------------

function SkillsView() {
  const { items: skills, loadError } = useListing((d) => d.listSkills());
  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-6" data-testid="builder-skills-view">
      <h2 className="font-display font-semibold text-foreground text-lg">Skills</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        Registered skills the assistant can reference in build sessions with @.
      </p>
      {loadError && (
        <p role="alert" className="mt-3 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <ul className="mt-4 space-y-2">
        {skills.map((skill) => (
          <li
            key={skill.id}
            data-testid="builder-skill"
            className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/60 px-4 py-3"
          >
            <Boxes className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium font-mono text-foreground text-sm">{skill.name}</p>
              <p className="mt-0.5 text-muted-foreground text-xs">{skill.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScheduledView() {
  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-16" data-testid="builder-scheduled-view">
      <EmptyState
        title="No scheduled sessions"
        description="Recurring build sessions land when Studio attaches to a real registry."
      />
    </div>
  );
}

function TemplatesView() {
  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-16" data-testid="builder-templates-view">
      <EmptyState
        title="No templates yet"
        description="Agent templates land when Studio attaches to a real registry."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page: app sidebar (new session → search → navigation → pinned/projects/tasks) + the active
// view. Sessions are scripted from fixtures, clearly labelled.
// ---------------------------------------------------------------------------

export function AgentBuilderPage({ live = false }: { live?: boolean } = {}) {
  const ds = useDataSource();
  const { items: sessions, loadError } = useListing((d) => d.listBuilderSessions());
  const { items: agents } = useListing((d) => d.listAgents());
  const [target, setTarget] = useState("new");
  const [prompt, setPrompt] = useState("");
  // The session's local config (real — nothing executes on fixtures, but the choice is the user's).
  const [approval, setApproval] = useState<ApprovalMode>("ask");
  const [model, setModel] = useState("claude-fable-5");
  const [effort, setEffort] = useState("Medium");
  const [project, setProject] = useState("demo-workspace");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<BuilderView>({ kind: "home" });
  const [openError, setOpenError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setView({ kind: "home" });
        setPrompt("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const term = query.trim().toLowerCase();
  const visible = sessions.filter((s) => term === "" || s.title.toLowerCase().includes(term));
  const pinned = visible.filter((s) => s.pinned);
  const recent = visible.filter((s) => !s.pinned);

  const openById = (sessionId: string) => {
    setOpenError(null);
    ds.getBuilderSession(sessionId)
      .then((session) => setView({ kind: "session", session }))
      .catch((error: unknown) =>
        setOpenError(error instanceof Error ? error.message : String(error)),
      );
  };

  const startSession = (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length === 0) {
      return;
    }
    // Review F-arch-1/F-wire-1: synthesising the scripted session lives in the datasource
    // (DIP + a counted metric), not in the page.
    setOpenError(null);
    ds.startBuilderSession(prompt, target === "new" ? undefined : target)
      .then((session) => {
        setView({ kind: "session", session });
        setPrompt("");
      })
      .catch((error: unknown) =>
        setOpenError(error instanceof Error ? error.message : String(error)),
      );
  };

  const sendFollowUp = (text: string) => {
    setView((current) =>
      current.kind === "session"
        ? {
            kind: "session",
            session: {
              ...current.session,
              messages: [
                ...current.session.messages,
                { role: "user", text },
                { ...FOLLOW_UP_REPLY },
              ],
            },
          }
        : current,
    );
  };

  const navEntry = (
    label: string,
    icon: React.ElementType,
    kind: Extract<BuilderView, { kind: "skills" | "scheduled" | "templates" }>["kind"],
  ) => {
    const Icon = icon;
    const active = view.kind === kind;
    return (
      <button
        type="button"
        onClick={() => setView({ kind })}
        aria-current={active ? "page" : undefined}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/40 ${
          active ? "bg-muted/50 text-foreground" : "text-foreground"
        }`}
      >
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-left">{label}</span>
      </button>
    );
  };

  return (
    // The Studio's single surface: it fills the whole viewport (there is no shell around it).
    <section data-testid="builder-surface" className="flex h-screen flex-col bg-background">
      {(loadError || openError) && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError ?? openError}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-auto border-border/40 border-r px-4 py-5 md:flex">
          {/* Title with switcher (app structure) */}
          <button
            type="button"
            className="flex items-center gap-1 px-1 font-semibold text-foreground text-sm tracking-tight"
            title="Assistant switcher lands with the real registry"
            disabled
          >
            Agent Builder
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
          {/* The reference's order: new session → search → navigation */}
          <button
            type="button"
            onClick={() => {
              setView({ kind: "home" });
              setPrompt("");
            }}
            className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-foreground text-sm transition-colors hover:bg-muted/60"
          >
            <Plus className="size-4" aria-hidden />
            <span className="flex-1 text-left">New session</span>
            <kbd className="font-mono text-[10px] text-muted-foreground">⌘N</kbd>
          </button>
          <div className="relative">
            <Search
              className="-translate-y-1/2 absolute top-1/2 left-2.5 size-3.5 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              aria-label="Search sessions"
              className="h-8 w-full rounded-lg border border-border/60 bg-card pr-10 pl-8 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="-translate-y-1/2 absolute top-1/2 right-2.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </div>
          <nav aria-label="Builder views" className="space-y-0.5">
            {navEntry("Skills", Boxes, "skills")}
            {navEntry("Scheduled", Clock, "scheduled")}
            {navEntry("Templates", LayoutTemplate, "templates")}
          </nav>
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Pinned
              </h2>
              <ul className="space-y-0.5">
                {pinned.map((s) => (
                  <li key={s.id}>
                    <SessionListItem
                      data-testid="builder-session"
                      title={s.title}
                      pinned
                      timestamp={s.lastActivity}
                      onClick={() => openById(s.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Projects
            </h2>
            <ul className="space-y-0.5">
              <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                <FolderKanban className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-foreground">Demo Workspace</span>
              </li>
            </ul>
          </section>
          <section>
            <h2 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Tasks
            </h2>
            <ul className="space-y-0.5">
              {recent.map((s) => (
                <li key={s.id}>
                  <SessionListItem
                    data-testid="builder-session"
                    title={s.title}
                    timestamp={s.lastActivity}
                    onClick={() => openById(s.id)}
                  />
                </li>
              ))}
              {recent.length === 0 && (
                <li className="px-2 py-1.5 text-muted-foreground text-xs">No matching sessions.</li>
              )}
            </ul>
          </section>
          {/* Honest label for the data's origin — inherited from the removed shell's footer. */}
          <div className="mt-auto flex items-center gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-2">
            <FlaskConical
              className={`size-3.5 shrink-0 ${live ? "text-emerald-400" : "text-amber-400"}`}
              aria-hidden
            />
            <div className="leading-tight">
              <span className="block font-medium text-foreground text-xs">
                {live ? "Live reflection" : "Fixtures mode"}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {live ? "dev server · fixtures where noted" : "simulated data"}
              </span>
            </div>
          </div>
        </aside>
        {view.kind === "session" ? (
          // key: inner state (rightPane/draft/splitter) resets when the session changes (F-dom-1)
          <SessionView key={view.session.id} session={view.session} onSend={sendFollowUp} />
        ) : view.kind === "skills" ? (
          <SkillsView />
        ) : view.kind === "scheduled" ? (
          <ScheduledView />
        ) : view.kind === "templates" ? (
          <TemplatesView />
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto px-8 py-6">
            <div className="w-full max-w-2xl">
              <h2 className="text-center font-display font-semibold text-2xl text-foreground tracking-tight">
                What should we build?
              </h2>
              <IntentSelector
                layout="tiles"
                value=""
                className="mt-6"
                options={BUILD_INTENTS.map((intent) => ({
                  id: intent.id,
                  label: intent.label,
                  icon: intent.icon,
                  tileClassName: intent.tile,
                }))}
                onChange={(id) => {
                  const intent = BUILD_INTENTS.find((i) => i.id === id);
                  if (intent) {
                    setPrompt(intent.starter);
                  }
                }}
              />
              <form onSubmit={startSession} className="mt-6">
                {/* Composer anatomy (reference): text → action row → project row */}
                <div className="relative rounded-2xl border border-border/60 bg-card p-3 shadow-black/20 shadow-lg transition-colors focus-within:border-primary/50">
                  <Textarea
                    aria-label="Build instructions"
                    className="min-h-[56px] w-full resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Do anything — @ to reference skills"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Add attachment"
                      disabled
                      title="Attachments land with the real registry"
                      className="flex size-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                    <ApprovalModeSelector value={approval} onChange={setApproval} />
                    <span className="ml-auto flex items-center gap-1.5">
                      <ModelEffortPicker
                        models={MODELS}
                        model={model}
                        onModelChange={setModel}
                        effort={effort}
                        onEffortChange={setEffort}
                      />
                      <button
                        type="button"
                        aria-label="Voice input"
                        disabled
                        title="Voice input lands with the real registry"
                        className="flex size-7 items-center justify-center rounded-full text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Mic className="size-4" aria-hidden />
                      </button>
                      <Button
                        type="submit"
                        size="sm"
                        aria-label="Start build session"
                        className="size-8 rounded-full p-0"
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </Button>
                    </span>
                  </div>
                </div>
                {/* Project/target row below the composer (reference) */}
                <div className="mt-2 flex items-center gap-4 px-3 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="size-3.5" aria-hidden />
                    <Select value={project} onValueChange={setProject}>
                      <Select.Trigger
                        aria-label="Project"
                        size="sm"
                        className="h-6 border-0 bg-transparent px-1 text-xs shadow-none"
                      >
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="demo-workspace">Demo Workspace</Select.Item>
                        <Select.Item value="new-project">New project</Select.Item>
                      </Select.Content>
                    </Select>
                  </span>
                  <span className="flex items-center gap-1.5">
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
                </div>
                <p className="mt-3 text-center text-muted-foreground text-xs">
                  Build sessions are scripted fixtures in this milestone — the live assistant
                  attaches when Studio connects to a real registry.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
