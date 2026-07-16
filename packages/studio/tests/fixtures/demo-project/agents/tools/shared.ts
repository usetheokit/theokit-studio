import type { CustomTool } from "@theokit/sdk";

// Tool compartilhada entre agents — vive sob agents/tools/ (subpasta de composição:
// o scan a exclui, o import funciona). Dogfood da convenção + DRY na fixture.
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
