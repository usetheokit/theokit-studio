---
slug: docs-dead-surface-reconciliation
milestone_id: M7
owner: paulohenriquevn
created_at: 2026-08-04
version: 1.0
status: complete
source_plan: knowledge-base/discoveries/plans/docs-dead-surface-reconciliation-plan.md
---

# Blueprint: Documentação de escopo e remoção honesta de superfície (M7)

Investigação sobre como dois dev tools do mesmo nicho (genkit, mastra) documentam o escopo que
entregam, comunicam remoção de superfície, e tratam configuração que perdeu efeito. Todas as
citações abaixo apontam para arquivos da zona de referência, com número de linha, verificados em
disco durante a execução.

## Context

O commit `74a96c6` reduziu o Studio a uma superfície única (Agent Builder) removendo 20 telas e
7.224 linhas. A documentação não acompanhou. A auditoria de 2026-08-04
(`knowledge-base/audits/studio-code-review-2026-08-04/`) registrou oito findings de completude
decorrentes disso: README vendendo cinco telas inexistentes (#1), DoD de M1/M2/M3 hoje
insatisfazível (#12), `scenario:"offline"` aceito e ignorado (#2), quatro contadores em
`CounterName` que nunca são emitidos (#3), `reload()` morto (#4), um warrant de lint falso em
`use-listing.ts:20` (#7) e endpoints sem consumidor (#8).

O blueprint anterior deste projeto (`plugin-hardening-blueprint.md`) cobriu a fronteira HTTP e não
diz nada sobre documentação nem sobre remoção de superfície. A pergunta do M7 é de outra natureza:
não "como o servidor não deve cair", mas "como uma ferramenta de dev documenta o escopo que
realmente entrega, e como remove superfície sem enganar quem lia a versão anterior".

Regras do projeto que qualquer padrão importado precisa respeitar: `rules/public-copy.md`
(honestidade de copy), `rules/parsimony-ladder.md` (rung 1 — código que não precisa existir não
deve existir), `rules/error-handling.md` § 2 (entrada aceita e ignorada é falha silenciosa),
`rules/reference-provenance.md` § 3 (nada da zona é copiado).

## Objective

Estabelecer, com precedente citável, as decisões de documentação e de remoção que o M7 vai
implementar: forma do README, tratamento do parâmetro inerte, tratamento da superfície morta,
reconciliação dos DoD antigos, e se cabe ou não um gate automatizado de documentação.

## Sumário executivo

Três resultados mudam o desenho do M7:

1. **Não existe teste de documentação em nenhum dos dois peers.** A indústria não resolve o
   problema verificando o README contra o código — o mastra resolve **gerando** a parte que
   deriva (o mapa de exports), e mantendo à mão só a parte que não deriva (prosa de intenção).
2. **Os dois peers escolheram estratégias opostas de README**, e ambas são internamente
   consistentes. A escolha não é de estilo: é sobre onde mora a fonte única da verdade.
3. **Depreciação em TypeScript é feita no tipo, não no runtime.** O genkit marca campos mortos
   com `/** @deprecated */` e os deixa na interface; não encontrei nenhum aviso em runtime.

## Coverage Corner 1 — Integration Tests

**Q4: Como testam/verificam que a documentação não mente sobre a superfície pública?**
Status: `done`. Resposta: **nenhum dos dois testa.** E isso é o achado, não uma lacuna da
investigação.

- `knowledge-base/references/genkit/js/core/tests/` tem 13 arquivos de teste (`action_test.ts`,
  `config_test.ts`, `reflection_test.ts`, `registry_test.ts`, …). Um grep por `README` e
  `package.json` no diretório inteiro não retorna nada. Nenhum teste toca documentação.
- `knowledge-base/references/mastra/packages/deployer/vitest.config.ts` não tem nenhum gancho de
  docs; `test = vitest run` (`package.json:scripts`) roda só a suíte de código.

O que o mastra faz em vez disso é o padrão que importa:

```
"prepack": "tsx ../../scripts/generate-package-docs.ts"
```
(`knowledge-base/references/mastra/packages/deployer/package.json`, seção `scripts`)

O script tem 383 linhas e faz o caminho inverso do teste: **lê os exports reais** e escreve a
documentação derivada.

- `scripts/generate-package-docs.ts:93-117` — `parseIndexExports` monta um `Map` de nome de
  export → chunk de origem, percorrendo o `index` construído.
- `:180-220` — preenche `sourceMap.exports[name]` a partir do que encontrou, inclusive um segundo
  passe pelo `index.js` raiz para exports que o primeiro passe não pegou.
- `:357` — grava `assets/SOURCE_MAP.json`.
- `:364` — grava `SKILL.md`.

O gancho é `prepack`, ou seja: **roda no momento do publish**. A doc derivada não pode divergir
porque é reconstruída a cada empacotamento.

**Técnica extraída:** documentação que pode derivar do código deve ser *gerada*, não *verificada*.
Um teste que compara README com código falha depois que a divergência já existe; a geração torna a
divergência impossível de nascer. Verificação por teste só se justifica para a prosa que **não**
deriva — e para essa, o teste não tem oráculo.

## Coverage Corner 2 — Dependencies

**Q5: O que cada `package.json` declara como superfície pública, e isso bate com o README?**
Status: `done`. Resposta: **nos dois casos o README documenta MENOS que o `package.json` declara** —
mas por razões opostas.

| | mastra `packages/deployer` | genkit `js/core` |
|---|---|---|
| `files` | `["dist", "CHANGELOG.md"]` (`package.json:6-9`) | ausente |
| `main` / `types` | `dist/index.js` / `dist/index.d.ts` (`:10-11`) | `lib/index.d.ts` (`:65`) |
| subpaths em `exports` | 3 — `.`, `./server`, `./services` (`:12-39`) | 7 — `.`, `./async`, `./registry`, `./tracing`, `./logging`, `./schema`, `./node` (`:66-104`) |
| subpaths documentados no README | 0 (o README só mostra o import raiz, `README.md:23`) | 0 (o README não documenta nada) |
| `private` | não declarado (é publicado) | não declarado (é publicado) |

Dois sinais:

1. **`CHANGELOG.md` está dentro de `files` no mastra.** O changelog não é artefato de
   desenvolvimento — é entregue dentro do tarball, ao lado do `dist`. Quem instala o pacote recebe
   o histórico de mudanças. Isso eleva o changelog de "disciplina interna" a **parte do produto**.
2. A divergência README-vs-`exports` do mastra é real: `./server` e `./services` são superfície
   pública sem uma linha de documentação, enquanto o README descreve em detalhe quatro métodos
   (`install()`, `writePackageJson()`, `getMastra()`, `getMastraPath()` — `README.md:117-133`) da
   entrada raiz. Um README extenso não impede o subdocumentar; ele só desloca onde a lacuna cai.

## Coverage Corner 3 — Tools

**Q6: Que ferramenta usam para publicar/versionar, e isso impõe disciplina sobre o CHANGELOG?**
Status: `done`. Resposta: **changesets, com um contrato de escrita explícito** — o mais próximo de
uma Rule 6 mecanizada que encontrei.

O contrato vive em `knowledge-base/references/mastra/.mastracode/commands/changeset.md` e é
prescritivo o bastante para ser lido como norma, não como sugestão:

- Uma invocação de CLI **por pacote**, com o tipo de bump explícito (`--major` / `--minor` /
  `--patch`). O arquivo é separado por pacote de propósito — para o changelog gerado ficar correto
  por pacote.
- Público-alvo declarado: **desenvolvedores**. Frases curtas. Verbos de ação nomeados um a um:
  Added, Fixed, Improved, Deprecated, Removed.
- Proibições nomeadas: mensagens de commit como entrada, jargão, e frases genéricas — "Update
  code", "Miscellaneous improvements", "Bug fixes".
- Exigência de resultado: descreva **o que muda para quem consome**, não o detalhe interno.
- Mudança breaking ou feature nova **exige exemplo de código** com a API pública antes/depois — e
  proíbe explicitamente exemplo de implementação interna.
- Anti-pattern nomeado: um changeset abrangendo muitos pacotes numa entrada só.

Note a sobreposição quase termo a termo com a Unbreakable Rule 6 deste projeto (Keep a Changelog,
categorias fixas, escrever para o consumidor, uma linha por mudança). A diferença é que ali o
contrato está **acoplado à ferramenta que corta a release**, não só a um documento de regras.

## Coverage Corner 4 — Techniques

### Q1 — Como o README declara escopo (`done`)

Os dois peers escolheram estratégias opostas, e as duas são coerentes:

**mastra `packages/deployer/README.md` — README completo por pacote.** Índice de seções:
Installation (`:5`), Overview (`:11`), Usage (`:20`), Configuration (`:41`) com Required
Parameters (`:43`), Features (`:48`) subdividido em quatro (`:50`, `:56`, `:62`, `:70`, `:76`),
Project Structure (`:82`), Package.json Management (`:98`), Methods (`:117`) com uma subseção por
método, Error Handling (`:135`), Logging (`:144`), Related Packages (`:153`).

O escopo é declarado **positivamente e cedo**: `README.md:13-18` abre o Overview com "handles:" e
uma lista de quatro responsabilidades. Não há seção de não-objetivos; os limites aparecem por
omissão e, no fim, por vizinhança — `Related Packages` (`:153-159`) diz o que **os outros** pacotes
fazem, o que é a forma indireta de dizer o que este não faz.

**genkit `js/core/README.md` — sete linhas, nenhuma prosa de produto.** O arquivo inteiro:
título, um parágrafo dizendo que as fontes vivem no monorepo e que issues/PRs vão para lá
(`:3`), um link para a documentação oficial (`:5`), e a licença (`:7`).

A escolha do genkit não é preguiça: é **recusa deliberada de manter uma segunda fonte da verdade**.
Um README por pacote que descreve comportamento é exatamente o artefato que apodrece quando o
código muda — o genkit elimina a classe inteira de bug apontando para o único lugar que é mantido.

O custo é real e vale nomear: quem lê o pacote no npm não vê nada sobre o que ele faz.

### Q2 — Como comunicam remoção/depreciação (`done`)

O `CHANGELOG.md` do mastra deployer distingue explicitamente três estados no **mesmo** ciclo de
release, um por pacote (`CHANGELOG.md:709-713`):

- **Alias mantido**: em `@mastra/core`, o subpath legado "remains available and re-exports the
  deprecated aliases, so existing usage continues to work unchanged", com a frase de direção "New
  code should import from …". Nomeia o caminho antigo, o novo, e diz que nada quebra.
- **Removido do servidor**: em `@mastra/server`, as rotas legadas e as permissões "have been
  removed" — sem período de graça, porque a superfície é HTTP e o cliente é deles.
- **Removido com breaking declarado**: em `@mastra/client-js`, os métodos deprecados "have been
  removed", seguido da frase que não deixa o leitor concluir sozinho: "This is a breaking change
  for the recently released client."

Vocabulário observado: `Removed`, `deprecated aliases`, `remains available`, `no longer`,
`This is a breaking change`. Toda entrada de remoção que li carrega **link de PR** —
`:1037`, `:1201` usam a forma `([#17410](https://github.com/mastra-ai/mastra/pull/17410))`.

**Técnica extraída:** o período de depreciação não é uma política global — é decidido **por
superfície**. Tipo/import (barato manter alias) ganha alias; rota HTTP e método de client (caro
manter dois caminhos) é removido com o breaking dito em voz alta na mesma frase.

### Q3 — Config que perdeu efeito (`done`, com limite declarado)

`knowledge-base/references/genkit/js/core/src/config.ts` tem 75 linhas e expõe quatro símbolos —
`GenkitRuntimeConfig` (`:24`), `setGenkitRuntimeConfig` (`:49`), `getGenkitRuntimeConfig` (`:62`),
`resetGenkitRuntimeConfig` (`:73`). Um grep por `deprecated`, `ignored` e `no longer` no arquivo
**não retorna nada**: não há opção inerte ali. Ausência é resposta — o arquivo é pequeno o
bastante para não acumular campo morto.

O padrão de depreciação do genkit está no tipo, um nível acima:
`js/core/src/plugin.ts:43,45,47` marca três campos de `InitializedPlugin` — `flowStateStore`,
`traceStore`, `telemetry` — com `/** @deprecated */`, **mantendo-os na interface**. O mesmo
marcador aparece em `js/core/src/tracing/instrumentation.ts:59`.

O efeito é de compilação, não de execução: o IDE risca o campo e o `tsc` pode avisar, mas quem
passa o campo não recebe nenhum aviso em runtime. **Não encontrei em nenhum dos dois peers um
`console.warn` para opção depreciada.** Isso é honestamente um limite da investigação: o escopo
declarado no plano foi `js/core/src/config.ts`, não a árvore inteira; a afirmação vale para o que
foi lido.

## Cross-cutting Comparison

Onde os dois peers convergem e onde divergem — a divergência é o dado mais útil, porque mostra
quais escolhas são de contexto e quais são consenso.

| Dimensão | genkit `js/core` | mastra `packages/deployer` | Convergem? |
|---|---|---|---|
| README por pacote | 7 linhas: ponteiro para o monorepo + link para o site de docs + licença (`README.md:3,5,7`) | 23 seções, da instalação aos pacotes vizinhos (`README.md:1-159`) | **Divergem frontalmente** |
| Fonte única da verdade da prosa | site oficial, fora do repo | o próprio README do pacote | Divergem |
| Declaração de não-objetivos | ausente (o README não fala do produto) | ausente; limites só por vizinhança em `Related Packages` (`:153`) | **Convergem: ninguém declara não-objetivo explícito** |
| README cobre todos os subpaths de `exports`? | não — 0 de 7 (`package.json:66-104`) | não — 1 de 3 (`package.json:12-39`) | **Convergem no modo de falha** |
| Teste que valide doc vs código | nenhum (13 arquivos em `tests/`, nenhum toca doc) | nenhum (`vitest.config.ts` sem gancho de docs) | **Convergem** |
| Doc derivada gerada por ferramenta | não observado | sim — `prepack` → `generate-package-docs.ts:357,364` | Divergem |
| Marcador de depreciação | `/** @deprecated */` no tipo, campo mantido (`plugin.ts:43,45,47`) | prosa no CHANGELOG por pacote (`CHANGELOG.md:709-713`) | Divergem no veículo, convergem no princípio |
| Aviso de depreciação em runtime | não encontrado | não encontrado | **Convergem** |
| Período de graça antes da remoção | n/a no escopo lido | **decidido por superfície**: alias mantido em `core`, removido em `server` e `client-js` no mesmo release (`:709`, `:711`, `:713`) | — |
| CHANGELOG entregue ao consumidor | não declarado (`files` ausente) | sim — `files: ["dist","CHANGELOG.md"]` (`package.json:6-9`) | Divergem |
| Disciplina de changelog acoplada à release | não observado no escopo lido | sim — changesets com contrato de escrita prescritivo (`.mastracode/commands/changeset.md`) | Divergem |

Leitura das três convergências, que são o sinal mais forte:

1. **Ninguém testa documentação.** Duas equipes grandes, mesmo nicho, mesma conclusão.
2. **Ninguém avisa em runtime sobre opção depreciada.** O aviso é de tipo ou de changelog.
3. **Os dois subdocumentam a superfície pública** — e o README extenso do mastra não protegeu
   contra isso. Tamanho de README não é a variável que controla a divergência.

## Recommendations

Prioridade por impacto no defeito que o M7 nomeia. Cada uma vira decisão formal em `## ADRs`.

| # | Recomendação | Precedente | Vira |
|---|---|---|---|
| R1 | README declara a superfície única atual e diz explicitamente que as telas removidas não existem, em vez de só apagar as menções | `CHANGELOG.md:713` — remoção é dita, não escondida | D1 |
| R2 | Remover `scenario:"offline"` da superfície em vez de mantê-lo com aviso | ausência de aviso de runtime nos dois peers + o critério por-superfície do mastra (`:711`) | D2 |
| R3 | Cortar `CounterName` ao que é emitido; remover `reload()`, `version` e o warrant falso | `rules/parsimony-ladder.md` rung 1; o que deriva, deriva (`generate-package-docs.ts:93-117`) | D3 |
| R4 | Reconciliar os DoD de M1/M2/M3 com nota datada, mantendo o texto original visível | `CHANGELOG.md:713`; auditabilidade do `[x]` (`rules/cycle-acceptance.md`) | D4 |
| R5 | Não criar teste de documentação neste milestone; registrar o limite honestamente | Corner 1 — nenhum dos dois peers tem um | D5 |
| R6 | Não adotar geração de docs derivadas agora | o alvo do M7 é prosa sem oráculo, não mapa de exports; YAGNI | D5 (rationale) |

## ADRs — o que isto decide no M7

### D1 — README: escopo positivo curto + limites explícitos (híbrido, não cópia)

**Decisão.** O README do Studio declara o que a ferramenta entrega hoje — a superfície única do
Agent Builder — e declara explicitamente que as telas removidas em `74a96c6` **não existem**, em
vez de simplesmente apagar as menções.

**Alternativas rejeitadas.** (a) Estratégia genkit (README-ponteiro): rejeitada porque o Studio
**não tem** site de documentação para o qual apontar; o ponteiro apontaria para o vazio. (b)
Estratégia mastra pura (README extenso por feature): rejeitada porque o próprio mastra demonstra o
modo de falha — `./server` e `./services` são superfície pública sem documentação, e um README
extenso não impediu isso; para uma ferramenta com uma superfície só, o custo de manutenção não se
paga.

**Por que a menção explícita à remoção, e não o silêncio.** É o precedente do
`CHANGELOG.md:713` do mastra: quando algo sai, alguém já dependia. Apagar a linha do README deixa
quem leu a versão anterior sem resposta; dizer "isto foi removido em X" responde. Alinha com
`rules/public-copy.md` (honestidade) e fecha o finding #1 da auditoria.

### D2 — `scenario:"offline"`: remover o parâmetro, não avisar

**Decisão.** O parâmetro aceito-e-ignorado é **removido** da superfície, não mantido com aviso.

**Alternativas rejeitadas.** (a) Manter com `console.warn` em runtime: rejeitada — não encontrei
esse padrão em nenhum dos dois peers; o genkit deprecia **no tipo** (`plugin.ts:43-47`), sem custo
de runtime. (b) Manter silenciosamente: rejeitada por `rules/error-handling.md` § 2 — entrada
aceita e ignorada é falha silenciosa, a classe mais cara de bug.

**Por que remover em vez de marcar `@deprecated`.** O alias do genkit e o do mastra
(`CHANGELOG.md:709`) existem para proteger **consumidores publicados**. O `@theokit/studio` é
`private: true` e nunca foi publicado; não há consumidor externo a proteger. O critério observado
no mastra é justamente esse — decide-se por superfície: onde manter dois caminhos custa caro e não
há quem quebrar, remove-se (`:711`, `:713`). Aqui não há nenhum dos dois custos.

### D3 — Contadores e `reload()`: cortar pela raiz (rung 1 da parsimony ladder)

**Decisão.** `CounterName` passa a listar apenas contadores realmente emitidos; `reload()`,
`version` e o warrant de lint falso em `use-listing.ts:20` são removidos.

**Rationale.** `rules/parsimony-ladder.md` rung 1 — código que não precisa existir não deve
existir. O precedente do mastra reforça: o que é **derivável** deve ser derivado
(`generate-package-docs.ts:93-117`), e um enum de contadores que não corresponde ao que o código
emite é exatamente uma doc hand-written de algo derivável. Alternativa rejeitada: gerar
`CounterName` a partir das chamadas de emissão — rejeitada por YAGNI, são quatro nomes num arquivo;
a geração custa mais que o corte.

### D4 — DoD de M1/M2/M3: reconciliar no ROADMAP, não reescrever a história

**Decisão.** Os bullets de DoD insatisfazíveis são reescritos com uma nota datada de que a
superfície foi removida em `74a96c6`, mantendo o texto original visível.

**Alternativa rejeitada.** Apagar os bullets: rejeitada pelo mesmo princípio do
`CHANGELOG.md:713` — a remoção é comunicada, não escondida. Um DoD que muda sem deixar rastro
torna o `[x]` do milestone não auditável, que é o que `cycle-acceptance` existe para impedir.

### D5 — Nenhum teste de documentação neste milestone

**Decisão.** O M7 **não** cria um teste que compare README com código.

**Rationale.** Nenhum dos dois peers tem um (Corner 1), e a razão é estrutural: prosa de intenção
não tem oráculo mecanizável. O caminho que o mastra provou — gerar o que deriva
(`generate-package-docs.ts:357,364`) — não se aplica ao problema do M7, que é prosa sobre telas
inexistentes, não um mapa de exports. Alternativa rejeitada: escrever um teste de grep que falhe
se o README citar um caminho de rota inexistente — rejeitada por ser um oráculo frágil (falha em
qualquer menção legítima em prosa histórica) e por não cobrir o defeito real, que é semântico.

Registrado honestamente como limite: depois deste milestone, a única coisa impedindo o README de
divergir de novo é disciplina de review, não um gate.

## Referências verificadas

| Caminho | Usado em |
|---|---|
| `knowledge-base/references/mastra/packages/deployer/README.md` | Q1, ADR-1 |
| `knowledge-base/references/mastra/packages/deployer/CHANGELOG.md` | Q2, ADR-1, ADR-2, ADR-4 |
| `knowledge-base/references/mastra/packages/deployer/package.json` | Q4, Q5, Q6 |
| `knowledge-base/references/mastra/packages/deployer/vitest.config.ts` | Q4 |
| `knowledge-base/references/mastra/scripts/generate-package-docs.ts` | Q4, ADR-3, ADR-5 |
| `knowledge-base/references/mastra/.mastracode/commands/changeset.md` | Q6 |
| `knowledge-base/references/genkit/js/core/README.md` | Q1, ADR-1 |
| `knowledge-base/references/genkit/js/core/package.json` | Q5 |
| `knowledge-base/references/genkit/js/core/src/config.ts` | Q3 |
| `knowledge-base/references/genkit/js/core/src/plugin.ts` | Q3, ADR-2 |
| `knowledge-base/references/genkit/js/core/src/tracing/instrumentation.ts` | Q3 |
| `knowledge-base/references/genkit/js/core/tests/` | Q4 |

Nenhuma linha de prosa dos peers foi copiada para este documento
(`rules/reference-provenance.md` § 3); as técnicas estão descritas com palavras próprias e as
citações são localizadoras, não transcrições.

## Limites desta investigação

- **Sem consulta web.** `rules/discover-web-allowlist.txt` está vazio; nenhum guia de estilo
  externo ou spec de depreciação foi consultado. Tudo acima é convenção praticada observada em
  código, não norma publicada.
- **Escopo por arquivo, não por repositório.** Q3 leu `js/core/src/config.ts` e um grep dirigido
  por `@deprecated` no `js/core/src/`; a afirmação "não há aviso de runtime" vale para essa
  superfície, não para os monorepos inteiros.
- **Dois peers, não uma amostra.** Genkit e mastra divergem radicalmente no Q1. Duas observações
  contraditórias mostram que existe escolha, não qual é a certa; a decisão do ADR-1 é do projeto,
  justificada pelo contexto local (ausência de site de docs), não herdada por autoridade.
