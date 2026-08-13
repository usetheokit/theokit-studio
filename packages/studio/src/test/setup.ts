import { configure } from "@testing-library/react";

// Review F-tests-1: under the full suite in parallel (cold cache), router navigations can
// exceed waitFor's 1s default — findBy* failed intermittently. 5s costs nothing on green
// runs (they are event-driven) and removes the flake.
configure({ asyncUtilTimeout: 5000 });

// Testing Library's automatic cleanup is enabled by globals: true (afterEach is registered).
// CSS.escape does not exist in jsdom — @theokit/ui's loadThemeFonts uses it at runtime.
if (typeof window !== "undefined" && !window.CSS) {
  Object.defineProperty(window, "CSS", {
    value: { escape: (v: string) => v.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) },
  });
}
// matchMedia does not exist in jsdom — the design system's ThemeProvider queries it at runtime.
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

// Radix Select (Popper) uses APIs jsdom does not implement.
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// jsdom has no ResizeObserver; the Radix Slider (the playground's params panel, M7 T3.2)
// observes the track to position its thumbs. A deterministic no-op stub (the same pattern as
// @usetheo/ui's setup).
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}
