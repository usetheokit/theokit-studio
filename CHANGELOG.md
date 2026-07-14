# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Roadmap amended: added M5 "Studio UX shell" — all Studio screens on fixtures, no
  integration, UX-first (`/roadmap-feature studio-ux-shell`)
- SOTA references cloned for study: `mastra-ai/mastra` (Apache-2.0, `ee/` carve-out noted)
  and `genkit-ai/genkit` (Apache-2.0) — catalog in ROADMAP § State-of-the-art references

### Changed

### Deprecated

### Removed

### Fixed
- `plan-confidence` checker: `_scan_blueprint_refs` não resolvia blueprints no layout
  plugin-install (`.claude/knowledge-base/...`), marcando toda citação `Blueprint §"X"`
  como fabricada; regression test adicionado (achado durante o plan do M5)
- `discover-plan-confidence` scorer: `_parse_thresholds` ignorava o formato documentado
  `band.<name> = <valor>` de `rules/discover-plan-thresholds.txt` (só aceitava `NAME | valor`),
  produzindo verdict INVALID incondicional; regression test adicionado (achado durante o
  discover do M5)

### Security

## [0.1.0] - 2026-07-14

### Added
- Repository founded: README, CLAUDE.md contract, ROADMAP (M0–M4), architecture proposal and
  verified competitive deep-research under `docs/` (bootstrap, no issue ref yet)

