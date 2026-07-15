import { configure } from "@testing-library/react";

// Review F-tests-1: sob a suíte completa em paralelo (cold cache), navegações do router
// podem exceder o waitFor default de 1s — findBy* falhava de forma intermitente.
// 5s não custa nada em runs verdes (event-driven) e elimina o flake.
configure({ asyncUtilTimeout: 5000 });

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

// Radix Select (Popper) usa APIs que o jsdom não implementa.
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// jsdom não tem ResizeObserver; o Radix Slider (painel de params do playground,
// M7 T3.2) observa o track para posicionar thumbs. Stub no-op determinístico
// (mesmo padrão do setup da @usetheo/ui).
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}
