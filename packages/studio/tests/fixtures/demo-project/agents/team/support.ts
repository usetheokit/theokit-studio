import { agent } from "@theokit/agents/bridge";
import { lookupOrder } from "../tools/shared";

// Agent aninhado — name preserva a barra: "team/support" (EC-2).
// Compartilha lookupOrder com support (dedup/usedBy=2 no aggregate, T1.3)
// e restringe skills (skillsEnabled por-agent).
export default agent()
  .model("anthropic/claude-haiku-4-5")
  .system("Team-scoped support agent (nested naming fixture).")
  .tool(lookupOrder)
  .skills(["demo-skill"])
  .build();
