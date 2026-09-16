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
});
