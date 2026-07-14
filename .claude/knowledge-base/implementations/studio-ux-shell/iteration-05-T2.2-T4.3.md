# Iterações 5-6 — T2.2 (ServiceGate) + T4.3 (Traces placeholder) — 2026-07-14

## Reorder declarado (ANTES dos commits — per SEPA)

T4.3 foi ADIANTADO (ordem do plano: ...T3.x antes) porque é o caller de produção do
ServiceGate — fecha o pillar (a) da Phase 2 sem no-op caller. Dependency-safe: T4.3 requer
apenas T1.1+T2.2 (dependency graph do plano permite Phase 4 ∥ Phase 3 após Phase 2).
O diff-cohesion da Phase 2 verá src/pages/traces/ no tree — pertence ao T4.3 (Phase 4),
commitado separadamente na sequência.

## T2.2

RED (4 testes service-state) → GREEN (ServiceOfflineState/useServiceHealth/ServiceGate) →
REFACTOR. Rejeição de health capturada NO hook (nunca unhandled) + health_errors_total;
flag ignore no cleanup (zero act warnings); pending via overrides seam (Promise never-resolve).

## T4.3

RED (traces.test) → GREEN (TracesPage com ServiceGate('lens'), copy honesto theo-lens/M2,
zero trace-tree) → rota /traces real.

## Correção SEPA aplicada

void refs removidas do integration test (wiring gaming) — substituídas por usos GENUÍNOS:
render direto de TracesPage e ServiceOfflineState com asserts comportamentais.

Suite 53/53; stderr limpo; wiring ServiceGate/ServiceOfflineState/useServiceHealth/TracesPage
a+b PASS; CHANGELOG entries T2.2 e T4.3.
