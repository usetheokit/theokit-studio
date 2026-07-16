# SEPA — Iteration 0 / Task ALL / Phase INITIAL-BRIEF (2026-07-15)

(resposta integral do SEPA via Agent general-purpose lendo .claude/agents/implement-m1-studio-table-stakes-2026-07-15/sepa.md)

## Plan recap
- Plan m1-studio-table-stakes v1.2 (SHIPPABLE 97.6, M1): plugin Vite @theokit/studio/plugin (reflection + run NDJSON + static /_studio) + ReflectionDataSource híbrido + e2e + wiring cross-repo. 4 MUST-FIX e 7 SHOULD-TEST absorvidos.

## Findings (resumo operacional)
- [INFO] Ordem P1→P2→P3→P4 confirmada; T1.4 independente de T1.3.
- [MAJOR] Spike Q1 adiantado p/ iteração 1: StreamAgentOptions (agent-endpoint.ts:158-178) NÃO tem onRunEvent; sessionId OBRIGATÓRIO → contingência D4 (degradar {kind:"message"} + issue no theokit).
- [CRITICAL-watch] R1 vocabulário: UIMessageChunk ∉ StudioEvent — nunca cast silencioso; mapeador explícito testado.
- R2 falso-verde: tsconfig/coverage não cobrem plugin/ → edits de honestidade em T1.1.
- R3 traversal: decode→normalize→prefix; sentinel assert.
- R4 sessão M7 paralela: staged diff vs Files-to-edit; arquivo estranho = CRITICAL.
- R5 dual test-env: pragma node 1ª linha; setup.ts roda p/ todos.
- Armadilhas: vitest default include já pega plugin/**; gate raiz repo-wide; parseStudioConfig exige scenario hoje; ServiceName += studio quebra Record total (ajuste aditivo legítimo em arquivos M5).
- Contradições: C1 (acima, contingência no plano — sem loop-back), C2 sessionId no RED, C3 config-honesty = parte de T1.1, C4 baseline over-declara páginas (fonte de verdade = Files-to-edit por task), C5 sdk ^3.4.1 no manifest (bump range ao promover peer).

## Recommended action
- Começar T1.1 com spike Q1 + config-honesty; pragma node sempre; git status antes de cada stage; gate da raiz.
