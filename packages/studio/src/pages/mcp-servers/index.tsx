import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";

const surface = getSurface("/mcp-servers");

export function McpServersPage() {
  const { items: servers, loadError } = useListing((ds) => ds.listMcpServers());
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <EntityTable
        items={servers}
        gridClassName="grid-cols-[220px_1fr_repeat(3,90px)]"
        filterPlaceholder="Filter by name…"
        filterLabel="Filter MCP servers"
        matches={(s, term) => s.name.toLowerCase().includes(term)}
        rowKey={(s) => s.id}
        rowTestId="mcp-server-row"
        emptyText="No MCP servers match your filter."
        columns={[
          {
            header: "Name",
            render: (s) => <span className="font-medium text-foreground text-sm">{s.name}</span>,
          },
          {
            header: "URL",
            render: (s) => (
              <span className="block truncate font-mono text-muted-foreground text-xs">
                {s.url}
              </span>
            ),
          },
          {
            header: "Agents",
            render: (s) => <span className="text-muted-foreground text-sm">{s.agents}</span>,
          },
          {
            header: "Tools",
            render: (s) => <span className="text-muted-foreground text-sm">{s.tools}</span>,
          },
          {
            header: "Workflows",
            render: (s) => <span className="text-muted-foreground text-sm">{s.workflows}</span>,
          },
        ]}
      />
    </section>
  );
}
