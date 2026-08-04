---
slug: test-quality-maintainability
milestone_id: M8
owner: paulohenriquevn
created_at: 2026-08-04
version: 1.0
goal: Devolver poder discriminante aos testes que o perderam e reduzir densidade de decisão onde ela é real.
---

# Plano: Qualidade da suíte e manutenibilidade (M8)

## Goal

Fazer a suíte detectar os 4 defeitos que hoje ela deixa passar, medido por: cada mutação declarada
na tabela de prova produz RED, e a cobertura de branch não regride abaixo de 89,46%.

## Context

A auditoria de 2026-08-04 encontrou um teste que **não pode falhar pelo motivo que o nome afirma**.
Reproduzido nesta sessão: invertendo o ternário de `src/main.tsx:20`, `npx vitest run
src/main.test.tsx` devolve **3 passed**. O teste chama-se
`test_composition_root_selects_hybrid_in_live_mode` e não distingue os dois modos.

O M7 deu a mesma lição duas vezes: o mutante `[ds]` → `[]` no `useListing` e um contador sem
emissor no `metrics` sobreviveram à suíte inteira, e só foram achados porque a review os procurou à
mão. **Suíte verde não é evidência de suíte forte.**

Além disso: quatro guards sem cobertura (405 não-POST, 403 do branch de asset, dois caminhos de
erro de escrita do builder), `handleAgentRun` com 114 linhas e CC=18, `SessionView` CC=16, uma
delegação por spread que só falha em runtime, dois testes multi-comportamento e 32 findings `low`
sem triagem (`findings.db`: 8 high, 24 medium, 32 low, 17 info).

O blueprint (`knowledge-base/discoveries/blueprints/test-quality-maintainability-blueprint.md`, SHIPPABLE 100) trouxe um achado
incômodo: **nenhum dos dois peers do nicho mede força de teste nem densidade de decisão por
ferramenta.** O M8 escolhe conscientemente fazer mais que o peer, e assume o custo.

## Baseline Context (deep review of current state)

### Files that will be touched

| Arquivo | LoC hoje | Último toque | Por que existe |
|---|---|---|---|
| `packages/studio/src/main.test.tsx` | — | M1 | Testes do composition root |
| `packages/studio/src/data/reflection-datasource.ts` | ~115 | M6/M7 | Adapter live sobre o fixture |
| `packages/studio/tests/integration/studio-plugin.integration.test.ts` | — | M7 | Integração com Vite real |
| `packages/studio/plugin/static-serve.test.ts` | — | M6 | Testes do servidor estático |
| `packages/studio/src/pages/builder/builder.test.tsx` | — | M5/M6 | Testes da única tela |
| `packages/studio/plugin/run-endpoint.ts` | ~250 | M1 | Endpoint de run — a fronteira mais afiada |
| `packages/studio/src/pages/builder/session-view.tsx` | — | M5 | Painel de sessão |
| `.claude/knowledge-base/audits/…/triage-low-findings.md` (NEW) | 0 | — | Registro da triagem |
| `CHANGELOG.md` | — | contínuo | Rule 6 |

### Current callers / dependents

- **`mount`** (`src/main.tsx:14`) — chamado por `src/bootstrap.ts:96`. O ternário do `:20` decide
  entre `createReflectionDataSource({ fallback: fixtures })` e `fixtures`.
- **Por que o teste não discrimina** — as duas asserções são satisfeitas pelos dois ramos:
  (a) `findByText(/live reflection/i)` lê o rótulo produzido por `buildRoutes({ live })`, que usa
  o booleano `live` **direto**, não o datasource escolhido; (b)
  `metrics.snapshot().datasource_calls_total?.listAgents` — **ambos** os datasources incrementam
  esse contador com esse rótulo (`fixture-datasource.ts:33` via `counted("listAgents", …)`,
  `reflection-datasource.ts:80`). Nenhuma das duas toca o dado que só a reflection produz.
- **`createReflectionDataSource`** (`src/data/reflection-datasource.ts:92`) — devolve
  `{ ...opts.fallback, listAgents, listSkills }`. Os outros 3 métodos do `StudioDataSource`
  (`listBuilderSessions`, `getBuilderSession`, `startBuilderSession`) vêm do spread.
- **`handleAgentRun`** (`plugin/run-endpoint.ts:137`) — 114 linhas; chamado por
  `plugin/index.ts:107`. Guards em sequência: 404 rota, 400 percent-encoding, **405 não-POST**
  (`:153`), 403 origem (`:160`), 400 corpo, 404 agent, 424 provider key, 422 agent inválido.
- **`safeJoin`** (`plugin/static-serve.ts`) — devolve `kind: "bad-request" | "forbidden" | "ok"`; o
  ramo `forbidden` (`:150`) não tem teste quando a extensão é conhecida.
- **`startSession`** (`src/pages/builder/index.tsx:196`) — o `.catch` (`:210`) vira `openError`.

### Architecture boundaries affected

Nenhuma fronteira nova. T3.1 **reforça** DIP: a delegação explícita faz o compilador cobrar o
contrato que o spread esconde. T3.2 é decisão sobre densidade, não sobre camada.

### Domain glossary

- **Teste oco** — teste cujo nome afirma uma garantia que suas asserções não sustentam; passa com a
  lógica de produção invertida.
- **Prova de mutação** — aplicar um mutante nomeado, rodar a suíte, exigir RED, reverter e
  registrar. É a evidência que separa "a suíte passa" de "a suíte detecta".
- **Guard descoberto** — ramo de erro sem nenhum teste que o exercite.
- **Densidade de decisão** — quantos caminhos independentes uma função concentra (CC).

## Prior Art & Related Work

- **Blueprint deste milestone** — `knowledge-base/discoveries/blueprints/test-quality-maintainability-blueprint.md`
  (SHIPPABLE 100), seis decisões numeradas de 1 a 6.
- **Precedente de delegação explícita** — o `Registry` do genkit escreve cada delegação ao `parent`
  (`registry.ts:258,470,552,570`) e nunca espalha o objeto-pai.
- **Precedente de teste de erro HTTP** — o genkit escreve **um teste por causa**, com asserção de
  status e de corpo (`reflection_test.ts:79-88,159`).
- **Precedente negativo** — nenhum dos dois peers roda mutation testing nem enforça limite numérico
  de complexidade (blueprint § Cross-cutting Comparison). O M8 faz mais que o peer, por escolha.
- **M6 e M7 deste projeto** — ambos usaram prova de mutação manual registrada; é a prática já
  estabelecida aqui.

## Objective

Sete entregas, uma por bullet de DoD do M8: o teste do composition root volta a discriminar, os
quatro guards ganham teste, a delegação vira explícita, as duas funções densas são medidas e
decididas, os dois testes multi-comportamento são divididos, os 32 findings `low` são triados, e a
cobertura não regride.

## ADRs

### A1 — Prova de mutação manual e registrada; nenhuma ferramenta nova

Cada correção de teste oco é provada aplicando o mutante nomeado, rodando a suíte, exigindo RED e
revertendo. A tabela de mutações vai para o log do milestone.

**Rationale.** Blueprint decisão 1 — nenhum dos dois peers usa mutation testing, e a decisão de adotar
Stryker é maior que este milestone (custo de execução alto sob jsdom). O defeito que abriu o M8
estava numa linha **coberta** — cobertura mede execução, não detecção.

**Alternativa rejeitada.** Adotar Stryker agora: fora do escopo, e o M8 tem 4 pontos nomeados, não
uma suíte inteira a auditar.

**Honestidade sobre o limite.** Prova manual não roda em CI e não escala. É a escolha certa para 4
pontos; vira dívida se o número crescer. Registrado.

### A2 — Sem regra de lint de complexidade; decisão por função com ADR

Não adicionamos regra `complexity` ao Biome. `handleAgentRun` e `SessionView` são medidos e
tratados um a um.

**Rationale.** Blueprint decisão 2 — a config de lint compartilhada do mastra tem 324 linhas e **zero**
regras numéricas. Um teto global convida ao pior desfecho — extrair função só para baixar contador,
que é criar código que não precisa existir (`rules/parsimony-ladder.md` rung 1 ao contrário).

**Alternativa rejeitada.** Ligar `complexity` com teto 15: a auditoria mediu **duas** funções acima
— amostra pequena demais para justificar regra global sobre código que ninguém revisou.

### A3 — Delegação explícita no lugar de `{...opts.fallback}`

`createReflectionDataSource` passa a delegar os 5 métodos explicitamente.

**Rationale.** Precedente direto em `registry.ts:258,470,552,570`. O ganho é o que o finding pede:
um método novo na interface passa a quebrar a **compilação** em vez de cair silenciosamente no
fixture. O comentário-invariante que hoje existe no nosso código (o spread só é correto porque o
fallback é objeto de closures stateless) deixa de precisar existir.

**Alternativa rejeitada.** Manter o spread com um teste que assevera a presença dos 5 métodos: o
teste morre no dia em que a interface crescer — exatamente quando a proteção seria necessária. Tipo
é melhor oráculo que teste, quando o tipo dá conta.

### A4 — Um teste por causa, com status e corpo

Os guards ganham um teste **por causa**, asseverando status **e** o `code` do envelope.

**Rationale.** Blueprint decisão 4 — `reflection_test.ts:79-88`: o genkit tem dois testes distintos que
devolvem `400`, separados porque a causa difere, e assevera o corpo por campo. Asseverar só o
status deixa passar a troca de um `code` por outro.

### A5 — Triagem dos 32 `low` com timebox declarado

A triagem tem teto de **2 horas**. Cada finding sai `FIXED` ou `DEFERRED` com razão de uma linha.
Nenhum é fechado como "não é problema" sem razão escrita.

**Rationale.** Risco #2 declarado no ROADMAP § M8: triagem de 32 itens `low` é terreno fértil para
bikeshedding e, sem timebox, o milestone não fecha. O teto é o mecanismo.

**Alternativa rejeitada.** Corrigir os 32: a maioria é preferência de nome/ternário, e
`rules/parsimony-ladder.md` é explícito contra refatorar por estética.

## Dependencies

### Existing — use as-is

| Package | Version | Ecosystem | Why |
|---|---|---|---|
| `vitest` | `^3.2.4` | npm | Runner já em uso |
| `@testing-library/react` | `^16.3.0` | npm | Já usado; T4.1 estende |

### New — to be introduced

Nenhuma. Rungs 2 e 4 da escada de parcimônia: stdlib e o que já está instalado. A rejeição de
Stryker está no ADR A1.

### Removed

| Package | Last version | Why removed |
|---|---|---|
| (none) | | |

## Dependency Graph

```
Phase 1 (teste oco) ──┐
Phase 2 (guards)    ──┼──> Phase 3 (densidade) ──> Phase 5 (validação)
Phase 4 (higiene)   ──┘
```

Phase 3 depende de Phase 2 por uma razão concreta declarada no ROADMAP § M8 risco #1: reduzir a
complexidade de `handleAgentRun` mexe na fronteira de rede mais afiada do pacote, e refatorar sem
alterar comportamento exige que os casos negativos **existam antes**. Phases 1, 2 e 4 são
independentes entre si.

## Phase 1: O teste que não discrimina

### T1.1 — `test_composition_root_selects_hybrid_in_live_mode` volta a falhar com o ternário invertido

#### Why this step

**Ação.** Trocar as asserções do teste por uma que só o caminho da reflection pode satisfazer: o
agente devolvido pelo stub de `fetch` (`live-agent`) aparecer na tela.

**Raciocínio.** É o defeito que dá nome ao milestone, e a causa é precisa: as duas asserções atuais
são satisfeitas pelos dois ramos do ternário. O rótulo vem de `buildRoutes({ live })`, que lê o
booleano direto; e o contador `datasource_calls_total.listAgents` é incrementado pelos **dois**
datasources. Nenhuma toca o dado que só a reflection produz. Enquanto isso não mudar, qualquer
refatoração do composition root passa despercebida.

#### Files to edit

- `packages/studio/src/main.test.tsx` — asserções do teste

#### Deep file dependency analysis

`mount` (`src/main.tsx:14`) é chamado por `src/bootstrap.ts:96` e pelo próprio teste via
`mountAt`. O stub de `fetch` do teste já devolve `{"items":[{"name":"live-agent",…}]}` para
`/_studio/api/agents` — o dado discriminante **já está no arranjo**, só não é asseverado. O fixture
devolve agentes com outros nomes (`fixtures/registry.ts`), então a asserção separa os ramos sem
precisar de arranjo novo.

#### TDD

```ts
// src/main.test.tsx — a asserção que só o ramo da reflection satisfaz
it("test_composition_root_selects_hybrid_in_live_mode", async () => {
  // …stub de fetch já existente devolve o agente "live-agent"…
  const agent = await screen.findByText("live-agent");
  expect(agent).toBeTruthy();
});

// EC-1 absorvido: a asserção acima só discrimina enquanto o nome NÃO existir no fixture.
// Sem esta trava, alguém adiciona "live-agent" ao registry amanhã e o teste volta a ser oco
// em silêncio — o defeito do milestone, repetido com um passo a mais.
it("the_discriminating_name_is_absent_from_the_fixtures", async () => {
  const fixtureAgents = await createFixtureDataSource({ scenario: "default" }).listAgents();
  const names = fixtureAgents.map((a) => a.name);
  expect(names).not.toContain("live-agent");
});
```

RED esperado: com o ternário **invertido**, o fixture é escolhido, `live-agent` nunca chega à tela
e `findByText` estoura por timeout. Com o ternário correto, verde.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- [ ] Invertendo o ternário de `src/main.tsx:20`, `npx vitest run src/main.test.tsx` sai **não-zero**; hoje sai 0 com 3 passed. A execução e o resultado ficam registrados no log do milestone.
- [ ] Com o ternário correto, `npx vitest run src/main.test.tsx` sai 0.
- [ ] `grep -c 'live-agent' packages/studio/src/main.test.tsx` retorna ≥ 2 (o stub que produz o dado e a asserção que o consome), e `grep -c 'live-agent' packages/studio/src/data/fixtures/registry.ts` retorna 0 — o dado asseverado não existe no fixture.

#### DoD

- [ ] Mutação aplicada, RED registrado, mutante revertido, árvore limpa.
- [ ] `CHANGELOG.md` atualizado.

## Phase 2: Guards descobertos

### T2.1 — 405 não-POST e 403 do branch de asset

#### Why this step

**Ação.** Um teste por causa para o `405` de `plugin/run-endpoint.ts:153` e para o ramo
`forbidden` de `plugin/static-serve.ts:150` com extensão conhecida.

**Raciocínio.** São dois guards de segurança sem nenhum teste. O 405 protege o endpoint que gasta
tokens reais do provider; o 403 impede escapar do diretório da SPA. Um guard sem teste é um guard
que ninguém sabe se ainda funciona — e o M8 vai **refatorar** `handleAgentRun` na fase seguinte,
o que torna estes testes pré-requisito, não complemento (risco #1 do ROADMAP).

#### Files to edit

- `packages/studio/tests/integration/studio-plugin.integration.test.ts` — o 405 sobre HTTP real
- `packages/studio/plugin/static-serve.test.ts` — o 403 do `safeJoin`

#### Deep file dependency analysis

O teste de integração já sobe um Vite dev server real e tem o arranjo pronto (M6). `safeJoin`
devolve `kind: "forbidden"` para caminho que escapa de `spaDir`; o teste existente cobre
`bad-request` mas não `forbidden` com extensão conhecida — o ramo em que `isKnownAsset` é
verdadeiro e o guard ainda assim recusa.

#### TDD

```ts
// tests/integration/studio-plugin.integration.test.ts
it("test_run_endpoint_rejects_non_post_with_405", async () => {
  const res = await fetch(`${baseUrl}/_studio/api/agents/support/run`);
  expect(res.status).toBe(405);
  const body = await res.json();
  expect(body).toMatchObject({ error: { code: "METHOD_NOT_ALLOWED" } });
});

// plugin/static-serve.test.ts
it("test_traversal_with_known_extension_is_forbidden", () => {
  const outcome = serveKnownAsset("/_studio/../../etc/passwd.js");
  expect(outcome.status).toBe(403);
  expect(outcome.code).toBe("FORBIDDEN");
});
```

```ts
// EC-5: a ORDEM dos guards é contrato — rota desconhecida decide antes do método.
it("test_non_post_on_unknown_agent_is_404_not_405", async () => {
  const res = await fetch(`${baseUrl}/_studio/api/agents/nosuch-agent/run`);
  expect(res.status).toBe(404);
});
```

RED esperado: nenhum dos dois existe hoje; a primeira execução prova o contrato observado antes de
qualquer refatoração. O de EC-5 pode passar já no RED — seu valor é falhar se a extração de T3.2
reordenar os guards.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- [ ] `GET` no path de run responde `405` com `error.code === "METHOD_NOT_ALLOWED"`, verificado por `npx vitest run tests/integration/` exit 0.
- [ ] Um caminho com extensão conhecida que escapa de `spaDir` responde `403`, verificado por `npx vitest run plugin/static-serve.test.ts` exit 0.
- [ ] `grep -c 'METHOD_NOT_ALLOWED' packages/studio/tests/integration/studio-plugin.integration.test.ts` retorna ≥ 1 e `grep -c 'FORBIDDEN' packages/studio/plugin/static-serve.test.ts` retorna ≥ 1 — cada teste assevera o `code`, não só o status (ADR A4).

#### DoD

- [ ] Os 2 testes verdes; mutação do status prova RED.
- [ ] `CHANGELOG.md` atualizado.

### T2.2 — Os dois caminhos de erro de escrita do builder

#### Why this step

**Ação.** Cobrir o `.catch` de `startSession` (`src/pages/builder/index.tsx:210`) e o caminho
equivalente do follow-up.

**Raciocínio.** São a fronteira entre o datasource e a tela: um erro tipado tem de virar estado
visível, nunca uma unhandled rejection. `rules/error-handling.md` § 2 — e o M7 já mostrou, no
`useListing`, que essa fronteira tinha um bug real (o erro nunca era limpo) que nenhum teste pegava.

#### Files to edit

- `packages/studio/src/pages/builder/builder.test.tsx` — dois testes novos

#### Deep file dependency analysis

`builder.test.tsx` já tem `datasource_rejection_surfaces_as_visible_alert`, que cobre a rejeição de
**listagem**. Os caminhos de **escrita** (`startBuilderSession` e o follow-up) não têm equivalente.
O arranjo de datasource com override por spread já existe no arquivo (`:254`).

#### TDD

```tsx
// src/pages/builder/builder.test.tsx
it("start_session_rejection_surfaces_as_visible_error", async () => {
  renderBuilderWith(failingStartSession);
  await submitPrompt("build me a thing");
  const alert = await screen.findByRole("alert");
  expect(alert).toBeTruthy();
});
```

```tsx
// EC-6: o ramo String(error) para rejeição não-Error — descoberto no M7 no useListing.
it("start_session_non_error_rejection_surfaces_as_string", async () => {
  renderBuilderWith(rejectingWith("boom"));
  await submitPrompt("build me a thing");
  const alert = await screen.findByText(/boom/);
  expect(alert).toBeTruthy();
});
```

RED esperado: nenhum dos testes existe; escrevê-los primeiro prova que o caminho de erro de fato
renderiza.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- [ ] Uma rejeição de `startBuilderSession` produz um elemento com `role="alert"` contendo a mensagem do erro, verificado por `npx vitest run src/pages/builder/builder.test.tsx` exit 0.
- [ ] O mesmo para o caminho de follow-up, verificado pelo mesmo comando.
- [ ] Remover o `.catch` de `index.tsx:210` deixa ao menos um dos dois RED — prova de mutação registrada.

#### DoD

- [ ] Os 2 testes verdes; mutação registrada.
- [ ] `CHANGELOG.md` atualizado.

## Phase 3: Densidade de decisão

### T3.1 — Delegação explícita no lugar do spread

#### Why this step

**Ação.** Trocar `{ ...opts.fallback, listAgents, listSkills }` por um objeto que delega os cinco
métodos explicitamente ao fallback.

**Raciocínio.** ADR A3 e o precedente do `Registry` do genkit. Hoje, adicionar um método ao
`StudioDataSource` faz o adapter live cair silenciosamente no fixture; depois, faz a compilação
quebrar. O comentário-invariante de 4 linhas que existe hoje no arquivo é a evidência de que o
spread precisava de uma explicação — a delegação não precisa.

#### Files to edit

- `packages/studio/src/data/reflection-datasource.ts` — o objeto de retorno
- `packages/studio/src/data/reflection-datasource.test.ts` — teste do novo contrato

#### Deep file dependency analysis

`StudioDataSource` (`src/data/datasource.ts:12-18`) declara 5 métodos. `createReflectionDataSource`
sobrescreve 2 e herda 3 por spread. Os 3 herdados (`listBuilderSessions`, `getBuilderSession`,
`startBuilderSession`) são closures stateless no `FixtureDataSource`, então o spread funciona hoje —
o problema é que ele funciona **por acidente do formato do fallback**, não por contrato.

#### TDD

```ts
// src/data/reflection-datasource.test.ts
it("delegates_unimplemented_methods_to_the_fallback", async () => {
  const fallback = { ...fixtures(), listBuilderSessions: vi.fn().mockResolvedValue([]) };
  const ds = createReflectionDataSource({ fallback });
  await ds.listBuilderSessions();
  expect(fallback.listBuilderSessions).toHaveBeenCalledTimes(1);
});
```

RED esperado: **este teste passa antes e depois** — é trava de comportamento, não prova da troca
de mecanismo. **O RED desta task é de compilação** (EC-2 absorvido): remover uma das cinco
delegações e rodar `npm run typecheck` tem de falhar nomeando o método ausente. Essa execução é o
RED registrado; sem ela a task teria TDD apenas nominal, que é o defeito que o M8 combate.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- [ ] `grep -c '\.\.\.opts\.fallback' packages/studio/src/data/reflection-datasource.ts` retorna `0`.
- [ ] Os 5 métodos de `StudioDataSource` aparecem nomeados no objeto de retorno, verificado por grep de cada nome no arquivo.
- [ ] Remover uma das delegações faz `npm run typecheck` falhar — prova registrada no log.
- [ ] `npx vitest run src/data/reflection-datasource.test.ts` exit 0.

#### DoD

- [ ] Suíte verde; typecheck limpo; prova de compilação registrada.
- [ ] `CHANGELOG.md` atualizado.

### T3.2 — `handleAgentRun` e `SessionView`: medir e decidir

#### Why this step

**Ação.** Medir a complexidade ciclomática das duas funções com uma ferramenta, e então: extrair
com razão de negócio até ficar abaixo de 15, **ou** registrar um ADR nomeando por que a função
concentra decisão legitimamente.

**Raciocínio.** O DoD permite as duas saídas, e o blueprint (decisão 2) mostra que nenhum peer do nicho
enforça o número — o que torna "abaixo de 15" uma meta, não uma lei. `handleAgentRun` tem 114
linhas e oito guards em sequência; extrair a **cadeia de validação** para uma função que devolve
`ok | erro-tipado` é extração com razão de negócio, não cosmética. Se a medição mostrar que o resto
é irredutível, o ADR é a resposta honesta.

**Pré-requisito absorvido (EC-3).** Antes de qualquer extração, medir cobertura sobre
`plugin/run-endpoint.ts` e **listar quais dos oito guards estão descobertos** (404 rota, 400
percent-encoding, 405 método, 403 origem, 400 corpo, 404 agent, 424 provider key, 422 agent
inválido). T2.1 cobre um deles; refatorar sem saber o estado dos outros sete é refatorar no escuro
numa fronteira que protege tokens reais do provider. Guard descoberto ganha teste antes da
extração, ou a extração não o toca. O número entra no log.

#### Files to edit

- `packages/studio/plugin/run-endpoint.ts` — extração da cadeia de guards, se a medição justificar
- `packages/studio/src/pages/builder/session-view.tsx` — idem
- `.claude/knowledge-base/adrs/0002-complexity-decision.md` (NEW) — se alguma permanecer acima

#### Deep file dependency analysis

`handleAgentRun` é chamado por `plugin/index.ts:107` e coberto pelos testes de
`run-endpoint.test.ts` e pelo teste de integração. **T2.1 é pré-requisito**: os guards 405/403
precisam ter teste antes da refatoração, senão a extração não tem rede (risco #1 do ROADMAP).
`SessionView` é renderizado por `src/pages/builder/index.tsx` e coberto por `builder.test.tsx`.

#### TDD

```ts
// A rede é a suíte existente + os testes de T2.1/T2.2: a refatoração NÃO pode mudar comportamento.
it("test_run_endpoint_behaviour_is_unchanged_after_extraction", async () => {
  const res = await fetch(`${baseUrl}/_studio/api/agents/support/run`, { method: "GET" });
  expect(res.status).toBe(405);
});
```

RED esperado: nenhum — esta task é refatoração sob rede. O critério é que **nenhum** teste mude de
resultado. Uma mudança de comportamento aqui é falha, não progresso.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- [ ] O log do milestone registra, para cada função, o número de complexidade medido por ferramenta antes e depois, com o comando que o produziu.
- [ ] Cada função mede abaixo de 15 pelo mesmo comando, **ou** `grep -c '<nome-da-função>' knowledge-base/adrs/0002-complexity-decision.md` retorna ≥ 1.
- [ ] Nenhum teste existente muda de resultado, verificado por `npm test` exit 0 antes e depois.
- [ ] A cobertura de linha de `plugin/run-endpoint.ts` é medida ANTES da extração e os guards descobertos são listados no log (EC-3); cada um ganha teste ou fica fora do escopo da extração.
- [ ] Toda função extraída é referenciada por nome no ADR ou no log do milestone com o conceito de domínio que ela nomeia; `git diff --stat` do commit não mostra arquivo novo sem entrada correspondente.

#### DoD

- [ ] `npm test` exit 0; `npm run typecheck` limpo.
- [ ] Números antes/depois registrados; ADR escrito se aplicável.
- [ ] `CHANGELOG.md` atualizado.

## Phase 4: Higiene de suíte

### T4.1 — Dividir os dois testes multi-comportamento

#### Why this step

**Ação.** Dividir `session_opens_with_worklog_edited_files_and_review_panel`
(`builder.test.tsx:57`) e `composer_has_reference_anatomy_actions_row_and_project_row` (`:215`) em
um teste por comportamento; trocar asserções em classe CSS literal por asserção de direção/limite,
se existirem.

**Raciocínio.** `rules/testing.md` § 3: "and" no nome do teste é um cheiro. O precedente é direto —
o genkit separa `passes through the abort signal` de `…with middleware` (`action_test.ts:305,322`)
e `records init in telemetry` de `does not record…` (`:364,387`), em vez de somar asserções. Um
teste multi-comportamento falha sem dizer qual comportamento quebrou.

#### Files to edit

- `packages/studio/src/pages/builder/builder.test.tsx`

#### Deep file dependency analysis

Os dois testes usam `renderBuilder()` e `openPinnedSession()`, helpers já no arquivo — a divisão
reusa o arranjo, não o duplica. Nenhum código de produção é tocado.

#### TDD

```tsx
// Cada comportamento vira um it() com nome sem "and".
it("session_opens_with_expandable_work_log", async () => {
  renderBuilder();
  await openPinnedSession();
  const workLog = await screen.findByText(/worked for/i);
  expect(workLog).toBeTruthy();
});
```

RED esperado: nenhum — é redistribuição de asserções existentes. A trava é que a contagem total de
asserções não cai: cada asserção do teste original tem de aparecer em exatamente um dos filhos.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- [ ] Nenhum nome de teste em `builder.test.tsx` contém `_and_`, verificado por `grep -c "_and_" packages/studio/src/pages/builder/builder.test.tsx` retornando `0`.
- [ ] O número de asserções `expect(` no arquivo não diminui, verificado por contagem antes/depois registrada no log.
- [ ] `npx vitest run src/pages/builder/builder.test.tsx` exit 0.

#### DoD

- [ ] Suíte verde; contagem de asserções preservada.
- [ ] `CHANGELOG.md` atualizado.

## Phase 5: Triagem

### T5.1 — Triar os 32 findings `low`

#### Why this step

**Ação.** Percorrer os 32 findings `low` de `findings.db` com timebox de 2 horas, marcando cada um
`FIXED` ou `DEFERRED` com razão de uma linha, num registro versionado.

**Raciocínio.** Risco #2 do ROADMAP § M8: sem timebox, a triagem de 32 itens de preferência
(nomes, ternários) não fecha. O teto é o mecanismo, e o registro é o que transforma "não vamos
fazer" de omissão em decisão.

#### Files to edit

- `.claude/knowledge-base/audits/studio-code-review-2026-08-04/triage-low-findings.md` (NEW)
- Arquivos de produção dos findings marcados `FIXED`

#### Deep file dependency analysis

`findings.db` é SQLite com colunas de severidade e localização. A triagem é leitura + decisão; os
`FIXED` tocam arquivos que as fases anteriores já podem ter mexido, então esta fase roda **por
último** para evitar conflito.

#### TDD

```
// A trava é de completude, não de comportamento:
it("triage_covers_every_low_finding", () => {
  const triaged = countRows("triage-low-findings.md");
  expect(triaged).toBe(32);
});
```

RED esperado: o registro não existe. Executado como verificação de contagem contra o banco.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- [ ] O registro contém exatamente 32 linhas de finding, verificado contra `select count(*) from findings where severity='low'` do `findings.db`.
- [ ] Cada linha tem status ∈ {`FIXED`, `DEFERRED`} e uma razão não-vazia, verificado por parse do arquivo.
- [ ] `grep -cE '\| (FIXED|DEFERRED) \|'` no registro de triagem é igual a 32 e nenhuma linha tem coluna de razão vazia, verificado por parse do arquivo com exit 0.
- [ ] O registro declara a hora de início e de fim da triagem, e a diferença é ≤ 2h — verificado por leitura das duas linhas de cabeçalho do arquivo.

#### DoD

- [ ] Registro escrito e verificado contra o banco.
- [ ] `CHANGELOG.md` atualizado.

## Coverage Matrix

| # | Bullet de DoD do M8 (ROADMAP) | Task |
|---|---|---|
| 1 | `test_composition_root_selects_hybrid_in_live_mode` volta a FALHAR com o ternário invertido | T1.1 |
| 2 | Guards ganham teste: 405, 403 de asset, 2 caminhos de erro do builder | T2.1 + T2.2 |
| 3 | `handleAgentRun` e `SessionView` abaixo de 15 ou ADR | T3.2 |
| 4 | Spread substituído por delegações explícitas | T3.1 |
| 5 | Dois testes multi-comportamento divididos; asserções de CSS trocadas | T4.1 |
| 6 | Os 32 findings `low` triados | T5.1 |
| 7 | Cobertura de branch não regride abaixo de 89,46% | Global DoD |

**Cobertura: 7/7 (100%).** Todo bullet mapeia para ao menos uma task; nenhuma task existe sem
bullet.

## Drawbacks & Risks

| # | Risco | Severidade | Mitigação | Dono |
|---|---|---|---|---|
| R1 | Refatorar `handleAgentRun` mexe na fronteira de rede mais afiada do pacote | ALTA | T2.1 é pré-requisito declarado no grafo de dependências: os guards ganham teste **antes** da refatoração. O AC de T3.2 exige que nenhum teste mude de resultado | paulohenriquevn |
| R2 | Triagem dos 32 `low` vira bikeshedding e o milestone não fecha | ALTA | Timebox de 2h no ADR A5; o que não couber sai `DEFERRED` com razão | paulohenriquevn |
| R3 | Prova de mutação manual não roda em CI e não escala | MÉDIA | Declarada como dívida no ADR A1; são 4 pontos nomeados, não uma suíte |paulohenriquevn |
| R4 | Dividir testes pode perder uma asserção no caminho | MÉDIA | AC de T4.1 exige que a contagem de `expect(` não diminua, registrada antes/depois | paulohenriquevn |
| R5 | A delegação explícita adiciona boilerplate proporcional à interface | BAIXA | 5 métodos; o blueprint declara o custo e o compara ao ganho de segurança de tipo | paulohenriquevn |

## Unresolved Questions

- Q1: O Biome tem equivalente às três regras de idioma de teste do `eslint-plugin-testing-library`
  (`no-unnecessary-act`, `no-wait-for-side-effects`, `prefer-find-by`)? Se tiver, ligamos (decisão 5 do blueprint); se não, a decisão é **não** introduzir ESLint só para isso. A verificação é barata
  e acontece durante a implementação.
- Q2: `SessionView` tem CC=16 medido pela regra ESLint `complexity` com `variant: "classic"` da
  auditoria. Não temos ESLint no projeto — qual ferramenta reproduz esse número? A resposta muda o
  AC de T3.2 de "abaixo de 15" para "medido por X e abaixo de 15".

## Global Definition of Done

- [ ] `npm test` exit 0 na raiz, incluindo o guard do ROADMAP.
- [ ] `npm run typecheck` exit 0.
- [ ] `npm run check` (biome) exit 0 com 0 warnings e nenhuma supressão nova.
- [ ] `npm run build` exit 0.
- [ ] Cobertura de branch **não regride abaixo de 89,46%**.
- [ ] Toda mutação declarada na tabela de prova produz RED, e todas são revertidas.
- [ ] `CHANGELOG.md` `[Unreleased]` com uma entrada por mudança visível ao consumidor (Rule 6).
- [ ] `/code-quality` sem verdict `FAIL_HARD` nem `INVALID`.

## Failure scenarios (external I/O touched)

O I/O externo tocado é HTTP, nos testes de integração contra o Vite dev server real.

| Dependência | Modo de falha | Como o teste reproduz | Comportamento esperado |
|---|---|---|---|
| Vite dev server | Servidor não sobe | O `beforeAll` existente falha alto se `createServer` rejeitar | Suíte falha com a causa, nunca pula o teste |
| Vite dev server | `GET` num path de run | Requisição real sem `method: "POST"` | `405` com `code: "METHOD_NOT_ALLOWED"`, nunca 200 |
| Filesystem (`safeJoin`) | Caminho que escapa de `spaDir` | Path com `../` e extensão conhecida | `403` `FORBIDDEN`, nunca leitura fora do diretório |
| `findings.db` | Banco ausente ou schema mudado | T5.1 consulta a contagem antes de escrever | Falha alto nomeando o banco; nunca triagem parcial silenciosa |

## Final Phase: Integration Validation (MANDATORY)

Rodar, na raiz, na ordem: `npm run check`, `npm run typecheck`, `npm test`,
`npx vitest run --coverage`, `npm run build`. Todos exit 0. Em seguida
`python3 .claude/skills/implement/scripts/run_validation.py test-quality-maintainability` com
exit 0, e `/code-quality test-quality-maintainability` com verdict ∉ {FAIL_HARD, INVALID}.

Por fim, re-executar **toda** a tabela de mutações e confirmar RED em cada linha.

O plano não está completo enquanto essa cadeia não passar inteira.

## Absorbed MUST-FIX items (from /edge-case-plan)

Relatório: `knowledge-base/reviews/test-quality-maintainability-edge-cases-2026-08-04.md`.

### EC-1 (absorvido) — A asserção nova pode virar oca por acidente

`findByText("live-agent")` só discrimina enquanto o nome não existir no fixture. Absorvido como
**teste** no TDD de T1.1, não apenas como critério: adicionar um agente com esse nome ao registry
passa a quebrar a suíte em vez de silenciosamente devolver o teste ao estado oco.

### EC-2 (absorvido) — O RED de T3.1 é de compilação, não de runtime

O teste de delegação passa antes e depois; declarar isso como TDD seria TDD nominal. O RED da task
é remover uma delegação e ver o `typecheck` falhar — executado e registrado.

### EC-3 (absorvido) — Medir a cobertura dos 8 guards antes de extrair

`handleAgentRun` tem oito guards e T2.1 cobre um. Extrair sem saber o estado dos outros sete é
refatorar no escuro numa fronteira que protege tokens reais do provider. A medição vira
pré-requisito declarado da task, com o resultado no log.

### EC-5 / EC-6 (absorvidos como testes)

Ordem dos guards (`404` antes de `405`) e rejeição não-Error nos caminhos de escrita do builder —
este último é o ramo exato que o M7 encontrou descoberto no `useListing`.
