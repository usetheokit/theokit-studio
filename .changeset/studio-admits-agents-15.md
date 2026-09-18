---
"@theokit/studio": minor
---

The `@theokit/agents` peer range admits `15.0.0`, published minutes before this change.

`0.4.0` declared `>=13.0.0 <15`, which was correct against the `14.5.1` that existed when it was
cut. `@theokit/agents@15.0.0` then published — a `CheckpointOptions` narrowing — and the range
excluded it, so a consumer installing both got an `ERESOLVE`. This closes that window rather than
leaving it as a followup.

**Measured against the published artifact, not a local build:**

| | |
| --- | --- |
| `@theokit/agents@15.0.0` tarball | `HTTP/2 200` |
| resolved in the tree | `15.0.0`, asserted before anything was run |
| typecheck | clean |
| suite | 199 passed |
| floor, `agents@13.0.0` | typecheck clean, 199 passed |
| clean consumer install with `agents@15.0.0` | no `ERESOLVE`, **one** copy of `@theokit/sdk` |

The measurement was deliberately not taken earlier. Before publication the only evidence available
was a build of a version that existed on no registry, and asserting support on that is the untested
upper bound `6836ecd` was reverting when it narrowed this range in the first place. The
public-surface diff supported the expectation — nothing removed from the `/bridge` entry, the only
one this package imports — but an expectation is not what a peer range asserts.
