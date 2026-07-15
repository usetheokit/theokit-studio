// Preset Violet Forge do design system (v3-style, carregado no Tailwind v4 via @config
// no index.css) + content scan dos PACOTES DO DESIGN SYSTEM pelo path REAL (.pnpm):
// o scanner do Tailwind v4 não segue os symlinks do pnpm em node_modules, então sem
// isso as utilities internas de @usetheo/ui/@theokit/ui não geram CSS (UI "pelada" —
// dogfood 2026-07-14). realpathSync resolve o symlink para a store do pnpm.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import preset from "@usetheo/ui/preset";

const here = path.dirname(fileURLToPath(import.meta.url));
const realDist = (pkg) => fs.realpathSync(path.join(here, "node_modules", pkg, "dist"));

export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./tests/**/*.{ts,tsx}",
    `${realDist("@usetheo/ui")}/**/*.js`,
    `${realDist("@theokit/ui")}/**/*.js`,
  ],
};
