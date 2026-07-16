# Edge Case Review — m1-studio-table-stakes (implementation plan)

Date: 2026-07-15
Plan: `.claude/knowledge-base/plans/m1-studio-table-stakes-plan.md` (v1.0)
Tasks analyzed: 8 (T1.1–T1.4, T2.1–T2.2, T3.1–T3.2, T4.1)
Cases found: 13 (EDGE: 5, NEGATIVE: 8 | MUST FIX: 4, SHOULD TEST: 7, DOCUMENT: 2)

## MUST FIX

### EC-1: Dispatch e static-serve decidem sobre `req.url` cru (query string / hash quebram asset e fallback)
- **Affected task:** T1.1, T2.2
- **Kind:** NEGATIVE (input com query — comum: `/_studio/agents?tab=tools`)
- **Family:** Format / Boundary
- **Scenario:** `req.url` inclui query string; `/_studio/agents?x=1` tem "." em query ou falha o match de extensão; asset `/assets/app.js?v=123` não resolve no fs.
- **Impact:** deep links com query → 404/asset quebrado; SPA fallback errático.
- **Suggested fix:** o dispatcher parseia `new URL(req.url, "http://local")` e decide TUDO sobre `url.pathname` (1 frase no plano; testes com query nos dois handlers).

### EC-2: Nome de agent aninhado contém `/` — a rota do run `:name` não casa
- **Affected task:** T1.4
- **Kind:** EDGE (extremo válido da convenção: `nested/index.ts` → name `nested`; `team/support.ts` → `team/support`)
- **Family:** Input / Boundary
- **Scenario:** scan produz names com `/` (paridade com theokit `agent-scan.ts` — `agentPath: /api/agents/${rel}`); um matcher `:name` de segmento único não encontra o agent.
- **Impact:** agents aninhados invisíveis no playground (divergência silenciosa da convenção).
- **Suggested fix:** rota por prefixo: `name = decodeURIComponent(pathname.slice("/_studio/api/agents/".length, -"/run".length))`; teste com agent aninhado na fixture.

### EC-3: `health()` do adapter não tem slot para o Studio — `ServiceName = "memory"|"lens"|"rag"` (types.ts:216)
- **Affected task:** T3.1
- **Kind:** NEGATIVE (type error em implement OU mapeamento desonesto)
- **Family:** State / Format
- **Scenario:** o plano manda mapear health para "studio/dev-server", mas o union não tem a chave; forçar numa chave existente mentiria sobre serviços theo-data.
- **Impact:** typecheck falha OU UI mostra "memory online" quando só o dev server respondeu.
- **Suggested fix:** estender `ServiceName` com `"studio"` (aditivo; fixture datasource ganha a entrada) e em live mode os três theo-data ficam `offline` com hint `theokit studio up` até M2/M3.

### EC-4: Fixture `demo-project` importa `@theokit/agents` mas o pacote não está nas devDependencies
- **Affected task:** T1.2, T3.2
- **Kind:** NEGATIVE (resolução de módulo falha no teste)
- **Family:** Resource
- **Scenario:** `ssrLoadModule(agents/support.ts)` resolve `@theokit/agents` a partir do workspace do studio; só `peerDependencies` declarado → não instalado em dev → todo agent da fixture "quebra" e o e2e nunca exercita o caminho feliz.
- **Impact:** e2e e testes de reflection falham por infra, não por lógica.
- **Suggested fix:** adicionar `@theokit/agents` (e conferir `@theokit/sdk` já presente) a `devDependencies` na T1.1 (1 linha no package.json).

## SHOULD TEST

### EC-5: Percent-encoding malformado lança `URIError` no decode do path
- **Affected task:** T2.2 (e T1.4 no decode do name)
- **Kind:** NEGATIVE
- **Suggested test:** `malformed_percent_encoding_returns_400_not_500` — `GET /_studio/%` → 400 envelope tipado; `decodeURIComponent` embrulhado (URIError → 400), nunca exception não-tratada.

### EC-6: Agent com side-effect lento no import trava a reflection (sem timeout)
- **Affected task:** T1.2
- **Kind:** NEGATIVE (falha de I/O disfarçada)
- **Suggested test:** `agent_load_timeout_degrades_that_item` — load stub que nunca resolve + `Promise.race` (10s configurável; no teste, 50ms) → entrada `{name, error:"load timeout after Xms"}`, demais agents respondem.

### EC-7: `onRunEvent` dispara após o fim/abort do response (write-after-end)
- **Affected task:** T1.4
- **Kind:** NEGATIVE (timing)
- **Suggested test:** `run_event_after_end_is_dropped_by_guard` — callback invocado após `done` → nenhuma escrita (guard `res.writableEnded` em TODAS as escritas, não só no loop), sem throw.

### EC-8: `Origin: null` (opaque origin) deve ser rejeitado, não tratado como ausente
- **Affected task:** T1.4
- **Kind:** NEGATIVE (security)
- **Suggested test:** `opaque_origin_null_rejected_403` — header literal `"null"` → 403 `ORIGIN_FORBIDDEN` (só ausência de Origin OU host igual passam).

### EC-9: Agent quebrado (entrada com `error`) precisa aparecer honesto na UI, não como agent normal
- **Affected task:** T3.1
- **Kind:** EDGE (payload válido da reflection com item degradado)
- **Suggested test:** `broken_agent_maps_with_visible_error_marker` — `AgentSummary.description` prefixada com o erro (ou marcador "⚠ failed to load: …"), assert do texto no mapeador puro.

### EC-10: Resolução do spa dir difere entre fonte (`plugin/`) e build (`dist/plugin/`)
- **Affected task:** T2.2
- **Kind:** EDGE (layout válido pós-build)
- **Suggested test:** `resolve_spa_dir_works_from_built_layout` — resolução relativa testada contra layout `dist/plugin/index.js` + `dist/spa/` simulado em dir temporário (além do env override já testado).

### EC-11: Buffer residual do NDJSON sem `\n` final é descartado pelo parser
- **Affected task:** T3.1
- **Kind:** EDGE (stream válido que termina sem newline)
- **Suggested test:** `ndjson_parser_flushes_trailing_line_without_newline` — última linha sem `\n` → ainda parseada e yielded antes do fim.

## DOCUMENT

### EC-12: Abort do cliente ANTES do primeiro write (durante load/compile)
- **Kind:** NEGATIVE
- **Accepted risk:** janela de milissegundos; o guard `writableEnded` + check de `signal.aborted` antes do `writeHead` cobre o essencial; teste dedicado de corrida real seria flaky (testing.md § 6 — determinismo primeiro). O caminho pós-primeiro-chunk já tem teste de concorrência (T1.4).

### EC-13: `index.html` sem `</head>` (build custom) quebraria a injeção de config
- **Kind:** NEGATIVE
- **Accepted risk:** o index.html é NOSSO artefato de build (baseline row `index.html`) — sempre tem `</head>`. Fallback: se o marcador faltar, prepend do script no início do documento com warn (1 if, implementado junto, sem teste dedicado).

## Summary

| Task | EDGE | NEGATIVE | MUST FIX | SHOULD TEST | DOCUMENT |
|------|------|----------|----------|-------------|----------|
| T1.1 | 0 | 1 (EC-1) | 1 | 0 | 0 |
| T1.2 | 0 | 2 (EC-4, EC-6) | 1 | 1 | 0 |
| T1.3 | 0 | 0 | 0 | 0 | 0 |
| T1.4 | 1 (EC-2) | 3 (EC-7, EC-8, EC-12) | 1 | 2 | 1 |
| T2.1 | 0 | 0 | 0 | 0 | 0 |
| T2.2 | 1 (EC-10) | 2 (EC-5, EC-13) | 0 | 2 | 1 |
| T3.1 | 3 (EC-9, EC-11) + EC-3 | 1 (EC-3 tipo) | 1 | 2 | 0 |
| T3.2 | (coberto por EC-4) | — | — | 0 | 0 |
| T4.1 | 0 | 0 | 0 | 0 | 0 |

**Coverage check:** T1.3 (agregação pura sobre dados já validados — lentes não se aplicam na fronteira, coberta em T1.2); T2.1 (parse já tem EDGE+NEGATIVE no próprio plano); T4.1 (diff aditivo de 1 registro — fronteiras testadas pelo smoke).

**Verdict:** PLAN NEEDS ADJUSTMENT (4 MUST FIX; 7 SHOULD TEST a absorver nos TDDs)
