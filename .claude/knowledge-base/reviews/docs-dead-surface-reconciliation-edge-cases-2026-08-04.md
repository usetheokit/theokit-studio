# Edge Case Review — docs-dead-surface-reconciliation (M7)

Date: 2026-08-04
Tasks analisadas: 6 (T1.1, T1.2, T2.1, T3.1, T3.2, T4.1)
Casos encontrados: 9 (EDGE: 4, NEGATIVE: 5 | MUST FIX: 4, SHOULD TEST: 3, DOCUMENT: 2)

O plano é majoritariamente **remoção** e **documentação**, o que muda o perfil de risco: não há
input de usuário novo, mas há dois parsers novos (README e ROADMAP) cujas fronteiras são texto —
e parser de texto que retorna vazio em vez de falhar é a armadilha clássica desta classe de task.

## MUST FIX

### EC-1: Parser do README pode passar verde por lista vazia

- **Task afetada:** T1.1
- **Kind:** NEGATIVE (entrada malformada)
- **Family:** Format / Parsing
- **Cenário:** `parseFeatureTableSurfaces` não encontra a tabela (formato mudou, tabela removida,
  cabeçalho renomeado) e retorna `[]`. A asserção `expect(surfaces).toEqual(["Agent Builder"])`
  falha — mas se alguém "corrigir" o teste para `toHaveLength(0)` ou se o esperado for relaxado, o
  teste vira verde permanente sem observar nada.
- **Impacto:** O único gate mecanizado do finding #1 perde poder discriminante silenciosamente.
  É exatamente o modo de falha que o M6 pegou por mutação.
- **Fix sugerido:** o parser **lança** erro tipado quando não acha o bloco da tabela, e a AC exige
  um teste negativo asseverando a mensagem — não apenas "throws".

### EC-2: O oráculo de truncamento do T1.2 aceita critério truncado que termina em `)`

- **Task afetada:** T1.2
- **Kind:** NEGATIVE (falso negativo do oráculo)
- **Family:** Format
- **Cenário:** `c.strip().endswith((".", ")"))` foi escolhido como detector de truncamento. Um
  bullet quebrado exatamente depois de `...(agents/tools/skills/` não termina em `)`, então é
  pego — mas um quebrado depois de `...typed columns (model/provider/tokens)` **termina em `)`** e
  passa como completo, mesmo truncado.
- **Impacto:** O bullet que o finding #12 nomeia (M2, "typed columns (model/provider/tokens)")
  é justamente desse formato. O oráculo passaria no caso real que motivou a task.
- **Fix sugerido:** trocar o oráculo por um estrutural: nenhuma linha entre
  `**Definition of done:**` e `**Dependencies:**` pode ser continuação (começar com espaço em vez
  de `- [ ]`), e a contagem de critérios extraídos tem de bater com a contagem de bullets `- [ ]`.

### EC-3: Duas acceptance criteria dependem de leitura humana

- **Tasks afetadas:** T1.1 (3ª AC), T1.2 (3ª AC), T4.1 (2ª AC)
- **Kind:** NEGATIVE (critério inexecutável)
- **Family:** Process
- **Cenário:** "verificado por leitura do diff no review" não é oráculo — é intenção. `/implement`
  não consegue provar a AC, e `/acceptance` não consegue exercitá-la.
- **Impacto:** Critério não mecanizado é critério que ninguém verifica; foi assim que o AC6 do M6
  chegou reprovado à aceitação.
- **Fix sugerido:** converter cada um em asserção executável (grep com contagem esperada) ou
  rebaixá-lo explicitamente a nota de review, sem status de AC.

### EC-4: T4.1 documenta três recursos e fixa contrato de dois

- **Task afetada:** T4.1
- **Kind:** EDGE (cobertura parcial de um conjunto declarado)
- **Family:** Contract
- **Cenário:** A seção nova do README nomeia `/_studio/api/tools`, `/_studio/api/workflows` **e** o
  run endpoint. Os testes de contrato cobrem só os dois primeiros.
- **Impacto:** Documenta-se uma superfície sem rede, que é precisamente o defeito que o ADR A4 diz
  querer evitar. Pior: o run endpoint é o mais complexo dos três (streaming, 405, 400 de
  percent-encoding malformado).
- **Fix sugerido:** declarar explicitamente no plano que o contrato do run endpoint é fixado no
  **M8** (que já traz "405 não-POST em `plugin/run-endpoint.ts:154`" no seu DoD), citando o bullet.
  Cobrir aqui seria retrabalho garantido.

## SHOULD TEST

### EC-5: `scenario` válido continua funcionando depois de estreitar o union

- **Task afetada:** T2.1
- **Kind:** EDGE (extremo do válido)
- **Teste sugerido:** `test_readStudioConfig_aceita_empty_e_default_sem_warning` — assevera que os
  dois valores sobreviventes produzem `warnings` vazio. Sem isso, um estreitamento com um dedo a
  mais quebraria `"empty"` e nenhum teste pegaria.

### EC-6: Config sem chave `scenario` continua caindo em `default`

- **Task afetada:** T2.1
- **Kind:** EDGE (ausente-mas-válido)
- **Teste sugerido:** `test_readStudioConfig_sem_scenario_usa_default_sem_warning` — o caminho
  `input.scenario === undefined` (`bootstrap.ts:47`) não pode passar a emitir warning por efeito
  colateral da mudança.

### EC-7: Snapshot de métricas continua sendo cópia, não referência

- **Task afetada:** T3.1
- **Kind:** NEGATIVE (mutação externa do estado interno)
- **Teste sugerido:** `test_snapshot_nao_expoe_estado_mutavel` — mutar o objeto devolvido por
  `snapshot()` não pode afetar a próxima leitura. `structuredClone` (`metrics.ts:30`) já garante;
  o teste trava a garantia enquanto o arquivo é editado.

## DOCUMENT

### EC-8: O README volta a divergir sem nenhum gate depois deste milestone

- **Kind:** NEGATIVE
- **Risco aceito:** o teste de contrato do T1.1 cobre só a tabela de features. Hero, prosa e a
  promessa de degradação graciosa continuam sem oráculo — e o blueprint (D5) explica por quê:
  prosa de intenção não tem oráculo mecanizável. Fica registrado que a única proteção dessas
  partes é disciplina de review.

### EC-9: Cancelar critério de M1/M2/M3 não decide se as telas voltam

- **Kind:** EDGE
- **Risco aceito:** T1.2 registra o cancelamento com data e razão, deliberadamente sem decidir a
  repriorização — isso é decisão de produto (R1 / Q1 do plano). Consequência honesta: M1/M2/M3
  passam a ser **aceitáveis**, mas com escopo reduzido declarado, não com escopo original cumprido.

## Summary

| Task | EDGE | NEGATIVE | MUST FIX | SHOULD TEST | DOCUMENT |
|------|------|----------|----------|-------------|----------|
| T1.1 | 0 | 2 | 2 | 0 | 1 |
| T1.2 | 1 | 2 | 2 | 0 | 1 |
| T2.1 | 2 | 0 | 0 | 2 | 0 |
| T3.1 | 0 | 1 | 0 | 1 | 0 |
| T3.2 | 0 | 0 | 0 | 0 | 0 |
| T4.1 | 1 | 0 | 1 | 0 | 0 |

**Coverage check:** T3.2 não tem fronteira de entrada — é remoção pura de símbolo, provada por
`typecheck` + `biome`; a ausência de EDGE/NEGATIVE ali é justificada, não omissão.

**Verdict:** PLAN NEEDS ADJUSTMENT — 4 MUST FIX a absorver antes de `/plan-confidence`.
