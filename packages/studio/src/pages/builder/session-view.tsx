import { Badge, Button, Textarea } from "@usetheo/ui";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SquarePen,
  Undo2,
} from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import type { BuilderArtifactFile, BuilderSessionDetail } from "../../data/types";
import { DetailsPanel, ReviewPanel } from "./review";

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

export function SessionView({
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
  // Foco devolvido ao details quando o Review fecha (F-dom-3 — a11y).
  const [detailsFromClose, setDetailsFromClose] = useState(false);
  // Largura do chat em % (splitter arrastável entre chat e painel; clamp 25–75).
  const [chatPct, setChatPct] = useState(54);
  // Minimização: no máximo UM lado escondido por vez (nunca tela vazia).
  const [minimized, setMinimized] = useState<"none" | "chat" | "panel">("none");
  const hasPanel = session.files.length > 0;
  const showChat = minimized !== "chat";
  const showPanel = hasPanel && minimized !== "panel";
  const paneContainerRef = useRef<HTMLDivElement>(null);

  const clampPct = (pct: number) => Math.min(75, Math.max(25, pct));

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = paneContainerRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      setChatPct(clampPct(((ev.clientX - rect.left) / rect.width) * 100));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

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
        {hasPanel && (
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={minimized === "chat" ? "Restore chat" : "Minimize chat"}
              aria-pressed={minimized === "chat"}
              title={minimized === "chat" ? "Restore chat" : "Minimize chat"}
              onClick={() => setMinimized((m) => (m === "chat" ? "none" : "chat"))}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {minimized === "chat" ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              aria-label={minimized === "panel" ? "Restore side panel" : "Minimize side panel"}
              aria-pressed={minimized === "panel"}
              title={minimized === "panel" ? "Restore side panel" : "Minimize side panel"}
              onClick={() => setMinimized((m) => (m === "panel" ? "none" : "panel"))}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {minimized === "panel" ? (
                <PanelRightOpen className="size-4" aria-hidden />
              ) : (
                <PanelRightClose className="size-4" aria-hidden />
              )}
            </button>
          </span>
        )}
      </div>
      <div ref={paneContainerRef} className="flex min-h-0 flex-1">
        {showChat && (
          <div
            className="flex min-w-0 flex-col"
            style={showPanel ? { width: `${chatPct}%` } : { width: "100%" }}
            data-testid="builder-chat-pane"
          >
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
        )}
        {showChat && showPanel && (
          // biome-ignore lint/a11y/useSemanticElements: splitter interativo vertical — <hr> não suporta drag/teclado
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat"
            aria-valuenow={Math.round(chatPct)}
            aria-valuemin={25}
            aria-valuemax={75}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={(e) => {
              // Acessibilidade: setas redimensionam sem mouse.
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setChatPct((p) => clampPct(p - 4));
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                setChatPct((p) => clampPct(p + 4));
              }
            }}
            className="mx-1.5 w-1.5 shrink-0 cursor-col-resize rounded-full bg-border/40 transition-colors hover:bg-primary/50 focus-visible:bg-primary/60 focus-visible:outline-none"
          />
        )}
        {showPanel && (
          <div className="flex min-h-0 min-w-0 flex-1">
            {rightPane === "review" ? (
              <ReviewPanel
                files={session.files}
                selectedPath={selectedPath}
                onSelect={(path) => setSelectedPath(path === "" ? null : path)}
                onClose={() => {
                  setRightPane("details");
                  setDetailsFromClose(true);
                }}
              />
            ) : (
              <DetailsPanel
                files={session.files}
                focusOnMount={detailsFromClose}
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
