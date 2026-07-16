# Discover Edge Case Review — m1-studio-table-stakes

Date: 2026-07-15
Discovery plan analyzed: .claude/knowledge-base/discoveries/plans/m1-studio-table-stakes-plan.md
Research questions analyzed: 8
Edge cases found: 6 (MUST FIX: 1, SHOULD TEST: 3, DOCUMENT: 2)

## MUST FIX

### EC-1: Q6 depende de hotspots produzidos por Q1/Q2 sem ordem declarada
- **Affected question:** Q6
- **Family:** Dependency
- **Scenario:** A Fase B de Q6 instrui ler "os pontos de uso do transporte" localizados "nos src já mapeados em Q1/Q2". Se o halt-loop executar Q6 antes de Q1/Q2 (a ordem não está declarada no plano), esses hotspots não existem ainda.
- **Impact:** Q6 seria marcada BLOCKED indevidamente ou responderia só com package.json (metade da resposta — transporte de streaming ficaria sem evidência de código).
- **Suggested fix:** Declarar no plano a ordem de execução "Q1 → Q2 antes de Q6; demais questões livres" (1 frase na seção Research Questions).

## SHOULD TEST

### EC-2: Carve-out `ee/` existe DENTRO de projeto em escopo (playground)
- **Affected question:** Q8 (e qualquer leitura no mastra)
- **Suggested halt-loop checkpoint:** `mastra/packages/playground/src/ee/` existe (verificado 2026-07-15). Antes de qualquer Read no mastra, assertar que o caminho NÃO contém `/ee/`; se um hotspot da Fase A cair em `ee/`, descartá-lo com nota no blueprint (nunca ler).

### EC-3: Citações de repos vivos (`../theokit*`) escapam do check automático de fabricated citation
- **Affected question:** Q3, Q5, Q7
- **Suggested halt-loop checkpoint:** O `check_reference_citations.py` só valida caminhos `knowledge-base/references/`. Antes de emitir a promise, o blueprint deve listar TODAS as citações de caminho vivo numa tabela dedicada ("Live-repo citations") e cada uma deve ter sido re-validada com `ls`/Read na iteração que a citou.

### EC-4: `mastra/packages/cli/src/commands/dev` é diretório, não arquivo
- **Affected question:** Q2
- **Suggested halt-loop checkpoint:** A Fase A de Q2 deve começar com `ls packages/cli/src/commands/dev/` para mapear os arquivos reais antes do Grep (evita retry desnecessário do padrão `dev` em arquivos irmãos como `deploy*`).

## DOCUMENT

### EC-5: SDK vivo está em v3.8.0 e pode avançar durante o ciclo M1
- **Accepted risk:** O worktree `../theokit-sdk` está em `@theokit/sdk@3.8.0` (verificado 2026-07-15) e é desenvolvido ativamente — o HEAD pode mudar entre o discover e o implement. Mitigação barata: o blueprint registra o commit sha lido (`git -C ../theokit-sdk rev-parse --short HEAD`) no header, e o plano do M1 re-valida a superfície na fase de implement. Clonar snapshot foi rejeitado no ADR D3 (staleness pior que drift).

### EC-6: Localização do serving da Dev UI no genkit-tools é incerta a priori
- **Accepted risk:** O `ls` preliminar de `genkit-tools/cli/src/commands/` não mostrou um arquivo óbvio de UI/start (a listagem foi truncada). A Fase A de Q8 já prevê Grep `ui|static|serve` com 3 variantes de fallback e stop condition honesto — se não localizar, Q8 responde só com o lado mastra e marca o lado genkit BLOCKED com razão.

## Summary

| Question | Edges found | MUST FIX | SHOULD TEST | DOCUMENT |
|----------|-------------|----------|-------------|----------|
| Q1 | 0 | 0 | 0 | 0 |
| Q2 | 1 | 0 | 1 | 0 |
| Q3 | 1* | 0 | 1* | 0 |
| Q4 | 0 | 0 | 0 | 0 |
| Q5 | 1* | 0 | 1* | 0 |
| Q6 | 1 | 1 | 0 | 0 |
| Q7 | 2* | 0 | 1* | 1 |
| Q8 | 2 | 0 | 1 | 1 |

\* EC-3 afeta Q3/Q5/Q7 conjuntamente (contado uma vez em "Edge cases found").

**Verdict:** DISCOVERY PLAN NEEDS ADJUSTMENT (1 MUST FIX — ordem Q1/Q2→Q6; 3 checkpoints a adicionar)
