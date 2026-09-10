---
'@theokit/studio': patch
---

**Admit `@theokit/agents@13`**, which the peer range excluded at `>=11.0.0 <13`.

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
