---
"@theokit/studio": minor
---

The peer ranges admit the published `latest` of both frameworks, and the plugin calls the
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

| combination | typecheck | suite |
| --- | --- | --- |
| agents 13.0.0 + sdk 4.49.0 (the floor) | clean | 199 passed |
| agents 14.5.1 + sdk 5.9.0 (the ceiling) | clean | 199 passed |

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
