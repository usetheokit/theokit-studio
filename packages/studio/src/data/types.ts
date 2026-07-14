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
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  steps: number;
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
    super("Retrieval query must not be blank — informe um texto de busca");
    this.name = "EmptyQueryError";
  }
}

export class UnknownCollectionError extends Error {
  constructor(collectionId: string) {
    super(`Knowledge collection '${collectionId}' não existe`);
    this.name = "UnknownCollectionError";
  }
}
