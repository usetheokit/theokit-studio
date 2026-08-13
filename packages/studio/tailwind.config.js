// The design system's Violet Forge preset (v3-style, loaded in Tailwind v4 via @config in
// index.css) + a content scan of the DESIGN SYSTEM PACKAGES by their REAL path (.pnpm):
// the Tailwind v4 scanner does not follow pnpm symlinks in node_modules, so without
// that, the internal utilities of @usetheo/ui/@theokit/ui emit no CSS (a "bare" UI —
// dogfood 2026-07-14). realpathSync resolves the symlink to the pnpm store.
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
