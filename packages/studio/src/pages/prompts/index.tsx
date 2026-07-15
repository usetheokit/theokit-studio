import { Badge, Button } from "@usetheo/ui";
import { ArrowLeft, MessageSquareText, Plus } from "lucide-react";
import { useState } from "react";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import type { PromptSummary } from "../../data/types";

const surface = getSurface("/prompts");

// Detail do prompt block (prompt-ops): identidade + conteúdo publicado read-only.
// Fixtures-only: criação/edição/versionamento são fake door honesto — chegam com o
// registry real (blueprint § 4.2: overrides versionados sobre o baseline do código).
function PromptDetail({ prompt, onBack }: { prompt: PromptSummary; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-6" data-testid="prompt-detail">
      <div className="rounded-xl border border-border/40 bg-card/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <MessageSquareText className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="font-medium font-mono text-foreground">{prompt.name}</span>
          </p>
          <Badge variant="outline">{prompt.version}</Badge>
        </div>
        <p className="mt-1.5 text-muted-foreground text-sm">{prompt.description}</p>
        <p className="mt-2 text-muted-foreground text-xs">
          Referenced by {prompt.usedBy} agent{prompt.usedBy === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-4 rounded-xl border border-border/40 bg-card/40 p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          Published content ({prompt.version})
        </p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-foreground text-sm">
          {prompt.content}
        </pre>
      </div>
      <p className="mt-3 text-muted-foreground text-xs">
        Editing and versioning land when Studio attaches to a real registry — the block is read-only
        in fixtures mode.
      </p>
      <Button variant="ghost" size="sm" onClick={onBack} className="mt-4 w-fit gap-1.5">
        <ArrowLeft className="size-4" aria-hidden />
        All prompts
      </Button>
    </div>
  );
}

export function PromptsPage() {
  const { items: prompts, loadError } = useListing((ds) => ds.listPrompts());
  const [selected, setSelected] = useState<PromptSummary | null>(null);

  return (
    <section className="flex h-full flex-col">
      <PageHeader
        icon={surface.icon}
        title={surface.label}
        description={surface.description}
        actions={
          <Button disabled title="Prompt creation lands with the real registry" className="gap-1.5">
            <Plus className="size-4" aria-hidden />
            Create Prompt
          </Button>
        }
      />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      {selected === null ? (
        <EntityTable
          items={prompts}
          gridClassName="grid-cols-[220px_1fr_90px_90px]"
          filterPlaceholder="Filter by name or description…"
          filterLabel="Filter prompts"
          matches={(p, term) =>
            p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
          }
          rowKey={(p) => p.id}
          rowTestId="prompt-row"
          onRowClick={setSelected}
          emptyText="No prompts match your filter."
          noItemsText="No prompts yet — create a reusable prompt block and reference it in your agent instructions."
          columns={[
            {
              header: "Name",
              render: (p) => (
                <span className="font-medium font-mono text-foreground text-sm">{p.name}</span>
              ),
            },
            {
              header: "Description",
              render: (p) => (
                <span className="block truncate text-muted-foreground text-sm">
                  {p.description}
                </span>
              ),
            },
            {
              header: "Version",
              render: (p) => <Badge variant="outline">{p.version}</Badge>,
            },
            {
              header: "Used by",
              render: (p) => <span className="text-muted-foreground text-sm">{p.usedBy}</span>,
            },
          ]}
        />
      ) : (
        <PromptDetail prompt={selected} onBack={() => setSelected(null)} />
      )}
    </section>
  );
}
