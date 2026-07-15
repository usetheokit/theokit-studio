# Edge Case Review — studio-ux-shell-plan

Date: 2026-07-14
Plan: .claude/knowledge-base/plans/studio-ux-shell-plan.md (v1.0)
Tasks analyzed: 10
Cases found: 10 (EDGE: 5, NEGATIVE: 5 | MUST FIX: 2, SHOULD TEST: 6, DOCUMENT: 2)

## MUST FIX

### EC-1: Envio com prompt em branco / sem agente selecionado
- **Affected task:** T3.1
- **Kind:** NEGATIVE
- **Family:** Input
- **Scenario:** usuário clica enviar com textarea vazia (ou sem agente selecionado) — o
  fluxo principal do playground não declara o comportamento.
- **Impact:** run fantasma no RunLog/metrics; UX confusa; teste de integração instável.
- **Suggested fix:** send é no-op com input em branco e botão desabilitado sem agente —
  adicionar RED test `blank_prompt_send_is_noop_and_no_run_starts()` ao TDD do T3.1.

### EC-2: AC do T2.1 exige teste de crash de rota, mas o TDD não o declara
- **Affected task:** T2.1
- **Kind:** NEGATIVE
- **Family:** State
- **Scenario:** AC diz "Crash simulado numa página não derruba o shell (errorElement
  testado)" porém a lista TDD não contém esse RED test — inconsistência plano-interno que
  o check_tdd_shape/implement vai herdar.
- **Impact:** gate de AC não-executável; errorElement pode nascer sem teste.
- **Suggested fix:** adicionar RED test
  `route_crash_renders_error_element_and_sidebar_survives()` ao TDD do T2.1.

## SHOULD TEST

### EC-3: Roteiro com `at` fora de ordem gera delay negativo
- **Affected task:** T1.2 — **Kind:** EDGE
- **Suggested test:** `out_of_order_timestamps_clamp_delay_to_zero()` — roteiro com `at`
  decrescente completa na ordem do array; fix: `Math.max(0, diff)` no player.

### EC-4: Signal já abortado antes do primeiro yield
- **Affected task:** T1.2 — **Kind:** NEGATIVE
- **Suggested test:** `pre_aborted_signal_yields_nothing()` — signal abortado antes do
  `play()` → zero eventos, resolve limpo.

### EC-5: Query para collection inexistente
- **Affected task:** T1.1 (fixture-datasource) — **Kind:** NEGATIVE
- **Suggested test:** `query_unknown_collection_throws_UnknownCollectionError()` — erro
  tipado com id no message (não `[]` silencioso).

### EC-6: Collection válida com zero documentos
- **Affected task:** T4.2 — **Kind:** EDGE
- **Suggested test:** `collection_without_documents_shows_local_empty_state()` — fixture já
  prevista nos Deep Dives; falta o teste declarado.

### EC-7: Filtro do inspector sem eventos correspondentes
- **Affected task:** T3.2 — **Kind:** EDGE
- **Suggested test:** `filter_with_zero_matches_shows_no_match_message()` — no-match ≠
  empty (mesma distinção do T4.1).

### EC-8: `window.__STUDIO_CONFIG__` malformado (seam do M1)
- **Affected task:** T2.1 (bootstrap) — **Kind:** NEGATIVE
- **Suggested test:** `malformed_studio_config_falls_back_to_fixtures_with_warning()` —
  objeto inválido é ignorado com warn; app sobe com fixtures (boundary de host validada).

## DOCUMENT

### EC-9: `health()` pendente indefinidamente → Skeleton eterno
- **Kind:** EDGE
- **Accepted risk:** no M5 health é fixture (resolve imediato); timeout de health é
  concern do adapter real (M1+). Anotar TODO(M1) no ServiceGate.

### EC-10: Registro de memória com conteúdo muito longo no painel de detalhe
- **Kind:** EDGE
- **Accepted risk:** overflow tratado por scroll padrão do painel; truncamento/virtualização
  é polish adiado (YAGNI) — revisitar com dados reais no M3.

## Summary

| Task | EDGE | NEGATIVE | MUST FIX | SHOULD TEST | DOCUMENT |
|------|------|----------|----------|-------------|----------|
| T0.1 | 0 | 0 | 0 | 0 | 0 |
| T1.1 | 0 | 1 | 0 | 1 (EC-5) | 0 |
| T1.2 | 1 | 1 | 0 | 2 (EC-3,4) | 0 |
| T2.1 | 0 | 2 | 1 (EC-2) | 1 (EC-8) | 0 |
| T2.2 | 1 | 0 | 0 | 0 | 1 (EC-9) |
| T3.1 | 0 | 1 | 1 (EC-1) | 0 | 0 |
| T3.2 | 1 | 0 | 0 | 1 (EC-7) | 0 |
| T4.1 | 1 | 0 | 0 | 0 | 1 (EC-10) |
| T4.2 | 1 | 1 | 0 | 1 (EC-6) | 0 |
| T4.3 | 0 | 0 | 0 | 0 | 0 |

**Coverage check:** toda task com fronteira de input tem ≥ 1 EDGE e ≥ 1 NEGATIVE
considerados (T0.1/T4.3 não têm fronteira de input; T2.2 NEGATIVE já coberto no plano
via health-rejection test).

**Verdict:** PLAN NEEDS ADJUSTMENT (2 MUST FIX + 6 SHOULD TEST a absorver → v1.1)
