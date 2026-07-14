# Deps Audit: studio-ux-shell

**Date:** 2026-07-14
**Mode:** plan-bound:studio-ux-shell (plan v1.1)
**Verdict:** PASS
**Hard caps triggered:** (none)

## Summary

- Ecosystems detected: npm (root `package.json`; sem lockfile — repo pré-install, todas as
  deps do plano são NEW)
- Total deps audited: 17 declaradas no plano `## Dependencies` (todas diretas; transitive
  check ocorrerá no primeiro `pnpm install` do T0.1 — lockfile ainda não existe)
- Vulnerabilities found nas versões FINAIS pinadas: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW
- Vulnerabilities encontradas E RESOLVIDAS durante o audit (bump de pin dentro do major):
  - `vitest@3.2.4` → **GHSA-5xrq-8626-4rwp (CRITICAL** — Vitest UI server arbitrary file
    read/execute; fixed 3.2.6) → plano pinado em `^3.2.7` (última 3.x; CLEAN — correção: 3.2.11 não existe no registry)
  - `react-router@7.13.1` → 7 advisories (3 HIGH: GHSA-49rj-9fvp-4h2h, GHSA-8646-j5j9-6r62,
    GHSA-8x6r-g9mw-2r78; 2 MODERATE; 1 LOW; fixes ≤ 7.15.1) → plano pinado em `^7.18.1` (CLEAN)
  - `vite@7.3.1` → 5 advisories (1 HIGH: GHSA-fx2h-pf6j-xcff fs.deny bypass Windows) →
    plano pinado em `^7.3.6` (CLEAN)
- Outdated MAJOR (com ADR de pin — não capam): react-router 8.2.0, vite 8.1.4, vitest
  4.1.10, typescript 7.0.2, jsdom 29.1.1 → todos cobertos pelo **ADR D6** do plano
  (TS 5.8 é lock do CLAUDE.md § Toolchain; demais pinados na linha validada pela referência)
- Allowlist hits: 0
- Auditor coverage: { osv.dev querybatch API: ran (17 pacotes × versão pinada);
  npm audit: SKIPPED — sem lockfile ainda (repo greenfield; rodar no T0.1 pós-install);
  osv-scanner local: presente mas sem lockfile para escanear }

## Vulnerabilities nas versões finais pinadas

(nenhuma — todas as versões pinadas verificadas CLEAN via OSV em 2026-07-14)

## Plan validation

| Plan dep | Section | Registry | Audit clean? | Rule 9 OK? | Verdict |
|---|---|---|---|---|---|
| react ^19.2.7 / react-dom ^19.2.7 | NEW | ✓ 19.2.7 | ✓ | ✓ (peer do design system) | OK |
| react-router ^7.18.1 | NEW | ✓ | ✓ (≥7.18.1) | ✓ (padrão categoria; ADR D6) | OK |
| @theokit/ui ^1.0.3 | NEW | ✓ | ✓ | ✓ (invariante 7 — dogfooding) | OK |
| @usetheo/ui ^0.15.0 | NEW | ✓ | ✓ | ✓ (já dep do @theokit/ui — rung 4) | OK |
| @theokit/sdk ^3.4.1 | NEW (types-only) | ✓ | ✓ | ✓ (fonte dos tipos de evento) | OK |
| tailwindcss + @tailwindcss/vite ^4.3.2 | NEW | ✓ | ✓ | ✓ (peer obrigatório do DS) | OK |
| vite ^7.3.6 / @vitejs/plugin-react ^5.0.0 | NEW | ✓ | ✓ | ✓ (toolchain; ADR D6) | OK |
| typescript ^5.8.0 | NEW (dev) | ✓ | ✓ | ✓ (lock CLAUDE.md) | OK |
| vitest + @vitest/coverage-v8 ^3.2.7 | NEW (dev) | ✓ | ✓ (CRITICAL evitada) | ✓ (toolchain; ADR D6) | OK |
| @testing-library/react ^16.3.2 / user-event ^14.6.1 / jsdom ^26 | NEW (dev) | ✓ | ✓ | ✓ (padrão da categoria — Blueprint Corner 1) | OK |
| @biomejs/biome ^2.4.0 | Existing (root) | ✓ | ✓ | n/a | OK |

Deps explicitamente REJEITADAS no plano (Rule 9/YAGNI, com razão): @tanstack/react-query,
zustand, msw, @xyflow/react, recharts, Playwright — ver plano § Dependencies.

## Recommended next steps

1. T0.1 (`pnpm install`) gera `pnpm-lock.yaml` → rodar `osv-scanner --lockfile=pnpm-lock.yaml`
   como cross-check transitivo no gate de validação do implement.
2. Prosseguir com `/plan-confidence studio-ux-shell`.
3. Chore pós-M5 (registrado no ADR D6): avaliar upgrade react-router 8 / vite 8 / vitest 4.

---
*Como foi auditado: OSV.dev querybatch API por pacote×versão pinada (17 consultas) +
detalhes por advisory (severity + fixed events); npm view para existência/latest no
registry. Sem secrets no corpo.*
