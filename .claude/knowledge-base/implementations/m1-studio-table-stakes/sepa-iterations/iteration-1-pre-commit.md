# SEPA — Iteration 1 / Task T1.1 / Phase Pre-COMMIT

## Plan recap
- T1.1 (skeleton do plugin + build node + health): staged diff de 10 arquivos auditado contra Files-to-edit, DoD/ACs do plano v1.2, wiring triad, boundary plugin↔src e hazard M7.

## Findings

### Stage vs Files-to-edit (hazard M7)
- [INFO] — Nenhum arquivo estranho da sessão M7 no stage. Os 10 arquivos são: 5 declarados no plano + tsconfig.json (sancionado no pre-RED) + CHANGELOG (DoD) + pnpm-lock (consequência dos deps) + 2 desvios documentados abaixo. Artefatos `.claude/` corretamente fora do stage.
- [MAJOR — desvio documentado, aceito] — `vite.config.ts` NÃO está no Files-to-edit de T1.1 (é arquivo de T2.1, com conteúdo diferente). O uso aqui (montar `theokitStudio()` no dev do próprio Studio) é o pilar (a) — e é **funcional de verdade**: `pnpm dev` serve `/_studio/api/health` e é o loop de desenvolvimento do T3.1. Não é no-op. Aceito COM registro no log de implementação (já feito, pelo seu relato). Atenção: T2.1 vai reeditar este arquivo — diff cohesion do mini-review da fase deve citar os dois toques.
- [INFO] — `tests/integration/studio-plugin.integration.test.ts` não declarado, mas exigido pelo wiring triad pilar (b) do cycle-implement — sanção estrutural, não scope creep. Vite server REAL, port 0, safe-close com race. Pilar (b) genuíno.

### Código de produção
- [INFO] — Boundary `plugin/ ↛ src/` respeitada (imports só node:* e vite types). Envelope canônico único no arquivo; interno até o 2º consumidor — coerente com meu intent DRY (helper único) + YAGNI/dead-export gate. Confirmo a expectativa: **T1.2 o exporta** — se T1.2 duplicar o shape à mão, eu flago.
- [MINOR] — `new URL(req.url...)` parseado 2× (middleware + `handleStudioRequest`). A 30 linhas de dispatcher é tolerável; quando T1.2/T2.2 crescerem o dispatch, passe o `pathname` já parseado (o REFACTOR previsto no plano "extrair router table" é o momento).
- [MINOR] — `resolveStudioVersion()` faz fs read por request de health. Dev-only e barato, mas memoizável em 1 linha. O `catch` com fallback `"unknown"` é degradação comentada e honesta, não swallow — OK.

### Testes
- [MAJOR] — **Vazamento de timer no harness `run()`:** nos casos de passthrough (`next()` chamado, `state.ended` nunca vira true), a cadeia `wait → setTimeout(wait, 5)` **continua reagendando para sempre** após o resolve — cada teste passthrough deixa um polling infinito vivo. A suíte passou (178/178), mas isso é flake/handle latente que cresce a cada task que reusar o harness (T1.2/T1.4 vão reusá-lo). Fix barato antes do commit: flag `settled` que interrompe o reagendamento (mudança test-only; re-rodar `plugin/index.test.ts`).
- [INFO] — Pragma node linha 1 ✓; os 2 reforços do pre-RED presentes (res instrumentado com `touched`; boundary `/_studio` exato tratado + `/_studioX` passthrough) ✓; 5 REDs do plano cobertos com nomes fiéis.

### DoD checkbox audit (T1.1)
- [MAJOR] — **DoD "`pnpm run build` (raiz) exit 0 + escreve `dist/plugin/index.js`" e AC "`node -e "import('@theokit/studio/plugin')"` exit 0" NÃO reportados.** Test/typecheck/check estão evidenciados; o build e o import do export map não. Rode e evidencie ANTES do commit — é checkbox do DoD, não opcional. (A ordem `vite build && tsup` está correta: o emptyOutDir do vite roda antes do tsup escrever `dist/plugin`.)
- [INFO] — Desvio `dist/spa/index.html` (só integral pós-T2.1) já registrado conforme combinado no pre-RED ✓. Deps: peers `vite >=7 <9` (resolve o caveat do deps-audit) + sdk devDep ^3.8.0 + @types/node ✓. Coverage agora instrumenta `plugin/**` ✓. `wc -l` = 100 ≤ 500 ✓. Biome exit 0 com 2 warnings pré-existentes em arquivos M7 não-tocados — aceitável (gate = exit code + zero diagnósticos nos arquivos alterados); não "consertar" arquivos alheios.

### Mensagem de commit
- [INFO] — Conventional commit ✓ (`feat(studio):`), T-id no subject e no body ✓, wiring line ✓, sem Co-Authored-By ✓ (política do projeto). CHANGELOG entry sob `[Unreleased] § Added` com escopo honesto ✓.
- [MINOR] — Subject com ~85 chars (>72). Sugestão: `feat(studio): plugin Vite ./plugin — skeleton + health (T1.1)` e o nome completo do export no body.

## Recommended action
- **Duas pendências antes do commit:** (1) corrigir o polling infinito do harness `run()` (flag `settled`; test-only) e re-rodar `plugin/index.test.ts`; (2) executar e evidenciar `pnpm run build` (raiz) + `node -e "import('@theokit/studio/plugin')"` — checkboxes do DoD ainda não provados. Com os dois verdes, o commit está autorizado do meu lado; nenhum finding CRITICAL, nenhum vazamento M7 no stage.