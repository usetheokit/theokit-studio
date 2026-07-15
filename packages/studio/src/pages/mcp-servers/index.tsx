import { Badge, Button } from "@usetheo/ui";
import { ArrowLeft, Bot, Check, Copy, Play, Workflow, Wrench } from "lucide-react";
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
  // Progressive enhancement: clipboard pode não existir (http não-seguro/jsdom);
  // a falha vira feedback VISÍVEL (review F-front-3/F-domtest-4), nunca no-op.
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  };
  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="block flex-1 truncate rounded-lg border border-border/50 bg-background px-3 py-2 font-mono text-foreground text-xs">
        {value}
      </code>
      {copyState === "failed" && (
        <span role="status" className="shrink-0 text-red-400 text-xs">
          Copy failed
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        aria-label={`Copy: ${value}`}
        className="shrink-0"
      >
        {copyState === "copied" ? (
          <Check className="size-4 text-emerald-400" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}

function ExposedToolCard({ tool, onOpen }: { tool: McpExposedTool; onOpen: () => void }) {
  const Icon = TOOL_KIND_ICON[tool.kind];
  return (
    <li>
      <button
        type="button"
        data-testid="mcp-exposed-tool"
        onClick={onOpen}
        className="flex w-full items-start gap-3 rounded-xl border border-border/40 bg-card/60 px-4 py-3 text-left transition-colors hover:border-primary/40"
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium font-mono text-foreground text-sm">{tool.name}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">{tool.description}</p>
        </div>
      </button>
    </li>
  );
}

// Detail da tool exposta (padrão Mastra: /mcps/{server}/tools/{tool}): descrição +
// form "Input Data" derivado do input schema + Submit e painel de Output. Fixtures-only:
// o Submit é desabilitado com nota honesta — nenhuma invocação simulada de tool.
function ExposedToolDetail({
  server,
  tool,
  onBack,
}: {
  server: McpServerSummary;
  tool: McpExposedTool;
  onBack: () => void;
}) {
  const Icon = TOOL_KIND_ICON[tool.kind];
  return (
    <div className="flex min-h-0 flex-1 gap-6 px-8 py-6" data-testid="mcp-tool-detail">
      <div className="flex w-96 shrink-0 flex-col gap-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <p className="flex items-center gap-2 text-sm">
            <Icon className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="font-medium font-mono text-foreground">{tool.name}</span>
          </p>
          <p className="mt-1.5 text-muted-foreground text-xs">{tool.description}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <p className="font-medium text-foreground text-sm">Input Data</p>
          <div className="mt-3 space-y-3">
            {tool.inputFields.map((field) => (
              <div key={field.name}>
                <label
                  className="block text-muted-foreground text-xs uppercase tracking-wide"
                  htmlFor={`tool-input-${field.name}`}
                >
                  {field.label}
                  {field.required && (
                    <span className="ml-0.5 text-red-400" aria-hidden>
                      *
                    </span>
                  )}
                </label>
                <input
                  id={`tool-input-${field.name}`}
                  className="mt-1.5 h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  placeholder={field.label}
                />
              </div>
            ))}
          </div>
          <Button
            className="mt-4 w-full gap-1.5"
            disabled
            title="Invocations land with the real registry"
          >
            <Play className="size-4" aria-hidden />
            Submit
          </Button>
          <p className="mt-2 text-muted-foreground text-xs">
            Tool invocations are disabled in fixtures mode — they land when Studio attaches to a
            real registry.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit gap-1.5">
          <ArrowLeft className="size-4" aria-hidden />
          {server.name}
        </Button>
      </div>
      <div className="flex-1 overflow-auto rounded-xl border border-border/40 bg-card/40 p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">Output</p>
        <pre className="mt-2 font-mono text-muted-foreground text-sm">{"{}"}</pre>
      </div>
    </div>
  );
}

// Detail do MCP server (padrão Mastra): transportes de acesso à esquerda (HTTP/SSE/CLI
// com copy) + painel "Available Tools" à direita com origem por ícone; cada tool abre
// o detail com o form do input schema.
function McpServerDetail({ server, onBack }: { server: McpServerSummary; onBack: () => void }) {
  const [selectedTool, setSelectedTool] = useState<McpExposedTool | null>(null);

  if (selectedTool) {
    return (
      <ExposedToolDetail server={server} tool={selectedTool} onBack={() => setSelectedTool(null)} />
    );
  }

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
            <ExposedToolCard key={tool.name} tool={tool} onOpen={() => setSelectedTool(tool)} />
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
          noItemsText="No MCP servers registered yet."
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
