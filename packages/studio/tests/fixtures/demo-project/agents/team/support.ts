import { agent } from "@theokit/agents/bridge";

// Agent aninhado — name preserva a barra: "team/support" (EC-2).
export default agent()
  .model("anthropic/claude-haiku-4-5")
  .system("Team-scoped support agent (nested naming fixture).")
  .build();
