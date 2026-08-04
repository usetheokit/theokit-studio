---
slug: test-quality-maintainability
milestone_id: M8
owner: paulohenriquevn
created_at: 2026-08-04
version: 1.0
status: ready-for-execute
---

# Discovery Plan: Poder discriminante de teste e densidade de decisão (M8)

## Context

A auditoria de 2026-08-04 (`knowledge-base/audits/studio-code-review-2026-08-04/`) encontrou um
teste que **não pode falhar pelo motivo que o nome afirma**: o avaliador inverteu o ternário de
`src/main.tsx:20` e a suíte seguiu verde. Um teste assim é pior que teste nenhum — ele reporta uma
garantia que não existe. Junto vieram guards HTTP sem cobertura (405, 403), duas funções com
complexidade ciclomática acima do limite (`handleAgentRun` CC=18, `SessionView` CC=16), uma
delegação por spread que só falha em runtime, dois testes multi-comportamento e 32 findings `low`
sem triagem (contagem confirmada em `findings.db`: 8 high, 24 medium, 32 low, 17 info).

O M7 acabou de mostrar, na prática, por que isto importa: dois mutantes sobreviveram à suíte
inteira (`[ds]` → `[]` no `useListing`, e um contador sem emissor no `metrics`), e ambos só foram
descobertos porque a review os procurou à mão. Suíte verde não é evidência de suíte forte.

A pergunta do M8 é diferente das dos milestones anteriores: não "como documentar o escopo" (M7) nem
"como não derrubar o dev server" (M6), mas **como um projeto sabe que seus testes de fato detectam
defeito, e onde vale gastar complexidade**.

Rules que qualquer padrão importado precisa respeitar: `rules/testing.md` (§ 3 disciplina, § 4.1
edge vs negative, § 6 anti-patterns), `rules/architecture.md` (DIP, coesão), `rules/parsimony-ladder.md`
(refatorar por estética é rung 1 falhando), `rules/error-handling.md` § 2.

## Objective

Produzir um blueprint que responda **como genkit e mastra (a) verificam que a suíte detecta
defeito, (b) escolhem e enforçam limites de complexidade, e (c) escrevem um decorador sobre uma
interface sem perder segurança de tipo** — o suficiente para o M8 decidir sem inventar convenção.

**Critérios de sucesso do blueprint:**

1. Cada research question respondida com citação `file:line` verificável.
2. Ao menos uma decisão do M8 (mutação, limite de complexidade, delegação) com precedente citado.
3. Ausência declarada como dado — se nenhum peer faz mutation testing, isso é o achado.

## In-Scope / Out-of-Scope

### In-Scope (per reference project)

**mastra** (`knowledge-base/references/mastra/`) — budget 1h30:
- `packages/_config/src/eslint.js` — config de lint compartilhada por todos os pacotes
- `packages/_test-utils/` — o pacote que existe só para apoiar testes
- `vitest.config.ts` (raiz) — política de teste do monorepo
- `packages/core/eslint.config.js` — como um pacote consome a config compartilhada

**genkit** (`knowledge-base/references/genkit/`) — budget 1h30:
- `js/core/tests/action_test.ts` e `js/core/tests/reflection_test.ts` — anatomia de teste
- `js/core/src/reflection.ts` — a fronteira HTTP com ramos de erro
- `js/core/package.json` — ferramental de teste declarado

### Out-of-Scope (explicit)

- Implementação de negócio de ambos os peers fora dos arquivos acima.
- **Web**: `rules/discover-web-allowlist.txt` está vazio → nenhum WebFetch. Limite declarado: não
  consultaremos literatura sobre mutation testing, só prática observada em código.

## ADRs

### D1 — Time budget + stop conditions

1h30 por peer, mais que o M7 (1h) porque a superfície é código de teste e configuração, não prosa.
Stop condition por questão: duas leituras sem sinal novo encerram a questão como `partial`.

### D2 — A ausência de uma prática é resposta, não lacuna

Se nenhum dos dois roda mutation testing, isso responde a Q1 com força — significa que a indústria
do nicho aceita outro proxy para força de teste, e o blueprint tem de identificar **qual**.
Registrar "não encontrado" é obrigatório; inventar uma prática que não existe é fabricação.

### D3 — Discovery local-only (sem WebFetch)

Allowlist web vazia, não alterada. Consequência: o blueprint descreve convenção praticada, não
estado da arte publicado. Mitigação: `rules/testing.md` já é a autoridade do projeto sobre
disciplina de teste; o que buscamos nos peers é o que eles **fazem**, não o que se recomenda.

### D4 — Nenhum texto dos peers entra no projeto

`rules/reference-provenance.md` § 3. Vale com força extra aqui: config de lint é tentadoramente
copiável. Lemos os limites, entendemos a razão, escrevemos a nossa.

## Research Questions

| # | Question | Corner | Reference project(s) | Fase A (broad — mapa de hotspots) | Fase B (deep — Read em cada hotspot) | Expected answer shape |
|---|---|---|---|---|---|---|
| Q1 | Como verificam que a suíte DETECTA defeito, e não apenas que passa? Existe mutation testing? | tests | `.claude/knowledge-base/references/mastra/`, `.claude/knowledge-base/references/genkit/` | `grep -rn "stryker\|mutation\|mutate" .claude/knowledge-base/references/mastra/packages/_test-utils .claude/knowledge-base/references/genkit/js/core/package.json` | Read `.claude/knowledge-base/references/mastra/vitest.config.ts` e `.claude/knowledge-base/references/genkit/js/core/package.json` | Ferramenta usada, ou a constatação de que nenhum usa e qual proxy usam no lugar |
| Q2 | Que limites de complexidade/tamanho são enforçados por lint, e com que números? | tools | `.claude/knowledge-base/references/mastra/` | `grep -n "complexity\|max-lines\|max-depth\|max-params\|no-restricted" .claude/knowledge-base/references/mastra/packages/_config/src/eslint.js` | Read `.claude/knowledge-base/references/mastra/packages/_config/src/eslint.js` inteiro | Lista de regras com thresholds, ou a constatação de que não há limite numérico |
| Q3 | Como um decorador/adapter sobre uma interface é escrito — spread do fallback ou delegação explícita? | techniques | `.claude/knowledge-base/references/genkit/` | `grep -n "\.\.\.\|delegate\|wrap" .claude/knowledge-base/references/genkit/js/core/src/registry.ts` | Read `.claude/knowledge-base/references/genkit/js/core/src/registry.ts` nas ocorrências | Padrão observado + se o compilador pega a omissão de um método |
| Q4 | Como testam os ramos de ERRO de uma fronteira HTTP (status não-feliz)? | tests | `.claude/knowledge-base/references/genkit/` | `grep -n "status\|4[0-9][0-9]\|throw" .claude/knowledge-base/references/genkit/js/core/tests/reflection_test.ts` | Read `js/core/tests/reflection_test.ts` nas ocorrências | Se há teste por status; anatomia da asserção (status só, ou status + corpo) |
| Q5 | Um teste cobre um comportamento ou vários? Como nomeiam? | techniques | `.claude/knowledge-base/references/genkit/` | `grep -n "^\s*it(\|^\s*describe(" .claude/knowledge-base/references/genkit/js/core/tests/action_test.ts` | Read os blocos que a Fase A apontar | Granularidade observada + convenção de nome |
| Q6 | Existe pacote/infra dedicado a apoio de teste, e o que ele carrega? | deps | `.claude/knowledge-base/references/mastra/` | `grep -n "name\|dependencies\|exports" .claude/knowledge-base/references/mastra/packages/_test-utils/package.json` | Read `packages/_test-utils/package.json` e listar `src/` | O que vale extrair para um pacote de apoio vs manter junto do teste |

## Coverage Matrix

| Corner | Questions mapped | Status |
|---|---|---|
| Integration tests (`tests`) | Q1, Q4 | Covered |
| Dependencies (`deps`) | Q6 | Covered |
| Tools (`tools`) | Q2 | Covered |
| Techniques (`techniques`) | Q3, Q5 | Covered |

**Coverage: 4/4 corners covered (100%)**

Budget: **6 questões** (mín. 5, máx. 10 ✅), máx. 3 por corner ✅, mín. 1 por corner ✅. Todos os
caminhos citados foram verificados com `ls` antes de entrarem nesta tabela.

## Halt-loop Checkpoints

1. A resposta cita ao menos um arquivo da zona com número de linha.
2. O caminho citado resolve em disco.
3. Ausência é registrada como ausência, com o comando que a comprovou (D2).
4. Nenhuma linha de config ou de teste dos peers é copiada; a técnica é descrita com palavras
   próprias.

## Acceptance Criteria

- [ ] As 6 questões estão `done` ou `partial` com razão.
- [ ] Todo caminho citado no blueprint resolve.
- [ ] Os 4 corners têm conteúdo não-placeholder.
- [ ] ≥ 1 ADR ligando precedente a decisão do M8.
- [ ] Nenhuma prosa/config copiada (`rules/reference-provenance.md` § 3).

## Global Definition of Done

`/discover-confidence` ≥ `SHIPPABLE_WITH_CAVEATS` conforme
`rules/discover-blueprint-golden-rule.md`.
