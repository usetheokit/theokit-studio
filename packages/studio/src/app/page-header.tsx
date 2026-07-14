import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Padrão de cabeçalho das superfícies (Mastra-class): ícone em tile violet + título +
// descrição + slot de ações à direita.
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-border/40 border-b px-8 py-6">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_24px_-6px] shadow-primary/40">
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="font-display font-semibold text-foreground text-xl tracking-tight">
            {title}
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
