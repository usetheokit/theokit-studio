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
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { code, message } }));
}

/** Resposta JSON simples com guard de response já encerrado. */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
