import { agent } from "@theokit/agents/bridge";

// Arquivo PLANO chamado "tools" é agent válido — a exclusão de composição olha só
// diretórios intermediários (contrato do agent-scan do theokit).
export default agent().model("anthropic/claude-haiku-4-5").system("Flat-file agent.").build();
