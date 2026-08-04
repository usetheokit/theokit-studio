// Entidades da superfície do Studio — o Agent Builder (fixtures; a reflection do dev
// server troca o adapter). Camada 100% react-free (architecture.md § 2).

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  model?: string;
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

export interface BuilderArtifactFile {
  /** caminho do arquivo alterado (ex.: "agents/support-agent.ts"). */
  path: string;
  additions: number;
  deletions: number;
  /** diff unificado exibido no painel de review (+/- coloridos). */
  diff: string;
}

export interface BuilderSessionDetail extends BuilderSessionSummary {
  messages: BuilderMessage[];
  /** duração exibida no log de trabalho (fixture display-ready, ex.: "2m 30s"). */
  workedFor: string;
  /** passos do log de trabalho (expansível na thread). */
  workLog: string[];
  /** arquivos editados pela sessão (painel Review à direita). */
  files: BuilderArtifactFile[];
}

export type FixtureScenario = "default" | "empty" | "offline";

// Erros tipados da fronteira de dados (error-handling.md § 2 — fail-fast, contexto na mensagem).

export class BlankBuildPromptError extends Error {
  constructor() {
    super("Build prompt must not be blank — describe what to build");
    this.name = "BlankBuildPromptError";
  }
}

export class UnknownBuilderSessionError extends Error {
  constructor(sessionId: string) {
    super(`Builder session '${sessionId}' does not exist`);
    this.name = "UnknownBuilderSessionError";
  }
}
