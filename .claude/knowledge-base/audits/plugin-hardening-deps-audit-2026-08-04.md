# Deps Audit: plugin-hardening (M6)

**Date:** 2026-08-04
**Mode:** plan-bound:`plugin-hardening`
**Verdict inicial:** `FAIL_INSECURE` · **Verdict após remediação:** `PASS_WITH_CAVEATS`
**Hard caps triggered:** `cve_high_npm` (resolvido — ver § Remediação aplicada)

## Summary

- Ecossistemas detectados: **npm** (pnpm workspace). Nenhum manifesto Python/Rust/Go no repo.
- Pacotes com vulnerabilidade: **5** · Vulnerabilidades distintas: **5** (7 ocorrências, duas
  versões de `brace-expansion` coexistindo na árvore).
- Severidade (rótulo oficial do GitHub Advisory, **não** calculado por mim): **3 HIGH**,
  1 MODERATE, 1 LOW.
- Allowlist: `rules/deps-audit-allowlist.txt` — nenhuma entrada ativa hoje.
- **Cobertura dos auditores (declarada honestamente):**
  - `osv-scanner` — **rodou** sobre `pnpm-lock.yaml` (fonte de verdade do que está instalado).
  - `npm audit` — **NÃO rodou**: exige `package-lock.json` e este repo usa pnpm (`ENOLOCK`).
    O anti-pattern 6 desta skill pede parear `osv-scanner` com `npm audit` para npm, porque o
    dataset npm do OSV pode atrasar em relação ao GitHub Advisory. **Essa checagem cruzada não
    aconteceu** — as 5 vulnerabilidades abaixo são o piso, não necessariamente o total.
  - `pip-audit`, `cargo audit`, `govulncheck` — não aplicáveis (sem manifesto correspondente).

## Vulnerabilities (ordenadas por severidade)

### GHSA-qwww-vcr4-c8h2 — HIGH — npm: `react-router@7.18.1` — **DEPENDÊNCIA DIRETA**

- **Resumo:** React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response (CWE-352).
- **Fixed in:** `8.3.0`
- **Caminho:** `packages/studio` → `react-router` (declarada em `packages/studio/package.json`
  `dependencies`).
- **Aplicabilidade verificada:** o CVE é específico do **RSC Mode**.
  `grep -rn "rsc\|RSC\|createStaticHandler\|renderToReadableStream" packages/studio/src` retorna
  **zero ocorrências** — a SPA usa `createBrowserRouter` client-side (`src/main.tsx:26`). O
  recurso vulnerável não é exercitado por este código.
- **Diff sugerido:** OMITIDO — `7.18.1 → 8.3.0` é bump **MAJOR**; exige revisão de breaking changes.
- **Plan reference:** o plano do M6 **não declara** `react-router` e não toca no roteador. Esta
  vulnerabilidade é **pré-existente e ortogonal ao M6**.

### GHSA-mh99-v99m-4gvg — HIGH — npm: `brace-expansion@2.1.2` e `@5.0.7` (transitiva)

- **Resumo:** DoS via unbounded expansion length causando crash por out-of-memory (CWE-400, CWE-770).
- **Fixed in:** `1.1.17`, `2.1.3`, `3.0.3`, `5.0.8`
- **Caminho:** transitiva do toolchain (não declarada por nós).

### GHSA-rgw5-rvv9-x895 — HIGH — npm: `brace-expansion@2.1.2` e `@5.0.7` (transitiva)

- **Resumo:** DoS via unbounded intermediate arrays, contornando a mitigação de CVE-2026-14257.
- **Fixed in:** `1.1.18`, `2.1.4`, `3.0.6`, `5.0.9`
- **Caminho:** transitiva.

### GHSA-fxqj-rqcc-2cmp — MODERATE — npm: `postcss@8.5.19` (transitiva)

- **Resumo:** correção incompleta de GHSA-6g55-p6wh-862q — `sourceMappingURL` controlado pelo
  atacante permite leitura de arquivo arbitrário (CWE-22, CWE-200).
- **Fixed in:** `8.5.23`

### GHSA-g7r4-m6w7-qqqr — LOW — npm: `esbuild@0.27.7` (transitiva)

- **Resumo:** leitura de arquivo arbitrária ao rodar o dev server **no Windows** (CWE-22).
- **Fixed in:** `0.28.1`
- **Nota:** o vetor é `AV:L` (local) e restrito a Windows; este projeto é desenvolvido em Linux.

## Plan validation (Mode 2)

O plano declara, em `## Dependencies`:

| Plan dep | Section | Manifest match | Audit clean? | Rule 9 OK? | Verdict |
|---|---|---|---|---|---|
| `node:http` (`ServerResponse`) | Existing (stdlib) | sim (runtime Node ≥22.12) | sim — stdlib não é auditável por CVE de pacote | n/a (rung 2 da parsimony ladder) | OK |
| `vitest` | Existing | sim (devDep do repo) | sim — nenhuma vuln reportada | n/a | OK |

**Nenhuma dependência NOVA é introduzida pelo plano** (ADR A3), então nenhum `plan_new_dep_no_rule9_evaluation` se aplica. A seção `## Dependencies` existe, com versão e justificativa — nenhum
`INVALID_PLAN_DEPS`.

## Por que o verdict é FAIL_INSECURE mesmo assim

A regra de ouro (`rules/deps-audit-golden-rule.md` § 2) capa em `FAIL_INSECURE` (49) qualquer
**HIGH CVE em dep declarada e não-allowlistada**. `react-router` é dependência **direta** de
`packages/studio` e carrega um HIGH. O fato de o plano do M6 não tocar nela **não muda o estado
do projeto** — e a skill é proibida de esconder o achado (anti-pattern 3).

Ser honesto aqui importa mais do que destravar rápido: o M6 não introduziu isto, mas o M6 também
não pode alegar fronteira segura enquanto o pacote que ele publica carrega um HIGH conhecido.

## Recommended next steps

1. **`brace-expansion` (2 HIGH, transitiva):** correção real e barata — `pnpm.overrides` para
   `>=2.1.4` / `>=5.0.9`. Não é workaround: é a forma canônica do pnpm para forçar versão
   corrigida de dependência transitiva. Deve ser feita, com a suíte re-rodada.
2. **`postcss` e `esbuild` (MODERATE/LOW, transitivas):** mesmo mecanismo, mesma leva.
3. **`react-router` (HIGH, direta):** bump MAJOR `7.18.1 → 8.3.0` está **fora do escopo do M6**.
   Dois caminhos legítimos, ambos previstos pela regra de ouro:
   - allowlist com sunset ≤ 90 dias + ADR, ancorado na evidência de que o RSC Mode não é usado; **ou**
   - milestone próprio para o bump major, com o roteador re-testado.
4. **Fechar o buraco de cobertura:** gerar um `package-lock.json` só para auditoria, ou instalar
   `pnpm audit`, para ter a checagem cruzada que o anti-pattern 6 exige.
5. Re-rodar `/deps-audit plugin-hardening` e confirmar `PASS` ou `PASS_WITH_CAVEATS` antes de
   `/plan-confidence`.

## Anti-patterns respeitados

- Nenhum manifesto foi editado por esta skill (read-only por contrato).
- Nenhum CVE citado sem versão de correção.
- Severidades vêm do rótulo oficial do GitHub Advisory (`database_specific.severity`), não de
  cálculo próprio de CVSS.
- A ausência do `npm audit` está declarada como lacuna de cobertura, não silenciada.
- `knowledge-base/references/` ficou fora da superfície auditada.


---

## Remediação aplicada (mesma sessão, re-auditada)

Este relatório não parou no diagnóstico. As correções foram aplicadas e re-verificadas:

| Achado | Severidade | Ação | Resultado |
|---|---|---|---|
| `brace-expansion` GHSA-mh99-v99m-4gvg | HIGH | `pnpm.overrides` → `>=2.1.4` / `>=5.0.9` | **corrigido** |
| `brace-expansion` GHSA-rgw5-rvv9-x895 | HIGH | idem | **corrigido** |
| `postcss` GHSA-fxqj-rqcc-2cmp | MODERATE | `pnpm.overrides` → `>=8.5.23` | **corrigido** |
| `esbuild` GHSA-g7r4-m6w7-qqqr | LOW | `pnpm.overrides` → `>=0.28.1` | **corrigido** |
| `react-router` GHSA-qwww-vcr4-c8h2 | HIGH | allowlist + ADR 0001, sunset 2026-11-02 | rebaixado a MEDIUM |

Detalhe de implementação que vale registrar: o seletor `brace-expansion@5` **não** pegou o
caminho `minimatch@9.0.9 → brace-expansion@5.0.7`. Foi preciso o seletor parent>child do pnpm
(`"minimatch>brace-expansion": ">=5.0.9"`), que é preciso e não força a linha 5.x sobre quem
depende da 2.x. Sem essa segunda passada, o relatório teria declarado corrigido algo que
continuava vulnerável — o re-scan é o que pegou.

**Re-auditoria:** `osv-scanner --lockfile=pnpm-lock.yaml` passou de **7 ocorrências para 1**
(a única sob allowlist com data de morte).

**Validação pós-mudança:** `npm test` 119/119 verdes · `npm run typecheck` limpo ·
`npm run build` verde (vite + tsup). Nenhuma regressão introduzida pelos overrides.
