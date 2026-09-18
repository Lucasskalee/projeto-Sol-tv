import React, { useMemo } from "react";
import type { FireSparksIntensity, FireSparksPerformance } from "../../motion/types";

export interface FireSparksProps {
  enabled?: boolean;
  intensity?: FireSparksIntensity;
  particleCount?: number;
  speed?: number;
  size?: number;
  bottomGlow?: boolean;
  bottomGlowOpacity?: number;
  maxHeight?: number;
  performance?: FireSparksPerformance;
  zIndex?: number;
  className?: string;
}

export type SparkTier = "small" | "medium" | "strong";

export interface SparkParticle {
  id: number;
  tier: SparkTier;
  x: number; // percentage 0-100
  size: number; // in px
  duration: number; // in seconds
  delay: number; // in seconds (negative for immediate stagger)
  drift: number; // lateral displacement at top (px)
  driftMid: number; // lateral displacement at midpoint (px)
  peakOpacity: number;
  glowSpread: number;
}

const PRESET_VALUES: Record<
  Exclude<FireSparksIntensity, "custom">,
  {
    particleCount: number;
    speed: number;
    size: number;
    bottomGlowOpacity: number;
    maxHeight: number;
  }
> = {
  subtle: {
    particleCount: 16,
    speed: 0.85,
    size: 0.8,
    bottomGlowOpacity: 16,
    maxHeight: 90,
  },
  commercial: {
    particleCount: 26,
    speed: 1.0,
    size: 1.0,
    bottomGlowOpacity: 25,
    maxHeight: 105,
  },
  "fire-sale": {
    particleCount: 38,
    speed: 1.25,
    size: 1.2,
    bottomGlowOpacity: 45,
    maxHeight: 110,
  },
};

export function FireSparks({
  enabled = true,
  intensity = "commercial",
  particleCount,
  speed,
  size,
  bottomGlow = true,
  bottomGlowOpacity,
  maxHeight,
  performance = "normal",
  zIndex = 2,
  className = "",
}: FireSparksProps) {
  if (!enabled) {
    return null;
  }

  // Resolve presets vs custom overrides
  const preset = intensity !== "custom" ? PRESET_VALUES[intensity] : PRESET_VALUES.commercial;
  const rawCount = particleCount ?? preset.particleCount;
  const effectiveCount = performance === "low" ? Math.min(rawCount, 14) : Math.min(Math.max(rawCount, 6), 55);
  const effectiveSpeed = speed ?? preset.speed;
  const effectiveSize = size ?? preset.size;
  const effectiveGlowOpacity = bottomGlowOpacity ?? preset.bottomGlowOpacity;
  const effectiveMaxHeight = maxHeight ?? preset.maxHeight;

  // Generate deterministic particles (no re-randomization on renders)
  const particles: SparkParticle[] = useMemo(() => {
    const list: SparkParticle[] = [];

    for (let i = 0; i < effectiveCount; i++) {
      // 3 Tiers: ~15% strong, ~45% medium, ~40% small
      let tier: SparkTier = "medium";
      if (i % 7 === 0) {
        tier = "strong";
      } else if (i % 2 === 0) {
        tier = "small";
      }

      // Base metrics per tier
      let baseSize = 2.8;
      let baseDuration = 4.8;
      let peakOpacity = 0.88;
      let glowSpread = 8;

      if (tier === "small") {
        baseSize = 1.4 + (i % 3) * 0.3;
        baseDuration = 6.2 + (i % 4) * 0.5;
        peakOpacity = 0.58 + (i % 3) * 0.08;
        glowSpread = 5;
      } else if (tier === "medium") {
        baseSize = 2.4 + (i % 3) * 0.4;
        baseDuration = 4.2 + (i % 5) * 0.4;
        peakOpacity = 0.85 + (i % 3) * 0.05;
        glowSpread = 8;
      } else {
        // Strong spark: larger, faster, intense glow
        baseSize = 4.2 + (i % 2) * 0.6;
        baseDuration = 3.0 + (i % 3) * 0.35;
        peakOpacity = 0.98;
        glowSpread = 14;
      }

      // Apply scale & speed multipliers
      const finalSize = Number((baseSize * effectiveSize).toFixed(1));
      const finalDuration = Number(Math.max(1.2, baseDuration / Math.max(0.2, effectiveSpeed)).toFixed(2));

      // Deterministic lateral drift (-50px to +50px)
      // Alternating sway patterns: some curve left, some right, some straight
      const driftSign = (i % 2 === 0 ? 1 : -1) * (i % 3 === 0 ? 1.4 : 0.8);
      const driftMagnitude = 15 + ((i * 11) % 35);
      const drift = Math.round(driftSign * driftMagnitude);
      const driftMid = Math.round(drift * 0.38 + (i % 2 === 0 ? 8 : -8));

      // Staggered negative delays so particles start in-flight across the screen
      const delay = -Number(((i * 0.32 + (i % 6) * 0.85) % finalDuration).toFixed(2));

      // Horizontal spread across width (1% to 98%)
      const x = Number((((i * 100) / effectiveCount + ((i * 31) % 9) - 4 + 100) % 96 + 2).toFixed(1));

      list.push({
        id: i,
        tier,
        x,
        size: finalSize,
        duration: finalDuration,
        delay,
        drift,
        driftMid,
        peakOpacity,
        glowSpread,
      });
    }

    return list;
  }, [effectiveCount, effectiveSpeed, effectiveSize]);

  return (
    <div
      className={`fire-sparks fire-sparks-intensity-${intensity} fire-sparks-perf-${performance} ${className}`}
      aria-hidden="true"
      style={
        {
          zIndex,
          "--max-height": `-${effectiveMaxHeight}vh`,
          "--max-height-mid": `-${Math.round(effectiveMaxHeight * 0.42)}vh`,
        } as React.CSSProperties
      }
    >
      {/* Sutil brilho de calor na região inferior */}
      {bottomGlow && effectiveGlowOpacity > 0 && (
        <div
          className="fire-sparks-bottom-glow"
          style={{
            opacity: Number((effectiveGlowOpacity / 100).toFixed(2)),
          }}
        />
      )}

      {/* Partículas de fogo subindo continuamente */}
      {particles.map((p) => (
        <span
          key={p.id}
          className={`fire-spark fire-spark-${p.tier}`}
          style={
            {
              "--x": `${p.x}%`,
              "--size": `${p.size}px`,
              "--duration": `${p.duration}s`,
              "--delay": `${p.delay}s`,
              "--drift": `${p.drift}px`,
              "--drift-mid": `${p.driftMid}px`,
              "--opacity-peak": p.peakOpacity,
              "--glow-spread": `${p.glowSpread}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default FireSparks;

