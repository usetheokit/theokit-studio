import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("TheoKit Studio: elemento #root não encontrado no documento host");
}
createRoot(rootEl).render(<App />);
