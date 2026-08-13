import type { ServerResponse } from "node:http";

// The plugin's shared HTTP helpers (SEPA T1.2: a module of its own avoids the
// index ⇄ reflection-api cycle while keeping one canonical envelope — DRY over knowledge).

/** The canonical error envelope for EVERY handler in the plugin (error-handling.md § 2). */
export function sendErrorEnvelope(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
): void {
  // THE ORDER IS THE CONTRACT (M6 EC-1): ended/destroyed is checked first. Writing to an
  // already-ended response would raise ERR_STREAM_WRITE_AFTER_END — trading one crash for another.
  if (res.writableEnded || res.destroyed) return;
  const payload = JSON.stringify({ error: { code, message } });
  if (res.headersSent) {
    // The head is already committed: the status can no longer change, but the error MUST still
    // reach the client. Giving up silently would leave a truncated response with no cause
    // (ADR A1; precedent
    // genkit js/core/src/reflection.ts:359-363).
    res.end(payload);
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

/** A plain JSON response, guarded against an already-ended or committed response. */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  // THE ORDER IS THE CONTRACT (M6 EC-1), same as sendErrorEnvelope.
  if (res.writableEnded || res.destroyed) return;
  if (res.headersSent) {
    // There is no SUCCESS response left to give after a committed head: the status is gone.
    // But ENDING is mandatory — merely returning would leave the request hanging open, trading
    // the noisy crash for a silent hang (review F-arch-1). Reaching here is a caller bug, so the
    // warning is loud rather than swallowed (error-handling.md § 2).
    console.warn("theokit-studio: sendJson called on an already-committed response — ending it");
    res.end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
