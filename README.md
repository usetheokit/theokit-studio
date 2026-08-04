# TheoKit Studio

**Describe an agent in plain language and get a working agent file back — inside the dev server you're already running.**

TheoKit Studio is the local development UI for the [TheoKit](https://github.com/usetheodev) open agent stack. It mounts into `theokit dev` at `/_studio`, same origin, and today ships **one surface**: the Agent Builder.

| Studio surface | What you get |
|---|---|
| Agent Builder | A guided session that turns a prompt into an agent definition, with the skills discovered from your live registry — no manifest files |

The agent list and the skill list come from the running `@theokit/sdk` registry through a reflection endpoint, so what you see is what your process actually has loaded — it survives hot-reload because it is re-read per request, never cached.

```bash
theokit dev         # your app + Studio, one port, same origin
```

Docker is not required for the Agent Builder.

## Scope — what was removed

Studio previously advertised a chat playground, a typed event-stream inspector, a trace explorer, a memory browser and a knowledge (RAG) inspector. **All five were removed in `74a96c6`**, along with 20 screens, when Studio was refocused on the Agent Builder as its single surface.

They are not deprecated-but-working: they do not exist in this package. If you were relying on them, pin `v0.3.0`. The data services those tabs read from are separate projects and are unaffected by this change — see the [TheoKit organisation](https://github.com/usetheodev).

Whether any of those surfaces returns to the roadmap is an open product decision — see [`ROADMAP.md`](./ROADMAP.md).

> **Status: pre-release.** Studio is for development and debugging. Multi-tenant, production dashboards are the domain of Theo Cloud (pre-release).

## Design

See [`docs/theokit-studio-arquitetura-proposta.md`](./docs/theokit-studio-arquitetura-proposta.md) (architecture), [`docs/studio-deep-research-2026-07-14.md`](./docs/studio-deep-research-2026-07-14.md) (competitive research) and [`docs/mastra-studio-blueprint-clonagem-2026-07-14.md`](./docs/mastra-studio-blueprint-clonagem-2026-07-14.md) (hands-on Mastra Studio capability blueprint), plus [`ROADMAP.md`](./ROADMAP.md).

## License

Apache-2.0
