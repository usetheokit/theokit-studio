# Transcrição de aceitação — M7 contra a tag v0.5.0

Alvo: worktree próprio de `v0.5.0` (merge `1488310`), não a árvore de trabalho.

## AC1 — README descreve o Agent Builder como superfície única
$ grep -n "^| Studio surface" -A 3 README.md
7:| Studio surface | What you get |
8-|---|---|
9-| Agent Builder | A build session UI — describe what you want, pick a target agent, ...
$ grep -c "removed in \`74a96c6\`" README.md      -> 1
$ grep -c -E 'theo-(lens|memory|rag)' README.md   -> 0
Única menção às telas removidas está na seção "Scope — what was removed" (linha 31).

Prova de vida do defeito: mutando o hero da tag de volta para
"Describe an agent in plain language and get a working agent file back":
$ npx vitest run tests/docs/readme-contract.test.ts
  × contrato do README > não promete que o Builder devolve um arquivo de agente
  Tests  1 failed | 6 passed (7)
Mutante revertido.

## AC2 — DoD de M1/M2/M3 reconciliado, bullets de uma linha
$ python3 tests/roadmap_dod_shape_test.py
PASS forma do DoD verificada em M0, M1, M5, M6, M7, M8   (exit 0)
$ extract_acceptance_criteria.py --milestone M1  -> 4 critérios, todos exercitáveis
$ extract_acceptance_criteria.py --milestone M2|M3|M4 -> "is not in the roadmap"
(M2/M3/M4 saíram do conjunto selecionável do super-loop; texto preservado em seção própria)

## AC3 — scenario "offline" removido
packages/studio/src/bootstrap.ts:19  const VALID_SCENARIOS = new Set(["default", "empty"]);
packages/studio/src/data/types.ts:53 export type FixtureScenario = "default" | "empty";

## AC4 — CounterName só emitidos; reload/version/warrant removidos
packages/studio/src/data/metrics.ts:9  export type CounterName = "datasource_calls_total";
$ grep -c "reload\|biome-ignore\|setVersion" packages/studio/src/app/use-listing.ts -> 0

## AC5 — decisão sobre a API host-facing
$ grep -c "_studio/api/tools" README.md      -> 1
$ grep -c "_studio/api/workflows" README.md  -> 1
$ grep -c "agents/{name}/run" README.md      -> 1
Documentados como API host-facing, com envelope de erro e chaves de provider exigidas.

## AC6 — gates verdes
$ npm test        -> Test Files 19 passed (19) | Tests 166 passed (166) | exit 0
                  -> PASS forma do DoD verificada em M0, M1, M5, M6, M7, M8
$ npm run typecheck -> tsc --noEmit, 0 erros
$ npm run check     -> Checked 61 files. No fixes applied. (0 diagnostics)
$ npm run build     -> 0 erros
$ npx vitest run --coverage -> All files 95.69 | branch 90.17 | 95.74 | 95.69
$ python3 -m pytest .claude/skills/implement/tests/test_check_wiring.py -q -> 13 passed
