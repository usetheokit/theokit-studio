import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { ServiceGate } from "../../app/service-state";

const surface = getSurface("/traces");

// Traces é PLACEHOLDER ONLY no M5 (decisão travada no grill; CLAUDE.md invariante 5:
// theo-lens é dono da visualização de traces — o M2 embeda lens-web pelo proxy).
// NUNCA renderizar árvore de trace mockada aqui.
export function TracesPage() {
  return (
    <section>
      <PageHeader icon={surface.icon} title="Traces" description={surface.description} />
      <div className="px-8 py-6">
        <p className="max-w-prose text-muted-foreground text-sm">
          A visualização de traces pertence ao{" "}
          <strong className="text-foreground">theo-lens</strong> — o Studio embeda a UI do lens
          nesta tab quando o data stack está de pé (roadmap M2). Nada é reconstruído aqui por
          design.
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
