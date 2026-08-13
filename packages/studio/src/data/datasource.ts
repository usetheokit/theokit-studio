import { createContext, useContext } from "react";
import type {
  AgentSummary,
  BuilderSessionDetail,
  BuilderSessionSummary,
  SkillSummary,
} from "./types";
// The single data contract of the Studio's surface — the Agent Builder (ADR D2 — DIP: the
// UI's domain defines the interface; adapters implement it). Fixtures today; the dev server's
// reflection serves agents/skills when the host injects mode: "live".
export interface StudioDataSource {
  listAgents(): Promise<AgentSummary[]>;
  listSkills(): Promise<SkillSummary[]>;
  listBuilderSessions(): Promise<BuilderSessionSummary[]>;
  /** a session's transcript + artifact; rejects with a typed error when it does not exist. */
  getBuilderSession(sessionId: string): Promise<BuilderSessionDetail>;
  /** starts a scripted build session (fixtures); rejects a blank prompt. */
  startBuilderSession(prompt: string, targetAgentId?: string): Promise<BuilderSessionDetail>;
}

const DataSourceContext = createContext<StudioDataSource | null>(null);

export const DataSourceProvider = DataSourceContext.Provider;

export function useDataSource(): StudioDataSource {
  const ds = useContext(DataSourceContext);
  if (!ds) {
    throw new Error(
      "useDataSource: no StudioDataSource injected — wrap the tree in <DataSourceProvider value={...}> at the composition root",
    );
  }
  return ds;
}
