import { Badge, Button, EmptyState, Select, Textarea } from "@usetheo/ui";
import {
  ArrowUp,
  Bot,
  Boxes,
  Bug,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCode,
  FolderKanban,
  GitCommitHorizontal,
  GitPullRequest,
  Hand,
  LayoutTemplate,
  Mic,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  SquarePen,
  Undo2,
  Wrench,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import { useDataSource } from "../../data/datasource";
import {
  BUILDER_SCRIPTED_FILES,
  BUILDER_SCRIPTED_REPLY,
  BUILDER_SCRIPTED_WORK_LOG,
} from "../../data/fixtures/registry";
import type { BuilderArtifactFile, BuilderMessage, BuilderSessionDetail } from "../../data/types";

const surface = getSurface("/builder");

// Vistas internas navegáveis da sidebar do builder (estrutura de app de code
// assistant): home (nova sessão), sessão aberta, e as entradas de navegação.
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
// Diff rendering (painel Review) — parser próprio, linhas numeradas old/new.
// ---------------------------------------------------------------------------

interface DiffRow {
  kind: "add" | "del" | "ctx" | "meta";
  oldNo?: number;
  newNo?: number;
  text: string;
}

function parseDiff(diff: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      rows.push({ kind: "meta", text: line });
      continue;
    }
    if (line.startsWith("+")) {
      rows.push({ kind: "add", newNo: newNo++, text: line });
      continue;
    }
    if (line.startsWith("-")) {
      rows.push({ kind: "del", oldNo: oldNo++, text: line });
      continue;
    }
    rows.push({ kind: "ctx", oldNo: oldNo++, newNo: newNo++, text: line });
  }
  return rows;
}

const DIFF_ROW_CLASS: Record<DiffRow["kind"], string> = {
  add: "bg-emerald-500/10 text-emerald-300",
  del: "bg-red-500/10 text-red-300",
  ctx: "text-foreground",
  meta: "text-muted-foreground",
};

function FileDiff({ file }: { file: BuilderArtifactFile }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border/40"
      data-testid="review-file-diff"
      data-path={file.path}
    >
      <div className="flex items-center gap-2 border-border/40 border-b bg-card/80 px-3 py-1.5 font-mono text-xs">
        <span className="truncate text-foreground">{file.path}</span>
        <span className="ml-auto shrink-0 text-emerald-400">+{file.additions}</span>
        <span className="shrink-0 text-red-400">-{file.deletions}</span>
      </div>
      <pre className="overflow-auto font-mono text-xs leading-relaxed">
        {parseDiff(file.diff).map((row, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: linhas de diff são posicionais
          <span
            key={i}
            data-testid={`diff-line-${row.kind}`}
            className={`flex ${DIFF_ROW_CLASS[row.kind]}`}
          >
            <span className="w-10 shrink-0 select-none border-border/30 border-r px-1 text-right text-muted-foreground/60">
              {row.kind === "meta" ? "" : (row.newNo ?? row.oldNo)}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre px-2">{row.text || " "}</span>
          </span>
        ))}
      </pre>
    </div>
  );
}

// Painel Review (direita): tab + toolbar com contadores agregados e Commit
// (fake door honesto) + diffs por arquivo + árvore "All files".
function ReviewPanel({
  files,
  selectedPath,
  onSelect,
  onClose,
}: {
  files: BuilderArtifactFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const additions = files.reduce((a, f) => a + f.additions, 0);
  const deletions = files.reduce((a, f) => a + f.deletions, 0);
  const shown = selectedPath ? files.filter((f) => f.path === selectedPath) : files;

  return (
    <div
      className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/40"
      data-testid="builder-review"
    >
      <div className="flex items-center gap-1 border-border/40 border-b bg-card/80 px-3 py-2">
        <span className="flex items-center gap-1 rounded-full bg-muted/50 px-3 py-0.5 font-medium text-foreground text-xs">
          Review
          <button
            type="button"
            aria-label="Close review"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Unstaged <span className="text-emerald-400">+{additions}</span>{" "}
            <span className="text-red-400">-{deletions}</span>
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled
            title="Commits land when Studio attaches to a real registry"
            className="h-6 gap-1 px-2 text-xs"
          >
            <GitCommitHorizontal className="size-3.5" aria-hidden />
            Commit
          </Button>
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-auto p-3">
          {shown.map((file) => (
            <FileDiff key={file.path} file={file} />
          ))}
        </div>
        <div className="w-36 shrink-0 overflow-auto border-border/40 border-l px-2 py-2.5">
          <button
            type="button"
            onClick={() => onSelect("")}
            className={`flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted/40 ${
              selectedPath === null ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <ChevronDown className="size-3" aria-hidden />
            All files
          </button>
          <ul className="mt-1 space-y-0.5">
            {files.map((file) => {
              const name = file.path.split("/").at(-1) ?? file.path;
              const active = selectedPath === file.path;
              return (
                <li key={file.path}>
                  <button
                    type="button"
                    data-testid="review-tree-file"
                    onClick={() => onSelect(file.path)}
                    className={`w-full truncate rounded-md px-1.5 py-1 text-left font-mono text-xs transition-colors hover:bg-muted/40 ${
                      active ? "bg-muted/50 text-foreground" : "text-muted-foreground"
                    }`}
                    title={file.path}
                  >
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread da sessão: pill do usuário, work log expansível, card de arquivos.
// ---------------------------------------------------------------------------

// Painel lateral de detalhes da sessão (default à direita): mudanças agregadas,
// ações de git (fake door honesto) e artefatos produzidos — cada um abre o Review.
function DetailsPanel({
  files,
  onOpenReview,
}: {
  files: BuilderArtifactFile[];
  onOpenReview: (path: string | null) => void;
}) {
  const additions = files.reduce((a, f) => a + f.additions, 0);
  const deletions = files.reduce((a, f) => a + f.deletions, 0);
  return (
    <div
      className="flex min-h-0 w-full flex-col gap-4 overflow-auto rounded-xl border border-border/40 bg-card/40 p-4"
      data-testid="builder-details"
    >
      <section>
        <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Branch details
        </h3>
        <ul className="mt-2 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onOpenReview(null)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/40"
            >
              <SquarePen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-foreground">Changes</span>
              <span className="font-mono text-emerald-400 text-xs">+{additions}</span>
              <span className="font-mono text-red-400 text-xs">-{deletions}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled
              title="Git actions land when Studio attaches to a real registry"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GitCommitHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-foreground">Git actions</span>
            </button>
          </li>
          <li className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground text-sm">
            <GitPullRequest className="size-4 shrink-0" aria-hidden />
            Pull request status unavailable
          </li>
        </ul>
      </section>
      <section>
        <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Artifacts
        </h3>
        <ul className="mt-2 space-y-1">
          {files.map((file) => {
            const name = file.path.split("/").at(-1) ?? file.path;
            return (
              <li key={file.path}>
                <button
                  type="button"
                  data-testid="builder-artifact-item"
                  onClick={() => onOpenReview(file.path)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/40"
                >
                  <FileCode className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono text-foreground text-xs">
                    {name}
                  </span>
                </button>
              </li>
            );
          })}
          {files.length === 0 && (
            <li className="px-2 py-1.5 text-muted-foreground text-xs">No artifacts yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function WorkLog({ workedFor, steps }: { workedFor: string; steps: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <Clock className="size-3.5" aria-hidden />
        Worked for {workedFor}
        {open ? (
          <ChevronDown className="size-3.5" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5" aria-hidden />
        )}
      </button>
      {open && (
        <ul className="mt-2 space-y-1 border-border/40 border-l pl-3" data-testid="builder-worklog">
          {steps.map((step) => (
            <li key={step} className="text-muted-foreground text-xs">
              {step}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditedFilesCard({
  files,
  onReview,
}: {
  files: BuilderArtifactFile[];
  onReview: () => void;
}) {
  const additions = files.reduce((a, f) => a + f.additions, 0);
  const deletions = files.reduce((a, f) => a + f.deletions, 0);
  return (
    <div
      className="rounded-xl border border-border/40 bg-card/60 p-3"
      data-testid="builder-edited-files"
    >
      <div className="flex items-center gap-2">
        <SquarePen className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="font-medium text-foreground text-sm">
          Edited {files.length} file{files.length === 1 ? "" : "s"}
        </span>
        <span className="font-mono text-emerald-400 text-xs">+{additions}</span>
        <span className="font-mono text-red-400 text-xs">-{deletions}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled
            title="Undo lands when Studio attaches to a real registry"
            className="h-7 gap-1 px-2 text-xs"
          >
            <Undo2 className="size-3.5" aria-hidden />
            Undo
          </Button>
          <Button size="sm" variant="secondary" onClick={onReview} className="h-7 px-2 text-xs">
            Review
          </Button>
        </span>
      </div>
      <ul className="mt-2 space-y-1 border-border/40 border-t pt-2">
        {files.map((file) => (
          <li key={file.path} className="flex items-center gap-2 font-mono text-xs">
            <span className="truncate text-muted-foreground">{file.path}</span>
            <span className="ml-auto shrink-0 text-emerald-400">+{file.additions}</span>
            <span className="shrink-0 text-red-400">-{file.deletions}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionView({
  session,
  onSend,
}: {
  session: BuilderSessionDetail;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  // Painel direito: detalhes (default, padrão da referência) ou o Review com diffs.
  const [rightPane, setRightPane] = useState<"details" | "review">("details");

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
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
            {session.messages.map((m, i) =>
              m.role === "user" ? (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: transcript é append-only
                  key={i}
                  data-testid="builder-message"
                  className="max-w-[85%] self-end rounded-2xl bg-primary/15 px-4 py-2.5 text-foreground text-sm"
                >
                  {m.text}
                </div>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: transcript é append-only
                <div key={i} className="flex flex-col gap-2.5">
                  {i === 1 && <WorkLog workedFor={session.workedFor} steps={session.workLog} />}
                  <div
                    data-testid="builder-message"
                    className="text-foreground text-sm leading-relaxed"
                  >
                    {m.text}
                  </div>
                  {i === session.messages.length - 1 && session.files.length > 0 && (
                    <EditedFilesCard
                      files={session.files}
                      onReview={() => setRightPane("review")}
                    />
                  )}
                </div>
              ),
            )}
          </div>
          <form onSubmit={handleSubmit} className="mt-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 transition-colors focus-within:border-primary/50">
              <Textarea
                aria-label="Session message"
                className="min-h-[40px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Do anything — @ to reference skills"
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
        {session.files.length > 0 && (
          <div className="flex min-h-0 w-[46%] shrink-0">
            {rightPane === "review" ? (
              <ReviewPanel
                files={session.files}
                selectedPath={selectedPath}
                onSelect={(path) => setSelectedPath(path === "" ? null : path)}
                onClose={() => setRightPane("details")}
              />
            ) : (
              <DetailsPanel
                files={session.files}
                onOpenReview={(path) => {
                  setSelectedPath(path);
                  setRightPane("review");
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vistas das entradas de navegação da sidebar (Skills / Scheduled / Templates).
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
// Página: sidebar de app (nova sessão → busca → navegação → pinned/projects/tasks)
// + vista ativa. Sessões roteirizadas em fixtures, claramente rotuladas.
// ---------------------------------------------------------------------------

export function AgentBuilderPage() {
  const ds = useDataSource();
  const { items: sessions, loadError } = useListing((d) => d.listBuilderSessions());
  const { items: agents } = useListing((d) => d.listAgents());
  const [target, setTarget] = useState("new");
  const [prompt, setPrompt] = useState("");
  // Config local da sessão (real — nada executa em fixtures, mas a escolha é do usuário).
  const [approval, setApproval] = useState("ask");
  const [effort, setEffort] = useState("medium");
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
    const text = prompt.trim();
    if (text.length === 0) {
      return;
    }
    setView({
      kind: "session",
      session: {
        id: "draft-session",
        title: text.length > 48 ? `${text.slice(0, 48)}…` : text,
        agentId: target === "new" ? undefined : target,
        lastActivity: "now",
        pinned: false,
        workedFor: BUILDER_SCRIPTED_WORK_LOG.workedFor,
        workLog: [...BUILDER_SCRIPTED_WORK_LOG.steps],
        messages: [{ role: "user", text }, { ...BUILDER_SCRIPTED_REPLY }],
        files: structuredClone([...BUILDER_SCRIPTED_FILES]),
      },
    });
    setPrompt("");
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
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {(loadError || openError) && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError ?? openError}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-auto border-border/40 border-r px-4 py-5 md:flex">
          {/* Título com switcher (estrutura de app) */}
          <button
            type="button"
            className="flex items-center gap-1 px-1 font-semibold text-foreground text-sm tracking-tight"
            title="Assistant switcher lands with the real registry"
            disabled
          >
            Agent Builder
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
          {/* Ordem da referência: nova sessão → busca → navegação */}
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
        {view.kind === "session" ? (
          <SessionView session={view.session} onSend={sendFollowUp} />
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
                {/* Anatomia do composer (referência): texto → linha de ações → linha do projeto */}
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
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Hand className="size-3.5" aria-hidden />
                      <Select value={approval} onValueChange={setApproval}>
                        <Select.Trigger
                          aria-label="Approval mode"
                          size="sm"
                          className="h-6 border-0 bg-transparent px-1 text-xs shadow-none"
                        >
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="ask">Ask for approval</Select.Item>
                          <Select.Item value="auto-edits">Auto-approve edits</Select.Item>
                          <Select.Item value="readonly">Read-only</Select.Item>
                        </Select.Content>
                      </Select>
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <span className="font-mono">claude-fable-5</span>
                        <Select value={effort} onValueChange={setEffort}>
                          <Select.Trigger
                            aria-label="Reasoning effort"
                            size="sm"
                            className="h-6 border-0 bg-transparent px-1 text-xs shadow-none"
                          >
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="low">Low</Select.Item>
                            <Select.Item value="medium">Medium</Select.Item>
                            <Select.Item value="high">High</Select.Item>
                          </Select.Content>
                        </Select>
                      </span>
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
                {/* Linha do projeto/alvo abaixo do composer (referência) */}
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
