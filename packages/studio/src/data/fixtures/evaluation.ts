import type { DatasetSummary, ExperimentSummary, ScorerSummary } from "../types";

export const fixtureScorers: readonly ScorerSummary[] = Object.freeze([
  {
    id: "relevancy",
    name: "Relevancy Scorer",
    description: "Scores how relevant the agent answer is to the user question",
    source: "code",
    agents: 1,
  },
  {
    id: "toxicity",
    name: "Toxicity Scorer",
    description: "Flags unsafe or toxic content in agent outputs",
    source: "code",
    agents: 2,
  },
]);

export const fixtureDatasets: readonly DatasetSummary[] = Object.freeze([
  {
    id: "support-questions",
    name: "support-questions",
    description: "Support questions used to evaluate the Support Agent",
    version: "v1",
    target: "Support Agent",
    updatedAt: "2026-07-14T17:39:00Z",
    experiments: 2,
    successRate: 1,
  },
]);

export const fixtureExperiments: readonly ExperimentSummary[] = Object.freeze([
  {
    id: "2c78e0cf",
    dataset: "support-questions",
    target: "agent support-agent",
    status: "completed",
    items: 5,
    succeeded: 5,
    failed: 0,
    finishedAt: "2026-07-14T18:10:00Z",
  },
  {
    id: "e3b51f02",
    dataset: "support-questions",
    target: "agent support-agent",
    status: "completed",
    items: 5,
    succeeded: 5,
    failed: 0,
    finishedAt: "2026-07-14T17:53:00Z",
  },
]);
