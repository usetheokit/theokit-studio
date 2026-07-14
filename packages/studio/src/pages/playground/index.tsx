import { ChatMessageContent, ChatMessageRoot, ToolCallCard } from "@theokit/ui";
import { Badge, Button, Input, Textarea } from "@usetheo/ui";
import { ArrowLeft, Bot, Search, SendHorizonal } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useDataSource } from "../../data/datasource";
import type { AgentSummary } from "../../data/types";
import type { ChatPart } from "./event-to-part";
import { useRunPlayback } from "./use-run-playback";

const surface = getSurface("/playground");

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
function AgentsTable({
  agents,
  onPick,
}: {
  agents: AgentSummary[];
  onPick: (a: AgentSummary) => void;
}) {
  const [filter, setFilter] = useState("");
  const term = filter.trim().toLowerCase();
  const visible = agents.filter(
    (a) =>
      term.length === 0 ||
      a.name.toLowerCase().includes(term) ||
      a.description.toLowerCase().includes(term),
  );
  return (
    <div className="px-8 py-6">
      <div className="relative max-w-md">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Filter agents"
          className="pl-9"
          placeholder="Filter by name or description…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border/40">
        <div className="grid grid-cols-[200px_1fr_180px] gap-4 border-border/40 border-b bg-card/80 px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
          <span>Name</span>
          <span>Description</span>
          <span>Model</span>
        </div>
        <ul>
          {visible.map((a) => (
            <li key={a.id} className="border-border/30 border-b last:border-b-0">
              <button
                type="button"
                data-testid="agent-row"
                className="grid w-full grid-cols-[200px_1fr_180px] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-card"
                onClick={() => onPick(a)}
              >
                <span className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <span className="flex size-6 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                    <Bot className="size-3.5" aria-hidden />
                  </span>
                  {a.name}
                </span>
                <span className="truncate text-muted-foreground text-sm">{a.description}</span>
                <span className="truncate font-mono text-muted-foreground text-xs">
                  {a.model ?? "—"}
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-4 py-8 text-center text-muted-foreground text-sm">
              No agents match your filter.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function ChatView({ agent, onBack }: { agent: AgentSummary; onBack: () => void }) {
  const [prompt, setPrompt] = useState("");
  const { state, send } = useRunPlayback();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(agent.id, prompt);
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
          {agent.model && (
            <span className="block font-mono text-muted-foreground text-xs">{agent.model}</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-8 py-6" data-testid="chat-thread">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {state.parts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                Send a prompt to <span className="text-foreground">{agent.name}</span> — the typed
                event stream shows up here and in the Event Inspector.
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
            <Textarea
              aria-label="Prompt"
              className="min-h-[44px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask the agent anything…"
            />
            <Button type="submit" size="sm" className="gap-1.5">
              Send
              <SendHorizonal className="size-4" aria-hidden />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PlaygroundPage() {
  const ds = useDataSource();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    ds.listAgents()
      .then((list) => {
        if (!ignore) {
          setAgents(list);
        }
      })
      .catch((error: unknown) => {
        // Fronteira de página (F-dom-2): erro tipado vira estado visível, nunca unhandled.
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      ignore = true;
    };
  }, [ds]);

  return (
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title="Playground" description={surface.description} />
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
