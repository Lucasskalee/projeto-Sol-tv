import { normalTheme } from "./normal";
import { themeRegistry } from "./registry";
import type { ThemeDefinition, ThemeRegistry } from "./types";

function isThemeDefinition(value: unknown): value is ThemeDefinition {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ThemeDefinition>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    (candidate.category === "default" || candidate.category === "special") &&
    Boolean(candidate.tokens) &&
    typeof candidate.tokens?.transitionPreset === "string"
  );
}

export function resolveTheme(
  slug: string | null | undefined = normalTheme.slug,
  registry: ThemeRegistry = themeRegistry,
): ThemeDefinition {
  const candidate = typeof slug === "string" ? registry[slug] : undefined;
  return isThemeDefinition(candidate) ? candidate : normalTheme;
}

export function getSectorThemeSlug(sector: string): string {
  try {
    return localStorage.getItem(`sol_tv_theme_${sector.toLowerCase()}`) || normalTheme.slug;
  } catch {
    return normalTheme.slug;
  }
}

export function setSectorThemeSlug(sector: string, slug: string): void {
  try {
    const normalized = sector.toLowerCase();
    localStorage.setItem(`sol_tv_theme_${normalized}`, slug);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sol_tv_theme_changed", {
          detail: { sector: normalized, slug },
        }),
      );
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function subscribeToSectorTheme(
  sector: string,
  onThemeChange: (theme: ThemeDefinition) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const normalizedSector = sector.toLowerCase();

  function handleStorage(event: StorageEvent) {
    if (event.key === `sol_tv_theme_${normalizedSector}` && event.newValue) {
      onThemeChange(resolveTheme(event.newValue));
    }
  }

  function handleCustomEvent(event: Event) {
    const customEvent = event as CustomEvent<{ sector: string; slug: string }>;
    if (customEvent.detail?.sector === normalizedSector) {
      onThemeChange(resolveTheme(customEvent.detail.slug));
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener("sol_tv_theme_changed", handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("sol_tv_theme_changed", handleCustomEvent);
  };
}
