import { Badge, EmptyState, Input } from "@usetheo/ui";
import { useEffect, useState } from "react";
import { ServiceGate } from "../../app/service-state";
import { useDataSource } from "../../data/datasource";
import type { MemoryRecord, MemoryScope } from "../../data/types";

// Busca client-side pura.
function filterMemories(
  memories: readonly MemoryRecord[],
  scope: "all" | MemoryScope,
  search: string,
): MemoryRecord[] {
  const term = search.trim().toLowerCase();
  return memories.filter(
    (m) =>
      (scope === "all" || m.scope === scope) &&
      (term.length === 0 ||
        m.content.toLowerCase().includes(term) ||
        m.entities.some((e) => e.toLowerCase().includes(term))),
  );
}

function MemoryList() {
  const ds = useDataSource();
  const [memories, setMemories] = useState<MemoryRecord[] | null>(null);
  const [scope, setScope] = useState<"all" | MemoryScope>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    ds.getMemories().then((list) => {
      if (!ignore) {
        setMemories(list);
      }
    });
    return () => {
      ignore = true;
    };
  }, [ds]);

  if (memories === null) {
    return <p className="opacity-70">Loading…</p>;
  }
  if (memories.length === 0) {
    return (
      <EmptyState
        title="No memories yet"
        description="Ligue a memória ao agente com o binding @usetheo/memory/theokit e converse no Playground."
      />
    );
  }

  const visible = filterMemories(memories, scope, search);
  return (
    <>
      <div className="mt-4 flex items-end gap-3">
        <Input
          type="search"
          aria-label="Search"
          placeholder="Buscar por conteúdo ou entidade…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex flex-col gap-1 text-sm">
          Scope
          <select
            aria-label="Scope"
            className="rounded border border-white/20 bg-transparent p-1"
            value={scope}
            onChange={(e) => setScope(e.target.value as "all" | MemoryScope)}
          >
            <option value="all">all</option>
            <option value="user">user</option>
            <option value="session">session</option>
            <option value="agent">agent</option>
          </select>
        </label>
      </div>
      {visible.length === 0 ? (
        <p className="mt-6 opacity-70">No memories match your search.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {visible.map((m) => (
            <li key={m.id} data-testid="memory-row" className="rounded border border-white/10 p-3">
              <div className="flex items-center gap-2">
                <Badge>{m.scope}</Badge>
                <span className="text-xs opacity-60">{m.createdAt}</span>
              </div>
              <p className="mt-2">{m.content}</p>
              <div className="mt-2 flex gap-2 text-xs opacity-70">
                {m.entities.map((e) => (
                  <code key={e}>{e}</code>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function MemoryPage() {
  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">Memory</h1>
      <p className="mt-1 text-sm opacity-70">
        Memórias com escopo do theo-memory (fixtures no M5; REST real no M3).
      </p>
      <div className="mt-4">
        <ServiceGate service="memory">
          <MemoryList />
        </ServiceGate>
      </div>
    </section>
  );
}
