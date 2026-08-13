# Changelog


## [Unreleased]

### Added

- **`tests/version-floor.test.ts` — piso anti-vacuidade sobre as versões que este pacote declara.** Escrito porque 15 vermelhos ficaram verdes com uma mudança de três linhas, num item antes descrito como "sete majors de migração": um verde tão barato merece descrença até que algo independente confirme que o código novo é o código que roda.

  Ele não pergunta versão — pergunta aos módulos carregados o que eles expõem: `AgentBuilder` presente e `agent` ausente no bridge, `compileAgentModule` / `streamAgentUIMessages` ainda funções, e a família config/trust/wiring do SDK 4.49. Um manifest pode declarar qualquer range; só o módulo carregado responde se a API existe.

  Levou quatro tentativas, e cada uma errada foi o mesmo defeito — uma sonda incapaz de detectar a condição que rastreia: `package.json` fora do mapa de `exports`; caminhar para cima a partir de uma resolução CJS; resolução CJS contra um subpath ESM-only (`ERR_PACKAGE_PATH_NOT_EXPORTED` é a resposta *correta* para a pergunta errada); e `import.meta.resolve`, que o transform SSR do Vite não fornece.

### Changed

- **O `@theokit/studio` passa a exigir `@theokit/agents@^7.6.0` e `@theokit/sdk@^4.49.0`.** Isto é mudança de contrato de **instalação**: os peers declarados eram `^0.39.0` e `^3.8.0`, sete majors e uma major atrás do que o framework publica hoje. Enquanto ninguém satisfazia o peer obsoleto, ninguém descobria que ele estava obsoleto.

  Alinhar os ranges levou a suíte de 192 verdes para 177 verdes e 15 vermelhos, em 4 arquivos. Diagnosticados um a um, todos os 15 descendem de **uma** renomeação de API — e ela está nas *fixtures de teste*, não no produto. `agent()` deixou de ser exportado do bridge entre 0.39 e 7.x; o sucessor é `AgentBuilder.create()`, com a mesma cadeia (`.model` / `.system` / `.tool` / `.skills` / `.build`).

  A superfície que o plugin realmente consome — `compileAgentModule` e `streamAgentUIMessages` — atravessou as sete majors intacta. Um dos vermelhos devolvia `422` onde esperava `200` no endpoint de run: não era contrato quebrado, era a degradação por item funcionando exatamente como projetada, alimentada por uma fixture que lançava no import.

  Três linhas depois: 192 verdes, `tsc --noEmit` limpo.

- O README deixa de linkar `ROADMAP.md` e os quatro documentos de `docs/`, todos removidos no commit `4a60788`; o texto agora diz que eles só existem no histórico do git. (docs-reorg-2026-08)

### Deprecated

### Removed

### Fixed

### Security
