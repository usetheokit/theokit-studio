// Cleanup automático do Testing Library é ativado por globals: true (afterEach registrado).
// CSS.escape não existe no jsdom — loadThemeFonts do @theokit/ui usa em runtime.
if (typeof window !== "undefined" && !window.CSS) {
  Object.defineProperty(window, "CSS", {
    value: { escape: (v: string) => v.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) },
  });
}
// matchMedia não existe no jsdom — ThemeProvider do design system consulta em runtime.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
