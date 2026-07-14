import { TheoUIProvider } from "@theokit/ui";
import { Badge } from "@usetheo/ui";

export function App() {
  return (
    <TheoUIProvider theme={{ defaultTheme: "violet-forge", defaultMode: "dark" }}>
      <main data-testid="studio-smoke" className="flex min-h-screen items-center justify-center">
        <Badge>TheoKit Studio</Badge>
      </main>
    </TheoUIProvider>
  );
}
