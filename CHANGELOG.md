# Changelog

Changes to the repository itself — CI, licensing, tooling and repository-wide sweeps.
Changes to the published package are recorded in
[`@theokit/studio`](packages/studio/CHANGELOG.md).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- The published package declares where it comes from. `packages/studio/package.json` carried no
  `repository`, `homepage` or `bugs` field, so npm had no source to match the provenance bundle
  against and answered `E422 — Failed to validate repository information` on every attested
  publish. A consumer reading the package page also had no link back to the code (#25)

### Changed

- The repository is public, and provenance is back on. It was off because npm refuses to attest a
  package built from a private source; `@theokit/studio@0.2.0` is the only release in the
  ecosystem carrying no attestation, and the same single fact — a private repository — also kept
  the organization's release secrets from reaching this repository, since the free plan delivers
  them to public repositories only. One cause, two costs, both now gone (#25)

## [0.3.0] - 2026-08-27

### Added
- **ci:** `Promotion gate` refuses a pull request into `develop` that does not come from this repository's own `workspace`. `git-safety.md` has always said so and `validate-command.sh:245` has always blocked it — for a `git merge` typed locally, which is not how any of this repository's 14 promotions landed (usetheokit/theokit#606)

- `CI`, which runs check, build, typecheck and test on every pull request. Until now the only
  workflow here was the secret scan, so a pull request reported "all checks passed" without
  anything having verified that the code compiles (#19)
- `Release`, a changesets-driven publish authenticated with npm trusted publishing. Versions
  previously reached the registry from a developer machine, carrying no provenance (#19)
- `Workflow Lint`, a CI gate running actionlint and zizmor over `.github/workflows/` (#19)
- `Dependency Gate`, which checks every declared sibling range against what is installed, against
  the registry, and against the bottom of the range — the class of defect #21 was (#20)
- `@theokit/studio` declares `engines.node` (#19)
- Secret scanning in two layers: a `pre-commit` hook that scans staged content with TruffleHog and
  refuses the commit, and `.github/workflows/secret-scan.yml`, which rescans the pushed range in
  CI. The hook is what keeps a credential out of history; the workflow is what
  `git commit --no-verify` cannot skip. Confirmed false positives are silenced line by line with a
  `trufflehog:ignore` comment, never by excluding the path — excluding the path would also hide a
  real secret added to that same fixture later (secret-scanning-2026-08)
- `tests/version-floor.test.ts`, an anti-vacuity floor over the versions this package declares.
  Written because 15 reds went green on a three-line change, in an item previously described as
  "seven majors of migration": a green that cheap deserves disbelief until something independent
  confirms the new code is the code that runs.

  It does not ask for a version — it asks the loaded modules what they expose: `AgentBuilder`
  present and `agent` absent from the bridge, `compileAgentModule` / `streamAgentUIMessages` still
  functions, and the config/trust/wiring family of SDK 4.49. A manifest can declare any range; only
  the loaded module answers whether the API exists.

  It took four attempts, and every wrong one was the same defect — a probe unable to detect the
  condition it tracks: `package.json` outside the `exports` map; walking upward from a CJS
  resolution; CJS resolution against an ESM-only subpath (`ERR_PACKAGE_PATH_NOT_EXPORTED` is the
  *correct* answer to the wrong question); and `import.meta.resolve`, which Vite's SSR transform
  does not provide.

### Changed

- Node pinned to 22.12.0 and pnpm to 10.34.1, resolved from `.nvmrc` and `packageManager` (#19)
- **The suite stopped claiming every core on the machine.** `vitest.config.ts` capped nothing, so
  the default applied — `os.availableParallelism()`, one fork per core, each starting a whole test
  environment. On a 12-thread machine a single `vitest run` took the entire machine, and anything
  else running alongside it (another suite, a typecheck, the desktop) fought over what was left.
  The cap now leaves 4 cores free (`Math.max(2, cpus().length - 4)`), scaling with the runner
  rather than hardcoding one machine's count. It costs no wall-clock: measured on `theokit-ui`, the
  full suite ran in 73.96s with 4 workers against 74.36s with 12 (usetheokit/theokit-ui#51)
- **The repository moved to the official `usetheokit` organisation.** Existing clones keep working:
  GitHub permanently redirects the old `usetheodev/theokit-studio` remote (usetheokit/theokit#316)
- **The Apache-2.0 licence text was replaced with the official one.** The text shipped until now had
  paragraph 4(d) truncated, omitting "reasonable and customary use" from the NOTICE clause. A
  modified body under the SPDX identifier `Apache-2.0` is in practice a custom licence, and forced
  consumers to reason about the difference. The root `LICENSE` and the one in `packages/studio` are
  now byte-for-byte identical to the canonical text (usetheokit/theokit#316)
- **The README no longer links `ROADMAP.md` and the four documents under `docs/`**, all removed in
  commit `4a60788`; the text now says they exist only in git history (docs-reorg-2026-08)

### Fixed

- **`pnpm test` at the root passes again — it had been red since `4a60788`.** The `test:roadmap`
  script ran `tests/roadmap_dod_shape_test.py`, which reads `ROADMAP.md`. That file was removed on
  purpose in that same commit, along with the extractor under `.claude/skills/acceptance/` the test
  imported as its oracle. An orphan guard on top of an orphan oracle, checking the shape of an
  artifact the README already documents as non-existent.

  It did not even fail on an assertion: it raised `FileNotFoundError`, so the root suite exited
  non-zero on an error that did not say what to do. Removed — its subject no longer exists, and a
  gate impossible to satisfy trains the team to ignore red. It comes back if a roadmap comes back,
  together with the extractor that gave it meaning.

- **The published package now declares and ships its licence** (usetheodev/theokit#213). The
  manifest had no `license` field and `files: ["dist"]` carried no `LICENSE` — the Apache-2.0
  `LICENSE` existed only at the repository root, which is not the artifact. **An npm package with no
  `license` field is all rights reserved to whoever installs it:** the grant travels in the tarball,
  not on GitHub, and someone resolving the package from a registry mirror never sees the repository.

  The manifest now declares `Apache-2.0` and the `LICENSE` sits beside it, so npm includes it
  despite `files`. Verified with `npm pack --dry-run`: `11.3kB LICENSE`, 38 files.
  `tests/packaging/license-declared.test.ts` guards both halves — declaring without shipping, and
  shipping a text different from the declared SPDX, are distinct failures, and the second is worse,
  because it is a claim the consumer trusts without reading.
