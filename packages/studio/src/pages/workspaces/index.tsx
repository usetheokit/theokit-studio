import { FileText, Folder, Server } from "lucide-react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";

const surface = getSurface("/workspaces");

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Browser read-only dos arquivos do workspace (fixtures). Escrita/refresh chegam com
// o workspace real do dev server.
export function WorkspacesPage() {
  const { items: workspaces, loadError } = useListing((ds) => ds.listWorkspaces());
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <div className="space-y-6 px-8 py-6">
        {workspaces.map((ws) => (
          <div key={ws.id}>
            <p className="flex items-center gap-2 font-medium text-foreground text-sm">
              <Server className="size-4 text-primary" aria-hidden />
              {ws.name}
            </p>
            <div className="mt-3 max-w-2xl overflow-hidden rounded-xl border border-border/40">
              <div className="border-border/40 border-b bg-card/80 px-4 py-2 text-muted-foreground text-xs uppercase tracking-wide">
                Files
              </div>
              <ul>
                {ws.files.map((f) => (
                  <li
                    key={f.name}
                    data-testid="workspace-file"
                    className="flex items-center gap-2.5 border-border/30 border-b px-4 py-2.5 last:border-b-0"
                  >
                    {f.kind === "dir" ? (
                      <Folder className="size-4 text-amber-400" aria-hidden />
                    ) : (
                      <FileText className="size-4 text-muted-foreground" aria-hidden />
                    )}
                    <span className="text-foreground text-sm">{f.name}</span>
                    {f.kind === "file" && f.sizeBytes !== undefined && (
                      <span className="ml-auto text-muted-foreground text-xs">
                        {formatSize(f.sizeBytes)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
