import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { theokitStudio } from "./plugin";

// O dev do próprio Studio monta o plugin (dogfood M1): /_studio/api/* responde no
// `pnpm dev`, que é como o ReflectionDataSource (T3.1) é desenvolvido contra dados reais.
export default defineConfig({
  plugins: [react(), tailwindcss(), theokitStudio()],
  // Embarcável (M1 T2.1, padrão Mastra): assets relativos servem sob qualquer prefixo;
  // outDir aninhado preserva dist/plugin no rebuild da SPA (emptyOutDir só em dist/spa).
  base: "./",
  build: { outDir: "dist/spa" },
});
