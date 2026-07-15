import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, ViteDevServer } from "vite";
import { sendErrorEnvelope, sendJson } from "./http";
import { aggregateReflection, listReflectionAgents, listReflectionSkills } from "./reflection-api";
import { handleAgentRun, matchRunPath, type RunStreamFactory } from "./run-endpoint";

/**
 * `@theokit/studio/plugin` — monta a reflection API (`/_studio/api/*`) e (T2.2) a SPA
 * (`/_studio`) no dev server Vite do host, como connect middleware registrado em
 * `configureServer` (mesmo padrão dos middlewares do theokit dev — plano M1, ADR D1).
 */
export interface StudioPluginOptions {
  /** diretório dos agents relativo ao project root (convenção theokit: "agents"). */
  agentsDir?: string;
  /** seam de e2e/teste (DIP): substitui streamAgentUIMessages no run endpoint. */
  streamFactory?: RunStreamFactory;
}

const STUDIO_PREFIX = "/_studio";
const API_PREFIX = "/_studio/api/";

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

interface StudioContext {
  server: ViteDevServer;
  options: StudioPluginOptions;
}

function loadAgents(ctx: StudioContext) {
  return listReflectionAgents({
    projectRoot: ctx.server.config.root,
    agentsDir: ctx.options.agentsDir,
    // Hot-reload grátis: o Vite invalida o module graph — por isso nunca cacheamos.
    load: (filePath) => ctx.server.ssrLoadModule(filePath),
  });
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
    // Agregados derivam da MESMA compilação por request (nunca cacheada — hot-reload).
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
export function theokitStudio(options: StudioPluginOptions = {}): Plugin {
  return {
    name: "theokit-studio",
    configureServer(server) {
      const ctx: StudioContext = { server, options };
      const middleware: Connect.NextHandleFunction = (req, res, next) => {
        // EC-1 (MUST FIX): decisão de rota SEMPRE sobre o pathname — nunca req.url cru.
        const pathname = new URL(req.url ?? "/", "http://local").pathname;
        if (!isStudioPath(pathname)) {
          next();
          return;
        }
        handleStudioRequest(pathname, req, res, ctx).catch((error: unknown) => {
          // Última linha de defesa: erro não-tratado vira envelope, nunca hang/swallow.
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
