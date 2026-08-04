---
slug: test-quality-maintainability
milestone_id: M8
owner: paulohenriquevn
created_at: 2026-08-04
version: 1.0
status: complete
source_plan: knowledge-base/discoveries/plans/test-quality-maintainability-plan.md
---

# Blueprint: Poder discriminante de teste e densidade de decisão (M8)

Investigação sobre como dois dev tools do mesmo nicho verificam que a suíte detecta defeito,
onde impõem limites de complexidade, e como escrevem um decorador sobre uma interface. Todas as
citações apontam para arquivos da zona, com número de linha, verificados em disco.

## Context

A auditoria de 2026-08-04 encontrou um teste que **não pode falhar pelo motivo que o nome afirma**:
o avaliador inverteu o ternário de `src/main.tsx:20` e a suíte seguiu verde. Junto vieram guards
HTTP descobertos (405, 403), duas funções acima do limite de complexidade (`handleAgentRun` CC=18,
`SessionView` CC=16), uma delegação por spread que só falha em runtime, dois testes
multi-comportamento e 32 findings `low` sem triagem (`findings.db`: 8 high, 24 medium, 32 low,
17 info).

O M7 acabou de dar a mesma lição na prática: dois mutantes sobreviveram à suíte inteira e só
foram achados porque a review os procurou à mão. **Suíte verde não é evidência de suíte forte.**

## Objective

Estabelecer, com precedente citável, as decisões do M8: como provar poder discriminante, que
limites de complexidade impor (se algum), e como reescrever a delegação do decorador.

## Sumário executivo

Três resultados, e os dois primeiros são desconfortáveis:

1. **Nenhum dos dois peers roda mutation testing.** Nem `stryker`, nem qualquer ferramenta de
   mutação, nem sequer um piso de cobertura no config raiz.
2. **Nenhum dos dois enforça limite numérico de complexidade.** A config de lint compartilhada do
   mastra tem 324 linhas e **zero** regras `complexity` / `max-lines` / `max-depth` / `max-params`.
3. O que eles enforçam no lugar é **fronteira e idioma**, não número — e isso é uma escolha
   coerente, não uma omissão.

## Coverage Corner 1 — Integration Tests

### Q1 — Como verificam que a suíte detecta defeito? (`done`)

**Resposta: não verificam. Nenhum dos dois tem mutation testing.**

```
$ grep -rn "stryker|mutation|mutate" \
    references/mastra/packages/_test-utils/package.json \
    references/genkit/js/core/package.json \
    references/mastra/vitest.config.ts
(sem resultado)
```

Mais: `references/mastra/vitest.config.ts` (107 linhas) **não declara cobertura nem threshold**.
O arquivo inteiro é descoberta de projetos — `PROJECT_GLOBS` (`:18-31`), `discoverProjects()`
(`:37-100`), e um `defineConfig` que só expõe `projects` (`:102-106`). Não há
`coverage: { thresholds: … }` em lugar nenhum.

O proxy que usam é **idioma de teste enforçado por lint**, não força medida. Em
`references/mastra/packages/_config/src/eslint.js:288-297`, quando o pacote usa Testing Library:

- `testing-library/no-unnecessary-act` — proíbe `act()` supérfluo;
- `testing-library/no-wait-for-side-effects` — proíbe efeito colateral dentro de `waitFor`;
- `testing-library/prefer-find-by` — obriga `findBy*` em vez de `waitFor` + `getBy*`.

E em `:270-286`, uma regra de fronteira: **arquivo de produção não pode importar arquivo de
teste** (`no-restricted-imports` com `group: testFiles`, mensagem "Do not import test files in
source files").

**Técnica extraída, e ela é uma advertência.** A indústria do nicho aceita "a suíte passa + o lint
proíbe os idiomas que produzem teste fraco" como proxy de qualidade. Isso **não** teria pego o
defeito que abriu o M8: um teste com `getBy` correto, `act` correto e nenhum import proibido pode
ainda assim não falhar quando a lógica é invertida. O precedente aqui é útil para o que adotar de
graça (as três regras de idioma), e é **explicitamente insuficiente** para o problema central do
milestone. A prova de mutação, no M8, terá de ser nossa — feita à mão e registrada, como o M6 e o
M7 já fizeram.

### Q4 — Como testam ramos de erro de fronteira HTTP? (`done`)

Em `references/genkit/js/core/tests/reflection_test.ts` o padrão é direto e barato:

- `:54-70` — um helper local promisifica a requisição e devolve `{ status, body }`. Não há
  framework de HTTP-testing; é `node:http` cru embrulhado numa Promise.
- `:79-82` — `it('rejects missing type parameter for /api/values')` →
  `assert.strictEqual(res.status, 400)`.
- `:85-88` — `it('rejects unsupported type parameter for /api/values')` → também `400`.
- `:94`, `:109`, `:169` — casos felizes asseveram `200`.
- `:159` — um corpo de erro é asseverado por campo: `status: 'NOT_FOUND'`.

**Técnica extraída:** um caso de teste **por causa**, não por status. Dois testes distintos
devolvem `400` — "parâmetro ausente" e "parâmetro não suportado" — e são separados porque a causa
é diferente. É exatamente o oposto do que a auditoria criticou no nosso `code` de 400, que colapsa
quatro causas num identificador só. E o corpo é asseverado, não apenas o status.

## Coverage Corner 2 — Dependencies

### Q6 — Existe infra dedicada a apoio de teste? (`done`)

Sim, no mastra: `packages/_test-utils`, declarado como
`"@internal/test-utils"`, `"private": true`, com a descrição
"Mastra-specific test helpers - version-agnostic agent wrappers, dummy API keys"
(`package.json:2-4`).

O que ele carrega (`src/`): `llm-helpers.ts`, `llm-mock.ts`, `setup.ts`, `index.ts` — e,
notavelmente, **`llm-helpers.test.ts` e `llm-mock.test.ts`**. O pacote de apoio a teste tem testes
próprios.

Dois sinais de desenho:

- Ele expõe dois subpaths (`.` e `./setup`, `package.json:14-31`), separando helpers de
  bootstrap de suíte.
- Depende de `@internal/llm-recorder` (`:47`) — ou seja, o que foi extraído para um pacote é
  precisamente o que é **caro e compartilhado**: gravação/mock de LLM e chaves falsas. Não
  builders genéricos, não asserções utilitárias.

**Técnica extraída:** extrair para um pacote de apoio só o que é caro de montar e usado por vários
pacotes. Para um monorepo de um pacote só — o nosso — o critério não é atingido; helpers ficam ao
lado do teste que os usa.

## Coverage Corner 3 — Tools

### Q2 — Que limites de complexidade são enforçados, e com que números? (`done`)

**Nenhum.** `references/mastra/packages/_config/src/eslint.js` tem 324 linhas e um grep por
`complexity`, `max-lines`, `max-depth`, `max-params`, `max-statements` retorna **zero
ocorrências**. As únicas regras `no-restricted-*` são:

- `:57` — `'no-restricted-globals': ['error', 'global']` (proíbe o global do Node);
- `:274-285` — `no-restricted-imports` barrando import de arquivo de teste em produção;
- `:317` — a mesma regra de globals desligada num escopo específico.

O consumo por pacote é fino: `references/mastra/packages/core/eslint.config.js:1-11` importa
`createConfig` de `@internal/lint/eslint`, espalha o resultado e só acrescenta `ignores`. Ou seja,
os limites são **centrais e uniformes** — e não incluem número nenhum.

**Técnica extraída, com honestidade sobre o limite dela.** Dois projetos grandes do nicho decidiram
que complexidade ciclomática não vale uma regra de lint. Isso é evidência contra transformar
CC<15 num gate automático; **não** é evidência de que `handleAgentRun` com CC=18 esteja bem. A
diferença entre "não medimos" e "medimos e está aceitável" continua sendo nossa para resolver.

## Coverage Corner 4 — Techniques

### Q3 — Decorador sobre interface: spread ou delegação explícita? (`done`)

**Delegação explícita, método a método, ao longo de uma cadeia de `parent`.**

`references/genkit/js/core/src/registry.ts`:

- `:165` — `readonly parent?: Registry;`
- `:169-173` — o construtor recebe o parent e copia explicitamente o que herda
  (`apiStability`, `dotprompt`), campo a campo.
- `:195-196` — `static withParent(parent: Registry)` é a fábrica nomeada do decorador.
- `:258` — `lookupAction`: tenta o próprio mapa, `|| this.parent?.lookupAction(key)`.
- `:470` — `lookupPlugin`: `this.pluginsByName[name] || this.parent?.lookupPlugin(name)`.
- `:570` — `lookupSchema`: mesma forma.
- `:552` — `lookupValue`: mesma forma.
- `:351`, `:411`, `:559` — as operações de *lista* espalham o resultado do parent **dentro do
  valor de retorno** (`...(await this.parent?.listActions())`), o que é diferente de espalhar o
  objeto-fallback inteiro: aqui o spread compõe dados, não implementação.

Nenhum método é herdado por `{...fallback}`. Cada um é escrito, e o compilador cobra: se a
interface ganhar um método novo e a subclasse não o delegar, o erro é de compilação, não de
runtime.

**Técnica extraída:** delegação explícita torna visível em tempo de compilação exatamente o que o
spread esconde até o runtime. O custo é boilerplate proporcional ao tamanho da interface — que no
nosso caso é de 5 métodos.

### Q5 — Um teste cobre um comportamento ou vários? (`done`)

Um. `references/genkit/js/core/tests/action_test.ts` tem 14 `it()` sob um único
`describe('action')` (`:34`), e os nomes descrevem **um** comportamento cada:

- `:41` `'applies middleware'`
- `:203` `'cancels the underlying stream when the consumer stops reading early'`
- `:305` `'passes through the abort signal'`
- `:322` `'passes through the abort signal with middleware'`
- `:364` `'records init in telemetry'`
- `:387` `'does not record init in telemetry when not provided'`

Três pares merecem nota: `:305`/`:322` separam o mesmo comportamento em dois contextos em vez de
somar asserções num teste só; `:364`/`:387` são o par positivo/negativo do **mesmo** comportamento,
escritos como dois testes. Nenhum nome usa "e".

**Técnica extraída:** quando um comportamento tem duas condições, viram dois testes com nomes que
diferem exatamente na condição — não um teste com dois blocos de asserção.

## ADRs — o que isto decide no M8

### D1 — Prova de mutação é manual e registrada; não adotamos ferramenta

**Decisão.** O M8 prova poder discriminante aplicando o mutante à mão, rodando a suíte, revertendo,
e registrando o par (mutação → resultado) no log do milestone. Não introduzimos `stryker`.

**Alternativas rejeitadas.** (a) Adotar Stryker: rejeitada por Q1 — nenhum dos dois peers o usa, o
custo de tempo de execução numa suíte com jsdom é alto, e a decisão de adotá-lo é maior que este
milestone. (b) Confiar no piso de cobertura: rejeitada porque o defeito que abriu o M8 estava numa
linha **coberta** — cobertura mede execução, não detecção.

**Honestidade sobre o limite.** Prova manual não escala e não roda em CI. É a escolha certa para
os 4 pontos nomeados no DoD, e é dívida se o número crescer. Registrado como tal.

### D2 — Nenhuma regra de lint de complexidade; o limite vira ADR por função

**Decisão.** Não adicionamos regra `complexity` ao Biome. `handleAgentRun` e `SessionView` são
tratados individualmente: ou a densidade cai por extração com razão de negócio, ou fica com um ADR
nomeando por que aquela função concentra decisão.

**Rationale.** Q2: dois projetos grandes do nicho decidiram que o número não vale uma regra. Um
gate numérico global convida ao pior desfecho — extrair função só para baixar contador, que é
`rules/parsimony-ladder.md` rung 1 falhando ao contrário (criar código que não precisa existir).

**Alternativa rejeitada.** Ligar `complexity` no Biome com teto 15: rejeitada porque o teto vira
lei sobre código que ninguém revisou, e a auditoria mediu **duas** funções acima — amostra pequena
demais para justificar regra global.

### D3 — `{...opts.fallback}` vira delegação explícita, método a método

**Decisão.** `createReflectionDataSource` passa a delegar os cinco métodos do `StudioDataSource`
explicitamente ao fallback, no lugar do spread.

**Rationale.** Precedente direto em `registry.ts:258,470,552,570` — o genkit escreve cada
delegação e nunca espalha o objeto-pai. O ganho é exatamente o que o finding pede: um método novo
na interface passa a quebrar a compilação em vez de silenciosamente cair no fixture. O invariante
que hoje está num comentário no nosso código (o spread só é correto porque o fallback é objeto de
closures stateless) deixa de precisar existir.

**Alternativa rejeitada.** Manter o spread com um teste que assevera a presença dos 5 métodos:
rejeitada — o teste morre no dia em que a interface crescer, que é justamente quando a proteção
seria necessária. Tipo é melhor oráculo que teste, quando o tipo dá conta.

### D4 — Um caso de teste por causa, não por status

**Decisão.** Os guards descobertos (405, 403, os dois caminhos de erro de escrita do builder)
ganham **um teste por causa**, com asserção de status **e** de corpo.

**Rationale.** `reflection_test.ts:79-88` — o genkit tem dois testes distintos que devolvem `400`,
separados porque a causa difere, e assevera o corpo por campo (`:159`). Isso também prepara o
terreno para o finding MEDIUM aberto do M6 (o nosso `code` de 400 colapsa quatro causas).

### D5 — Adotar as três regras de idioma de teste, se o Biome as tiver

**Decisão.** Verificar se o Biome oferece equivalente a `no-unnecessary-act`,
`no-wait-for-side-effects` e `prefer-find-by`; se oferecer, ligar. Se não, registrar a ausência.

**Rationale.** Q1 — é o único mecanismo *automático* de qualidade de teste que os dois peers têm, e
custa uma linha de config. A review do M7 flagrou um `act()` warning num teste meu (F-tests-7):
a regra teria pego.

**Escopo honesto:** isto é adoção oportunista dentro do milestone, não um item do DoD. Se o Biome
não tiver as regras, a decisão é não introduzir ESLint só para isso.

### D6 — Nenhum pacote de apoio a teste

**Decisão.** Helpers de teste ficam ao lado do teste que os usa.

**Rationale.** Q6 — o mastra extraiu para `_test-utils` o que é caro e compartilhado entre muitos
pacotes (gravação de LLM, chaves falsas). O nosso monorepo tem **um** pacote publicável; o critério
não é atingido. YAGNI.

## Referências verificadas

| Caminho | Usado em |
|---|---|
| `knowledge-base/references/mastra/vitest.config.ts` | Q1, D1 |
| `knowledge-base/references/mastra/packages/_config/src/eslint.js` | Q1, Q2, D2, D5 |
| `knowledge-base/references/mastra/packages/core/eslint.config.js` | Q2 |
| `knowledge-base/references/mastra/packages/_test-utils/package.json` | Q6, D6 |
| `knowledge-base/references/genkit/js/core/tests/reflection_test.ts` | Q4, D4 |
| `knowledge-base/references/genkit/js/core/tests/action_test.ts` | Q5 |
| `knowledge-base/references/genkit/js/core/src/registry.ts` | Q3, D3 |
| `knowledge-base/references/genkit/js/core/package.json` | Q1 |

Nenhuma linha de config ou de teste dos peers foi copiada
(`rules/reference-provenance.md` § 3).

## Cross-cutting Comparison

| Dimensão | genkit `js/core` | mastra | Convergem? |
|---|---|---|---|
| Mutation testing | ausente | ausente | **Convergem: ninguém tem** |
| Piso de cobertura no config raiz | não observado | ausente (`vitest.config.ts` só descobre projetos) | **Convergem** |
| Regra de lint de complexidade | não observada | **ausente** em 324 linhas de config | **Convergem** |
| O que o lint enforça | — | fronteira (import de teste em produção) + idioma de Testing Library | — |
| Teste de ramo de erro HTTP | um por causa, status + corpo (`:79-88`, `:159`) | — | — |
| Granularidade de teste | um comportamento por `it`, par positivo/negativo separado | — | — |
| Decorador sobre interface | delegação explícita via `parent` (`:258,470,552,570`) | — | — |
| Pacote de apoio a teste | não observado | `@internal/test-utils`, privado, com testes próprios | Divergem |

A convergência nas três primeiras linhas é o achado mais forte — e o mais incômodo. Dois projetos
grandes, mesmo nicho, mesma conclusão: **não medem força de teste nem densidade de decisão por
ferramenta.** O M8 não pode importar uma prática que não existe; tem de escolher conscientemente
fazer mais que o peer, e assumir o custo.

## Recommendations

| # | Recomendação | Precedente | Vira |
|---|---|---|---|
| R1 | Prova de mutação manual e registrada, sem adotar ferramenta | Q1 — nenhum peer usa | D1 |
| R2 | Sem regra de lint de complexidade; ADR por função | Q2 — 324 linhas sem uma regra numérica | D2 |
| R3 | Delegação explícita no lugar do spread | `registry.ts:258,470,552,570` | D3 |
| R4 | Um teste por causa, com status **e** corpo | `reflection_test.ts:79-88,159` | D4 |
| R5 | Ligar as regras de idioma de teste se o Biome as tiver | `eslint.js:288-297` | D5 |
| R6 | Nenhum pacote de apoio a teste | Q6 — critério do mastra não é atingido | D6 |

## Limites desta investigação

- **Sem consulta web.** `rules/discover-web-allowlist.txt` vazio. Nada de literatura sobre mutation
  testing ou sobre limiares de complexidade — só prática observada em código. Isso importa aqui
  mais que no M7: a ausência de mutation testing nos peers **não** prova que a prática não vale,
  só que estes dois não a adotaram.
- **Escopo por arquivo.** Q1 varreu três arquivos de config, não os monorepos inteiros; um
  `stryker.conf` num pacote não visitado passaria despercebido. A afirmação vale para a superfície
  lida.
- **Assimetria de amostra.** Q3, Q4 e Q5 têm apenas o genkit; Q2 e Q6 apenas o mastra. Cada
  técnica é um ponto, não uma tendência.
