import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin } from "vite";

/**
 * `@theokit/studio/plugin` — monta a reflection API (`/_studio/api/*`) e (T2.2) a SPA
 * (`/_studio`) no dev server Vite do host, como connect middleware registrado em
 * `configureServer` (mesmo padrão dos middlewares do theokit dev — plano M1, ADR D1).
 */
export interface StudioPluginOptions {
  /** diretório dos agents relativo ao project root (convenção theokit: "agents"). */
  agentsDir?: string;
}

const STUDIO_PREFIX = "/_studio";
const API_PREFIX = "/_studio/api/";

// Envelope de erro canônico de TODOS os handlers do plugin (contrato nasce aqui —
// T1.2/T1.4/T2.2 importam quando forem extraídos; exportar só no 2º consumidor, YAGNI).
function sendErrorEnvelope(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
): void {
  if (res.writableEnded) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { code, message } }));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.writableEnded) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// Versão lida via fs com busca dual-layout (SEPA pre-RED T1.1; mesma família do EC-10):
// source  → plugin/index.ts      → ../package.json
// buildado → dist/plugin/index.js → ../../package.json
function resolveStudioVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const rel of ["../package.json", "../../package.json"]) {
    const candidate = join(here, rel);
    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, "utf8")) as { version?: string };
        if (typeof parsed.version === "string") return parsed.version;
      } catch {
        // package.json ilegível neste layout — tenta o próximo; fallback honesto abaixo.
      }
    }
  }
  return "unknown";
}

function isStudioPath(pathname: string): boolean {
  // Prefixo exige "/" ou fim: /_studio e /_studio/... são nossos; /_studioX não.
  return pathname === STUDIO_PREFIX || pathname.startsWith(`${STUDIO_PREFIX}/`);
}

function handleStudioRequest(req: IncomingMessage, res: ServerResponse): void {
  // EC-1 (MUST FIX): toda decisão de rota usa o pathname — nunca req.url cru (query).
  const pathname = new URL(req.url ?? "/", "http://local").pathname;

  if (pathname === "/_studio/api/health") {
    sendJson(res, 200, { ok: true, studio: resolveStudioVersion() });
    return;
  }
  if (pathname.startsWith(API_PREFIX)) {
    sendErrorEnvelope(res, 404, "NOT_FOUND", `no studio api route matches ${pathname}`);
    return;
  }
  // Namespace da SPA — o static serving chega em T2.2; até lá, 404 honesto com hint.
  sendErrorEnvelope(
    res,
    404,
    "NOT_FOUND",
    `studio SPA serving not mounted yet for ${pathname} (arrives with the embedded dist)`,
  );
}

/** Plugin Vite: registra o middleware do Studio no dev server do host. */
export function theokitStudio(_options: StudioPluginOptions = {}): Plugin {
  return {
    name: "theokit-studio",
    configureServer(server) {
      const middleware: Connect.NextHandleFunction = (req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://local").pathname;
        if (!isStudioPath(pathname)) {
          next();
          return;
        }
        handleStudioRequest(req, res);
      };
      server.middlewares.use(middleware);
    },
  };
}
