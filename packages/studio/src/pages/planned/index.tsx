import { Badge } from "@usetheo/ui";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";

// Placeholder HONESTO para superfícies planejadas da IA Mastra-parity (dogfood
// 2026-07-14). Nada de dados mockados fingindo funcionalidade: a página declara
// que a surface chega em um milestone futuro. Mesmo padrão da Traces tab.
export function PlannedSurfacePage({ path }: { path: string }) {
  const surface = getSurface(path);
  return (
    <section>
      <PageHeader
        icon={surface.icon}
        title={surface.label}
        description={surface.description}
        actions={<Badge variant="outline">Planned</Badge>}
      />
      <div className="px-8 py-6">
        <p className="max-w-prose text-muted-foreground text-sm" data-testid="planned-surface">
          This surface is part of the Studio information architecture but is not implemented in the
          M5 fixtures-only phase. It lands in a later milestone — nothing is simulated here by
          design.
        </p>
      </div>
    </section>
  );
}
