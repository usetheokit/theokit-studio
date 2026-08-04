# Edge Case Review — test-quality-maintainability (M8)

Date: 2026-08-04
Tasks analisadas: 7 (T1.1, T2.1, T2.2, T3.1, T3.2, T4.1, T5.1)
Casos encontrados: 8 (EDGE: 3, NEGATIVE: 5 | MUST FIX: 3, SHOULD TEST: 3, DOCUMENT: 2)

O perfil de risco deste milestone é incomum: quase nada é feature nova. É **teste sobre teste** e
**refatoração sob rede**. Os dois modos de falha correspondentes são (a) escrever um teste que
parece provar e não prova — o defeito que abriu o milestone, repetido — e (b) mudar comportamento
enquanto se acredita estar só reorganizando.

## MUST FIX

### EC-1: A asserção nova do T1.1 pode passar pelo motivo errado

- **Task afetada:** T1.1
- **Kind:** NEGATIVE (falso negativo do oráculo)
- **Family:** Teste
- **Cenário:** `findByText("live-agent")` só discrimina se `"live-agent"` **não** existir no
  fixture. Hoje não existe — mas nada impede que amanhã alguém adicione um agente com esse nome ao
  `fixtures/registry.ts`, e a partir daí o teste volta a passar com o ternário invertido, em
  silêncio.
- **Impacto:** O milestone inteiro existe para matar um teste oco. Substituí-lo por outro que pode
  virar oco por acidente é repetir o defeito com um passo a mais.
- **Fix sugerido:** a AC já exige `grep -c 'live-agent' …/fixtures/registry.ts` retornando 0 —
  promover isso a **teste**, não só a critério: uma asserção no próprio arquivo de teste de que o
  nome usado no stub é ausente do fixture.

### EC-2: T3.1 declara um teste que não prova a mudança

- **Task afetada:** T3.1
- **Kind:** NEGATIVE (teste sem poder discriminante)
- **Family:** Teste
- **Cenário:** O TDD de T3.1 admite que `delegates_unimplemented_methods_to_the_fallback` "passa
  antes e depois". Ou seja: é uma trava de comportamento, não prova da troca de mecanismo. Se
  parasse aí, a task teria um teste que não pode falhar pela razão que motiva a task — de novo o
  defeito do milestone.
- **Impacto:** O ganho real de T3.1 é de **compilação**, e um teste de runtime nunca o demonstra.
- **Fix sugerido:** a AC3 já exige que remover uma delegação faça o `typecheck` falhar. Tratar essa
  prova como o RED da task — executada, registrada, revertida — e dizer no plano que o teste de
  runtime é trava, não prova. Sem isso, a task tem TDD nominal.

### EC-3: T3.2 pode mudar comportamento e a suíte não perceber

- **Task afetada:** T3.2
- **Kind:** NEGATIVE (refatoração sem rede suficiente)
- **Family:** Fronteira
- **Cenário:** O AC diz "nenhum teste existente muda de resultado". Mas `handleAgentRun` tem oito
  guards e só dois ganham teste em T2.1 (405 e — noutro arquivo — 403 de asset). Os outros seis
  (404 rota, 400 percent-encoding, 403 origem, 400 corpo, 404 agent, 424 provider key, 422 agent
  inválido) podem ou não ter cobertura. Extrair a cadeia de validação sem saber quais estão
  cobertos é refatorar no escuro.
- **Impacto:** É a fronteira de rede mais afiada do pacote, e um guard perdido é uma falha de
  segurança silenciosa (403 de origem protege tokens reais do provider).
- **Fix sugerido:** antes de extrair, **medir**: rodar cobertura sobre `plugin/run-endpoint.ts` e
  listar quais dos oito guards estão descobertos. Guard descoberto ganha teste antes da extração,
  ou a extração não o toca. O número entra no log.

## SHOULD TEST

### EC-4: Extensão conhecida com traversal — o caso exato do 403

- **Task afetada:** T2.1
- **Kind:** EDGE (extremo do válido)
- **Teste sugerido:** `test_traversal_with_known_extension_is_forbidden` — o ponto é que
  `isKnownAsset` seja **verdadeiro** (extensão `.js`) e ainda assim o guard recuse. Um teste com
  extensão desconhecida cairia noutro ramo e não provaria nada.

### EC-5: `405` vs `404` na ordem dos guards

- **Task afetada:** T2.1
- **Kind:** EDGE (ordem de avaliação)
- **Teste sugerido:** `test_non_post_on_unknown_agent_is_404_not_405` — os guards são sequenciais e
  a ordem é contrato. Sem isto, trocar a ordem de `matchRunPath` e do check de método passa
  despercebido, e um cliente recebe `405` onde esperava `404`.

### EC-6: Rejeição não-Error nos caminhos de escrita do builder

- **Task afetada:** T2.2
- **Kind:** NEGATIVE
- **Teste sugerido:** `start_session_non_error_rejection_surfaces_as_string` — o `.catch` faz
  `error instanceof Error ? error.message : String(error)`. O M7 encontrou exatamente esse ramo
  descoberto no `useListing`; o mesmo padrão aparece aqui.

## DOCUMENT

### EC-7: A triagem de T5.1 pode ficar desatualizada em relação ao banco

- **Kind:** EDGE
- **Risco aceito:** o registro é um snapshot de `findings.db` numa data. Se a auditoria for
  re-executada e produzir outros 32 `low`, o registro não acompanha. Aceitável: o M8 tria **a
  auditoria de 2026-08-04**, nomeada no cabeçalho do arquivo; uma auditoria nova é um ciclo novo.

### EC-8: A prova de mutação manual não sobrevive ao tempo

- **Kind:** NEGATIVE
- **Risco aceito:** já declarado no ADR A1 e no risco R3 do plano. As mutações provam o estado de
  hoje; nada impede que uma refatoração futura torne um teste oco de novo sem que ninguém repita a
  prova. É o custo consciente de não adotar Stryker, e o M8 registra o par (mutação → resultado)
  para que a repetição seja barata.

## Summary

| Task | EDGE | NEGATIVE | MUST FIX | SHOULD TEST | DOCUMENT |
|------|------|----------|----------|-------------|----------|
| T1.1 | 0 | 1 | 1 | 0 | 0 |
| T2.1 | 2 | 0 | 0 | 2 | 0 |
| T2.2 | 0 | 1 | 0 | 1 | 0 |
| T3.1 | 0 | 1 | 1 | 0 | 0 |
| T3.2 | 0 | 1 | 1 | 0 | 0 |
| T4.1 | 0 | 0 | 0 | 0 | 0 |
| T5.1 | 1 | 1 | 0 | 0 | 2 |

**Coverage check:** T4.1 é redistribuição de asserções existentes, sem fronteira de entrada nova —
a ausência de EDGE/NEGATIVE ali é justificada, não omissão.

**Verdict:** PLAN NEEDS ADJUSTMENT — 3 MUST FIX a absorver antes de `/implement`.
