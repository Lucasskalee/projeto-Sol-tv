import { beforeEach, describe, expect, it } from "vitest";
import { normalTheme } from "./normal";
import { resolveTheme, getSectorThemeSlug, setSectorThemeSlug, subscribeToSectorTheme } from "./resolveTheme";
import { themeRegistry } from "./registry";
import { blackFridayTheme } from "./blackFriday";

describe("resolveTheme", () => {
  it("returns the registered normal theme by default", () => {
    expect(resolveTheme()).toBe(normalTheme);
    expect(resolveTheme("normal")).toBe(themeRegistry.normal);
  });

  it("registers and resolves the Black Friday theme", () => {
    expect(Object.keys(themeRegistry)).toEqual(["normal", "black-friday"]);
    expect(resolveTheme("black-friday")).toBe(blackFridayTheme);
    expect(resolveTheme("black-friday").category).toBe("special");
  });

  it.each([undefined, null, "", "unknown"])(
    "falls back to normal for an unavailable slug (%s)",
    (slug) => {
      expect(resolveTheme(slug)).toBe(normalTheme);
    },
  );

  it("falls back to normal when a registry entry is malformed", () => {
    const invalidRegistry = {
      broken: { id: "broken", slug: "broken", name: "Broken" },
    } as unknown as typeof themeRegistry;

    expect(resolveTheme("broken", invalidRegistry)).toBe(normalTheme);
  });

  it("keeps the local fallback immutable", () => {
    expect(Object.isFrozen(normalTheme)).toBe(true);
    expect(Object.isFrozen(normalTheme.tokens)).toBe(true);
    expect(Object.isFrozen(normalTheme.tokens.colors)).toBe(true);
  });

  it("keeps the Black Friday theme immutable and token-complete", () => {
    expect(Object.isFrozen(blackFridayTheme)).toBe(true);
    expect(Object.isFrozen(blackFridayTheme.tokens)).toBe(true);
    expect(Object.isFrozen(blackFridayTheme.tokens.colors)).toBe(true);
    expect(blackFridayTheme.tokens.colors.accent).toBe("#FFBE00");
    expect(blackFridayTheme.tokens.colors.danger).toBe("#F2381E");
    expect(blackFridayTheme.tokens.badge.label).toBe("BLACK FRIDAY");
  });
});

describe("Sector theme persistence and synchronization", () => {
  let mockStore: Record<string, string> = {};
  let listeners: Record<string, Array<(e: unknown) => void>> = {};

  beforeEach(() => {
    mockStore = {};
    listeners = {};

    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val;
      },
      clear: () => {
        mockStore = {};
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
    };

    const mockWindow = {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener: (type: string, fn: (e: unknown) => void) => {
        if (!listeners[type]) return;
        listeners[type] = listeners[type].filter((cb) => cb !== fn);
      },
      dispatchEvent: (event: { type: string; detail?: unknown }) => {
        const cbs = listeners[event.type] || [];
        cbs.forEach((cb) => cb(event));
        return true;
      },
    };

    (globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;
    (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;
    (globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class CustomEvent {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
  });

  it("defaults to normal theme for unset sector", () => {
    expect(getSectorThemeSlug("acougue")).toBe("normal");
  });

  it("stores and retrieves sector theme", () => {
    setSectorThemeSlug("acougue", "black-friday");
    expect(getSectorThemeSlug("acougue")).toBe("black-friday");
    expect(mockStore["sol_tv_theme_acougue"]).toBe("black-friday");
  });

  it("notifies listeners on local setSectorThemeSlug", () => {
    const received: string[] = [];
    const unsubscribe = subscribeToSectorTheme("acougue", (t) => {
      received.push(t.slug);
    });

    setSectorThemeSlug("acougue", "black-friday");
    setSectorThemeSlug("padaria", "black-friday"); // Should not trigger for acougue listener
    setSectorThemeSlug("acougue", "normal");

    unsubscribe();
    setSectorThemeSlug("acougue", "black-friday"); // After unsubscribe

    expect(received).toEqual(["black-friday", "normal"]);
  });
});
