# TheoKit Studio

**A guided agent-building surface for your local dev server, wired to the agents and skills your project actually has.**

TheoKit Studio is the local development UI for the [TheoKit](https://github.com/usetheodev) open agent stack. It ships **one surface**: the Agent Builder.

| Studio surface | What you get |
|---|---|
| Agent Builder | A build session UI — describe what you want, pick a target agent, and read the proposed plan, work log and files in a review pane |

Two halves, and it matters which is which:

- **Live, when a host mounts Studio in live mode** — the agent list and the skill list are discovered from your project's `agents/` directory and `.theokit/skills/`, compiled fresh on every request, so they follow hot-reload and never go stale.
- **Scripted, always** — the assistant's reply, the work log and the proposed files are fixtures. The Builder **does not write anything to disk** and does not call a model. The UI says so on screen, and this README says so here.

**`pnpm dev` runs both halves from fixtures.** The live agent/skill lists need a host that injects `mode: "live"`, and the only one that exists today is this package's own plugin serving `/_studio` after `pnpm build` — the sidebar badge tells you which mode you are in. Turning the scripted half into a real assistant is future scope, not a shipped capability.

## Running it

```bash
pnpm install
pnpm dev            # http://localhost:5173/builder — Studio standalone, fixtures mode
```

Docker is not required.

The intended integration is mounting Studio into `theokit dev` at `/_studio`, same origin, via the `@theokit/studio/plugin` export. **That registration does not exist yet** — it is pending coordination in the `theokit` CLI repo; the exact change is written up in [`docs/theokit-dev-integration.md`](./docs/theokit-dev-integration.md). Until it lands, `pnpm dev` above is the way to run Studio.

## Scope — what was removed

Studio previously advertised a chat playground, a typed event-stream inspector, a trace explorer, a memory browser and a knowledge (RAG) inspector. **All five were removed in `74a96c6`**, along with 20 screens, when Studio was refocused on the Agent Builder as its single surface.

They are not deprecated-but-working: they do not exist in this package. The data services those tabs read from are separate projects and are unaffected by this change — see the [TheoKit organisation](https://github.com/usetheodev).

Note that no version of this package has ever been published to npm (`private: true`, `0.0.0`); `v0.3.0` and friends are git tags on this repository, so "go back to the previous release" means checking out a tag, not pinning a dependency.

Whether any of those surfaces returns to the roadmap is an open product decision — see [`ROADMAP.md`](./ROADMAP.md).

> **Status: pre-release.** Studio is for development and debugging. Multi-tenant, production dashboards are the domain of Theo Cloud (pre-release).

## Host-facing API

The `@theokit/studio/plugin` export mounts HTTP resources for the **host** that embeds Studio. Three of them have no consumer in this repository and are kept deliberately, as the contract the pending `theokit dev` integration will use:

| Resource | Method | Response | Pinned by |
|---|---|---|---|
| `/_studio/api/tools` | `GET` | `200` `application/json`, `{ items: [...] }` — tools aggregated across the registered agents | integration test |
| `/_studio/api/workflows` | `GET` | `200` `application/json`, `{ items: [...] }` — **subagents** declared by the registered agents, surfaced under the workflow name. True workflow enumeration is blocked on an SDK gap (`theokit-sdk#123`); a project with real workflows and no subagents gets `{ items: [] }` | integration test |
| `/_studio/api/agents/{name}/run` | `POST` | `200` NDJSON stream of typed run events. Error envelope before the stream: `400` malformed agent name or invalid body, `403` origin refused, `404` unknown route or agent, `405` non-POST, `422` invalid agent, `424` provider key missing. Requires one of `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `OPENROUTER_API_KEY` | streaming happy path only — status/method contract lands in M8 |
| `/_studio/api/health` | `GET` | `200` `{ ok, studio }` | integration test |

The two aggregates are recomputed per request from the same compilation the reflection endpoint uses, so they follow hot-reload and are never cached.

`/_studio/api/agents` and `/_studio/api/skills` are the two the SPA itself consumes.

Studio **accepts** a `window.__STUDIO_CONFIG__` JSON object with `scenario` (`"default" | "empty"`), `mode` (`"fixtures" | "live"`) and `basePath`. The bundled plugin injects only `mode` and `basePath`; `scenario` is there for a hand-written host. Unknown or invalid values are reported on the console — naming both the offending value and the accepted set — and fall back to the defaults rather than being silently ignored.

## Design

The documents below are **pre-`74a96c6` design intent**, not a description of what ships today: [`docs/theokit-studio-arquitetura-proposta.md`](./docs/theokit-studio-arquitetura-proposta.md) (architecture), [`docs/studio-deep-research-2026-07-14.md`](./docs/studio-deep-research-2026-07-14.md) (competitive research), [`docs/mastra-studio-blueprint-clonagem-2026-07-14.md`](./docs/mastra-studio-blueprint-clonagem-2026-07-14.md) (Mastra Studio capability blueprint). For what exists now, read this file and [`ROADMAP.md`](./ROADMAP.md).

## License

Apache-2.0
