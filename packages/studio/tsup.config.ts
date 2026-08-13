import { defineConfig } from "tsup";

// The plugin's node build (M1 T1.1). The SPA builds through vite (dist/spa from T2.1 on);
// the plugin lives in dist/plugin — the layout resolveStudioVersion/resolveSpaDir expect.
export default defineConfig({
  entry: { "plugin/index": "plugin/index.ts" },
  outDir: "dist",
  format: ["esm"],
  dts: true,
  clean: false,
  target: "node22",
  external: ["vite", "@theokit/agents", "@theokit/sdk"],
});
