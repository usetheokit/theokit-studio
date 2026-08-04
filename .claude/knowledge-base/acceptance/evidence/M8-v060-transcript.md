# Transcrição de aceitação — M8 contra a tag v0.6.0

Alvo: worktree próprio de `v0.6.0` (merge `f525823`), não a árvore de trabalho.

## AC1 — o teste do composition root volta a FALHAR com o ternário invertido
Mutação 1, ternário invertido:
  × test_composition_root_selects_hybrid_in_live_mode
  × test_composition_root_selects_fixtures_when_mode_is_absent
Mutação 2, `const live = true` (o mutante que a review provou sobreviver antes):
  × test_composition_root_selects_fixtures_when_mode_is_absent  (1 failed | 4 passed)
Ambas revertidas. Os DOIS lados do ternário estão armados.

## AC2 — guards descobertos ganham teste
405:  `test_run_endpoint_rejects_non_post_with_405`            presente
403:  `test_traversal_with_known_extension_is_forbidden`       presente
builder: `start_session_rejection_surfaces_as_visible_error` + `blank_prompt_does_not_start_a_session`
Os 8 guards de `resolveRunRequest` medem 8/8 cobertos em `coverage-final.json`.

## AC3 — complexidade
$ lizard plugin/run-endpoint.ts
  resolveRunRequest  CCN 12
  handleAgentRun     CCN 10   (era 20; sem warning)
`SessionView` permanece, com ADR 0002 corrigido após a review.

## AC4 — delegação explícita
$ grep -c '\.\.\.opts\.fallback' src/data/reflection-datasource.ts   -> 1 (só o comentário)
$ grep -c 'listBuilderSessions: () => fallback|getBuilderSession: (sessionId) => fallback|startBuilderSession: (prompt, targetAgentId)'  -> 3

## AC5 — testes divididos e asserções de estilo
$ grep -n '"54%"|"46%"|"50%"' builder.test.tsx  -> 1 hit, e é o COMENTÁRIO que documenta a troca
$ grep -n "_and_" builder.test.tsx              -> 4 hits: 3 round-trips pré-existentes + 1 comentário
Nenhuma asserção de largura literal sobrevive.

## AC6 — triagem dos 32 low
$ grep -cE '\| (FIXED|DEFERRED) \|' triage-low-findings.md  -> 32

## AC7 — gates
$ npm test        -> Test Files 19 passed (19) | Tests 191 passed (191)
                  -> PASS forma do DoD verificada em M0, M1, M5, M6, M7, M8
$ npm run typecheck -> 0 erros
$ npm run check     -> Checked 61 files. No fixes applied.
$ npx vitest run --coverage -> branch 91,90–91,92% (não determinístico; piso 89,46%)
