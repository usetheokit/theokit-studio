# Deps Audit: docs-dead-surface-reconciliation (M7)

**Date:** 2026-08-04
**Mode:** plan-bound
**Verdict:** `PASS_WITH_CAVEATS`
**Hard caps triggered:** nenhum

## Summary

- Ecossistemas detectados: npm (pnpm workspace)
- Dependências **novas** declaradas pelo plano: **0** — a seção `## Dependencies` do plano declara
  explicitamente que todo o trabalho usa stdlib (`node:fs`) e o que já está instalado (rungs 2 e 4
  da escada de parcimônia).
- Vulnerabilidades: `{info: 0, low: 0, moderate: 0, high: 1, critical: 0}`
- Auditor: `pnpm audit --json` — executado. `osv-scanner` não instalado nesta máquina; registrado
  como lacuna, não como resultado limpo.

## Vulnerabilidades

### GHSA-qwww-vcr4-c8h2 — HIGH (npm: react-router)

- **Título:** React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response
- **Estado:** **allowlisted e ativo** — `rules/deps-audit-allowlist.txt:36`, sunset `2026-11-02`
  (dentro da janela de 90 dias), ADR `knowledge-base/adrs/0001-react-router-rsc-csrf-allowlist.md`
- **Justificativa registrada:** o RSC Mode não é usado nesta SPA — grep por
  `rsc` / `createStaticHandler` / `renderToReadableStream` em `packages/studio/src` retorna zero.
  O fix exige bump MAJOR (7.x → 8.x), fora do escopo deste milestone.
- **Efeito no verdict:** o allowlist rebaixa em um nível (HIGH → MEDIUM-equivalente), o que mantém
  o plano fora de `FAIL_INSECURE`.

Este é o **mesmo** achado do M6; nada novo entrou. O M7 não adiciona nem remove dependência, então
a superfície de exposição é idêntica à auditada em `plugin-hardening-deps-audit`.

## Validação do plano

| Dep declarada no plano | Seção | Bate com o manifesto? | Audit limpo? | Rule 9 OK? | Verdict |
|---|---|---|---|---|---|
| `vitest ^3.2.4` | Existing | sim | sim | n/a | OK |
| `@testing-library/react ^16.3.0` | Existing | sim | sim | n/a | OK |
| (nenhuma NEW) | — | — | — | — | OK |

## Cobertura do auditor — declarada honestamente

| Ferramenta | Estado |
|---|---|
| `pnpm audit` | executado |
| `osv-scanner` | **não instalado** — cross-check de ecossistema não foi feito |

A ausência do cross-check significa que uma CVE presente no OSV e ausente do GitHub Advisory
passaria despercebida. Não é "auditoria limpa"; é auditoria com uma fonte.

## Próximos passos

1. Nenhuma ação bloqueante para o M7.
2. Antes do primeiro `npm publish`, reavaliar o bump `react-router` 7 → 8 (o sunset do allowlist é
   `2026-11-02` e o ADR 0001 já registra o caminho).
