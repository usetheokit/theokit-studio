// Entidades das 5 superfícies do Studio (M5 — fixtures; M1+ troca o adapter).
// Camada 100% react-free (regra do plano T1.1; architecture.md § 2).

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  model?: string;
}

export interface ToolSummary {
  id: string;
  name: string;
  description: string;
  /** quantos agentes registrados usam esta tool (0 quando nenhum). */
  usedBy?: number;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
}

export interface BuilderSessionSummary {
  id: string;
  title: string;
  /** agente alvo da sessão (quando já existe). */
  agentId?: string;
  /** atividade relativa exibida na lista (fixture display-ready, ex.: "2m"). */
  lastActivity: string;
  pinned: boolean;
}

export interface BuilderMessage {
  role: "user" | "assistant";
  text: string;
}

export interface BuilderArtifact {
  /** arquivo alvo do artefato (ex.: "agents/support-agent.ts"). */
  name: string;
  /** diff unificado exibido no viewer (+/- coloridos). */
  diff: string;
}

export interface BuilderSessionDetail extends BuilderSessionSummary {
  messages: BuilderMessage[];
  artifact?: BuilderArtifact;
}

export interface PromptSummary {
  id: string;
  name: string;
  description: string;
  /** versão publicada do bloco (prompt-ops: overrides versionados sobre o baseline). */
  version: string;
  /** quantos agentes referenciam este bloco nas instructions. */
  usedBy: number;
  content: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
}

export interface WorkflowRunSummary {
  id: string;
  status: "success" | "failed";
  finishedAt: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  /** rótulo do input esperado pelo primeiro step (painel de run do detail). */
  inputLabel: string;
  recentRuns: WorkflowRunSummary[];
}

export interface ProcessorSummary {
  id: string;
  name: string;
  description?: string;
  /** hooks do pipeline que o processor implementa (matriz de capacidades). */
  hooks: {
    input: boolean;
    step: boolean;
    stream: boolean;
    result: boolean;
  };
  usedBy: number;
}

export interface McpToolInputField {
  name: string;
  label: string;
  required: boolean;
}

export interface McpExposedTool {
  name: string;
  description: string;
  /** origem do item exposto: tool direta, wrapper de agente ou de workflow. */
  kind: "tool" | "agent" | "workflow";
  /** campos do input schema (form "Input Data" no detail da tool). */
  inputFields: McpToolInputField[];
}

export interface McpServerSummary {
  id: string;
  name: string;
  version: string;
  /** endpoint SSE (real-time) — o exibido na lista. */
  url: string;
  /** endpoint HTTP stateless (streamable responses). */
  httpUrl: string;
  agents: number;
  tools: number;
  workflows: number;
  availableTools: McpExposedTool[];
}

export interface ScorerSummary {
  id: string;
  name: string;
  description: string;
  source: "code" | "studio";
  agents: number;
}

export interface DatasetSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  target: string;
  updatedAt: string;
  experiments: number;
  /** taxa de sucesso agregada dos experiments (0..1). */
  successRate: number;
}

export interface ExperimentSummary {
  id: string;
  dataset: string;
  target: string;
  status: "completed" | "running" | "failed";
  items: number;
  succeeded: number;
  failed: number;
  finishedAt: string;
}

export interface WorkspaceFileEntry {
  /** caminho completo relativo à raiz do workspace (ex.: "data/orders.csv"). */
  path: string;
  kind: "dir" | "file";
  /** conteúdo do arquivo (apenas kind === "file"); tamanho deriva daqui. */
  content?: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  files: WorkspaceFileEntry[];
}

export type MemoryScope = "user" | "session" | "agent";

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  content: string;
  createdAt: string;
  entities: string[];
}

export interface KnowledgeCollection {
  id: string;
  name: string;
  documentCount: number;
  strategy: string;
}

export interface KnowledgeChunk {
  id: string;
  text: string;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  chunks: KnowledgeChunk[];
}

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  score: number;
  excerpt: string;
  strategy: string;
}

export type ServiceName = "memory" | "lens" | "rag";

export interface ServiceHealth {
  status: "online" | "offline";
  hint?: string;
}

export type ServiceHealthMap = Record<ServiceName, ServiceHealth>;

export type FixtureScenario = "default" | "empty" | "offline";

// Eventos do run (fonte: tipos publicados do @theokit/sdk — ver fixtures/run-script.ts,
// ÚNICO módulo que importa o SDK; aqui só o envelope, para o contrato do domínio não
// depender do adapter — F-arch-2/3 do review).
import type { InteractionUpdate, RunEvent } from "@theokit/sdk";

export interface StudioRunEvent {
  /** offset em ms sugerido para playback (player usa o delta entre eventos) */
  at: number;
  event: InteractionUpdate | RunEvent;
}

export type StudioEvent = StudioRunEvent["event"];

// Erros tipados da fronteira de dados (error-handling.md § 2 — fail-fast, contexto na mensagem).

export class EmptyQueryError extends Error {
  constructor() {
    super("Retrieval query must not be blank — type something to search");
    this.name = "EmptyQueryError";
  }
}

export class UnknownCollectionError extends Error {
  constructor(collectionId: string) {
    super(`Knowledge collection '${collectionId}' does not exist`);
    this.name = "UnknownCollectionError";
  }
}

export class UnknownWorkspaceError extends Error {
  constructor(workspaceId: string) {
    super(`Workspace '${workspaceId}' does not exist`);
    this.name = "UnknownWorkspaceError";
  }
}

export class UnknownWorkspacePathError extends Error {
  constructor(path: string) {
    super(`Workspace path '${path}' does not exist or is not a file`);
    this.name = "UnknownWorkspacePathError";
  }
}

export class DuplicateWorkspacePathError extends Error {
  constructor(path: string) {
    super(`Workspace path '${path}' already exists`);
    this.name = "DuplicateWorkspacePathError";
  }
}

export class UnknownBuilderSessionError extends Error {
  constructor(sessionId: string) {
    super(`Builder session '${sessionId}' does not exist`);
    this.name = "UnknownBuilderSessionError";
  }
}

export class BlankFolderNameError extends Error {
  constructor() {
    super("Folder name must not be blank");
    this.name = "BlankFolderNameError";
  }
}
