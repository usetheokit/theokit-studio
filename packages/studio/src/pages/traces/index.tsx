import { ServiceGate } from "../../app/service-state";

// Traces é PLACEHOLDER ONLY no M5 (decisão travada no grill; CLAUDE.md invariante 5:
// theo-lens é dono da visualização de traces — o M2 embeda lens-web pelo proxy).
// NUNCA renderizar árvore de trace mockada aqui.
export function TracesPage() {
  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">Traces</h1>
      <p className="mt-2 max-w-prose opacity-80">
        A visualização de traces pertence ao <strong>theo-lens</strong> — o Studio embeda a UI do
        lens nesta tab quando o data stack está de pé (roadmap M2). Nada é reconstruído aqui por
        design.
      </p>
      <div className="mt-6">
        <ServiceGate service="lens">
          <p data-testid="lens-embed-slot">lens-web embed (M2)</p>
        </ServiceGate>
      </div>
    </section>
  );
}
