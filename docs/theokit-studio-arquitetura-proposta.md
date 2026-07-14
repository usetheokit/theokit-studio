# TheoKit Studio — Proposta de arquitetura (data-services-backed)

> 2026-07-14. Sequência do deep research (`studio-deep-research-2026-07-14.md`).
> Decisão do Paulo: experiência estilo Mastra Studio / Genkit Dev UI, MAS com diferencial —
> backing pelos serviços reais `theo-memory`, `theo-lens`, `theo-rag` (theo-data/), um único
> Postgres, API gateway, tudo via docker compose para facilitar o desenvolvimento.

## 1. A tese do diferencial (validada)

**Dev/prod parity + durabilidade.** Mastra Studio e Genkit Dev UI são estado efêmero de
dev (in-process/in-memory); LangGraph exige UI na nuvem e **perde threads/checkpoints no
hot-reload** (pain #1 documentado — issues #5790/#5859). O TheoKit Studio inverte isso:
traces, memórias e conhecimento vivem em Postgres, nos **mesmos serviços production-grade
que o usuário vai deployar**. O que você inspeciona no Studio é o produto, não um toy.
Nenhum concorrente tem isso. Bônus de narrativa: tudo Apache-2.0, coerente com a tese
"walk-away cost zero" do ecossistema.

## 2. O que os três serviços são hoje (mapeado 2026-07-14)

| | theo-memory | theo-lens | theo-rag |
|---|---|---|---|
| Propósito | Memória persistente p/ agentes (semantic+BM25+entity-boost, knowledge graph temporal) | Observabilidade OTel-nativa ("Jaeger para agentes"): OTLP ingest + trace explorer | Motor RAG self-hosted (ingest→retrieve→answer c/ citações) |
| Estado | v0.34.0 pre-release, feature-complete (gate: benchmark p/ v1.0) | v0.47.x, MVP operacional (pipeline completo + UI 12 telas) | v0.0.0-rc.78 pre-release |
| API | REST Hono **:8080** `/v1/{remember,recall,forget,reflect}` + scopes/entities/graph/skills; MCP :8765 | OTLP/HTTP JSON **:4318** `POST /v1/traces` + read API + UI same-origin | REST Hono **:8787** (39 endpoints) + worker pg-boss + MCP stdio (10 tools) |
| Banco | Postgres + **pgvector**, DB `themem`, Drizzle (23 migrations) | Postgres 16 **sem pgvector** (tsvector FTS), auto-migrate no boot | Postgres + **pgvector** HNSW, DB `therag`, Drizzle |
| Auth | Bearer SHA-256, workspaces+RBAC, modo ALPHA sem key | Bearer + scopes, fail-closed opcional (default off) | Bearer, dev-mode single workspace `default` sem auth |
| UI própria | Não (dashboard é M3/theo-cloud) | **Sim** — React/Vite, 12 telas, **já usa @theokit/ui** (0.18.1) | Não |

Padrão comum (deliberado): TS + Hono + Drizzle + Postgres + workspace-isolation (404
cross-tenant) + `/v1/openapi.json` + healthchecks + Apache-2.0. Os roadmaps edge de lens
(M37+) e rag (M10–M20) já preveem o gateway multi-tenant de produção (Traefik +
ForwardAuth + minting `*_live_*` por tenant, "Model B" do theo-cloud).

### Costuras que JÁ existem (verificadas no código)
- **`@usetheo/memory/theokit`** — binding que auto-escopa memória do session context do
  TheoKit (structural typing, ADR D1/D2, zero peer-dep). Seam Skills↔Memory iniciada.
- **`@theokit/sdk` telemetry** — `exporter: "console" | "otlp" | custom` + `serviceName` +
  `includeContent` (`packages/sdk/src/internal/{telemetry,observability}`, ADR D42
  auto-detect). Seam SDK↔Lens quase pronta. ⚠️ Confirmar: exporter emite **http/json**
  (lens M0 não aceita protobuf) e usa semconv `gen_ai` (lens mapeia model/provider/tokens
  para colunas tipadas).
- **theo-lens ← qualquer OTel SDK** — ingest agnóstico; Claude Code já instrumentado via
  helper.

## 3. Arquitetura proposta

```
┌──────────────────────────────────────────────────────────────┐
│  theokit dev  (Vite, porta única — a "experiência Mastra")   │
│  ├─ app do usuário (rotas, agents/*.ts)                      │
│  ├─ /_studio            → SPA estática (@theokit/ui)          │
│  ├─ /_studio/api/registry → reflection endpoint (agents/     │
│  │    tools/skills/workflows do @theokit/sdk — padrão Genkit) │
│  ├─ /_studio/api/runs   → Run.stream() tipado (SSE)           │
│  └─ proxy same-origin (gateway de dev):                       │
│       /_studio/svc/lens/*   → theo-lens   :4318               │
│       /_studio/svc/memory/* → theo-memory :8080               │
│       /_studio/svc/rag/*    → theo-rag    :8787               │
└──────────────────────────────────────────────────────────────┘
                    │ docker compose (theokit studio up)
┌──────────────────────────────────────────────────────────────┐
│ postgres  (pgvector/pgvector:pg16 — UMA instância)            │
│   ├─ database themem    (migrations do theo-memory)           │
│   ├─ database theolens  (migrations do theo-lens)             │
│   └─ database therag    (migrations do theo-rag)              │
│ themory-api :8080   lens-api(+web) :4318                      │
│ rag-api :8787       rag-worker (pg-boss, 1 réplica)           │
└──────────────────────────────────────────────────────────────┘
        ▲ OTLP http/json (spans do @theokit/sdk, exporter:"otlp")
```

### Decisões e racional

**D1 — Um Postgres = uma instância, TRÊS databases (não três schemas).**
Cada serviço mantém suas migrations/Drizzle intactos (auto-migrate no próprio boot);
zero mudança de código nos três repos. Três schemas num database exigiria mexer no
Drizzle dos três + arbitrar conflitos (pg-boss, tsvector, pgvector no mesmo namespace)
— custo alto, benefício zero em dev. Imagem única: `pgvector/pgvector:pg16` (lens não
usa a extensão, mas roda nela; memory/rag precisam; substituir `ankane/pgvector`
deprecada). Init script cria os 3 databases.

**D2 — Gateway em dois níveis; em dev, o `theokit dev` É o gateway.**
Proxy same-origin no dev server (zero CORS, uma porta, um comando) — exatamente a
experiência Mastra. O Traefik/ForwardAuth dos roadmaps edge é para produção/theo-cloud
(multi-tenant, minting de keys) — **não** duplicar no compose de dev (YAGNI). Em dev:
auth-off/single-workspace nos três serviços (`THEOLENS_REQUIRE_CREDENTIAL=0`, memory
modo ALPHA, rag dev-mode), fail-closed continua sendo o default de produção deles.

**D3 — Studio embutido no dev server (padrão Mastra/Genkit), não app separado (padrão ADK).**
Reflection endpoint expõe o registry vivo do `@theokit/sdk` — sem manifest estático
(lição LangGraph). SPA estática buildada com `@theokit/ui` (o Studio dogfooda o pilar UI;
o lens-web já provou que funciona). Config em runtime à la placeholders do Mastra.

**D4 — Degradação graciosa (protege o north-star TTFWA).**
O Studio abre e funciona SEM Docker: playground + event-stream inspector (Run.stream())
não dependem do compose. Tabs de Traces/Memory/Knowledge detectam serviço offline e
mostram "rode `theokit studio up`". O compose é amplificador, não pré-requisito.

**D5 — Não construir UI de traces do zero: theo-lens é o trace inspector.**
lens já tem trace tree (D3/Sankey), session replay, cost/tool analytics, evaluators,
labeling queue, full-text search — usando a MESMA design language. Studio embeda/linka
lens-web via proxy same-origin (v1), com opção futura de importar componentes.
Replay + evals — os dois "diferenciais" da pesquisa competitiva — o lens **já tem**.

### Mapeamento serviços → tabs do Studio

| Tab | Fonte | Equivalente concorrente | Nossa vantagem |
|---|---|---|---|
| Playground (chat/agents) | reflection + Run.stream() | Mastra/Genkit/ADK | eventos tipados |
| Runs / Events (ao vivo) | Run.stream() SSE | — (SSE genérico) | vantagem estrutural |
| Traces | theo-lens | LangSmith (pago/cloud) | local, durável, custo USD, replay |
| Memory | theo-memory REST (scopes/entities/graph) | Mastra memory view (básico) | knowledge graph temporal |
| Knowledge (RAG) | theo-rag REST (collections/chunks + retrieval playground) | — (ninguém tem) | inspector de retrieval real |
| MCP | MCP servers dos 3 serviços + inspector | Mastra | padrão Inspector oficial |

## 4. Gap analysis honesto

**Já existe:** os 3 serviços completos c/ compose individual; lens-web (12 telas);
`@usetheo/memory/theokit`; telemetria do SDK c/ opção otlp; MCP nos 3 (lens não tem, é
M47+); dev-modes sem auth; healthchecks/OpenAPI em tudo.

**Precisa ser construído:**
1. Reflection endpoint no `theokit dev` (registry de agents/tools/skills) — **não existe**.
2. Studio SPA — **não existe**.
3. Compose unificado (postgres único + 3 serviços + init de databases) — só existem os
   composes individuais.
4. Validação da costura SDK→lens (protocolo http/json + semconv gen_ai) — provavelmente
   pequena, mas não verificada ponta-a-ponta.
5. Adapter RAG no lado do agente (tool do SDK usando `@usetheo/rag-sdk` zero-deps, ou MCP).
6. Comando `theokit studio up` (wrapper do compose c/ `--wait`).

**Riscos / pontos de atenção:**
- **Peso do compose** (4–5 containers) vs "npm run dev" do Mastra → mitigado por D4.
- **Embedding-dim do theo-memory** fixa na 1ª migração (384 local vs 1536 OpenAI) —
  compose deve pinar `THEOMEM_EMBEDDER` e documentar. Meta: boot **sem** OPENAI_API_KEY
  (memory tem embedder local Xenova; confirmar se o rag-api expõe o stub embedder por env).
- **Drift de versões**: lens usa `@theokit/ui@0.18.1` (atual 1.0.3) e o cluster ainda está
  em `@theokit/sdk` 2.x enquanto o SDK já é 3.4.x (SE36 X.create()) — o Studio nasce na 3.x.
- **Fronteira Studio vs theo-cloud**: Studio = dev local, single-tenant, auth-off
  ("development and debugging purposes only", como ADK). Dashboard multi-tenant de
  produção = theo-cloud (o M3 do memory já aponta pra lá). Mesmo playbook do Mastra:
  studio local grátis → cloud para times. Não canibaliza o PaaS.
- Portas 8080/4318/8787/5432 não colidem entre si; 8080 é genérica — compose deve
  permitir override por env.

## 5. Fases propostas (cada uma vira um cycle discover→plan→implement→review)

- **F0 — Compose unificado** (valor imediato, zero código de produto): `docker-compose.studio.yaml`
  c/ pg16-pgvector único + 3 databases + 3 serviços; boot validado com `--wait`; docs.
- **F1 — Table-stakes do Studio**: reflection endpoint + SPA (playground + event inspector
  sobre Run.stream()). Funciona sem Docker (D4).
- **F2 — Traces**: SDK `exporter:"otlp"` → lens; tab Traces embedando lens-web via proxy.
- **F3 — Memory + Knowledge**: tabs sobre as REST APIs (graph viewer do memory; collections
  browser + retrieval playground do rag).
- **F4 — Diferenciais**: replay de runs (lens session replay), evals no dev UI (lens
  evaluators), MCP inspector embutido.

## 6. Questões em aberto (para o cycle de discover)

1. Onde mora o Studio: pacote novo no repo `theokit` (`packages/studio`) vs repo próprio
   `theokit-studio`? (Inclinação: dentro do `theokit`, porque é feature do `theokit dev`.)
2. Onde mora o compose unificado: repo `theokit` (junto do comando) vs `theo-data/`?
3. O exporter otlp do SDK emite http/json? Lens mapeia os spans do SDK (semconv gen_ai)
   sem ajuste? → spike de 1 dia antes do F2.
4. rag-api roda com stub embedder via env (boot sem OpenAI key)?
5. Nome público: "TheoKit Studio" (assumido).
