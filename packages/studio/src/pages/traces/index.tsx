import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { ServiceGate } from "../../app/service-state";

const surface = getSurface("/observability/traces");

// Traces é PLACEHOLDER ONLY no M5 (decisão travada no grill; CLAUDE.md invariante 5:
// theo-lens é dono da visualização de traces — o M2 embeda lens-web pelo proxy).
// NUNCA renderizar árvore de trace mockada aqui.
export function TracesPage() {
  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      <div className="px-8 py-6">
        <p className="max-w-prose text-muted-foreground text-sm">
          Trace visualization belongs to <strong className="text-foreground">theo-lens</strong> —
          Studio embeds the lens UI in this tab once the data stack is up (roadmap M2). Nothing is
          rebuilt here by design.
        </p>
        <div className="mx-auto mt-8 max-w-2xl">
          <ServiceGate service="lens">
            <p data-testid="lens-embed-slot">lens-web embed (M2)</p>
          </ServiceGate>
        </div>
      </div>
    </section>
  );
}
