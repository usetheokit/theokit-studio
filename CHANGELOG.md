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

- **`pnpm test` na raiz voltou a passar — estava vermelho desde o `4a60788`.** O script `test:roadmap` rodava `tests/roadmap_dod_shape_test.py`, que lê `ROADMAP.md`. Esse arquivo foi removido de propósito naquele mesmo commit, junto com o extrator de `.claude/skills/acceptance/` que o teste importava como oráculo. Um guarda órfão em cima de um oráculo órfão, verificando a forma de um artefato que o README já documenta como inexistente.

  Ele nem falhava com asserção: estourava `FileNotFoundError`, então a suíte da raiz saía não-zero por um erro que não dizia o que fazer. Removido — o assunto dele não existe mais, e um gate impossível de satisfazer treina o time a ignorar vermelho. Volta se um roadmap voltar, junto com o extrator que lhe dava sentido.

- **O pacote publicado passa a declarar e a carregar a licença (usetheodev/theokit#213).** O manifest não tinha campo `license` e o `files: ["dist"]` não levava nenhum `LICENSE` — o `LICENSE` Apache-2.0 existia só na raiz do repositório, que não é o artefato. **Um pacote npm sem campo `license` é all rights reserved para quem instala:** a concessão viaja no tarball, não no GitHub, e quem resolve o pacote de um mirror de registry nunca vê o repositório.

  Agora o manifest declara `Apache-2.0` e o `LICENSE` fica ao lado dele, então o npm o inclui apesar do `files`. Verificado no `npm pack --dry-run`: `11.3kB LICENSE`, 38 arquivos. `tests/packaging/license-declared.test.ts` guarda as duas metades — declarar sem embarcar, ou embarcar um texto diferente do SPDX declarado, são falhas distintas e a segunda é pior, porque é uma afirmação em que o consumidor confia sem ler.

### Security
