import { createRoot } from "react-dom/client";
import { App } from "./app";
import { DataSourceProvider } from "./data/datasource";
import { createFixtureDataSource } from "./data/fixture-datasource";
import "./index.css";

// Composition root (architecture.md § 1): o único lugar que conhece o adapter concreto.
// M5: fixtures; M1 troca por adapter real via config injetada pelo host.
const dataSource = createFixtureDataSource({ scenario: "default" });

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("TheoKit Studio: elemento #root não encontrado no documento host");
}
createRoot(rootEl).render(
  <DataSourceProvider value={dataSource}>
    <App />
  </DataSourceProvider>,
);
