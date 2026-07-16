# Discover-Plan-Confidence — m1-studio-table-stakes

**Date:** 2026-07-15
**Plan:** `.claude/knowledge-base/discoveries/plans/m1-studio-table-stakes-plan.md` (v1.1)
**Verdict:** SHIPPABLE_WITH_CAVEATS
**Weighted avg:** 100.0 (soft floor aplicado — ver caveat)

## Dimensions

| Dimension | Score | Notes |
|---|---|---|
| research_coverage | 100.0 | 4/4 corners cobertos (tests: Q4,Q5 · deps: Q6,Q7 · tools: Q8 · techniques: Q1–Q3) |
| reference_citations | 100.0 | 5/5 citações `references/` verificadas; 0 fabricadas |
| plan_completeness | 100.0 | 10/10 seções obrigatórias; 3 ADRs; budget de questões OK (8) |
| structural_risk | 100.0 | 0 smells |

## Caps

- `soft_floor_citation_density_low` — densidade 0.39/200w (piso 1.0/200w). **Causa conhecida e aceita:** 3 dos 4 alvos da investigação são repos vivos (`../theokit`, `../theokit-sdk`) citados fora do formato `knowledge-base/references/` por decisão registrada no ADR D3 do plano; o checker só conta citações `references/`. O checkpoint EC-3 (tabela "Live-repo citations" re-validada) compensa no execute.

## Downstream

Gate satisfeito (≥ SHIPPABLE_WITH_CAVEATS) → prosseguir para `/discover-execute m1-studio-table-stakes`.

JSON: `m1-studio-table-stakes-discover-plan-confidence-2026-07-15.json`
