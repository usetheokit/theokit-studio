import { Badge, Button } from "@usetheo/ui";
import { ArrowLeft, Check, Play, Workflow, X } from "lucide-react";
import { useState } from "react";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import type { WorkflowStep, WorkflowSummary } from "../../data/types";

const surface = getSurface("/workflows");

function StepNode({ step }: { step: WorkflowStep }) {
  return (
    <div className="w-72 rounded-xl border border-border/50 bg-card px-4 py-3">
      <p className="font-medium text-foreground text-sm">{step.name}</p>
      <p className="mt-1 text-muted-foreground text-xs">{step.description}</p>
    </div>
  );
}

function TerminalNode({ label }: { label: string }) {
  return (
    <div className="flex size-14 items-center justify-center rounded-full border border-border/50 bg-card text-foreground text-xs">
      {label}
    </div>
  );
}

function Connector() {
  return <div className="h-10 w-px border-border/70 border-l border-dashed" aria-hidden />;
}

// Detail do workflow (padrão Mastra): painel de run à esquerda + grafo vertical
// Start → steps → End. Fixtures-only: o Run é desabilitado com nota honesta — nada
// de execução simulada de workflow fingindo ser real.
function WorkflowDetail({ workflow, onBack }: { workflow: WorkflowSummary; onBack: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 gap-6 px-8 py-6">
      <div className="flex w-80 shrink-0 flex-col gap-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium text-foreground text-sm">
              <Workflow className="size-4 text-primary" aria-hidden />
              {workflow.name}
            </span>
            <Badge variant="outline">{workflow.steps.length} steps</Badge>
          </div>
          <div className="mt-4">
            <label
              className="block text-muted-foreground text-xs uppercase tracking-wide"
              htmlFor="workflow-run-input"
            >
              {workflow.inputLabel}
            </label>
            <input
              id="workflow-run-input"
              className="mt-1.5 h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
              placeholder={workflow.inputLabel}
            />
          </div>
          <Button className="mt-3 w-full gap-1.5" disabled title="Runs land with the real registry">
            <Play className="size-4" aria-hidden />
            Run
          </Button>
          <p className="mt-2 text-muted-foreground text-xs">
            Workflow runs are disabled in fixtures mode — they land when Studio attaches to a real
            registry.
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <p className="font-medium text-foreground text-sm">Recent runs</p>
          <ul className="mt-2 space-y-1.5">
            {workflow.recentRuns.map((run) => (
              <li
                key={run.id}
                data-testid="workflow-run"
                className="flex items-center gap-2 text-sm"
              >
                {run.status === "success" ? (
                  <Check className="size-3.5 text-emerald-400" aria-hidden />
                ) : (
                  <X className="size-3.5 text-red-400" aria-hidden />
                )}
                <span className="sr-only">{run.status}</span>
                <span className="truncate font-mono text-muted-foreground text-xs">{run.id}</span>
                <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                  {new Date(run.finishedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit gap-1.5">
          <ArrowLeft className="size-4" aria-hidden />
          All workflows
        </Button>
      </div>
      <div
        className="flex flex-1 flex-col items-center overflow-auto rounded-xl border border-border/40 py-8 [background-image:radial-gradient(oklch(0.35_0.02_296/0.5)_1px,transparent_1px)] [background-size:20px_20px]"
        data-testid="workflow-graph"
      >
        <TerminalNode label="Start" />
        {workflow.steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center">
            <Connector />
            <StepNode step={step} />
          </div>
        ))}
        <Connector />
        <TerminalNode label="End" />
      </div>
    </div>
  );
}

export function WorkflowsPage() {
  const { items: workflows, loadError } = useListing((ds) => ds.listWorkflows());
  const [selected, setSelected] = useState<WorkflowSummary | null>(null);

  return (
    <section className="flex h-full flex-col">
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      {selected === null ? (
        <EntityTable
          items={workflows}
          gridClassName="grid-cols-[220px_1fr_140px]"
          filterPlaceholder="Filter by name or description…"
          filterLabel="Filter workflows"
          matches={(w, term) =>
            w.name.toLowerCase().includes(term) || w.description.toLowerCase().includes(term)
          }
          rowKey={(w) => w.id}
          rowTestId="workflow-row"
          onRowClick={setSelected}
          emptyText="No workflows match your filter."
          noItemsText="No workflows registered yet."
          columns={[
            {
              header: "Name",
              render: (w) => <span className="font-medium text-foreground text-sm">{w.name}</span>,
            },
            {
              header: "Description",
              render: (w) => (
                <span className="block truncate text-muted-foreground text-sm">
                  {w.description}
                </span>
              ),
            },
            {
              header: "Number of steps",
              render: (w) => (
                <span className="text-muted-foreground text-sm">{w.steps.length}</span>
              ),
            },
          ]}
        />
      ) : (
        <WorkflowDetail workflow={selected} onBack={() => setSelected(null)} />
      )}
    </section>
  );
}
