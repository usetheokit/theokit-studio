import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, ViteDevServer } from "vite";
import { sendErrorEnvelope, sendJson } from "./http";
import { aggregateReflection, listReflectionAgents, listReflectionSkills } from "./reflection-api";
import { handleAgentRun, matchRunPath, type RunStreamFactory } from "./run-endpoint";
import { resolveSpaDir, serveStudio } from "./static-serve";

/**
 * `@theokit/studio/plugin` — mounts the reflection API (`/_studio/api/*`) and (T2.2) the SPA
 * (`/_studio`) onto the host's Vite dev server, as connect middleware registered in
 * `configureServer` (the same pattern as theokit dev's middlewares — M1 plan, ADR D1).
 */
export interface StudioPluginOptions {
  /** the agents directory relative to the project root (theokit convention: "agents"). */
  agentsDir?: string;
  /** e2e/test seam (DIP): replaces streamAgentUIMessages in the run endpoint. */
  streamFactory?: RunStreamFactory;
}

const STUDIO_PREFIX = "/_studio";
/**
 * Prefixes the SPA NEVER serves. `/_studio/svc/*` is pinned in CLAUDE.md as the same-origin
 * proxy for the services (lens/memory/rag) and is not implemented yet — until then, the
 * contract is a typed 404, not HTML.
 */
const RESERVED_API_NAMESPACES = ["/_studio/api", "/_studio/svc"] as const;

// Version read from the fs with a dual-layout search (SEPA pre-RED T1.1; same family as EC-10):
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
        // package.json unreadable in this layout — try the next; honest fallback below.
      }
    }
  }
  return "unknown";
}

function isStudioPath(pathname: string): boolean {
  // The prefix requires "/" or end-of-string: /_studio and /_studio/... are ours; /_studioX is not.
  return pathname === STUDIO_PREFIX || pathname.startsWith(`${STUDIO_PREFIX}/`);
}

interface StudioContext {
  server: ViteDevServer;
  options: StudioPluginOptions;
  spaDir: string;
}

function loadAgents(ctx: StudioContext) {
  return listReflectionAgents({
    projectRoot: ctx.server.config.root,
    agentsDir: ctx.options.agentsDir,
    // Hot reload for free: Vite invalidates the module graph — which is why we never cache.
    load: (filePath) => ctx.server.ssrLoadModule(filePath),
  });
}

/**
 * True when the path falls in a reserved API namespace. The separator is mandatory
 * (`/_studio/svcfoo` is NOT reserved — M6 EC-7), and the exact path counts (`/_studio/svc`
 * without a trailing slash is reserved too — M6 EC-3). Same shape as mastra
 * (`index.ts:429-430`).
 */
function isReservedApiNamespace(pathname: string): boolean {
  return RESERVED_API_NAMESPACES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function handleStudioRequest(
  pathname: string,
  req: IncomingMessage,
  res: ServerResponse,
  ctx: StudioContext,
): Promise<void> {
  if (pathname === "/_studio/api/health") {
    sendJson(res, 200, { ok: true, studio: resolveStudioVersion() });
    return;
  }
  if (pathname === "/_studio/api/agents") {
    sendJson(res, 200, await loadAgents(ctx));
    return;
  }
  if (pathname === "/_studio/api/tools" || pathname === "/_studio/api/workflows") {
    // Aggregates derive from the SAME per-request compilation (never cached — hot reload).
    const { tools, workflows } = aggregateReflection((await loadAgents(ctx)).items);
    sendJson(res, 200, pathname.endsWith("tools") ? { items: tools } : { items: workflows });
    return;
  }
  if (pathname === "/_studio/api/skills") {
    sendJson(res, 200, await listReflectionSkills({ projectRoot: ctx.server.config.root }));
    return;
  }
  if (matchRunPath(pathname) !== null) {
    await handleAgentRun(pathname, req, res, {
      projectRoot: ctx.server.config.root,
      agentsDir: ctx.options.agentsDir,
      load: (filePath) => ctx.server.ssrLoadModule(filePath),
      streamFactory: ctx.options.streamFactory,
    });
    return;
  }
  // A RESERVED namespace is decided BEFORE the SPA fallback (M6 ADR A2). Without this, a path
  // under a contract prefix fell into serveStudio and the answer depended on the URL's
  // EXTENSION: /_studio/svc/x/query returned HTML 200 while /_studio/svc/x/index.json returned
  // a JSON 404 — two answers for the same documented namespace (finding #49).
  // Precedent: mastra packages/deployer/src/server/index.ts:428-435 excludes the API namespace
  // before the SPA catch-all; there it delegates to a router with next(), here we emit the
  // envelope ourselves because connect middleware has nobody to delegate to.
  if (isReservedApiNamespace(pathname)) {
    sendErrorEnvelope(res, 404, "NOT_FOUND", `no studio api route matches ${pathname}`);
    return;
  }
  // The SPA's namespace (T2.2): a known asset, otherwise the index.html fallback with the config.
  await serveStudio(pathname, res, {
    spaDir: ctx.spaDir,
    config: { mode: "live", basePath: STUDIO_PREFIX },
  });
}

/** Vite plugin: registers the Studio middleware on the host's dev server. */
export function theokitStudio(options: StudioPluginOptions = {}): Plugin {
  return {
    name: "theokit-studio",
    configureServer(server) {
      const ctx: StudioContext = {
        server,
        options,
        spaDir: resolveSpaDir({ env: process.env }),
      };
      const middleware: Connect.NextHandleFunction = (req, res, next) => {
        // EC-1 (MUST FIX): the routing decision is ALWAYS on the pathname — never on a raw req.url.
        const pathname = new URL(req.url ?? "/", "http://local").pathname;
        if (!isStudioPath(pathname)) {
          next();
          return;
        }
        handleStudioRequest(pathname, req, res, ctx).catch((error: unknown) => {
          // Last line of defence: an unhandled error becomes an envelope, never a hang or a swallow.
          sendErrorEnvelope(
            res,
            500,
            "INTERNAL",
            error instanceof Error ? error.message : String(error),
          );
        });
      };
      server.middlewares.use(middleware);
    },
  };
}
