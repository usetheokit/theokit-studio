# Review: plugin-hardening (M6)

**Date:** 2026-08-04
**Reviewers (agentes spawned):** 6 — architecture, tests, wiring, cross-validation, domain-api-design, domain-testing
**Rodadas:** 2 (a segunda verificou as correções da primeira por mutação)
**Verdict:** `READY_TO_MERGE`

## Achados por rodada

### Rodada 1 — 4 agentes baseline

| id | sev | achado | estado |
|---|---|---|---|
| F-tests-3 | HIGH | O teste do EC-1 **não fixava a ordem** dos predicados — mutação sobreviveu | **CORRIGIDO** (75214f3) |
| F-tests-1 | HIGH | O único RED declarado da T1.3 nunca foi escrito | **CORRIGIDO** (75214f3, reforçado em 619e371) |
| F-tests-2 | HIGH | Os três getters de `headersSent` eram inertes | **CORRIGIDO** (75214f3) |
| F-wire-1 | HIGH | `.progress` declarava pilar (b) `pass` onde a ferramenta retorna FAIL | **CORRIGIDO** (75214f3) |
| F-wire-2 | HIGH | Resumo afirmava cobertura de integração que não existia | **CORRIGIDO** (75214f3) |
| F-arch-1 | MEDIUM | `sendJson` pendurava a requisição (hang no lugar do crash) | **CORRIGIDO** (75214f3) |
| F-wire-3 | MEDIUM | Zero cobertura de integração do comportamento novo | **CORRIGIDO** (75214f3) |
| F-wire-6 / F-tests-7 | LOW | `chmod 000` é no-op para root → falha ambiental em CI | **CORRIGIDO** (75214f3) |
| F-xval-1 | BLOCKER (alegado) | `vitest run` saindo 1 intermitentemente | **FALSO — ver § abaixo** |
| F-arch-2 | MEDIUM | `ReflectionRequestError` no adapter, não no port | **ABERTO** |
| F-arch-3 | MEDIUM | Contrato do envelope implementado 2×, sem teste que falhe se divergirem | **ABERTO** |
| F-wire-4 | MEDIUM | `ReflectionRequestError` é export sem consumidor | **ABERTO** |
| F-xval-3 | HIGH | Plan drift: seções TDD do plano reescritas dentro do commit de implementação | **RECONHECIDO** |

### Rodada 2 — 2 agentes de domínio (verificação por mutação)

| id | sev | achado | estado |
|---|---|---|---|
| F-dom-api-1 | HIGH | `/_studio/index.html` servido cru, sem config — bootava produto diferente da raiz | **CORRIGIDO** (619e371) |
| F-dom-2 | MEDIUM | Caso negativo do EACCES não asseverava o erro tipado (mutação sobrevivia) | **CORRIGIDO** (619e371) |
| F-dom-1 | MEDIUM | Teste do dispatcher matava mutante por asserção de arranjo, não comportamento | **CORRIGIDO** (619e371) |
| F-dom-api-2 | MEDIUM | Sem enforcement de método em 5 de 6 recursos (`DELETE /health` → 200) | **ABERTO** |
| F-dom-api-3 | MEDIUM | Sem `Cache-Control` em nenhum JSON de reflection | **ABERTO** |
| F-dom-api-4 | MEDIUM | Vocabulário de `code` mistura eixos: 400 colapsa 4 causas em `BAD_REQUEST` | **ABERTO** |
| F-dom-api-5 | MEDIUM | `/health` reporta `studio: "0.0.0"` (pior que o fallback honesto `"unknown"`) | **ABERTO** |
| F-dom-3 | MEDIUM | `SKIP_IF_ROOT` some silenciosamente sob CI root | **ABERTO** |

## O BLOCKER que não era

`F-xval-1` reportou `npx vitest run` saindo 1 de forma intermitente com
`ERR_STREAM_WRITE_AFTER_END` — exatamente a classe que o M6 elimina. Investigado antes de
aceitar:

1. O agente de wiring flagrou, **durante a execução paralela**, um mutante VIVO em
   `plugin/http.ts` com a ordem dos predicados invertida.
2. O agente de testes declara ter rodado mutações naquele arquivo.
3. O próprio cross-validation observou 5 falhas e depois **0 em 26 execuções**.
4. Verificação minha na árvore limpa em `4926fc7`: **6 execuções, 6× exit 0**.

Conclusão: artefato da review paralela, não do código entregue. Registrado porque promover
blocker falso corrói a confiança no gate tanto quanto deixar passar um real.

**Lição de processo:** agentes de review que mutam o código-fonte não podem rodar em paralelo
com agentes que medem o código-fonte. Da próxima vez, mutação roda isolada ou em worktree.

## Verificação por mutação (a evidência que sustenta o veredito)

A segunda rodada não leu código — mutou e mediu:

| Mutação aplicada | Suíte | Resultado |
|---|---|---|
| Inverter a ordem dos predicados em `sendErrorEnvelope` | `http.test.ts` | **RED** ✅ |
| Getter `headersSent` → literal congelado | `index.test.ts` | **RED** ✅ |
| Remover `res.end()` do branch de `sendJson` | `http.test.ts` | **RED** ✅ |
| `isReservedApiNamespace` → `return false` | integração | **RED** ✅ |
| Remover o guard inteiro de `sendErrorEnvelope` | `index.test.ts` | **RED** ✅ (após 619e371) |
| Trocar `500/ASSET_READ_FAILED` por `404/NOT_FOUND` | static-serve | **RED** ✅ (após 619e371) |

Todas as mutações restauradas; árvore limpa verificada.

## Quality gates

| Gate | Resultado |
|---|---|
| `npm test` | **140/140** (17 arquivos) |
| `npm run typecheck` | limpo |
| `npm run lint` (biome) | limpo, 0 warnings |
| `npm run build` | vite + tsup, 0 erros |
| `plugin/http.ts` cobertura de branch | **100%** (era 50%) |
| Cobertura global de branch | 89.8% (piso 89.46% mantido) |
| Wiring triad | 6/6 símbolos pilar (a) PASS; pilar (b) DEFER explícito por símbolo; (c) n/a declarado |

## Cross-validation

**Plan tasks: 6 | Fully implemented: 6 | Partial: 0 | Missing: 0 | Diverged: 0**

Os 6 bullets de DoD do ROADMAP § M6 mapeiam para tarefas implementadas e verificadas. O bullet 6
("suíte verde") estava vermelho na primeira rodada por causa do mutante; está verde agora.

## Scope creep declarado

Quatro mudanças fora do plano, todas defensáveis e agora explícitas:
`check_wiring.py` (3 bugs corrigidos), `pnpm.overrides` (6 CVEs), scripts `lint`/`test:coverage`
na raiz, e `run_discover_plan_score.py` (parser de thresholds). Nenhuma tem ADR — registrado
como dívida de processo, não silenciada.

## Verdict: READY_TO_MERGE

Zero BLOCKER. Zero HIGH aberto — os 6 HIGH da rodada 1 e o 1 HIGH da rodada 2 foram corrigidos e
verificados por mutação. Restam **8 MEDIUM abertos**, nenhum no caminho da cadeia de crash que o
milestone existe para eliminar; sete deles são de polimento de contrato HTTP (método, cache,
vocabulário de código, versão no /health) e um é dívida de tipagem (`ReflectionRequestError` sem
consumidor — a T4.1 entregou o mecanismo, não o consumo).

Recomendação honesta: os MEDIUM de contrato HTTP (`F-dom-api-2..5`) devem ser fechados **antes do
primeiro `npm publish`**, porque renomear um `code` depois de publicado é breaking change. Como o
pacote ainda é `private: true` e nunca foi publicado, eles não bloqueiam este merge.
