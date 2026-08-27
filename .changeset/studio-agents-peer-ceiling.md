---
"@theokit/studio": minor
---

Realign the `@theokit/agents` peer with the published runtime, and widen it to the interval this
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
