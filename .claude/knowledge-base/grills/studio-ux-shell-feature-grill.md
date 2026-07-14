---
slug: studio-ux-shell
generated_by: roadmap-feature
date: 2026-07-14
status: completed
target_milestone: M5
---

# Feature grill — studio-ux-shell (M5)

Input do usuário: "implementar toda a tela e experiência igual o Mastra Studio e
https://genkit.dev/docs/js/devtools/" — inicialmente pedido como "M0"; renumeração é proibida,
posicionado como M5 (próximo ID livre).

## Decisões estruturais (pré-grill)

- **Posição:** novo milestone M5 "Studio UX shell" — todas as telas navegáveis com fixtures,
  sem integração. M1/M2/M3 trocam fixtures por dados reais depois. Usuário inicia via
  `/auto-plan M5` diretamente (o select do cycle-roadmap pegaria M0 primeiro).
- **out_of_scope_overlap_false_positive:** "Building a trace UI from scratch — theo-lens owns
  trace visualization". Decisão: overlap coincidental — o M5 NÃO mocka árvore de traces; a tab
  Traces existe apenas como placeholder/estado offline ("rode `theokit studio up`" / futuro
  embed do lens-web no M2). Item out-of-scope permanece intacto.

## Grill (4 perguntas)

### Q1 — O que é / por que agora?

**Resposta:** Validar UX antes de integrar. Shell da SPA real (construído com `@theokit/ui`)
com todas as telas navegáveis sobre fixtures — playground, event inspector, memory browser,
knowledge/RAG inspector, traces como placeholder. O que mudou: decisão de visualizar e iterar
a experiência completa antes de investir em integração (M0–M3). Nada é descartável: os
offline/empty states construídos aqui já são requisito de produto (invariante 4 — graceful
degradation), e o dogfooding do `@theokit/ui` (invariante 7) começa cedo.

### Q2 — Dependências

**Resposta:** Nenhuma (milestone foundation-free, paralelo a M0/M1). É puro frontend sobre
fixtures — não precisa do compose (M0), do reflection endpoint (M1), nem dos serviços.
Dependência real é externa ao roadmap: `@theokit/ui` 1.x disponível (registry ou workspace).
Nota de scheduling: o select do cycle-roadmap pega o menor ID elegível (M0 primeiro); para
trabalhar M5 primeiro, invocar `/auto-plan M5` diretamente.

### Q3 — Definition of Done

**Resposta:** DoD completa — 5 telas + fixtures + estados:

1. SPA em `packages/studio` construída com `@theokit/ui` (major atual), rodando standalone
   via Vite dev server (sem `theokit dev`, sem Docker).
2. 5 superfícies navegáveis: Playground (chat mockado), Event Inspector (fixtures de
   `Run.stream()` tipados: text deltas, tool calls, permissions, rate-limit, completion),
   Memory browser, Knowledge/RAG inspector (retrieval playground fake com scores), Traces
   **placeholder** (estado offline/embed futuro — nunca árvore mockada).
3. Camada de dados atrás de interface (DIP): fixtures hoje, implementação real (M1/M2/M3)
   troca depois sem tocar as telas.
4. Estados empty/loading/offline presentes em toda tab backed-by-serviço.
5. Build + testes + typecheck verdes no monorepo.

### Q4 — Riscos novos

**Resposta:**

1. **Fixture drift** — os eventos/shapes mockados divergem dos tipos reais do `@theokit/sdk`
   3.x, validando telas contra dados que não existem. Mitigação: derivar as fixtures dos
   tipos publicados do SDK (importar os types, nunca inventar shapes à mão).
2. **Gaps no `@theokit/ui` 1.x** — o design system pode não cobrir componentes que o Studio
   exige (event-stream viewer, temporal graph view), forçando gambiarras ou bloqueando no
   pilar de UI. Mitigação: levantar o inventário de componentes no planning e tratar gaps
   como contribuição upstream ao `@theokit/ui`, não fork local.

## SOTA delta (Step 5)

**Decisão:** Sim — clonar Mastra + Genkit (os dois peers que o M5 quer igualar).

- `mastra-ai/mastra` — license gate: Apache-2.0 com carve-out (`ee/` sob licença comercial
  separada; regra: estudar tudo, NUNCA portar código de `ee/`). Clonado shallow (265M).
- `genkit-ai/genkit` — Apache-2.0 puro (redirect de `firebase/genkit`). Clonado shallow (82M).
- `knowledge-base/references/` é read-only por convenção do projeto (hook boundary-check) —
  o catálogo vive em `ROADMAP.md § State-of-the-art references`, não em `_catalog.md`.

## Resultado

`ROADMAP_FEATURE_COMPLETE` — M5 inserido no ROADMAP.md após M4; seção
`## State-of-the-art references` criada no rodapé (âncora ausente porque o roadmap foi
escrito à mão na inception, não pelo /roadmap-init); CHANGELOG atualizado.

