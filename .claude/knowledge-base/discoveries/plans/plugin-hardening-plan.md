---
slug: plugin-hardening
milestone_id: M6
owner: paulohenriquevn
created_at: 2026-08-04
version: 1.1
status: ready-for-execute
edge_cases_absorbed: knowledge-base/reviews/plugin-hardening-discover-edge-cases-2026-08-04.md
---

# Discovery Plan: Fronteira HTTP de dev servers embarcados (M6)

## Context

A auditoria `loop-code-review` de 2026-08-04 (`knowledge-base/audits/studio-code-review-2026-08-04/final_report.md`)
encontrou 81 findings em `packages/studio`. O M6 ataca os que vivem na fronteira HTTP do
plugin — inclusive uma cadeia que **derruba o dev server do usuário**: o guard de
`plugin/http.ts:13` verifica `writableEnded || destroyed` mas omite `res.headersSent`, e
`plugin/static-serve.ts:154` compromete o head 200 antes da leitura que pode lançar.

O blueprint anterior (`knowledge-base/discoveries/blueprints/m1-studio-table-stakes-blueprint.md`)
já documentou a **arquitetura** do plugin: enumeração do registry vivo (§ Coverage Corner 4),
endpoints e transporte (§ "Endpoints e transporte do protocolo"), ponto de integração no
`theokit dev` (ADR D1) e contrato de streaming (ADR D4). Esta discovery **não re-documenta
nada disso**. O que ele NÃO cobriu, e que o M6 precisa: semântica de resposta já
comprometida, tipagem do envelope de erro do lado do cliente, comportamento de um namespace
de API reservado-mas-não-implementado, e isolamento de falha ao carregar módulo do usuário.

Rules citadas que qualquer padrão importado precisa respeitar:
`rules/error-handling.md` § 2 (nunca engolir; erro tipado; validar na fronteira),
`rules/architecture.md` § 1 (camadas: o plugin é interface, não domínio),
`rules/testing.md` § 4.1 (casos negativos provam o tratamento de erro, não só edge cases).

## Objective

Produzir um blueprint que responda **como dois dev servers embarcados de referência
(genkit, mastra) protegem a fronteira HTTP** — o suficiente para o M6 corrigir sua própria
fronteira sem inventar convenção nem copiar código.

**Critérios de sucesso mensuráveis do blueprint resultante:**

1. Cada uma das 7 research questions respondida com citação `file:line` verificável na zona.
2. Pelo menos uma decisão do M6 (guard, envelope, namespace reservado) com precedente
   documentado em AMBOS os peers, ou com divergência entre eles explicitada.
3. Zero recomendação sem contrapartida: cada padrão importado vem com o custo que ele traz.

## In-Scope / Out-of-Scope

### In-Scope (per reference project)

**genkit** (`knowledge-base/references/genkit/`) — budget 2h:
- `js/core/src/reflection.ts` — servidor de reflection sobre express
- `js/core/src/error.ts`, `js/core/src/statusTypes.ts` — taxonomia de erro
- `js/core/src/action.ts` — `StatusCodes` / `statusNameToCode` consumidos pelo reflection
- `js/core/package.json` — dependências da camada HTTP

**mastra** (`knowledge-base/references/mastra/`) — budget 2h:
- `packages/server/src/server/http-exception.ts` — exceção HTTP tipada
- `packages/server/src/server/handlers/`, `packages/server/src/server/utils.ts`
- `packages/deployer/src/server/index.ts` — montagem do servidor e rotas
- `packages/deployer/src/server/__tests__/on-error-hook.test.ts` — hook de erro
- `packages/deployer/src/server/__tests__/option-studio-base.test.ts` — SPA sob base path
- `packages/server/package.json`, `packages/deployer/package.json`

### Out-of-Scope (explicit)

- **genkit** `go/`, `py/`, `samples/`, `docs/`, `genkit-tools/` — outras linguagens e a UI
  em si; o M6 é Node + fronteira HTTP.
- **mastra** `packages/agent-builder/`, `packages/playground*/`, `packages/rag/`,
  `packages/memory/`, `packages/evals/`, `packages/mcp*/`, `packages/cli/`, e todo diretório
  iniciado por `_` (internos/vendored) — nenhum toca a fronteira HTTP que o M6 corrige.
- **mastra** `packages/server/src/server/a2a/`, `auth/`, `fga-permissions.ts` — autenticação
  e multi-tenant estão fora do escopo do Studio por decisão de produto (`ROADMAP.md`
  § Explicitly out of scope).
- **Ambos**: `dist/`, `node_modules/`, lockfiles, CI de release.
- **Web**: `rules/discover-web-allowlist.txt` está vazio (todas as entradas comentadas), logo
  **nenhum WebFetch** ocorre nesta discovery. Limite declarado, não omitido — ver ADR D3.

## ADRs

### D1 — Time budget + stop conditions

2h por peer (4h total). Stop condition por questão: **três leituras de arquivo sem novo
sinal** encerram a questão com o que houver, marcando-a `partial` no blueprint. Nenhuma
questão pode consumir mais de 45min.

Razão: o M6 tem correção de ~10 minutos como núcleo. Uma discovery que custe mais que a
implementação inteira inverte a economia do ciclo — e a auditoria já forneceu o diagnóstico;
o que falta é precedente, não diagnóstico.

### D2 — Investigation depth: ler o caminho de erro, não o caminho feliz

Investigamos deliberadamente os caminhos de FALHA dos peers (handler que lança, rota
inexistente, módulo quebrado) e pulamos os caminhos felizes (request bem-sucedida), que o
blueprint do M1 já cobriu.

Razão: `rules/testing.md` § 4.1 — casos negativos são onde o tratamento de erro se prova, e
os cinco findings do M6 são todos de caminho negativo.

### D3 — Discovery local-only (sem WebFetch), declarada como limite

A allowlist web do projeto está vazia por padrão de segurança. Não a alteramos para esta
discovery.

Consequência aceita: não consultaremos a documentação oficial do Node sobre
`ERR_HTTP_HEADERS_SENT` nem RFCs. Mitigação: o comportamento do Node já foi **reproduzido
empiricamente duas vezes** na auditoria (revisor no v22.22.2 e o quality gate contra o
`serveStudio` real, exit code 1), então a questão factual sobre o runtime não depende de
fonte externa. O que buscamos nos peers é **convenção de projeto**, que é justamente o que
o código-fonte deles responde melhor que documentação.

### D5 — Todo acesso à zona é comando sem pipe e sem redirect (EC-1, MUST FIX absorvido)

O guard de export de `rules/reference-provenance.md` § 2 (layer 1, `hooks/validate-command.sh`)
bloqueia comandos que tocam a zona de referências contendo pipe ou redirect. **Observado duas
vezes durante a elaboração deste plano** (exit 2 em `ls ... 2>/dev/null` e em `find ... | wc -l`).

Consequência para os métodos: `grep -rn PADRÃO caminho/` puro, `ls caminho/` puro, `head -N arquivo`
puro — ou `python3` com `pathlib`/`re`. Nenhum `| head`, nenhum `2>/dev/null`, nenhum `> arquivo`.

### D6 — O budget em horas é intenção de escopo, não limite aplicado (EC-7)

O halt-loop não mede tempo de parede. O stop condition que realmente encerra uma questão é o de
sinal (três leituras sem novidade, ADR D1). As "2h por peer" declaram tamanho pretendido, e são
registradas aqui para que ninguém as leia como garantia de execução.

### D4 — Nenhum código dos peers entra no projeto

`rules/reference-provenance.md` § 3: lemos, entendemos, escrevemos a nossa versão. O
blueprint cita `file:line` e descreve a técnica em prosa; nenhuma linha é copiada. O
`http-exception.ts` do mastra é, ele próprio, uma cópia declarada do Hono — o que reforça a
regra: importaríamos a licença de terceiro de terceiro.

## Research Questions

Cada questão declara as duas fases da investigação. **Fase A** mapeia hotspots de forma ampla
(`ast-grep` para forma de código, `grep`/`ls` para forma de texto); **Fase B** lê cada hotspot em
profundidade e produz a citação `file:line`. Todo comando sobre a zona roda **sem pipe e sem
redirect** (ADR D5).

| # | Question | Corner | Reference project(s) | Fase A (broad — mapa de hotspots) | Fase B (deep — Read em cada hotspot) | Expected answer shape |
|---|---|---|---|---|---|---|
| Q1 | Como cada peer evita escrever cabeçalho duas vezes quando o handler falha DEPOIS de a resposta já ter começado? | techniques | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | `grep -rn headersSent .claude/knowledge-base/references/genkit/js/core/src/` e o mesmo em `.claude/knowledge-base/references/mastra/packages/server/src/` para listar ocorrências; `ast-grep run --pattern 'res.writeHead($$$)' --lang typescript` sobre os mesmos diretórios | Read `genkit/js/core/src/reflection.ts` no ponto de escrita da resposta; Read `mastra/packages/deployer/src/server/__tests__/on-error-hook.test.ts` inteiro | Por peer: existe guard explícito (onde, qual predicado) ou delega ao framework — com `file:line` |
| Q2 | Qual a forma canônica do envelope de erro na resposta e como o cliente o consome de forma tipada? | techniques | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | `grep -rn "error" .claude/knowledge-base/references/genkit/js/core/src/statusTypes.ts` para localizar a taxonomia; `ast-grep run --pattern 'class $NAME extends Error { $$$ }' --lang typescript .claude/knowledge-base/references/genkit/js/core/src/` | Read `genkit/js/core/src/error.ts`, `statusTypes.ts` e o `RunActionResponseSchema` de `reflection.ts`; Read `mastra/packages/server/src/server/http-exception.ts` | Shape do JSON de erro + se o cliente reconstrói tipo ou trata string. Atribuir o padrão do mastra ao **Hono** (EC-6) |
| Q3 | O que respondem para um path DENTRO do prefixo reservado da API que não casa com nenhuma rota — 404 tipado ou fallback de SPA? | techniques | `.claude/knowledge-base/references/mastra/` | `grep -rn notFound .claude/knowledge-base/references/mastra/packages/deployer/src/` para achar o handler de rota ausente | Read `mastra/packages/deployer/src/server/index.ts` na montagem de rotas; Read `__tests__/option-studio-base.test.ts` | **Primeiro o modelo de roteamento do peer**, depois a precedência API vs SPA e o status/content-type. Sem o modelo, a conclusão não é importável — nosso middleware connect não tem roteador (EC-2) |
| Q4 | Como testam a fronteira HTTP de erro ponta a ponta — servidor real ou mock? | tests | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | `ls .claude/knowledge-base/references/genkit/js/core/tests/` e `ls .claude/knowledge-base/references/mastra/packages/deployer/src/server/__tests__/` para inventariar os arquivos de teste da fronteira | Read `mastra/.../__tests__/on-error-hook.test.ts` e `cors.test.ts`; Read `genkit/js/core/tests/reflection_test.ts` | Nível do teste (HTTP real vs handler direto) + o que asseveram sobre o erro. Fallback (EC-3): se `reflection_test.ts` não exercitar o servidor, responder só com mastra e **declarar a ausência** |
| Q5 | Existe teste que exercita resposta já comprometida ou módulo de usuário que lança ao carregar? | tests | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | `grep -rn "already sent" .claude/knowledge-base/references/mastra/packages/deployer/src/` e `grep -rn ERR_HTTP .claude/knowledge-base/references/genkit/js/core/` | Read `mastra/packages/deployer/src/server/__tests__/node-server-host.test.ts`; Read os matches encontrados na Fase A | Existe/não existe. Ausência nos dois peers é achado legítimo — a lacuna seria da indústria, não nossa |
| Q6 | Que dependências a camada HTTP carrega, e o padrão sobrevive sem framework? | deps | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | `grep -n "express\|hono" .claude/knowledge-base/references/genkit/js/core/package.json` e o mesmo em `.claude/knowledge-base/references/mastra/packages/server/package.json` | Read os três `package.json` (`genkit/js/core/`, `mastra/packages/server/`, `mastra/packages/deployer/`) na seção de dependências | Lista de deps HTTP + veredito explícito sobre **se o padrão sobrevive sem framework** (EC-5); "ambos usam framework" é verdade inútil |
| Q7 | Como cada peer roda e valida o dev server localmente? | tools | `.claude/knowledge-base/references/genkit/`, `.claude/knowledge-base/references/mastra/` | `grep -n "scripts" .claude/knowledge-base/references/genkit/js/core/package.json` e o mesmo em `.claude/knowledge-base/references/mastra/packages/deployer/package.json` | Read a seção `scripts` dos dois `package.json` | Comando de teste + se há harness de servidor real reutilizável como ideia (não como código — ADR D4) |

## Coverage Matrix

| Corner | Questions mapped | Status |
|---|---|---|
| Integration tests (`tests`) | Q4, Q5 | Covered |
| Dependencies (`deps`) | Q6 | Covered |
| Tools (`tools`) | Q7 | Covered |
| Techniques (`techniques`) | Q1, Q2, Q3 | Covered |

**Coverage: 4/4 corners covered (100%)**

Budget: **7 questões** (mín. 5, máx. 10 ✅), máximo 3 por corner ✅ (techniques = 3), mínimo 1 por
corner ✅. Nenhuma questão diferida por ADR. Toda questão declara Fase A e Fase B não-vazias.
Todos os caminhos citados foram verificados em disco antes de entrarem nesta tabela.

## Halt-loop Checkpoints

Para `/discover-execute`, uma questão só pode ser marcada `done` quando:

1. A resposta cita ao menos um arquivo da zona de referências (`genkit/…` ou `mastra/…`)
   **com número de linha**.
2. O caminho citado resolve (`Path.exists`) — verificado pelo próprio loop antes de marcar.
3. A resposta diz explicitamente o que o peer faz **e** o que ele não faz (ausência é dado:
   ver Q5, cuja resposta negativa é um achado legítimo).
4. Para Q1-Q3 (Techniques), a resposta contrasta os **dois** peers ou declara que só um deles
   trata o assunto.

Uma questão sem sinal após 3 leituras vira `partial` com a razão registrada — nunca `done`
por cansaço, nunca resposta inventada para fechar a matriz.

**Checkpoints adicionados pela revisão de edge cases (SHOULD TEST):**

5. **(EC-4)** Antes de citar um arquivo, abri-lo de fato — `Path.exists` não prova conteúdo
   materializado num clone com `--filter=blob:none`. *Pré-verificado nesta revisão para
   `statusTypes.ts` e os dois `package.json`: conteúdo presente. O checkpoint permanece para
   arquivos abertos pela primeira vez durante o execute.*
6. **(EC-5)** Q6 só fecha se disser explicitamente **se o padrão sobrevive sem framework**.
   Ambos os peers carregam um (express no genkit, Hono no mastra) e o nosso plugin não pode
   carregar nenhum; "ambos usam framework" é verdade inútil.
7. **(EC-6)** `mastra/packages/server/src/server/http-exception.ts` declara na primeira linha
   ser cópia do Hono. O blueprint atribui o padrão ao **Hono**, não ao mastra — atribuição
   errada falsifica a proveniência do precedente.

## Acceptance Criteria

- [ ] As 7 questões estão `done` ou `partial` com razão registrada; nenhuma sem estado.
- [ ] Todo `knowledge-base/references/` citado no blueprint resolve em disco.
- [ ] Os 4 coverage corners têm conteúdo não-placeholder.
- [ ] ≥ 1 ADR no blueprint conectando um precedente dos peers a uma decisão do M6.
- [ ] Nenhuma linha de código dos peers copiada (`rules/reference-provenance.md` § 3).
- [ ] O blueprint declara explicitamente onde os peers **divergem** — convergência fabricada
      é pior que divergência reportada.

## Global Definition of Done

`/discover-confidence` ≥ `SHIPPABLE_WITH_CAVEATS` (banda 70) conforme
`rules/discover-blueprint-golden-rule.md`. Hard caps que invalidam: coverage corner vazio,
citação fabricada. Thresholds em `rules/discover-blueprint-thresholds.txt`.
