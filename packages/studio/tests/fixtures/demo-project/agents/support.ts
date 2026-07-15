import { agent } from "@theokit/agents/bridge";
import type { CustomTool } from "@theokit/sdk";

// Tool com shape CustomTool literal (JSON-schema inline — fixture zod-free).
const lookupOrder: CustomTool = {
  name: "lookupOrder",
  description: "Look up an order by id in the demo store",
  inputSchema: {
    type: "object",
    properties: { orderId: { type: "string" } },
    required: ["orderId"],
  },
  handler: async () => "order #42: shipped",
};

export default agent()
  .model("anthropic/claude-sonnet-4-6")
  .system("You are the demo support agent. Be concise.")
  .tool(lookupOrder)
  .build();
