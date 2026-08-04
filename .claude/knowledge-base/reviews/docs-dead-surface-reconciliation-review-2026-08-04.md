# Review: docs-dead-surface-reconciliation (M7)

**Date:** 2026-08-04
**Reviewers:** 5 agentes — rodada 1 com 4 em paralelo (cross-validation, tests, completeness-docs,
architecture), rodada 2 com 1 verificador adversarial que aplicou mutação para provar cada correção
**Verdict:** `READY_TO_MERGE`

## Como este milestone quase passou errado

O M7 existe para tirar inverdade da documentação. **A rodada 1 encontrou que eu tinha trocado
inverdades velhas por inverdades novas** — dois BLOCKER, ambos meus, ambos no artefato que o
milestone existe para consertar:

1. O hero do README que escrevi prometia *"get a working agent file back"*. O Builder não escreve
   arquivo nenhum: `createReflectionDataSource` sobrescreve apenas `listAgents` e `listSkills`, de
   modo que `startBuilderSession` cai no fixture mesmo em `mode: "live"`, e não existe um
   `writeFileSync` em produção. A própria tela dizia o contrário para o usuário.
2. O critério 3 que escrevi para o M1 exigia escrever arquivo — inexercitável pelo mesmo motivo.
   Eu tinha substituído dois critérios inexercitáveis por um critério inexercitável novo.

A rodada 2 então provou que a minha **primeira correção do M1 também não resolvia**: as notas
CANCELADO ficaram como bullets `- [ ]` dentro do bloco de `**Definition of done:**`, e o extrator
do `cycle-acceptance` lê todo bullet do bloco como critério. Rodando o extrator e o
`compute_acceptance_verdict.py` de verdade, com um registro de evidência otimista, o resultado era
`NOT_VALIDATED`. M1 seguia inaceitável.

Isso é o valor do gate, não uma falha dele.

## Achados por rodada

### Rodada 1 — 4 agentes em paralelo (15 achados)

| id | sev | achado | estado |
|---|---|---|---|
| F-docs-1 | **BLOCKER** | Hero do README promete arquivo que o Builder não escreve | **CORRIGIDO** (`d5201e0`) |
| F-docs-2 | **BLOCKER** | Critério 3 do M1 inexercitável | **CORRIGIDO** (`d5201e0` + `cce43ad`) |
| F-arch-1 | HIGH | Minha correção do `check_wiring` abriu um **falso PASS** num hard gate | **CORRIGIDO** (`cf8d4cb`) |
| F-tests-1 | HIGH | Oráculo do DoD fixava M1–M3; M0 e M5 tinham o mesmo defeito | **CORRIGIDO** (`d5201e0`) |
| F-tests-2 / F-xval-6 / F-arch-2 | HIGH | Correção de gate sem teste de regressão (Rule 7) | **CORRIGIDO** (`cf8d4cb`) |
| F-tests-3 / F-arch-6 / F-xval-5 | HIGH | Guard não alcançado por gate algum e quebrado sob pytest | **CORRIGIDO** (`d5201e0`) |
| F-docs-3 | HIGH | "pin v0.3.0" inacionável — pacote nunca publicado | **CORRIGIDO** (`d5201e0`) |
| F-docs-4 | HIGH | `theokit dev` não monta o Studio — único quickstart não funcionava | **CORRIGIDO** (`d5201e0`) |
| F-docs-5 | HIGH | Preâmbulo do ROADMAP descrevia o produto removido | **CORRIGIDO** (`d5201e0`) |
| F-docs-6 / F-arch-4 | HIGH | M4 dependia de M2/M3 → muro de dependência permanente | **CORRIGIDO** (`cce43ad`) |
| F-arch-5 / F-docs-10 | MEDIUM | Invariantes 4 e 5 do `CLAUDE.md` mandavam comportamento removido | **CORRIGIDO** (`d5201e0`) |
| F-tests-5 | MEDIUM | Mutante `[ds]` → `[]` sobrevivia à suíte inteira | **CORRIGIDO** (`d86f1fd`) |
| F-arch-9 | MEDIUM | `loadError` nunca limpo num load bem-sucedido (bug real) | **CORRIGIDO** (`d86f1fd`) |
| F-tests-4 / F-arch-7 | MEDIUM | Oráculo de métricas prometia checar emissor e comparava literal | **CORRIGIDO** (`d86f1fd`) |
| F-xval-3 / F-xval-4 / F-xval-11 | MEDIUM | Duas ACs falsas e o gate `acceptance_criteria` pulando com 0 critérios | **CORRIGIDO** (`adc7004`) |
| F-arch-3 | MEDIUM | Substring no basename ainda quebrava `latest-run.ts` / `event-inspector.ts` | **CORRIGIDO** (`cf8d4cb`) |
| F-arch-8 / F-tests-8 | LOW | Mensagem sem conjunto aceito; casos negativos faltando | **CORRIGIDO** (`d86f1fd`) |
| F-xval-7/8/9 | LOW | Números errados e 3 divergências não declaradas no sumário | **CORRIGIDO** (`adc7004`) |

### Rodada 2 — verificação adversarial por mutação (14 verificações)

| id | verificação | veredito |
|---|---|---|
| F-r2-1 | Hero do README + 2 guards | **CONFIRMADO** — mutação para o hero antigo mata os 2 |
| F-r2-3 | `check_wiring` nas duas direções | **CONFIRMADO** — 3 RED contra `cf8d4cb^`, incluindo o falso PASS |
| F-r2-4 | Guard do ROADMAP | **CONFIRMADO** — descobre 9, RED em bullet truncado do M0, roda nos 3 caminhos |
| F-r2-5 | `[ds]` e `loadError` | **CONFIRMADO** — os 2 mutantes mortos |
| F-r2-6 | Oráculo de métricas | **CONFIRMADO** — contador órfão mata o teste |
| F-r2-7 | Muro do M4 | **CONFIRMADO** |
| F-r2-9 | Regressões | **CONFIRMADO** — nenhuma |
| F-r2-2 | `/acceptance M1` executável | **NÃO confirmado** → **CORRIGIDO** (`cce43ad`) |
| F-r2-8 | Sem inconsistência estrutural residual | **NÃO confirmado** → **CORRIGIDO** (`cce43ad`) |
| F-r2-10 | Metade "ao vivo" alcançável pelo comando documentado | **NÃO confirmado** → **CORRIGIDO** (`cce43ad`) |
| F-r2-11 | Tabela do run endpoint completa | **NÃO confirmado** → **CORRIGIDO** (`cce43ad`) |
| F-r2-13 | CHANGELOG sem "fixar v0.3.0" | **NÃO confirmado** → **CORRIGIDO** (`cce43ad`) |
| F-r2-12 / F-r2-14 | "injeta" vs "aceita"; paridade de linhas pendentes | PARCIAL → **CORRIGIDO** (`cce43ad`) |

## O bug que eu introduzi consertando um bug

`check_wiring.py` reportava `FixtureScenario` como morto — falso positivo real. **Minha primeira
correção estava errada nas duas direções:** excluiu `src/data/fixtures/registry.ts`, que é
produção, e passou a **contar** `src/test-helpers/*.ts` como caller de produção. O segundo é o
grave: um hard gate falhando *aberto* reporta código morto como vivo.

A causa-raiz que eu não vi: o problema nunca foi a palavra "fixture" na lista — é casar
**substring no basename**. `latest-run.ts` contém "test"; `event-inspector.ts` contém "spec".

A causa de processo: **pulei o teste de regressão**, num commit cuja mensagem se gabava de ter
achado um bug. O arquivo de teste já existia. Os seis casos que escrevi depois pegariam o erro
antes dele nascer — três deles falham contra o código anterior.

## Verificação por mutação (a evidência que sustenta o veredito)

| Mutação | Suíte | Resultado |
|---|---|---|
| README volta ao hero "get a working agent file back" | `readme-contract` | **RED** ✅ |
| `check_wiring` volta a `cf8d4cb^` | pytest | **RED** ✅ (3 casos, incl. o falso PASS) |
| Bullet de DoD do **M0** quebrado em 2 linhas | `roadmap_dod_shape` | **RED** ✅ (o guard antigo era cego a M0) |
| `useEffect(..., [ds])` → `[]` | `use-listing` | **RED** ✅ |
| Remover `setLoadError(null)` do `.then` | `use-listing` | **RED** ✅ |
| `CounterName` ganha contador sem emissor | `metrics` | **RED** ✅ (o oráculo antigo passaria) |
| `sendJson(200)` → `202` nos agregados | integração | **RED** ✅ |

Todos revertidos; árvore verificada limpa.

## Quality gates

| Gate | Resultado |
|---|---|
| `npm test` | **166/166** (19 arquivos) + guard do ROADMAP |
| `tests/roadmap_dod_shape_test.py` | PASS — M0, M1, M5, M6, M7, M8 |
| `pytest .claude/skills/implement/tests/` | 121 passed |
| `npm run typecheck` | limpo |
| `npm run check` (biome) | limpo, 0 warnings, nenhuma supressão nova |
| `npm run build` | vite + tsup, 0 erros |
| Cobertura de branch global | **90,17%** (piso 89,46%) |
| `run_validation.py` | 8 PASS, 0 FAIL, 2 WARN, 1 N/A — 2 execuções idênticas |
| `/code-quality` | `PASS_WITH_CAVEATS`, **0 HARD**, 5 SOFT_FLOOR (`symbol_fab_unverifiable_typescript`) |

## Defeito de ambiente observado

Uma execução de `run_validation.py` reportou `npm test` FAIL enquanto o mesmo comando passava
manualmente; as duas execuções seguintes deram 0 FAIL. A suíte levou 31s naquela rodada contra 6–8s
nas demais (cache frio). Registrado como observação, não como falha confirmada — é o mesmo padrão
visto na aceitação do M6. Se reaparecer, o candidato é timeout do gate, não a suíte.

## Cross-validation

**Plan tasks: 6 | Fully implemented: 6 | Partial: 0 | Missing: 0 | Diverged: 0**

Os 6 bullets de DoD do ROADMAP § M7 estão cobertos. **9 divergências do plano declaradas** no
sumário de implementação (3 delas só depois que a review as apontou).

## Dívida registrada, não silenciada

- `_TEST_DIR_RE` do `check_wiring` não cobre `testing/`, `mocks/`, `e2e/`, `testdata/`, `support/`
  (direção de falso PASS) e a regra `_test\.` descarta um hipotético `ab_test.ts`. **Nenhum caminho
  do repositório atual é mal classificado** — latente, não ativo. Candidato a M8.
- Os guards do README são travas literais contra as inverdades específicas que nasceram aqui, não
  um oráculo geral. Prosa de intenção não tem oráculo mecanizável — é o que o blueprint (decisão 5)
  concluiu do prior art, e continua verdade.
- 8 findings MEDIUM do M6 (contrato HTTP) seguem abertos e fora do escopo do M7.

## Verdict: READY_TO_MERGE

Zero BLOCKER. Zero HIGH aberto. Os 2 BLOCKER e os 7 HIGH da rodada 1 foram corrigidos e
**verificados por mutação** na rodada 2; os 5 achados que a rodada 2 levantou foram corrigidos em
`cce43ad` e re-verificados. Nenhuma regressão.
