import { Badge, Button } from "@usetheo/ui";
import { ArrowLeft, Bot, Check, Copy, Workflow, Wrench } from "lucide-react";
import { useState } from "react";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import type { McpExposedTool, McpServerSummary } from "../../data/types";

const surface = getSurface("/mcp-servers");

const TOOL_KIND_ICON = {
  tool: Wrench,
  agent: Bot,
  workflow: Workflow,
} as const;

interface TransportCard {
  tag: string;
  title: string;
  hint: string;
  value: string;
}

function transportsOf(server: McpServerSummary): TransportCard[] {
  return [
    {
      tag: "HTTP",
      title: "Regular HTTP Endpoint",
      hint: "Use for stateless HTTP transport with streamable responses.",
      value: server.httpUrl,
    },
    {
      tag: "SSE",
      title: "Server-Sent Events",
      hint: "Use for real-time communication via SSE.",
      value: server.url,
    },
    {
      tag: "CLI",
      title: "Command Line",
      hint: "Use for local command-line access via npx and mcp-remote.",
      value: `npx -y mcp-remote ${server.url}`,
    },
  ];
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    // Progressive enhancement: clipboard pode não existir (http não-seguro/jsdom);
    // a falha vira feedback visível, nunca exceção engolida sem sinal.
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="block flex-1 truncate rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-foreground text-xs">
        {value}
      </code>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        aria-label={`Copy: ${value}`}
        className="shrink-0"
      >
        {copied ? (
          <Check className="size-4 text-emerald-400" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}

function ExposedToolCard({ tool }: { tool: McpExposedTool }) {
  const Icon = TOOL_KIND_ICON[tool.kind];
  return (
    <li
      data-testid="mcp-exposed-tool"
      className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/60 px-4 py-3"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium font-mono text-foreground text-sm">{tool.name}</p>
        <p className="mt-0.5 text-muted-foreground text-xs">{tool.description}</p>
      </div>
    </li>
  );
}

// Detail do MCP server (padrão Mastra): transportes de acesso à esquerda (HTTP/SSE/CLI
// com copy) + painel "Available Tools" à direita com origem por ícone.
function McpServerDetail({ server, onBack }: { server: McpServerSummary; onBack: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 gap-6 px-8 py-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-semibold text-foreground text-lg">{server.name}</h2>
          <Badge variant="outline">Version {server.version}</Badge>
        </div>
        <p className="mt-2 max-w-prose text-muted-foreground text-sm">
          This MCP server can be reached through multiple transport methods — pick the one that fits
          your client.
        </p>
        <div className="mt-5 space-y-4">
          {transportsOf(server).map((t) => (
            <div
              key={t.tag}
              data-testid="mcp-transport"
              className="rounded-xl border border-border/40 bg-card/60 p-4"
            >
              <p className="flex items-center gap-2 text-sm">
                <span className="font-mono text-emerald-400 text-xs">{t.tag}</span>
                <span className="font-medium text-foreground">{t.title}</span>
              </p>
              <p className="mt-1 text-muted-foreground text-xs">{t.hint}</p>
              <CopyField value={t.value} />
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-6 w-fit gap-1.5">
          <ArrowLeft className="size-4" aria-hidden />
          All MCP servers
        </Button>
      </div>
      <div className="w-96 shrink-0">
        <p className="font-medium text-foreground text-sm">Available Tools</p>
        <ul className="mt-3 space-y-2.5">
          {server.availableTools.map((tool) => (
            <ExposedToolCard key={tool.name} tool={tool} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function McpServersPage() {
  const { items: servers, loadError } = useListing((ds) => ds.listMcpServers());
  const [selected, setSelected] = useState<McpServerSummary | null>(null);

  return (
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      {selected === null ? (
        <EntityTable
          items={servers}
          gridClassName="grid-cols-[220px_1fr_repeat(3,90px)]"
          filterPlaceholder="Filter by name…"
          filterLabel="Filter MCP servers"
          matches={(s, term) => s.name.toLowerCase().includes(term)}
          rowKey={(s) => s.id}
          rowTestId="mcp-server-row"
          onRowClick={setSelected}
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
      ) : (
        <McpServerDetail server={selected} onBack={() => setSelected(null)} />
      )}
    </section>
  );
}
