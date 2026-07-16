import { defineConfig } from "tsup";

// Build node do plugin (M1 T1.1). A SPA builda via vite (dist/spa a partir de T2.1);
// o plugin vive em dist/plugin — o layout que resolveStudioVersion/resolveSpaDir esperam.
export default defineConfig({
  entry: { "plugin/index": "plugin/index.ts" },
  outDir: "dist",
  format: ["esm"],
  dts: true,
  clean: false,
  target: "node22",
  external: ["vite", "@theokit/agents", "@theokit/sdk"],
});
