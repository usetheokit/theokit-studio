import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";

const surface = getSurface("/tools");

export function ToolsPage() {
  const { items: tools, loadError } = useListing((ds) => ds.listTools());
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <EntityTable
        items={tools}
        gridClassName="grid-cols-[220px_1fr_90px]"
        filterPlaceholder="Filter by name or description…"
        filterLabel="Filter tools"
        matches={(t, term) =>
          t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term)
        }
        rowKey={(t) => t.id}
        rowTestId="tool-row"
        emptyText="No tools match your filter."
        noItemsText="No tools registered yet."
        columns={[
          {
            header: "Name",
            render: (t) => (
              <span className="font-mono font-medium text-foreground text-sm">{t.name}</span>
            ),
          },
          {
            header: "Description",
            render: (t) => (
              <span className="block truncate text-muted-foreground text-sm">{t.description}</span>
            ),
          },
          {
            header: "Used by",
            render: (t) => <span className="text-muted-foreground text-sm">{t.usedBy ?? 0}</span>,
          },
        ]}
      />
    </section>
  );
}
