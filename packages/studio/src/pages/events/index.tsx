import { Badge, EmptyState } from "@usetheo/ui";
import { useState } from "react";
import { Link } from "react-router";
import { useRunLog } from "../../app/run-log";
import { categorize, type EventCategory, FILTERABLE_CATEGORIES } from "./categorize";

// Event Inspector: timeline CRUA dos eventos tipados do último run (copy honesto:
// "last run" — o stream é abortado ao sair do playground; SEPA initial brief).
export function EventsPage() {
  const { events } = useRunLog();
  const [filter, setFilter] = useState<"all" | EventCategory>("all");

  const visible = events.filter((e) => filter === "all" || categorize(e.type) === filter);
  const countBy = (cat: EventCategory) => events.filter((e) => categorize(e.type) === cat).length;

  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">Events</h1>
      <p className="mt-1 text-sm opacity-70">
        Eventos tipados de <code>Run.stream()</code> do último run do Playground.
      </p>
      {events.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No events yet"
            description={
              <>
                Run an agent in the <Link to="/playground">Playground</Link> para ver o stream
                tipado aqui.
              </>
            }
          />
        </div>
      ) : (
        <>
          <label className="mt-4 flex items-center gap-2 text-sm">
            Category
            <select
              aria-label="Category"
              className="rounded border border-white/20 bg-transparent p-1"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | EventCategory)}
            >
              <option value="all">all ({events.length})</option>
              {FILTERABLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c} ({countBy(c)})
                </option>
              ))}
            </select>
          </label>
          {visible.length === 0 ? (
            <p className="mt-6 opacity-70">No events match this category.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {visible.map((event, i) => (
                <li
                  key={`${event.type}-${i}`}
                  data-testid="event-row"
                  className="rounded border border-white/10 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge data-testid="event-category">{categorize(event.type)}</Badge>
                    <code className="text-sm">{event.type}</code>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm opacity-70">payload</summary>
                    <pre className="mt-1 overflow-auto rounded bg-black/30 p-2 text-xs">
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
