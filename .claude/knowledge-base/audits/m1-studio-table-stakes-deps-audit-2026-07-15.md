# Deps Audit: m1-studio-table-stakes

**Date:** 2026-07-15
**Mode:** plan-bound:m1-studio-table-stakes (plan v1.1)
**Verdict:** PASS_WITH_CAVEATS
**Hard caps triggered:** [] (caveats: `auditor_unavailable_pnpm_audit`, `outdated_major_npm` — vite)

## Summary

- Ecosystems detected: npm (pnpm workspace — `pnpm-lock.yaml`)
- Vulnerabilities found: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW (osv-scanner sobre o lockfile completo: `total vulns: 0`)
- Outdated relevante ao plano: 1 MAJOR (vite `^7` declarado como peer; latest npm = 8.1.4)
- Allowlist hits: 0
- Auditor coverage:
  - `osv-scanner --lockfile=pnpm-lock.yaml`: **ran** — 0 findings (OSV agrega GHSA, então advisories do GitHub estão cobertos)
  - `pnpm audit`: **UNAVAILABLE** — endpoint clássico do registry retornou 410 (retired); a versão do pnpm no repo não usa o bulk endpoint. Gap honesto: sem segundo scanner de cross-check. Sem exposição HIGH/CRIT não-testável conhecida (OSV cobriu o lockfile), portanto sem cap 70 — caveat registrado.

## Vulnerabilities

(nenhuma — osv-scanner limpo no lockfile inteiro)

## Outdated (non-vulnerable)

### npm: vite `^7` (peer declarado no plano) → 8.1.4 (MAJOR)
- Racional do plano: o ecossistema Studio está no Vite 7 (SPA + testes); o plugin declara peer no range do host. Sem ADR de pinning formal → caveat `plan_dep_major_outdated_unpinned` (89). Recomendação: declarar o peer como `>=7 <9` na implementação OU registrar ADR curto de pinning no Vite 7 até o ecossistema migrar.

## Plan validation

| Plan dep | Section | Registry/manifest match | Audit clean? | Rule 9 OK? | Verdict |
|---|---|---|---|---|---|
| `tsup` `^8.5.0` | NEW (devDep) | npm 8.5.1 ✓ | yes | yes (toolchain LOCKED do ecossistema; alternativa "esbuild pipeline próprio" rejeitada) | OK |
| `@theokit/agents` `^0.39.0` | NEW (peer+devDep) | npm 0.39.0 ✓ (0.40.0 = worktree não-released; bridge exports presentes desde o M2 do pacote — verificado via git history) | yes | yes (alternativa "reimplementar compile/stream" rejeitada — duplicaria o bridge) | OK |
| `@theokit/sdk` `^3.8.0` | Existing (devDep) → +peer | npm 3.8.0 ✓; já no manifest | yes | n/a (reuso, rung 4) | OK |
| `vite` `^7.0.0` | Existing (devDep) → +peer | no manifest ✓; latest é 8.x | yes | n/a (o plugin É um plugin Vite) | OK com caveat MAJOR |

## Recommended next steps

1. Na implementação (T1.1), declarar peer de vite como `>=7 <9` (ou ADR de pinning) — resolve o caveat MAJOR.
2. Prosseguir com `/plan-confidence m1-studio-table-stakes` — verdict deste audit não bloqueia (≥ PASS_WITH_CAVEATS).

---
Found via cycle-plan `/deps-audit` (Mode 2). Sem secrets no corpo.
