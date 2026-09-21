import { describe, expect, it } from "vitest";
import { DEFAULT_MOTION_CONFIG, areConfigsEqual, cloneMotionConfig } from "./defaults";
import { DEFAULT_PRESETS } from "./presets";
import type { MotionConfig } from "./types";
import { resolveTheme } from "../themes/resolveTheme";
import { normalTheme } from "../themes/normal";
import { blackFridayTheme } from "../themes/blackFriday";
import { sanitizeMotionConfigForStorage } from "./storage";

describe("Sunburst Background Effect — Matriz Completa de Validação", () => {
  it("1. Valida Tema Normal sem Sunburst (fundo sólido e gradiente clássico)", () => {
    const normalSolidConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      themeSlug: "normal",
      background: {
        type: "solid",
        color: "#080a0e",
        gradientStart: "#141822",
        gradientEnd: "#07090c",
        gradientAngle: 150,
      },
    };

    expect(resolveTheme(normalSolidConfig.themeSlug)).toBe(normalTheme);
    expect(normalSolidConfig.background.type).toBe("solid");
    expect(normalSolidConfig.background.sunburst).toBeUndefined();

    const normalGradConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      themeSlug: "normal",
      background: {
        type: "gradient",
        color: "#080a0e",
        gradientStart: "#1a0407",
        gradientEnd: "#050608",
        gradientAngle: 135,
      },
    };

    expect(normalGradConfig.background.type).toBe("gradient");
  });

  it("2. Valida Tema Normal com Sunburst (raios amarelo e laranja)", () => {
    const sunburstConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      themeSlug: "normal",
      background: {
        type: "sunburst",
        color: "#FF8C00",
        gradientStart: "#FFB800",
        gradientEnd: "#FF6600",
        gradientAngle: 135,
        sunburst: {
          primaryColor: "#FFB800",
          secondaryColor: "#FF6600",
          speed: 60,
          raysCount: 24,
          scale: 1.5,
          glowPulse: true,
        },
      },
    };

    expect(resolveTheme(sunburstConfig.themeSlug)).toBe(normalTheme);
    expect(sunburstConfig.background.type).toBe("sunburst");
    expect(sunburstConfig.background.sunburst?.primaryColor).toBe("#FFB800");
    expect(sunburstConfig.background.sunburst?.secondaryColor).toBe("#FF6600");
    expect(sunburstConfig.background.sunburst?.speed).toBe(60);
    expect(sunburstConfig.background.sunburst?.raysCount).toBe(24);
    expect(sunburstConfig.background.sunburst?.scale).toBe(1.5);
    expect(sunburstConfig.background.sunburst?.glowPulse).toBe(true);
  });

  it("3. Valida Tema Black Friday existente intacto", () => {
    const bfConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      themeSlug: "black-friday",
      background: {
        type: "solid",
        color: "#F7F6F2",
        gradientStart: "#FFFFFF",
        gradientEnd: "#F7F6F2",
        gradientAngle: 135,
      },
    };

    const resolved = resolveTheme(bfConfig.themeSlug);
    expect(resolved).toBe(blackFridayTheme);
    expect(resolved.id).toBe("black-friday");
    expect(resolved.tokens.colors.danger).toBe("#F2381E");
    expect(resolved.tokens.badge.label).toBe("BLACK FRIDAY");
    expect(bfConfig.background.type).toBe("solid");
  });

  it("4. Valida Tema Black Friday com Sunburst reaproveitável", () => {
    // Demonstra a arquitetura desacoplada onde Black Friday pode usar Sunburst no futuro
    const bfSunburstConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      themeSlug: "black-friday",
      background: {
        type: "sunburst",
        color: "#111111",
        gradientStart: "#333333",
        gradientEnd: "#111111",
        gradientAngle: 135,
        sunburst: {
          primaryColor: "#333333",
          secondaryColor: "#111111",
          speed: 80,
          raysCount: 32,
          scale: 1.2,
          glowPulse: false,
        },
      },
    };

    expect(resolveTheme(bfSunburstConfig.themeSlug)).toBe(blackFridayTheme);
    expect(bfSunburstConfig.background.type).toBe("sunburst");
    expect(bfSunburstConfig.background.sunburst?.primaryColor).toBe("#333333");
    expect(bfSunburstConfig.background.sunburst?.secondaryColor).toBe("#111111");
  });

  it("5. Valida sanitização de armazenamento JSONB sem perda de tokens de Sunburst", () => {
    const sunburstConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      themeSlug: "normal",
      background: {
        type: "sunburst",
        color: "#FF8C00",
        gradientStart: "#FFB800",
        gradientEnd: "#FF6600",
        gradientAngle: 135,
        imageUrl: "data:image/png;base64,largeEphemeralGarbageDataToStrip",
        sunburst: {
          primaryColor: "#FFB800",
          secondaryColor: "#FF6600",
          speed: 60,
          raysCount: 24,
          scale: 1.5,
          glowPulse: true,
        },
      },
    };

    const sanitized = sanitizeMotionConfigForStorage(sunburstConfig);
    // Huge data url removed
    expect(sanitized.background.imageUrl).toBe("");
    // Sunburst configuration completely preserved
    expect(sanitized.background.type).toBe("sunburst");
    expect(sanitized.background.sunburst).toEqual({
      primaryColor: "#FFB800",
      secondaryColor: "#FF6600",
      speed: 60,
      raysCount: 24,
      scale: 1.5,
      glowPulse: true,
    });
  });

  it("6. Valida detecção de igualdade e dirty check no MotionStudio", () => {
    const baseConfig: MotionConfig = {
      ...DEFAULT_MOTION_CONFIG,
      background: {
        type: "sunburst",
        color: "#FF8C00",
        gradientStart: "#FFB800",
        gradientEnd: "#FF6600",
        gradientAngle: 135,
        sunburst: {
          primaryColor: "#FFB800",
          secondaryColor: "#FF6600",
          speed: 60,
          raysCount: 24,
          scale: 1.5,
          glowPulse: true,
        },
      },
    };

    const cloneA = cloneMotionConfig(baseConfig);
    expect(areConfigsEqual(baseConfig, cloneA)).toBe(true);

    const modifiedPrimary = cloneMotionConfig(baseConfig);
    if (modifiedPrimary.background.sunburst) {
      modifiedPrimary.background.sunburst.primaryColor = "#F59E0B";
    }
    expect(areConfigsEqual(baseConfig, modifiedPrimary)).toBe(false);

    const modifiedGlow = cloneMotionConfig(baseConfig);
    if (modifiedGlow.background.sunburst) {
      modifiedGlow.background.sunburst.glowPulse = false;
    }
    expect(areConfigsEqual(baseConfig, modifiedGlow)).toBe(false);
  });
});

