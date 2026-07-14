# Discover Edge Case Review — studio-ux-shell

Date: 2026-07-14
Discovery plan analyzed: .claude/knowledge-base/discoveries/plans/studio-ux-shell-plan.md
Research questions analyzed: 7
Edge cases found: 5 (MUST FIX: 1, SHOULD TEST: 2, DOCUMENT: 2)

## MUST FIX

### EC-1: Alvo do Q3 em `genkit-tools/common/` é largo demais
- **Affected question:** Q3
- **Family:** Method / Scope
- **Scenario:** `genkit-tools/common/src/` tem 7 subpacotes (api, eval, manager, plugin,
  server, types, utils — verificado 2026-07-14). "Endpoints/types relevantes de common/" sem
  alvo declarado convida scope creep no halt-loop e estoura o budget de 2h do genkit.
- **Impact:** Q3 consome o budget do projeto e bloqueia Q5; blueprint fica com o corner
  techniques do genkit raso.
- **Suggested fix:** restringir a Fase B do Q3 a `common/src/types/` (shapes de action/trace),
  `common/src/manager/` (runtime manager) e `common/src/server/` (rotas da API) — demais
  subpacotes out-of-scope.

## SHOULD TEST

### EC-2: Grep de empty/loading/offline retorna volume alto (39+ arquivos)
- **Affected question:** Q1
- **Suggested halt-loop checkpoint:** cap de hotspots por questão — Fase B lê no máximo 10
  hotspots representativos (priorizar `playground-ui/src/ds/components/` + 1 uso real por
  padrão em `playground/src/pages/`); registrar no blueprint que o inventário é amostral.

### EC-3: Imports de tipos do Q2 apontam para fora do escopo
- **Affected question:** Q2
- **Suggested halt-loop checkpoint:** ao seguir definições de tipos de eventos/parts, usar a
  cópia vendorizada `packages/playground/src/vendor/@mastra/core` (dentro do escopo);
  NUNCA expandir para `mastra/packages/core/` (out-of-scope declarado).

## DOCUMENT

### EC-4: Clone é snapshot de `main` (2026-07-14), não de um release
- **Accepted risk:** padrões observados podem divergir do Mastra Studio released. Aceito: o
  objetivo é extrair padrões SOTA de composição/UX, não paridade de versão. O blueprint
  registra a data do snapshot em cada citação de contexto.

### EC-5: Telas do Genkit Dev UI não investigáveis (fonte pré-buildada)
- **Accepted risk:** já coberto pelo ADR D3 do plano — padrões de tela vêm 100% do Mastra;
  Genkit contribui contrato de dados/serving. Nenhuma ação adicional.

## Summary

| Question | Edges found | MUST FIX | SHOULD TEST | DOCUMENT |
|----------|-------------|----------|-------------|----------|
| Q1 | 1 | 0 | 1 | 0 |
| Q2 | 1 | 0 | 1 | 0 |
| Q3 | 2 | 1 | 0 | 1 (EC-5) |
| Q4–Q7 | 0 | 0 | 0 | 0 |
| (plan-wide) | 1 | 0 | 0 | 1 (EC-4) |

**Verdict:** DISCOVERY PLAN NEEDS ADJUSTMENT (1 MUST FIX — absorver antes do /discover-execute)
