# Deep Research — "Studio" / Dev UI local de agent frameworks (base para o TheoKit Studio)

> Gerado em 2026-07-14 por deep-research harness (5 ângulos de busca, 23 fontes, 113 claims
> extraídos, 25 verificados adversarialmente com 3 votos cada: 23 confirmados, 2 refutados).
> Motivação: Genkit Dev UI e Mastra Studio existem; precisamos das demais referências para
> desenhar o TheoKit Studio.

## 1. Taxonomia de mercado (2026)

O mercado separa três categorias distintas ([StackOne landscape 2026](https://www.stackone.com/blog/ai-agent-tools-landscape-2026/), 120+ ferramentas em 11 categorias):

1. **Frameworks code-first com dev UI** — Mastra, Genkit, LangGraph, Google ADK, Agno. **O TheoKit Studio compete aqui.**
2. **Builders visuais no-code/low-code** — Flowise, Langflow, Dify, Rivet, n8n. Outro produto, outro público — não é o nosso jogo.
3. **Observabilidade/evals standalone** — LangSmith, Langfuse, Arize Phoenix, AgentOps, Laminar. Camada adjacente que o studio local pode absorver parcialmente (traces) sem competir de frente.

## 2. As 4 arquiteturas de referência (verificadas contra código-fonte/docs primárias)

### 2.1 Genkit Dev UI — reflection API in-process
- Com `GENKIT_ENV=dev`, o próprio framework sobe um **Reflection API server no mesmo processo** do app (porta default 3100), expondo `GET /api/actions` que serve `registry.listActions()`.
- Viabilizado por um **Registry unificado no núcleo**: `defineFlow`/`defineTool`/plugins registram tudo como "actions".
- A Dev UI (via `genkit start -- <command>`) anexa ao processo vivo; um arquivo de discovery (`.genkit/runtimes`) aponta para o endpoint — é um pointer, **não** um manifest de actions.
- Reputação: avaliado como "the killer feature... no other framework comes close" em comparativo JS/TS 2026.
- Fontes: [genkit.dev/docs/js/devtools](https://genkit.dev/docs/js/devtools/), [firebase/genkit](https://github.com/firebase/genkit) (`go/genkit/genkit.go`, `js/core/src/reflection.ts`).

### 2.2 Mastra Studio — dev server + SPA estática (referência primária para nós)
- Ex-"Playground", renomeado em 2025-10. Roda **dentro do dev server do framework** (`mastra dev` → `http://localhost:4111`) — mesma porta/processo.
- UI = **SPA React estática pré-buildada** com ~18 placeholders `%%MASTRA_*%%` no `index.html` (ex: `window.MASTRA_SERVER_HOST`), substituídos no serve/deploy — UI desacoplada, configurada em runtime.
- Introspecção = **reflection em runtime**: endpoints REST do backend Hono (a MESMA API REST de produção, self-documented em `/openapi.json`) refletem a instância viva (`mastra.getAgentById()`/`listAgents()`), consumidos via `@mastra/client-js`. **Não existe manifest estático.**
- Diferencial anunciado: sharing colaborativo via Mastra Cloud (com opção self-host) — dev UI local grátis + camada de colaboração atrelada ao produto cloud.
- No Show HN do Mastra 1.0, o Playground/Studio foi citado como "o que mais impressionou".
- Fontes: [mastra.ai/blog/agent-studio](https://mastra.ai/blog/agent-studio), [mastra.ai/docs/studio/overview](https://mastra.ai/docs/studio/overview), [mastra-ai/mastra](https://github.com/mastra-ai/mastra) (`packages/playground/index.html`, `packages/deployer/src/build/utils.ts`, `packages/server/src/server/handlers/agents.ts`).
- ⚠️ Claim refutado (1-2): a decomposição em "@mastra/playground-ui design system + @mastra/playground shell" NÃO se confirmou como descrito — não citar.

### 2.3 LangGraph Studio (LangSmith) — manifest + servidor local + UI na nuvem
- Descoberta 100% declarativa: `langgraph.json` (campo `graphs` mapeia ID → `'./path/file.py:attribute'`; sem auto-discovery).
- `langgraph dev` sobe Agent Server in-memory em `http://127.0.0.1:2024`; a UI é **hospedada na nuvem** (`smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`).
- **Teto de features da categoria**: hot-reload default-on (`--no-reload` para desligar), **time-travel debugging** (re-executar thread de qualquer checkpoint, fork, breakpoints `interrupt_before/after`, edição de estado mid-trajectory), trace completo via LangSmith. Até a concorrente Laminar admite: "A real agent IDE... Nothing else in this list has a comparable purpose-built agent UI".
- Pain points reais (issues #5790/#5859, fórum): threads/checkpoints in-memory **perdidos no hot-reload**; replay re-executa nodes downstream (LLM calls disparam de novo, não-determinístico); trace completo exige LangSmith proprietário; UI cloud obrigatória.
- Fontes: [docs.langchain.com/oss/python/langgraph/studio](https://docs.langchain.com/oss/python/langgraph/studio), [use-time-travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel), [application-structure](https://docs.langchain.com/langgraph-platform/application-structure).

### 2.4 Google ADK web — UI standalone + API server separado
- App **Angular/TS separado** (`localhost:4200`) conectado via HTTP a um API server embutido no framework em outro processo (`adk api_server`, porta 8000, CORS via `--allow_origins`).
- Feature set no mesmo UI: chat playground + **Events + Tracing + Artifacts + State (session key-value) + Evaluations** (salva a sessão atual como eval case!) + "Agent builder & assistant".
- Escopo explícito: "development and debugging purposes only".
- Fontes: [google/adk-web](https://github.com/google/adk-web), [adk-docs/runtime/web-interface](https://google.github.io/adk-docs/runtime/web-interface/).

## 3. Referências adjacentes verificadas

### MCP Inspector — padrão arquitetural da categoria "MCP inspection"
- Ferramenta oficial da org `modelcontextprotocol`: **cliente web React + proxy Node.js local** que faz ponte browser ↔ servidores MCP via stdio/SSE/streamable-http. Portas 6274 (UI) / 6277 (proxy). Cobre tools (form-based input, resposta em tempo real), resources e prompts.
- MCP inspection virou categoria própria que studios incorporam: Mastra Studio lista/testa MCP servers; Copilot Studio auto-importa tools MCP.
- Fonte: [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector).

### Langfuse vs Phoenix — visualização multi-agent
- **Langfuse Agent Graph view** (beta 2025-02 p/ LangGraph, GA framework-agnostic 2025-11): grafo de agentes+tools inferido de timings/nesting das observations (exibe loops, não DAG estrito). MIT, paridade self-host/cloud.
- **Arize Phoenix OSS NÃO tem graph view** — só trace tree/timeline; o Agent Graph da Arize vive no produto comercial AX. ⚠️ Claim "Phoenix é 100% open-source sem feature gating" foi **refutado 0-3**.
- Fontes: [langfuse.com/docs/observability/features/agent-graphs](https://langfuse.com/docs/observability/features/agent-graphs), [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix).

## 4. Matriz comparativa (✓ = verificado)

| Feature | Mastra | Genkit | LangGraph | ADK web | Langfuse | MCP Inspector |
|---|---|---|---|---|---|---|
| Chat playground | ✓ | ✓ | ✓ | ✓ | — | — |
| Trace/event inspection | ✓ | ✓ | ✓ (via LangSmith) | ✓ | ✓ | — |
| Estado/sessão viewer | ✓ | parcial | ✓ (threads/checkpoints) | ✓ | ✓ | — |
| Hot-reload | ✓ (`mastra dev`) | ✓ (attach a proc. vivo) | ✓ (perde threads!) | — | n/a | n/a |
| Evals no dev UI | parcial | parcial | ✓ (LangSmith) | ✓ | ✓ | — |
| Time-travel / replay | — | — | ✓ (único) | — | — | — |
| Multi-agent graph viz | — | — | ✓ (grafos declarados) | — | ✓ (inferido) | — |
| MCP inspection | ✓ | — | — | — | — | ✓ (padrão) |
| Sharing colaborativo | ✓ (cloud) | — | ✓ (cloud obrigatória) | — | ✓ | — |
| UI 100% local/grátis | ✓ | ✓ | ✗ (UI na nuvem) | ✓ | ✓ (self-host) | ✓ |

**Table-stakes 2026** (mínimo, tudo local e grátis): playground de chat + trace/span inspection + state viewer + tool/MCP inspection + hot-reload.

**Diferenciais comprovados**: time-travel/replay de checkpoint (só LangGraph), evals integrados no dev UI (ADK/LangSmith), multi-agent graph viz (Langfuse), MCP inspector embutido, sharing colaborativo (Mastra).

## 5. Recomendação para o TheoKit Studio

**Padrão arquitetural: Genkit/Mastra** — dois frameworks TS dev-server-first convergiram independentemente no mesmo desenho, e é o fit natural com nossos assets:

1. **Reflection endpoint em runtime embutido no dev server existente** (`theokit dev` / plugin Vite ou rotas do dev server) expondo o registry de agents/tools/skills do `@theokit/sdk` — análogo ao `/api/actions` do Genkit e aos handlers Hono do Mastra. Sem manifest estático.
2. **SPA estática configurada em runtime** (à la placeholders `%%MASTRA_*%%`), **reutilizando `@theokit/ui`** — vantagem estrutural única: nosso pilar UI já É uma biblioteca de agent surfaces (`AgentStream`, `ToolCall`, `DiffViewer`, `TerminalPanel`, `AgentTimeline`…). O Studio dogfooda o próprio produto.
3. **`Run.stream()` tipado como transporte de eventos ao vivo** — o que ADK/LangGraph fazem via SSE genérico, nós já temos tipado no SDK.

**Evitar** (lições do LangGraph): manifest declarativo (fricção de DX, redundante com registry em runtime) e UI cloud obrigatória (dependência de serviço proprietário — contradiz a tese "walk-away cost zero" do TheoKit).

**Diferenciais viáveis, em ordem de ROI:**
1. **Event-stream inspector nativo sobre `Run.stream()`** — vantagem estrutural do TheoKit.
2. **Replay/time-travel de runs** — só o LangGraph tem hoje; altíssimo valor percebido ("a real agent IDE"). Corrigir o pain deles: persistir threads/checkpoints através de hot-reloads.
3. **MCP inspector embutido** — seguir o padrão do Inspector oficial (React UI + proxy).
4. **Evals integrados** — o combo do ADK (playground → salvar sessão como eval case no mesmo UI) provou o fluxo.

## 6. Caveats e questões em aberto

**Cobertura desigual:** só as 4 arquiteturas + MCP Inspector + Langfuse/Phoenix foram verificadas em profundidade. Flowise, Langflow, Dify, Rivet, Prompt Flow/AI Foundry, CrewAI, Vercel AI SDK devtools, OpenAI Agents SDK tracing, Copilot Studio, Botpress, n8n, VoltAgent, Agno agent-ui, Inngest, Trigger.dev, Laminar, AgentOps ficaram no nível de categorização (1 fonte). Feedback de usuários não foi sistematizado (só sinais incidentais).

**Questões em aberto (candidatas a follow-up):**
1. Vercel AI SDK devtools, OpenAI Agents SDK tracing UI, Agno agent-ui e VoltAgent Console — algum concorrente TS já embute o studio como **plugin Vite** (o cenário mais próximo do nosso)?
2. Contrato concreto dos reflection endpoints do Mastra/Genkit (schemas, streaming, versionamento UI↔server) — espelhar ou desenhar próprio sobre `Run.stream()`?
3. Levantamento sistemático de elogios/reclamações por studio (issues/HN/Reddit). Único sinal forte: **persistência de sessão através de hot-reloads é pain point diferenciável**.
4. Como studios tratam evals offline/open-source (formato de eval cases do ADK, datasets LangSmith) sem backend cloud?

**Time-sensitivity:** espaço em movimento rápido (rename Playground→Studio out/2025, GA do Langfuse Agent Graph nov/2025). Verificado atual em 2026-07-14; validade estimada em meses.
