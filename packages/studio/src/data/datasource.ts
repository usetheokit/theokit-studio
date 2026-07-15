import { createContext, useContext } from "react";
import type {
  AgentSummary,
  BuilderSessionDetail,
  BuilderSessionSummary,
  DatasetSummary,
  ExperimentSummary,
  KnowledgeCollection,
  KnowledgeDocument,
  McpServerSummary,
  MemoryRecord,
  MemoryScope,
  ProcessorSummary,
  PromptSummary,
  RetrievalResult,
  ScorerSummary,
  ServiceHealthMap,
  SkillSummary,
  StudioRunEvent,
  ToolSummary,
  WorkflowSummary,
  WorkspaceSummary,
} from "./types";
// Contrato único de dados das 5 superfícies (ADR D2 — DIP: o domínio da UI define a
// interface; adapters implementam. M5: FixtureDataSource; M1+: adapters reais).
// Vocabulário validado pelo contrato do Genkit Dev UI (Blueprint §"T4").
export interface StudioDataSource {
  listAgents(): Promise<AgentSummary[]>;
  listTools(): Promise<ToolSummary[]>;
  listSkills(): Promise<SkillSummary[]>;
  listPrompts(): Promise<PromptSummary[]>;
  listBuilderSessions(): Promise<BuilderSessionSummary[]>;
  /** transcript + artefato de uma sessão; rejeita erro tipado se não existir. */
  getBuilderSession(sessionId: string): Promise<BuilderSessionDetail>;
  listWorkflows(): Promise<WorkflowSummary[]>;
  listProcessors(): Promise<ProcessorSummary[]>;
  listMcpServers(): Promise<McpServerSummary[]>;
  listScorers(): Promise<ScorerSummary[]>;
  listDatasets(): Promise<DatasetSummary[]>;
  listExperiments(): Promise<ExperimentSummary[]>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  /** conteúdo de um arquivo do workspace; rejeita erro tipado se não existir. */
  readWorkspaceFile(workspaceId: string, path: string): Promise<string>;
  /** cria pasta na sessão; rejeita erro tipado em nome vazio/duplicado. */
  createWorkspaceFolder(workspaceId: string, path: string): Promise<void>;
  runAgent(
    agentId: string,
    prompt: string,
    signal?: AbortSignal,
  ): AsyncIterable<StudioRunEvent["event"]>;
  getMemories(scope?: MemoryScope): Promise<MemoryRecord[]>;
  listCollections(): Promise<KnowledgeCollection[]>;
  listDocuments(collectionId: string): Promise<KnowledgeDocument[]>;
  query(collectionId: string, text: string): Promise<RetrievalResult[]>;
  health(): Promise<ServiceHealthMap>;
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
