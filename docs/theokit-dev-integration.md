# Integrating `@theokit/studio` into `theokit dev` (M1 T4.1 — ready-to-apply)

> **Status: pending coordination.** This is the exact, reviewed change the `theokit`
> repo needs to mount the Studio in its dev server. It is **documentation**, not a caller —
> the real registration lives in the `theokit` repo and does not exist yet (M1 T4.1 is
> BLOCKED on coordination; see `knowledge-base/implementations/m1-studio-table-stakes-implementation.md`).

## Why this is not committed into `theokit` yet

1. **Coordination.** The `theokit` repo currently has an in-flight feature
   (`decorator-file-based-parity`) with uncommitted changes across
   `packages/theo/package.json`, `packages/agents/package.json`, `CHANGELOG.md`,
   `ROADMAP.md`, `http-transport.ts` and `pnpm-lock.yaml`. Committing the Studio
   registration alongside that WIP would entangle two feature contexts in one commit and
   corrupt both audit trails.
2. **Publish order.** `@theokit/studio` is `private: true` / `0.0.0` and is not in the
   `theokit` pnpm workspace (sibling links were deliberately removed there on 2026-06-10 in
   favor of the npm registry). `theokit` cannot resolve `@theokit/studio` until it is
   published — which happens on this repo's `/release`.

Both are release/coordination decisions owned by Paulo. The Studio-side deliverable is
complete and proven by the e2e `studio_e2e_reflection_and_run`.

## The change (apply in the `theokit` repo when coordination allows)

### 1. Dependency

`packages/theo/package.json` — add to `dependencies` (after `@theokit/studio` is published):

```json
"@theokit/studio": "^<published-version>"
```

Vite compatibility is already handled: `@theokit/studio`'s plugin declares
`"vite": ">=6 <9"` as a peer, so it resolves against theokit's current `vite ^6.4.3`. The
plugin only uses the connect-middleware surface (`configureServer` + `server.middlewares.use`
+ `server.config.root` + `server.ssrLoadModule`), which is byte-identical across Vite 5/6/7.

### 2. Registration

The Studio plugin is a standard Vite plugin (`theokitStudio(): Plugin` with a
`configureServer` hook). Mount it by adding it to the plugins array composed by
`theoPluginAsync` (the same place `@theokit/ui` and the other sub-plugins are chained), so
Vite invokes its `configureServer` automatically. Its middleware then handles `/_studio`
and `/_studio/api/*`.

Ordering note: the Studio middleware is self-guarded — it calls `next()` for every request
whose pathname is not under `/_studio`, so relative order among theokit's own middlewares
does not matter for correctness. `/_studio/api/*` never reaches theokit's generic
`api-middleware` because the Studio middleware terminates those requests.

```ts
// wherever theoPluginAsync assembles the plugin list (e.g. src/vite-plugin/index.ts)
import { theokitStudio } from '@theokit/studio/plugin'

// ...
plugins.push(theokitStudio())
```

### 3. Smoke test

`tests/unit/cli-dev-studio.test.ts` (mirrors the existing `cli-dev.test.ts` harness):

```ts
import { describe, expect, it } from 'vitest'
import { startDevServer } from '<the dev command module>'
import { safeClose } from './integration/helpers/safe-close.js'

describe('theokit dev serves the Studio (M1)', () => {
  it('theokit_dev_serves_studio_health', async () => {
    const server = await startDevServer(fixtureRoot('onda1-hello-theo'), { port: 0 })
    try {
      const addr = server.httpServer?.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      const res = await fetch(`http://localhost:${port}/_studio/api/health`)
      expect(res.status).toBe(200)
      expect(((await res.json()) as { ok: boolean }).ok).toBe(true)
    } finally {
      await safeClose(server)
    }
  })
})
```

This is expected to be a ≤ ~30-line diff (dependency + one `plugins.push` + the smoke test),
gated by theokit's own CHANGELOG/lint/typecheck rules.

## Verification already done on the Studio side

The plugin is proven end-to-end against a real Vite dev server by
`packages/studio/tests/e2e/studio-e2e.test.ts` (`studio_e2e_reflection_and_run`) and by
`packages/studio/tests/integration/studio-plugin.integration.test.ts` (health, reflection,
run NDJSON, SPA serving, and the `ReflectionDataSource` against the real server). The
theokit-side smoke test above only needs to confirm the plugin is *reached* inside
`theokit dev` — the behavior itself is already covered here.
