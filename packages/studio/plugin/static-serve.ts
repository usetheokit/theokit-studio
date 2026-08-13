import { existsSync, readFileSync, statSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { sendErrorEnvelope } from "./http";

/**
 * Static serving of the embedded SPA (T2.2, ADR D2 — Mastra pattern): assets by KNOWN
 * extension; any other path under /_studio → SPA fallback (index.html with the config
 * injected). Policy recorded in the log: an unknown extension is a deep link, not an asset —
 * an agent named "v2.support" stays navigable.
 */

const STUDIO_PREFIX = "/_studio";

// Only what the built SPA actually emits (dev-only; minimal map, KISS).
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
  /** test seam (EC-10): defaults to the module's import.meta.url in production. */
  moduleUrl?: string;
}

/**
 * Resolves the SPA directory: an env override ALWAYS wins (even when it points at a dead
 * dir — the serve answers an actionable 503; a silent fallthrough would lie about the user's
 * explicit choice). Without an override: dual layout (dist/plugin → ../spa; source plugin/ →
 * ../dist/spa — same family as resolveStudioVersion).
 */
export function resolveSpaDir(opts: ResolveSpaDirOptions): string {
  const override = opts.env.THEOKIT_STUDIO_DIST;
  if (override !== undefined && override.length > 0) {
    // normalize(join(x, ".")) strips the trailing slash — without it, safeJoin's prefix
    // check would become "root//" and EVERY request would answer 403 (SEPA pre-COMMIT T2.2).
    return normalize(join(override, "."));
  }
  const here = dirname(fileURLToPath(opts.moduleUrl ?? import.meta.url));
  for (const rel of ["../spa", "../dist/spa"]) {
    const candidate = join(here, rel);
    if (existsSync(candidate)) return candidate;
  }
  // No layout found — return the published layout; the serve answers 503 with a hint.
  return join(here, "../spa");
}

type SafeJoinResult =
  | { kind: "ok"; path: string }
  | { kind: "bad-request" }
  | { kind: "forbidden" };

// Fixed order (SEPA T2.2): decode once (URIError → 400) → null byte (400) → normalize →
// prefix check spaDir+sep (403). Decoding exactly once stops %252e%252e becoming traversal.
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
  /** injected into index.html as window.__STUDIO_CONFIG__ (escaped against breakout). */
  config: { mode: "fixtures" | "live"; basePath: string };
}

function serveIndexWithConfig(res: ServerResponse, opts: ServeStudioOptions): void {
  const indexPath = join(opts.spaDir, "index.html");
  const html = readFileSync(indexPath, "utf8");
  // Anti </script>-breakout escape: '<' never raw inside the JSON (one-line guardrail).
  const json = JSON.stringify(opts.config).replace(/</g, "\\u003c");
  const script = `<script>window.__STUDIO_CONFIG__=${json}</script>`;
  let injected: string;
  if (html.includes("</head>")) {
    injected = html.replace("</head>", `${script}</head>`);
  } else {
    // EC-13: an index with no </head> (custom build) — prepend with a warning, never without config.
    console.warn("TheoKit Studio: index.html without </head> — prepending config script");
    injected = script + html;
  }
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    // The config changes per dev-server boot — the injected index is NEVER cached.
    "Cache-Control": "no-store",
  });
  res.end(injected);
}

/** Serves a path under /_studio: known asset, SPA fallback, or a typed error. */
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
  // The root and paths without a known extension are SPA deep links — they never go through
  // the asset safeJoin (join(spaDir, "") would lack the spaDir+sep prefix → a false 403).
  const ext = extname(rel);
  // `.html` is NOT an asset: serving it raw would deliver the index WITHOUT the injected
  // config, and the bootstrap (src/bootstrap.ts) falls back to fixtures when
  // `window.__STUDIO_CONFIG__` is absent — i.e. /_studio and /_studio/index.html would boot
  // DIFFERENT PRODUCTS. That is the same by-extension divergence this milestone exists to
  // eliminate, on the most guessable path of all (review F-dom-api-1). All HTML goes through
  // the fallback that injects the config.
  const isKnownAsset = rel.length > 0 && ext in CONTENT_TYPES && ext !== ".html";
  if (!isKnownAsset) {
    // Validate the path anyway (null byte / encoding) before falling back.
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
  // READ BEFORE COMMITTING THE HEAD (M6 T1.2). existsSync + statSync passing does NOT
  // guarantee a read: EACCES is deterministic on a file without permission. Committing the 200
  // first left the response truncated and the throw rose to the dispatcher's .catch(), killing
  // the process. `serveIndexWithConfig` (:85→:98) already read first — this was the only site
  // off the pattern.
  let content: Buffer;
  try {
    content = readFileSync(safe.path);
  } catch (error) {
    sendErrorEnvelope(
      res,
      500,
      "ASSET_READ_FAILED",
      `could not read studio asset at ${pathname}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream" });
  res.end(content);
}
