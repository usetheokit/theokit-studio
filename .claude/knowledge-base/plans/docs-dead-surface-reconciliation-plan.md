---
slug: docs-dead-surface-reconciliation
milestone_id: M7
owner: paulohenriquevn
created_at: 2026-08-04
version: 1.0
goal: Fazer documentação e superfície de configuração descreverem o produto que existe hoje, eliminando os 8 findings de completude da auditoria de 2026-08-04.
---

# Plano: Reconciliação de documentação e superfície morta (M7)

## Goal

Eliminar os 8 findings de completude da auditoria de 2026-08-04 fazendo a documentação e a
superfície de configuração descreverem a única tela entregue, medido por: suíte verde com os 5
testes de regressão novos passando e `check_completeness` sem finding aberto sem justificativa.

## Context

O commit `74a96c6` reduziu o Studio a uma superfície única — o Agent Builder — removendo 20 telas
e 7.224 linhas. O código encolheu; a documentação e a superfície de configuração não. A auditoria
`knowledge-base/audits/studio-code-review-2026-08-04/` registrou oito findings de completude que
são todos resíduo do mesmo corte:

| # | Finding | Evidência |
|---|---|---|
| 1 | README vende cinco telas inexistentes | `README.md:5,11-14,23` |
| 12 | DoD de M1/M2/M3 exige telas removidas e quebra em múltiplas linhas | `ROADMAP.md` §§ M1–M3 |
| 2 | `scenario:"offline"` aceito na fronteira e silenciosamente ignorado | `src/bootstrap.ts:6,13` |
| 3 | 4 dos 5 `CounterName` nunca são emitidos | `src/data/metrics.ts:4-9` |
| 4 | `reload()` retornado e nunca consumido | `src/app/use-listing.ts:11,39` |
| 5/7 | `biome-ignore` justificado por um `version` que só existe para o `reload()` morto | `src/app/use-listing.ts:20` |
| 8 | `/_studio/api/{tools,workflows}` e o run endpoint sem consumidor no repo | `plugin/index.ts:95,107` |

O finding #12 é o mais caro dos oito e não é cosmético: `cycle-acceptance` lê os bullets de
`**Definition of done:**` *verbatim* como critérios de aceitação. Enquanto os DoD de M1/M2/M3
exigirem telas que não existem, esses três milestones são **inaceitáveis por construção** — nenhum
`/acceptance` pode passar, e o `[x]` deles nunca pode ser flipado honestamente.

A investigação de prior art está em
`knowledge-base/discoveries/blueprints/docs-dead-surface-reconciliation-blueprint.md`
(`SHIPPABLE`, 99.5) e produziu cinco decisões (numeradas 1 a 5 no blueprint) que este plano consome.

## Baseline Context (deep review of current state)

### Files that will be touched

| Arquivo | LoC hoje | Último toque | Por que existe |
|---|---|---|---|
| `README.md` | 33 | `74a96c6` (não atualizado no corte) | Porta de entrada do pacote |
| `ROADMAP.md` | 300+ | `258c972` | Contrato de milestones lido por `cycle-acceptance` |
| `packages/studio/src/bootstrap.ts` | 102 | M1 | Parse + validação do `<script type="application/json">` de config |
| `packages/studio/src/data/fixture-datasource.ts` | 78 | M1 | DataSource de fixtures, consome `scenario` |
| `packages/studio/src/data/metrics.ts` | 36 | M1 | Contadores dev in-memory (ADR de métricas do plano M1) |
| `packages/studio/src/app/use-listing.ts` | 41 | M1 | Boilerplate único de carga de listagem |
| `packages/studio/plugin/index.ts` | ~140 | `619e371` (M6) | Dispatcher da reflection API |
| `packages/studio/src/bootstrap.test.ts` | — | M1 | Testes do parser de config |
| `packages/studio/src/data/metrics.test.ts` | — | M1 | Testes dos contadores |
| `packages/studio/src/app/use-listing.test.tsx` | — | M1 | Testes do hook |
| `packages/studio/tests/integration/studio-plugin.integration.test.ts` | — | M6 | Integração com Vite dev server real |
| `docs/README.contract.test.ts` (NEW) | 0 | — | Guarda de regressão da tabela de features |
| `CHANGELOG.md` | — | contínuo | Rule 6 |

### Current callers / dependents

- **`scenario`** — produzido em `bootstrap.ts:46-74`, consumido em `main.tsx:17`
  (`createFixtureDataSource({ scenario: config.scenario })`) e em
  `fixture-datasource.ts:26-27`, onde só `"empty"` tem efeito (`const isEmpty = scenario === "empty"`).
  **`"offline"` não é lido em lugar nenhum** — confirmado por grep em `src/` e `plugin/`.
- **`CounterName`** — `metrics.increment` é chamado em exatamente 4 lugares, todos com
  `"datasource_calls_total"`: `reflection-datasource.ts:80`, `fixture-datasource.ts:33,49,70`.
  Os outros quatro nomes (`stream_events_played_total`, `health_errors_total`,
  `unknown_events_total`, `reflection_chunks_dropped_total`) não têm nenhum emissor.
- **`useListing`** — importado apenas em `src/pages/builder/index.tsx:26`, chamado 3× (`:89`,
  `:149`, `:150`). **Nenhuma das três chamadas desestrutura `reload`** — só `items` e `loadError`.
- **`/_studio/api/tools` e `/_studio/api/workflows`** (`plugin/index.ts:95-100`) e o run endpoint
  (`plugin/index.ts:107`, via `matchRunPath`) — o `StudioDataSource`
  (`src/data/datasource.ts:12-18`) declara 5 métodos: `listAgents`, `listSkills`,
  `listBuilderSessions`, `getBuilderSession`, `startBuilderSession`. Nenhum consome esses três
  recursos. São superfície host-facing, não SPA-facing.

### Architecture boundaries affected

Nenhuma. Este milestone não cria nem move fronteira: remove símbolos mortos dentro dos módulos que
já os declaram e edita documentação. A regra que governa é `rules/parsimony-ladder.md` rung 1 (o
que não precisa existir não deve existir), com o guardrail explícito de que a escada nunca
justifica remover validação ou tratamento de erro.

### Domain glossary

- **Superfície host-facing** — endpoint HTTP servido pelo plugin cujo consumidor previsto é o host
  que monta o Studio (`theokit dev`), não a SPA embutida.
- **Warrant de lint** — o texto que justifica um `biome-ignore`. É falso quando a razão que ele
  alega não é a razão real (aqui: alega proteger o `reload()`, que ninguém chama).
- **Contador morto** — nome em `CounterName` sem nenhum `metrics.increment` correspondente; aparece
  zerado para sempre em `window.__STUDIO_METRICS__`.
- **Bullet truncado** — bullet de DoD quebrado em várias linhas físicas; o extrator de critérios
  lê só a primeira linha e perde o resto do critério.

## Prior Art & Related Work

- **Blueprint deste milestone** —
  `knowledge-base/discoveries/blueprints/docs-dead-surface-reconciliation-blueprint.md`, decisões
  decisões 1 a 5, com precedente citado em genkit e mastra.
- **Blueprint do M6** — `knowledge-base/discoveries/blueprints/plugin-hardening-blueprint.md`,
  consumido aqui só na parte de contrato de envelope HTTP (T4.1 assevera o contrato dos endpoints
  host-facing usando o mesmo formato de resposta que o M6 fixou).
- **Precedente externo de remoção comunicada** — o CHANGELOG do `@mastra/deployer` distingue alias
  mantido, rota removida e breaking declarado no mesmo release, decidindo **por superfície**
  (blueprint § Coverage Corner 4, Q2).
- **Precedente externo de doc derivada** — o `prepack` do mastra gera o mapa de exports em vez de
  testá-lo (blueprint § Coverage Corner 1). Não aplicável aqui e explicitamente rejeitado em A1.

## Objective

Seis entregas, uma por bullet de DoD do M7: README honesto, DoD de M1/M2/M3 exercitável,
`scenario:"offline"` fora da fronteira, `CounterName` só com o que é emitido, `reload()`/`version`/
warrant falso removidos, e decisão registrada + fixada por teste sobre a API host-facing.

## ADRs

### A1 — Regressão de documentação testada por conjunto fechado, não por oráculo aberto

O blueprint (decisão 5) rejeitou criar um teste de documentação. Este plano **refina** essa decisão em vez
de contradizê-la em silêncio: fica rejeitado o oráculo **aberto** (um grep que falhe se o README
citar qualquer caminho inexistente — frágil, dispara em prosa histórica legítima), e fica aceito um
oráculo **fechado**: um teste que parseia a tabela de features do README e assevera que o conjunto
de superfícies listadas é subconjunto de `{"Agent Builder"}`.

**Rationale.** `rules/testing.md` § 3 exige teste de regressão antes da correção de qualquer bug, e
os findings #1 e #12 são bugs — de documentação, mas bugs, com impacto real (o #12 torna três
milestones inaceitáveis). Um conjunto fechado tem oráculo exato: as superfícies que existem são
enumeráveis hoje e mudam por decisão explícita, não por acidente. A objeção do blueprint valia
contra o oráculo aberto e continua valendo.

**Alternativa rejeitada.** Gerar a tabela de features a partir das rotas registradas (padrão
`generate-package-docs.ts` do mastra): rejeitada por YAGNI — há **uma** superfície; um gerador para
uma linha custa mais que a linha, e o defeito real é prosa de marketing, que nenhum gerador deriva.

**Alternativa rejeitada.** Nenhum teste, só revisão humana: rejeitada porque foi exatamente o que
falhou — o corte de 20 telas passou por review e o README ficou.

### A2 — `scenario:"offline"` é removido, não marcado como deprecated

O valor sai de `FixtureScenario` e de `VALID_SCENARIOS`. Passa a ser rejeitado pela fronteira como
qualquer outro valor inválido: warning em `warnings[]` e fallback para `"default"` — o caminho que
`bootstrap.ts:51` já implementa.

**Rationale.** `rules/error-handling.md` § 2: entrada aceita e ignorada é falha silenciosa. Hoje
`"offline"` é a única entrada que passa pela validação e não faz nada, que é o pior dos dois
mundos — nem funciona, nem avisa.

**Alternativa rejeitada.** Manter com `/** @deprecated */` como o genkit faz em `plugin.ts:43-47`:
rejeitada porque o alias do genkit protege **consumidores publicados**. `@theokit/studio` é
`private: true`; não há consumidor externo desse valor a proteger, e o precedente do mastra é
decidir por superfície (blueprint Q2) — sem custo de quebra, remove-se.

**Alternativa rejeitada.** Dar efeito a `"offline"` (fazer o fixture datasource simular serviços
fora): rejeitada por YAGNI — nenhum requisito atual pede, e o modo `empty` já cobre o caso de
listagem vazia.

### A3 — `reload()`, `version` e o `biome-ignore` caem juntos, nessa ordem causal

`reload` existe para incrementar `version`; `version` existe para ser dependência do `useEffect`; o
`biome-ignore` existe para justificar `version` na lista de dependências. Removido o primeiro, os
outros dois perdem a razão de ser. O warrant não é "corrigido" — desaparece.

**Rationale.** `rules/parsimony-ladder.md` rung 1. Um `biome-ignore` cuja justificativa aponta para
código morto é pior que nenhum: ensina o próximo leitor que aquela supressão é legítima.

**Alternativa rejeitada.** Manter `reload()` porque "um botão de refresh pode vir": rejeitada por
YAGNI explícito — três call sites, nenhum usa; quando o botão existir, o hook volta em 4 linhas.

### A4 — A API host-facing é documentada e fixada por teste, não removida

`/_studio/api/tools`, `/_studio/api/workflows` e o run endpoint permanecem. Ganham (a) uma seção no
README declarando-os superfície host-facing e (b) um teste de contrato que assevera forma e status.

**Rationale.** O pacote foi publicado em `v0.3.0`. Ausência de consumidor *neste repo* não prova
ausência de consumidor — é exatamente o risco #2 declarado no M7 do ROADMAP. O critério do mastra
(blueprint Q2) é remover quando o custo de manter dois caminhos é alto **e** se conhece quem
quebra; aqui o custo de manter é ~0 (o handler já existe e deriva da mesma compilação) e não se
conhece quem quebra. Rung 1 da escada de parcimônia pergunta "isto precisa existir?" — a resposta
é sim: é a API que o host consome.

**Alternativa rejeitada.** Remover os três: rejeitada pelo risco de quebrar host externo sem
evidência de que não existe.

**Alternativa rejeitada.** Documentar sem teste: rejeitada porque documentar uma superfície sem
fixar seu contrato apenas move a mentira do README para o futuro — hoje nenhum teste assevera o
formato `{items: [...]}` desses dois endpoints.

## Dependencies

### Existing — use as-is

| Package | Version | Ecosystem | Why |
|---|---|---|---|
| `vitest` | `^3.2.4` | npm | Runner já em uso; os testes novos entram na mesma suíte |
| `@testing-library/react` | `^16.3.0` | npm | Já usado em `use-listing.test.tsx`; T3.2 estende |

### New — to be introduced

Nenhuma. Todo o trabalho usa stdlib (`node:fs` para ler o README no teste de contrato) e o que já
está instalado — rungs 2 e 4 da escada de parcimônia.

### Removed

| Package | Last version | Why removed |
|---|---|---|
| (none) | | |

## Dependency Graph

```
Phase 1 (documentação)      ──┐
Phase 2 (config)            ──┤
Phase 3 (superfície morta)  ──┼──> Phase 5 (Integration Validation)
Phase 4 (API host-facing)   ──┘
```

As fases 1–4 são **independentes entre si** — tocam arquivos disjuntos (`README.md`/`ROADMAP.md`,
`bootstrap.ts`, `metrics.ts`+`use-listing.ts`, `plugin/index.ts`+README). A ordem de execução é a
numérica por conveniência de commit, não por dependência técnica. A fase 5 depende de todas.

## Phase 1: Documentação honesta

### T1.1 — README descreve a superfície única

#### Why this step

**Ação.** Reescrever hero, tabela de features e a promessa de degradação graciosa do `README.md`
para descrever o Agent Builder como única superfície entregue, e adicionar uma nota datada
declarando que as telas de playground, traces, memory e knowledge foram removidas em `74a96c6`.

**Raciocínio.** Finding #1 é o de maior alcance: o README é a primeira coisa que um adotante lê, e
hoje ele promete cinco superfícies das quais uma existe. A decisão de **declarar a remoção** em vez
de só apagar as menções vem do ADR A1 e do precedente citado no blueprint (Q2): quem leu a versão
anterior fica sem resposta se a linha simplesmente sumir. `rules/public-copy.md` § 3 governa a
linguagem — nenhuma afirmação de entrega sem entrega.

#### Files to edit

- `README.md` — hero (`:5`), tabela (`:9-14`), degradação graciosa (`:23`); nova seção de remoção
- `docs/README.contract.test.ts` (NEW) — guarda de regressão da tabela

#### Deep file dependency analysis

`README.md` não é importado por código. O teste novo o lê por `readFileSync` a partir da raiz do
repo. Nenhum outro arquivo depende do texto. A tabela de features é o único bloco com estrutura
parseável (linhas `| … | … | … |` sob o cabeçalho `| Studio surface |`), o que a torna o alvo certo
do oráculo fechado do A1 — o resto do README é prosa e fica fora do teste, por decisão.

#### TDD

```ts
// docs/README.contract.test.ts — RED antes de tocar o README
it("a tabela de features do README lista apenas superfícies que existem", () => {
  const surfaces = parseFeatureTableSurfaces(readFileSync("README.md", "utf8"));
  expect(surfaces).toEqual(["Agent Builder"]);
});

it("o README declara explicitamente as superfícies removidas", () => {
  expect(readFileSync("README.md", "utf8")).toMatch(/removid[ao]s? em `74a96c6`/);
});

// EC-1 absorvido: o parser NUNCA devolve [] quando não acha o bloco — falha alto e nomeia o bloco.
it("parseFeatureTableSurfaces lança erro nomeando o bloco quando a tabela some", () => {
  expect(() => parseFeatureTableSurfaces("# Sem tabela\n\ntexto")).toThrowError(
    /tabela de features não encontrada/,
  );
});
```

RED esperado: a primeira asserção recebe `["Traces","Memory","Knowledge","Playground / Events"]`;
a segunda não encontra a nota; a terceira falha porque `parseFeatureTableSurfaces` não existe.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- `parseFeatureTableSurfaces` aplicado ao `README.md` final retorna exatamente `["Agent Builder"]`,
  verificado por `npx vitest run docs/README.contract.test.ts` exit 0.
- O `README.md` final contém a string literal `74a96c6` numa frase que declara remoção, verificado
  pela segunda asserção do mesmo arquivo.
- `parseFeatureTableSurfaces` aplicado a um texto sem tabela **lança** erro casando
  `/tabela de features não encontrada/`, verificado pela terceira asserção (EC-1).
- `grep -c -E 'theo-(lens|memory|rag)' README.md` retorna `0` — nenhuma menção a serviço como
  superfície entregue sobrevive; substitui o critério de leitura humana (EC-3).

#### DoD

- `npx vitest run docs/README.contract.test.ts` → exit 0, 3 testes passando.
- `CHANGELOG.md` `[Unreleased] § Changed` com uma linha voltada ao consumidor.

### T1.2 — DoD de M1/M2/M3 reconciliado e em bullets de uma linha

#### Why this step

**Ação.** Reescrever os bullets de `**Definition of done:**` de M1, M2 e M3 para (a) caberem cada
um em **uma única linha física** e (b) não exigirem tela removida — cada critério ou é reescrito
para o escopo entregue ou é cancelado com razão datada, no próprio bullet.

**Raciocínio.** Este é o bullet que desbloqueia três milestones. `cycle-acceptance` extrai os
critérios do ROADMAP verbatim; um bullet quebrado em três linhas físicas chega truncado ao
extrator, e um critério que exige a aba Traces não pode ser exercitado contra um produto que não a
tem. Enquanto isso não mudar, M1/M2/M3 são inaceitáveis por construção. A forma da correção
(cancelar com razão datada, não apagar) é o ADR A4 do blueprint.

#### Files to edit

- `ROADMAP.md` — blocos `### M1`, `### M2`, `### M3`

#### Deep file dependency analysis

`ROADMAP.md` é lido por `skills/acceptance/scripts/extract_acceptance_criteria.py` (extrator de
critérios) e por `skills/release/scripts/flip_milestone_checkbox.py` (que casa o header literal
`## M<N> — [ ] <nome>`). **A estrutura dos headers não pode mudar** — só o corpo dos bullets. Os
headers de M1–M3 usam `###`, iguais aos de M6–M8; nenhum é tocado.

#### TDD

```python
# tests/roadmap_dod_shape_test.py (NEW) — oráculo ESTRUTURAL (EC-2 absorvido).
# O detector "termina em . ou )" foi REJEITADO: o bullet real de M2 quebra depois de
# "(model/provider/tokens)" e passaria truncado. Truncamento é continuação de linha — detecte isso.
def test_nenhum_bullet_de_dod_de_m1_m2_m3_ocupa_mais_de_uma_linha():
    for milestone in ("M1", "M2", "M3"):
        lines = dod_block_lines("ROADMAP.md", milestone)   # entre DoD: e **Dependencies:**
        continuations = [ln for ln in lines if ln.strip() and not ln.lstrip().startswith("- [")]
        assert continuations == [], f"{milestone}: bullet quebrado em {continuations!r}"

def test_extrator_ve_o_mesmo_numero_de_criterios_que_existe_no_arquivo():
    for milestone in ("M1", "M2", "M3"):
        extracted = extract_acceptance_criteria(roadmap="ROADMAP.md", milestone=milestone)
        bullets = [ln for ln in dod_block_lines("ROADMAP.md", milestone)
                   if ln.lstrip().startswith("- [")]
        assert len(extracted) == len(bullets) >= 1
```

RED esperado: hoje M1 tem 4 bullets ocupando 7 linhas físicas — `continuations` volta não-vazio nos
três milestones.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- `python3 tests/roadmap_dod_shape_test.py` exit 0: nenhuma linha de continuação nos blocos de DoD
  de M1, M2 e M3 (EC-2).
- O número de critérios devolvido por `extract_acceptance_criteria.py --milestone M{1,2,3}` é igual
  ao número de bullets `- [` do bloco correspondente e ≥ 1 (EC-2).
- `grep -c '2026-08-04' ROADMAP.md` cresce em exatamente o número de critérios cancelados, e cada
  bullet cancelado casa `- \[ \].*2026-08-04` — substitui o critério de leitura humana (EC-3).

#### DoD

- O script de verificação acima roda com exit 0 para M1, M2 e M3.
- `CHANGELOG.md` atualizado.

## Phase 2: Superfície de configuração

### T2.1 — `scenario:"offline"` sai da fronteira

#### Why this step

**Ação.** Remover `"offline"` de `FixtureScenario` (`src/bootstrap.ts:6`) e de `VALID_SCENARIOS`
(`:13`), fazendo o valor cair no caminho de inválido já existente: warning acumulado + fallback
para `"default"`.

**Raciocínio.** Finding #2. Hoje `"offline"` atravessa a validação e some — `fixture-datasource.ts`
só distingue `"empty"`. `rules/error-handling.md` § 2 chama isso pelo nome: falha silenciosa. O
caminho de correção não escreve código novo (rung 5 da escada de parcimônia): o branch de inválido
em `bootstrap.ts:51` já faz exatamente o certo; basta parar de listar `"offline"` como válido.

#### Files to edit

- `packages/studio/src/bootstrap.ts` — `FixtureScenario` (`:6`), `VALID_SCENARIOS` (`:13`)
- `packages/studio/src/data/fixture-datasource.ts` — tipo `scenario` (`:22`) se referenciar o union
- `packages/studio/src/bootstrap.test.ts` — teste novo

#### Deep file dependency analysis

`StudioConfig["scenario"]` flui para `main.tsx:17` e daí para `createFixtureDataSource`
(`fixture-datasource.ts:22,26`). Estreitar o union é mudança **type-safe**: qualquer leitor que
compare com `"offline"` vira erro de compilação. Grep confirma que ninguém compara — só
`isEmpty = scenario === "empty"` (`:27`). O `npm run typecheck` é a rede que prova isso.

#### TDD

```ts
// packages/studio/src/bootstrap.test.ts — RED antes de estreitar o union
it("rejeita scenario offline com warning e cai para default", () => {
  const { config, warnings } = readStudioConfig(jsonScript({ scenario: "offline" }));
  expect(config.scenario).toBe("default");
  expect(warnings).toContain('invalid scenario "offline"');
});

// EC-5 absorvido: os dois valores sobreviventes não podem virar dano colateral do estreitamento.
it.each(["default", "empty"])("aceita scenario %s sem warning", (value) => {
  const { config, warnings } = readStudioConfig(jsonScript({ scenario: value }));
  expect(config.scenario).toBe(value);
  expect(warnings).toEqual([]);
});

// EC-6 absorvido: ausência da chave é caso VÁLIDO, não inválido.
it("config sem a chave scenario cai em default sem warning", () => {
  const { config, warnings } = readStudioConfig(jsonScript({}));
  expect(config.scenario).toBe("default");
  expect(warnings).toEqual([]);
});
```

RED esperado: hoje `config.scenario === "offline"` e `warnings` vem vazio na primeira asserção. As
de EC-5/EC-6 devem passar já no RED — são travas contra dano colateral, e o valor delas é
justamente falhar se o estreitamento for feito com um dedo a mais.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- `readStudioConfig` com `{"scenario":"offline"}` retorna `config.scenario === "default"` e
  `warnings` contendo `invalid scenario "offline"`, verificado por
  `npx vitest run src/bootstrap.test.ts` exit 0.
- `grep -rn '"offline"' packages/studio/src` retorna apenas ocorrências dentro de arquivos de
  teste, verificado na execução do gate.
- `npm run typecheck` exit 0 — prova de que nenhum leitor comparava com o valor removido.

#### DoD

- Suíte de `bootstrap.test.ts` verde; `npm run typecheck` limpo.
- `CHANGELOG.md` `[Unreleased] § Removed` com a linha voltada ao consumidor.

## Phase 3: Superfície morta no código

### T3.1 — `CounterName` contém apenas contadores emitidos

#### Why this step

**Ação.** Reduzir `CounterName` (`src/data/metrics.ts:4-9`) e `emptyState()` (`:14-20`) ao único
contador com emissor — `datasource_calls_total` — e travar a correspondência com um teste.

**Raciocínio.** Finding #3. Quatro dos cinco nomes aparecem zerados para sempre em
`window.__STUDIO_METRICS__`, o que é pior que ausência: um operador lendo `health_errors_total: {}`
conclui que não houve erro, quando na verdade ninguém conta. Isso corrói o pilar (c) da tríade de
wiring — a métrica existe e não observa nada. O teste que trava a correspondência é o que impede a
regressão silenciosa quando alguém adicionar um nome sem emissor.

#### Files to edit

- `packages/studio/src/data/metrics.ts` — `CounterName` (`:4-9`), `emptyState` (`:14-20`)
- `packages/studio/src/data/metrics.test.ts` — teste novo

#### Deep file dependency analysis

`metrics.increment` é chamado em 4 sítios, todos com `"datasource_calls_total"`
(`reflection-datasource.ts:80`, `fixture-datasource.ts:33,49,70`). `MetricsSnapshot` é
`Record<CounterName, CounterLabels>` (`:12`), então estreitar o union estreita o snapshot; o
bootstrap expõe o snapshot em `window.__STUDIO_METRICS__`. O teste de integração do M6 assevera
esse objeto não-vazio — precisa continuar verde, e continua, porque o contador que ele observa é
justamente o que sobrevive.

#### TDD

```ts
// packages/studio/src/data/metrics.test.ts — RED antes de podar o union
it("todo contador declarado no snapshot tem um emissor no código de produção", () => {
  const declared = Object.keys(metrics.snapshot());
  expect(declared).toEqual(["datasource_calls_total"]);
});

// EC-7 absorvido: o snapshot é cópia; mutá-lo não pode contaminar a próxima leitura.
it("snapshot não expõe o estado mutável interno", () => {
  metrics.increment("datasource_calls_total", "listAgents");
  const first = metrics.snapshot();
  first.datasource_calls_total.listAgents = 999;
  expect(metrics.snapshot().datasource_calls_total.listAgents).toBe(1);
});
```

RED esperado: a primeira recebe os cinco nomes. A de EC-7 deve passar já no RED (`structuredClone`
em `metrics.ts:30` garante) — existe para travar a garantia enquanto o arquivo é editado.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- `Object.keys(metrics.snapshot())` retorna exatamente `["datasource_calls_total"]`, verificado por
  `npx vitest run src/data/metrics.test.ts` exit 0.
- `npm run typecheck` exit 0 — prova de que nenhum `increment` referenciava um nome removido.
- O teste de integração do M6 que assevera `window.__STUDIO_METRICS__` não-vazio continua verde,
  verificado na suíte completa.

#### DoD

- Suíte verde; typecheck limpo.
- `CHANGELOG.md` atualizado.

### T3.2 — `reload()`, `version` e o warrant de lint falso removidos

#### Why this step

**Ação.** Remover de `use-listing.ts` o `reload` do valor de retorno (`:11`, `:39`), o estado
`version` (`:17`) e o comentário `biome-ignore` (`:20`) que só existia para justificá-lo; o
`useEffect` passa a depender de `[ds]`.

**Raciocínio.** Findings #4, #5 e #7 são um só defeito em três camadas, na ordem causal do ADR A3.
Nenhum dos três call sites em `builder/index.tsx` desestrutura `reload`. Manter a supressão de lint
é o pior dos resíduos: ensina que aquela supressão é legítima.

#### Files to edit

- `packages/studio/src/app/use-listing.ts` — assinatura de retorno, `version`, `biome-ignore`
- `packages/studio/src/app/use-listing.test.tsx` — teste novo; remover o teste do refresh se existir

#### Deep file dependency analysis

`useListing` tem exatamente um importador: `src/pages/builder/index.tsx:26`, com 3 chamadas
(`:89`, `:149`, `:150`), todas desestruturando apenas `items` e (em duas) `loadError`. Estreitar o
tipo de retorno é type-safe: se alguma chamada usasse `reload`, o `typecheck` quebraria. Se existir
teste que exercite o refresh, ele cai junto — é teste de comportamento removido, não regressão.

#### TDD

```ts
// packages/studio/src/app/use-listing.test.tsx — RED antes de podar o hook
it("expõe apenas items e loadError", () => {
  const { result } = renderHook(() => useListing(async () => []), { wrapper });
  expect(Object.keys(result.current).sort()).toEqual(["items", "loadError"].sort());
});
```

RED esperado: recebe `["items","loadError","reload"]`.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- `Object.keys` do retorno de `useListing` é exatamente `["items","loadError"]` (ordem
  irrelevante), verificado por `npx vitest run src/app/use-listing.test.tsx` exit 0.
- `grep -c "biome-ignore" packages/studio/src/app/use-listing.ts` retorna `0`.
- `npm run check` (biome) exit 0 com **0 warnings** — prova de que a remoção de `version` não
  reintroduziu a violação de `useExhaustiveDependencies` que a supressão mascarava.

#### DoD

- Suíte verde; `npm run check` limpo sem nenhuma supressão nova.
- `CHANGELOG.md` atualizado.

## Phase 4: API host-facing

### T4.1 — Endpoints host-facing documentados e fixados por teste

#### Why this step

**Ação.** Adicionar ao `README.md` uma seção que declara `/_studio/api/tools`,
`/_studio/api/workflows` e `POST /_studio/api/agents/:name/run` como **API host-facing** (consumida
pelo host que monta o Studio, não pela SPA), e escrever o teste de contrato que fixa status e forma
de resposta dos dois primeiros.

**Raciocínio.** Finding #8, decidido pelo ADR A4: o pacote foi publicado em `v0.3.0`, então a
ausência de consumidor neste repo não prova ausência de consumidor. Documentar sem fixar por teste
apenas adia a mentira — hoje **nenhum** teste assevera que esses dois endpoints respondem
`{items: [...]}`, então a documentação nasceria sem rede.

#### Files to edit

- `README.md` — nova seção "API host-facing"
- `packages/studio/tests/integration/studio-plugin.integration.test.ts` — testes de contrato

#### Deep file dependency analysis

`plugin/index.ts:95-100` responde os dois agregados a partir de `aggregateReflection` sobre o
resultado de `loadAgents(ctx)` — mesma compilação por request, nunca cacheada (comentário no
próprio handler, preservado do M1). O teste de integração do M6 já sobe um Vite dev server real e
tem o arranjo pronto; os testes novos entram no mesmo arquivo e reusam esse arranjo, sem
infraestrutura nova (rung 4 da escada de parcimônia).

#### TDD

```ts
// tests/integration/studio-plugin.integration.test.ts — RED antes de documentar
it("GET /_studio/api/tools responde 200 com um envelope items", async () => {
  const res = await fetch(`${baseUrl}/_studio/api/tools`);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("application/json");
  expect(await res.json()).toMatchObject({ items: expect.any(Array) });
});

it("GET /_studio/api/workflows responde 200 com um envelope items", async () => {
  const res = await fetch(`${baseUrl}/_studio/api/workflows`);
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ items: expect.any(Array) });
});
```

RED esperado: os testes não existem — o RED aqui é a ausência de cobertura, e a primeira execução
deve ser feita **antes** de qualquer edição, para provar que o contrato observado é o real e não o
desejado. Se algum já falhar, o finding vira defeito de produto, não de documentação.

**Escopo do contrato fixado aqui — EC-4 absorvido.** O run endpoint é documentado nesta task mas
**não** ganha teste de contrato aqui: o M8 já declara no seu DoD "405 não-POST
(`plugin/run-endpoint.ts:154`)". Cobri-lo agora seria retrabalho garantido sobre o mesmo arquivo.
A documentação do run endpoint no README declara essa lacuna em uma frase, em vez de sugerir uma
rede que ainda não existe.

#### Concurrency tests

(none — single-threaded)

#### Acceptance criteria

- `GET /_studio/api/tools` e `GET /_studio/api/workflows` respondem `200` com content-type JSON e
  corpo casando `{ items: Array }`, verificado por `npx vitest run tests/integration/` exit 0.
- `grep -c '_studio/api/tools' README.md` ≥ 1 e o mesmo para `_studio/api/workflows` e para o path
  do run endpoint — substitui o critério de leitura humana (EC-3).
- A seção nova **não** entra na tabela de features do T1.1 — o teste de contrato do README
  continua retornando `["Agent Builder"]`, verificado por `npx vitest run docs/`.

#### DoD

- Suíte de integração verde com os 2 testes novos.
- `CHANGELOG.md` `[Unreleased] § Added` documentando a superfície host-facing.

## Coverage Matrix

| # | Bullet de DoD do M7 (ROADMAP) | Task |
|---|---|---|
| 1 | README descreve o Agent Builder como superfície única | T1.1 |
| 2 | DoD de M1/M2/M3 reconciliado e em bullets de uma linha | T1.2 |
| 3 | `scenario:"offline"` removido ou com efeito observável | T2.1 |
| 4a | `CounterName` só com contadores emitidos | T3.1 |
| 4b | `reload()`/`version`/warrant falso removidos ou corrigidos | T3.2 |
| 5 | Decisão registrada sobre `/_studio/api/{tools,workflows}` e run endpoint | T4.1 |
| 6 | Gates verdes; nenhum finding de completude aberto sem justificativa | Phase 5 |

**Cobertura: 7/7 (100%).** Todo bullet do ROADMAP § M7 mapeia para ao menos uma task; nenhuma task
existe sem bullet correspondente.

## Drawbacks & Risks

| # | Risco | Severidade | Mitigação | Dono |
|---|---|---|---|---|
| R1 | Reescrever o DoD de M1/M2/M3 é decisão de produto, não de engenharia — ninguém aqui tem autoridade para dizer se aquelas telas voltam | ALTA | T1.2 **cancela com razão datada** em vez de decidir o futuro: o bullet registra que a superfície saiu em `74a96c6` e que a repriorização é decisão aberta. Fica em `## Unresolved Questions` para o dono do produto | paulohenriquevn |
| R2 | Remover os endpoints host-facing poderia quebrar um host externo integrado desde `v0.3.0` | ALTA | Não são removidos (ADR A4); são documentados e fixados por teste de contrato | paulohenriquevn |
| R3 | O teste de contrato do README (T1.1) pode virar ruído se a tabela mudar de formato | MÉDIA | O parser falha alto e claro se não achar a tabela, em vez de retornar lista vazia e passar; asseverado no próprio teste | paulohenriquevn |
| R4 | Remover `version` de `use-listing.ts` pode reintroduzir um warning de `useExhaustiveDependencies` que a supressão mascarava | MÉDIA | O DoD do T3.2 exige `npm run check` com **0 warnings** e proíbe supressão nova; se aparecer, o defeito é real e vira sub-task | paulohenriquevn |
| R5 | Estreitar `CounterName` pode quebrar o teste de integração do M6 que assevera `window.__STUDIO_METRICS__` | BAIXA | O contador observado por aquele teste é justamente o único que sobrevive; a suíte completa no Phase 5 é a prova | paulohenriquevn |

## Unresolved Questions

- Q1: As telas de Traces, Memory e Knowledge voltam ao roadmap como M9+ ou saem definitivamente do
  escopo do Studio? Decisão de produto; T1.2 registra o cancelamento com data sem decidir o futuro.
- Q2: Existe algum host externo consumindo `/_studio/api/{tools,workflows}` desde a `v0.3.0`? Sem
  telemetria de download não há como saber; A4 escolhe o caminho conservador de manter.

## Global Definition of Done

- `npm test` exit 0 na raiz, com os 7 testes novos passando.
- `npm run typecheck` exit 0.
- `npm run check` (biome) exit 0 com 0 warnings e nenhuma supressão nova.
- `npm run build` exit 0.
- Cobertura de branch global não regride abaixo de 89,46%.
- `CHANGELOG.md` `[Unreleased]` com uma entrada por mudança visível ao consumidor (Rule 6).
- `/code-quality` sem verdict `FAIL_HARD` nem `INVALID`.
- Nenhum dos 8 findings de completude da auditoria permanece aberto sem justificativa registrada
  neste plano ou num ADR.

## Failure scenarios (external I/O touched)

O único I/O externo tocado é HTTP, no teste de contrato do T4.1 contra o Vite dev server real.

| Dependência | Modo de falha | Como o teste reproduz | Comportamento esperado |
|---|---|---|---|
| Vite dev server (integração) | Servidor não sobe (porta ocupada) | O `beforeAll` existente já falha alto se `createServer` rejeitar | Suíte falha com a causa, nunca "pula" o teste silenciosamente |
| Vite dev server | Endpoint responde não-200 | Asserção explícita de `res.status === 200` | Teste vermelho nomeando status e corpo recebidos |
| `readFileSync("README.md")` (T1.1) | Arquivo ausente ou tabela não encontrada | O parser lança erro tipado em vez de retornar `[]` | Teste vermelho com mensagem que diz qual bloco não foi achado — nunca verde por lista vazia |

## Final Phase: Integration Validation (MANDATORY)

### T5.1 — Validação integrada

#### Concurrency tests

(none — single-threaded)

#### Passos

Rodar, na raiz, na ordem: `npm run check`, `npm run typecheck`, `npm test`,
`npx vitest run --coverage`, `npm run build`. Todos exit 0. Em seguida
`python3 .claude/skills/implement/scripts/run_validation.py docs-dead-surface-reconciliation`
com exit 0, e `/code-quality docs-dead-surface-reconciliation` com verdict ∉ {FAIL_HARD, INVALID}.

O plano não está completo enquanto essa cadeia não passar inteira.

## Absorbed MUST-FIX items (from /edge-case-plan)

Relatório: `knowledge-base/reviews/docs-dead-surface-reconciliation-edge-cases-2026-08-04.md`.

### EC-1 (absorvido) — Parser do README não pode passar verde por lista vazia

`parseFeatureTableSurfaces` lança erro nomeando o bloco quando não encontra a tabela. Absorvido no
TDD e na 3ª AC do **T1.1**. Sem isso, o único gate mecanizado do finding #1 perde poder
discriminante do mesmo jeito que o M6 pegou por mutação.

### EC-2 (absorvido) — O oráculo de truncamento aceitava o bullet real de M2

O detector "termina em `.` ou `)`" foi **rejeitado**: o bullet de M2 quebra depois de
`(model/provider/tokens)` e passaria truncado — ou seja, o oráculo falharia no caso que motivou a
task. Substituído por um oráculo estrutural (nenhuma linha de continuação + paridade entre
critérios extraídos e bullets no arquivo) no TDD e nas ACs do **T1.2**.

### EC-3 (absorvido) — Acceptance criteria por leitura humana

As três ACs que diziam "verificado por leitura do diff no review" (T1.1, T1.2, T4.1) viraram
asserções executáveis com contagem esperada (`grep -c`). Um critério que ninguém consegue provar é
o mecanismo exato pelo qual o AC6 do M6 chegou reprovado à aceitação.

### EC-4 (absorvido) — Contrato do run endpoint fica para o M8

T4.1 documenta os três recursos e fixa o contrato de dois. O run endpoint é coberto pelo DoD do M8
("405 não-POST em `plugin/run-endpoint.ts:154`"); duplicar aqui seria retrabalho sobre o mesmo
arquivo. A lacuna é declarada no README, não escondida.

### EC-5 / EC-6 / EC-7 (absorvidos como testes)

Travas contra dano colateral, adicionadas ao TDD de T2.1 (dois valores válidos sobreviventes;
ausência da chave é caso válido) e T3.1 (snapshot é cópia, não referência). Passam já no RED — o
valor delas é falhar se a poda for feita com um dedo a mais.
