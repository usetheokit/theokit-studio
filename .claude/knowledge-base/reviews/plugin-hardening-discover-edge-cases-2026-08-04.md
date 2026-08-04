# Discover Edge Case Review — plugin-hardening

Date: 2026-08-04
Discovery plan analyzed: `.claude/knowledge-base/discoveries/plans/plugin-hardening-plan.md` (v1.0)
Research questions analyzed: 7
Edge cases found: 7 (MUST FIX: 3, SHOULD TEST: 3, DOCUMENT: 1)

## MUST FIX

### EC-1: Os métodos `grep` do plano são bloqueados pelo hook de provenance

- **Affected question:** Q1, Q3, Q5 (todas que declaram `grep`)
- **Family:** Method
- **Scenario:** `rules/reference-provenance.md` § 2 instala um guard de export (layer 1) em
  `hooks/validate-command.sh` que bloqueia comandos tocando a zona de referências quando eles
  contêm pipe ou redirect. **Isto não é hipótese: aconteceu duas vezes ao montar este plano** —
  `ls .claude/knowledge-base/references/ 2>/dev/null` e um `find ... | wc -l` foram ambos
  bloqueados com exit 2.
- **Impact:** `/discover-execute` roda `grep -rn 'headersSent' ... | head -20`, recebe exit 2, e
  a iteração ou trava ou marca a questão `blocked` por um motivo que não é do domínio — três
  questões perdem seu método principal.
- **Suggested fix:** Declarar no plano que todo acesso à zona usa comando **sem pipe e sem
  redirect** (`grep -rn PADRÃO caminho/` puro), ou `python3` com `pathlib`/`re`.

### EC-2: Q3 compara um roteador de framework com nosso middleware artesanal

- **Affected question:** Q3
- **Family:** Interpretation
- **Scenario:** O deployer do mastra monta rotas sobre **Hono**, cujo `notFound` e cuja
  precedência de rota são semântica do framework. Nosso `plugin/index.ts` é um middleware
  connect artesanal que reivindica o prefixo `/_studio` inteiro e nunca chama `next()`.
- **Impact:** O blueprint conclui "mastra devolve 404 tipado" e o M6 importa a conclusão sem
  perceber que ela depende de um roteador que não temos — recomendação inaplicável, exatamente
  o retrabalho que o objetivo do ciclo proíbe.
- **Suggested fix:** Q3 passa a exigir, na resposta, o **modelo de roteamento** do peer antes da
  conclusão, para que a aplicabilidade seja julgada e não presumida.

### EC-3: Q4 assume que o genkit testa o servidor de reflection

- **Affected question:** Q4
- **Family:** Reference path
- **Scenario:** `references/genkit/js/core/tests/` existe (verificado), mas não foi verificado se
  há teste do **servidor de reflection** — pode conter apenas testes de `action`/`schema`.
- **Impact:** A metade genkit de Q4 fica vazia e o executor, para fechar a matriz, é tentado a
  responder com o teste mais próximo que encontrar — resposta inventada por pressão de cobertura.
- **Suggested fix:** Adicionar fallback explícito a Q4: se não houver teste de servidor no
  genkit, responder Q4 só com mastra e **declarar a ausência** como parte da resposta.

## SHOULD TEST

### EC-4: Clone com `--filter=blob:none` pode ter conteúdo ausente

- **Affected question:** Q2, Q6, Q7 (arquivos ainda não abertos: `statusTypes.ts`, `action.ts`, os `package.json`)
- **Suggested halt-loop checkpoint:** Antes de citar um arquivo, **abrir de fato** (não apenas
  `Path.exists`) — com blob-filtered clone, existência no índice não garante conteúdo materializado
  sem rede. Um `head -1` que falha vira `partial`, nunca citação.

### EC-5: Q6 pode concluir o óbvio e não o aplicável

- **Affected question:** Q6
- **Suggested halt-loop checkpoint:** Q6 só fecha se a resposta disser explicitamente **se o
  padrão sobrevive sem framework** — ambos os peers carregam um (express no genkit, Hono no
  mastra) e nós não podemos carregar nenhum. "Ambos usam framework" é verdade inútil.

### EC-6: `http-exception.ts` do mastra é cópia declarada do Hono

- **Affected question:** Q2
- **Suggested halt-loop checkpoint:** A primeira linha do arquivo diz
  `// Copied from https://github.com/honojs/hono/...`. O blueprint deve atribuir o padrão ao
  **Hono**, não ao mastra — atribuir errado é falsificar a proveniência do precedente, e a
  regra que nos proíbe de copiar (`reference-provenance.md` § 3) pesa dobrado aqui: seria
  copiar de terceiro de terceiro.

## DOCUMENT

### EC-7: O budget de 2h/peer não é executável por nenhum mecanismo

- **Accepted risk:** O halt-loop não mede tempo de parede; o stop condition real é "três leituras
  sem novo sinal" (ADR D1). O budget em horas é intenção de escopo, não limite aplicado. Aceito
  porque o stop condition por sinal é o que efetivamente encerra a questão — mas registrado para
  que ninguém leia "2h" como garantia.

## Summary

| Question | Edges found | MUST FIX | SHOULD TEST | DOCUMENT |
|----------|-------------|----------|-------------|----------|
| Q1 | 1 | 1 | 0 | 0 |
| Q2 | 2 | 0 | 2 | 0 |
| Q3 | 2 | 2 | 0 | 0 |
| Q4 | 1 | 1 | 0 | 0 |
| Q5 | 1 | 1 | 0 | 0 |
| Q6 | 1 | 0 | 1 | 0 |
| Q7 | 1 | 0 | 1 | 0 |
| (plano) | 1 | 0 | 0 | 1 |

*(EC-1 afeta Q1, Q3 e Q5 simultaneamente; EC-4 afeta Q2, Q6 e Q7.)*

**Verdict:** DISCOVERY PLAN NEEDS ADJUSTMENT — três MUST FIX, todos com correção de uma linha.
O mais relevante (EC-1) não é especulativo: o bloqueio já ocorreu duas vezes durante a
elaboração deste mesmo plano.
