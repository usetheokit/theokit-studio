import { Badge, Button } from "@usetheo/ui";
import {
  ChevronDown,
  FileCode,
  GitCommitHorizontal,
  GitPullRequest,
  SquarePen,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { BuilderArtifactFile } from "../../data/types";

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
        {parseDiff(file.diff).map((row) => (
          <span
            key={`${row.kind}:${row.oldNo ?? ""}:${row.newNo ?? ""}:${row.text}`}
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
export function ReviewPanel({
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
export function DetailsPanel({
  files,
  onOpenReview,
  focusOnMount = false,
}: {
  files: BuilderArtifactFile[];
  onOpenReview: (path: string | null) => void;
  /** devolve o foco ao painel quando ele volta após fechar o Review (F-dom-3). */
  focusOnMount?: boolean;
}) {
  const firstActionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusOnMount) {
      firstActionRef.current?.focus();
    }
  }, [focusOnMount]);
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
              ref={firstActionRef}
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
