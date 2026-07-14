import { TheoUIProvider } from "@theokit/ui";
import type { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router";

type StudioRouter = ReturnType<typeof createBrowserRouter>;

export function App({ router }: { router: StudioRouter }) {
  return (
    <TheoUIProvider theme={{ defaultTheme: "violet-forge", defaultMode: "dark" }}>
      <RouterProvider router={router} />
    </TheoUIProvider>
  );
}
