# Mastra Studio — Blueprint técnico para paridade no TheoKit Studio

> 2026-07-14. Produzido a partir de engenharia reversa **hands-on** (não só docs): projeto
> `mastra-test/mastra-agent` construído do zero com TODAS as capabilities ativas, cada aba
> exercitada via REST API + UI real (Chrome), bugs e limitações verificados empiricamente.
>
> Versões auditadas: `mastra` (CLI/dev server) **1.18.2**, `@mastra/core` **1.50.1**,
> Studio UI **v1.50.1**. Complementa `theokit-studio-arquitetura-proposta.md` (nossa
> arquitetura) e `studio-deep-research-2026-07-14.md` (pesquisa competitiva).
>
> **Como usar este doc:** cada seção 4.x descreve uma capability do Mastra Studio com
> (a) superfície de configuração em código, (b) superfície REST, (c) comportamento
> verificado, (d) o que o TheoKit Studio precisa para paridade. A seção 8 consolida o
> checklist priorizado.

---

## 1. Arquitetura de runtime (o que "mastra dev" realmente é)

```
mastra dev (CLI, watcher)
  ├─ bundler (esbuild) → .mastra/output/index.mjs   (rebundle a cada mudança em src/)
  ├─ child process: node .mastra/output/index.mjs
  │     ⚠️ cwd do child = src/mastra/public (paths relativos NÃO resolvem p/ raiz do projeto)
  ├─ porta única :4111
  │     ├─ /                  → SPA estática do Studio (React)
  │     ├─ /api/*             → REST API (Hono) — 388 operações (v1.50.1)
  │     ├─ /api/openapi.json  → spec OpenAPI completa (draft-07 nos bodies)
  │     └─ /swagger-ui        → explorador interativo
  └─ .env carregado só no boot do processo (mudar .env ⇒ restart manual)
```

Pontos estruturais que importam para o clone:

- **Uma porta, same-origin, um comando** — é a experiência que o D2 da nossa proposta já
  replica com o proxy do `theokit dev`.
- **Tudo é API-first**: a SPA consome exclusivamente `/api/*`. Foi possível popular 100%
  do Studio via `curl` sem tocar na UI. Implicação: a paridade se define pela API, a UI é
  consequência. O TheoKit Studio deve nascer igualmente API-first (reflection endpoint).
- **Hot-reload real**: editar agents/tools/workflows recompila e recarrega sem derrubar a
  porta. Estado de conversa sobrevive se houver storage persistente (ver 4.10).
- **Configuração da UI em runtime** (Settings): base URL do server, API prefix (`/api`),
  custom headers, tema. Permite apontar a mesma SPA para outro backend.

## 2. Superfície de configuração em código

Toda capability é ligada declarativamente no construtor `new Mastra({...})`. Este é o
"contrato" que o registry/reflection do TheoKit precisa cobrir:

```ts
export const mastra = new Mastra({
  agents:      { weatherAgent, chefAgent, mathAgent, supportAgent },
  workflows:   { tripPlannerWorkflow },
  mcpServers:  { demoMcpServer },                       // @mastra/mcp
  scorers:     { answerRelevancyScorer, completenessScorer },  // @mastra/evals
  storage:     new LibSQLStore({ id, url }),            // @mastra/libsql
  workspace:   new Workspace({ filesystem: new LocalFilesystem({ basePath }) }),
  observability: new Observability({ configs: { default: {
    serviceName, exporters: [new MastraStorageExporter()] } } }),  // @mastra/observability
  logger:      new PinoLogger({ transports: { file: new FileTransport({ path }) } }),
  editor:      new MastraEditor(),                      // @mastra/editor
})
```

E no nível do **agente** (unidade mais rica do sistema):

```ts
new Agent({
  id, name,
  description,            // ⚠️ obrigatória se o agente for exposto via MCPServer
  instructions,           // string OU função ({ requestContext }) => string  (dinâmica)
  requestContextSchema,   // Zod → JSON Schema → form guiado na UI
  model: 'openai/gpt-4o-mini',   // magic string "provider/model", trocável na UI por chat
  tools: { weatherTool },        // criadas com createTool() (objeto plano falha silencioso)
  memory: new Memory(),          // @mastra/memory — threads/resources
  scorers: { relevancy: { scorer, sampling: { type: 'ratio', rate: 1 } } },
  inputProcessors:  [new UnicodeNormalizer(), new ModerationProcessor({ model, strategy })],
  outputProcessors: [/* ver bug TokenLimiterProcessor na seção 7 */],
})
```

## 3. Mapa da REST API (v1.50.1 — 388 operações)

Agrupamento por recurso (nº de operações), medido no OpenAPI real:

| Grupo | Ops | Grupo | Ops | Grupo | Ops |
|---|---|---|---|---|---|
| `/stored` (entidades editáveis) | 67 | `/memory` | 25 | `/mcp` | 8 |
| `/agents` | 46 | `/datasets` | 23 | `/editor` | 8 |
| `/observability` | 37 | `/workspaces` | 21 | `/scores` | 6 |
| `/agent-controller` (sessões) | 34 | `/agent-builder` | 16 | `/tools`, `/processors`, `/logs` | 3 cada |
| `/workflows` | 26 | `/tool-providers` | 13 | `/vector`, `/schedules`, `/auth`… | resto |

Rotas essenciais verificadas em uso (as que a SPA de fato consome nos fluxos principais):

```
GET  /api/agents                          → registry { [agentId]: {tools, processors, requestContextSchema…} }
POST /api/agents/{id}/generate            → chat não-stream  { messages, requestContext?, memory?{thread,resource} }
POST /api/agents/{id}/stream              → chat streaming (a UI usa; suporta follow-up em stream ativo)
GET  /api/tools | POST /api/tools/{id}/execute        { data }         → execução isolada
GET  /api/workflows | POST /api/workflows/{id}/start-async  { inputData }
GET  /api/workflows/{id}/runs[/{runId}]
GET  /api/mcp/v0/servers | GET /api/mcp/{serverId}/tools | POST …/tools/{id}/execute
GET/POST /api/memory/threads?agentId=… | GET /api/memory/threads/{tid}/messages
GET/POST /api/datasets | POST /api/datasets/{id}/items/batch
POST /api/datasets/{id}/experiments       { targetType, targetId, scorerIds?, maxConcurrency? }
GET  /api/datasets/{id}/experiments/{eid}[/results]
GET  /api/scores/scorers | GET /api/scores/scorer/{scorerId}
GET  /api/observability/traces[/{traceId}]           (spans tipados — ver 4.9)
GET  /api/logs?transportId=… | GET /api/logs/transports
GET  /api/workspaces | GET /api/workspaces/{id}/fs/list?path=.
```

## 4. Inventário de capacidades (aba por aba)

### 4.1 Agents (playground de chat)

- **Config**: `agents: {}` no Mastra; cada Agent com a superfície da seção 2.
- **UI**: chat com threads persistentes (sidebar), troca de **modelo por chat** (dropdown
  provider + model — a UI sobrescreve o model do código por request), model settings
  (temperature/top-p), botão "Run options" (request context + tracing options), painel
  de memória, painel de capacidades (tools/processors/workspace), copy agent ID/URL.
- **Comportamento verificado**: follow-up durante stream ativo funciona; tool calls
  aparecem inline com input/output; cada interação gera trace completo.
- **TheoKit**: equivale ao Playground sobre reflection + `Run.stream()` (F1). Paridade
  exige: threads persistentes (theo-memory), troca de modelo por request, e o painel
  "Run options" (request context — ver 4.8).

### 4.2 Editor / Prompts (`@mastra/editor`)

- **Config**: `editor: new MastraEditor()` (default `source: 'database'` grava no storage;
  alternativa `source: 'code'` grava JSON em `./mastra/editor/agents/<agentId>.json` para
  versionar via git).
- **UI**: aba Editor por agente com sub-abas **Variables** (read-only, derivadas do
  `requestContextSchema`), **System Prompt** (edição rica), **Tools** (habilitar/
  desabilitar). Botões *Save New Version* / *Publish* + histórico de versões. Item
  "Prompts" no menu lateral lista prompts versionados globalmente.
- **Semântica**: override em camadas — o código define o baseline, o editor aplica
  overrides versionados por cima, publish ativa sem redeploy. Experiments podem pinar
  `agentVersion`.
- **TheoKit**: não temos equivalente. É o gap mais "produto" da lista — prompt-ops para
  não-devs. Decisão análoga a tomar: overrides no Postgres (nosso default natural) vs
  arquivos no repo.

### 4.3 Workflows

- **Config**: `createWorkflow({ id, inputSchema, outputSchema }).then(step)....commit()`;
  steps via `createStep({ id, inputSchema, outputSchema, execute: async ({ inputData }) })`.
  Zod vira JSON Schema na API (form de input na UI).
- **UI**: grafo do workflow, execução com input estruturado, atualização em tempo real do
  step ativo, lista de runs com trace por step (input/output/erro de cada um).
- **API**: `create-run`, `start`, `start-async`, `runs`, `cancel`, `restart`, eventos.
- **Verificado**: 4 runs com inputs distintos; status/result por run persistidos no storage.
- **TheoKit**: workflows não são primitive do `@theokit/sdk` hoje — paridade parcial via
  runs/events tipados; grafo de workflow ficaria para quando o SDK tiver a primitive.

### 4.4 Processors (guardrails/middleware de mensagens)

- **Config**: `inputProcessors` / `outputProcessors` no Agent. Built-ins em
  `@mastra/core/processors` (~20): `UnicodeNormalizer`, `ModerationProcessor` (juiz LLM,
  strategy block/warn/filter), `PIIDetector`, `PromptInjectionDetector`,
  `TokenLimiterProcessor` (⚠️ bug — seção 7), `ResponseCache`, `MessageHistory`,
  `SystemPromptScrubber`, `RegexFilterProcessor`…
- **UI**: página global "Processors" + painel por agente listando cada processor por nome
  e fase. **Cada execução de processor vira span no trace** (`processor_run`) — é assim
  que se depura guardrail.
- **TheoKit**: mapeia para middlewares/hooks do SDK; a paridade relevante é (a) listar no
  registry e (b) emitir spans por processor.

### 4.5 MCP Servers

- **Config**: `new MCPServer({ id, name, version, tools, agents, workflows, instructions })`
  registrado em `mcpServers: {}`. Conversões automáticas: agente → tool `ask_<agentKey>`
  (exige `description` não-vazia — erro fatal no boot sem ela), workflow → tool
  `run_<workflowKey>`.
- **UI**: lista servers, explora tools com schemas, executa tool MCP isoladamente, mostra
  instruções de conexão (endpoint HTTP/SSE por server).
- **TheoKit**: os 3 serviços já têm MCP; nossa tab MCP (F4) precisa também do caminho
  inverso — expor agents/tools do registry local como MCP server.

### 4.6 Tools

- **Config**: `createTool({ id, description, inputSchema, outputSchema, execute })`.
  ⚠️ objetos planos (sem `createTool`) registram mas **falham silenciosamente** na execução.
- **UI/API**: página Tools lista todas (das dos agentes ao workspace); execução isolada com
  form derivado do schema (`POST /api/tools/{id}/execute` com `{ data }`); erros do
  `execute` retornam como erro estruturado (`throw new Error` → 4xx com mensagem).
- **TheoKit**: reflection do registry + endpoint de execução direta. Simples e de alto
  valor para debug (F1).

### 4.7 Workspaces

- **Config**: `workspace: new Workspace({ id, name, filesystem: new LocalFilesystem({
  basePath }) })` (+ opcional `sandbox`, mounts múltiplos, skills).
- **Efeito colateral importante**: agentes ganham automaticamente as workspace tools
  (`mastra_workspace_read_file`, `write_file`, `edit_file`, `list_files`, `search`…) —
  aparecem em `availableTools` de cada inference no trace.
- **UI**: file browser com mounts, criação de diretórios, viewer com syntax highlight,
  badge read-only/writable, aba Skills (instala de skills.sh).
- **API**: `GET /api/workspaces`, `GET /api/workspaces/{id}/fs/list?path=.` (path
  relativo; `/` → "Permission denied" por contenção no basePath).
- **TheoKit**: sem equivalente direto hoje. Avaliar se entra como capability do SDK
  (workspace de arquivos por agente) — se entrar, o browser da UI é trivial em cima.

### 4.8 Request Context

- **Config**: `requestContextSchema` (Zod) no Agent + `instructions` como função
  `({ requestContext }) => string`. Valores chegam por request
  (`POST …/generate { requestContext: {...} }`) e fluem para instructions, tools e
  resolvers dinâmicos (filesystem/sandbox por request).
- **UI — dois lugares** (fonte de confusão real, documentar bem no nosso):
  1. **Por agente**: botão "Run options" ao lado do input do chat → seção Request Context
     com **form gerado do schema** (defaults, enums viram dropdown, boolean vira checkbox)
     + toggle Form/JSON. Valores persistem entre chats e experiments.
  2. **Global** (menu lateral): editor JSON livre, sem schema, para todos os agentes.
- **Verificado**: com `{user_name: "Diana", user_plan: "enterprise", priority_support:
  true}` a resposta muda de tom e oferece escalação — instructions dinâmicas de fato.
- **TheoKit**: equivale a session context do SDK. Paridade = expor o schema no reflection
  endpoint e gerar o form na UI.

### 4.9 Evaluation (Scorers, Datasets, Experiments)

**Scorers** (`@mastra/evals`):
- ~20 prebuilt em dois sabores: **código** (sem LLM: completeness, keyword-coverage,
  textual-difference, tone, tool-call-accuracy-code…) e **juiz LLM** (answer-relevancy,
  faithfulness, hallucination, toxicity, bias… — recebem `{ model }`).
- Anexáveis (a) ao agente com `sampling: { type: 'ratio', rate }` → rodam **async** sobre
  o tráfego real do chat; (b) globalmente no Mastra → selecionáveis em experiments.
- API: `GET /api/scores/scorers`, `GET /api/scores/scorer/{id}` (resultados com score +
  reason + traceId/spanId → link direto para o trace).

**Datasets**:
- CRUD + items (`input`, `groundTruth`, `expectedTrajectory`), import CSV/JSON,
  **versionamento** (cada mutação incrementa versão; experiments pinam versão), schemas
  opcionais de input/groundTruth.

**Experiments**:
- `POST /api/datasets/{id}/experiments { targetType: agent|workflow|scorer, targetId,
  scorerIds?, agentVersion?, maxConcurrency?, requestContext? }` → roda todos os itens,
  resultados por item (input/output/status/scores), comparação lado-a-lado de dois
  experiments.
- **Verificado**: 2 experiments (5/5 itens) contra o weather-agent, o segundo com 2
  scorers anexados gerando score breakdown por item.

**TheoKit**: theo-lens já tem evaluators/labeling — a paridade aqui é a **ponte**: datasets
e experiments como conceitos do Studio disparando runs no registry local e gravando
scores no lens. Diferencial possível: nossos scores viram spans/metadata OTel padrão.

### 4.10 Memory (threads/resources)

- **Config**: `memory: new Memory()` no agente (usa o storage do Mastra).
- **Modelo**: thread (id, title, metadata) pertence a um `resourceId` (o "usuário");
  mensagens por thread; working memory opcional.
- **API**: CRUD de threads + messages + clone + working-memory (25 ops).
- **UI**: painel Memory no chat (contagem, busca), threads na sidebar.
- **Verificado**: 3 threads multi-usuário; follow-up usa contexto salvo; ⚠️ quirk: com
  `memory` no payload o campo `text` da resposta HTTP volta vazio (geração e persistência
  OK — ler a resposta da thread, não do response body).
- **TheoKit**: theo-memory é estritamente superior (scopes, knowledge graph temporal).
  Paridade = binding do chat do playground com `@usetheo/memory/theokit` + browser de
  threads na UI.

### 4.11 Observability (Traces, Metrics, Logs)

**Traces**:
- `observability: new Observability({ configs: { default: { serviceName, exporters:
  [new MastraStorageExporter()] } } })` — spans no storage, UI mesma origem.
  `SensitiveDataFilter` aplicado por default (redação de secrets).
- **Taxonomia de spans verificada** (a parte mais valiosa para clonar): `agent_run` →
  `processor_run` (um por processor, por fase) → `model_generation` → `model_step` →
  `model_inference` (com `availableTools`, provider, streaming, parâmetros) +
  `tool_call` + `workflow_run`/`workflow_step`. Scores linkam por traceId/spanId.
- API: list/detail/light/trajectory/spans + score de trace + feedback.

**Metrics**: endpoints de aggregate/timeseries/percentiles/breakdown — **não funcionam
com LibSQL** ("not supported"); exigem storage mais rico. No nosso caso o lens cobre
(cost analytics já existe).

**Logs**: `PinoLogger` + transports **consultáveis** (`FileTransport` implementa
`listLogs`) → `GET /api/logs?transportId=file`. Sem transport queryable a aba fica vazia.

**TheoKit**: F2 (SDK otlp → lens). Nossa vantagem: OTel real vs formato proprietário.
Item de paridade: mapear a taxonomia de spans acima para semconv `gen_ai` para que o
lens renderize equivalente (processor spans inclusive).

### 4.12 Demais superfícies (inventário rápido)

- **`/stored/*` (67 ops)**: CRUD de entidades editáveis (agents/prompts/workspaces
  "stored") — backend do Editor e do agent-builder.
- **`/agent-builder` (16)**: criação de agentes pela UI (sem código).
- **`/agent-controller` (34)**: sessões multi-cliente, aprovação de tool calls
  (`requireToolApproval`), suspensão — human-in-the-loop.
- **`/tool-providers` (13)**: integrações OAuth de tools de terceiros (toolkits).
- **`/schedules` (9)**: agendamento de runs. **`/vector` (6)**: stores vetoriais.
  **`/auth` (10)**: auth do Studio deployado. **`/a2a`**: agent-to-agent protocol.
- **Swagger UI** e **`/.well-known`** (agent cards A2A).

## 5. Modelo de dados (o que o storage precisa suportar)

O `MastraStorage` é dividido em **domínios** — cada um implementável parcialmente (o
server responde "This storage provider does not support X" por método faltante, e a UI
degrada por aba). Domínios observados: `threads/messages`, `workflows` (runs/snapshots),
`traces/spans` (batch create/update, list, light), `scores`, `metrics`, `datasets/items/
experiments/results` (com versionamento), `editor` (versions/publish), `logs` (via
transport, não storage). Matriz LibSQL v1.15.1 (referência de "mínimo viável"):

| Domínio | LibSQL | Nota |
|---|---|---|
| threads/messages, workflows, datasets, editor | ✅ | completo |
| traces/spans | ✅ parcial | list/detail OK; `traces/light` (listagem) não |
| scores | ✅ parcial | escrita individual OK, batch não (warn), listagem via `/scores/*` legacy |
| metrics | ❌ | aggregate/timeseries/discovery indisponíveis |

Lição para o TheoKit: **degradação por aba com mensagem acionável** (o Mastra faz por
erro de API; nosso D4 já prevê "rode `theokit studio up`" — manter esse padrão).

## 6. Pacotes e responsabilidades (dependências do clone conceitual)

| Pacote | Papel | Equivalente TheoKit |
|---|---|---|
| `mastra` (CLI) | dev server + bundler + Studio SPA | `theokit dev` |
| `@mastra/core` | Agent/Tool/Workflow/Processor/Workspace/Mastra | `@theokit/sdk` |
| `@mastra/memory` | threads/working memory | theo-memory + binding |
| `@mastra/libsql` | storage default zero-config | Postgres (compose) |
| `@mastra/mcp` | MCPServer/MCPClient | MCP dos 3 serviços + registry→MCP |
| `@mastra/evals` | scorers prebuilt | theo-lens evaluators + ponte |
| `@mastra/observability` | tracing → storage/cloud | SDK otlp → theo-lens |
| `@mastra/loggers` | Pino + transports queryable | logs do dev server → lens |
| `@mastra/editor` | prompt versioning/publish | **gap — decidir se entra** |

## 7. Armadilhas verificadas empiricamente (economize dias de debug)

1. **cwd do dev server é `src/mastra/public`**, não a raiz do projeto. `process.cwd()`
   em config (basePath de filesystem, path de log, `file:` do LibSQL) resolve para o
   lugar errado. Use caminhos absolutos ou envs. (Foi por isso que o `mastra.db` foi
   parar em `src/mastra/`.)
2. **`TokenLimiterProcessor` como output processor zera a resposta** (v1.50.1): o trace
   mostra N chunks entrando no processor de stream e `{}` saindo da fase de resultado —
   `text` volta vazio. Não usar até corrigirem upstream.
3. **`generate` com `memory` no payload retorna `text: ""`** mesmo com sucesso — a
   resposta real está na thread. Clientes devem ler da thread (ou usar stream).
4. **Agente em MCPServer sem `description` = crash no boot** (`MCP_SERVER_AGENT_OR_
   WORKFLOW_TOOL_CONVERSION_FAILED`).
5. **Tools sem `createTool()` falham silenciosamente** — anti-pattern documentado pelo
   próprio Mastra.
6. **`.env` só é lido no boot** — trocar API key exige restart do `mastra dev`.
7. **Watchers órfãos**: um `mastra dev` antigo segurando a porta serve bundle velho
   enquanto o novo watcher recompila — sintomas esquizofrênicos (config nova na API,
   comportamento velho). Matar por PID, não por nome (o pattern "mastra dev" casa com o
   próprio shell do pkill).
8. **tsconfig**: imports `.ts` exigem `allowImportingTsExtensions` (a doc oficial de
   manual-install omite); `moduleResolution: bundler` é obrigatório.
9. **Erros 500 transitórios do provider LLM** aparecem como erro genérico no chat — o
   trace/log guarda o `requestBody`/`responseBody` completos (bom padrão a copiar).

## 8. Checklist de paridade para o TheoKit Studio (priorizado)

Alinhado às fases da proposta de arquitetura (F0–F4). ✅ = já coberto pelo ecossistema,
🔨 = construir, 🤔 = decisão de produto pendente.

**F1 — Table stakes (sem isso não é "um Studio")**
- 🔨 Reflection endpoint: agents/tools/skills com schemas (incl. `requestContextSchema`)
- 🔨 Chat playground com threads, troca de modelo por request, tool calls inline
- 🔨 Execução isolada de tools com form derivado de schema
- 🔨 Request Context: form guiado por schema + editor JSON global
- 🔨 Degradação por aba com mensagem acionável (padrão D4)
- 🔨 OpenAPI + swagger do dev server (é barato e o Mastra prova o valor)

**F2 — Observability**
- ✅ Trace explorer, cost, replay, evals (theo-lens)
- 🔨 Ponte SDK→lens com taxonomia rica (spans de processor/step/inference c/ semconv gen_ai)
- 🔨 Logs do dev server consultáveis na UI (transport → lens ou arquivo)
- ✅ Metrics (lens cost analytics — o Mastra nem entrega isso com storage default)

**F3 — Memory + Knowledge**
- ✅ Threads/scopes/graph (theo-memory, superior ao Mastra)
- 🔨 Binding do playground: chat grava/lê threads via `@usetheo/memory/theokit`
- ✅ Knowledge/RAG inspector (theo-rag — o Mastra não tem equivalente)

**F4 — Diferenciais e paridade avançada**
- 🔨 MCP: inspector + expor registry local como MCP server (`ask_<agent>`, `run_<workflow>`)
- 🔨 Datasets + Experiments (target no registry, scores no lens, comparação A/B)
- 🔨 Scorers anexáveis a agente com sampling sobre tráfego real
- 🤔 Editor de prompts com versão/publish (gap mais "produto"; overrides no Postgres)
- 🤔 Workspaces (filesystem por agente + browser) — depende de virar capability do SDK
- 🤔 Tool-call approval / human-in-the-loop (agent-controller)
- 🤔 Agent-builder pela UI, schedules, A2A — observar adoção antes de investir

**Fora de escopo consciente** (Mastra tem, nós deliberadamente não):
- Storage embutido zero-config (nossa tese é o compose com Postgres real — D1)
- Cloud deployment do Studio (fronteira theo-cloud)

## 9. Referências

- Docs: `mastra.ai/docs/getting-started/manual-install.md`, `…/docs/studio/*` (auth,
  deployment, observability), `…/docs/editor/overview.md`, `…/docs/agents/processors`,
  `…/docs/evals/datasets/overview`, `…/docs/workspace/overview`, `…/docs/server/request-context`
- Índice completo: `mastra.ai/llms.txt`
- Spec viva: `http://localhost:4111/api/openapi.json` no projeto de referência
- Projeto de referência hands-on: `~/Projetos/usetheo/mastra-test/mastra-agent`
  (4 agents, 3 tools, 1 workflow, MCP server, processors, scorers, datasets/experiments,
  workspace, observability, logs, editor — tudo funcional com dados reais)
