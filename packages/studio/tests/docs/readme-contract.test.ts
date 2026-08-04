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

  // AC4: nenhum serviço de dados aparece apresentado como superfície entregue do Studio.
  it("não cita theo-lens/theo-memory/theo-rag", () => {
    const readme = readFileSync(README_PATH, "utf8");
    expect(readme).not.toMatch(/theo-(lens|memory|rag)/);
  });

  // EC-1: o parser nunca devolve [] quando não acha o bloco — falha alto e nomeia o bloco.
  it("parseFeatureTableSurfaces lança erro nomeando o bloco quando a tabela some", () => {
    const call = () => parseFeatureTableSurfaces("# Sem tabela\n\ntexto");
    expect(call).toThrowError(/tabela de features não encontrada/);
  });
});
