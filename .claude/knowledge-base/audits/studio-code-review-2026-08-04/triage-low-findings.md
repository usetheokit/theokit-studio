# Triagem dos findings `low` — auditoria de 2026-08-04

**Milestone:** M8 — T5.1
**Fonte:** `findings.db` desta pasta, `select … where severity='low'` → **32 linhas**
**Timebox (ADR A5):** início `11:20`, fim `12:05` — **45 min**, dentro do teto de 2h
**Regra:** cada finding sai `FIXED` ou `DEFERRED`, com razão de uma linha. Nenhum é fechado como
"não é problema" sem razão escrita.

Este arquivo é um snapshot da auditoria nomeada acima. Uma auditoria nova é um ciclo novo (EC-7).

## Triagem

| # | Arquivo:linha | Título (resumido) | Status | Razão |
|---|---|---|---|---|
| 3 | `src/data/metrics.ts:4` | 4 de 5 contadores nunca podem ser não-zero | FIXED | M7 T3.1 — `CounterName` reduzido ao único com emissor; oráculo varre o código de produção |
| 4 | `src/app/use-listing.ts:40` | `reload()` sem caller de produção | FIXED | M7 T3.2 — `reload`, `version` e o `biome-ignore` removidos juntos |
| 5 | `src/pages/builder/index.tsx:120` | Duas entradas de nav levam a telas permanentemente vazias | DEFERRED | "Scheduled" e "Templates" são fake doors de produto; removê-las é decisão de produto, não de engenharia — mesma classe da Q1 aberta do M7 |
| 14 | `plugin/index.ts:79` | Endpoints sem consumidor no repo | FIXED | M7 T4.1 — documentados como API host-facing com contrato fixado por teste |
| 22 | `plugin/index.ts:89` | `matchRunPath` chamado duas vezes | DEFERRED | O dispatcher chama para rotear e `handleAgentRun` para extrair o nome; unificar exigiria passar o match adiante e acoplar o handler ao dispatcher. Custo > ganho |
| 28 | `src/pages/builder/index.tsx:168` | Literais `"k"`/`"n"` de atalho duplicados | DEFERRED | Preferência de organização; dois usos, abaixo da regra de 3 |
| 29 | `src/pages/builder/index.tsx:182` | Nomes vagos `visible`/`s`/`ds` | DEFERRED | `ds` é convenção estabelecida em todo o codebase (DataSource); renomear seria churn amplo por estética |
| 30 | `src/pages/builder/index.tsx:235` | `Extract<>` re-derivando união literal | DEFERRED | Funciona e é type-safe; simplificar é preferência |
| 31 | `src/pages/builder/index.tsx:79` | `FOLLOW_UP_REPLY` fixture dentro do componente | DEFERRED | Contradiz o DIP do arquivo e é achado legítimo, mas mover a resposta roteirizada para o datasource é mudança de comportamento observável — merece task própria, não triagem |
| 32 | `src/pages/builder/index.tsx:174` | Par de reset "nova sessão" repetido | DEFERRED | Duas ocorrências; abaixo da regra de 3 |
| 33 | `src/pages/builder/index.tsx:310` | Listas Pinned/Tasks repetem 15 linhas | DEFERRED | Duas ocorrências; extrair agora é generalização prematura (YAGNI) |
| 34 | `src/pages/builder/index.tsx:1` | Módulo de 509 linhas com 4 componentes | DEFERRED | Dividir arquivo grande sem conceito de domínio que justifique o corte é churn; reabrir se um dos componentes ganhar consumidor externo |
| 36 | `src/pages/builder/session-view.tsx:88` | Limites 25/75 repetidos no `aria-value*` | DEFERRED | O teste do clamp (T4.1) agora assevera o limite; a duplicação é de constante, não de conhecimento de negócio |
| 37 | `src/pages/builder/session-view.tsx:78` | `detailsFromClose` é latch de mão única | DEFERRED | Comportamento intencional (fechar o review volta aos detalhes e fica); renomear a variável seria o fix real, e é estética |
| 38 | `src/pages/builder/session-view.tsx:23` | Totais de diff recomputados em dois lugares | DEFERRED | Duplicação de cálculo trivial em dois pontos; abaixo da regra de 3 |
| 39 | `plugin/index.ts:27` | `API_PREFIX` declarado e contornado | FIXED | Removido no M6 — `grep -c API_PREFIX` retorna 0 |
| 40 | `plugin/index.ts:88` | `endsWith("tools")` re-testa rota já casada | DEFERRED | Duas rotas num handler compartilhado; separar em dois `if` custa mais linhas que economiza |
| 41 | `src/bootstrap.ts:49` | `as StudioConfig[...]` depois do `Set.has` | DEFERRED | O cast é a forma idiomática de estreitar após membership em `Set<string>`; o M8 adicionou teste para o type guard que o precede |
| 42 | `src/bootstrap.ts:84` | `window as Window & {...}` inline em dois arquivos | DEFERRED | Duas ocorrências; declarar global exigiria `.d.ts` para dois usos |
| 52 | `plugin/reflection-api.ts:94` | Timeout por item sem orçamento total | DEFERRED | Risco real, mas é dev server local com N agents do próprio projeto; endereçar exige decidir o orçamento — task própria |
| 53 | `src/data/reflection-datasource.ts:38` | `fetch` sem timeout/`AbortSignal` | DEFERRED | Mesma classe: dev server local; um `AbortSignal.timeout` é uma linha, mas escolher o valor é decisão de produto |
| 54 | `plugin/run-endpoint.ts:98` | Corpo lido sem limite de tamanho | DEFERRED | Superfície local, mesma origem (o 403 de origem já é o primeiro guard). Registrar antes do primeiro `npm publish` |
| 55 | `plugin/static-serve.ts:155` | `fs` síncrono no caminho da requisição | DEFERRED | Dev server single-user; o custo é real mas o impacto observável é nulo neste contexto |
| 56 | `plugin/run-endpoint.ts:84` | Defesa same-origin confia no header `Host` | DEFERRED | Achado legítimo de segurança; a mitigação correta depende de saber se o host roda atrás de proxy — precisa de decisão, não de patch |
| 57 | `plugin/index.ts:126` | Handler de última linha ecoa erro interno ao cliente | DEFERRED | Dev-only por contrato (`CLAUDE.md` invariante 6); reabrir se o plugin for usado fora de dev |
| 65 | `plugin/index.test.ts:105` | Espera resposta com poll de 5ms | DEFERRED | Flakiness potencial não observada em nenhuma das ~40 execuções desta sessão; reabrir ao primeiro flake real |
| 75 | `plugin/static-serve.test.ts:100` | EC-13 documentado em 3 lugares, testado em 1 | DEFERRED | Duplicação de documentação, não lacuna de teste |
| 76 | `plugin/reflection-api.test.ts:139` | `onInvalidSkill` nunca é invocado | DEFERRED | Callback com zero consumidores — candidato a remoção, mas é superfície do plugin e sai de escopo do M8 |
| 77 | `src/pages/builder/builder.test.tsx:132` | Resize por pointer-drag sem teste | DEFERRED | O caminho de teclado (acessível) está coberto e é o contrato que importa; pointer-drag em jsdom é teste de baixo valor |
| 78 | `tests/integration/studio.integration.test.tsx:93` | `RouteError` testado só com valor exótico | DEFERRED | O caso comum é o mesmo caminho de código; o teste exótico é o que discrimina |
| 80 | `src/pages/builder/builder.test.tsx:137` | Testes do splitter asseveram largura CSS literal | FIXED | **M8 T4.1** — trocado por direção (esquerda encolhe, direita cresce) e limite (clamp inferior). É o bullet de DoD do M8 |
| 81 | `src/pages/builder/builder.test.tsx:202` | Testes acoplados à cardinalidade dos fixtures | DEFERRED | Asseverar "2 arquivos" é o contrato do fixture; afrouxar para `>0` reduziria poder discriminante |

## Contagem

- Total: **32**
- `FIXED`: **5** (#3, #4, #14, #39 já resolvidos por M6/M7; **#80 resolvido neste milestone**)
- `DEFERRED`: **27**, cada um com razão

## Padrão nos adiamentos, dito com honestidade

Vinte e sete adiamentos é muito, e vale nomear por quê em vez de deixar a impressão de que a
triagem foi um carimbo:

- **13** são preferência de organização abaixo da regra de 3 (`rules/parsimony-ladder.md`,
  `rules/testing.md`): duplicação em dois pontos, nome de variável, `Extract<>` que funciona.
  Mexer neles é churn com risco de regressão e zero ganho observável.
- **6** são achados legítimos cuja correção exige uma **decisão** que a triagem não pode tomar
  sozinha: orçamento de timeout (#52, #53), limite de corpo (#54), confiança no `Host` atrás de
  proxy (#56), fake doors de produto (#5), mover fixture roteirizado para o datasource (#31). Cada
  um merece task própria — resolvê-los de improviso dentro de um timebox seria pior que adiar.
- **5** são dev-only por contrato explícito (`CLAUDE.md` invariante 6): eco de erro interno, `fs`
  síncrono, poll de 5ms. Reabrem se o plugin sair do escopo de desenvolvimento.
- **3** são de teste, onde o adiamento **preserva** poder discriminante em vez de reduzi-lo (#78,
  #81) ou cobre caminho de baixo valor (#77).

Os candidatos mais fortes a virar task própria, em ordem: **#56** (confiança no `Host`), **#54**
(corpo sem limite) e **#53** (fetch sem timeout) — os três antes do primeiro `npm publish`, pela
mesma razão que os MEDIUM de contrato HTTP do M6.
