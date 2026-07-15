import type { StudioDataSource } from "./datasource";
import { fixtureDatasets, fixtureExperiments, fixtureScorers } from "./fixtures/evaluation";
import {
  fixtureCollections,
  fixtureDocuments,
  fixtureRetrievalResults,
} from "./fixtures/knowledge";
import { fixtureMemories } from "./fixtures/memory";
import {
  fixtureAgents,
  fixtureMcpServers,
  fixtureProcessors,
  fixturePrompts,
  fixtureSkills,
  fixtureTools,
  fixtureWorkflows,
} from "./fixtures/registry";
import { DEFAULT_RUN } from "./fixtures/run-script";
import { fixtureWorkspaces } from "./fixtures/workspace";
import { metrics } from "./metrics";
import { play } from "./stream-player";
import {
  type AgentSummary,
  EmptyQueryError,
  type FixtureScenario,
  type KnowledgeCollection,
  type KnowledgeDocument,
  type MemoryRecord,
  type MemoryScope,
  type RetrievalResult,
  type ServiceHealthMap,
  type SkillSummary,
  type StudioRunEvent,
  type ToolSummary,
  UnknownCollectionError,
  type WorkflowSummary,
} from "./types";

export interface FixtureDataSourceOptions {
  scenario: FixtureScenario;
  /** Seam para testes (T2.2): sobrescrever comportamentos pontuais sem monkey-patch. */
  overrides?: Partial<Pick<StudioDataSource, "health">>;
  /** Delay entre eventos do stream (0 default — determinístico em teste; ~40ms em dev). */
  streamDelayMs?: number;
  /** Roteiro do run (default: DEFAULT_RUN). */
  runScript?: readonly StudioRunEvent[];
}

const HEALTH: Record<FixtureScenario, ServiceHealthMap> = {
  default: {
    memory: { status: "online" },
    rag: { status: "online" },
    // lens offline por design no M5: a tab Traces é placeholder até o M2 embedar lens-web.
    lens: { status: "offline", hint: "theokit studio up" },
  },
  empty: {
    memory: { status: "online" },
    rag: { status: "online" },
    lens: { status: "offline", hint: "theokit studio up" },
  },
  offline: {
    memory: { status: "offline", hint: "theokit studio up" },
    rag: { status: "offline", hint: "theokit studio up" },
    lens: { status: "offline", hint: "theokit studio up" },
  },
};

export function createFixtureDataSource(options: FixtureDataSourceOptions): StudioDataSource {
  const { scenario, overrides, streamDelayMs = 0, runScript = DEFAULT_RUN } = options;
  const isEmpty = scenario === "empty";

  const counted = <T>(method: string, value: T): Promise<T> => {
    metrics.increment("datasource_calls_total", method);
    return Promise.resolve(structuredClone(value) as T);
  };

  return {
    listAgents: (): Promise<AgentSummary[]> =>
      counted("listAgents", isEmpty ? [] : [...fixtureAgents]),
    listTools: (): Promise<ToolSummary[]> => counted("listTools", isEmpty ? [] : [...fixtureTools]),
    listSkills: (): Promise<SkillSummary[]> =>
      counted("listSkills", isEmpty ? [] : [...fixtureSkills]),
    listPrompts: () => counted("listPrompts", isEmpty ? [] : [...fixturePrompts]),
    listWorkflows: (): Promise<WorkflowSummary[]> =>
      counted("listWorkflows", isEmpty ? [] : [...fixtureWorkflows]),
    listProcessors: () => counted("listProcessors", isEmpty ? [] : [...fixtureProcessors]),
    listMcpServers: () => counted("listMcpServers", isEmpty ? [] : [...fixtureMcpServers]),
    listScorers: () => counted("listScorers", isEmpty ? [] : [...fixtureScorers]),
    listDatasets: () => counted("listDatasets", isEmpty ? [] : [...fixtureDatasets]),
    listExperiments: () => counted("listExperiments", isEmpty ? [] : [...fixtureExperiments]),
    listWorkspaces: () => counted("listWorkspaces", isEmpty ? [] : [...fixtureWorkspaces]),

    async *runAgent(_agentId: string, _prompt: string, signal?: AbortSignal) {
      metrics.increment("datasource_calls_total", "runAgent");
      for await (const event of play(runScript, { delayMs: streamDelayMs, signal })) {
        metrics.increment("stream_events_played_total");
        yield event;
      }
    },

    getMemories: (scope?: MemoryScope): Promise<MemoryRecord[]> =>
      counted(
        "getMemories",
        isEmpty ? [] : fixtureMemories.filter((m) => (scope ? m.scope === scope : true)),
      ),

    listCollections: (): Promise<KnowledgeCollection[]> =>
      counted("listCollections", isEmpty ? [] : [...fixtureCollections]),

    // Convenção de métrica (review F-dom-3): datasource_calls_total conta CHAMADAS
    // (inclusive rejeitadas), não sucessos — consistente entre métodos.
    listDocuments: (collectionId: string): Promise<KnowledgeDocument[]> => {
      metrics.increment("datasource_calls_total", "listDocuments");
      // Collection inexistente rejeita em QUALQUER cenário (review F-dom-2: empty não
      // pode mascarar o erro tipado com []).
      const docs = fixtureDocuments[collectionId];
      if (docs === undefined) {
        return Promise.reject(new UnknownCollectionError(collectionId));
      }
      return Promise.resolve(isEmpty ? [] : structuredClone([...docs]));
    },

    query: (collectionId: string, text: string): Promise<RetrievalResult[]> => {
      metrics.increment("datasource_calls_total", "query");
      // Validação na fronteira (error-handling.md § 2): rejeita ANTES de "consultar".
      if (text.trim().length === 0) {
        return Promise.reject(new EmptyQueryError());
      }
      if (fixtureDocuments[collectionId] === undefined) {
        return Promise.reject(new UnknownCollectionError(collectionId));
      }
      const sorted = [...fixtureRetrievalResults].sort((a, b) => b.score - a.score);
      return Promise.resolve(isEmpty ? [] : structuredClone(sorted));
    },

    health: (): Promise<ServiceHealthMap> => {
      if (overrides?.health) {
        metrics.increment("datasource_calls_total", "health");
        return overrides.health();
      }
      return counted("health", HEALTH[scenario]);
    },
  };
}
