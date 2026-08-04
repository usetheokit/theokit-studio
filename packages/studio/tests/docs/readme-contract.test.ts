import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// O README fica na raiz do repo, três níveis acima deste arquivo.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const README_PATH = resolve(REPO_ROOT, "README.md");

const TABLE_HEADER = "| Studio surface |";

/**
 * Extrai a primeira coluna da tabela de features do README.
 *
 * Oráculo FECHADO (plano M7 ADR A1): o conjunto de superfícies é enumerável e muda por decisão
 * explícita. Falha ALTO quando a tabela não existe — devolver `[]` faria o teste passar verde
 * sem observar nada, que é o modo de falha que o edge-case EC-1 nomeia.
 */
function parseFeatureTableSurfaces(markdown: string): string[] {
  const lines = markdown.split("\n");
  const headerIndex = lines.findIndex((line) => line.startsWith(TABLE_HEADER));
  if (headerIndex === -1) {
    throw new Error(
      `tabela de features não encontrada no README: nenhuma linha começa com "${TABLE_HEADER}"`,
    );
  }
  const surfaces: string[] = [];
  // Pula o separador `|---|---|---|` e lê até a primeira linha que não é da tabela.
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    const first = line.split("|")[1]?.trim();
    if (first !== undefined && first.length > 0) surfaces.push(first);
  }
  return surfaces;
}

describe("contrato do README", () => {
  it("a tabela de features lista apenas superfícies que existem", () => {
    const surfaces = parseFeatureTableSurfaces(readFileSync(README_PATH, "utf8"));
    expect(surfaces).toEqual(["Agent Builder"]);
  });

  // O plano escreveu o oráculo em português; o README é público e está em inglês (como já estava
  // antes do M7). O regex acompanha a língua do artefato — a exigência é a mesma: o verbo de
  // remoção adjacente ao SHA que a causou.
  it("declara explicitamente as superfícies removidas", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).toMatch(/removed in `74a96c6`/);
  });

  // AC4: nenhum serviço de dados aparece como LINHA da tabela de superfícies entregues.
  // Escopado à tabela de propósito (review F-tests-9): uma frase honesta em prosa — "o Studio
  // não embute theo-lens" — é desejável e não pode virar falha de teste.
  it("nenhuma linha da tabela de features nomeia um serviço de dados", () => {
    const surfaces = parseFeatureTableSurfaces(readFileSync(README_PATH, "utf8"));
    const offenders = surfaces.filter((s) => /theo-(lens|memory|rag)/.test(s));
    expect(offenders).toEqual([]);
  });

  // O BLOCKER que a review do M7 pegou: o hero prometia "get a working agent file back", e o
  // Builder não escreve arquivo nenhum — a sessão inteira é fixture roteirizado. Esta é a trava
  // contra reintroduzir a promessa.
  it("declara que a sessão de build é roteirizada e não escreve em disco", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).toMatch(/does not write anything to disk/i);
  });

  it("não promete que o Builder devolve um arquivo de agente", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).not.toMatch(/get a working agent file back/i);
  });

  // EC-1: o parser nunca devolve [] quando não acha o bloco — falha alto e nomeia o bloco.
  it("parseFeatureTableSurfaces lança erro nomeando o bloco quando a tabela some", () => {
    const call = () => parseFeatureTableSurfaces("# Sem tabela\n\ntexto");
    expect(call).toThrowError(/tabela de features não encontrada/);
  });
});
