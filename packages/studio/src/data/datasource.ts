import { createContext, useContext } from "react";
import type {
  AgentSummary,
  DatasetSummary,
  ExperimentSummary,
  KnowledgeCollection,
  KnowledgeDocument,
  McpServerSummary,
  MemoryRecord,
  MemoryScope,
  ProcessorSummary,
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
  listWorkflows(): Promise<WorkflowSummary[]>;
  listProcessors(): Promise<ProcessorSummary[]>;
  listMcpServers(): Promise<McpServerSummary[]>;
  listScorers(): Promise<ScorerSummary[]>;
  listDatasets(): Promise<DatasetSummary[]>;
  listExperiments(): Promise<ExperimentSummary[]>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
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
      "useDataSource: nenhum StudioDataSource injetado — envolva a árvore em <DataSourceProvider value={...}> no composition root",
    );
  }
  return ds;
}
