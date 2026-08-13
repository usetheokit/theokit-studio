# @theokit/studio

## 0.2.0

### Minor Changes

- Alinha os peers ao piso real do framework e faz o tarball carregar a licença.

  **Quebra de contrato de instalação.** `@theokit/agents` passa de `^0.39.0` para `^7.6.0` e
  `@theokit/sdk` de `^3.8.0` para `^4.49.0` — sete majors e uma major de distância. Um app pinado
  abaixo desses pisos passa a falhar a resolução de peer. Bump de minor porque a versão ainda é 0.x,
  onde minor é o slot de breaking.

  Alinhar os ranges levou a suíte de 192 verdes para 177 verdes e 15 vermelhos. Todos os 15 descendem
  de **uma** renomeação de API, e ela estava nas fixtures de teste, não no produto: `agent()` deixou de
  ser exportado do bridge, e o sucessor é `AgentBuilder.create()`, com a mesma cadeia. A superfície que
  o plugin realmente consome — `compileAgentModule` e `streamAgentUIMessages` — atravessou as sete
  majors intacta.

  **O pacote passa a declarar e a carregar a licença.** O manifest não tinha campo `license` e
  `files: ["dist"]` não levava nenhum `LICENSE`. Um pacote npm sem esse campo é all rights reserved
  para quem instala: a concessão viaja no tarball, não no repositório. Agora declara `Apache-2.0` e
  embarca o texto (verificado no `npm pack`: `11.3kB LICENSE`).
