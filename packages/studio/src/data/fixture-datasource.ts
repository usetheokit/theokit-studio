import type { StudioDataSource } from "./datasource";
import {
  BUILDER_SCRIPTED_FILES,
  BUILDER_SCRIPTED_REPLY,
  BUILDER_SCRIPTED_WORK_LOG,
  fixtureAgents,
  fixtureBuilderSessionDetails,
  fixtureBuilderSessions,
  fixtureSkills,
} from "./fixtures/registry";
import { metrics } from "./metrics";
import {
  type AgentSummary,
  BlankBuildPromptError,
  type BuilderSessionDetail,
  type FixtureScenario,
  type SkillSummary,
  UnknownBuilderSessionError,
} from "./types";

export interface FixtureDataSourceOptions {
  scenario: FixtureScenario;
}

export function createFixtureDataSource(options: FixtureDataSourceOptions): StudioDataSource {
  const { scenario } = options;
  const isEmpty = scenario === "empty";

  // Unique ids for ephemeral build sessions (the review's F-dom-2).
  let draftSessionCounter = 0;

  const counted = <T>(method: string, value: T): Promise<T> => {
    metrics.increment("datasource_calls_total", method);
    return Promise.resolve(structuredClone(value) as T);
  };

  return {
    listAgents: (): Promise<AgentSummary[]> =>
      counted("listAgents", isEmpty ? [] : [...fixtureAgents]),
    listSkills: (): Promise<SkillSummary[]> =>
      counted("listSkills", isEmpty ? [] : [...fixtureSkills]),
    listBuilderSessions: () =>
      counted("listBuilderSessions", isEmpty ? [] : [...fixtureBuilderSessions]),

    startBuilderSession: (
      prompt: string,
      targetAgentId?: string,
    ): Promise<BuilderSessionDetail> => {
      metrics.increment("datasource_calls_total", "startBuilderSession");
      // Boundary validation (error-handling.md § 2): an empty prompt rejects with a typed error.
      const text = prompt.trim();
      if (text.length === 0) {
        return Promise.reject(new BlankBuildPromptError());
      }
      draftSessionCounter += 1;
      return Promise.resolve({
        id: `draft-session-${draftSessionCounter}`,
        title: text.length > 48 ? `${text.slice(0, 48)}…` : text,
        agentId: targetAgentId,
        lastActivity: "now",
        pinned: false,
        workedFor: BUILDER_SCRIPTED_WORK_LOG.workedFor,
        workLog: [...BUILDER_SCRIPTED_WORK_LOG.steps],
        messages: [{ role: "user", text }, { ...BUILDER_SCRIPTED_REPLY }],
        files: structuredClone([...BUILDER_SCRIPTED_FILES]),
      });
    },

    getBuilderSession: (sessionId: string): Promise<BuilderSessionDetail> => {
      metrics.increment("datasource_calls_total", "getBuilderSession");
      const detail = fixtureBuilderSessionDetails[sessionId];
      if (!detail || isEmpty) {
        return Promise.reject(new UnknownBuilderSessionError(sessionId));
      }
      return Promise.resolve(structuredClone(detail));
    },
  };
}
