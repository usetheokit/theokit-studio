// Startup error em DOM puro (pré-React) — padrão Mastra (Blueprint §"Corner 3").
// Se o bundle/router falhar no load, o usuário vê diagnóstico em vez de tela branca.

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
