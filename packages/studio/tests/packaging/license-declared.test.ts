import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The published tarball must carry the licence grant, not just the repository.
 *
 * ## Why this exists
 *
 * `usetheodev/theokit#213` measured that three of our own published packages ship with no `license`
 * field, this one among them. That is not a metadata nicety: **an npm package without a `license`
 * field is all rights reserved to whoever installs it.** The grant travels in the artifact, not on
 * GitHub — a consumer resolving the tarball from a registry mirror never sees the repository.
 *
 * Two separate things have to hold, and the first is useless without the second: the manifest has to
 * DECLARE the licence, and the tarball has to CONTAIN it. `files: ["dist"]` publishes neither the
 * root `LICENSE` nor anything else outside `dist/` — npm does include a `LICENSE` found next to the
 * manifest regardless of `files`, which is exactly why this asserts the file sits in the package
 * directory rather than only at the repository root.
 */

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

interface Manifest {
  readonly name?: string;
  readonly license?: string;
  readonly private?: boolean;
}

function manifest(): Manifest {
  return JSON.parse(readFileSync(join(PKG_DIR, "package.json"), "utf8")) as Manifest;
}

describe("the published package carries its licence", () => {
  it("test_the_manifest_declares_a_license", () => {
    // Without this field an installer's tooling reports UNKNOWN, and every corporate licence gate
    // treats UNKNOWN as all-rights-reserved.
    expect(
      manifest().license,
      "an npm package with no `license` field is all rights reserved to whoever installs it (#213)",
    ).toBe("Apache-2.0");
  });

  it("test_a_LICENSE_file_sits_next_to_the_manifest_so_the_tarball_carries_it", () => {
    // `files: ["dist"]` would otherwise ship the code without the grant. npm always includes a
    // LICENSE adjacent to package.json — but only if one is there.
    expect(
      existsSync(join(PKG_DIR, "LICENSE")),
      "the grant must travel in the artifact; the repository root is not the artifact",
    ).toBe(true);
  });

  it("test_the_shipped_LICENSE_is_the_one_the_manifest_names", () => {
    // A declared SPDX id pointing at a different text is worse than no declaration: it is a claim a
    // consumer will rely on without reading.
    const text = readFileSync(join(PKG_DIR, "LICENSE"), "utf8");
    expect(text).toMatch(/Apache License/);
    expect(text).toMatch(/Version 2\.0/);
  });

  it("test_this_package_is_actually_published", () => {
    // Anti-vacuity floor: every assertion above is about the published artifact. If the package were
    // private they would all be true and meaningless.
    expect(manifest().private ?? false).toBe(false);
  });
});
