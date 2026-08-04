import type { ServerResponse } from "node:http";

// Helpers HTTP compartilhados do plugin (SEPA T1.2: módulo próprio evita o ciclo
// index ⇄ reflection-api mantendo o envelope canônico único — DRY sobre conhecimento).

/** Envelope de erro canônico de TODOS os handlers do plugin (error-handling.md § 2). */
export function sendErrorEnvelope(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
): void {
  // A ORDEM É O CONTRATO (M6 EC-1): encerrada/destruída sai primeiro. Escrever numa
  // resposta já encerrada levantaria ERR_STREAM_WRITE_AFTER_END — trocaria um crash por outro.
  if (res.writableEnded || res.destroyed) return;
  const payload = JSON.stringify({ error: { code, message } });
  if (res.headersSent) {
    // Head já comprometido: o status não muda mais, mas o erro TEM de chegar ao cliente.
    // Desistir em silêncio deixaria uma resposta truncada sem causa (ADR A1; precedente
    // genkit js/core/src/reflection.ts:359-363).
    res.end(payload);
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

/** Resposta JSON simples com guard de response já encerrado ou comprometido. */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  // Não há resposta de SUCESSO a dar depois de um head comprometido — só retorna (ADR A1).
  if (res.writableEnded || res.destroyed || res.headersSent) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
