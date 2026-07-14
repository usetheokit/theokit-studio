# Iterações 7-8 — T3.1 (Playground) + T3.2 (Event Inspector) — 2026-07-14

## Wiring evidence (callers reais, per SEPA — a prova NÃO é o comentário do teste)

- pillar (a): `src/app/routes.tsx` → `<PlaygroundPage/>` (rota /playground) →
  `src/pages/playground/index.tsx:58` usa `useRunPlayback()` →
  `src/pages/playground/use-run-playback.ts:46` usa `applyEvent()`;
  `src/app/routes.tsx` → `<EventsPage/>` → `src/pages/events/index.tsx` usa `categorize()`;
  `src/app.tsx` monta `RunLogProvider` acima do RouterProvider.
- pillar (b): jornada comportamental `playground_run_then_events_inspector_shows_the_same_run`
  (send → stream → navegação → rows + metrics runAgent===1). LIMITAÇÃO DO CHECKER anotada:
  o grep de check_wiring encontra alguns símbolos via comentário de documentação no
  integration test; a prova real é a jornada + os callers file:line acima.

## Decisões

1. Q2 RESOLVIDA: composição controlada (ChatMessageRoot/Content flat exports + ToolCallCard)
   em vez de useAgentStream — fallback previsto no plano; anotado no index.tsx.
2. Exports do @theokit/ui chat-message são FLAT (ChatMessageRoot), não compound (.Root).
3. Switch exaustivo com never-guard + fallback runtime (drift alarm compile+runtime).
4. Grafias reais dos eventos (kebab/snake) — pseudo-code do plano corrigido em runtime
   (nota da iteração 3).
5. RunLogProvider acima das rotas; publish null-safe no hook; copy "last run" honesto.
6. Dívida p/ Fase Final: negative test do throw de useRunLog fora do provider.

Suite 72/72; stderr 0; coverage event-to-part 98.9%.
