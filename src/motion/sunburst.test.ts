import { describe, expect, it } from "vitest";
import { DEFAULT_MOTION_CONFIG, areConfigsEqual, cloneMotionConfig } from "./defaults";
import { DEFAULT_PRESETS } from "./presets";
import type { MotionConfig } from "./types";
import { resolveTheme } from "../themes/resolveTheme";
import { normalTheme } from "../themes/normal";
import { blackFridayTheme } from "../themes/blackFriday";

describe("Sunburst Background Effect & Theme Separation", () => {
  it("keeps themes and background types decoupled (Theme=normal, Background=sunburst)", () => {
    // 1. Theme resolution remains clean and immutable
    expect(resolveTheme("normal")).toBe(normalTheme);
    expect(resolveTheme("black-friday")).toBe(blackFridayTheme);

    // 2. Sunburst is applied as a background effect on Normal theme
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

    expect(sunburstConfig.themeSlug).toBe("normal");
    expect(sunburstConfig.background.type).toBe("sunburst");
    expect(sunburstConfig.background.sunburst?.primaryColor).toBe("#FFB800");
    expect(sunburstConfig.background.sunburst?.secondaryColor).toBe("#FF6600");
    expect(sunburstConfig.background.sunburst?.speed).toBe(60);
    expect(sunburstConfig.background.sunburst?.raysCount).toBe(24);
  });

  it("clones sunburst background configurations without mutating originals", () => {
    const original: MotionConfig = {
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
          speed: 75,
          raysCount: 32,
          scale: 1.8,
          glowPulse: false,
        },
      },
    };

    const cloned = cloneMotionConfig(original);
    expect(cloned).toEqual(original);
    expect(cloned.background).not.toBe(original.background);
    expect(cloned.background.sunburst).not.toBe(original.background.sunburst);

    // Modifying cloned should not affect original
    if (cloned.background.sunburst) {
      cloned.background.sunburst.speed = 100;
    }
    expect(original.background.sunburst?.speed).toBe(75);
  });

  it("correctly identifies equality and differences in sunburst configurations", () => {
    const configA: MotionConfig = {
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

    const configB = cloneMotionConfig(configA);
    expect(areConfigsEqual(configA, configB)).toBe(true);

    // Difference in speed
    const configSpeedDiff: MotionConfig = {
      ...configA,
      background: {
        ...configA.background,
        sunburst: {
          ...configA.background.sunburst,
          speed: 90,
        },
      },
    };
    expect(areConfigsEqual(configA, configSpeedDiff)).toBe(false);

    // Difference in rays count
    const configRaysDiff: MotionConfig = {
      ...configA,
      background: {
        ...configA.background,
        sunburst: {
          ...configA.background.sunburst,
          raysCount: 36,
        },
      },
    };
    expect(areConfigsEqual(configA, configRaysDiff)).toBe(false);

    // Difference in background type
    const configTypeDiff: MotionConfig = {
      ...configA,
      background: {
        ...configA.background,
        type: "solid",
      },
    };
    expect(areConfigsEqual(configA, configTypeDiff)).toBe(false);
  });

  it("includes the built-in Sol Sunburst preset in DEFAULT_PRESETS", () => {
    const sunburstPreset = DEFAULT_PRESETS.find((p) => p.id === "preset-sol-sunburst");
    expect(sunburstPreset).toBeDefined();
    expect(sunburstPreset?.name).toBe("Sol Sunburst — Raios Solares");
    expect(sunburstPreset?.config.themeSlug).toBe("normal");
    expect(sunburstPreset?.config.background.type).toBe("sunburst");
    expect(sunburstPreset?.config.background.sunburst?.primaryColor).toBe("#FFB800");
    expect(sunburstPreset?.config.background.sunburst?.secondaryColor).toBe("#FF6600");
  });
});

