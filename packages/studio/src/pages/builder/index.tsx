import { Badge, Button, Select, Textarea } from "@usetheo/ui";
import {
  ArrowUp,
  Bot,
  Bug,
  FolderKanban,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import { useDataSource } from "../../data/datasource";
import { BUILDER_SCRIPTED_ARTIFACT, BUILDER_SCRIPTED_REPLY } from "../../data/fixtures/registry";
import type { BuilderMessage, BuilderSessionDetail } from "../../data/types";

const surface = getSurface("/builder");

// Intenções de construção (cards da home). Clicar preenche o composer com um ponto
// de partida — comportamento local real; a sessão roteirizada abre no envio.
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

// Resposta roteirizada para follow-ups dentro da sessão (fixtures).
const FOLLOW_UP_REPLY: BuilderMessage = {
  role: "assistant",
  text: "Applied — the artifact on the right reflects the change. Anything else to adjust?",
};

function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return "text-muted-foreground";
  }
  if (line.startsWith("+")) {
    return "bg-emerald-500/10 text-emerald-300";
  }
  if (line.startsWith("-")) {
    return "bg-red-500/10 text-red-300";
  }
  return "text-foreground";
}

function ArtifactViewer({ artifact }: { artifact: NonNullable<BuilderSessionDetail["artifact"]> }) {
  return (
    <div
      className="flex min-h-0 w-[42%] shrink-0 flex-col overflow-hidden rounded-xl border border-border/40"
      data-testid="builder-artifact"
    >
      <div className="flex items-center gap-2 border-border/40 border-b bg-card/80 px-4 py-2">
        <span className="truncate font-medium font-mono text-foreground text-sm">
          {artifact.name}
        </span>
        <Badge variant="outline" className="ml-auto shrink-0">
          Diff
        </Badge>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {artifact.diff.split("\n").map((line, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: linhas de diff são posicionais
            key={i}
            data-testid={
              line.startsWith("+++") || line.startsWith("---")
                ? "diff-line-meta"
                : line.startsWith("+")
                  ? "diff-line-add"
                  : line.startsWith("-")
                    ? "diff-line-del"
                    : "diff-line-ctx"
            }
            className={`block px-2 ${diffLineClass(line)}`}
          >
            {line || " "}
          </span>
        ))}
      </pre>
    </div>
  );
}

function MessageBubble({ message }: { message: BuilderMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      data-testid="builder-message"
      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
        isUser
          ? "self-end bg-primary/15 text-foreground"
          : "self-start border border-border/40 bg-card/60 text-foreground"
      }`}
    >
      {message.text}
    </div>
  );
}

// Vista de sessão: thread do chat + viewer do artefato à direita.
function SessionView({
  session,
  onSend,
}: {
  session: BuilderSessionDetail;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim().length === 0) {
      return;
    }
    onSend(draft);
    setDraft("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-5" data-testid="builder-session-view">
      <div className="flex items-center gap-2 pb-3">
        <span className="truncate font-medium text-foreground text-sm">{session.title}</span>
        <Badge variant="outline" className="shrink-0">
          Simulated session
        </Badge>
        <span className="ml-auto shrink-0 font-mono text-muted-foreground text-xs">
          {session.agentId ?? "new agent"}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto pr-1">
            {session.messages.map((m, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: transcript é append-only
              <MessageBubble key={i} message={m} />
            ))}
          </div>
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 transition-colors focus-within:border-primary/50">
              <Textarea
                aria-label="Session message"
                className="min-h-[40px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask for changes…"
              />
              <Button
                type="submit"
                size="sm"
                aria-label="Send message"
                className="size-8 rounded-full p-0"
              >
                <ArrowUp className="size-4" aria-hidden />
              </Button>
            </div>
          </form>
        </div>
        {session.artifact && <ArtifactViewer artifact={session.artifact} />}
      </div>
    </div>
  );
}

// Home + shell de três painéis do Agent Builder (assistente de código para agentes).
// Sessões são roteirizadas em fixtures — mesma premissa dos runs do playground,
// claramente rotuladas ("Simulated session" + banner global de fixtures mode).
export function AgentBuilderPage() {
  const ds = useDataSource();
  const { items: sessions, loadError } = useListing((d) => d.listBuilderSessions());
  const { items: agents } = useListing((d) => d.listAgents());
  const [target, setTarget] = useState("new");
  const [prompt, setPrompt] = useState("");
  const [query, setQuery] = useState("");
  const [openSession, setOpenSession] = useState<BuilderSessionDetail | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Atalhos do app (padrão de code assistant): ⌘K busca, ⌘N nova sessão.
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
        setOpenSession(null);
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
      .then(setOpenSession)
      .catch((error: unknown) =>
        setOpenError(error instanceof Error ? error.message : String(error)),
      );
  };

  const startSession = (e: FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (text.length === 0) {
      return;
    }
    // Sessão efêmera roteirizada (fixtures): user msg + resposta + artefato scaffold.
    setOpenSession({
      id: "draft-session",
      title: text.length > 48 ? `${text.slice(0, 48)}…` : text,
      agentId: target === "new" ? undefined : target,
      lastActivity: "now",
      pinned: false,
      messages: [{ role: "user", text }, { ...BUILDER_SCRIPTED_REPLY }],
      artifact: { ...BUILDER_SCRIPTED_ARTIFACT },
    });
    setPrompt("");
  };

  const sendFollowUp = (text: string) => {
    setOpenSession((current) =>
      current
        ? {
            ...current,
            messages: [...current.messages, { role: "user", text }, { ...FOLLOW_UP_REPLY }],
          }
        : current,
    );
  };

  return (
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {(loadError || openError) && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError ?? openError}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-auto border-border/40 border-r px-4 py-5 md:flex">
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
          <button
            type="button"
            onClick={() => {
              setOpenSession(null);
              setPrompt("");
            }}
            className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-foreground text-sm transition-colors hover:bg-muted/60"
          >
            <Plus className="size-4" aria-hidden />
            <span className="flex-1 text-left">New session</span>
            <kbd className="font-mono text-[10px] text-muted-foreground">⌘N</kbd>
          </button>
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Pinned
              </h2>
              <ul className="space-y-0.5">
                {pinned.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      data-testid="builder-session"
                      onClick={() => openById(s.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/40"
                    >
                      <Pin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-foreground">{s.title}</span>
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {s.lastActivity}
                      </span>
                    </button>
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
                  <button
                    type="button"
                    data-testid="builder-session"
                    onClick={() => openById(s.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground">{s.title}</span>
                    <span className="shrink-0 text-muted-foreground text-xs">{s.lastActivity}</span>
                  </button>
                </li>
              ))}
              {recent.length === 0 && (
                <li className="px-2 py-1.5 text-muted-foreground text-xs">No matching sessions.</li>
              )}
            </ul>
          </section>
        </aside>
        {openSession ? (
          <SessionView session={openSession} onSend={sendFollowUp} />
        ) : (
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
              <form onSubmit={startSession} className="mt-6">
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
                      type="submit"
                      size="sm"
                      aria-label="Start build session"
                      className="size-8 rounded-full p-0"
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                  </div>
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
