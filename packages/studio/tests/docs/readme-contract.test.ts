import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The README sits at the repo root, three levels above this file.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const README_PATH = resolve(REPO_ROOT, "README.md");

const TABLE_HEADER = "| Studio surface |";

/**
 * Extracts the first column of the README's feature table.
 *
 * A CLOSED oracle (M7 plan, ADR A1): the set of surfaces is enumerable and changes by explicit
 * decision. It fails LOUD when the table is missing — returning `[]` would make the test pass
 * green while observing nothing, which is the failure mode edge case EC-1 names.
 */
function parseFeatureTableSurfaces(markdown: string): string[] {
  const lines = markdown.split("\n");
  const headerIndex = lines.findIndex((line) => line.startsWith(TABLE_HEADER));
  if (headerIndex === -1) {
    throw new Error(
      `feature table not found in the README: no line starts with "${TABLE_HEADER}"`,
    );
  }
  const surfaces: string[] = [];
  // Skips the `|---|---|---|` separator and reads until the first line outside the table.
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    const first = line.split("|")[1]?.trim();
    if (first !== undefined && first.length > 0) surfaces.push(first);
  }
  return surfaces;
}

describe("README contract", () => {
  it("the feature table lists only surfaces that exist", () => {
    const surfaces = parseFeatureTableSurfaces(readFileSync(README_PATH, "utf8"));
    expect(surfaces).toEqual(["Agent Builder"]);
  });

  // The plan wrote the oracle in Portuguese; the README is public and is in English (as it
  // already was before M7). The regex follows the artifact's language — the requirement is the
  // same: the removal verb adjacent to the SHA that caused it.
  it("explicitly declares the removed surfaces", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).toMatch(/removed in `74a96c6`/);
  });

  // AC4: no data service appears as a ROW of the delivered-surfaces table.
  // Deliberately scoped to the table (review F-tests-9): an honest sentence in prose — "the
  // Studio does not embed theo-lens" — is desirable and must not become a test failure.
  it("no row of the feature table names a data service", () => {
    const surfaces = parseFeatureTableSurfaces(readFileSync(README_PATH, "utf8"));
    const offenders = surfaces.filter((s) => /theo-(lens|memory|rag)/.test(s));
    expect(offenders).toEqual([]);
  });

  // The BLOCKER M7's review caught: the hero promised "get a working agent file back", and the
  // Builder writes no file at all — the whole session is a scripted fixture. This is the pin
  // against reintroducing that promise.
  it("states that the build session is scripted and writes nothing to disk", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).toMatch(/does not write anything to disk/i);
  });

  // Round 2 F-r2-10: the "live" half is not reachable by the command the README tells you to
  // run. Twice in a row the same class of untruth was born in that paragraph — this is the pin.
  it("says which mode the documented command runs in", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).toMatch(/`pnpm dev` runs both halves from fixtures/i);
  });

  it("does not promise the Builder returns an agent file", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).not.toMatch(/get a working agent file back/i);
  });

  // EC-1: the parser never returns [] when it cannot find the block — it fails loud and names it.
  it("parseFeatureTableSurfaces throws naming the block when the table disappears", () => {
    const call = () => parseFeatureTableSurfaces("# No table\n\ntext");
    expect(call).toThrowError(/feature table not found/);
  });
});
