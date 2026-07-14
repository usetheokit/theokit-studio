# TheoKit Studio

**The dev UI your agent stack already deserves — backed by the real services you'll ship with.**

TheoKit Studio is the local development UI for the [TheoKit](https://github.com/usetheodev) open agent stack: a chat playground, typed event-stream inspector, trace explorer, memory browser, and knowledge (RAG) inspector — embedded in the `theokit dev` server, the way Mastra Studio and Genkit Dev UI work.

The difference: Studio is not ephemeral dev-state. It runs on the same production-grade, Apache-2.0 data services you deploy with:

| Studio surface | Backed by | What you get |
|---|---|---|
| Traces | [theo-lens](https://github.com/usetheodev/theo-lens) (OTLP-native) | Durable traces, cost analytics, session replay, evals |
| Memory | [theo-memory](https://github.com/usetheodev/theo-memory) | Scoped memories, temporal knowledge graph |
| Knowledge | [theo-rag](https://github.com/usetheodev/theo-rag) | Collections browser, retrieval playground with real scores |
| Playground / Events | `@theokit/sdk` reflection + `Run.stream()` | Live typed agent events, no manifest files |

Everything survives hot-reloads and restarts, because it lives in Postgres — one instance, brought up with a single command:

```bash
theokit studio up   # docker compose: postgres (pgvector) + theo-memory + theo-lens + theo-rag
theokit dev         # your app + Studio, one port, same origin
```

Studio degrades gracefully: without Docker, the playground and event inspector still work; service-backed tabs simply point you at `theokit studio up`.

> **Status: pre-release.** Studio is for development and debugging. Multi-tenant, production dashboards are the domain of Theo Cloud (pre-release).

## Design

See [`docs/theokit-studio-arquitetura-proposta.md`](./docs/theokit-studio-arquitetura-proposta.md) (architecture) and [`docs/studio-deep-research-2026-07-14.md`](./docs/studio-deep-research-2026-07-14.md) (competitive research), plus [`ROADMAP.md`](./ROADMAP.md).

## License

Apache-2.0
