// @vitest-environment node
import { createServer, type Server, type ServerResponse } from "node:http";
import { sendErrorEnvelope, sendJson } from "./http";

// T1.1 — o guard de resposta comprometida. Estes testes usam um servidor HTTP REAL porque
// `res.headersSent` é estado do próprio ServerResponse do Node: um fake que o declara como
// literal nunca reproduz a transição que causa o crash (finding #68 da auditoria).

/** Sobe um servidor real, roda `handler` na requisição e devolve status + corpo recebidos. */
async function requestWith(
  handler: (res: ServerResponse) => void,
): Promise<{ status: number; body: string }> {
  let server: Server | undefined;
  try {
    server = createServer((_req, res) => handler(res));
    await new Promise<void>((resolve) => server?.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("servidor de teste não expôs porta");
    }
    const res = await fetch(`http://localhost:${address.port}/`);
    return { status: res.status, body: await res.text() };
  } finally {
    await new Promise<void>((resolve) => {
      if (!server) return resolve();
      server.close(() => resolve());
    });
  }
}

describe("sendErrorEnvelope sobre resposta já comprometida (T1.1)", () => {
  it("sendErrorEnvelope_writes_body_when_headers_already_sent", async () => {
    const { body } = await requestWith((res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      sendErrorEnvelope(res, 500, "INTERNAL", "boom");
    });

    // Cabeçalho não pode mais mudar, mas o erro TEM de chegar ao cliente (ADR A1).
    expect(body).toContain("INTERNAL");
    expect(body).toContain("boom");
  });

  it("sendErrorEnvelope_does_not_throw_when_headers_sent", async () => {
    // O modo de falha original: writeHead após head comprometido lança
    // ERR_HTTP_HEADERS_SENT e, dentro do .catch() do dispatcher, mata o processo.
    let thrown: unknown = null;
    await requestWith((res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      try {
        sendErrorEnvelope(res, 500, "INTERNAL", "boom");
      } catch (error) {
        thrown = error;
        res.end();
      }
    });

    expect(thrown).toBeNull();
  });

  it("sendJson_returns_silently_when_headers_already_sent", async () => {
    let thrown: unknown = null;
    const { body } = await requestWith((res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.write("parcial");
      try {
        sendJson(res, 200, { nunca: "escrito" });
      } catch (error) {
        thrown = error;
      }
      res.end();
    });

    expect(thrown).toBeNull();
    expect(body).not.toContain("nunca");
  });

  it("sendErrorEnvelope_does_not_write_when_response_already_ended", async () => {
    // EC-1 (MUST FIX): comprometida E encerrada ao mesmo tempo. Escrever aqui levantaria
    // ERR_STREAM_WRITE_AFTER_END — trocaria um crash por outro. A ordem dos predicados é o
    // contrato: writableEnded/destroyed saem primeiro.
    let thrown: unknown = null;
    const { body } = await requestWith((res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("fim");
      try {
        sendErrorEnvelope(res, 500, "INTERNAL", "tarde demais");
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeNull();
    expect(body).toBe("fim");
  });
});

describe("caminho não-comprometido segue intacto (T1.1)", () => {
  it("sendErrorEnvelope_sets_status_and_json_when_not_committed", async () => {
    const { status, body } = await requestWith((res) => {
      sendErrorEnvelope(res, 404, "NOT_FOUND", "sem rota");
    });

    expect(status).toBe(404);
    expect(JSON.parse(body).error).toEqual({ code: "NOT_FOUND", message: "sem rota" });
  });

  it("sendJson_writes_status_and_payload_when_not_committed", async () => {
    const { status, body } = await requestWith((res) => {
      sendJson(res, 200, { ok: true });
    });

    expect(status).toBe(200);
    expect(JSON.parse(body)).toEqual({ ok: true });
  });
});
