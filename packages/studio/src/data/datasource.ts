import { createContext, useContext } from "react";
import type {
  AgentSummary,
  BuilderSessionDetail,
  BuilderSessionSummary,
  SkillSummary,
} from "./types";
// Contrato único de dados da superfície do Studio — o Agent Builder (ADR D2 — DIP: o
// domínio da UI define a interface; adapters implementam). Fixtures hoje; a reflection
// do dev server serve agents/skills quando o host injeta mode: "live".
export interface StudioDataSource {
  listAgents(): Promise<AgentSummary[]>;
  listSkills(): Promise<SkillSummary[]>;
  listBuilderSessions(): Promise<BuilderSessionSummary[]>;
  /** transcript + artefato de uma sessão; rejeita erro tipado se não existir. */
  getBuilderSession(sessionId: string): Promise<BuilderSessionDetail>;
  /** inicia sessão de build roteirizada (fixtures); rejeita prompt em branco. */
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
