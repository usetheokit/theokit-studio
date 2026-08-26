---
"@theokit/studio": minor
---

Realign the `@theokit/agents` peer with the published runtime.

**Install-contract break.** `@theokit/agents` moves from `^7.6.0` to `>=11.0.0 <12` — four majors.
An app pinned below 11 stops satisfying the peer. Minor bump because the version is still 0.x, where
minor is the breaking slot.

The old range did not merely lag; it resolved wrongly and silently. `theokit` declares
`@theokit/studio` as an optional peer and depends on `@theokit/agents: ^11.1.0`, so
`npm i theokit @theokit/studio` installed **two** copies of the runtime and hoisted the 7.6.0 one to
the root of `node_modules`, where application code resolved it first. Studio compiled the project's
agents on 7.6.0 while the server ran them on 11.1.0. Nothing failed; the versions just disagreed.
(usetheokit/theokit-studio#21)

Verified at both ends of the new range: the suite passes against 11.0.0 and against 11.1.0.

This is the second time this range has been corrected by hand — 0.2.0 moved it from `^0.39.0` to
`^7.6.0` for the same reason. `tests/version-floor.test.ts` did not catch either drift, and now says
why in its own comment: every assertion there is a floor, and a floor cannot see a ceiling.
