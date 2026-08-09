import { FileCode, GitCommitHorizontal, GitPullRequest, SquarePen } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BuilderArtifactFile } from "../../data/types";

// ---------------------------------------------------------------------------
// The session's side details panel (the default on the right): aggregated changes, git
// actions (an honest fake door) and produced artifacts — each of which opens the Review.
// The Review panel itself is @theokit/ui's <CodeReviewPanel>; this DetailsPanel is the
// Studio-specific composition that orchestrates it.
// ---------------------------------------------------------------------------

export function DetailsPanel({
  files,
  onOpenReview,
  focusOnMount = false,
}: {
  files: BuilderArtifactFile[];
  onOpenReview: (path: string | null) => void;
  /** returns focus to the panel when it comes back after the Review closes (F-dom-3). */
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
