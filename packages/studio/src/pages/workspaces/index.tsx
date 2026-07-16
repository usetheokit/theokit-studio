import { Button, EmptyState } from "@usetheo/ui";
import { FileText, Folder, FolderOpen, FolderPlus, RefreshCw, Server, X } from "lucide-react";
import { useRef, useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import { useDataSource } from "../../data/datasource";
import type { WorkspaceFileEntry, WorkspaceSummary } from "../../data/types";

const surface = getSurface("/workspaces");

function formatSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** filhos diretos de `dir` ("" = raiz), pastas primeiro, alfabético. */
function childrenOf(files: WorkspaceFileEntry[], dir: string): WorkspaceFileEntry[] {
  const prefix = dir === "" ? "" : `${dir}/`;
  return files
    .filter((e) => {
      if (!e.path.startsWith(prefix) || e.path === dir) {
        return false;
      }
      return !e.path.slice(prefix.length).includes("/");
    })
    .sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === "dir" ? -1 : 1));
}

interface OpenFile {
  path: string;
  content: string;
}

// Browser de arquivos do workspace (padrão Mastra): navegar em pastas, abrir arquivo
// no viewer à direita, criar pasta e refresh. Operações agem sobre o estado de SESSÃO
// do fixture datasource (reset no reload) — o workspace real chega com o dev server.
function WorkspaceBrowser({
  workspace,
  onRefresh,
}: {
  workspace: WorkspaceSummary;
  onRefresh: () => void;
}) {
  const ds = useDataSource();
  const [dir, setDir] = useState("");
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [folderDraft, setFolderDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const newFolderButtonRef = useRef<HTMLButtonElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);

  const entries = childrenOf(workspace.files, dir);
  const crumbs = dir === "" ? [] : dir.split("/");

  const openEntry = (entry: WorkspaceFileEntry) => {
    setActionError(null);
    if (entry.kind === "dir") {
      setDir(entry.path);
      return;
    }
    ds.readWorkspaceFile(workspace.id, entry.path)
      .then((content) => setOpenFile({ path: entry.path, content }))
      .catch((error: unknown) =>
        setActionError(error instanceof Error ? error.message : String(error)),
      );
  };

  const createFolder = () => {
    const name = folderDraft.trim();
    // "/" no nome criaria uma pasta órfã fora do diretório atual (review F-dom-10).
    if (name.includes("/")) {
      setActionError("Folder name must not contain '/'");
      return;
    }
    const path = dir === "" ? name : `${dir}/${name}`;
    ds.createWorkspaceFolder(workspace.id, path)
      .then(() => {
        setFolderDraft("");
        setNewFolderMode(false);
        setActionError(null);
        onRefresh();
      })
      .catch((error: unknown) =>
        setActionError(error instanceof Error ? error.message : String(error)),
      );
  };

  return (
    <div>
      <p className="flex items-center gap-2 font-medium text-foreground text-sm">
        <Server className="size-4 text-primary" aria-hidden />
        {workspace.name}
      </p>
      <div className="mt-3 flex items-start gap-6">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border/40">
          <div className="flex items-center gap-1 border-border/40 border-b bg-card/80 px-3 py-2">
            <button
              type="button"
              aria-label="Go to workspace root"
              onClick={() => setDir("")}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            >
              <FolderOpen className="size-4" aria-hidden />
            </button>
            {crumbs.map((segment, i) => {
              const target = crumbs.slice(0, i + 1).join("/");
              return (
                <span key={target} className="flex items-center gap-1">
                  <span className="text-muted-foreground/50 text-xs">/</span>
                  <button
                    type="button"
                    onClick={() => setDir(target)}
                    className="rounded px-1 py-0.5 text-foreground text-sm hover:bg-muted/40"
                  >
                    {segment}
                  </button>
                </span>
              );
            })}
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                ref={refreshButtonRef}
                aria-label="Refresh files"
                onClick={onRefresh}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                <RefreshCw className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                ref={newFolderButtonRef}
                aria-label="New folder"
                onClick={() => {
                  setNewFolderMode(true);
                  setActionError(null);
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                <FolderPlus className="size-4" aria-hidden />
              </button>
            </span>
          </div>
          {newFolderMode && (
            <div className="flex items-center gap-2 border-border/40 border-b bg-card/40 px-3 py-2">
              <Folder className="size-4 shrink-0 text-amber-400" aria-hidden />
              <input
                aria-label="Folder name"
                className="h-8 flex-1 rounded-lg border border-border/60 bg-background px-3 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                placeholder="folder-name"
                value={folderDraft}
                onChange={(e) => setFolderDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createFolder();
                  }
                }}
              />
              <Button size="sm" onClick={createFolder}>
                Create folder
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewFolderMode(false);
                  setFolderDraft("");
                  setActionError(null);
                  // devolve o foco ao gatilho (F-dom-3 — a11y)
                  newFolderButtonRef.current?.focus();
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          <ul>
            {entries.map((entry) => {
              const name = entry.path.split("/").at(-1) ?? entry.path;
              return (
                <li key={entry.path} className="border-border/30 border-b last:border-b-0">
                  <button
                    type="button"
                    data-testid="workspace-file"
                    onClick={() => openEntry(entry)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-card"
                  >
                    {entry.kind === "dir" ? (
                      <Folder className="size-4 shrink-0 text-amber-400" aria-hidden />
                    ) : (
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className="text-foreground text-sm">{name}</span>
                    {entry.kind === "file" && entry.content !== undefined && (
                      <span className="ml-auto text-muted-foreground text-xs">
                        {formatSize(entry.content)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {entries.length === 0 && (
              <li className="px-4 py-6 text-center text-muted-foreground text-sm">Empty folder.</li>
            )}
          </ul>
        </div>
        {openFile && (
          <div
            className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border/40"
            data-testid="workspace-file-viewer"
          >
            <div className="flex items-center gap-2 border-border/40 border-b bg-card/80 px-4 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate font-medium text-foreground text-sm">{openFile.path}</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto gap-1"
                onClick={() => {
                  setOpenFile(null);
                  // devolve o foco à toolbar estável (F-dom-3 — a11y)
                  refreshButtonRef.current?.focus();
                }}
              >
                <X className="size-3.5" aria-hidden />
                Close
              </Button>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 font-mono text-foreground text-sm">
              {openFile.content}
            </pre>
          </div>
        )}
      </div>
      {actionError && (
        <p role="alert" className="mt-2 text-red-400 text-sm">
          {actionError}
        </p>
      )}
      <p className="mt-3 text-muted-foreground text-xs">
        Session-only workspace — folder changes reset on reload; the real workspace lands with the
        dev server.
      </p>
    </div>
  );
}

export function WorkspacesPage() {
  const { items: workspaces, loadError, reload } = useListing((ds) => ds.listWorkspaces());
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <div className="space-y-6 px-8 py-6">
        {workspaces.length === 0 && (
          <div className="mx-auto max-w-2xl py-10">
            <EmptyState
              title="No workspaces yet"
              description="Workspaces appear here once the registry declares them."
              data-testid="workspaces-empty"
            />
          </div>
        )}
        {workspaces.map((ws) => (
          <WorkspaceBrowser key={ws.id} workspace={ws} onRefresh={reload} />
        ))}
      </div>
    </section>
  );
}
