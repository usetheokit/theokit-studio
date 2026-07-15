import { ChatMessageContent, ChatMessageRoot, ToolCallCard } from "@theokit/ui";
import { Badge, Button, Combobox, Slider, Textarea } from "@usetheo/ui";
import { ArrowLeft, Bot, SendHorizonal } from "lucide-react";
import { type FormEvent, useState } from "react";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import type { RunAgentParams } from "../../data/datasource";
import type { AgentSummary } from "../../data/types";
import type { ChatPart } from "./event-to-part";
import { useRunPlayback } from "./use-run-playback";

const surface = getSurface("/agents");

// Q2 (plano § Unresolved) resolvida: em vez de useAgentStream (transport próprio),
// composição controlada com ChatMessage.Root/Content + ToolCallCard — dogfooding direto
// do design system sobre o estado do useRunPlayback.
function PartView({ part }: { part: ChatPart }) {
  switch (part.kind) {
    case "user":
      return (
        <ChatMessageRoot from="user">
          <ChatMessageContent>{part.text}</ChatMessageContent>
        </ChatMessageRoot>
      );
    case "text":
      return (
        <ChatMessageRoot from="assistant">
          <ChatMessageContent>{part.text}</ChatMessageContent>
        </ChatMessageRoot>
      );
    case "tool":
      return (
        <ToolCallCard
          tool={part.name}
          target={JSON.stringify(part.args ?? {})}
          status={part.done ? "success" : "running"}
          output={part.done ? <pre>{JSON.stringify(part.result, null, 2)}</pre> : undefined}
        />
      );
    case "notice":
      return (
        <div role="status" className="my-1 flex items-center gap-2">
          <Badge variant={part.notice === "rate-limit" ? "warning" : "destructive"}>
            {part.notice}
          </Badge>
          <span className="text-muted-foreground text-sm">{part.detail}</span>
        </div>
      );
    case "unknown":
      return (
        <div role="note" className="my-1 text-muted-foreground text-sm">
          unknown event: {part.type}
        </div>
      );
  }
}

// Padrão agents-first (Mastra real, dogfood 2026-07-14): a entrada do Playground é a
// LISTA de agentes (Name | Description | Model + filtro); o chat abre ao escolher um.
// Review F-arch-4: fork manual da tabela substituído pelo EntityTable compartilhado.
function AgentsTable({
  agents,
  onPick,
}: {
  agents: AgentSummary[];
  onPick: (a: AgentSummary) => void;
}) {
  return (
    <EntityTable
      items={agents}
      gridClassName="grid-cols-[200px_1fr_180px]"
      filterPlaceholder="Filter by name or description…"
      filterLabel="Filter agents"
      matches={(a, term) =>
        a.name.toLowerCase().includes(term) || a.description.toLowerCase().includes(term)
      }
      rowKey={(a) => a.id}
      rowTestId="agent-row"
      onRowClick={onPick}
      emptyText="No agents match your filter."
      noItemsText="No agents registered yet."
      columns={[
        {
          header: "Name",
          render: (a) => (
            <span className="flex items-center gap-2 font-medium text-foreground text-sm">
              <span className="flex size-6 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                <Bot className="size-3.5" aria-hidden />
              </span>
              {a.name}
            </span>
          ),
        },
        {
          header: "Description",
          render: (a) => (
            <span className="block truncate text-muted-foreground text-sm">{a.description}</span>
          ),
        },
        {
          header: "Model",
          render: (a) => (
            <span className="block truncate font-mono text-muted-foreground text-xs">
              {a.model ?? "—"}
            </span>
          ),
        },
      ]}
    />
  );
}

// Abas do detail do agente (padrão Mastra): só Chat é real no M5 — Editor/Evaluate/
// Review/Traces são fake doors honestos (desabilitadas com nota) até os milestones
// que as habilitam (Editor=prompt-ops; Traces=lens M2; Evaluate/Review=evaluation).
const AGENT_TABS = ["Chat", "Editor", "Evaluate", "Review", "Traces"] as const;

function ChatView({ agent, onBack }: { agent: AgentSummary; onBack: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [params, setParams] = useState<RunAgentParams>({
    model: agent.model ?? "claude-sonnet-4-6",
    temperature: 0.7,
    topP: 1,
  });
  const { state, send } = useRunPlayback();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(agent.id, prompt, params);
    if (prompt.trim()) {
      setPrompt("");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-border/40 border-b px-8 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" aria-hidden />
          All agents
        </Button>
        <span className="h-4 w-px bg-border/60" aria-hidden />
        <span className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Bot className="size-4" aria-hidden />
        </span>
        <div className="leading-tight">
          <span className="block font-medium text-foreground text-sm">{agent.name}</span>
          {(params.model ?? agent.model) && (
            <span className="block font-mono text-muted-foreground text-xs">
              {params.model ?? agent.model}
            </span>
          )}
        </div>
        <div role="tablist" aria-label="Agent views" className="ml-6 flex items-center gap-1">
          {AGENT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={tab === "Chat"}
              disabled={tab !== "Chat"}
              title={tab === "Chat" ? undefined : "Lands in a later milestone"}
              className={
                tab === "Chat"
                  ? "rounded-full bg-card px-3 py-1 font-medium text-foreground text-xs"
                  : "rounded-full px-3 py-1 text-muted-foreground text-xs disabled:cursor-not-allowed disabled:opacity-60"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-border/40 border-r px-4 py-6 md:flex">
          {/* M7 T3.2: painel de params REAL — flui para ds.runAgent via send() */}
          <div
            className="mb-4 rounded-xl border border-border/40 bg-card/60 p-4"
            data-testid="chat-params-panel"
          >
            <p className="font-medium text-foreground text-sm">Parameters</p>
            <p className="mt-3 text-muted-foreground text-xs">Model</p>
            <Combobox
              aria-label="Model"
              value={params.model ?? ""}
              onValueChange={(model) => setParams((prev) => ({ ...prev, model }))}
            >
              <Combobox.Input placeholder="Model" />
              <Combobox.Content>
                {[agent.model ?? "claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5"]
                  .filter((m, i, arr) => arr.indexOf(m) === i)
                  .map((m) => (
                    <Combobox.Item key={m} value={m}>
                      {m}
                    </Combobox.Item>
                  ))}
              </Combobox.Content>
            </Combobox>
            <p className="mt-3 flex justify-between text-muted-foreground text-xs">
              <span>Temperature</span>
              <span className="font-mono">{params.temperature?.toFixed(2)}</span>
            </p>
            <Slider
              aria-label="Temperature"
              min={0}
              max={1}
              step={0.01}
              value={[params.temperature ?? 0.7]}
              onValueChange={([temperature]) => setParams((prev) => ({ ...prev, temperature }))}
            />
            <p className="mt-3 flex justify-between text-muted-foreground text-xs">
              <span>Top-p</span>
              <span className="font-mono">{params.topP?.toFixed(2)}</span>
            </p>
            <Slider
              aria-label="Top-p"
              min={0}
              max={1}
              step={0.01}
              value={[params.topP ?? 1]}
              onValueChange={([topP]) => setParams((prev) => ({ ...prev, topP }))}
            />
          </div>
          <div
            className="rounded-xl border border-border/40 bg-card/60 p-4 text-center"
            data-testid="chat-memory-notice"
          >
            <p className="font-medium text-foreground text-sm">Memory not enabled</p>
            <p className="mt-1.5 text-muted-foreground text-xs">
              Conversations are saved as threads once the agent has memory attached — the
              theo-memory wiring lands with the real registry (M1).
            </p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto px-8 py-6" data-testid="chat-thread">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {state.parts.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-medium text-primary text-sm"
                  >
                    {agent.name.charAt(0)}
                  </span>
                  <p className="font-medium text-foreground text-sm">How can I help you today?</p>
                  <p className="text-muted-foreground text-xs">
                    The typed event stream shows up here and in the Event Inspector.
                  </p>
                </div>
              )}
              {state.parts.map((part) => (
                <PartView key={part.seq} part={part} />
              ))}
            </div>
          </div>
          <div className="border-border/40 border-t bg-background/80 px-8 py-4 backdrop-blur">
            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-black/20 shadow-lg transition-colors focus-within:border-primary/50">
                {agent.model && (
                  <span className="mb-1.5 ml-1 shrink-0 rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-muted-foreground text-xs">
                    {agent.model}
                  </span>
                )}
                <Textarea
                  aria-label="Prompt"
                  className="min-h-[44px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  rows={1}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your message…"
                />
                <Button type="submit" size="sm" className="gap-1.5">
                  Send
                  <SendHorizonal className="size-4" aria-hidden />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlaygroundPage() {
  // Review F-arch-3: boilerplate de carga migrado para o useListing compartilhado.
  const { items: agents, loadError } = useListing((ds) => ds.listAgents());
  const [agent, setAgent] = useState<AgentSummary | null>(null);

  return (
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      {agent === null ? (
        <AgentsTable agents={agents} onPick={setAgent} />
      ) : (
        <ChatView agent={agent} onBack={() => setAgent(null)} />
      )}
    </section>
  );
}
