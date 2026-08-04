---
slug: plugin-hardening
milestone_id: M6
created_at: 2026-08-04
plan: knowledge-base/discoveries/plans/plugin-hardening-plan.md
peers: genkit, mastra
status: complete
---

# Blueprint: Fronteira HTTP de dev servers embarcados (M6)

## Context

Executa o plano `plugin-hardening-plan.md` v1.1 (`SHIPPABLE`, 99.5). Sete questões, quatro
corners, dois peers. Todas as respostas vêm de leitura direta do código clonado; a allowlist
web está vazia, então **nenhuma fonte externa foi consultada** (ADR D3 do plano).

**Nota de execução honesta:** a pesquisa foi conduzida inline nesta sessão, não pelo halt-loop
`ralph-loop` que `/discover-execute` normalmente dirige. O contrato de qualidade que importa
foi mantido — toda resposta cita `file:line` verificado, questões sem sinal seriam marcadas
`partial` — mas o motor de execução foi diferente do canônico. Registrado para que ninguém
leia este blueprint como saída de halt-loop.

## Objective

Responder como genkit e mastra protegem a fronteira HTTP, para que o M6 corrija a sua sem
inventar convenção nem copiar código.

## Coverage Corner 1 — Integration Tests

### Q4 — Como testam a fronteira HTTP de erro ponta a ponta? **[done]**

Os dois peers testam a fronteira, por meios **opostos**:

- **genkit** sobe um **servidor real em porta real**:
  `references/genkit/js/core/tests/reflection_test.ts:44` — `new ReflectionServer(registry, { port: await getPort() })`
  — e fala com ele por socket: `:56` `http.get(\`http://localhost:${port}${path}\`)`, `:120` idem
  para POST. É o mesmo formato do nosso `tests/integration/studio-plugin.integration.test.ts`,
  que sobe um Vite dev server real em porta 0.
- **mastra** nunca abre socket: `references/mastra/packages/deployer/src/server/__tests__/on-error-hook.test.ts:42`
  — `app.request(new Request('http://localhost/test/error'))`. É o request **em memória** do Hono:
  o handler roda pelo caminho real de roteamento, mas sem rede.

Ambos asseveram status **e** corpo JSON (`on-error-hook.test.ts:44,53-57`).

**Leitura para o M6:** nossa suíte já está no lado mais forte dessa divergência (socket real).
O que falta não é o nível do teste — é o *caso* testado, que nos leva a Q5.

### Q5 — Existe teste de resposta já comprometida ou módulo de usuário que lança? **[done — negativo]**

**Não. Em nenhum dos dois peers.** `grep -rn "already sent\|ERR_HTTP\|headersSent"` sobre
`references/mastra/packages/deployer/src/` e `references/genkit/js/core/tests/` retorna **zero
linhas**.

Isto é um achado, não uma lacuna nossa: genkit **implementa** o branch de `headersSent`
(ver Q1) e **não o testa**. O caso que derruba o nosso dev server é um caso que a indústria
de referência também não exercita.

**Leitura para o M6:** o item 2 do DoD (criar `plugin/http.test.ts` cobrindo resposta já
comprometida) não é catch-up — coloca o Studio **à frente** dos dois peers nesse ponto
específico. Vale dizer isso no CHANGELOG sem exagero: é um teste que eles não têm, não uma
superioridade geral.

## Coverage Corner 2 — Dependencies

### Q6 — Que deps a camada HTTP carrega, e o padrão sobrevive sem framework? **[done]**

| Peer | Dep HTTP | Onde |
|---|---|---|
| genkit (`@genkit-ai/core`) | `express ^4.21.0` (+ `@types/express` em dev) | `references/genkit/js/core/package.json:43,52` |
| mastra (`@mastra/server`) | `hono ^4.12.8` | `references/mastra/packages/server/package.json:155` |

**Ambos carregam um framework. Nós não podemos** — o `theokitStudio()` é um middleware connect
registrado dentro do Vite do usuário; arrastar express ou Hono para dentro do dev server alheio
seria impor uma dependência ao host (e a rung 4 da parsimony ladder proíbe dep redundante).

Veredito de aplicabilidade, exigido pelo checkpoint EC-5:

- O padrão do **genkit sobrevive sem framework**. O branch de `headersSent` é lógica sobre o
  `ServerResponse` cru do Node; só a rama `else` (`next(...)`) depende do express, e ela tem
  substituto direto: escrever o envelope nós mesmos.
- O padrão do **mastra NÃO sobrevive**. `onError` é um hook do Hono; sem Hono não existe.

É por isso que o M6 importa a forma do genkit e não a do mastra — não por preferência estética,
mas porque uma das duas é implementável no nosso runtime.

## Coverage Corner 3 — Tools

### Q7 — Como rodam e validam o dev server localmente? **[done]**

- genkit: `references/genkit/js/core/package.json:18` — `node --import tsx --test tests/*_test.ts`
  (test runner nativo do Node).
- mastra: `references/mastra/packages/deployer/package.json:90` — `vitest run` (o mesmo que nós).

Nenhum dos dois expõe um harness de servidor reutilizável como pacote. A **ideia** aproveitável
é a do mastra: exercitar o handler pelo caminho real de roteamento sem abrir porta, o que dá
testes de fronteira rápidos o bastante para rodar em cada commit. Ideia, não código (ADR D4).

Nós já temos os dois níveis (`vitest` unitário + Vite real na integração), então **nada a
importar aqui** — registrado para que o M6 não invente ferramenta nova.

## Coverage Corner 4 — Techniques

### Q1 — Como evitam escrever cabeçalho duas vezes? **[done — divergência total]**

**genkit — guard explícito, e a lição está no que ele faz DEPOIS do guard.**
`references/genkit/js/core/src/reflection.ts:348-367`:

```
} catch (err) {
  ...monta um Status tipado (code + message + details)...
  if (response.headersSent) {
    // Headers already sent via onTraceStart, must send error in response body
    response.end(JSON.stringify({ error: errorResponse } as RunActionResponse));
  } else {
    next({ message, stack });
  }
}
```

O ponto que muda o desenho do M6: quando os cabeçalhos já foram enviados, genkit **não desiste
em silêncio** — ele encerra a resposta com o erro tipado **no corpo**. O cliente recebe uma
explicação; só o status já não pode mudar.

**mastra — zero ocorrências de `headersSent`** em `packages/server/src/` e `packages/deployer/src/`.
Delegação total ao hook `onError` do Hono (`on-error-hook.test.ts:15,66,138,192`), que devolve
`c.json(..., 500)`. Quem resolve "a resposta já começou?" é o framework.

A divergência tem causa estrutural, não cultural: genkit escreve no `res` cru (express +
streaming via `onTraceStart`), então precisa do guard; mastra nunca toca no `res`, então não
precisa. **Nós escrevemos no `res` cru — estamos do lado do genkit.**

### Q2 — Forma canônica do envelope de erro e consumo tipado no cliente **[done]**

**genkit — taxonomia gRPC-style, tipada nas duas pontas:**
- `references/genkit/js/core/src/statusTypes.ts:22` — `enum StatusCodes` (`OK=0`, `CANCELLED=1`,
  `INVALID_ARGUMENT=3`, `NOT_FOUND=5`, `UNIMPLEMENTED=12`, `INTERNAL=13`, … `DATA_LOSS=15`).
- `:178` — `StatusNameSchema` (zod enum) dá validação em runtime dos nomes.
- `references/genkit/js/core/src/error.ts:48-81` — `class GenkitError extends Error` com
  `status: StatusName` e `code = httpStatusCode(status)`: **um erro de domínio que sabe seu
  próprio código HTTP**. `:95` — `toJSON` serializa o status junto.
- Envelope na rede: `reflection.ts:31-40` — `RunActionResponseSchema = { result?, error?, telemetry? }`.

**mastra — `HTTPException` do Hono, declaradamente copiada** (`http-exception.ts:1`:
`// Copied from https://github.com/honojs/hono/...`). O default devolve `{ error: 'Internal
Server Error' }` (`on-error-hook.test.ts:129`); um `onError` custom pode devolver qualquer shape
(`:19-26`). Por EC-6, **este padrão é do Hono, não do mastra**.

**Leitura para o M6 (finding #48 da auditoria — cliente descarta o envelope):** genkit mostra o
alvo. Não basta o servidor mandar `{error:{code,message}}` — o **cliente** precisa reconstruir
um erro tipado a partir do `code`, como o `GenkitError` faz. Hoje o nosso
`reflection-datasource.ts:39` monta um `Error` genérico a partir do status HTTP e joga o
envelope fora.

### Q3 — Namespace de API reservado que não casa com rota nenhuma **[done]**

**Modelo de roteamento primeiro (exigência do EC-2):** mastra roda sobre **Hono**, com router
próprio; o catch-all da SPA é `app.get('*', ...)` e `next()` devolve o controle ao router, que
produz o 404 dele. Nós rodamos um middleware **connect** que reivindica `/_studio` inteiro e
nunca chama `next()` — não há router a quem devolver.

Feita a ressalva, o precedente é direto — `references/mastra/packages/deployer/src/server/index.ts:424-445`:

1. `:428-435` — **primeiro** exclui o namespace de API: se o path é `apiPrefix` ou começa com
   `${apiPrefix}/` (ou `/swagger-ui`, `/openapi.json`), chama `next()`. A SPA **nunca** vê um
   path de API.
2. `:438-440` — depois exclui path com extensão que não seja `.html`, também via `next()`.
3. `:442-445` — só então, se `isStudioRoute`, serve o `index.html` com config injetado.

Ou seja: **o namespace da API é verificado ANTES do fallback da SPA**, e um path de API sem rota
recebe o 404 do router — nunca HTML.

Nosso bug (finding #49) é exatamente a ordem inversa: caímos no `serveStudio` e a decisão entre
404-JSON e SPA-HTML acaba dependendo da extensão. Mastra usa a extensão para **delegar**; nós a
usamos para **decidir o tipo de resposta**. A tradução para o nosso runtime, sem router: checar o
namespace reservado antes do fallback e **emitir o envelope 404 nós mesmos**, já que não há
`next()` para quem passar a bola.

## Cross-cutting Comparison

| Dimensão | genkit | mastra | O que o M6 leva |
|---|---|---|---|
| Escreve no `res` cru? | Sim (express + stream) | Não (Hono) | Nós: **sim** → lado do genkit |
| Guard de `headersSent` | Explícito (`reflection.ts:359`) | Ausente (delegado) | Adotar, **com o corpo de erro** |
| Envelope de erro | `Status` tipado gRPC-style | `HTTPException` (do Hono) | Tipar as duas pontas |
| Cliente reconstrói tipo? | Sim (`GenkitError`) | n/a | Corrigir `reflection-datasource.ts:39` |
| API antes do fallback SPA | n/a | Sim (`index.ts:428`) | Adotar a ordem, emitir 404 próprio |
| Testa resposta comprometida | **Não** | **Não** | Ficamos à frente |
| Framework HTTP | express | Hono | Nós: nenhum (não podemos) |

## ADRs

### D1 — Adotar a forma do genkit para o guard, incluindo o corpo de erro

**Decisão:** `sendErrorEnvelope`/`sendJson` passam a checar `res.headersSent`; quando os
cabeçalhos já foram enviados, encerrar a resposta escrevendo o envelope de erro **no corpo**,
em vez de retornar em silêncio.

**Alternativa rejeitada:** apenas adicionar `headersSent` ao guard e retornar (era o plano
original do M6). Rejeitada porque deixa o cliente com uma resposta 200 truncada e sem
explicação — troca um crash por um mistério.

**Fonte:** `references/genkit/js/core/src/reflection.ts:359-363`.
**Custo:** o corpo pode ficar com JSON concatenado a um payload parcial. Aceito: um corpo
malformado com erro descrito é diagnosticável; um socket que morre calado não é.

### D2 — Namespace de API verificado antes do fallback da SPA

**Decisão:** no dispatcher, decidir "isto é rota de API?" antes de qualquer fallback, e emitir
o envelope 404 tipado quando for API sem rota — independentemente da extensão da URL.

**Alternativa rejeitada:** manter a decisão por extensão. Rejeitada porque produz duas respostas
diferentes para o mesmo namespace documentado (`.../query` → HTML, `.../index.json` → 404), que
é precisamente o finding #49.

**Fonte:** `references/mastra/packages/deployer/src/server/index.ts:428-435`.
**Divergência declarada:** mastra delega via `next()` a um router; nós não temos router, então
emitimos o 404 diretamente.

### D3 — Não importar framework HTTP

**Decisão:** manter middleware connect puro; nenhuma dep nova.

**Alternativa rejeitada:** adotar Hono para ganhar `onError` e router de graça. Rejeitada: o
plugin roda dentro do Vite do **usuário**; impor um framework ao host é custo dele, não nosso.

**Fonte:** `references/genkit/js/core/package.json:43` e `references/mastra/packages/server/package.json:155`
(ambos os peers carregam framework — nós somos o caso que eles não têm).

## Recommendations for the project

1. **DoD 1 do M6 ganha um requisito** que não estava lá: além do guard, escrever o erro no
   corpo quando a resposta já começou (D1).
2. **DoD 3 do M6 fica mais preciso**: a checagem de namespace vem antes do fallback, e a
   resposta não pode depender da extensão (D2).
3. **DoD 5 do M6 ganha alvo concreto**: o cliente reconstrói erro tipado a partir do `code`,
   no espírito do `GenkitError` — não apenas "propaga o envelope".
4. **Nada a importar** em ferramenta de teste; nossa pirâmide já cobre os dois níveis.

## Blocked questions (if any)

Nenhuma. As 7 questões estão `done`; Q5 tem resposta **negativa verificada** (nenhum peer
testa o caso), o que é resposta, não bloqueio.

## Live-repo citations

Todos os caminhos abaixo foram abertos durante esta execução:

- `references/genkit/js/core/src/reflection.ts:31-40,330-372`
- `references/genkit/js/core/src/statusTypes.ts:22-198`
- `references/genkit/js/core/src/error.ts:48-136`
- `references/genkit/js/core/tests/reflection_test.ts:37-120`
- `references/genkit/js/core/package.json:18,43,52`
- `references/mastra/packages/deployer/src/server/index.ts:424-453`
- `references/mastra/packages/deployer/src/server/__tests__/on-error-hook.test.ts:1-228`
- `references/mastra/packages/server/src/server/http-exception.ts:1-30`
- `references/mastra/packages/server/package.json:155`
- `references/mastra/packages/deployer/package.json:90`

Nenhuma linha de código foi copiada (`rules/reference-provenance.md` § 3). O
`http-exception.ts` do mastra é cópia declarada do Hono e está atribuído ao Hono (EC-6).

## Related

- Plano: `knowledge-base/discoveries/plans/plugin-hardening-plan.md`
- Edge cases: `knowledge-base/reviews/plugin-hardening-discover-edge-cases-2026-08-04.md`
- Auditoria que originou o M6: `knowledge-base/audits/studio-code-review-2026-08-04/final_report.md`
- Blueprint anterior (arquitetura do plugin): `knowledge-base/discoveries/blueprints/m1-studio-table-stakes-blueprint.md`
