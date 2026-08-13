import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { theokitStudio } from "./plugin";

// The Studio's own dev mounts the plugin (M1 dogfood): /_studio/api/* answers under
// `pnpm dev`, which is how ReflectionDataSource (T3.1) is developed against real data.
export default defineConfig({
  plugins: [react(), tailwindcss(), theokitStudio()],
  // Embeddable (M1 T2.1, the Mastra pattern): relative assets serve under any prefix; a nested
  // outDir preserves dist/plugin across an SPA rebuild (emptyOutDir applies to dist/spa only).
  base: "./",
  build: { outDir: "dist/spa" },
});
