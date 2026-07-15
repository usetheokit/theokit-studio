import type { WorkspaceSummary } from "../types";

export const fixtureWorkspaces: readonly WorkspaceSummary[] = Object.freeze([
  {
    id: "demo-workspace",
    name: "Demo Workspace",
    files: [
      { name: "data", kind: "dir" },
      { name: "notes", kind: "dir" },
      { name: "README.md", kind: "file", sizeBytes: 162 },
    ],
  },
]);
