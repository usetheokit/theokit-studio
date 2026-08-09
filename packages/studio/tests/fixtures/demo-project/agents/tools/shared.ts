import type { CustomTool } from "@theokit/sdk";

// A tool shared between agents — it lives under agents/tools/ (a composition subfolder: the
// scan excludes it, the import works). Dogfooding the convention + DRY in the fixture.
export const lookupOrder: CustomTool = {
  name: "lookupOrder",
  description: "Look up an order by id in the demo store",
  inputSchema: {
    type: "object",
    properties: { orderId: { type: "string" } },
    required: ["orderId"],
  },
  handler: async () => "order #42: shipped",
};
