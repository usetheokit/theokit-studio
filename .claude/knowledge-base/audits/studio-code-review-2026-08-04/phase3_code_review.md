# Phase 3 — Deep code review

**Target:** `packages/studio` · **Specialists:** 4 in parallel (code-reviewer,
complexity-scanner, maturity-detective, pattern-suggester) · **Findings:** 49
(5 high, 13 medium, 21 low, 10 info — after the gate's re-severities) ·
**Coverage at close:** 28/48 files (58%)

## The headline: a 23-line file can kill the dev server

`plugin/http.ts` has no logic, no branches, and is the riskiest file in the
package — because **every** handler funnels its failure path through it.

```ts
export function sendErrorEnvelope(res, status, code, message): void {
  if (res.writableEnded || res.destroyed) return;   // ← guard omits res.headersSent
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { code, message } }));
}
```

The guard checks whether the response is *finished*, not whether its head is
already *committed*. And `plugin/static-serve.ts:154-155` commits the head before
doing the read that can throw:

```ts
res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
res.end(readFileSync(safe.path));   // ← throws EACCES *deterministically* after the checks pass
```

Chain: `readFileSync` throws → the catch calls `sendErrorEnvelope` → its guard
passes (headers sent but response not ended) → `writeHead` throws
`ERR_HTTP_HEADERS_SENT` → the throw is inside `.catch()`, so it becomes an
unhandled rejection → **Node 22 exits the process**. The user's dev server dies
with no diagnostic.

The reviewer verified this empirically on Node v22.22.2 rather than reasoning
about it: after `writeHead`, `writableEnded=false, destroyed=false,
headersSent=true` — the guard is genuinely bypassed. The quality gate then
reproduced the whole chain against the real `serveStudio` (process exit code 1)
and corrected the reviewer on one point: **this is not a race**. `readFileSync`
throws `EACCES` deterministically after `existsSync` and `statSync` both pass, so
one unreadable asset kills the dev server on *every* request. The finding was
raised medium → high on that basis.

Worth noting: `serveIndexWithConfig` reads *before* committing its head
(line 85 → 98). The asset path is the lone outlier inside the same file.

*Fix is one word:* add `res.headersSent` to the guard, and swap the read/commit
order in `static-serve`.

## The complexity result inverts the folklore

The complexity scan used **ESLint's `complexity` rule with `variant: "classic"`**
(a real McCabe implementation over the TS/JSX AST), corroborated by **lizard
1.23.0**. 162 functions measured. Nothing estimated.

One honest caveat put ESLint in the authoritative seat: lizard mis-handles JSX
bodies, reporting `SessionView` as CC=1 when the true value is 16. *(The scanner
originally attributed this to lizard not registering the `.tsx` extension; the
phase-3 gate checked and found `TSXReader` does exist and does parse `.tsx` — the
symptom is real, the stated mechanism was wrong. Exactly the "conclusion true,
reason false" pattern this same phase flags in the decorator finding.)*

| CC | Function | Location | Density (branches/line) |
|---:|---|---|---:|
| 18 | `handleAgentRun` | `plugin/run-endpoint.ts:137` | 0.171 |
| 16 | `SessionView` | `src/pages/builder/session-view.tsx:66` | 0.079 |
| 15 | `AgentBuilderPage` | `src/pages/builder/index.tsx:147` | **0.043** |
| 14 | `serveStudio` | `plugin/static-serve.ts:107` | **0.280** |
| 13 | `parseStudioConfig` | `src/bootstrap.ts:32` | 0.265 |

95 of 162 functions are CC=1; only 5 exceed 10.

**The 510-line file everyone would point at is the least dense code in the
package.** `AgentBuilderPage`'s 15 branches are almost all JSX conditional
rendering spread over 351 lines at nesting depth 1 — 0.043 branch/line.
Meanwhile `serveStudio` (0.28) and `parseStudioConfig` (0.265) pack **six times**
the decision density into ~50 lines each. The LOC signal points at the wrong file.

That is worth stating because Phase 1 flagged `builder/index.tsx` as "the natural
complexity hotspot" on size alone. Measurement disagreed with the baseline's
hypothesis, and the measurement wins.

## Contract defects at the plugin boundary

**The locked `/_studio/svc/*` route answers 200 text/html** (`plugin/index.ts:98`).
This was carried over from Phase 2 as an open question and is now confirmed with
the exact path: `isStudioPath` → no api match → `matchRunPath` null → not under
`/_studio/api/` → `serveStudio` → no extension → deep-link fallback → SPA HTML.

It is worse than a wrong status code, in two ways. It is **extension-dependent**:
`/_studio/svc/rag/v1/index.json` *does* hit the known-extension branch and
correctly returns a 404 JSON envelope, so the same documented namespace answers
two different ways depending on the URL's suffix. And because the middleware
claims the whole `/_studio` prefix and never calls `next()`, a future svc proxy
registered after it would be **pre-empted, not merely missing**.

**The config wire contract is declared twice with different required fields**
(`plugin/static-serve.ts:80` vs `src/bootstrap.ts`). Producer and consumer of the
same injected object disagree about what is mandatory.

**The browser adapter discards the server's typed error envelope**
(`src/data/reflection-datasource.ts:39`): the plugin carefully sends
`{error:{code,message}}` and the client throws a bare `Error` built from the
status code, so every failure is misattributed and offline detection degrades to
string-matching. The error taxonomy is applied on one side of the wire and
dropped on the other.

## Patterns: right-sized, with one fragile mechanism

| Pattern | Verdict |
|---|---|
| Strategy/DIP (`StudioDataSource` + 2 adapters) | applied correctly |
| Composition root (single adapter-selection site) | applied correctly |
| DI seams for testing (6 of them, uniformly optional-with-default) | applied correctly |
| Typed error envelope (plugin side) | applied correctly |
| Decorator (`reflection` wraps `fixtures`) | correct **today**, fragile mechanism |
| Error taxonomy | half-applied (see above) |
| View registry / route table / ISP split | explicitly **not** warranted |

The decorator judgement is the interesting one. The code carries a comment
asserting the `{...opts.fallback}` spread is safe "because the fallback is an
object of stateless closures". **The conclusion is true; the stated reason is
false** — that object is demonstrably stateful (`draftSessionCounter`,
`fixture-datasource.ts:30`, mutated at `:55`). The real safety property is *own
enumerable properties + no `this` references*.

TypeScript provides **zero** protection here: the spread is typed from the
declared interface, so the result types as a complete `StudioDataSource` whether
or not the runtime object actually carries those methods. A class-based adapter
would break silently, surfacing only as `ds.getBuilderSession is not a function`
in the browser. A sixth interface method would be auto-delegated to fixtures with
no compile error. The remediation is *less* code: three explicit one-line
delegations make both hazards compile-time visible.

Three pattern opportunities were **explicitly rejected** as unwarranted — a
component registry for the view union, a route table for the dispatcher, and an
ISP split of `StudioDataSource`. For 2,700 LoC of dev-only tooling, over-
engineering is the worse failure.

## Maturity: senior code with the slips in one file

18 maturity findings, 4 medium — and **14 of the 18 land in
`src/pages/builder/index.tsx` or `session-view.tsx`**. The rest of the package
came back clean: zero `any`, zero non-null assertions, zero unchecked index
access (`strict` + `noUncheckedIndexedAccess` are on), and no WHAT-comments —
the comments carry rationale, ticket references and explicit invariants.

The one with teeth is a real bug, not a style note — and the gate raised it from
medium to **high**:

**`error_slot_collision`** (`src/pages/builder/index.tsx:257`) — the guard is
`loadError || openError` but the body renders `loadError ?? openError`. When the
session listing has already failed, a `startBuilderSession` rejection is
**never shown to the user**. Reachable in the offline scenario.

The gate then found the root cause the four specialists missed:
`src/app/use-listing.ts:30-38` calls `setLoadError` only inside `.catch()` and
**never resets it to `null`**. So `loadError` is sticky for the life of the
component, which turns the mask from transient into permanent — every subsequent
build-session error is swallowed for the rest of the session. Filed as its own
finding (medium), and the reason the collision above became high.

Also notable: `magic_index_in_render` (`session-view.tsx:181`) rests the work-log
placement on an undocumented, untyped, untested "messages[0] is the user turn"
invariant.

## What was verified as correct (recorded, not just implied)

The reviewer filed 10 `info` findings for defenses that hold, so the report can
show what was *checked* rather than only what failed:

- **Path traversal** (`static-serve.ts:64`): single decode → NUL check → normalize
  → prefix check. Tested.
- **Cross-origin check runs before any token-spending work** (`run-endpoint.ts:159`),
  with three hostile-input tests.
- **The URL agent name never reaches the filesystem** (`run-endpoint.ts:173`) — it
  is looked up in the already-scanned set.
- **No HTML injection** in startup/route error rendering — `textContent`/JSX, and
  the injected config escapes `<`.
- **`bootstrap().catch(() => {})` is a justified duplicate-report suppressor**, not
  a swallowed error.

One non-finding is worth recording as a negative result: **DNS rebinding was
investigated and deliberately not filed**. Vite 7.3.6 installs
`hostValidationMiddleware` before `configureServer` hooks run, and its default
`allowedHosts` admits only localhost/IP literals. The honest residue — filed as
low — is that the plugin's origin check is sound *because of* a second layer it
never documents, and Vite skips that layer under `server.allowedHosts: true`.

## Threat model applied

This package is dev-only tooling, single-tenant, auth-off **by documented design**.
"No authentication" was therefore not filed as a vulnerability. Security was
judged relative to what a malicious *page in the user's browser* or a malicious
*file in the scanned project* could do — which is why the cross-origin ordering,
the traversal guard and the agent-name lookup were the checks that mattered.

## Gate

Independent adversarial evaluation (`loop-code-review:quality-evaluator`):
**score 0.88, PASS** (threshold 0.70), **zero discards** — every traced claim
held. The evaluator did not read for plausibility: it stood up a live HTTP
server, reproduced the crash chain against the real `serveStudio` (process exit
code 1), re-ran the complexity measurements, and hit both `/_studio/svc/*` URL
shapes to confirm the extension-dependence.

Three corrections, all of which made the phase's conclusions **stronger**, not
weaker:

| What the gate found | Effect |
|---|---|
| The crash trigger was framed as a TOCTOU race; `EACCES` makes it deterministic | `static-serve.ts:154` medium → **high** |
| `loadError` is never cleared (`use-listing.ts:30-38`), so the error mask is permanent, not transient | `builder/index.tsx:257` medium → **high**, and a new finding filed for the root cause |
| The lizard caveat's stated mechanism was wrong (`TSXReader` does exist) | Write-up corrected; symptom stands |

The `use-listing.ts` gap is the one that matters methodologically: the file was
marked inspected and drew **zero findings from four specialists**, yet it holds
the root cause that amplifies a user-visible bug. The gate confirmed it with a
failing test (`items: 1 | loadError: "offline"`).

## Coverage honesty

28/48 (58%). The evaluator checked what the remaining 20 files are: **10 test
files, legitimately deferred to Phase 4**, and 10 config/manifest files. **No
production logic module was left unread.** One nit it raised: `tsconfig.json` is
still `pending` while this write-up asserts `strict`/`noUncheckedIndexedAccess`
from it — the assertion is true, but the file should be marked before Phase 5.
