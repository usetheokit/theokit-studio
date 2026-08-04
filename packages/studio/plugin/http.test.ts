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

  it("sendErrorEnvelope_does_not_write_when_response_already_ended", () => {
    // EC-1 (MUST FIX): comprometida E encerrada ao mesmo tempo. A ORDEM dos predicados é o
    // contrato — writableEnded/destroyed ANTES de headersSent.
    //
    // Fake com spy, não servidor real: a asserção que MATA a mutação (inverter a ordem) é
    // "end NÃO foi chamado". Com ServerResponse real, o write-after-end vira erro ASSÍNCRONO
    // do stream — nunca é lançado no try/catch e nunca chega ao corpo, e a review provou que
    // a versão anterior deste teste sobrevivia à inversão (F-tests-3).
    const end = vi.fn();
    const writeHead = vi.fn();
    const res = {
      end,
      writeHead,
      get writableEnded() {
        return true;
      },
      get destroyed() {
        return false;
      },
      get headersSent() {
        return true;
      },
    } as unknown as ServerResponse;

    expect(() => sendErrorEnvelope(res, 500, "INTERNAL", "tarde demais")).not.toThrow();

    // Se headersSent for avaliado ANTES de writableEnded, o branch do corpo roda e chama end()
    // sobre resposta encerrada — ERR_STREAM_WRITE_AFTER_END em produção.
    expect(end).not.toHaveBeenCalled();
    expect(writeHead).not.toHaveBeenCalled();
  });

  it("sendJson_does_not_write_when_response_already_ended", () => {
    // AC6 do M6 exige 100% de branch em http.ts, e a aceitação da v0.4.0 mediu 90%: o guard
    // `writableEnded || destroyed` do sendJson — adicionado ao corrigir o F-arch-1 da review —
    // não tinha teste. A ordem também importa aqui: encerrada sai ANTES de comprometida.
    const end = vi.fn();
    const writeHead = vi.fn();
    const res = {
      end,
      writeHead,
      get writableEnded() {
        return true;
      },
      get destroyed() {
        return false;
      },
      get headersSent() {
        return true;
      },
    } as unknown as ServerResponse;

    expect(() => sendJson(res, 200, { nunca: "escrito" })).not.toThrow();

    expect(end).not.toHaveBeenCalled();
    expect(writeHead).not.toHaveBeenCalled();
  });

  it("sendJson_ends_the_response_when_headers_already_sent", () => {
    // F-arch-1: apenas retornar deixava a requisição pendurada — hang silencioso no lugar do
    // crash ruidoso. Encerrar é obrigatório; o aviso torna o bug de chamador visível.
    const end = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = {
      end,
      writeHead: vi.fn(),
      get writableEnded() {
        return false;
      },
      get destroyed() {
        return false;
      },
      get headersSent() {
        return true;
      },
    } as unknown as ServerResponse;

    try {
      sendJson(res, 200, { nunca: "escrito" });

      expect(end).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
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
