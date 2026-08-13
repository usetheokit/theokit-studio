import { AgentBuilder } from "@theokit/agents/bridge";
import { lookupOrder } from "./tools/shared";

export default AgentBuilder.create()
  .model("anthropic/claude-sonnet-4-6")
  .system("You are the demo support agent. Be concise.")
  .tool(lookupOrder)
  .build();
