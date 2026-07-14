import type { StudioDataSource } from "./datasource";
import {
  fixtureCollections,
  fixtureDocuments,
  fixtureRetrievalResults,
} from "./fixtures/knowledge";
import { fixtureMemories } from "./fixtures/memory";
import { fixtureAgents, fixtureSkills, fixtureTools, fixtureWorkflows } from "./fixtures/registry";
import { metrics } from "./metrics";
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
  type ToolSummary,
  UnknownCollectionError,
  type WorkflowSummary,
} from "./types";

export interface FixtureDataSourceOptions {
  scenario: FixtureScenario;
  /** Seam para testes (T2.2): sobrescrever comportamentos pontuais sem monkey-patch. */
  overrides?: Partial<Pick<StudioDataSource, "health">>;
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
  const { scenario, overrides } = options;
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
    listWorkflows: (): Promise<WorkflowSummary[]> =>
      counted("listWorkflows", isEmpty ? [] : [...fixtureWorkflows]),

    getMemories: (scope?: MemoryScope): Promise<MemoryRecord[]> =>
      counted(
        "getMemories",
        isEmpty ? [] : fixtureMemories.filter((m) => (scope ? m.scope === scope : true)),
      ),

    listCollections: (): Promise<KnowledgeCollection[]> =>
      counted("listCollections", isEmpty ? [] : [...fixtureCollections]),

    listDocuments: (collectionId: string): Promise<KnowledgeDocument[]> => {
      const docs = fixtureDocuments[collectionId];
      if (!isEmpty && docs === undefined) {
        metrics.increment("datasource_calls_total", "listDocuments");
        return Promise.reject(new UnknownCollectionError(collectionId));
      }
      return counted("listDocuments", isEmpty ? [] : [...(docs ?? [])]);
    },

    query: (collectionId: string, text: string): Promise<RetrievalResult[]> => {
      // Validação na fronteira (error-handling.md § 2): rejeita ANTES de "consultar".
      if (text.trim().length === 0) {
        return Promise.reject(new EmptyQueryError());
      }
      if (!isEmpty && fixtureDocuments[collectionId] === undefined) {
        return Promise.reject(new UnknownCollectionError(collectionId));
      }
      const sorted = [...fixtureRetrievalResults].sort((a, b) => b.score - a.score);
      return counted("query", isEmpty ? [] : sorted);
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
