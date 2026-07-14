import { Button, EmptyState } from "@usetheo/ui";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { metrics } from "../../data/metrics";

const surface = getSurface("/observability/metrics");

interface MetricRow {
  metric: string;
  label: string;
  value: number;
}

function snapshotRows(): MetricRow[] {
  return Object.entries(metrics.snapshot()).flatMap(([metric, labels]) =>
    Object.entries(labels).map(([label, value]) => ({ metric, label, value })),
  );
}

// Métricas REAIS do dev loop (ADR D5 — registry in-memory, o mesmo exposto em
// window.__STUDIO_METRICS__). Nada simulado: a tabela mostra o que esta sessão contou.
export function MetricsPage() {
  const [rows, setRows] = useState<MetricRow[]>(snapshotRows);

  return (
    <section>
      <PageHeader
        icon={surface.icon}
        title={surface.label}
        description={surface.description}
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setRows(snapshotRows())}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
      />
      <div className="px-8 py-6">
        {rows.length === 0 ? (
          <div className="mx-auto max-w-2xl py-10">
            <EmptyState
              title="No metrics recorded yet"
              description="Run an agent or browse the data tabs — every datasource call and stream event is counted here."
              data-testid="metrics-empty"
            />
          </div>
        ) : (
          <div className="max-w-3xl overflow-hidden rounded-xl border border-border/40">
            <div className="grid grid-cols-[1fr_1fr_100px] gap-4 border-border/40 border-b bg-card/80 px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              <span>Metric</span>
              <span>Label</span>
              <span className="text-right">Value</span>
            </div>
            <ul>
              {rows.map((row) => (
                <li
                  key={`${row.metric}:${row.label}`}
                  data-testid="metric-row"
                  className="grid grid-cols-[1fr_1fr_100px] items-center gap-4 border-border/30 border-b px-4 py-2.5 last:border-b-0"
                >
                  <span className="truncate font-mono text-foreground text-sm">{row.metric}</span>
                  <span className="truncate font-mono text-muted-foreground text-sm">
                    {row.label}
                  </span>
                  <span className="text-right font-mono text-foreground text-sm">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 max-w-prose text-muted-foreground text-xs">
          In-memory dev metrics from this session (also available as{" "}
          <code className="font-mono">window.__STUDIO_METRICS__</code>). Durable metrics ship with
          the theo-lens integration (roadmap M2).
        </p>
      </div>
    </section>
  );
}
