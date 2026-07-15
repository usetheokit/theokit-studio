import { Badge, Button, Select, Textarea } from "@usetheo/ui";
import { ArrowLeft, Check, Cpu, Minus, Play } from "lucide-react";
import { useState } from "react";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import type { ProcessorSummary } from "../../data/types";

const surface = getSurface("/processors");

function HookMark({ on }: { on: boolean }) {
  return on ? (
    <Check className="size-4 text-emerald-400" aria-label="yes" />
  ) : (
    <Minus className="size-4 text-muted-foreground/50" aria-label="no" />
  );
}

type HookName = keyof ProcessorSummary["hooks"];

const HOOK_DESCRIPTIONS: Record<HookName, string> = {
  input: "Input — process input messages before the model (once at start)",
  step: "Step — process each intermediate step of the run",
  stream: "Stream — process streamed chunks as they are produced",
  result: "Result — process the final result before it returns",
};

function implementedHooks(p: ProcessorSummary): HookName[] {
  return (Object.keys(p.hooks) as HookName[]).filter((h) => p.hooks[h]);
}

// Detail do processor (padrão Mastra): painel com identidade + fases implementadas +
// test message + Run Processor, e painel de output à direita. Fixtures-only: o Run é
// desabilitado com nota honesta — nenhuma execução simulada de processor.
function ProcessorDetail({
  processor,
  onBack,
}: {
  processor: ProcessorSummary;
  onBack: () => void;
}) {
  const hooks = implementedHooks(processor);
  const [phase, setPhase] = useState<HookName>(hooks[0] ?? "input");
  const [testMessage, setTestMessage] = useState("Hello, this is a test message.");

  return (
    <div className="flex min-h-0 flex-1 gap-6 px-8 py-6">
      <div className="flex w-80 shrink-0 flex-col gap-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <span className="flex items-center gap-2 font-medium text-foreground text-sm">
            <Cpu className="size-4 text-primary" aria-hidden />
            {processor.name}
          </span>
          <p className="mt-1 font-mono text-muted-foreground text-xs">{processor.id}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hooks.map((h) => (
              <Badge key={h} variant="outline">
                {h}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-muted-foreground text-xs">
            Attached to {processor.usedBy} agent{processor.usedBy === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <label
            className="block text-muted-foreground text-xs uppercase tracking-wide"
            htmlFor="processor-phase"
          >
            Phase
          </label>
          <div className="mt-1.5">
            <Select value={phase} onValueChange={(v) => setPhase(v as HookName)}>
              <Select.Trigger id="processor-phase" aria-label="Phase" size="sm" className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {hooks.map((h) => (
                  <Select.Item key={h} value={h}>
                    {h}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <p className="mt-2 text-muted-foreground text-xs">{HOOK_DESCRIPTIONS[phase]}</p>
          <label
            className="mt-4 block text-muted-foreground text-xs uppercase tracking-wide"
            htmlFor="processor-test-message"
          >
            Test Message
          </label>
          <Textarea
            id="processor-test-message"
            className="mt-1.5 min-h-24"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
          />
          <Button
            className="mt-3 w-full gap-1.5"
            disabled
            title="Processor runs land with the real registry"
          >
            <Play className="size-4" aria-hidden />
            Run Processor
          </Button>
          <p className="mt-2 text-muted-foreground text-xs">
            Processor runs are disabled in fixtures mode — they land when Studio attaches to a real
            registry.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit gap-1.5">
          <ArrowLeft className="size-4" aria-hidden />
          All processors
        </Button>
      </div>
      <div
        className="flex-1 overflow-auto rounded-xl border border-border/40 bg-card/40 p-4"
        data-testid="processor-output"
      >
        <p className="text-muted-foreground text-xs uppercase tracking-wide">Output</p>
        <pre className="mt-2 font-mono text-muted-foreground text-sm">{"{}"}</pre>
      </div>
    </div>
  );
}

// Matriz de capacidades dos processors (hooks do pipeline que cada um implementa).
export function ProcessorsPage() {
  const { items: processors, loadError } = useListing((ds) => ds.listProcessors());
  const [selected, setSelected] = useState<ProcessorSummary | null>(null);

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
          items={processors}
          gridClassName="grid-cols-[220px_1fr_repeat(4,70px)_80px]"
          filterPlaceholder="Filter by name…"
          filterLabel="Filter processors"
          matches={(p, term) => p.name.toLowerCase().includes(term)}
          rowKey={(p) => p.id}
          rowTestId="processor-row"
          onRowClick={setSelected}
          emptyText="No processors match your filter."
          noItemsText="No processors registered yet."
          columns={[
            {
              header: "Name",
              render: (p) => <span className="font-medium text-foreground text-sm">{p.name}</span>,
            },
            {
              header: "Description",
              render: (p) => (
                <span className="block truncate text-muted-foreground text-sm">
                  {p.description ?? "—"}
                </span>
              ),
            },
            { header: "Input", render: (p) => <HookMark on={p.hooks.input} /> },
            { header: "Step", render: (p) => <HookMark on={p.hooks.step} /> },
            { header: "Stream", render: (p) => <HookMark on={p.hooks.stream} /> },
            { header: "Result", render: (p) => <HookMark on={p.hooks.result} /> },
            {
              header: "Used by",
              render: (p) => <span className="text-muted-foreground text-sm">{p.usedBy}</span>,
            },
          ]}
        />
      ) : (
        <ProcessorDetail processor={selected} onBack={() => setSelected(null)} />
      )}
    </section>
  );
}
