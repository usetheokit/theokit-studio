import { cpus } from "node:os";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // Default is os.availableParallelism(): one fork per core, each booting a full
    // test environment. Capping leaves headroom for the host, and costs no wall-clock
    // because the gain above this point was already noise when measured.
    maxWorkers: Math.max(2, cpus().length - 4),
    environment: "jsdom",
    globals: true,
    // Headroom for a cold cache (review F-tests-1): the tests are event-driven; on green runs the
    // larger timeout costs nothing, and it removes the first-transform flake.
    testTimeout: 15000,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Fixtures are never suites (demo-project holds skip.test.ts as the scan's CONTRACT).
    exclude: ["**/node_modules/**", "**/dist/**", "tests/fixtures/**"],
    coverage: {
      provider: "v8",
      // plugin/** is included (M1 T1.1 — config honesty: the coverage DoD covers the node side).
      include: ["src/**", "plugin/**"],
      // M8 (review F-tests-10): `src/main.tsx` left the exclude list. The composition root is the
      // file whose defect names the milestone, and keeping it out of the measurement is what made
      // the fixtures-branch hole invisible to the coverage DoD's number.
      exclude: ["src/test/**", "src/vite-env.d.ts", "plugin/**/*.test.ts"],
      // `lcov` is what SonarCloud reads, and it is NOT in vitest's default reporter set — the
      // defaults are text/html/clover/json. Naming any reporter replaces that set, so the
      // defaults are repeated here rather than lost: `text` for the CI log, `html` for the local
      // report, `json` for tooling.
      reporter: ["text", "html", "clover", "json", "lcov"],
    },
  },
});
