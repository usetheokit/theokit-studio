# Component inventory — packages/studio

24 components registered in `code-review.db`. LoC is per primary file/dir.

| Component | Kind | Path | LoC | Responsibility |
|---|---|---|---:|---|
| `spa-bootstrap-entrypoint` | entrypoint | `src/bootstrap.ts` | 54 | Entry point defensivo do browser: unico modulo com side-effect de boot, faz parse/validacao de window.__STUDIO_CONFIG__ na fronteira e cai em startup-error visivel em vez de tela branca. |
| `spa-composition-root` | entrypoint | `src/main.tsx` | 26 | Composition root (mount): unico lugar que conhece os adapters concretos e decide fixtures vs reflection a partir de config.mode; monta o router com o basename injetado pelo host. |
| `vite-plugin-entrypoint` | entrypoint | `plugin/index.ts` | 139 | Entry point publicado do pacote: theokitStudio() devolve um Plugin do Vite que registra os middlewares connect no hook configureServer. Unico export do package.json (./plugin). |
| `spa-data-contract` | layer | `src/data/datasource.ts` | 32 | Contrato DIP (StudioDataSource) + contexto React de injecao. O dominio da UI define a interface; os adapters implementam. |
| `spa-domain-types` | layer | `src/data/types.ts` | 68 | Entidades react-free da superficie e os erros tipados da fronteira de dados (BlankBuildPromptError, UnknownBuilderSessionError). |
| `agent-builder-details-panel` | module | `src/pages/builder/review.tsx` | 100 | Painel lateral de detalhes da sessao com a arvore de arquivos alterados. |
| `agent-builder-session-view` | module | `src/pages/builder/session-view.tsx` | 279 | Vista de uma sessao aberta: thread de mensagens, work log e painel de review redimensionavel com os arquivos editados. |
| `agent-builder-surface` | module | `src/pages/builder/index.tsx` | 510 | A unica superficie do Studio: sidebar de sessoes com busca e atalhos, composer com intents/modelo/aprovacao, e as vistas Skills/Scheduled/Templates. |
| `build-config` | module | `vite.config.ts` | 60 | Configuracao de build/test do pacote: vite (SPA), tsup (plugin node-side), vitest (jsdom + coverage) e tailwind. |
| `plugin-agent-scan` | module | `plugin/agent-scan.ts` | 67 | Varredura do filesystem que descobre os arquivos de agent sob agents/ respeitando as convencoes de skip (testes, tools/). |
| `plugin-http` | module | `plugin/http.ts` | 23 | Helpers de resposta HTTP compartilhados (sendJson, sendErrorEnvelope) que padronizam o envelope de erro dos endpoints. |
| `plugin-reflection-api` | module | `plugin/reflection-api.ts` | 216 | Reflection sobre o registry vivo: compila os modulos de agent via ssrLoadModule e projeta agents/tools/workflows/skills. Item degradado e exposto com error, nunca omitido. |
| `plugin-run-endpoint` | module | `plugin/run-endpoint.ts` | 250 | POST /_studio/api/agents/*/run: roteamento do path (matchRunPath), validacao de entrada e streaming NDJSON do run do agent. Fronteira de rede + I/O de stream. |
| `plugin-static-serve` | module | `plugin/static-serve.ts` | 156 | Serve a SPA buildada sob /_studio com injecao de window.__STUDIO_CONFIG__, resolucao do dist dir e defesa contra path traversal. |
| `spa-fixture-adapter` | module | `src/data/fixture-datasource.ts` | 76 | Adapter de fixtures: implementa o contrato com dados roteirizados, valida prompt em branco na fronteira e conta metricas por chamada. |
| `spa-fixtures-registry` | module | `src/data/fixtures/registry.ts` | 256 | Dados roteirizados do builder: agents, skills, sessoes de build com transcript, work log e diffs dos artefatos. |
| `spa-listing-hook` | module | `src/app/use-listing.ts` | 45 | Hook unico de carga de listagens (DRY): trata erro tipado como estado visivel e expoe reload explicito. |
| `spa-metrics` | module | `src/data/metrics.ts` | 34 | Contador de observabilidade dev (datasource_calls_total) exposto em window.__STUDIO_METRICS__ — o pilar (c) da triade de wiring. |
| `spa-reflection-adapter` | module | `src/data/reflection-datasource.ts` | 71 | Adapter live (decorator sobre o fixture): busca agents e skills em /_studio/api/* e delega o resto ao fallback. Fronteira de rede do browser. |
| `spa-route-error` | module | `src/app/route-error.tsx` | 35 | Error boundary de rota: renderiza valores lancados que nao sao Error sem quebrar a arvore. |
| `spa-routing` | module | `src/app/routes.tsx` | 33 | Tabela de rotas da superficie unica: / redireciona para /builder, /builder renderiza o Agent Builder e qualquer outro path cai em NotFound. |
| `spa-startup-error` | module | `src/startup-error.ts` | 32 | Renderizador de falha de boot em DOM puro (sem React) — fail-loud quando o proprio bundle nao carrega. |
| `test-suite-e2e` | module | `tests/e2e/studio-e2e.test.ts` | 114 | Oraculo contratual do Goal do M1: valida a cadeia health + reflection + SPA + run NDJSON ponta a ponta. |
| `test-suite-integration` | module | `tests/integration` | 296 | Testes de integracao de fronteira real: Vite dev server de verdade com o plugin montado (HTTP real, ssrLoadModule real) e a integracao da SPA reduzida. |
