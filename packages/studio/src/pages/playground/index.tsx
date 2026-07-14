import { ChatMessageContent, ChatMessageRoot, ToolCallCard } from "@theokit/ui";
import { Badge, Button, EmptyState, Textarea } from "@usetheo/ui";
import { type FormEvent, useEffect, useState } from "react";
import { useDataSource } from "../../data/datasource";
import type { AgentSummary } from "../../data/types";
import type { ChatPart } from "./event-to-part";
import { useRunPlayback } from "./use-run-playback";

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
        <div role="status" className="my-2">
          <Badge variant={part.notice === "rate-limit" ? "warning" : "destructive"}>
            {part.notice}
          </Badge>
          <span className="ml-2 text-sm opacity-80">{part.detail}</span>
        </div>
      );
    case "unknown":
      return (
        <div role="note" className="my-2 text-sm opacity-60">
          evento desconhecido: {part.type}
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

  useEffect(() => {
    let ignore = false;
    ds.listAgents().then((list) => {
      if (!ignore) {
        setAgents(list);
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

  return (
    <section className="flex h-full flex-col p-6">
      <h1 className="text-xl font-semibold">Playground</h1>
      <div className="mt-4 flex-1 space-y-3 overflow-auto" data-testid="chat-thread">
        {state.parts.length === 0 && (
          <EmptyState
            title="Run an agent"
            description="Escolha um agente e envie um prompt — o stream de eventos tipados aparece aqui e no Event Inspector."
          />
        )}
        {state.parts.map((part) => (
          <PartView key={part.seq} part={part} />
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Agent
          <select
            aria-label="Agent"
            className="rounded border border-white/20 bg-transparent p-2"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">— selecione —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <Textarea
          aria-label="Prompt"
          className="flex-1"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Pergunte algo ao agente…"
        />
        <Button type="submit" disabled={agentId.length === 0 || state.isRunning}>
          Send
        </Button>
      </form>
    </section>
  );
}
