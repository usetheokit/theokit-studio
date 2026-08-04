# Edge Case Review — plugin-hardening (M6)

Date: 2026-08-04
Plan analyzed: `.claude/knowledge-base/plans/plugin-hardening-plan.md`
Tasks analyzed: 6 (T1.1, T1.2, T1.3, T2.1, T3.1, T4.1)
Cases found: 9 (EDGE: 4, NEGATIVE: 5 | MUST FIX: 5, SHOULD TEST: 3, DOCUMENT: 1)

## MUST FIX

### EC-1: O guard novo pode trocar um crash por outro

- **Affected task:** T1.1
- **Kind:** NEGATIVE
- **Family:** State
- **Scenario:** A resposta pode estar **comprometida E encerrada** ao mesmo tempo
  (`headersSent === true` e `writableEnded === true`) — por exemplo, um handler que já chamou
  `res.end()` e depois lança. Se o novo caminho "escreve o erro no corpo" rodar nesse estado,
  `res.end()` levanta `ERR_STREAM_WRITE_AFTER_END`.
- **Impact:** Exatamente a falha que o M6 existe para remover, com outro código de erro — dentro
  do mesmo `.catch()` de `index.ts:126`, vira unhandled rejection e mata o processo.
- **Suggested fix:** A ordem dos predicados é o contrato: `writableEnded || destroyed` continua
  saindo **primeiro**; só então o branch de `headersSent` escreve o corpo.

### EC-2: Um fake com `headersSent` fixo torna o teste novo impossível

- **Affected task:** T1.3
- **Kind:** NEGATIVE
- **Family:** State
- **Scenario:** O plano diz "valor explícito (`headersSent: false`)" para não deixar `undefined`.
  Mas um literal congelado nunca vira `true` — e o RED de T1.3 (handler lança **depois** do head
  comprometido) precisa que o fake reflita o `writeHead`.
- **Impact:** O teste do dispatcher passaria vacuamente, repetindo o defeito que a auditoria já
  achou nos fakes atuais (`static-serve.test.ts:48` hardcoda `destroyed: false`).
- **Suggested fix:** Pelo menos o fake de `index.test.ts` expõe `headersSent` como **getter que
  reflete se `writeHead` foi chamado**; os outros dois podem manter literal.

### EC-3: `/_studio/svc` exato (sem barra) escapa do namespace reservado

- **Affected task:** T2.1
- **Kind:** EDGE
- **Family:** Boundary
- **Scenario:** O plano reserva o prefixo `/_studio/svc/`. A requisição para `/_studio/svc`
  (sem barra final) não casa e cai no fallback da SPA — devolvendo HTML no namespace de contrato,
  que é o bug original sobrevivendo na borda.
- **Impact:** O finding #49 fica corrigido para todos os paths menos o mais curto deles.
- **Suggested fix:** Reservar `pathname === "/_studio/svc" || pathname.startsWith("/_studio/svc/")`
  — exatamente a forma que o mastra usa (`index.ts:429-430`).

### EC-4: "Diretório pulado é visível" não é critério executável

- **Affected task:** T3.1
- **Kind:** NEGATIVE
- **Family:** Format
- **Scenario:** O critério de aceite diz que o diretório ilegível fica "visível (não engolido em
  silêncio)", sem dizer **por qual mecanismo**. O implementador pode escolher `console.warn`, um
  campo no nó retornado, ou nada — e o teste não teria o que assertar.
- **Impact:** `rules/error-handling.md` § 2 proíbe engolir; um critério não-verificável permite
  que o engolimento passe pelo gate.
- **Suggested fix:** Fixar o mecanismo no plano: a varredura emite `console.warn` com o caminho e
  o `code` do erro, e o teste assevera a chamada (spy) — mesmo espírito do agent degradado com
  `error` que a reflection já expõe.

### EC-5: O corpo da resposta só pode ser lido uma vez

- **Affected task:** T4.1
- **Kind:** NEGATIVE
- **Family:** I/O
- **Scenario:** O RED 2 pede que corpo não-JSON não quebre o cliente. A implementação ingênua
  (`await res.json()` dentro de `try`, e no `catch` cair para `res.text()`) **falha**: o body de
  `fetch` é um stream de leitura única; depois do `json()` falhar, o `text()` lança
  `TypeError: body used already`.
- **Impact:** O caso negativo que o plano exige seria impossível de satisfazer, e o cliente
  quebraria justamente no caminho de erro.
- **Suggested fix:** Ler **uma vez** como texto (`const raw = await res.text()`) e então tentar
  `JSON.parse(raw)` dentro de try/catch.

## SHOULD TEST

### EC-6: Asset válido de 0 byte

- **Affected task:** T1.2
- **Kind:** EDGE
- **Suggested test:** `test_serveStudio_empty_asset_still_returns_200_with_content_type` — arquivo
  existente com 0 byte deve produzir **200 com o Content-Type correto e corpo vazio**, não ser
  confundido com falha de leitura agora que a leitura acontece antes do head.

### EC-7: `/_studio/svcfoo` não pode ser tratado como reservado

- **Affected task:** T2.1
- **Kind:** NEGATIVE
- **Suggested test:** `test_reserved_namespace_requires_separator` — `/_studio/svcfoo` NÃO é
  namespace reservado e segue o caminho normal; assevera que não recebe o 404 tipado. Protege
  contra a forma insegura `startsWith("/_studio/svc")` sem separador.

### EC-8: Envelope presente mas sem `code`

- **Affected task:** T4.1
- **Kind:** EDGE
- **Suggested test:** `test_envelope_without_code_falls_back_to_status_message` — corpo
  `{"error":{"message":"x"}}` (válido como JSON, incompleto como envelope) produz erro com a
  mensagem do servidor e um `code` de fallback, sem lançar.

## DOCUMENT

### EC-9: Ciclo de symlink na varredura de agents

- **Kind:** NEGATIVE
- **Accepted risk:** Um symlink apontando para um ancestral faz a varredura recursiva de
  `scanStudioAgents` girar até estourar a pilha. **É pré-existente** — o M6 não introduz nem
  agrava. Corrigir exigiria rastrear inodes visitados, o que é mais complexidade do que o dano
  em um diretório `agents/` de projeto de desenvolvimento. Registrado para o M8, onde a triagem
  dos `low` decide se vale.

## Summary

| Task | EDGE | NEGATIVE | MUST FIX | SHOULD TEST | DOCUMENT |
|------|------|----------|----------|-------------|----------|
| T1.1 | 0 | 1 | 1 | 0 | 0 |
| T1.2 | 1 | 0 | 0 | 1 | 0 |
| T1.3 | 0 | 1 | 1 | 0 | 0 |
| T2.1 | 1 | 1 | 1 | 1 | 0 |
| T3.1 | 0 | 2 | 1 | 0 | 1 |
| T4.1 | 1 | 1 | 1 | 1 | 0 |

**Coverage check:** as seis tarefas tocam fronteira de entrada e todas receberam as duas lentes.
T1.1 e T1.3 não têm caso EDGE próprio — o "extremo válido" delas é o caminho não-comprometido,
que o plano já assevera em RED 4 de T1.1; anotado em vez de inventar um caso artificial.

**Verdict:** PLAN NEEDS ADJUSTMENT — cinco MUST FIX, todos com correção de ≤ 3 linhas ou uma
frase de plano. Dois deles (EC-1, EC-5) são armadilhas que fariam a implementação ingênua
**reintroduzir a classe de falha que o milestone existe para eliminar**.
