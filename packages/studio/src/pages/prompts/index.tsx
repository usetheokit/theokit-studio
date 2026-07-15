import { Badge, Button, Textarea } from "@usetheo/ui";
import { ArrowLeft, Check, MessageSquareText, Plus, X } from "lucide-react";
import { useState } from "react";
import { EntityTable } from "../../app/entity-table";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
import { useListing } from "../../app/use-listing";
import type { PromptSummary } from "../../data/types";

const surface = getSurface("/prompts");

// View de criação (padrão Mastra /cms/prompts/create): coluna Configuration (nome,
// descrição, variables com sintaxe {{variableName}}) + coluna Content (editor).
// Form 100% preenchível; fake door honesto SÓ na mutação final (Create prompt block).
function CreatePromptView({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [variableDraft, setVariableDraft] = useState("");
  const [variableError, setVariableError] = useState<string | null>(null);

  const addVariable = () => {
    // Validação na fronteira: nome vazio ou duplicado nunca entra na lista.
    const v = variableDraft.trim();
    if (v.length === 0) {
      setVariableError("Variable name must not be blank");
      return;
    }
    if (variables.includes(v)) {
      setVariableError(`Variable '${v}' is already defined`);
      return;
    }
    setVariables([...variables, v]);
    setVariableDraft("");
    setVariableError(null);
  };

  return (
    <div className="flex min-h-0 flex-1 gap-6 px-8 py-6" data-testid="prompt-create">
      <div className="flex w-96 shrink-0 flex-col gap-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <p className="font-display font-semibold text-foreground text-lg">Configuration</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Define your prompt block's name and description.
          </p>
          <label
            className="mt-4 block text-muted-foreground text-xs uppercase tracking-wide"
            htmlFor="prompt-name"
          >
            Name
            <span className="ml-0.5 text-red-400" aria-hidden>
              *
            </span>
          </label>
          <input
            id="prompt-name"
            className="mt-1.5 h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
            placeholder="my-prompt-block"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label
            className="mt-4 block text-muted-foreground text-xs uppercase tracking-wide"
            htmlFor="prompt-description"
          >
            Description
          </label>
          <Textarea
            id="prompt-description"
            className="mt-1.5 min-h-20"
            placeholder="Describe what this prompt block does"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <p className="font-display font-semibold text-foreground text-lg">Variables</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Define variables for this prompt block. Use{" "}
            <code className="font-mono text-emerald-400">{"{{variableName}}"}</code> syntax in your
            content.
          </p>
          {variables.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <li key={v}>
                  <span
                    data-testid="prompt-variable"
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-foreground text-xs"
                  >
                    {`{{${v}}}`}
                    <button
                      type="button"
                      aria-label={`Remove variable ${v}`}
                      onClick={() => setVariables(variables.filter((x) => x !== v))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2">
            <input
              aria-label="Variable name"
              className="h-8 flex-1 rounded-lg border border-border/60 bg-background px-3 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
              placeholder="variableName"
              value={variableDraft}
              onChange={(e) => setVariableDraft(e.target.value)}
            />
            <Button variant="secondary" size="sm" onClick={addVariable} className="gap-1">
              <Plus className="size-3.5" aria-hidden />
              Add variable
            </Button>
          </div>
          {variableError && (
            <p role="alert" className="mt-2 text-red-400 text-xs">
              {variableError}
            </p>
          )}
        </div>
        <Button
          className="w-full gap-1.5"
          disabled
          title="Prompt creation lands with the real registry"
        >
          <Check className="size-4" aria-hidden />
          Create prompt block
        </Button>
        <p className="text-muted-foreground text-xs">
          Creation is disabled in fixtures mode — it lands when Studio attaches to a real registry.
        </p>
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit gap-1.5">
          <ArrowLeft className="size-4" aria-hidden />
          All prompts
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border/40 bg-card/40 p-4">
        <p className="font-display font-semibold text-foreground text-lg">Content</p>
        <p className="mt-1 text-muted-foreground text-xs">
          Write the prompt block content. Use{" "}
          <code className="font-mono text-emerald-400">{"{{variableName}}"}</code> for template
          variables.
        </p>
        <Textarea
          aria-label="Prompt block content"
          className="mt-3 min-h-64 flex-1 resize-none font-mono"
          placeholder="Enter prompt block content…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
    </div>
  );
}

// Detail do prompt block (prompt-ops): identidade + conteúdo publicado read-only.
// Fixtures-only: criação/edição/versionamento são fake door honesto — chegam com o
// registry real (blueprint § 4.2: overrides versionados sobre o baseline do código).
function PromptDetail({ prompt, onBack }: { prompt: PromptSummary; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-6" data-testid="prompt-detail">
      <div className="rounded-xl border border-border/40 bg-card/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <MessageSquareText className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="font-medium font-mono text-foreground">{prompt.name}</span>
          </p>
          <Badge variant="outline">{prompt.version}</Badge>
        </div>
        <p className="mt-1.5 text-muted-foreground text-sm">{prompt.description}</p>
        <p className="mt-2 text-muted-foreground text-xs">
          Referenced by {prompt.usedBy} agent{prompt.usedBy === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-4 rounded-xl border border-border/40 bg-card/40 p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          Published content ({prompt.version})
        </p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-foreground text-sm">
          {prompt.content}
        </pre>
      </div>
      <p className="mt-3 text-muted-foreground text-xs">
        Editing and versioning land when Studio attaches to a real registry — the block is read-only
        in fixtures mode.
      </p>
      <Button variant="ghost" size="sm" onClick={onBack} className="mt-4 w-fit gap-1.5">
        <ArrowLeft className="size-4" aria-hidden />
        All prompts
      </Button>
    </div>
  );
}

export function PromptsPage() {
  const { items: prompts, loadError } = useListing((ds) => ds.listPrompts());
  const [selected, setSelected] = useState<PromptSummary | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section className="flex h-full flex-col">
      <PageHeader
        icon={surface.icon}
        title={surface.label}
        description={surface.description}
        actions={
          !creating && (
            <Button className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Create Prompt
            </Button>
          )
        }
      />
      {loadError && (
        <p role="alert" className="mx-8 mt-4 text-red-400 text-sm">
          {loadError}
        </p>
      )}
      {creating ? (
        <CreatePromptView
          onBack={() => {
            setCreating(false);
          }}
        />
      ) : selected === null ? (
        <EntityTable
          items={prompts}
          gridClassName="grid-cols-[220px_1fr_90px_90px]"
          filterPlaceholder="Filter by name or description…"
          filterLabel="Filter prompts"
          matches={(p, term) =>
            p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
          }
          rowKey={(p) => p.id}
          rowTestId="prompt-row"
          onRowClick={setSelected}
          emptyText="No prompts match your filter."
          noItemsText="No prompts yet — create a reusable prompt block and reference it in your agent instructions."
          columns={[
            {
              header: "Name",
              render: (p) => (
                <span className="font-medium font-mono text-foreground text-sm">{p.name}</span>
              ),
            },
            {
              header: "Description",
              render: (p) => (
                <span className="block truncate text-muted-foreground text-sm">
                  {p.description}
                </span>
              ),
            },
            {
              header: "Version",
              render: (p) => <Badge variant="outline">{p.version}</Badge>,
            },
            {
              header: "Used by",
              render: (p) => <span className="text-muted-foreground text-sm">{p.usedBy}</span>,
            },
          ]}
        />
      ) : (
        <PromptDetail prompt={selected} onBack={() => setSelected(null)} />
      )}
    </section>
  );
}
