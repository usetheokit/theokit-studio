import { Badge, EmptyState, Select } from "@usetheo/ui";
import { useState } from "react";
import { Link } from "react-router";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useRunLog } from "../../app/run-log";
import { categorize, type EventCategory, FILTERABLE_CATEGORIES } from "./categorize";

const surface = getSurface("/observability/events");

// Cor do badge por categoria (paleta consistente com os notices do Playground).
const CATEGORY_VARIANT: Record<
  EventCategory,
  "default" | "outline" | "destructive" | "warning" | "success"
> = {
  text: "default",
  tool: "success",
  permission: "destructive",
  "rate-limit": "warning",
  task: "outline",
  lifecycle: "outline",
};

// Event Inspector: timeline CRUA dos eventos tipados do último run (copy honesto:
// "last run" — o stream é abortado ao sair do playground; SEPA initial brief).
export function EventsPage() {
  const { events } = useRunLog();
  const [filter, setFilter] = useState<"all" | EventCategory>("all");

  const indexed = events.map((event, ordinal) => ({ event, ordinal }));
  const visible = indexed.filter(
    ({ event }) => filter === "all" || categorize(event.type) === filter,
  );
  const countBy = (cat: EventCategory) => events.filter((e) => categorize(e.type) === cat).length;

  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      <div className="px-8 py-6">
        {events.length === 0 ? (
          <div className="mx-auto max-w-2xl">
            <EmptyState
              title="No events yet"
              description={
                <>
                  Run an agent in <Link to="/agents">Agents</Link> to see the typed event stream
                  here.
                </>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              Category
              <Select value={filter} onValueChange={(v) => setFilter(v as "all" | EventCategory)}>
                <Select.Trigger aria-label="Category" size="sm" className="min-w-36">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">all ({events.length})</Select.Item>
                  {FILTERABLE_CATEGORIES.map((c) => (
                    <Select.Item key={c} value={c}>
                      {c} ({countBy(c)})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            {visible.length === 0 ? (
              <p className="mt-6 text-muted-foreground">No events match this category.</p>
            ) : (
              <ol className="mt-4 space-y-1.5">
                {visible.map(({ event, ordinal }) => (
                  <li
                    key={ordinal}
                    data-testid="event-row"
                    className="rounded-xl border border-border/40 bg-card/60 px-4 py-2.5 transition-colors hover:border-border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-right font-mono text-muted-foreground/60 text-xs">
                        {ordinal + 1}
                      </span>
                      <Badge
                        data-testid="event-category"
                        variant={CATEGORY_VARIANT[categorize(event.type)]}
                      >
                        {categorize(event.type)}
                      </Badge>
                      <code className="font-mono text-foreground text-sm">{event.type}</code>
                    </div>
                    <details className="mt-1.5 pl-11">
                      <summary className="cursor-pointer text-muted-foreground text-xs hover:text-foreground">
                        payload
                      </summary>
                      <pre className="mt-1.5 overflow-auto rounded-lg border border-border/40 bg-background/80 p-3 font-mono text-xs">
                        {JSON.stringify(event, null, 2)}
                      </pre>
                    </details>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </section>
  );
}
