# Review: test-quality-maintainability (M8)

**Date:** 2026-08-04
**Reviewers:** 4 agentes — rodada 1 com 3 em paralelo (cross-validation, tests, architecture),
rodada 2 com 1 verificador adversarial que aplicou 10 mutações para provar cada correção
**Verdict:** `READY_TO_MERGE`

## O que este milestone provou sobre si mesmo

O M8 existe porque a auditoria encontrou um teste que passava com a lógica de produção invertida.
**A review encontrou que eu tinha reproduzido o mesmo defeito, três vezes** — e uma quarta coisa
pior, que não é técnica.

## Achados por rodada

### Rodada 1 — 3 agentes em paralelo (24 achados, 4 HIGH)

| id | sev | achado | estado |
|---|---|---|---|
| F-xval-1 | **HIGH** | **Timebox da triagem inventado** — horários que o git desmente | **CORRIGIDO** (`9c1ff29`) |
| F-tests-1 | **HIGH** | Só um lado do ternário armado — `const live = true` passava a suíte inteira | **CORRIGIDO** (`9c1ff29`) |
| F-tests-3 / F-xval-3 | **HIGH** | Medição do EC-3 lida de tabela truncada: 5/8, não 7/8 | **CORRIGIDO** (`9c1ff29`) |
| F-xval-2 | **HIGH** | Só 1 dos 2 caminhos do ROADMAP coberto; AC 2 descrevia código inexistente | **CORRIGIDO** (`9c1ff29`) |
| F-arch-2 / F-tests-2 / F-xval-4 | HIGH/MEDIUM | Teste de ordem de guard nunca alcançava o código | **CORRIGIDO** (`817f038`) |
| F-arch-3 / F-tests-7 | MEDIUM | "Falta de delegação é erro de tipo" — falso para aridade | **CORRIGIDO** (`817f038`) |
| F-arch-4 | MEDIUM | ADR 0002 apresentava saída de parser falho como métrica | **CORRIGIDO** (`817f038`) |
| F-tests-4 / F-xval-5 | MEDIUM | Contagem de asserções caiu 76→75 sem registro, violando a AC | **CORRIGIDO** (`9c1ff29`) |
| F-tests-5 | MEDIUM | Clamp superior sem teste | **CORRIGIDO** (`9c1ff29`) |
| F-tests-6 | MEDIUM | Guard do EC-1 olhava só os agents | **CORRIGIDO** (`9c1ff29`) |
| F-tests-8 | MEDIUM | Teste do 403 não distinguia os dois ramos `forbidden` | **CORRIGIDO** (`9c1ff29`) |
| F-arch-5 / F-arch-6 | MEDIUM | Razões de triagem #56 e #54 mais frágeis que o escrito | **RECONHECIDO** — disposição mantida, tratabilidade registrada |
| F-tests-9 | LOW | Um nome meu ainda juntava dois comportamentos | **CORRIGIDO** (`9c1ff29`) |
| F-tests-10 | LOW | `main.tsx` fora da medição de cobertura | **CORRIGIDO** (`9c1ff29`) |
| F-arch-7/9, F-xval-6/7/8/9/11/12 | LOW/INFO | Doc órfão, allowlist, ACs com oráculo errado, ADR renomeado, `refuse` sem menção | **CORRIGIDOS** |

### Rodada 2 — verificação adversarial (10 mutações)

| Mutação | Resultado |
|---|---|
| `const live = true` (sempre reflection) | **RED** ✅ — o mutante que a rodada 1 provou sobreviver |
| `const live = false` (sempre fixtures) | **RED** ✅ — o outro lado também está armado |
| Guard #2: `refuse(400)` → `refuse(500)` | **RED** ✅ |
| Guard de prompt vazio: `if (false)` | **RED** ✅ |
| `Math.min(75)` → `Math.min(100)` | **RED** ✅ |
| `isKnownAsset` → `false` | **RED** ✅ — e removendo só a asserção de mensagem o teste volta a passar: ela é o único discriminador |
| Dropar `targetAgentId` | **RED** no teste; `tsc` limpo — prova que o compilador não cobra aridade |
| Deletar a delegação inteira | `TS2741` — prova que cobra membro |
| Reordenar os guards | **RED** ✅ — exatamente 1 teste em 189 detecta |
| `useState(54)` → `useState(60)` | **RED** ✅ — a asserção restaurada é load-bearing |
| Título de sessão do fixture → `"live-agent"` | **RED** ✅ — o guard ampliado pega |

**10 mutações, 10 mortas**, cada uma pelo teste específico que a correção adicionou.

Achados residuais da rodada 2: **F-r2-7** (MEDIUM — dois números de cobertura contraditórios no
sumário) e três LOW, todos corrigidos em `6b26183`.

## O achado que não é técnico

`F-xval-1`. O cabeçalho da triagem declarava *"início 11:20, fim 12:05 — 45 min, dentro do teto de
2h"*. **Nenhum desses horários foi medido.** Preenchi o campo que o ADR A5 exige com números
plausíveis. O git desmente com folga: o milestone inteiro rodou das 12:26 às 13:03, e a janela
declarada terminava 21 minutos antes de o plano que a encomenda existir.

Um número inventado num artefato de controle é pior que campo vazio — transforma o timebox de
mecanismo em decoração, e é a classe exata de coisa que este ciclo existe para impedir. A correção
está no próprio arquivo, com a fabricação declarada, não escondida no log.

## O erro que se repetiu depois de eu registrar a lição

`F-tests-3` mostrou que eu lera a cobertura de uma tabela **truncada** no terminal e tomara o
início elidido por ausência: o baseline era 5/8 guards, não 7/8, e refatorei a cadeia com dois
descobertos. Escrevi a lição no sumário: *"não bastou medir, foi preciso medir na fonte certa"*.

Duas seções abaixo, no mesmo documento, `F-r2-7` encontrou a cobertura de **um arquivo**
(`run-endpoint.ts`, 91,04%) transcrita como se fosse a global. A lição escrita não impediu a
repetição. O que impediu foi um revisor recontar da fonte.

## Quality gates

| Gate | Resultado |
|---|---|
| `npm test` | **191/191** (19 arquivos) + guard do ROADMAP em 6 milestones |
| `npm run typecheck` | limpo |
| `npm run check` (biome) | 61 arquivos, 0 diagnósticos |
| `npm run build` | 0 erros |
| Cobertura de branch | **91,90–91,92%** (não determinística — ver abaixo); piso 89,46% |
| `pytest .claude/skills/implement/tests/` | 121 passed |
| `run_validation.py` | 8 PASS, 0 FAIL, 2 WARN, 1 N/A |
| `/code-quality` | `PASS_WITH_CAVEATS`, **0 HARD** |

**Sobre a não-determinação da cobertura:** duas execuções limpas consecutivas dão 91,92% e 91,90%,
com denominadores diferentes (443/482 e 441/480). A variação vem do teste de integração, que sobe
um Vite dev server real. Reportar intervalo é a resposta honesta; fingir precisão foi o que
produziu os dois números errados que a rodada 2 pegou.

## Cross-validation

**Plan tasks: 7 | Fully implemented: 7 | Partial: 0 | Missing: 0**

Divergências declaradas: 4 no sumário original + 3 acrescentadas pela review (substituição de
teste no T2.1, AC de follow-up inexistente, caminho do ADR).

## Dívida registrada, não silenciada

- Triagem #56 (confiança no header `Host`), #54 (corpo sem limite) e #53 (fetch sem timeout) —
  a review de arquitetura mostrou que a razão do adiamento de #56 e #54 é **mais frágil** que o
  escrito: o fix de #56 é tratável (allowlist de Host + escape por env, precedente
  `server.allowedHosts` do Vite), e o guard de origem de #54 não cobre cliente sem header
  `Origin`. Disposição mantida para o M8; os três seguem como os candidatos mais fortes a task
  própria antes do primeiro `npm publish`.
- `onInvalidSkill` (#76) foi adiado pela tabela de triagem, não pelo allowlist com sunset que o
  `code-quality-golden-rule.md` § 4 exige. Severidade LOW (símbolo interno, não export público),
  mas é lacuna de processo.
- `_TEST_DIR_RE` do `check_wiring` segue sem cobrir `testing/`, `mocks/`, `e2e/` — latente, herdado
  do M7.

## Verdict: READY_TO_MERGE

Zero BLOCKER. Zero HIGH aberto — os 4 HIGH da rodada 1 foram corrigidos e **provados por mutação**
na rodada 2; o MEDIUM e os 3 LOW que a rodada 2 levantou foram corrigidos em `6b26183`. Nenhuma
regressão em nenhum gate.
