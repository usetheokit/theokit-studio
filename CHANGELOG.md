# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Studio Playground agora é agents-first (paridade com Mastra Studio, dogfood): a entrada
  é a lista de agentes (tabela Name | Description | Model com filtro) e o chat abre ao
  clicar na linha, com header do agente e botão "All agents" para voltar (M5 dogfood)

### Added
- Studio design pass (dogfood): ícones lucide por superfície (dep já presente via
  @theokit/ui), logo mark violet, PageHeader com tile de ícone, topbar com breadcrumb +
  status pill, composer flutuante com seletor de agente e chip do modelo, Events com
  badges coloridos por categoria e rows numeradas, atmosfera radial Violet Forge
- Studio integration validation: jornada completa pelas 5 superfícies com prova de métricas
  dev não-zero; keys de renderização estáveis; lint preset recommended restaurado (M5 Final)
- Studio Knowledge tab: browser de collections/documents/chunks + retrieval playground com
  scores e validação de query na fronteira (M5 T4.2)
- Studio Memory tab: browser de memórias com escopo, busca e filtro sobre fixtures (M5 T4.1)
- Studio Event Inspector: timeline crua dos eventos tipados do último run com filtro por
  categoria e payload expandível (M5 T3.2)
- Studio Playground: chat com playback do stream de eventos tipados (`Run.stream()`),
  tool calls, notices de permission/rate-limit e cancelamento de runs (M5 T3.1)
- Studio Traces tab honesta: placeholder theo-lens com instrução `theokit studio up` —
  nenhuma trace UI reconstruída (invariante do produto) (M5 T4.3)
- Studio service states: ServiceGate com skeleton/offline/online por serviço e métrica de
  erro de health (graceful degradation) (M5 T2.2)
- Studio shell navegável: 5 superfícies com sidebar/breadcrumb/deep-linking, error
  boundary por rota, bootstrap defensivo com startup-error e config seam do host (M5 T2.1)
- Studio run-stream playback: roteiros tipados dos eventos reais do `@theokit/sdk` 3.4
  (`InteractionUpdate`/`RunEvent`, sem casts) + player com cancelamento (M5 T1.2)
- Studio data layer (DIP): interface `StudioDataSource` + `FixtureDataSource` com cenários
  default/empty/offline, erros tipados de fronteira e métricas dev in-memory (M5 T1.1)
- `@theokit/studio` package scaffold: Vite + React 19 + TS strict + Vitest + Tailwind v4 +
  `@theokit/ui`/`@usetheo/ui`, smoke test verde e dev server funcional (M5 T0.1)
- Roadmap amended: added M5 "Studio UX shell" — all Studio screens on fixtures, no
  integration, UX-first (`/roadmap-feature studio-ux-shell`)
- SOTA references cloned for study: `mastra-ai/mastra` (Apache-2.0, `ee/` carve-out noted)
  and `genkit-ai/genkit` (Apache-2.0) — catalog in ROADMAP § State-of-the-art references

### Changed
- Studio: todo o copy da UI e das fixtures padronizado em inglês (produto é English-first;
  strings PT destoavam) — testes atualizados junto
- Studio: selects nativos substituídos pelo `Select` (Radix) do design system no seletor
  de agente, filtro de categoria (Events) e filtro de escopo (Memory)
- `code-quality`: linguagem `typescript` habilitada (primeiro pacote TS do monorepo — M5)

### Deprecated

### Removed

### Fixed
- Studio: cursor pointer em componentes clicáveis (regressão da troca p/ pipeline Tailwind
  único — o preflight v4 não estiliza cursor de controles; not-allowed em desabilitados)
- Studio UI sem estilo (dogfood): root-cause era ordem de cascade layers — o
  `tokens-v4.css` do design system abre `@layer utilities` antes do statement canônico,
  fazendo o preflight (`* { padding: 0 }`) vencer todas as utilities; corrigido declarando
  `@layer properties, theme, base, components, utilities;` como primeira linha do
  entrypoint CSS + pipeline Tailwind único (sem styles.css pré-buildado) + preset e
  content scan por realpath (o scanner do Tailwind v4 não segue symlinks do pnpm)
- `review`: `consolidate_findings.py` só descobria findings `*.yml` e dropava
  silenciosamente os `*.yaml` dos agentes — o report consolidado saía READY_TO_MERGE com
  0 findings; agora descobre ambas as extensões (regression test adicionado; achado
  durante o review do M5)
- Review M5 (batch): ciclo de import routes↔shell quebrado via `nav-items.ts`; tipos de
  evento movidos para o domínio (`data/types.ts`); send durante run ativo habilitado
  (contrato do plano — novo send aborta o anterior); erro de stream vira notice visível e
  reabilita o send; erros de datasource tratados na fronteira das páginas; collection
  inexistente rejeita em todos os cenários; métrica de query conta chamadas rejeitadas;
  dead export `RUN_SCRIPTS` removido; `check_wiring.py` enxerga testes de integração
  escopados por pacote (monorepo)
- `plan-confidence` checker: `_scan_blueprint_refs` não resolvia blueprints no layout
  plugin-install (`.claude/knowledge-base/...`), marcando toda citação `Blueprint §"X"`
  como fabricada; regression test adicionado (achado durante o plan do M5)
- `discover-plan-confidence` scorer: `_parse_thresholds` ignorava o formato documentado
  `band.<name> = <valor>` de `rules/discover-plan-thresholds.txt` (só aceitava `NAME | valor`),
  produzindo verdict INVALID incondicional; regression test adicionado (achado durante o
  discover do M5)

### Security

## [0.1.0] - 2026-07-14

### Added
- Repository founded: README, CLAUDE.md contract, ROADMAP (M0–M4), architecture proposal and
  verified competitive deep-research under `docs/` (bootstrap, no issue ref yet)

