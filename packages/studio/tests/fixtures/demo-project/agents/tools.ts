import { agent } from "@theokit/agents/bridge";

// A FLAT file named "tools" is a valid agent — the composition exclusion looks only at
// intermediate directories (theokit's agent-scan contract).
export default agent().model("anthropic/claude-haiku-4-5").system("Flat-file agent.").build();
