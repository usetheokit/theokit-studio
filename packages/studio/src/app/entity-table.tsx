import { Search } from "lucide-react";
import { type ReactNode, useState } from "react";

export interface EntityColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
}

// Tabela padrão das superfícies de registry (padrão de lista do Mastra Studio):
// filtro no topo + header em grid + linhas clicáveis ou estáticas. Genérica por
// colunas para as telas Workflows/Processors/MCP/Tools/Scorers/Datasets/Experiments.
export function EntityTable<T>({
  items,
  columns,
  gridClassName,
  filterPlaceholder,
  filterLabel,
  matches,
  rowKey,
  rowTestId = "entity-row",
  onRowClick,
  emptyText,
}: {
  items: readonly T[];
  columns: EntityColumn<T>[];
  /** classe grid compartilhada entre header e linhas, ex: "grid-cols-[220px_1fr_120px]". */
  gridClassName: string;
  filterPlaceholder: string;
  filterLabel: string;
  matches: (item: T, term: string) => boolean;
  rowKey: (item: T) => string;
  rowTestId?: string;
  onRowClick?: (item: T) => void;
  emptyText: string;
}) {
  const [filter, setFilter] = useState("");
  const term = filter.trim().toLowerCase();
  const visible = term.length === 0 ? [...items] : items.filter((i) => matches(i, term));

  const rowClass = `grid w-full ${gridClassName} items-center gap-4 px-4 py-3 text-left`;

  return (
    <div className="px-8 py-6">
      <div className="relative max-w-md">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          aria-label={filterLabel}
          className="h-9 w-full rounded-lg border border-border/60 bg-card pr-3 pl-9 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          placeholder={filterPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border/40">
        <div
          className={`grid ${gridClassName} gap-4 border-border/40 border-b bg-card/80 px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide`}
        >
          {columns.map((c) => (
            <span key={c.header}>{c.header}</span>
          ))}
        </div>
        <ul>
          {visible.map((item) => (
            <li key={rowKey(item)} className="border-border/30 border-b last:border-b-0">
              {onRowClick ? (
                <button
                  type="button"
                  data-testid={rowTestId}
                  className={`${rowClass} transition-colors hover:bg-card`}
                  onClick={() => onRowClick(item)}
                >
                  {columns.map((c) => (
                    <span key={c.header} className="min-w-0">
                      {c.render(item)}
                    </span>
                  ))}
                </button>
              ) : (
                <div data-testid={rowTestId} className={rowClass}>
                  {columns.map((c) => (
                    <span key={c.header} className="min-w-0">
                      {c.render(item)}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-4 py-8 text-center text-muted-foreground text-sm">{emptyText}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
