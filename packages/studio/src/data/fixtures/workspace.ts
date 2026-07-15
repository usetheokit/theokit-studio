import type { WorkspaceSummary } from "../types";

export const fixtureWorkspaces: readonly WorkspaceSummary[] = Object.freeze([
  {
    id: "demo-workspace",
    name: "Demo Workspace",
    files: [
      { path: "data", kind: "dir" },
      {
        path: "data/orders.csv",
        kind: "file",
        content: "order_id,status,total_usd\nORD-1001,shipped,129.90\nORD-1002,processing,54.00\n",
      },
      { path: "notes", kind: "dir" },
      {
        path: "notes/todo.md",
        kind: "file",
        content:
          "# TODO\n\n- Review the refund policy above $500\n- Expand the knowledge base with billing FAQs\n",
      },
      {
        path: "README.md",
        kind: "file",
        content:
          "# Demo Workspace\n\nDemonstration workspace for TheoKit Studio.\n\n- `notes/` — operating notes\n- `data/` — reference data used by the agents\n",
      },
    ],
  },
]);
