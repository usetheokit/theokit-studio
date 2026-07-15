import { existsSync, readFileSync, statSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { sendErrorEnvelope } from "./http";

/**
 * Static serving da SPA embarcada (T2.2, ADR D2 — padrão Mastra): assets por extensão
 * CONHECIDA; qualquer outro path sob /_studio → fallback SPA (index.html com o config
 * injetado). Política registrada no log: extensão desconhecida é deep-link, não asset —
 * um agent chamado "v2.support" continua navegável.
 */

const STUDIO_PREFIX = "/_studio";

// Só o que a SPA buildada realmente emite (dev-only; mapa mínimo, KISS).
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".map": "application/json",
  ".woff2": "font/woff2",
};

export interface ResolveSpaDirOptions {
  env: Record<string, string | undefined>;
  /** seam de teste (EC-10): default import.meta.url do módulo em produção. */
  moduleUrl?: string;
}

/**
 * Resolve o diretório da SPA: env override SEMPRE vence (mesmo apontando para dir
 * morto — o serve responde 503 acionável; fallthrough silencioso mentiria sobre a
 * escolha explícita do usuário). Sem override: dual-layout (dist/plugin → ../spa;
 * source plugin/ → ../dist/spa — mesma família do resolveStudioVersion).
 */
export function resolveSpaDir(opts: ResolveSpaDirOptions): string {
  const override = opts.env.THEOKIT_STUDIO_DIST;
  if (override !== undefined && override.length > 0) {
    // normalize(join(x, ".")) remove trailing slash — sem isso, o prefix check do
    // safeJoin viraria "root//" e TODO request responderia 403 (SEPA pre-COMMIT T2.2).
    return normalize(join(override, "."));
  }
  const here = dirname(fileURLToPath(opts.moduleUrl ?? import.meta.url));
  for (const rel of ["../spa", "../dist/spa"]) {
    const candidate = join(here, rel);
    if (existsSync(candidate)) return candidate;
  }
  // Nenhum layout encontrado — devolve o layout publicado; o serve responde 503 com hint.
  return join(here, "../spa");
}

type SafeJoinResult =
  | { kind: "ok"; path: string }
  | { kind: "bad-request" }
  | { kind: "forbidden" };

// Ordem fixa (SEPA T2.2): decode 1× (URIError → 400) → null byte (400) → normalize →
// prefix check spaDir+sep (403). Decode único evita que %252e%252e vire traversal.
function safeJoin(spaDir: string, relPath: string): SafeJoinResult {
  let decoded: string;
  try {
    decoded = decodeURIComponent(relPath);
  } catch {
    return { kind: "bad-request" };
  }
  if (decoded.includes("\0")) return { kind: "bad-request" };
  const resolved = normalize(join(spaDir, decoded));
  if (!resolved.startsWith(spaDir + sep)) return { kind: "forbidden" };
  return { kind: "ok", path: resolved };
}

export interface ServeStudioOptions {
  spaDir: string;
  /** injetado no index.html como window.__STUDIO_CONFIG__ (escapado anti-breakout). */
  config: { mode: "fixtures" | "live"; basePath: string };
}

function serveIndexWithConfig(res: ServerResponse, opts: ServeStudioOptions): void {
  const indexPath = join(opts.spaDir, "index.html");
  const html = readFileSync(indexPath, "utf8");
  // Escape anti </script>-breakout: '<' nunca cru dentro do JSON (guardrail, 1 linha).
  const json = JSON.stringify(opts.config).replace(/</g, "\\u003c");
  const script = `<script>window.__STUDIO_CONFIG__=${json}</script>`;
  let injected: string;
  if (html.includes("</head>")) {
    injected = html.replace("</head>", `${script}</head>`);
  } else {
    // EC-13: index sem </head> (build custom) — prepend com warn, nunca sem config.
    console.warn("TheoKit Studio: index.html without </head> — prepending config script");
    injected = script + html;
  }
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    // Config muda por boot do dev server — index injetado NUNCA cacheado.
    "Cache-Control": "no-store",
  });
  res.end(injected);
}

/** Serve um path sob /_studio: asset conhecido, fallback SPA, ou erro tipado. */
export async function serveStudio(
  pathname: string,
  res: ServerResponse,
  opts: ServeStudioOptions,
): Promise<void> {
  if (!existsSync(join(opts.spaDir, "index.html"))) {
    sendErrorEnvelope(
      res,
      503,
      "STUDIO_ASSETS_MISSING",
      `studio SPA dist not found at ${opts.spaDir} — run the @theokit/studio build (pnpm --filter @theokit/studio build) or set THEOKIT_STUDIO_DIST`,
    );
    return;
  }
  const rel = pathname.slice(STUDIO_PREFIX.length).replace(/^\/+/, "");
  // Raiz e paths sem extensão conhecida são deep-links da SPA — nunca passam no
  // safeJoin de asset (join(spaDir, "") não teria o prefixo spaDir+sep → 403 falso).
  const ext = extname(rel);
  const isKnownAsset = rel.length > 0 && ext in CONTENT_TYPES;
  if (!isKnownAsset) {
    // Valida o path mesmo assim (null byte / encoding) antes do fallback.
    const check = safeJoin(opts.spaDir, rel.length === 0 ? "index.html" : rel);
    if (check.kind === "bad-request") {
      sendErrorEnvelope(res, 400, "BAD_REQUEST", "malformed path");
      return;
    }
    if (check.kind === "forbidden") {
      sendErrorEnvelope(res, 403, "FORBIDDEN", "path escapes the studio root");
      return;
    }
    serveIndexWithConfig(res, opts);
    return;
  }
  const safe = safeJoin(opts.spaDir, rel);
  if (safe.kind === "bad-request") {
    sendErrorEnvelope(res, 400, "BAD_REQUEST", "malformed asset path");
    return;
  }
  if (safe.kind === "forbidden") {
    sendErrorEnvelope(res, 403, "FORBIDDEN", "asset path escapes the studio root");
    return;
  }
  if (!existsSync(safe.path) || !statSync(safe.path).isFile()) {
    sendErrorEnvelope(res, 404, "NOT_FOUND", `no studio asset at ${pathname}`);
    return;
  }
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
  res.end(readFileSync(safe.path));
}
