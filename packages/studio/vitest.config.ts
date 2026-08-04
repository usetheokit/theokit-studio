import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Margem para cold-cache (review F-tests-1): testes são event-driven; em runs
    // verdes o timeout maior não custa nada, e elimina o flake da 1ª transformação.
    testTimeout: 15000,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Fixtures nunca são suites (demo-project contém skip.test.ts como CONTRATO do scan).
    exclude: ["**/node_modules/**", "**/dist/**", "tests/fixtures/**"],
    coverage: {
      provider: "v8",
      // plugin/** incluído (M1 T1.1 — config-honesty: DoD de coverage cobre o node-side).
      include: ["src/**", "plugin/**"],
      // M8 (review F-tests-10): `src/main.tsx` saiu do exclude. O composition root é o arquivo
      // cujo defeito nomeia o milestone, e mantê-lo fora da medição foi o que tornou o buraco do
      // ramo de fixtures invisível ao DoD numérico de cobertura.
      exclude: ["src/test/**", "src/vite-env.d.ts", "plugin/**/*.test.ts"],
    },
  },
});
