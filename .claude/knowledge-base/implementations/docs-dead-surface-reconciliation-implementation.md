---
slug: docs-dead-surface-reconciliation
milestone_id: M7
date: 2026-08-04
status: IMPLEMENTATION_COMPLETE
plan: knowledge-base/plans/docs-dead-surface-reconciliation-plan.md
---

# Implementação — M7 Reconciliação de documentação e superfície morta

## Tasks

| Task | Commit | Estado | Entrega |
|---|---|---|---|
| T1.1 | `d2fd17b` | committed | README descreve a superfície única e declara a remoção citando `74a96c6` |
| T1.2 | `e4cd23a` | committed | DoD de M1/M2/M3 em bullets de uma linha; M1 exercitável, M2/M3 cancelados com data |
| T2.1 | `49be748` | committed | `scenario:"offline"` sai de `StudioConfig`, `VALID_SCENARIOS` e `FixtureScenario` |
| T3.1 | `eab7d1d` | committed | `CounterName` reduzido ao único contador com emissor |
| T3.2 | `cdffdc2` | committed | `reload()`, `version` e o `biome-ignore` removidos juntos |
| T4.1 | `db2bc73` | committed | API host-facing documentada; status e content-type fixados por teste |

## Gates

| Gate | Resultado |
|---|---|
| `npm test` | **155/155** (19 arquivos) — era 149 antes do M7 |
| `npm run typecheck` | limpo |
| `npm run check` (biome) | limpo, 0 warnings, **nenhuma supressão nova** |
| `npm run build` | vite + tsup, 0 erros |
| Cobertura de branch global | **89,93%** — piso de 89,46% mantido |
| `tests/roadmap_dod_shape_test.py` | PASS para M1, M2, M3 |
| `run_validation.py` | 8 PASS, 0 FAIL, 1 WARN (code-quality `PASS_WITH_CAVEATS`), 1 N/A |

## Wiring triad

Cinco das seis tasks são **remoção de superfície ou documentação** — nenhum símbolo de produção
novo nasceu neste milestone, então não há pilar (a) a satisfazer para símbolo novo. O único
símbolo que a re-verificação independente examina é `FixtureScenario`, que foi *estreitado*, não
criado.

- **Pilar (a) — `FixtureScenario`: PASS.** Chamado em `packages/studio/src/data/fixture-datasource.ts:16,22`.
- **Pilar (b) — `FixtureScenario`: deferido explicitamente.**

<!-- ADR-DEFER-WIRING-B: FixtureScenario: é um type alias de TypeScript, apagado na compilação. Não existe fronteira de runtime que um teste de integração possa exercitar; o que prova a mudança é o typecheck (que falharia se algum leitor comparasse com o valor removido) e os testes de unidade de bootstrap.test.ts. Um teste de integração aqui seria teatro. -->

- **Pilar (c):** o plano não declara métrica de runtime para nenhuma task. A poda do T3.1 *melhora*
  o pilar (c) do projeto: os contadores que restam são os que de fato observam algo.

## Bug encontrado e corrigido na própria ferramenta

`check_wiring.py` reportou `FixtureScenario` como símbolo morto. Era **falso positivo**: o filtro
de pilar (a) descartava qualquer arquivo cujo *basename* contivesse `fixture`, e
`fixture-datasource.ts` é código de produção — a implementação de `StudioDataSource` que serve
dados roteirizados, não um fixture de teste.

Correção: `test` / `spec` / `mock` seguem casando no basename (são convenções de sufixo
inequívocas); `fixture` passa a ser sinal de **diretório** — arquivos sob `fixtures/` continuam
excluídos, um arquivo de produção que menciona fixtures no nome não é mais.

Verificado nas duas direções:

| Sonda | Antes | Depois | Correto? |
|---|---|---|---|
| `FixtureScenario` (produção, em `fixture-datasource.ts`) | FAIL | **PASS** | sim |
| `lookupOrder` (existe só em `tests/fixtures/demo-project/`) | FAIL | **FAIL** | sim |

É o quarto bug real encontrado nas ferramentas do próprio kit ao usá-las (três em
`check_wiring.py` e um em `run_discover_plan_score.py` durante o M6).

## Divergências do plano — declaradas

1. **Caminho do teste de contrato do README.** O plano dizia `docs/README.contract.test.ts`. Não
   existe config de vitest na raiz do monorepo (`npm test` faz `pnpm -r run test`), então um teste
   ali não seria executado por runner nenhum. Realocado para
   `packages/studio/tests/docs/readme-contract.test.ts`.
2. **Língua do oráculo do T1.1.** O plano escreveu o regex de remoção em português; o README é
   público e está em inglês (como já estava antes do M7). O regex acompanha a língua do artefato —
   a exigência é idêntica: verbo de remoção adjacente ao SHA que a causou.
3. **`useListing` não tinha teste direto.** O plano supôs `use-listing.test.tsx` existente; o
   arquivo não existia (o hook só tinha cobertura indireta pelos testes do builder). Criado.
4. **EC-7 não virou teste novo.** O `snapshot_returns_a_copy_not_a_live_reference` já existente em
   `metrics.test.ts` mata os mesmos mutantes (retorno direto do state e spread raso). Adicionar
   seria padding de suíte — precisamente o que o M8 existe para combater.
5. **Escopo do T4.1 menor que o previsto.** O plano afirmava que "nenhum teste assevera
   `{items: [...]}`" nesses endpoints. Estava parcialmente errado: o
   `test_tools_workflows_and_skills_aggregates_over_real_http` já cobria a forma. A lacuna real era
   status e content-type — são essas as asserções novas. Registrado em vez de inflar a entrega.
6. **O halt-loop do ralph-loop não dirigiu a implementação.** As seis tasks foram conduzidas
   diretamente no ciclo RED → GREEN → REFACTOR → COMMIT. Consequência concreta: o
   `.progress-{slug}.json` foi escrito ao final, não a cada iteração, e por isso os gates que o
   leem (`progress_schema`, `checkpoint_consistency`, `wiring_triad`) pularam na primeira execução
   de `run_validation.py`. Após escrever o checkpoint com os SHAs reais, os três passaram a rodar —
   e foi justamente o `wiring_triad` que expôs o bug da ferramenta acima. A perda real foi de
   *auditoria contínua*, não de disciplina TDD: cada task teve RED verificado antes do GREEN.

## Verificação por mutação

| Mutação | Suíte | Resultado |
|---|---|---|
| `sendJson(res, 200, …)` → `202` nos agregados | integração | **RED** ✅ (mata os 2 testes novos do T4.1, nenhum outro) |
| README: tabela de features com as 5 superfícies antigas | `readme-contract` | **RED** ✅ (estado pré-T1.1) |
| ROADMAP: bullets de DoD multi-linha | `roadmap_dod_shape` | **RED** ✅ (estado pré-T1.2) |
| `VALID_SCENARIOS` com `"offline"` | `bootstrap` | **RED** ✅ (estado pré-T2.1) |
| `CounterName` com os 5 nomes | `metrics` | **RED** ✅ (estado pré-T3.1) |
| `useListing` devolvendo `reload` | `use-listing` | **RED** ✅ (estado pré-T3.2) |

Mutante do T4.1 revertido com `git restore`; árvore verificada limpa.

## Coverage Matrix — DoD do ROADMAP § M7

| Bullet | Task | Estado |
|---|---|---|
| README descreve o Agent Builder como superfície única | T1.1 | ✅ |
| DoD de M1/M2/M3 reconciliado, bullets de uma linha | T1.2 | ✅ |
| `scenario:"offline"` removido ou com efeito | T2.1 | ✅ removido |
| `CounterName` só emitidos; `reload()`/`version`/warrant | T3.1 + T3.2 | ✅ |
| Decisão sobre `/_studio/api/{tools,workflows}` e run | T4.1 | ✅ documentados, contrato dos 2 agregados fixado |
| Gates verdes; nenhum finding de completude sem justificativa | validação final | ✅ |

**7/7.** Os 8 findings de completude da auditoria estão fechados: #1 (T1.1), #12 (T1.2), #2 (T2.1),
#3 (T3.1), #4/#5/#7 (T3.2), #8 (T4.1).

<promise>IMPLEMENTATION_COMPLETE</promise>
