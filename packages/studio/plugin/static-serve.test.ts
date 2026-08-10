// @vitest-environment node
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveSpaDir, serveStudio } from "./static-serve";

// chmod 000 is a no-op for root (uid 0): the test would pass for the wrong reason.
const SKIP_IF_ROOT = process.getuid?.() === 0;

// Static serving da SPA (T2.2): traversal guard (decode 1× → null byte → normalize →
// prefix), SPA fallback with the config injected and escaped, actionable 503 without dist.
// Extension policy (recorded in the log): only KNOWN extensions are assets; an unknown one →
// SPA fallback (the deep link /_studio/agents/v2.support works).

interface FakeRes {
  statusCode: number | undefined;
  headers: Record<string, string>;
  body: string;
  ended: boolean;
  res: ServerResponse;
}

function makeRes(): FakeRes {
  const state: FakeRes = {
    statusCode: undefined,
    headers: {},
    body: "",
    ended: false,
    res: undefined as unknown as ServerResponse,
  };
  state.res = {
    writeHead(code: number, headers?: Record<string, string>) {
      state.statusCode = code;
      Object.assign(state.headers, headers ?? {});
      return state.res;
    },
    write(chunk: unknown) {
      state.body += String(chunk);
      return true;
    },
    end(chunk?: unknown) {
      if (chunk !== undefined) state.body += String(chunk);
      state.ended = true;
      return state.res;
    },
    get writableEnded() {
      return state.ended;
    },
    get destroyed() {
      return false;
    },
    // M6 EC-2: headersSent REFLECTS writeHead. A frozen literal would never become true and
    // would make the committed-response guard unreachable by construction (finding #68).
    get headersSent() {
      return state.statusCode !== undefined;
    },
  } as unknown as ServerResponse;
  return state;
}

const SENTINEL = "TOP-SECRET-OUTSIDE-ROOT-fc9a12";

let tmp: string;
let spaDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "studio-spa-"));
  spaDir = join(tmp, "spa");
  mkdirSync(join(spaDir, "assets"), { recursive: true });
  writeFileSync(
    join(spaDir, "index.html"),
    "<!doctype html><html><head><title>Studio</title></head><body></body></html>",
  );
  writeFileSync(join(spaDir, "assets/app.js"), "console.log('studio')");
  // Sentinel file OUTSIDE the root — it must never appear in a body.
  writeFileSync(join(tmp, "secret.txt"), SENTINEL);
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const CONFIG = { mode: "live" as const, basePath: "/_studio" };

async function serve(pathname: string) {
  const state = makeRes();
  await serveStudio(pathname, state.res, { spaDir, config: CONFIG });
  return state;
}

describe("serveStudio (T2.2)", () => {
  it("test_serves_existing_asset_with_content_type", async () => {
    const state = await serve("/_studio/assets/app.js");
    expect(state.statusCode).toBe(200);
    expect(state.headers["Content-Type"]).toContain("javascript");
    expect(state.body).toContain("console.log");
  });

  it("test_asset_with_query_string_still_resolves", async () => {
    // EC-1: the dispatcher hands over the pathname; here we ensure that resolving by known
    // extension is not confused by cache-busting suffixes already stripped.
    const state = await serve("/_studio/assets/app.js");
    expect(state.statusCode).toBe(200);
  });

  it("test_spa_fallback_serves_index_with_injected_escaped_config", async () => {
    const state = await serve("/_studio/agents");
    expect(state.statusCode).toBe(200);
    expect(state.headers["Content-Type"]).toContain("text/html");
    expect(state.headers["Cache-Control"]).toBe("no-store");
    expect(state.body).toContain("window.__STUDIO_CONFIG__");
    expect(state.body).toContain('"mode":"live"');
  });

  it("test_config_injection_escapes_script_breakout", async () => {
    // Anti </script>-breakout guardrail: a malicious basePath never closes the tag.
    const state = makeRes();
    await serveStudio("/_studio/agents", state.res, {
      spaDir,
      config: { mode: "live", basePath: "/x</script><script>alert(1)</script>" },
    });
    expect(state.body).not.toContain("</script><script>alert(1)");
    expect(state.body).toContain("\\u003c/script>");
  });

  it("test_studio_root_and_trailing_slash_serve_the_spa", async () => {
    // The root never reaches safeJoin with an empty rel (an accidental 403).
    for (const p of ["/_studio", "/_studio/"]) {
      const state = await serve(p);
      expect(state.statusCode).toBe(200);
      expect(state.body).toContain("window.__STUDIO_CONFIG__");
    }
  });

  it("test_unknown_extension_deep_link_falls_back_to_spa", async () => {
    // An agent with a dot in its name (v2.support) — the deep link is SPA, not a 404 asset.
    const state = await serve("/_studio/agents/v2.support");
    expect(state.statusCode).toBe(200);
    expect(state.body).toContain("window.__STUDIO_CONFIG__");
  });

  it("test_known_extension_missing_asset_is_404", async () => {
    const state = await serve("/_studio/assets/ghost.js");
    expect(state.statusCode).toBe(404);
  });

  it("test_path_traversal_attempts_rejected", async () => {
    for (const p of [
      "/_studio/../secret.txt",
      "/_studio/%2e%2e/secret.txt",
      "/_studio/assets/../../secret.txt",
    ]) {
      const state = await serve(p);
      expect([400, 403]).toContain(state.statusCode);
      expect(state.body).not.toContain(SENTINEL);
    }
  });

  // M8 T2.1: the `safe.kind === "forbidden"` branch of the ASSET path (static-serve.ts:150-153)
  // had no test. It is reached only when `isKnownAsset` is TRUE — i.e. a known extension — and
  // the path still escapes spaDir. The traversals in the test above use `.txt`, which is not a
  // known asset, and land in another branch.
  it("test_traversal_with_known_extension_is_forbidden", async () => {
    const state = await serve("/_studio/assets/../../../etc/passwd.js");
    expect(state.statusCode).toBe(403);
    const body = JSON.parse(state.body);
    expect(body.error.code).toBe("FORBIDDEN");
    // Review F-tests-8: BOTH forbidden branches emit 403 + FORBIDDEN; only the message
    // separates the asset path (:151) from the index path (:139). Without this line, forcing
    // `isKnownAsset = false` left the test green on the wrong branch.
    expect(body.error.message).toBe("asset path escapes the studio root");
  });

  it("test_null_byte_and_malformed_percent_rejected_400", async () => {
    const nullByte = await serve("/_studio/assets/app.js%00.png");
    expect(nullByte.statusCode).toBe(400);
    const malformed = await serve("/_studio/%zz");
    expect(malformed.statusCode).toBe(400);
    expect(malformed.body).not.toContain(SENTINEL);
  });

  it("test_missing_dist_returns_actionable_503", async () => {
    const state = makeRes();
    await serveStudio("/_studio/agents", state.res, {
      spaDir: join(tmp, "does-not-exist"),
      config: CONFIG,
    });
    expect(state.statusCode).toBe(503);
    expect(JSON.parse(state.body).error.code).toBe("STUDIO_ASSETS_MISSING");
    expect(JSON.parse(state.body).error.message).toContain("build");
  });
});

describe("resolveSpaDir (T2.2)", () => {
  it("test_env_override_wins_for_spa_dir", () => {
    const resolved = resolveSpaDir({
      env: { THEOKIT_STUDIO_DIST: spaDir },
      moduleUrl: pathToFileURL(join(tmp, "irrelevant/plugin.js")).href,
    });
    expect(resolved).toBe(spaDir);
  });

  it("test_env_override_with_trailing_slash_still_serves", async () => {
    // Regression (SEPA pre-COMMIT): a THEOKIT_STUDIO_DIST with a trailing slash must not
    // break safeJoin's prefix check (a universal 403).
    const resolved = resolveSpaDir({
      env: { THEOKIT_STUDIO_DIST: `${spaDir}/` },
      moduleUrl: pathToFileURL(join(tmp, "plugin.js")).href,
    });
    expect(resolved).toBe(spaDir);
    const state = makeRes();
    await serveStudio("/_studio/assets/app.js", state.res, { spaDir: resolved, config: CONFIG });
    expect(state.statusCode).toBe(200);
  });

  it("test_env_override_pointing_at_dead_dir_is_honored_not_fallthrough", () => {
    // The user asked for that dir explicitly — non-existent → return it as is (the serve
    // answers an actionable 503); never a silent fallthrough to the layout.
    const dead = join(tmp, "dead-dist");
    const resolved = resolveSpaDir({
      env: { THEOKIT_STUDIO_DIST: dead },
      moduleUrl: pathToFileURL(join(tmp, "plugin.js")).href,
    });
    expect(resolved).toBe(dead);
  });

  it("test_resolve_spa_dir_works_from_built_layout", () => {
    // EC-10: dist/plugin/index.js → ../spa (the published layout).
    mkdirSync(join(tmp, "dist/plugin"), { recursive: true });
    mkdirSync(join(tmp, "dist/spa"), { recursive: true });
    const resolved = resolveSpaDir({
      env: {},
      moduleUrl: pathToFileURL(join(tmp, "dist/plugin/index.js")).href,
    });
    expect(resolved).toBe(join(tmp, "dist/spa"));
  });

  it("test_resolve_spa_dir_works_from_source_layout", () => {
    // Source: plugin/index.ts -> ../dist/spa (Studio's own dev server, post-build).
    // Isolated base: the beforeEach's spa/ at the tmp root must not interfere.
    const base = join(tmp, "pkg");
    mkdirSync(join(base, "plugin"), { recursive: true });
    mkdirSync(join(base, "dist/spa"), { recursive: true });
    const resolved = resolveSpaDir({
      env: {},
      moduleUrl: pathToFileURL(join(base, "plugin/index.ts")).href,
    });
    expect(resolved).toBe(join(base, "dist/spa"));
  });
});

describe("an unreadable asset does not commit the head (T1.2)", () => {
  it.skipIf(SKIP_IF_ROOT)(
    "asset_read_failure_yields_error_envelope_not_committed_200",
    async () => {
      // EACCES is DETERMINISTIC once existsSync/statSync pass — it is not a race.
      // Committing the 200 head before the read left the 200 response truncated and, in the
      // dispatcher, killed the process (M6 findings #46/#47).
      const assetPath = join(spaDir, "locked.css");
      writeFileSync(assetPath, "body{}");
      chmodSync(assetPath, 0o000);
      const state = makeRes();

      await serveStudio("/_studio/locked.css", state.res, { spaDir, config: CONFIG });

      expect(state.statusCode).not.toBe(200);
      expect(JSON.parse(state.body).error.code).toBeDefined();
    },
  );

  it("empty_asset_still_returns_200_with_content_type", async () => {
    // EC-6: 0 bytes is a VALID asset; with the read before the head it must not become a failure.
    writeFileSync(join(spaDir, "empty.css"), "");
    const state = makeRes();

    await serveStudio("/_studio/empty.css", state.res, { spaDir, config: CONFIG });

    expect(state.statusCode).toBe(200);
    expect(state.headers["Content-Type"]).toBe("text/css; charset=utf-8");
  });
});

describe("index.html is not served as a raw asset (review F-dom-api-1)", () => {
  it("explicit_index_html_gets_the_injected_config_like_the_root", async () => {
    // /_studio and /_studio/index.html must boot the SAME product: serving the raw html would
    // deliver the index without window.__STUDIO_CONFIG__, and the bootstrap falls to fixtures.
    const root = makeRes();
    const explicit = makeRes();

    await serveStudio("/_studio", root.res, { spaDir, config: CONFIG });
    await serveStudio("/_studio/index.html", explicit.res, { spaDir, config: CONFIG });

    expect(explicit.body).toContain("__STUDIO_CONFIG__");
    expect(explicit.headers["Cache-Control"]).toBe(root.headers["Cache-Control"]);
  });
});
