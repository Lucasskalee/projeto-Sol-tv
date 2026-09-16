import { DEFAULT_PRESETS } from "./presets";
import { DEFAULT_MOTION_CONFIG, cloneMotionConfig } from "./defaults";
import type { MotionConfig, MotionPreset } from "./types";

const STORAGE_KEY = "skalee_motion_presets_v1";
const ACTIVE_PRESET_ID_KEY = "skalee_active_preset_id_v1";
const ACTIVE_CONFIG_KEY = "skalee_active_motion_config_v1";

export function loadPresets(): MotionPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First run: initialize with default presets
      savePresets([...DEFAULT_PRESETS]);
      return [...DEFAULT_PRESETS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      savePresets([...DEFAULT_PRESETS]);
      return [...DEFAULT_PRESETS];
    }
    return parsed.map((p) => ({
      ...p,
      config: cloneMotionConfig(p.config || DEFAULT_MOTION_CONFIG),
    }));
  } catch (error) {
    console.warn("[Motion Studio] Erro ao carregar presets do localStorage. Usando padrões.", error);
    return [...DEFAULT_PRESETS];
  }
}

export function savePresets(presets: MotionPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error("[Motion Studio] Erro ao gravar presets no localStorage.", error);
  }
}

export function loadActivePresetId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_PRESET_ID_KEY);
    if (saved) return saved;
  } catch {}
  const presets = loadPresets();
  return presets[0]?.id || "preset-sol-premium";
}

export function saveActivePresetId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PRESET_ID_KEY, id);
  } catch (error) {
    console.error("[Motion Studio] Erro ao salvar activePresetId:", error);
  }
}

export function loadActiveMotionConfig(): MotionConfig {
  try {
    const raw = localStorage.getItem(ACTIVE_CONFIG_KEY);
    if (raw) {
      return cloneMotionConfig(JSON.parse(raw));
    }
  } catch {}

  const activeId = loadActivePresetId();
  const presets = loadPresets();
  const activePreset = presets.find((p) => p.id === activeId) || presets[0];
  return activePreset ? cloneMotionConfig(activePreset.config) : cloneMotionConfig(DEFAULT_MOTION_CONFIG);
}

export function saveActiveMotionConfig(config: MotionConfig): void {
  try {
    localStorage.setItem(ACTIVE_CONFIG_KEY, JSON.stringify(config));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("skalee:motion-config-changed", { detail: config })
      );
    }
  } catch (error) {
    console.error("[Motion Studio] Erro ao salvar activeMotionConfig:", error);
  }
}

export function subscribeToActiveMotionConfig(
  callback: (config: MotionConfig) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<MotionConfig>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === ACTIVE_CONFIG_KEY && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch {}
    }
  };

  window.addEventListener("skalee:motion-config-changed", handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener("skalee:motion-config-changed", handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

export function upsertPreset(preset: MotionPreset): MotionPreset[] {
  const current = loadPresets();
  const existingIdx = current.findIndex((p) => p.id === preset.id);
  const now = new Date().toISOString();

  let updated: MotionPreset[];
  if (existingIdx >= 0) {
    updated = current.map((p, idx) =>
      idx === existingIdx
        ? {
            ...preset,
            updatedAt: now,
          }
        : p
    );
  } else {
    updated = [
      ...current,
      {
        ...preset,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  savePresets(updated);
  return updated;
}

export function deletePreset(id: string): MotionPreset[] {
  const current = loadPresets();
  const filtered = current.filter((p) => p.id !== id);

  // If all presets were deleted, restore defaults
  const next = filtered.length > 0 ? filtered : [...DEFAULT_PRESETS];
  savePresets(next);

  const activeId = loadActivePresetId();
  if (activeId === id) {
    saveActivePresetId(next[0].id);
    saveActiveMotionConfig(next[0].config);
  }

  return next;
}

export function duplicatePreset(
  source: MotionPreset | string,
  customName?: string
): { updatedPresets: MotionPreset[]; newPreset: MotionPreset } {
  const current = loadPresets();
  const target = typeof source === "string" ? current.find((p) => p.id === source) : source;
  if (!target) {
    return { updatedPresets: current, newPreset: current[0] };
  }

  const now = new Date().toISOString();
  const newName = customName || `${target.name} (Cópia)`;
  const newId = `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newPreset: MotionPreset = {
    id: newId,
    name: newName,
    description: target.description ? `${target.description} (Cópia)` : undefined,
    isBuiltin: false,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    config: JSON.parse(JSON.stringify(target.config)),
  };

  const updatedPresets = [...current, newPreset];
  savePresets(updatedPresets);
  return { updatedPresets, newPreset };
}

export function restoreDefaultPresets(): MotionPreset[] {
  const defaults = [...DEFAULT_PRESETS];
  savePresets(defaults);
  saveActivePresetId(defaults[0].id);
  saveActiveMotionConfig(defaults[0].config);
  return defaults;
}
