# Code Quality Audit: docs-dead-surface-reconciliation

**Date:** 2026-08-04
**Mode:** plan-bound
**Verdict:** PASS_WITH_CAVEATS
**Score cap:** 89
**Hard caps triggered:** symbol_fab_unverifiable_typescript

## Summary

- Languages audited: typescript
- Languages skipped: _none_
- Total findings: 5 (0 HARD, 0 SOFT_CAP, 5 SOFT_FLOOR, 0 INFO)

## Findings by detector

### D1 — Dead code
_No findings._

### D2 — Symbol fabrication
| File | Symbol | Severity | Message |
|---|---|---|---|
| `home/paulo/Projetos/usetheo/theokit-tools/theokit-studio/packages/studio/tests/fixtures/demo-project/agents/support.ts` | `import from '@theokit/agents/bridge'` | SOFT_FLOOR | Could not verify npm package '@theokit/agents/bridge' (ambiguous response) |
| `home/paulo/Projetos/usetheo/theokit-tools/theokit-studio/packages/studio/tests/fixtures/demo-project/agents/tools.ts` | `import from '@theokit/agents/bridge'` | SOFT_FLOOR | Could not verify npm package '@theokit/agents/bridge' (ambiguous response) |
| `home/paulo/Projetos/usetheo/theokit-tools/theokit-studio/packages/studio/tests/fixtures/demo-project/agents/team/support.ts` | `import from '@theokit/agents/bridge'` | SOFT_FLOOR | Could not verify npm package '@theokit/agents/bridge' (ambiguous response) |
| `home/paulo/Projetos/usetheo/theokit-tools/theokit-studio/packages/studio/plugin/reflection-api.ts` | `import from '@theokit/agents/bridge'` | SOFT_FLOOR | Could not verify npm package '@theokit/agents/bridge' (ambiguous response) |
| `home/paulo/Projetos/usetheo/theokit-tools/theokit-studio/packages/studio/plugin/run-endpoint.ts` | `import from '@theokit/agents/bridge'` | SOFT_FLOOR | Could not verify npm package '@theokit/agents/bridge' (ambiguous response) |

### D3 — Cross-package orphan exports
_No findings._

### D4 — Mutation testing
_No findings._

## Related

- Golden rule: [`.claude/rules/code-quality-golden-rule.md`](../../rules/code-quality-golden-rule.md)
- Allowlist: [`.claude/rules/code-quality-allowlist.txt`](../../rules/code-quality-allowlist.txt)
- Thresholds: [`.claude/rules/code-quality-thresholds.txt`](../../rules/code-quality-thresholds.txt)
