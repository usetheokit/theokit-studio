import { Button, DropdownMenu } from "@usetheo/ui";
import { ChevronDown, Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// Model picker do composer — nome amigável + esforço num só controle refinado.
// ---------------------------------------------------------------------------

const MODEL_OPTIONS = [
  { id: "claude-fable-5", name: "Fable 5", blurb: "Deepest reasoning for complex builds" },
  { id: "claude-opus-4-8", name: "Opus 4.8", blurb: "Strong all-round builder" },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6", blurb: "Fast and balanced" },
  { id: "claude-haiku-4-5", name: "Haiku 4.5", blurb: "Snappy for quick edits" },
] as const;

const EFFORT_OPTIONS = ["Low", "Medium", "High"] as const;

export function ModelPicker({
  model,
  effort,
  onModelChange,
  onEffortChange,
}: {
  model: string;
  effort: string;
  onModelChange: (id: string) => void;
  onEffortChange: (effort: string) => void;
}) {
  const active = MODEL_OPTIONS.find((m) => m.id === model) ?? MODEL_OPTIONS[0];
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        aria-label={`Model picker — ${active.name}, ${effort} effort`}
        className="group flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-1 text-xs transition-colors hover:border-primary/40"
      >
        <span className="flex size-4 items-center justify-center rounded bg-primary/15 text-primary">
          <Sparkles className="size-3" aria-hidden />
        </span>
        <span className="font-medium text-foreground">{active.name}</span>
        <span className="text-muted-foreground/60" aria-hidden>
          ·
        </span>
        <span className="text-muted-foreground">{effort}</span>
        <ChevronDown
          className="size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" sideOffset={6} className="w-72">
        <DropdownMenu.Label className="text-muted-foreground text-xs uppercase tracking-wide">
          Model
        </DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={model} onValueChange={onModelChange}>
          {MODEL_OPTIONS.map((option) => (
            <DropdownMenu.RadioItem key={option.id} value={option.id} className="items-start py-2">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium text-foreground text-sm leading-none">
                  {option.name}
                </span>
                <span className="text-muted-foreground text-xs">{option.blurb}</span>
                <span className="font-mono text-[10px] text-muted-foreground/60">{option.id}</span>
              </span>
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
        <DropdownMenu.Separator />
        <DropdownMenu.Label className="text-muted-foreground text-xs uppercase tracking-wide">
          Reasoning effort
        </DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={effort} onValueChange={onEffortChange}>
          {EFFORT_OPTIONS.map((option) => (
            <DropdownMenu.RadioItem key={option} value={option}>
              {option}
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
