# @theokit/studio

## 0.3.1-next.0

### Patch Changes

- ca7231d: **Admit `@theokit/agents@13`**, which the peer range excluded at `>=11.0.0 <13`.

  13.0.0 is not a break in `@theokit/agents`. Its changelog carries **Minor and Patch sections only** —
  the major number comes from changesets promoting a peer-dependent when `@theokit/http`, which
  `agents` declares as a peer, took a minor bump. Nothing this package consumes changed.

  That was measured before widening the range: the production side imports exactly two symbols from
  `@theokit/agents/bridge`, and `tests/version-floor.test.ts` already records that those "survived the
  seven majors intact".

  Found by the dependency gate in `usetheokit/theokit`, which refused to publish
  `@theokit/agents@13.0.0-next.0` because it would strand this package — an install of the two
  together fails `ERESOLVE`. That is the second time this range went stale the same way; the note in
  `version-floor.test.ts` predicted it:

  > every assertion here is a FLOOR […] a floor cannot see a ceiling. The check that the declared
  > range still admits the published `latest` is a manifest question, not a runtime one — it lives in
  > the dependency gate, not here.

  The gate did its job both times. What is worth considering separately is whether a ceiling of the
  form `<N` should exist at all here, given the consumed surface is two symbols that have not moved in
  seven majors — but that is a design question, not this fix.

## 0.3.0

### Minor Changes

- f803a23: Realign the `@theokit/agents` peer with the published runtime, and widen it to the interval this
  package is actually tested against.

  **Install-contract break.** `@theokit/agents` moves from `^7.6.0` to `>=11.0.0 <13`. An app pinned
  below 11 stops satisfying the peer. Minor bump because the version is still 0.x, where minor is the
  breaking slot.

  The old range did not merely lag; it resolved wrongly and silently. `theokit` declares
  `@theokit/studio` as an optional peer and depends on `@theokit/agents`, so `npm i theokit
@theokit/studio` installed **two** copies of the runtime and hoisted the 7.6.0 one to the root of
  `node_modules`, where application code resolved it first. Studio compiled the project's agents on
  7.6.0 while the server ran them on the current major. Nothing failed; the versions just disagreed.
  (usetheokit/theokit-studio#21)

  Verified at both ends of the range rather than only at the top: the suite passes against 11.0.0 and
  against 12.0.0.

  Two things worth recording, because they are the argument for the gate that now guards this file:

  - This is the second hand-correction of this range. 0.2.0 moved it from `^0.39.0` to `^7.6.0` for
    exactly the same reason, and it went stale again in four majors.
  - `@theokit/agents@12.0.0` was published **while this fix was being written**. The first version of
    it declared `>=11.0.0 <12` — correct when typed, wrong within the hour, and a faithful reproduction
    of the defect it was fixing. That is not a case for being more careful; it is a case for something
    other than care doing the checking.

  `tests/version-floor.test.ts` caught none of it and now says why in its own comment: every assertion
  there is a floor, and a floor cannot see a ceiling.

## 0.2.0

### Minor Changes

- Alinha os peers ao piso real do framework e faz o tarball carregar a licença.

  **Quebra de contrato de instalação.** `@theokit/agents` passa de `^0.39.0` para `^7.6.0` e
  `@theokit/sdk` de `^3.8.0` para `^4.49.0` — sete majors e uma major de distância. Um app pinado
  abaixo desses pisos passa a falhar a resolução de peer. Bump de minor porque a versão ainda é 0.x,
  onde minor é o slot de breaking.

  Alinhar os ranges levou a suíte de 192 verdes para 177 verdes e 15 vermelhos. Todos os 15 descendem
  de **uma** renomeação de API, e ela estava nas fixtures de teste, não no produto: `agent()` deixou de
  ser exportado do bridge, e o sucessor é `AgentBuilder.create()`, com a mesma cadeia. A superfície que
  o plugin realmente consome — `compileAgentModule` e `streamAgentUIMessages` — atravessou as sete
  majors intacta.

  **O pacote passa a declarar e a carregar a licença.** O manifest não tinha campo `license` e
  `files: ["dist"]` não levava nenhum `LICENSE`. Um pacote npm sem esse campo é all rights reserved
  para quem instala: a concessão viaja no tarball, não no repositório. Agora declara `Apache-2.0` e
  embarca o texto (verificado no `npm pack`: `11.3kB LICENSE`).
