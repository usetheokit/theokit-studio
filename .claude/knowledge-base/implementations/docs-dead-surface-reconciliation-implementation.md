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

Medidos após a rodada de correções da review (números re-executados, não lembrados — a
primeira versão desta tabela errava o baseline e a cobertura, review F-xval-7):

| Gate | Resultado |
|---|---|
| `npm test` | **165/165** (19 arquivos) — o baseline pré-M7 era **141**, não 149 |
| `npm run typecheck` | limpo |
| `npm run check` (biome) | limpo, 0 warnings, **nenhuma supressão nova** |
| `npm run build` | vite + tsup, 0 erros |
| Cobertura de branch global | **90,17%** — piso de 89,46% mantido |
| `tests/roadmap_dod_shape_test.py` | PASS para **M0…M8** (9 milestones, descobertos do arquivo) |
| `pytest .claude/skills/implement/tests/test_check_wiring.py` | 13/13 |
| `run_validation.py` | 8 PASS, 0 FAIL, 2 WARN, 1 N/A |

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

## Bug na própria ferramenta — e o conserto errado que a review pegou

`check_wiring.py` reportou `FixtureScenario` como símbolo morto. Falso positivo real: o filtro de
pilar (a) descartava qualquer arquivo cujo *basename* contivesse `fixture`, e
`fixture-datasource.ts` é produção — a implementação de `StudioDataSource` que serve dados
roteirizados.

**A primeira correção estava errada, e a review provou.** Ela demoveu `fixture` a segmento de
caminho, o que quebrou nas duas direções:

- passou a excluir `packages/studio/src/data/fixtures/registry.ts`, que é produção e é importado
  por `fixture-datasource.ts` (novo falso FAIL);
- passou a **contar** `src/test-helpers/*.ts` como caller de produção (**falso PASS**) — um hard
  gate falhando *aberto*, que é estritamente pior: falso FAIL é barulhento e alguém investiga;
  falso PASS é silencioso e licencia código morto.

E a causa-raiz continuava viva: o problema nunca foi a palavra `fixture` na lista — é **casar
substring no basename**. `latest-run.ts` contém "test"; `event-inspector.ts` contém "spec".

**A causa de processo é que eu pulei o teste de regressão** (`rules/testing.md` § 3), num commit
cuja mensagem se gabava de ter achado um bug. `.claude/skills/implement/tests/test_check_wiring.py`
já existia. Seis casos teriam pego isto antes de nascer — e foram exatamente esses seis que
escrevi depois, com 3 falhando contra o código anterior.

Correção final: dois sinais, porque são duas perguntas. Convenção de **sufixo** no nome
(`*.test.ts`, `*_test.py`, `mock` como token delimitado) e **diretório** de apoio (`tests/`,
`spec/`, `test-*/`). `fixtures` sai de vez — `src/data/fixtures/` entra no bundle, e uma pasta
`fixtures` sob raiz de teste já é excluída pelo `--exclude-dir` do grep.

| Sonda | Original | 1ª correção | Final | Correto? |
|---|---|---|---|---|
| `fixture-datasource.ts` (produção) | FAIL | PASS | **PASS** | sim |
| `src/data/fixtures/registry.ts` (produção) | PASS | **FAIL** | **PASS** | sim |
| `src/test-helpers/builders.ts` (apoio) | FAIL | **PASS** | **FAIL** | sim |
| `latest-run.ts` / `event-inspector.ts` (produção) | FAIL | FAIL | **PASS** | sim |
| símbolo só em `tests/fixtures/` | FAIL | FAIL | **FAIL** | sim |

Quatro bugs reais encontrados nas ferramentas do kit ao usá-las (três em `check_wiring.py`, um em
`run_discover_plan_score.py` durante o M6) — e um quinto, meu, introduzido ao consertar o
terceiro.

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
6. **`check_wiring.py` foi editado fora de qualquer task** (review F-xval-9). Está descrito na
   seção acima e no CHANGELOG, mas faltava nesta lista — que é onde um auditor de "plano vs diff"
   procura por arquivo tocado fora do plano.
7. **A API real do parser de config não é a que o plano nomeia** (review F-xval-8). O plano
   escreveu `readStudioConfig` devolvendo `{config, warnings}`; a produção tem
   `parseStudioConfig(raw): StudioConfig`, com os warnings agregados num `console.warn`. O
   comportamento exigido é o mesmo; o nome no plano estava errado.
8. **O union de `FixtureScenario` mora em `types.ts`, não em `fixture-datasource.ts`** (review
   F-xval-8). O plano listou o arquivo errado em "Files to edit"; o valor foi removido no arquivo
   onde o tipo de fato é declarado.
9. **O halt-loop do ralph-loop não dirigiu a implementação.** As seis tasks foram conduzidas
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

Rodada 2 — mutações aplicadas e revertidas para provar as correções da review:

| Mutação | Suíte | Resultado |
|---|---|---|
| `useEffect(..., [ds])` → `[]` | `use-listing` | **RED** ✅ (mata o refetch; antes da review nenhum teste travava a lista de deps) |
| `CounterName` ganha `health_errors_total` sem emissor | `metrics` | **RED** ✅ (o oráculo antigo, com literal, passaria) |
| README volta ao hero "get a working agent file back" | `readme-contract` | **RED** ✅ |
| `check_wiring`: os 3 casos da tabela acima | `pytest` | **RED** ✅ contra o código anterior |

Todos os mutantes revertidos; árvore verificada limpa a cada rodada.

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
