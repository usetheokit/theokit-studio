import { TheoUIProvider } from "@theokit/ui";
import type { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router";
import { RunLogProvider } from "./app/run-log";

type StudioRouter = ReturnType<typeof createBrowserRouter>;

export function App({ router }: { router: StudioRouter }) {
  return (
    <TheoUIProvider theme={{ defaultTheme: "violet-forge", defaultMode: "dark" }}>
      <RunLogProvider>
        <RouterProvider router={router} />
      </RunLogProvider>
    </TheoUIProvider>
  );
}
