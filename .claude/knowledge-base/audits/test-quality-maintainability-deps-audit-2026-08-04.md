# Deps Audit: test-quality-maintainability (M8)

**Date:** 2026-08-04
**Mode:** plan-bound
**Verdict:** `PASS_WITH_CAVEATS`
**Hard caps triggered:** nenhum

## Summary

- Dependências **novas** declaradas pelo plano: **0**. A seção `## Dependencies` declara stdlib e o
  que já está instalado; a rejeição explícita de Stryker está no ADR A1.
- Vulnerabilidades: 1 HIGH — `GHSA-qwww-vcr4-c8h2` (`react-router`), **allowlisted e ativo**
  (`rules/deps-audit-allowlist.txt:36`, sunset `2026-11-02`, ADR
  `knowledge-base/adrs/0001-react-router-rsc-csrf-allowlist.md`).
- Auditor: `pnpm audit --json` executado. `osv-scanner` não instalado — lacuna registrada, não
  resultado limpo.

Superfície idêntica à auditada no M7: nenhuma dependência entra ou sai neste milestone.

## Validação do plano

| Dep declarada | Seção | Bate com o manifesto? | Audit limpo? | Rule 9 OK? | Verdict |
|---|---|---|---|---|---|
| `vitest ^3.2.4` | Existing | sim | sim | n/a | OK |
| `@testing-library/react ^16.3.0` | Existing | sim | sim | n/a | OK |
| (nenhuma NEW) | — | — | — | — | OK |

## Rule 9 — a dependência que NÃO entrou

O ADR A1 rejeita Stryker com razão registrada: nenhum dos dois peers do nicho o usa (blueprint
Q1), o custo de execução sob jsdom é alto, e o M8 tem 4 pontos nomeados a provar, não uma suíte
inteira a auditar. A prova de mutação é manual e registrada — com a dívida declarada.

## Cobertura do auditor — declarada honestamente

| Ferramenta | Estado |
|---|---|
| `pnpm audit` | executado |
| `osv-scanner` | **não instalado** — cross-check de ecossistema não foi feito |
