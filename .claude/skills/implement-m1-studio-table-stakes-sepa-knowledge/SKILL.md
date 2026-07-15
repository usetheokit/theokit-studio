---
name: implement-m1-studio-table-stakes-sepa-knowledge
description: |
  Domain knowledge skill paired with the SEPA agent for plan m1-studio-table-stakes. Consult ALWAYS during /implement cycle when reasoning about TDD, SOLID, Clean Code, DRY, design patterns, OR wiring triad — this skill hydrates community best practices on top of plan-specific context (ADRs + edge-case findings + project rules). Triggering phrases: "review this against community standards", "what's the canonical pattern", "is this idiomatic", "best practice for vite plugin middleware ndjson streaming reflection dev-server".
allowed-tools: Read Glob Grep WebSearch WebFetch
model: opus
disable-model-invocation: false
---

# SEPA knowledge skill — m1-studio-table-stakes

You are the knowledge layer for the SEPA auditing `/implement` on plan `m1-studio-table-stakes`.

## Plan goal (verbatim)

Enable um projeto theokit (com `agents/*.ts`) a abrir `/_studio` no próprio dev server e conversar com um agent registrado vendo eventos tipados ao vivo, measured by o teste e2e `studio_e2e_reflection_and_run` (Vite server real + fixture de projeto com agent) passando.

## ADR summary

| ID | Decision (1 line) |
|---|---|
| D1 | Plugin Vite exportado por `@theokit/studio/plugin` (código vive no repo studio; theokit só registra) |
| D2 | Enumeração via `compileAgentModule` público de `@theokit/agents/bridge` (supera degradação total do blueprint D3) |
| D3 | Agent scan próprio espelhando a convenção LOCKED do theokit, coberto por teste de contrato |
| D4 | Run endpoint próprio NDJSON no plugin (same-origin guard antes de gastar tokens; abort propagado) |
| D5 | Composição híbrida honesta no composition root (reflection live + fixtures rotuladas) |

## Edge-case MUST FIX absorvidos

- EC-1: dispatch decide sobre `url.pathname`, nunca `req.url` cru (query strings)
- EC-2: rota do run por prefixo/sufixo — nomes de agent com `/` (aninhados) funcionam
- EC-3: `ServiceName` estendido com "studio"; theo-data honesto offline em live mode
- EC-4: `@theokit/agents` também em devDependencies (fixtures/testes resolvem no workspace)

## Domain knowledge (canonical patterns to cite)

- **Vite plugin `configureServer`**: middlewares connect; return a post hook to run after internal middlewares; here we use pre (API antes do html fallback do Vite). Docs: vitejs.dev/guide/api-plugin#configureserver.
- **Connect middleware**: assinatura `(req, res, next)`; sempre `next()` para requests fora do prefixo; nunca engolir erros — responder envelope tipado.
- **NDJSON streaming**: `Content-Type: application/x-ndjson`, `Transfer-Encoding: chunked`, um `JSON.stringify(obj) + "\n"` por evento; parser incremental com buffer de linha parcial + flush final.
- **Path traversal defense**: decode → normalize → prefix check contra root resolvido; testes com `../`, `%2e%2e`, absolutos; conteúdo sentinela nunca aparece no body.
- **AsyncGenerator cancellation**: `AbortSignal` + `req.on("close")`; guards `res.writableEnded` em toda escrita; generator `finally` deve executar (assert em teste).
- **DIP no adapter**: `ReflectionDataSource` implementa a MESMA interface `StudioDataSource`; páginas intocadas é o teste de arquitetura (git diff vazio em src/pages).
- **Vitest node vs jsdom**: pragma `// @vitest-environment node` por arquivo do plugin; suíte jsdom M5 intocada.

## Project rules relevant (cite by filename)

`architecture.md` (§1 composition root, §2 DIP), `testing.md` (§3 determinismo, §4.1 edge vs negative), `error-handling.md` (fail-fast tipado), `parsimony-ladder.md` (GREEN gate), `git-safety.md`.

## How SEPA consumes this skill

Cite the pattern + source when flagging; distinguish consensus (docs oficiais) from heuristic (convention). Never invent APIs — verify against `../theokit/packages/agents/src/bridge/agent-endpoint.ts` and `../theokit-sdk/packages/sdk/src/types/run-events.ts` (live worktrees, read-only).
