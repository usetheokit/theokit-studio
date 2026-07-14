import { Check, Minus } from "lucide-react";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";

const surface = getSurface("/processors");

function HookMark({ on }: { on: boolean }) {
  return on ? (
    <Check className="size-4 text-emerald-400" aria-label="yes" />
  ) : (
    <Minus className="size-4 text-muted-foreground/50" aria-label="no" />
  );
}

// Matriz de capacidades dos processors (hooks do pipeline que cada um implementa).
export function ProcessorsPage() {
  const { items: processors, loadError } = useListing((ds) => ds.listProcessors());
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <EntityTable
        items={processors}
        gridClassName="grid-cols-[220px_1fr_repeat(4,70px)_80px]"
        filterPlaceholder="Filter by name…"
        filterLabel="Filter processors"
        matches={(p, term) => p.name.toLowerCase().includes(term)}
        rowKey={(p) => p.id}
        rowTestId="processor-row"
        emptyText="No processors match your filter."
        columns={[
          {
            header: "Name",
            render: (p) => <span className="font-medium text-foreground text-sm">{p.name}</span>,
          },
          {
            header: "Description",
            render: (p) => (
              <span className="block truncate text-muted-foreground text-sm">
                {p.description ?? "—"}
              </span>
            ),
          },
          { header: "Input", render: (p) => <HookMark on={p.hooks.input} /> },
          { header: "Step", render: (p) => <HookMark on={p.hooks.step} /> },
          { header: "Stream", render: (p) => <HookMark on={p.hooks.stream} /> },
          { header: "Result", render: (p) => <HookMark on={p.hooks.result} /> },
          {
            header: "Used by",
            render: (p) => <span className="text-muted-foreground text-sm">{p.usedBy}</span>,
          },
        ]}
      />
    </section>
  );
}
