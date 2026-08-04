# Architecture map — `packages/studio`

Baseline of Phase 1. Target: `@theokit/studio` — a single npm package with **two
independent runtimes** that meet only over HTTP.

## Inventory summary

| | Files | LoC |
|---|---:|---:|
| TypeScript (all) | 51 | 4796 |
| of which tests | 25 | 2153 |
| Excluded (test fixture project) | 9 | 56 |
| Other (json/css/js/html/md) | 6 | 164 |
| **Total inventoried** | **57** | **4960** |

Excluded set is `tests/fixtures/demo-project/**` — it is *input data* for
`plugin-agent-scan` (its `skip.test.ts` is a deliberate contract case), not
reviewable source.

## The two runtimes

```
┌─────────────────────────── node (host dev server) ───────────────────────────┐
│                                                                              │
│  vite-plugin-entrypoint  (plugin/index.ts)                                   │
│    └── configureServer → connect middlewares                                 │
│          ├── plugin-reflection-api ──ssrLoadModule──▶ user's agents/*.ts      │
│          │     └── plugin-agent-scan (fs walk)                               │
│          ├── plugin-run-endpoint ──streamFactory──▶ @theokit/agents bridge    │
│          └── plugin-static-serve ──▶ dist/spa + window.__STUDIO_CONFIG__      │
│                └── plugin-http (shared JSON / error envelope)                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                    HTTP  /_studio/api/*   (the ONLY seam)
                                     │
┌─────────────────────────── browser (the SPA) ────────────────────────────────┐
│                                                                              │
│  spa-bootstrap-entrypoint  →  parses window.__STUDIO_CONFIG__ (validated)     │
│    └── spa-composition-root (mount)  ── picks the adapter, once ──┐          │
│          │                                                        │          │
│          ├── spa-routing:  /  →  /builder  |  *  →  NotFound       │          │
│          │      └── agent-builder-surface                          │          │
│          │            ├── agent-builder-session-view               │          │
│          │            │     └── agent-builder-details-panel        │          │
│          │            └── spa-listing-hook                         │          │
│          │                                                        │          │
│          └── spa-data-contract (StudioDataSource — DIP boundary) ◀─┘          │
│                ├── spa-fixture-adapter   (default)                            │
│                └── spa-reflection-adapter (mode:"live"; decorates the fixture)│
│                      └── fetch /_studio/api/{agents,skills}                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Entry points (4)

| Entry point | Runtime | Trigger |
|---|---|---|
| `theokitStudio()` — `plugin/index.ts` | node | Host app registers the plugin in its Vite config |
| `bootstrap()` — `src/bootstrap.ts` | browser | Module side-effect on bundle load (guarded off under test) |
| `mount()` — `src/main.tsx` | browser | Called by bootstrap after config parse |
| `vite` dev server — `vite.config.ts` | node | `pnpm dev` for standalone SPA work |

## Trust boundaries (where input becomes untrusted)

1. **`plugin-run-endpoint`** — HTTP request body + URL path from any local
   client. Highest-risk surface: parses a path segment into an agent name and
   streams a model response.
2. **`plugin-static-serve`** — URL path resolved against a filesystem dir.
   Classic path-traversal surface; a defense exists and is tested.
3. **`plugin-reflection-api`** — loads and executes *user project code* via
   `ssrLoadModule`. Failure of one module must not take down the endpoint.
4. **`spa-bootstrap-entrypoint`** — `window.__STUDIO_CONFIG__` injected by the
   host into the page. Validated at the boundary with fallback to fixtures.
5. **`spa-reflection-adapter`** — HTTP responses from the dev server, parsed
   as JSON and mapped into domain types.

## Notable structural facts for later phases

- **The DIP seam is real, not decorative.** `spa-data-contract` is implemented
  by two adapters, and the live one is a *decorator* over the fixture one
  (`...opts.fallback` spread) — that spread carries a documented invariant
  (only valid while the fallback is an object of stateless closures).
- **Asymmetry in size:** `agent-builder-surface` is 510 LoC in one file — the
  largest non-fixture module and the natural complexity hotspot.
- **The package's only public export is `./plugin`.** The SPA is shipped as
  built assets, not as an importable API — so "public contract" review should
  weight `plugin/*` far more than `src/*`.
- **Recent history matters:** commit `74a96c6` removed 20 SPA surfaces
  (−7224 LoC) one commit ago. Phase 2 should expect leftover references and
  orphaned exports as a live hypothesis, not a theoretical one.
