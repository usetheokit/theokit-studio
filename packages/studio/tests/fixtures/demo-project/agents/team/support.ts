import { AgentBuilder } from "@theokit/agents/bridge";
import { lookupOrder } from "../tools/shared";

// A nested agent — name keeps the slash: "team/support" (EC-2).
// Shares lookupOrder with support (dedup/usedBy=2 in the aggregate, T1.3) and restricts
// skills (per-agent skillsEnabled).
export default AgentBuilder.create()
  .model("anthropic/claude-haiku-4-5")
  .system("Team-scoped support agent (nested naming fixture).")
  .tool(lookupOrder)
  .skills(["demo-skill"])
  .build();
