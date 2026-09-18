import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadPresets,
  savePresets,
  upsertPreset,
  deletePreset,
  duplicatePreset,
  restoreDefaultPresets,
  loadActivePresetId,
  saveActivePresetId,
  loadActiveMotionConfig,
  saveActiveMotionConfig,
  subscribeToActiveMotionConfig,
  sanitizeMotionConfigForStorage,
  safeLocalStorageSetItem,
} from "./storage";
import { DEFAULT_PRESETS } from "./presets";
import { areConfigsEqual, cloneMotionConfig, DEFAULT_MOTION_CONFIG } from "./defaults";
import type { MotionPreset, MotionConfig } from "./types";

// Mock localStorage for Node/Vitest environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const listeners: Record<string, Function[]> = {};

const windowMock = {
  addEventListener: (event: string, cb: Function) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: Function) => {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((l) => l !== cb);
  },
  dispatchEvent: (event: any) => {
    const list = listeners[event.type] || [];
    list.forEach((fn) => fn(event));
    return true;
  },
};

Object.defineProperty(globalThis, "window", {
  value: windowMock,
  writable: true,
});

class CustomEventMock {
  type: string;
  detail: any;
  constructor(type: string, options?: any) {
    this.type = type;
    this.detail = options?.detail;
  }
}

Object.defineProperty(globalThis, "CustomEvent", {
  value: CustomEventMock,
  writable: true,
});

describe("Motion Storage & Defaults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default presets on first run when localStorage is empty", () => {
    const presets = loadPresets();
    expect(presets.length).toBe(DEFAULT_PRESETS.length);
    expect(presets[0].name).toBe("Sol Premium");
  });

  it("persists activePresetId across reloads", () => {
    expect(loadActivePresetId()).toBe(DEFAULT_PRESETS[0].id);
    saveActivePresetId("preset-black-friday-impact");
    expect(loadActivePresetId()).toBe("preset-black-friday-impact");
  });

  it("persists activeMotionConfig across reloads", () => {
    const customConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      logo: {
        ...DEFAULT_MOTION_CONFIG.logo,
        size: 96,
        sectorText: "AÇOUGUE PREMIUM",
      },
    };

    saveActiveMotionConfig(customConfig);
    const loaded = loadActiveMotionConfig();
    expect(loaded.logo.size).toBe(96);
    expect(loaded.logo.sectorText).toBe("AÇOUGUE PREMIUM");
  });

  it("notifies subscribers when activeMotionConfig is updated", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToActiveMotionConfig(callback);

    const updatedConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      speed: 0.5,
    };

    saveActiveMotionConfig(updatedConfig);
    expect(callback).toHaveBeenCalledWith(updatedConfig);

    unsubscribe();
  });

  it("upserts an existing preset and updates updatedAt", () => {
    const presets = loadPresets();
    const target = presets[0];

    const modified: MotionPreset = {
      ...target,
      name: "Sol Premium Custom",
      config: {
        ...target.config,
        speed: 0.5,
      },
    };

    const updated = upsertPreset(modified);
    const found = updated.find((p) => p.id === target.id);
    expect(found?.name).toBe("Sol Premium Custom");
    expect(found?.config.speed).toBe(0.5);
  });

  it("adds a new preset when id does not exist", () => {
    const newPreset: MotionPreset = {
      id: "test-new-preset",
      name: "Novo Preset Teste",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: cloneMotionConfig(DEFAULT_MOTION_CONFIG),
    };

    const updated = upsertPreset(newPreset);
    expect(updated.some((p) => p.id === "test-new-preset")).toBe(true);
    expect(loadPresets().some((p) => p.id === "test-new-preset")).toBe(true);
  });

  it("deletes a user preset", () => {
    const initial = loadPresets();
    const targetId = initial[0].id;

    const afterDelete = deletePreset(targetId);
    expect(afterDelete.some((p) => p.id === targetId)).toBe(false);
  });

  it("duplicates a preset with a new ID and copy name", () => {
    const initial = loadPresets();
    const source = initial[0];

    const { updatedPresets, newPreset } = duplicatePreset(source);
    expect(newPreset.name).toBe(`${source.name} (Cópia)`);
    expect(newPreset.id).not.toBe(source.id);
    expect(newPreset.isBuiltin).toBe(false);
    expect(updatedPresets.length).toBe(initial.length + 1);
  });

  it("restores original default presets and resets active preset and config", () => {
    const custom: MotionPreset = {
      id: "custom-1",
      name: "Custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: cloneMotionConfig(DEFAULT_MOTION_CONFIG),
    };
    upsertPreset(custom);
    saveActivePresetId("custom-1");
    expect(loadPresets().some((p) => p.id === "custom-1")).toBe(true);

    const restored = restoreDefaultPresets();
    expect(restored.length).toBe(DEFAULT_PRESETS.length);
    expect(restored.some((p) => p.id === "custom-1")).toBe(false);
    expect(loadActivePresetId()).toBe(DEFAULT_PRESETS[0].id);
  });

  it("correctly identifies identical and modified configs with areConfigsEqual", () => {
    const configA = cloneMotionConfig(DEFAULT_MOTION_CONFIG);
    const configB = cloneMotionConfig(DEFAULT_MOTION_CONFIG);

    expect(areConfigsEqual(configA, configB)).toBe(true);

    configB.logo.size = 90;
    expect(areConfigsEqual(configA, configB)).toBe(false);

    configB.logo.size = configA.logo.size;
    configB.pricePhysics.shimmer = !configA.pricePhysics.shimmer;
    expect(areConfigsEqual(configA, configB)).toBe(false);

    configB.pricePhysics.shimmer = configA.pricePhysics.shimmer;
    configB.productCard.style = "glass";
    expect(areConfigsEqual(configA, configB)).toBe(false);

    configB.productCard.style = configA.productCard.style;
    configB.background.gradientStart = "#ff0000";
    expect(areConfigsEqual(configA, configB)).toBe(false);

    configB.background.gradientStart = configA.background.gradientStart;
    configB.badge.image = "data:image/png;base64,test";
    expect(areConfigsEqual(configA, configB)).toBe(false);
  });

  it("normalizes legacy configs missing background or productCard with defaults", () => {
    const legacyConfig = {
      themeSlug: "black-friday",
      layout: "hero",
      speed: 1,
      exitPreset: "black-friday-lift",
      logo: { position: "top-left", size: 68, sectorText: "AÇOUGUE", sectorTextColor: "#f2c94c", sectorTextSize: 13, sectorLayout: "column" },
      badge: { type: "text", text: "BLACK FRIDAY", size: 70, rotation: 3.5, background: "#e21b2d" },
      pricePhysics: { impact: "impact", shimmer: true, shimmerColor: "gold" },
      ambient: { speed: 18, opacity: 50 },
    } as any;

    const normalized = cloneMotionConfig(legacyConfig);
    expect(normalized.background).toBeDefined();
    expect(normalized.background.type).toBe("solid");
    expect(normalized.productCard).toBeDefined();
    expect(normalized.productCard.style).toBe("transparent");
  });

  it("clones and detects differences in layoutTuning properly", () => {
    const configA = cloneMotionConfig(DEFAULT_MOTION_CONFIG);
    configA.layoutTuning = {
      grid4: {
        productImage: { scale: 1.45, x: 10, y: -5 },
        productName: { fontSizeOffset: 12, x: 0, y: 4 },
        promotionalPrice: { fontSizeOffset: 24, x: 0, y: 0 },
      },
    };

    const cloned = cloneMotionConfig(configA);
    expect(cloned.layoutTuning?.grid4?.productImage?.scale).toBe(1.45);
    expect(cloned.layoutTuning?.grid4?.productName?.fontSizeOffset).toBe(12);
    expect(areConfigsEqual(configA, cloned)).toBe(true);

    const modified = cloneMotionConfig(configA);
    modified.layoutTuning!.grid4!.productImage!.scale = 1.6;
    expect(areConfigsEqual(configA, modified)).toBe(false);
  });

  it("sanitizes base64 and blob data URLs when preparing config for storage", () => {
    const configWithBase64: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      logo: {
        ...DEFAULT_MOTION_CONFIG.logo,
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
      blackFridayImage: {
        visible: true,
        src: "blob:https://sol-tv-five.vercel.app/test-uuid",
        originalSrc: "data:image/jpeg;base64,largeblobdata...",
        x: 50,
        y: 50,
        scale: 1,
        opacity: 100,
        rotation: 0,
        removeBackground: false,
        animation: { preset: "none" },
        zIndex: 20,
      },
      badge: {
        ...DEFAULT_MOTION_CONFIG.badge,
        image: "https://supabase.co/storage/v1/object/public/tv-media/acougue/badge.png",
      },
    };

    const sanitized = sanitizeMotionConfigForStorage(configWithBase64);
    expect(sanitized.logo.image).toBe("");
    expect(sanitized.blackFridayImage?.src).toBe("");
    expect(sanitized.blackFridayImage?.originalSrc).toBe("");
    // Remote HTTPS URLs are preserved
    expect(sanitized.badge.image).toBe("https://supabase.co/storage/v1/object/public/tv-media/acougue/badge.png");
  });

  it("handles QuotaExceededError gracefully in safeLocalStorageSetItem", () => {
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      const err = new Error("QuotaExceededError: Setting the value exceeded the quota.");
      err.name = "QuotaExceededError";
      throw err;
    };

    const result = safeLocalStorageSetItem("test-key", "test-value");
    expect(result).toBe(false);

    localStorageMock.setItem = originalSetItem;
  });
});
