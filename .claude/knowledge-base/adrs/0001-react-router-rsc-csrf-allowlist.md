# ADR 0001 — Allowlist temporária para GHSA-qwww-vcr4-c8h2 (react-router)

**Status:** Accepted
**Date:** 2026-08-04
**Deciders:** paulohenriquevn (owner), agente do ciclo M6
**Context source:** `knowledge-base/audits/plugin-hardening-deps-audit-2026-08-04.md`
**Requerido por:** `rules/deps-audit-golden-rule.md` § 4 — exemplo de HIGH exige ADR.

## Contexto

O `/deps-audit` do M6 apurou, via `osv-scanner` sobre `pnpm-lock.yaml`, sete ocorrências de
vulnerabilidade. Seis foram **corrigidas de fato** nesta mesma sessão via `pnpm.overrides`
(`brace-expansion` ×4 HIGH, `postcss` MODERATE, `esbuild` LOW) — com suíte, typecheck e build
re-validados verdes.

Resta uma:

- **GHSA-qwww-vcr4-c8h2** — HIGH (rótulo oficial do GitHub Advisory), CWE-352.
- Pacote: `react-router@7.18.1`, **dependência direta** de `packages/studio`.
- Resumo: *React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response*.
- Corrigido em: **8.3.0** — bump **MAJOR**.

## Decisão

Registrar entrada de allowlist para GHSA-qwww-vcr4-c8h2 com sunset em **2026-11-02** (90 dias),
e tratar o bump `7.x → 8.x` como trabalho próprio, fora do M6.

## Justificativa

1. **O recurso vulnerável não é exercitado por este código.** O CVE é específico do **RSC Mode**
   do React Router. A verificação foi feita, não presumida:
   `grep -rn "rsc\|RSC\|createStaticHandler\|renderToReadableStream" packages/studio/src` retorna
   **zero ocorrências**. A SPA monta `createBrowserRouter` client-side em `src/main.tsx:26`, sem
   server components, sem actions de servidor — não há superfície onde o bypass de CSRF se aplique.
2. **O escopo do M6 é a fronteira HTTP do plugin**, não o roteador da SPA. Um bump MAJOR do
   roteador dentro deste milestone violaria o próprio contrato do ciclo (o DoD não o prevê) e
   misturaria numa entrega de disponibilidade um risco de regressão de navegação inteiro.
3. **A alternativa "bump agora" foi considerada e rejeitada**: `7.18.1 → 8.3.0` atravessa uma
   major do roteador que sustenta a única tela do produto. Fazer isso sem plano, sem discovery
   das breaking changes e sem aceitação é exatamente o retrabalho que o ciclo existe para evitar.
4. **A alternativa "ignorar" foi rejeitada** por `rules/deps-audit-golden-rule.md` (esconder
   achado é anti-pattern 3 da skill) — daí a allowlist explícita, com data de morte.

## Consequências

- O verdict de `/deps-audit` para o M6 sai de `FAIL_INSECURE` para `PASS_WITH_CAVEATS`: a
  allowlist rebaixa HIGH → MEDIUM por **uma** vez, e o caveat aparece no relatório e no PR.
- **Em 2026-11-02 a entrada expira e o achado volta com severidade cheia**, bloqueando o próximo
  plano que passar pelo gate. Isso é intencional: é o mecanismo que impede a exceção de virar
  permanente.
- O bump para `react-router@8.3.0` precisa de milestone próprio, com discovery das breaking
  changes e re-teste da navegação. Registrado como pendência aberta neste ADR.
- Se o RSC Mode um dia for adotado nesta SPA, esta ADR fica **imediatamente inválida** — a
  premissa da justificativa (recurso não usado) deixa de valer.

## Verificação

```
$ grep -rn "rsc\|RSC\|createStaticHandler\|renderToReadableStream" packages/studio/src
(nenhuma ocorrência)

$ osv-scanner --lockfile=pnpm-lock.yaml     # após os overrides
react-router 7.18.1 GHSA-qwww-vcr4-c8h2 HIGH     ← única remanescente
```
