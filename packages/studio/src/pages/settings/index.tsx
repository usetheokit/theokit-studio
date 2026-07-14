import { Badge } from "@usetheo/ui";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";

const surface = getSurface("/settings");

// Portas default do stack (contrato do CLAUDE.md § Locked names) — exibição read-only;
// edição chega quando o Studio roda dentro do theokit dev (config seam real).
const CONNECTION_ROWS = [
  { label: "Data source", value: "Fixtures (M5 · simulated data)" },
  { label: "theo-memory", value: "http://localhost:8080" },
  { label: "theo-lens (OTLP)", value: "http://localhost:4318" },
  { label: "theo-rag", value: "http://localhost:8787" },
  { label: "Postgres", value: "localhost:5432 (themem · theolens · therag)" },
];

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60">
      <div className="border-border/40 border-b px-5 py-4">
        <p className="font-display font-semibold text-foreground text-lg">{title}</p>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">
        <SettingsCard title="Theme" description="Appearance of the Studio.">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground text-sm">Theme mode</span>
            <Badge variant="outline">Dark</Badge>
          </div>
        </SettingsCard>
        <SettingsCard
          title="Stack connection"
          description="Service endpoints Studio talks to through the theokit dev proxy. Read-only in fixtures mode — editing lands with the real config seam."
        >
          <ul className="space-y-2.5">
            {CONNECTION_ROWS.map((row) => (
              <li
                key={row.label}
                data-testid="settings-row"
                className="flex items-center justify-between gap-4"
              >
                <span className="text-muted-foreground text-sm">{row.label}</span>
                <span className="truncate font-mono text-foreground text-sm">{row.value}</span>
              </li>
            ))}
          </ul>
        </SettingsCard>
      </div>
    </section>
  );
}
