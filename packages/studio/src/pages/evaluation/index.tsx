import { Badge } from "@usetheo/ui";
import { Database, FlaskConical, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import { useDataSource } from "../../data/datasource";

const overviewSurface = getSurface("/evaluation");
const scorersSurface = getSurface("/evaluation/scorers");
const datasetsSurface = getSurface("/evaluation/datasets");
const experimentsSurface = getSurface("/evaluation/experiments");

const dateFmt: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

// ---------------------------------------------------------------------------
// Overview — visão agregada com atalhos para Scorers/Datasets/Experiments.
// ---------------------------------------------------------------------------

export function EvaluationOverviewPage() {
  const ds = useDataSource();
  const [counts, setCounts] = useState<{ scorers: number; datasets: number; experiments: number }>({
    scorers: 0,
    datasets: 0,
    experiments: 0,
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([ds.listScorers(), ds.listDatasets(), ds.listExperiments()])
      .then(([scorers, datasets, experiments]) => {
        if (!ignore) {
          setCounts({
            scorers: scorers.length,
            datasets: datasets.length,
            experiments: experiments.length,
          });
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      ignore = true;
    };
  }, [ds]);

  const cards = [
    { label: "Scorers", count: counts.scorers, to: "/evaluation/scorers", icon: Gauge },
    { label: "Datasets", count: counts.datasets, to: "/evaluation/datasets", icon: Database },
    {
      label: "Experiments",
      count: counts.experiments,
      to: "/evaluation/experiments",
      icon: FlaskConical,
    },
  ];

  return (
    <section>
      <PageHeader
        icon={overviewSurface.icon}
        title={overviewSurface.label}
        description={overviewSurface.description}
      />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <div className="grid max-w-3xl grid-cols-3 gap-4 px-8 py-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              data-testid="evaluation-card"
              className="rounded-xl border border-border/40 bg-card/60 p-4 transition-colors hover:border-primary/40"
            >
              <span className="flex items-center gap-2 text-muted-foreground text-sm">
                <Icon className="size-4 text-primary" aria-hidden />
                {card.label}
              </span>
              <span className="mt-2 block font-display font-semibold text-2xl text-foreground">
                {card.count}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Scorers
// ---------------------------------------------------------------------------

export function ScorersPage() {
  const { items: scorers, loadError } = useListing((ds) => ds.listScorers());
  return (
    <section>
      <PageHeader
        icon={scorersSurface.icon}
        title={scorersSurface.label}
        description={scorersSurface.description}
      />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <EntityTable
        items={scorers}
        gridClassName="grid-cols-[220px_1fr_90px_90px]"
        filterPlaceholder="Filter by scorer name…"
        filterLabel="Filter scorers"
        matches={(s, term) => s.name.toLowerCase().includes(term)}
        rowKey={(s) => s.id}
        rowTestId="scorer-row"
        emptyText="No scorers match your filter."
        noItemsText="No scorers registered yet."
        columns={[
          {
            header: "Name",
            render: (s) => <span className="font-medium text-foreground text-sm">{s.name}</span>,
          },
          {
            header: "Description",
            render: (s) => (
              <span className="block truncate text-muted-foreground text-sm">{s.description}</span>
            ),
          },
          {
            header: "Source",
            render: (s) => <Badge variant="outline">{s.source.toUpperCase()}</Badge>,
          },
          {
            header: "Agents",
            render: (s) => <span className="text-muted-foreground text-sm">{s.agents}</span>,
          },
        ]}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

export function DatasetsPage() {
  const { items: datasets, loadError } = useListing((ds) => ds.listDatasets());
  return (
    <section>
      <PageHeader
        icon={datasetsSurface.icon}
        title={datasetsSurface.label}
        description={datasetsSurface.description}
      />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <EntityTable
        items={datasets}
        gridClassName="grid-cols-[200px_1fr_70px_140px_150px_120px]"
        filterPlaceholder="Filter by dataset name…"
        filterLabel="Filter datasets"
        matches={(d, term) => d.name.toLowerCase().includes(term)}
        rowKey={(d) => d.id}
        rowTestId="dataset-row"
        emptyText="No datasets match your filter."
        noItemsText="No datasets registered yet."
        columns={[
          {
            header: "Name",
            render: (d) => <span className="font-medium text-foreground text-sm">{d.name}</span>,
          },
          {
            header: "Description",
            render: (d) => (
              <span className="block truncate text-muted-foreground text-sm">{d.description}</span>
            ),
          },
          {
            header: "Version",
            render: (d) => <span className="text-muted-foreground text-sm">{d.version}</span>,
          },
          {
            header: "Target",
            render: (d) => <span className="text-muted-foreground text-sm">{d.target}</span>,
          },
          {
            header: "Last updated",
            render: (d) => (
              <span className="text-muted-foreground text-sm">
                {new Date(d.updatedAt).toLocaleString("en-US", dateFmt)}
              </span>
            ),
          },
          {
            header: "Experiments",
            render: (d) => (
              <Badge variant="success">
                {d.experiments} ({Math.round(d.successRate * 100)}%)
              </Badge>
            ),
          },
        ]}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

const STATUS_VARIANT = {
  completed: "success",
  running: "outline",
  failed: "destructive",
} as const;

export function ExperimentsPage() {
  const { items: experiments, loadError } = useListing((ds) => ds.listExperiments());
  return (
    <section>
      <PageHeader
        icon={experimentsSurface.icon}
        title={experimentsSurface.label}
        description={experimentsSurface.description}
      />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      <EntityTable
        items={experiments}
        gridClassName="grid-cols-[110px_1fr_170px_110px_60px_100px_60px_130px]"
        filterPlaceholder="Filter by experiment, dataset, or target…"
        filterLabel="Filter experiments"
        matches={(e, term) =>
          e.id.toLowerCase().includes(term) ||
          e.dataset.toLowerCase().includes(term) ||
          e.target.toLowerCase().includes(term)
        }
        rowKey={(e) => e.id}
        rowTestId="experiment-row"
        emptyText="No experiments match your filter."
        noItemsText="No experiments registered yet."
        columns={[
          {
            header: "Experiment",
            render: (e) => <span className="font-mono text-foreground text-sm">{e.id}</span>,
          },
          {
            header: "Dataset",
            render: (e) => (
              <span className="block truncate text-muted-foreground text-sm">{e.dataset}</span>
            ),
          },
          {
            header: "Target",
            render: (e) => (
              <span className="block truncate text-muted-foreground text-sm">{e.target}</span>
            ),
          },
          {
            header: "Status",
            render: (e) => <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>,
          },
          {
            header: "Items",
            render: (e) => <span className="text-muted-foreground text-sm">{e.items}</span>,
          },
          {
            header: "Succeeded",
            render: (e) => (
              <span className="text-emerald-400 text-sm">
                {e.succeeded} ({e.items === 0 ? 0 : Math.round((e.succeeded / e.items) * 100)}%)
              </span>
            ),
          },
          {
            header: "Failed",
            render: (e) => <span className="text-muted-foreground text-sm">{e.failed}</span>,
          },
          {
            header: "Date",
            render: (e) => (
              <span className="text-muted-foreground text-sm">
                {new Date(e.finishedAt).toLocaleString("en-US", dateFmt)}
              </span>
            ),
          },
        ]}
      />
    </section>
  );
}
