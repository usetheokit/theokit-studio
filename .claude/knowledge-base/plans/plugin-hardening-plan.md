---
slug: plugin-hardening
milestone_id: M6
created_at: 2026-08-04
goal: Fechar a fronteira HTTP do plugin — guard de headersSent com erro no corpo, namespace reservado antes do fallback da SPA, scan resiliente e envelope tipado no cliente
blueprint: knowledge-base/discoveries/blueprints/plugin-hardening-blueprint.md
audit: knowledge-base/audits/studio-code-review-2026-08-04/final_report.md
---

# Plan: M6 — Plugin hardening (fronteira HTTP)

## Goal

Eliminar a cadeia que encerra o processo do dev server do host, medido pelo novo teste
`plugin/http.test.ts` provando que `sendErrorEnvelope` sobre uma resposta já comprometida
entrega o erro no corpo sem lançar, **e** pela cobertura de branch de `plugin/http.ts` saindo
de 50% para 100% em `npx vitest run --coverage`.

## Context

A auditoria `loop-code-review` de 2026-08-04 registrou 81 findings; o M6 ataca os 6 que vivem
na fronteira HTTP do plugin — a superfície publicada do pacote (`@theokit/studio/plugin`,
único export do `package.json`). O núcleo é o finding #46+#47: o guard de `plugin/http.ts:13`
verifica `writableEnded || destroyed` mas **omite `res.headersSent`**, e
`plugin/static-serve.ts:154` compromete o head 200 antes da leitura que pode lançar. O
`readFileSync` levanta `EACCES` **deterministicamente** depois de `existsSync` e `statSync`
passarem, então um único asset ilegível derruba o dev server em toda requisição. Reproduzido
duas vezes de forma independente (revisor no Node v22.22.2 e o quality gate contra o
`serveStudio` real, exit code 1).

O blueprint `plugin-hardening` mudou o desenho em três pontos, e o plano abaixo já nasce com
eles absorvidos:

1. **Erro no corpo quando a resposta já começou** (blueprint, primeira decisão) — genkit
   (`reflection.ts:359-363`) não retorna em silêncio quando os
   cabeçalhos já foram enviados: encerra a resposta com o erro tipado **no corpo**. Nosso plano
   original só adicionaria o guard, o que trocaria um crash por um mistério.
2. **Namespace de API antes do fallback** (blueprint, segunda decisão) — mastra
   (`index.ts:428-435`) exclui o namespace de API **antes** do
   fallback da SPA. Nosso `handleStudioRequest` já faz isso para `/_studio/api/`, mas
   `/_studio/svc/` (namespace travado no `CLAUDE.md`) não casa e cai na SPA.
3. **Sem framework HTTP** (blueprint, terceira decisão) — não importar framework. Ambos os
   peers carregam um (express,
   Hono); nós rodamos dentro do Vite do usuário e não podemos.

## Baseline Context (deep review of current state)

### Files that will be touched

| File | LoC hoje | Último commit | Por que existe | Invariante a preservar |
|---|---|---|---|---|
| `packages/studio/plugin/http.ts` | 23 | `697e59f` (2026-07-15) | Envelope de erro canônico de TODOS os handlers (evita ciclo index ⇄ reflection-api) | O envelope continua sendo o único formato de erro do plugin |
| `packages/studio/plugin/static-serve.ts` | 156 | `77efb89` (2026-07-15) | Serve a SPA sob `/_studio` com injeção de config, resolução de dist e defesa de path traversal | A defesa de traversal (`:64`) permanece intacta e testada |
| `packages/studio/plugin/index.ts` | 139 | `77efb89` (2026-07-15) | Dispatcher + único export publicado (`theokitStudio()`) | Assinatura pública `theokitStudio(options)` inalterada |
| `packages/studio/plugin/agent-scan.ts` | 67 | `3b9664e` (2026-07-15) | Varredura do fs que descobre agents sob `agents/` | Convenções de skip (testes, `tools/`) preservadas |
| `packages/studio/src/data/reflection-datasource.ts` | 71 | `74a96c6` (2026-08-03) | Adapter live do browser sobre `/_studio/api/*` | Delegação por spread ao fallback continua funcionando |
| `packages/studio/plugin/http.test.ts` | (NEW) | — | — | — |
| `packages/studio/plugin/static-serve.test.ts` | 229 | `77efb89` (2026-07-15) | Testes do serving e da defesa de traversal | Os 15 testes atuais continuam verdes |
| `packages/studio/plugin/index.test.ts` | 157 | `77efb89` (2026-07-15) | Testes do dispatcher | Os 5 testes atuais continuam verdes |
| `packages/studio/plugin/run-endpoint.test.ts` | 375 | `697e59f` (2026-07-15) | Testes do run endpoint | Os 16 testes atuais continuam verdes |
| `packages/studio/plugin/agent-scan.test.ts` | 64 | `3b9664e` (2026-07-15) | Testes do scan | Os 5 testes atuais continuam verdes |
| `packages/studio/src/data/reflection-datasource.test.ts` | 100 | `74a96c6` (2026-08-03) | Testes do adapter live | Os 5 testes atuais continuam verdes |

### Current callers / dependents

*(verificado por grep, não presumido)*

- `sendErrorEnvelope` / `sendJson` — **3 consumidores de produção**: `plugin/index.ts`,
  `plugin/static-serve.ts`, `plugin/run-endpoint.ts`. Nenhum arquivo de teste os importa
  diretamente hoje (por isso o guard nunca foi exercitado — finding #68).
- `serveStudio` — 1 consumidor: `plugin/index.ts:103`.
- `scanStudioAgents` — **2 consumidores**: `plugin/reflection-api.ts:85` e
  `plugin/run-endpoint.ts:173`. Um throw aqui derruba **reflection e run**, não só um deles.
- `createReflectionDataSource` — `src/main.tsx:20` (composition root) e a suíte de integração.
- Consumidores cross-repo: o pacote foi publicado em `v0.3.0`; um host externo pode montar o
  plugin. Nenhuma assinatura pública muda neste plano (ver ADR A3).

### Architecture boundaries affected

`rules/architecture.md` § 1: o plugin é camada **interface** (fronteira de rede), não domínio.
Toda mudança fica em interface/adapters; nenhum tipo do domínio da SPA (`src/data/types.ts`)
é importado pelo node-side. `plugin/http.ts` permanece sem dependência de domínio — é helper
de transporte puro.

### Domain glossary

| Termo | Definição |
|---|---|
| **Envelope de erro** | `{ error: { code, message } }` — formato único de falha do plugin (`plugin/http.ts:6`) |
| **Resposta comprometida** | `res.headersSent === true`: o head já foi para o socket; status e headers não podem mais mudar |
| **Namespace reservado** | Prefixo de URL travado no contrato (`/_studio/api/`, `/_studio/svc/`) que a SPA nunca deve atender |
| **Fallback da SPA** | Servir `index.html` para path sem extensão conhecida, para deep-link do router do browser |
| **Guard** | Checagem no topo da função que decide se ainda é seguro escrever na resposta |

## Prior Art & Related Work

- **Interno:** `knowledge-base/discoveries/blueprints/plugin-hardening-blueprint.md` (este ciclo)
  — três decisões de arquitetura com precedente citado nos dois peers.
- **Interno:** `knowledge-base/discoveries/blueprints/m1-studio-table-stakes-blueprint.md` —
  arquitetura do plugin (middleware Vite; SPA embarcada no pacote).
- **Interno:** `knowledge-base/audits/studio-code-review-2026-08-04/` — os 6 findings-alvo com
  `file:line` e reprodução.
- **Externo (lido, não copiado):** genkit `js/core/src/reflection.ts:359-363` (branch de
  `headersSent` escrevendo o erro no corpo); mastra `packages/deployer/src/server/index.ts:428-435`
  (namespace de API antes do fallback).
- **Skills `*-patterns`:** nenhuma registrada neste projeto (verificado por `ls skills/*-patterns/`).

## Objective

Fechar os 6 findings da fronteira HTTP do plugin sem alterar assinatura pública, sem adicionar
dependência, e deixando cada correção provada por um teste que falha antes dela.

## ADRs

### A1 — O guard entrega o erro no corpo quando a resposta já começou

**Decisão:** `sendErrorEnvelope` e `sendJson` passam a checar `res.headersSent`. Quando os
cabeçalhos já foram enviados, `sendErrorEnvelope` **encerra a resposta escrevendo o envelope no
corpo** em vez de retornar em silêncio; `sendJson` retorna (não há resposta de sucesso a dar
depois de um head comprometido).

**Alternativa rejeitada — apenas adicionar `headersSent` ao guard e retornar em ambos.** Era o
plano original do M6. Rejeitada porque deixa o cliente com um 200 truncado e sem explicação:
troca um crash observável por um mistério silencioso, o que `rules/error-handling.md` § 5
classifica como o pior modo de falha ("erro engolido").

**Rationale:** `rules/error-handling.md` § 2 (fail-clear: mensagem específica com contexto) +
precedente do genkit (blueprint § Q1, primeira decisão). Custo aceito: o corpo pode ficar com JSON concatenado a
um payload parcial — um corpo malformado **com erro descrito** é diagnosticável; um socket que
morre calado não é.

### A2 — Namespace reservado é decidido por lista, antes do fallback da SPA

**Decisão:** introduzir uma noção explícita de "namespace reservado da API" que inclui
`/_studio/api/` e `/_studio/svc/`. Qualquer path sob um namespace reservado que não case com
rota recebe o envelope 404 tipado — **independentemente da extensão da URL**.

**Alternativa rejeitada — tratar `/_studio/svc/` como rota da SPA até o M2/M3 implementarem o
proxy.** Rejeitada porque produz duas respostas diferentes para o mesmo namespace documentado
(`/_studio/svc/x/query` → HTML 200, `/_studio/svc/x/index.json` → 404 JSON), que é exatamente
o finding #49.

**Alternativa rejeitada — adotar um router (Hono) e delegar via `next()` como o mastra.**
Rejeitada por A3.

**Rationale:** `CLAUDE.md § Locked names` trava `/_studio/svc/{lens,memory,rag}/*` como rota de
proxy; responder HTML numa rota de contrato é defeito de contrato. Precedente: blueprint § Q3.

### A3 — Nenhuma dependência nova; nenhuma assinatura pública alterada

**Decisão:** as correções ficam em lógica sobre `ServerResponse` cru. Sem framework HTTP, sem
mudança em `theokitStudio(options)`.

**Alternativa rejeitada — importar Hono/express para ganhar `onError` e router.** O plugin roda
dentro do Vite do **host**; impor um framework é custo dele. Rung 4 da parsimony ladder (reusar
o que já está instalado) e rung 1 (isto precisa existir? não).

**Rationale:** `rules/parsimony-ladder.md`; blueprint § Q6 (o padrão do genkit sobrevive sem
framework, o do mastra não). Precedente registrado na terceira decisão do blueprint.

### A4 — `scanStudioAgents` degrada por diretório, não por processo

**Decisão:** um diretório ilegível durante a varredura é registrado e pulado; a varredura
continua e devolve os agents que conseguiu ler.

**Alternativa rejeitada — deixar propagar (comportamento atual).** Rejeitada porque
`scanStudioAgents` tem **dois** consumidores (`reflection-api.ts:85`, `run-endpoint.ts:173`):
um `EACCES` em uma subpasta derruba a reflection inteira E o run.

**Alternativa rejeitada — engolir silenciosamente.** Proibida por `rules/error-handling.md` § 2.
O item degradado precisa ficar **visível**, no mesmo espírito do agent com `error` que a
reflection já expõe (EC-9 do M1).

**Rationale:** `rules/error-handling.md` § 3 (recuperar onde faz sentido, na fronteira certa).

## Drawbacks & Risks

| # | Risco | Severidade | Mitigação | Dono |
|---|---|---|---|---|
| R1 | Inverter read/commit em `serveStudio` altera Content-Type ou cache de assets | Média | A asserção de paridade HTTP == chamada direta == scan do fs (`studio-plugin.integration.test.ts:180`) pega regressão de serving; os 15 testes de `static-serve.test.ts` seguem verdes | implementador |
| R2 | Expor `headersSent` nos 3 fakes de teste pode mascarar asserções que hoje passam por outro motivo | Média | Cada fake ganha a propriedade com valor **explícito** (não `undefined`); a suíte inteira roda antes e depois e o número de testes verdes é comparado (119 → 119 + novos) | implementador |
| R3 | `/_studio/svc/*` passar a responder 404 quebra um host externo que hoje recebe HTML | Baixa | O pacote está em `v0.3.0` e a rota nunca foi implementada — HTML numa rota de API não é contrato que alguém possa depender; registrado no CHANGELOG como correção de contrato | release |
| R4 | Escrever erro no corpo de uma resposta parcial produz JSON inválido para o cliente | Baixa | Aceito e documentado em A1: o cliente já estava recebendo um corpo truncado; agora recebe truncado **com a causa**. O teste do http.test.ts fixa esse comportamento como intencional | implementador |
| R5 | O `.catch()` de `index.ts:126` chama `sendErrorEnvelope`; se ELE lançar, vira unhandled rejection (a cadeia original) | **Alta** | É exatamente o que A1 remove. T1.1 tem teste que prova que `sendErrorEnvelope` não lança sobre resposta comprometida — a última linha de defesa deixa de ser a primeira causa de morte | implementador |

## Unresolved Questions

- Logar server-side na última linha de defesa (`index.ts:126`)? O finding #55 (low) aponta
  que o handler nunca loga. Fica **fora deste plano** — o M6 é sobre não morrer; observabilidade
  do dev server é escopo do M8 (triagem dos low). Registrado para não parecer esquecido.
- Deve `sendJson` logar quando a resposta já está comprometida? Decidido em A1 que apenas retorna.
  Se surgir caso real de sucesso pós-commit, revisitar — hoje seria especulação (YAGNI).

## Dependencies

| Dependência | Versão | Já instalada? | Rule 9 (por que não escrever do zero) |
|---|---|---|---|
| `node:http` (`ServerResponse`) | runtime Node ≥22.12 | sim (stdlib) | stdlib; rung 2 da parsimony ladder |
| `vitest` | ^3.x (já no repo) | sim | runner do projeto; nenhuma dep nova |

**Nenhuma dependência nova é adicionada por este plano** (ADR A3). `/deps-audit` roda mesmo
assim, conforme `cycle-plan`.

## Dependency Graph

```
T1.1 (guard + corpo de erro)  ─┬─→ T1.2 (swap read/commit no asset)
                               └─→ T1.3 (fakes com headersSent)
T2.1 (namespace reservado)     ── independente
T3.1 (agent-scan resiliente)   ── independente
T4.1 (envelope tipado no cliente) ── independente
                                          ↓
                            Final Phase: Integration Validation
```

T1.1 bloqueia T1.2 e T1.3 (ambos dependem do guard corrigido para asseverar o novo
comportamento). T2.1, T3.1 e T4.1 são paralelizáveis entre si.

## Phase 1: O guard e seu gatilho

**Objective:** `sendErrorEnvelope` nunca lança, e o caminho que hoje o dispara deixa de existir.

### T1.1 — Guard de `headersSent` com entrega do erro no corpo

#### Objective
`sendErrorEnvelope` e `sendJson` checam `res.headersSent`; quando comprometida,
`sendErrorEnvelope` encerra a resposta com o envelope no corpo.

#### Why this step (action + reasoning — ReAct discipline)
1. **What:** adiciona o predicado `headersSent` aos dois guards de `plugin/http.ts` e, no caso
   comprometido de `sendErrorEnvelope`, escreve `{error:{code,message}}` no corpo antes de `end()`.
2. **Why now:** é a raiz da única cadeia que mata o processo do host (findings #46/#47, ADR A1).
   Tudo o mais no M6 é contrato ou resiliência; isto é disponibilidade. E R5 mostra que a
   "última linha de defesa" do dispatcher hoje é a própria causa da morte.

#### Evidence
- `plugin/http.ts:13,20` — `if (res.writableEnded || res.destroyed) return;` (guard incompleto).
- `plugin/index.ts:126-134` — o `.catch()` que chama `sendErrorEnvelope` e converte o throw em
  unhandled rejection.
- Precedente: genkit `js/core/src/reflection.ts:359-363`.
- Reprodução: `knowledge-base/audits/studio-code-review-2026-08-04/phase3_code_review.md`.

#### Files to edit
- `packages/studio/plugin/http.ts` (23 LoC hoje; +~10)
- `packages/studio/plugin/http.test.ts` **(NEW)**

#### Deep file dependency analysis
`http.ts` é importado por `index.ts`, `static-serve.ts` e `run-endpoint.ts` (3 consumidores de
produção, verificados por grep). Nenhum teste o importa hoje — por isso o branch nunca foi
exercitado. A mudança é aditiva no comportamento: o caminho não-comprometido é idêntico.

#### TDD
- **RED 1** `sendErrorEnvelope_writes_body_when_headers_already_sent`: given um `ServerResponse`
  real de `node:http` com `writeHead(200)` já chamado, when `sendErrorEnvelope(res, 500, "INTERNAL", "boom")`,
  then `expect(body).toContain("INTERNAL")` e `expect(body).toContain("boom")`.
- **RED 2** `sendErrorEnvelope_does_not_throw_when_headers_sent`:
  `expect(() => sendErrorEnvelope(res, 500, "INTERNAL", "boom")).not.toThrow()` — o modo de falha original.
- **RED 3** `sendJson_returns_silently_when_headers_already_sent`:
  `expect(() => sendJson(res, 200, {})).not.toThrow()` e `expect(res.write).toHaveBeenCalledTimes(0)`.
- **RED 4** `sendErrorEnvelope_sets_status_and_json_when_not_committed`: caminho feliz intacto —
  `expect(res.statusCode).toBe(404)` e `expect(JSON.parse(body).error.code).toBe("NOT_FOUND")`.
- **RED 5 (EC-1, MUST FIX)** `sendErrorEnvelope_does_not_write_when_response_already_ended`:
  given resposta com `writableEnded === true` E `headersSent === true`, when `sendErrorEnvelope(...)`,
  then `expect(() => ...).not.toThrow()` e `expect(res.end).toHaveBeenCalledTimes(0)`.
  **A ordem dos predicados é o contrato:** `writableEnded ||
  destroyed` sai primeiro; só então o branch de `headersSent` escreve o corpo. Sem isso, o M6
  troca um crash por outro.
- **GREEN:** implementar o guard nessa ordem.
- **REFACTOR:** extrair o predicado `canWriteHead(res)` se os dois guards divergirem.

#### Concurrency tests
(none — single-threaded) — `http.ts` não tem estado compartilhado nem async; o teste usa um
servidor real mas cada caso é sequencial.

#### Acceptance Criteria
- `npx vitest run plugin/http.test.ts` retorna exit code 0 com >= 5 testes passando.
- `npx vitest run --coverage` reporta coverage >= 100 de branch em `plugin/http.ts` (hoje 50).
- Caminho não-comprometido inalterado: `npx vitest run plugin/` retorna exit code 0 com os 36 testes atuais dos 3 consumidores verdes.

#### DoD (Definition of Done)
- `npx vitest run` — 119 testes anteriores + os novos, todos verdes.
- `npx tsc --noEmit` limpo.
- `npx biome check .` limpo.

### T1.2 — Ler o asset antes de comprometer o head

#### Objective
`serveStudio` lê o arquivo e só então escreve o head 200 — o gatilho determinístico do crash
deixa de existir.

#### Why this step
1. **What:** inverte a ordem em `static-serve.ts:153-155`: `readFileSync` primeiro, `writeHead`
   depois, com o erro de leitura virando envelope 500/404 antes de qualquer byte sair.
2. **Why now:** mesmo com T1.1, um `EACCES` aqui produziria uma resposta 200 sem corpo. E
   `serveIndexWithConfig` (`:85→:98`) **já** lê antes de comprometer — o branch de asset é o
   único fora do padrão do próprio arquivo.

#### Evidence
- `plugin/static-serve.ts:149-155` — `existsSync`/`statSync`, `writeHead(200)`, `readFileSync`.
- `plugin/static-serve.ts:85-98` — o padrão correto já usado para o index.
- O quality gate provou `EACCES` determinístico após os dois checks.

#### Files to edit
- `packages/studio/plugin/static-serve.ts` (156 LoC hoje; ±0)
- `packages/studio/plugin/static-serve.test.ts` (229 LoC; +~25)

#### Deep file dependency analysis
`serveStudio` tem 1 consumidor (`index.ts:103`). A defesa de traversal (`safeJoin`, `:64`) é
anterior e não é tocada — os testes dela seguem sendo a rede de proteção (R1).

#### TDD
- **RED 1** `asset_read_failure_yields_error_envelope_not_committed_200`: given arquivo existente
  mas ilegível (`chmod 000` em tmpdir), when `serveStudio(...)`, then
  `expect(res.statusCode).not.toBe(200)` e `expect(JSON.parse(body).error.code).toBeDefined()`.
- **RED 2 (EC-6, SHOULD TEST)** `empty_asset_still_returns_200_with_content_type`: given arquivo
  de 0 byte, when `serveStudio(...)`, then `expect(res.statusCode).toBe(200)` e
  `expect(headers["Content-Type"]).toBe("text/css")`.
- **GREEN:** inverter a ordem.
- **REFACTOR:** nenhuma prevista.

#### Concurrency tests
(none — single-threaded) — leitura síncrona por request, sem estado compartilhado.

#### Acceptance Criteria
- `npx vitest run plugin/static-serve.test.ts` falha antes da inversão e retorna exit code 0 depois.
- Os 15 testes existentes de `static-serve.test.ts` seguem verdes: `npx vitest run plugin/static-serve.test.ts` reporta `15 passed` no mínimo.

#### DoD
- `npx vitest run plugin/` verde.

### T1.3 — Fakes de resposta expõem `headersSent`

#### Objective
Os três harnesses passam a modelar `headersSent`, para que o guard corrigido seja assertável.

#### Why this step
1. **What:** adiciona `headersSent` explícito aos fakes de `static-serve.test.ts:48`,
   `run-endpoint.test.ts:47` e `index.test.ts:51`.
2. **Why now:** finding #68 — hoje os fakes tornam o guard **inalcançável por construção**
   (um hardcoda `destroyed:false`, dois deixam `destroyed` indefinido, nenhum define
   `headersSent`). Sem isto, T1.1 seria testável só no teste novo e continuaria não-exercitado
   pelos consumidores.

#### Evidence
- `plugin/static-serve.test.ts:48` — `get destroyed() { return false; }`.
- `plugin/run-endpoint.test.ts:47` e `plugin/index.test.ts:51` — definem `writableEnded`, nunca `destroyed`.
- `grep -rn headersSent packages/studio` retorna **zero** ocorrências hoje.

#### Files to edit
- `packages/studio/plugin/static-serve.test.ts`, `plugin/run-endpoint.test.ts`, `plugin/index.test.ts`

#### Deep file dependency analysis
Só arquivos de teste. Risco R2: valor explícito (`headersSent: false`) em vez de `undefined`,
para não trocar um falso-negativo por outro.

#### TDD
- **RED** `dispatcher_error_after_committed_head_does_not_reject`: given um handler que lança
  **depois** de `writeHead`, when a requisição atravessa o middleware, then
  `expect(rejections).toHaveBeenCalledTimes(0)` — nenhuma unhandled rejection.
- **GREEN:** fakes atualizados + guard de T1.1.
- **EC-2 (MUST FIX):** o fake de `index.test.ts` expõe `headersSent` como **getter que reflete se
  `writeHead` foi chamado** — um literal congelado nunca vira `true` e faria o RED acima passar
  vacuamente, repetindo o defeito que a auditoria achou em `static-serve.test.ts:48`
  (`destroyed` hardcoded). Os outros dois fakes podem manter literal explícito.

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- `npx vitest run` reporta contagem >= 119 testes passando e exit code 0; nenhum teste anterior removido (diff de `git diff --stat` não mostra linhas de teste deletadas).

#### DoD
- `npx vitest run` verde.

## Phase 2: Contrato de namespace

### T2.1 — Namespace reservado antes do fallback da SPA

#### Objective
`/_studio/svc/*` responde envelope 404 tipado, com a mesma resposta para qualquer extensão.

#### Why this step
1. **What:** o dispatcher passa a reconhecer um conjunto de namespaces reservados
   (`/_studio/api/`, `/_studio/svc/`) e emite 404 tipado para path sem rota, antes de `serveStudio`.
2. **Why now:** finding #49. `CLAUDE.md § Locked names` trava `/_studio/svc/{lens,memory,rag}/*`
   como proxy; hoje `.../query` devolve HTML 200 e `.../index.json` devolve 404 JSON — duas
   respostas para um namespace de contrato.

#### Evidence
- `plugin/index.ts:98-101` — a checagem existe, mas só para `API_PREFIX` (`/_studio/api/`).
- `plugin/index.ts:103` — o fallback que engole `/_studio/svc/`.
- Precedente: mastra `packages/deployer/src/server/index.ts:428-435`.

#### Files to edit
- `packages/studio/plugin/index.ts` (139 LoC; +~8)
- `packages/studio/plugin/index.test.ts` (157 LoC; +~20)

#### Deep file dependency analysis
`handleStudioRequest` é chamado só pelo middleware do próprio arquivo. A ordem das checagens é
o contrato: reservado → rota → 404 tipado; SPA só depois.

#### TDD
- **RED 1** `svc_namespace_without_route_returns_typed_404_json`: given `/_studio/svc/lens/v1/traces`,
  when despachado, then `expect(res.statusCode).toBe(404)` e
  `expect(JSON.parse(body).error.code).toBe("NOT_FOUND")`.
- **RED 2** `svc_namespace_404_is_extension_independent`: given `.../query` e `.../index.json`,
  when ambos despachados, then `expect(a.statusCode).toBe(b.statusCode)` e
  `expect(a.contentType).toBe(b.contentType)`.
- **RED 3 (EC-3, MUST FIX)** `bare_svc_path_is_also_reserved`: given `/_studio/svc` **sem barra
  final**, when despachado, then `expect(res.statusCode).toBe(404)`. O predicado é
  `pathname === "/_studio/svc" || pathname.startsWith("/_studio/svc/")` — a mesma forma do mastra
  (`index.ts:429-430`). Sem isso, o bug sobrevive exatamente na borda.
- **RED 4 (EC-7, SHOULD TEST)** `reserved_namespace_requires_separator`: given `/_studio/svcfoo`,
  when despachado, then `expect(res.statusCode).not.toBe(404)` — protege contra a forma insegura
  `startsWith("/_studio/svc")`.
- **GREEN:** lista de namespaces reservados consultada antes do fallback.
- **REFACTOR:** extrair `isReservedApiNamespace(pathname)`.

#### Concurrency tests
(none — single-threaded)

#### Acceptance Criteria
- Ambos os paths devolvem status 404 e `content-type: application/json`, e `expect(body.error.code).toBe("NOT_FOUND")` passa para os dois.
- A SPA continua servida: requisição a `/_studio/builder` retorna status 200 com `content-type: text/html`.

#### DoD
- `npx vitest run plugin/index.test.ts` verde; integração verde.

## Phase 3: Resiliência do scan

### T3.1 — `scanStudioAgents` degrada por diretório

#### Objective
Diretório ilegível é pulado com registro visível; a varredura devolve o que conseguiu ler.

#### Why this step
1. **What:** envolve a leitura de cada diretório de forma que `EACCES`/`ENOENT` não aborte a
   varredura inteira.
2. **Why now:** `scanStudioAgents` tem **dois** consumidores (`reflection-api.ts:85`,
   `run-endpoint.ts:173`); hoje um subdiretório ilegível derruba reflection **e** run com 500.

#### Evidence
- `plugin/agent-scan.ts:35` — leitura recursiva sem tratamento (finding da fase 3).
- Callers verificados por grep (ver Baseline Context § Current callers).

#### Files to edit
- `packages/studio/plugin/agent-scan.ts` (67 LoC; +~8)
- `packages/studio/plugin/agent-scan.test.ts` (64 LoC; +~20)

#### Deep file dependency analysis
A função devolve `AgentFileNode[]`; a forma do retorno não muda. Degradação é por item, no
espírito do agent com `error` que a reflection já expõe.

#### TDD
- **RED** `unreadable_subdirectory_is_skipped_not_fatal`: given tmpdir com subpasta `chmod 000`,
  when `scanStudioAgents(root)`, then `expect(nodes.map(n => n.name)).toContain("support")` e
  `expect(warnSpy).toHaveBeenCalled()`.
- **GREEN:** try/catch por diretório com registro.
- **EC-4 (MUST FIX):** o mecanismo de visibilidade é **fixado aqui, não deixado ao gosto do
  implementador**: `console.warn` com o caminho e o `code` do erro, e o teste assevera a chamada
  via spy. "Visível" sem mecanismo não é critério executável — e permitiria engolir o erro
  passando pelo gate (`rules/error-handling.md` § 2).
- **REFACTOR:** nenhuma prevista.

#### Concurrency tests
(none — single-threaded) — varredura síncrona.

#### Acceptance Criteria
- `npx vitest run plugin/agent-scan.test.ts` falha antes da correção e retorna exit code 0 depois, com os 5 testes atuais entre os aprovados.
- O diretório pulado emite `console.warn` contendo o caminho e o `code` do erro; o teste assevera a chamada via spy (`expect(warnSpy).toHaveBeenCalled()`).

#### DoD
- `npx vitest run plugin/agent-scan.test.ts` verde.

## Phase 4: Envelope tipado no cliente

### T4.1 — `ReflectionDataSource` reconstrói erro do envelope

#### Objective
O cliente lê `{error:{code,message}}` do servidor e propaga um erro com o `code`, em vez de
montar `Error` genérico a partir do status HTTP.

#### Why this step
1. **What:** em `reflection-datasource.ts:39`, quando a resposta não é ok, tentar parsear o
   envelope e lançar um erro que carregue `code` e a mensagem do servidor.
2. **Why now:** finding #48 — o servidor monta o envelope com cuidado e o cliente o joga fora,
   degradando detecção de offline para comparação de string. Precedente: `GenkitError` carrega
   `status` + `code` (blueprint § Q2).

#### Evidence
- `src/data/reflection-datasource.ts:38-41` — `throw new Error(\`reflection ${path} responded ${res.status}...\`)`.
- `plugin/http.ts:7-16` — o envelope que o servidor envia e o cliente ignora.

#### Files to edit
- `packages/studio/src/data/reflection-datasource.ts` (71 LoC; +~12)
- `packages/studio/src/data/reflection-datasource.test.ts` (100 LoC; +~25)

#### Deep file dependency analysis
Consumido pelo composition root (`src/main.tsx:20`) e pela integração. A delegação por spread ao
fallback não é tocada. O tipo de erro lançado é observado pela UI via `loadError` (string), então
a mudança é aditiva: a mensagem fica melhor, o shape do que a UI lê não muda.

#### TDD
- **RED 1** `reflection_error_envelope_is_propagated_with_code`: given servidor devolvendo 404 com
  `{error:{code:"NOT_FOUND",message:"sem rota"}}`, when `ds.listAgents()`, then
  `expect(err.code).toBe("NOT_FOUND")` e `expect(err.message).toContain("sem rota")`.
- **RED 2** `non_envelope_error_body_falls_back_to_status_message`: given corpo não-JSON num 500,
  when `ds.listAgents()`, then `expect(...).rejects.toThrow(/responded 500/)` — caso negativo
  (`rules/testing.md` § 4.1).
- **RED 3 (EC-8, SHOULD TEST)** `envelope_without_code_falls_back_to_status_message`: given corpo
  `{"error":{"message":"x"}}` (JSON válido, envelope incompleto), when `ds.listAgents()`, then
  `expect(err.message).toContain("x")` sem `SyntaxError`.
- **GREEN:** parse defensivo do envelope. **EC-5 (MUST FIX):** ler o corpo **uma única vez** como
  texto (`const raw = await res.text()`) e então `JSON.parse(raw)` dentro de try/catch. A forma
  ingênua (`await res.json()` no try, `await res.text()` no catch) lança
  `TypeError: body used already` — o body de `fetch` é stream de leitura única, e o caso negativo
  do RED 2 seria impossível de satisfazer.
- **REFACTOR:** erro tipado em `src/data/types.ts` se a UI precisar distinguir.

#### Concurrency tests
(none — single-threaded) — `fetch` sequencial por chamada.

#### Acceptance Criteria
- O erro lançado contém o `code` do servidor: `expect(err.code).toBe("NOT_FOUND")` passa quando o envelope existe.
- Corpo malformado não propaga `SyntaxError`: `await expect(ds.listAgents()).rejects.toThrow(/responded 500/)` passa com corpo não-JSON.

#### DoD
- `npx vitest run src/data/reflection-datasource.test.ts` verde.

## Accepted Risks (caveats do gate)

- **`symbol_fab_unverifiable_typescript` (cap 89).** O detector de fabricação de símbolo do
  `/code-quality` não conseguiu verificar alguns pacotes npm com escopo (`@theokit/*`,
  `@usetheo/*`) — resposta ambígua do registry, esperado para pacotes privados/workspace sem
  rede. **Não é achado sobre este plano**: é limitação do ambiente de verificação. O veredito
  fica `SHIPPABLE_WITH_CAVEATS` (89) em vez de `SHIPPABLE`, e o caveat viaja explícito até o PR
  em vez de ser silenciado.

## Coverage Matrix

| Requisito (DoD do M6 no ROADMAP) | Tarefa(s) | Cobertura |
|---|---|---|
| Guards verificam `headersSent`; asset lido antes do head; regressão provada por teste | T1.1, T1.2 | ✅ 100% |
| `plugin/http.test.ts` existe e os 3 fakes expõem `headersSent` | T1.1, T1.3 | ✅ 100% |
| `/_studio/svc/*` responde 404 tipado, igual para qualquer extensão | T2.1 | ✅ 100% |
| `scanStudioAgents` trata diretório ilegível, com caso negativo coberto | T3.1 | ✅ 100% |
| `ReflectionDataSource` propaga envelope tipado | T4.1 | ✅ 100% |
| Suíte verde e branch de `plugin/http.ts` 50% → 100% | T1.1 + Final Phase | ✅ 100% |

**6/6 critérios do DoD mapeados. Nenhum requisito sem tarefa.**

## Global Definition of Done

- [ ] `npx vitest run` — todos os testes verdes (119 anteriores + novos), zero skip.
- [ ] `npx vitest run --coverage` — `plugin/http.ts` com 100% de branch; cobertura global não
      regride abaixo de 89,46% de branch.
- [ ] `npx tsc --noEmit` limpo.
- [ ] `npx biome check .` limpo.
- [ ] `npm run build` (vite + tsup) verde — o export `./plugin` continua compilando.
- [ ] Nenhum arquivo tocado ultrapassa 500 LoC (`rules/architecture.md`); maior alvo é
      `static-serve.ts` com 156.
- [ ] CHANGELOG `[Unreleased]` atualizado (Regra 6).
- [ ] Nenhuma dependência nova (ADR A3), confirmado por `git diff package.json`.

## Failure scenarios (external I/O touched)

O plugin é fronteira de rede e de filesystem — esta seção é obrigatória.

| Dependência externa | Modo de falha | Como o teste reproduz | Comportamento esperado |
|---|---|---|---|
| Filesystem (asset da SPA) | `EACCES` em arquivo existente | `chmod 000` em tmpdir (T1.2) | Envelope de erro; **nunca** 200 comprometido; processo vive |
| Filesystem (varredura de agents) | `EACCES` em subdiretório | `chmod 000` em subpasta (T3.1) | Diretório pulado e visível; demais agents retornados |
| Socket HTTP (resposta do cliente) | Head já enviado quando o erro ocorre | `writeHead(200)` antes de `sendErrorEnvelope` (T1.1) | Erro no corpo; sem `ERR_HTTP_HEADERS_SENT`; sem unhandled rejection |
| HTTP do browser → dev server | 4xx/5xx com envelope; corpo malformado | `fetchImpl` stub (T4.1) | Erro tipado com `code`; corpo não-JSON não quebra o cliente |

## Final Phase: Integration Validation (MANDATORY)

- [ ] `npm test` na raiz do monorepo — verde.
- [ ] `npm run typecheck` — verde.
- [ ] `npm run check` (biome) — verde.
- [ ] `npm run build` — verde.
- [ ] Chaos pass das failure scenarios acima — cada linha da tabela tem teste correspondente
      rodando e passando.
- [ ] `tests/e2e/studio-e2e.test.ts` (oráculo contratual do M1) segue verde — a fronteira mudou,
      o contrato não.

## Absorbed MUST-FIX items (from /edge-case-plan)

### EC-1 (auto-absorbed): O guard novo pode trocar um crash por outro
- **Source:** edge-case-plan MUST FIX
- **Affected task:** T1.1
- **Family:** State
- **Scenario:** A resposta pode estar **comprometida E encerrada** ao mesmo tempo
- **Impact:** Exatamente a falha que o M6 existe para remover, com outro código de erro — dentro
- **Suggested fix:** A ordem dos predicados é o contrato: `writableEnded || destroyed` continua

### EC-2 (auto-absorbed): Um fake com `headersSent` fixo torna o teste novo impossível
- **Source:** edge-case-plan MUST FIX
- **Affected task:** T1.3
- **Family:** State
- **Scenario:** O plano diz "valor explícito (`headersSent: false`)" para não deixar `undefined`.
- **Impact:** O teste do dispatcher passaria vacuamente, repetindo o defeito que a auditoria já
- **Suggested fix:** Pelo menos o fake de `index.test.ts` expõe `headersSent` como **getter que

### EC-3 (auto-absorbed): `/_studio/svc` exato (sem barra) escapa do namespace reservado
- **Source:** edge-case-plan MUST FIX
- **Affected task:** T2.1
- **Family:** Boundary
- **Scenario:** O plano reserva o prefixo `/_studio/svc/`. A requisição para `/_studio/svc`
- **Impact:** O finding #49 fica corrigido para todos os paths menos o mais curto deles.
- **Suggested fix:** Reservar `pathname === "/_studio/svc" || pathname.startsWith("/_studio/svc/")`

### EC-4 (auto-absorbed): "Diretório pulado é visível" não é critério executável
- **Source:** edge-case-plan MUST FIX
- **Affected task:** T3.1
- **Family:** Format
- **Scenario:** O critério de aceite diz que o diretório ilegível fica "visível (não engolido em
- **Impact:** `rules/error-handling.md` § 2 proíbe engolir; um critério não-verificável permite
- **Suggested fix:** Fixar o mecanismo no plano: a varredura emite `console.warn` com o caminho e

### EC-5 (auto-absorbed): O corpo da resposta só pode ser lido uma vez
- **Source:** edge-case-plan MUST FIX
- **Affected task:** T4.1
- **Family:** I/O
- **Scenario:** O RED 2 pede que corpo não-JSON não quebre o cliente. A implementação ingênua
- **Impact:** O caso negativo que o plano exige seria impossível de satisfazer, e o cliente
- **Suggested fix:** Ler **uma vez** como texto (`const raw = await res.text()`) e então tentar

