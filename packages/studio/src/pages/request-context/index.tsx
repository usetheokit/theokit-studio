import { Button } from "@usetheo/ui";
import { Save } from "lucide-react";
import { useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";

const surface = getSurface("/request-context");

// Store em memória da sessão (fixtures) — o valor salvo sobrevive à navegação entre
// superfícies, mas não a um reload. NADA consome este valor no M5 (fixtures não usam
// request context); o copy da página diz isso honestamente. O consumo real chega
// quando o Studio conectar num registry (review F-arch-1/F-wire-1: export morto
// removido em vez de fingir aplicação).
let savedRequestContext = "{}";

export function RequestContextPage() {
  const [draft, setDraft] = useState(savedRequestContext);
  const [parseError, setParseError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleSave = () => {
    // Validação na fronteira (error-handling.md § 2): JSON inválido nunca é salvo.
    try {
      JSON.parse(draft);
    } catch (error) {
      setParseError(
        `Request context must be valid JSON — ${error instanceof Error ? error.message : String(error)}`,
      );
      setSavedAt(null);
      return;
    }
    savedRequestContext = draft;
    setParseError(null);
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <section>
      <PageHeader icon={surface.icon} title={surface.label} description={surface.description} />
      <div className="mx-auto max-w-3xl px-8 py-6">
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <p className="font-medium text-foreground text-sm uppercase tracking-wide">
            Request Context
          </p>
          <p className="mt-2 text-muted-foreground text-sm">
            Request context is a set of runtime variables injected into every agent run — configure
            agents and tools once and vary their behavior per request instead of duplicating
            near-identical agents.
          </p>
        </div>
        <div className="mt-6">
          <label className="text-muted-foreground text-sm" htmlFor="request-context-editor">
            Request Context (JSON)
          </label>
          <textarea
            id="request-context-editor"
            aria-label="Request Context JSON"
            className="mt-2 min-h-64 w-full rounded-xl border border-border/60 bg-card p-4 font-mono text-foreground text-sm outline-none focus:border-primary/50"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        </div>
        {parseError && (
          <p role="alert" className="mt-2 text-red-400 text-sm">
            {parseError}
          </p>
        )}
        {savedAt && !parseError && (
          <p role="status" className="mt-2 text-emerald-400 text-sm">
            Saved at {savedAt} for this session — runs consume it once Studio attaches to a real
            registry.
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} className="gap-1.5">
            <Save className="size-4" aria-hidden />
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
