// Startup error in plain DOM (pre-React) — the Mastra pattern (Blueprint §"Corner 3").
// If the bundle/router fails to load, the user sees a diagnostic instead of a blank screen.

export interface StartupErrorOptions {
  mode?: string;
}

export function renderStartupError(error: unknown, options: StartupErrorOptions = {}): void {
  const mode = options.mode ?? "production";
  const root = document.getElementById("root") ?? document.body;
  const main = document.createElement("main");
  main.setAttribute("role", "alert");
  main.style.cssText = "font-family: monospace; padding: 2rem; color: #f66;";

  const title = document.createElement("h1");
  title.textContent = "TheoKit Studio failed to start";
  main.appendChild(title);

  const detail = document.createElement("pre");
  detail.style.cssText = "white-space: pre-wrap; color: #ccc;";
  if (mode === "development" || mode === "test") {
    detail.textContent =
      error instanceof Error ? `${error.message}\n\n${error.stack ?? ""}` : String(error);
  } else {
    detail.textContent = "Run Studio in development mode to view detailed diagnostics.";
  }
  main.appendChild(detail);

  root.replaceChildren(main);
}
