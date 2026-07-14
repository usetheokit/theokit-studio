import { Badge, EmptyState, Input } from "@usetheo/ui";
import { useEffect, useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
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

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    ds.getMemories()
      .then((list) => {
        if (!ignore) {
          setMemories(list);
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

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {loadError}
      </p>
    );
  }

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
            <li
              key={m.id}
              data-testid="memory-row"
              className="rounded-xl border border-border/40 bg-card/60 p-4 transition-colors hover:border-border"
            >
              <div className="flex items-center gap-2">
                <Badge>{m.scope}</Badge>
                <span className="font-mono text-muted-foreground text-xs">{m.createdAt}</span>
              </div>
              <p className="mt-2">{m.content}</p>
              <div className="mt-2 flex gap-2 text-muted-foreground text-xs">
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

const surface = getSurface("/memory");

export function MemoryPage() {
  return (
    <section>
      <PageHeader icon={surface.icon} title="Memory" description={surface.description} />
      <div className="px-8 py-6">
        <ServiceGate service="memory">
          <MemoryList />
        </ServiceGate>
      </div>
    </section>
  );
}
