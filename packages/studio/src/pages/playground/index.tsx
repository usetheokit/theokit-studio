import { ChatMessageContent, ChatMessageRoot, ToolCallCard } from "@theokit/ui";
import { Badge, Button, Select, Textarea } from "@usetheo/ui";
import { Bot, SendHorizonal, Sparkles } from "lucide-react";
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

export function PlaygroundPage() {
  const ds = useDataSource();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [agentId, setAgentId] = useState("");
  const [prompt, setPrompt] = useState("");
  const { state, send } = useRunPlayback();

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(agentId, prompt);
    if (agentId && prompt.trim()) {
      setPrompt("");
    }
  };

  const selectedAgent = agents.find((a) => a.id === agentId);

  return (
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title="Playground" description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <div className="flex-1 overflow-auto px-8 py-6" data-testid="chat-thread">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {state.parts.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/40 border-dashed bg-card/40 px-8 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="size-6" aria-hidden />
              </div>
              <h2 className="font-display font-semibold text-foreground text-lg">Run an agent</h2>
              <p className="max-w-md text-muted-foreground text-sm">
                Pick an agent and send a prompt — the typed event stream shows up here and in the
                Event Inspector.
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
          <div className="rounded-2xl border border-border/60 bg-card shadow-lg shadow-black/20 transition-colors focus-within:border-primary/50">
            <Textarea
              aria-label="Prompt"
              className="min-h-[68px] resize-none border-0 bg-transparent px-4 pt-3 shadow-none focus-visible:ring-0"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask the agent anything…"
            />
            <div className="flex items-center justify-between gap-3 px-3 pb-3">
              <div className="flex items-center gap-2">
                <Select value={agentId} onValueChange={setAgentId}>
                  <Select.Trigger aria-label="Agent" size="sm" className="min-w-44 gap-2">
                    <Bot className="size-4 shrink-0 text-primary" aria-hidden />
                    <Select.Value placeholder="Select an agent" />
                  </Select.Trigger>
                  <Select.Content>
                    {agents.map((a) => (
                      <Select.Item key={a.id} value={a.id}>
                        {a.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                {selectedAgent?.model && (
                  <span className="hidden font-mono text-muted-foreground text-xs sm:inline">
                    {selectedAgent.model}
                  </span>
                )}
              </div>
              <Button type="submit" disabled={agentId.length === 0} className="gap-1.5">
                Send
                <SendHorizonal className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
