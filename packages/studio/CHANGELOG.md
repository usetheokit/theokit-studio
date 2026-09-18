# @theokit/studio

## 0.5.0

### Minor Changes

- 47306bf: The `@theokit/agents` peer range admits `15.0.0`, published minutes before this change.

  `0.4.0` declared `>=13.0.0 <15`, which was correct against the `14.5.1` that existed when it was
  cut. `@theokit/agents@15.0.0` then published — a `CheckpointOptions` narrowing — and the range
  excluded it, so a consumer installing both got an `ERESOLVE`. This closes that window rather than
  leaving it as a followup.

  **Measured against the published artifact, not a local build:**

  |                                             |                                               |
  | ------------------------------------------- | --------------------------------------------- |
  | `@theokit/agents@15.0.0` tarball            | `HTTP/2 200`                                  |
  | resolved in the tree                        | `15.0.0`, asserted before anything was run    |
  | typecheck                                   | clean                                         |
  | suite                                       | 199 passed                                    |
  | floor, `agents@13.0.0`                      | typecheck clean, 199 passed                   |
  | clean consumer install with `agents@15.0.0` | no `ERESOLVE`, **one** copy of `@theokit/sdk` |

  The measurement was deliberately not taken earlier. Before publication the only evidence available
  was a build of a version that existed on no registry, and asserting support on that is the untested
  upper bound `6836ecd` was reverting when it narrowed this range in the first place. The
  public-surface diff supported the expectation — nothing removed from the `/bridge` entry, the only
  one this package imports — but an expectation is not what a peer range asserts.

## 0.4.0

### Minor Changes

- ea65979: The peer ranges admit the published `latest` of both frameworks, and the plugin calls the
  disk-boundary entry point that makes that possible.

  `>=11.0.0 <14` for `@theokit/agents` excluded `14.5.1`, and `^4.49.0` for `@theokit/sdk` excluded
  `5.9.0`, so `dep-check` failed on every pull request into `main` and neither `theokit-studio` nor
  `theokit-plugins` could be promoted (usetheokit/theokit-studio#45). Widening alone would have been a
  claim rather than a fix: against agents 14 the package did not typecheck.

  `compileAgentModule`'s parameter tightened from `unknown` to `AgentModule` in agents 13
  (usetheokit/theokit#663), with the reasoning that `unknown` moved a bad shape's refusal to the first
  turn. This package loads agent modules off disk, where no typechecker can know the shape, and agents
  13 ships `compileLoadedAgentModule` for exactly that — same runtime behaviour, a separate name so a
  genuine disk boundary declares itself instead of casting. The two production call sites now use it.

  **Both ends of both ranges were measured, not assumed:**

  | combination                             | typecheck | suite      |
  | --------------------------------------- | --------- | ---------- |
  | agents 13.0.0 + sdk 4.49.0 (the floor)  | clean     | 199 passed |
  | agents 14.5.1 + sdk 5.9.0 (the ceiling) | clean     | 199 passed |

  **This reverses `6836ecd`, which narrowed to `>=11.0.0 <13` on purpose, and the reason it gave is
  the one thing that had to be answered first.** Two copies of `@theokit/sdk` were landing in a
  consumer's tree: agents 13 depends on `sdk ^4.52.1 || ^5.0.0` and resolves the newest, while this
  package's own peer was `^4.49.0`, which forbids 5 — nothing satisfied both, so npm installed both.
  Narrowing removed the second copy by removing agents 13.

  That is correct given a `^4.49.0` sdk peer, and it is what makes widening the agents range alone
  wrong. What changes here is the other half: the sdk peer moves to `>=4.49.0 <6`, so one copy can
  satisfy both sides. Measured on a clean consumer install of this package's tarball plus
  `@theokit/agents@14.5.1` and `vite@8`:

  ```
  npm install                    exit 0, no ERESOLVE
  node_modules/@theokit/sdk      5.9.0     <- one copy, no second
  ```

  agents 14.5.1 depends on `sdk ^5.3.0` — only 5 — so the combination has a single solution rather
  than a conflicting pair. The narrowing was the right call against an sdk peer that forbade 5; it is
  not the right call once that peer admits 5 and the call sites compile.

  **The previous widening admitted a version this package did not compile against.**
  `agents-13-is-a-peer-bump-not-a-break` moved the ceiling to `<14` on the strength of the runtime
  floor test, which passes because the symbol exists. Measured now, with that code and agents 13.0.0
  installed: `tsc` exits 2 with the same two `TS2345` errors — the tightening landed in 13, so the
  range admitted 13 while the package could not build on it. The floor test could not have caught it;
  it asks whether a symbol is there, not whether the call still typechecks.

  That is not a criticism of the widening — it is the same blind spot the floor test documents about
  itself one level up, and it is the reason this change installs the ends of the range and runs
  `tsc` against both rather than reasoning about the changelog.

  **Support for agents 11 and 12 is dropped**, and that is the cost: `compileLoadedAgentModule` does
  not exist before 13, and calling the typed entry point with a disk-loaded module would mean a cast
  asserting something this package cannot know.

  `tests/version-floor.test.ts` now asserts both symbols — the one this package calls and the one it
  deliberately does not — so a later edit cannot move back to the typed entry point behind a cast
  without failing.

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
