import { EmptyState } from "@usetheo/ui";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";

const surface = getSurface("/observability/logs");

// Empty state HONESTO (mesma postura da tela de logs do Mastra quando o storage não
// suporta): fixtures não produzem logs de runtime; a fonte real é o theokit dev (M2).
export function LogsPage() {
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      <div className="mx-auto max-w-2xl px-8 py-16">
        <EmptyState
          title="No logs in fixtures mode"
          description="Runtime logs stream from the theokit dev server once Studio is mounted inside it (roadmap M2). Nothing is simulated here by design."
          data-testid="logs-empty"
        />
      </div>
    </section>
  );
}
