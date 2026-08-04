---
slug: docs-dead-surface-reconciliation
milestone_id: M7
owner: paulohenriquevn
created_at: 2026-08-04
version: 1.0
status: ready-for-execute
---

# Discovery Plan: Documentação de escopo e remoção honesta de superfície (M7)

## Context

O M7 reconcilia documentação e código depois do corte de `74a96c6`, que removeu 20 telas
(−7.224 LoC). A auditoria (`knowledge-base/audits/studio-code-review-2026-08-04/`) registrou 8
findings de completude: README vendendo cinco telas inexistentes (#1), DoD de M1/M2/M3
insatisfazível (#12), `scenario:"offline"` aceito e ignorado (#2), quatro contadores zerados
para sempre (#3), `reload()` morto (#4), warrant de lint falso (#7) e endpoints sem consumidor (#8).

O blueprint anterior (`plugin-hardening-blueprint.md`) tratou da fronteira HTTP e **não** cobre
documentação nem remoção de superfície. Esta discovery é sobre uma pergunta diferente: **como um
dev tool documenta o escopo que ele realmente entrega, e como remove superfície sem quebrar quem
depende dela.**

Rules que qualquer padrão importado precisa respeitar: `rules/public-copy.md` (honestidade de
copy; proibições de linguagem), `rules/parsimony-ladder.md` (rung 1 — código que não precisa
existir não deve existir), `rules/error-handling.md` § 2 (entrada aceita e ignorada é falha
silenciosa).

## Objective

Produzir um blueprint que responda **como genkit e mastra (a) estruturam o README de um pacote
de dev tooling, (b) comunicam remoção/depreciação de superfície, e (c) tratam opções de config
que deixaram de ter efeito** — o suficiente para o M7 reconciliar sem inventar convenção.

**Critérios de sucesso do blueprint:**

1. Cada uma das 5 research questions respondida com citação `file:line` verificável.
2. Ao menos uma decisão do M7 (README, depreciação, config inerte) com precedente citado.
3. Divergências entre os peers explicitadas, não achatadas.

## In-Scope / Out-of-Scope

### In-Scope (per reference project)

**mastra** (`knowledge-base/references/mastra/`) — budget 1h:
- `packages/deployer/README.md` — README de pacote de dev tooling
- `packages/deployer/CHANGELOG.md` — comunicação de mudança/remoção
- `packages/deployer/package.json` — o que é declarado público

**genkit** (`knowledge-base/references/genkit/`) — budget 1h:
- `js/core/README.md` — README de pacote core
- `js/core/package.json` — superfície pública declarada
- `js/core/src/config.ts` — tratamento de opções de configuração

### Out-of-Scope (explicit)

- Todo o resto de ambos os repositórios: `src/` além de `config.ts`, testes, exemplos, CI.
  O M7 é sobre documentação e superfície morta, não sobre implementação.
- **Web**: `rules/discover-web-allowlist.txt` está vazio → nenhum WebFetch. Limite declarado.

## ADRs

### D1 — Time budget + stop conditions

1h por peer. Stop condition por questão: duas leituras sem novo sinal encerram a questão como
`partial`. Budget menor que o do M6 porque a superfície investigada é documentação, não código
de fronteira: o retorno marginal cai rápido.

### D2 — Investigation depth: ler o que é PROMETIDO, não o que é implementado

Lemos README, CHANGELOG e `package.json` — os artefatos onde o escopo é declarado. Não lemos
implementação, exceto `config.ts` do genkit (questão específica sobre opção inerte).

### D3 — Discovery local-only (sem WebFetch)

A allowlist web está vazia por padrão de segurança e não foi alterada. Consequência: nenhuma
consulta a guias de estilo de README ou a specs de deprecação. Mitigação: `rules/public-copy.md`
já é a autoridade do projeto sobre honestidade de copy, e o que buscamos nos peers é convenção
praticada, que o código-fonte responde melhor que um guia.

### D4 — Nenhum texto dos peers entra no projeto

`rules/reference-provenance.md` § 3: lemos, entendemos, escrevemos a nossa versão. Isto vale
com força extra aqui — copiar prosa de README é ainda mais direto que copiar código.

## Research Questions

| # | Question | Corner | Reference project(s) | Fase A (broad — mapa de hotspots) | Fase B (deep — Read em cada hotspot) | Expected answer shape |
|---|---|---|---|---|---|---|
| Q1 | Como o README de um pacote de dev tooling declara o ESCOPO — o que a ferramenta faz e o que ela explicitamente não faz? | techniques | `.claude/knowledge-base/references/mastra/`, `.claude/knowledge-base/references/genkit/` | `grep -n "^#" .claude/knowledge-base/references/mastra/packages/deployer/README.md` e o mesmo em `.claude/knowledge-base/references/genkit/js/core/README.md` para mapear a estrutura de seções | Read os dois README inteiros | Estrutura de seções de cada um + se declaram limites/não-objetivos, com `file:line` |
| Q2 | Como comunicam REMOÇÃO ou depreciação de superfície ao consumidor? | techniques | `.claude/knowledge-base/references/mastra/` | `grep -n "BREAKING\|deprecat\|removed" .claude/knowledge-base/references/mastra/packages/deployer/CHANGELOG.md` | Read as entradas encontradas em contexto | Vocabulário e formato usados para remoção; se há período de depreciação antes |
| Q3 | O que fazem com uma opção de configuração que deixou de ter efeito — removem, mantêm avisando, ou aceitam em silêncio? | techniques | `.claude/knowledge-base/references/genkit/` | `grep -n "deprecated\|ignored\|no longer" .claude/knowledge-base/references/genkit/js/core/src/config.ts` | Read `js/core/src/config.ts` nas ocorrências e no entorno | Política observada + se há aviso em runtime. Ausência é resposta válida |
| Q4 | Como testam/verificam que a documentação não mente sobre a superfície pública? | tests | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | `ls .claude/knowledge-base/references/genkit/js/core/tests/` e `grep -n "README\|docs" .claude/knowledge-base/references/mastra/packages/deployer/vitest.config.ts` | Read os arquivos que a Fase A apontar | Existe teste de doc? Se não existe em nenhum, é achado — a lacuna é da indústria |
| Q5 | O que cada `package.json` declara como superfície pública, e isso bate com o README? | deps | `.claude/knowledge-base/references/mastra/`, `.claude/knowledge-base/references/genkit/` | `grep -n "exports\|files\|main\|types" .claude/knowledge-base/references/genkit/js/core/package.json` e o mesmo em `.claude/knowledge-base/references/mastra/packages/deployer/package.json` | Read as seções `exports`/`files` dos dois | Superfície declarada vs prometida no README; divergências |
| Q6 | Que ferramenta cada peer usa para publicar e versionar, e isso impõe disciplina sobre o CHANGELOG? | tools | `.claude/knowledge-base/references/mastra/` | `grep -n "changeset\|release\|publish" .claude/knowledge-base/references/mastra/packages/deployer/package.json` | Read a seção `scripts` | Ferramenta + se o fluxo obriga entrada de changelog |

## Coverage Matrix

| Corner | Questions mapped | Status |
|---|---|---|
| Integration tests (`tests`) | Q4 | Covered |
| Dependencies (`deps`) | Q5 | Covered |
| Tools (`tools`) | Q6 | Covered |
| Techniques (`techniques`) | Q1, Q2, Q3 | Covered |

**Coverage: 4/4 corners covered (100%)**

Budget: **6 questões** (mín. 5, máx. 10 ✅), máx. 3 por corner ✅, mín. 1 por corner ✅. Todos os
caminhos citados foram verificados com `ls` antes de entrarem nesta tabela.

## Halt-loop Checkpoints

1. A resposta cita ao menos um arquivo da zona com número de linha.
2. O caminho citado resolve em disco.
3. A resposta diz o que o peer faz **e** o que ele não faz — ausência é dado (ver Q3 e Q4).
4. Nenhuma linha de prosa dos peers é copiada; a técnica é descrita com palavras próprias.

## Acceptance Criteria

- [ ] As 6 questões estão `done` ou `partial` com razão.
- [ ] Todo caminho citado no blueprint resolve.
- [ ] Os 4 corners têm conteúdo não-placeholder.
- [ ] ≥ 1 ADR ligando precedente a decisão do M7.
- [ ] Nenhuma prosa copiada (`rules/reference-provenance.md` § 3).

## Global Definition of Done

`/discover-confidence` ≥ `SHIPPABLE_WITH_CAVEATS` conforme
`rules/discover-blueprint-golden-rule.md`.
