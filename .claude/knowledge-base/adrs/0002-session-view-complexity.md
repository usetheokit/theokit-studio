# ADR 0002 — `SessionView` permanece acima do limite de complexidade

**Date:** 2026-08-04
**Status:** Accepted
**Milestone:** M8 — Qualidade da suíte e manutenibilidade
**Escopo:** `packages/studio/src/pages/builder/session-view.tsx`

## Contexto

O DoD do M8 exige que `handleAgentRun` (CC=18) e `SessionView` (CC=16) fiquem abaixo de 15,
"medidos pela mesma regra ESLint `complexity` com `variant: "classic"` usada na auditoria — ou
ADR registrando por que permanecem".

`handleAgentRun` foi resolvido: a cadeia de oito guards virou `resolveRunRequest`, e a medição por
`lizard` caiu de **CCN 20 → 10** (`resolveRunRequest` mede 12). Nenhum teste mudou de resultado.

`SessionView` é outro caso, por duas razões.

## Problema 1 — a métrica da auditoria não é reproduzível com o ferramental do projeto

O projeto usa **Biome**, não ESLint. O número CC=16 veio da regra ESLint `complexity` com
`variant: "classic"`, executada pelo auditor externo. Rodando `lizard` (a ferramenta de
complexidade disponível aqui):

```
$ lizard src/pages/builder/session-view.tsx
      6      1     23      3       6 SessionView@61-66
     12      2     69      1      17 startResize@85-101
       8      2     40      1       8 handleSubmit@103-110
      10      3     54      1      11 (anonymous)@229-239
```

Nenhuma função do arquivo passa de **CCN 3**. `lizard` atribui CCN 1 ao `SessionView` porque
conta o corpo da função e não os condicionais dentro do JSX; a regra do ESLint conta os ternários
e `&&` do markup. São **duas definições diferentes da mesma palavra**, e a diferença não é ruído:
19 condicionais no JSX contra ~2 no corpo imperativo.

Reproduzir o número da auditoria exigiria instalar ESLint — o que o **ADR A2 do plano do M8
rejeita**, com base no blueprint (decisão 2): a config de lint compartilhada do mastra tem 324
linhas e **zero** regras numéricas de complexidade; nenhum dos dois peers do nicho enforça o
número.

## Problema 2 — a densidade é de markup, não de decisão

Os 19 condicionais do `SessionView` são de renderização: mostrar ou não o painel de review,
destacar o arquivo selecionado, colapsar o work log, exibir o composer de follow-up. Cada um é uma
decisão de **uma linha, local, sem estado compartilhado**. É o formato que JSX tem para
condicional; extrair cada um para um componente nomeado produziria uma dúzia de componentes de uma
linha cujo único propósito seria baixar um contador.

Isso é exatamente o que `rules/parsimony-ladder.md` rung 1 proíbe ao contrário: criar código que
não precisa existir. E o AC do T3.2 exige que "toda função extraída nomeie um conceito do
domínio" — aqui não há conceito a nomear.

## Decisão

`SessionView` **permanece** como está. Nenhuma extração é feita.

## Consequências

**Aceitas:**

- O arquivo tem 279 linhas e um componente com muito markup condicional. Ler o `SessionView`
  inteiro exige rolar.
- Não temos, e continuamos sem ter, uma medida automática de complexidade de componente React.

**Mitigações:**

- O componente é coberto por `builder.test.tsx`, incluindo os caminhos de review, work log e
  follow-up — a densidade é de renderização e está exercitada.
- Se o `SessionView` ganhar **lógica** (não markup), a decisão se reabre: este ADR cobre densidade
  de JSX, não densidade de decisão de negócio.

## Alternativas rejeitadas

1. **Instalar ESLint só para medir.** Rejeitada pelo ADR A2 do plano: nenhum peer do nicho enforça
   o número, e introduzir um segundo linter para produzir uma métrica que não vira gate é custo sem
   contrapartida.
2. **Extrair os condicionais de JSX em subcomponentes.** Rejeitada: produz componentes de uma linha
   sem conceito de domínio, o que a AC do T3.2 explicitamente proíbe e a escada de parcimônia
   nomeia como anti-pattern.
3. **Ligar a regra `complexity` do Biome com teto 15.** Rejeitada pelo ADR A2 — a auditoria mediu
   duas funções acima, amostra pequena demais para justificar uma regra global sobre código que
   ninguém revisou.

## Honestidade sobre o que este ADR não resolve

Este ADR registra uma decisão, não um veredito de qualidade. `SessionView` **pode** estar denso
demais — só não temos, com o ferramental que escolhemos manter, um número que sustente ou refute
isso, e a inspeção manual diz que a densidade é de markup. Se alguém trouxer uma medição que
distinga markup de decisão, a decisão se reabre.
