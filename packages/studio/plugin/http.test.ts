// @vitest-environment node
import { createServer, type Server, type ServerResponse } from "node:http";
import { sendErrorEnvelope, sendJson } from "./http";

// T1.1 — the committed-response guard. These tests use a REAL HTTP server because
// `res.headersSent` is state owned by Node's own ServerResponse: a fake declaring it as a
// literal never reproduces the transition that causes the crash (audit finding #68).

/** Starts a real server, runs `handler` on the request, and returns the status and body. */
async function requestWith(
  handler: (res: ServerResponse) => void,
): Promise<{ status: number; body: string }> {
  let server: Server | undefined;
  try {
    server = createServer((_req, res) => handler(res));
    await new Promise<void>((resolve) => server?.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("the test server exposed no port");
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

describe("sendErrorEnvelope over an already-committed response (T1.1)", () => {
  it("sendErrorEnvelope_writes_body_when_headers_already_sent", async () => {
    const { body } = await requestWith((res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      sendErrorEnvelope(res, 500, "INTERNAL", "boom");
    });

    // The header can no longer change, but the error MUST still reach the client (ADR A1).
    expect(body).toContain("INTERNAL");
    expect(body).toContain("boom");
  });

  it("sendErrorEnvelope_does_not_throw_when_headers_sent", async () => {
    // The original failure mode: writeHead after the head is committed throws
    // ERR_HTTP_HEADERS_SENT and, inside the dispatcher's .catch(), kills the process.
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
      res.write("partial");
      try {
        sendJson(res, 200, { never: "written" });
      } catch (error) {
        thrown = error;
      }
      res.end();
    });

    expect(thrown).toBeNull();
    expect(body).not.toContain("never");
  });

  it("sendErrorEnvelope_does_not_write_when_response_already_ended", () => {
    // EC-1 (MUST FIX): committed AND ended at the same time. The predicates' ORDER is the
    // contract — writableEnded/destroyed BEFORE headersSent.
    //
    // A spy fake, not a real server: the assertion that KILLS the mutation (swapping the order)
    // is "end was NOT called". With a real ServerResponse the write-after-end becomes an
    // ASYNCHRONOUS stream error — never thrown into the try/catch and never reaching the body —
    // and the review proved the previous version of this test survived the swap (F-tests-3).
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

    expect(() => sendErrorEnvelope(res, 500, "INTERNAL", "too late")).not.toThrow();

    // If headersSent is evaluated BEFORE writableEnded, the body branch runs and calls end() on
    // an ended response — ERR_STREAM_WRITE_AFTER_END in production.
    expect(end).not.toHaveBeenCalled();
    expect(writeHead).not.toHaveBeenCalled();
  });

  it("sendJson_does_not_write_when_response_already_ended", () => {
    // M6's AC6 requires 100% branch coverage in http.ts, and the v0.4.0 acceptance measured 90%:
    // sendJson's `writableEnded || destroyed` guard — added while fixing the review's F-arch-1 —
    // had no test. Order matters here too: ended is checked BEFORE committed.
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

    expect(() => sendJson(res, 200, { never: "written" })).not.toThrow();

    expect(end).not.toHaveBeenCalled();
    expect(writeHead).not.toHaveBeenCalled();
  });

  it("sendJson_ends_the_response_when_headers_already_sent", () => {
    // F-arch-1: merely returning left the request hanging — a silent hang in place of a noisy
    // crash. Ending is mandatory; the warning makes the caller's bug visible.
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
      sendJson(res, 200, { never: "written" });

      expect(end).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe("the uncommitted path stays intact (T1.1)", () => {
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
