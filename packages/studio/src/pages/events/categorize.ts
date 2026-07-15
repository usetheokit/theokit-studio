// Categoria derivada do type literal (pura — testável sem DOM).
export type EventCategory = "text" | "tool" | "permission" | "rate-limit" | "task" | "lifecycle";

export const FILTERABLE_CATEGORIES: readonly EventCategory[] = Object.freeze([
  "text",
  "tool",
  "permission",
  "rate-limit",
  "task",
  "lifecycle",
]);

export function categorize(type: string): EventCategory {
  if (type.startsWith("text")) {
    return "text";
  }
  if (type.startsWith("tool-call") || type === "partial-tool-call" || type === "tool_progress") {
    return "tool";
  }
  if (type === "permission_denied") {
    return "permission";
  }
  if (type === "rate_limit") {
    return "rate-limit";
  }
  if (type.startsWith("task_")) {
    return "task";
  }
  return "lifecycle";
}
