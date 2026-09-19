import React from "react";
import type { MotionBlackFridayImageConfig } from "../../motion/types";
import { useCachedMedia } from "../../mediaCache";

export interface BlackFridayImageElementProps {
  config?: MotionBlackFridayImageConfig;
  visible?: boolean;
  replayKey?: number;
  className?: string;
}

export function BlackFridayImageElement({
  config,
  visible = true,
  replayKey = 0,
  className = "",
}: BlackFridayImageElementProps) {
  const { url: cachedSrc } = useCachedMedia(config?.src);
  const effectiveSrc = cachedSrc || config?.src;

  if (visible === false || config?.visible === false) {
    return null;
  }

  const x = config?.x ?? 82;
  const y = config?.y ?? 6;
  const widthPct = config?.width ?? 18;
  const heightPct = config?.height;
  const scale = config?.scale ?? 1;
  const rotation = config?.rotation ?? 0;
  const opacity = (config?.opacity ?? 100) / 100;
  const zIndex = config?.zIndex ?? 25;

  const anim = config?.animation || {
    preset: "zoom-in",
    entryPreset: "zoom-in",
    idlePreset: "float",
    duration: 0.8,
    delay: 0.1,
    speed: "normal",
    intensity: "normal",
    easing: "ease-out",
    iterationCount: "infinite",
  };

  const entryClass = anim.entryPreset && anim.entryPreset !== "none" ? `bf-entry-${anim.entryPreset}` : "";
  const idleClass = anim.idlePreset && anim.idlePreset !== "none" ? `bf-idle-${anim.idlePreset}` : "";
  const speedClass = `bf-speed-${anim.speed || "normal"}`;
  const intensityClass = `bf-intensity-${anim.intensity || "normal"}`;

  const iterations =
    anim.iterationCount === "once"
      ? 1
      : anim.iterationCount === "2"
        ? 2
        : anim.iterationCount === "3"
          ? 3
          : "infinite";

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: widthPct ? `${widthPct}%` : "auto",
    height: heightPct ? `${heightPct}%` : "auto",
    transform: `scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    opacity,
    zIndex,
    pointerEvents: "none",
    "--bf-anim-duration": `${anim.duration ?? 0.8}s`,
    "--bf-anim-delay": `${anim.delay ?? 0.1}s`,
    "--bf-anim-easing": anim.easing || "ease-out",
    "--bf-anim-iterations": iterations,
  } as React.CSSProperties;

  return (
    <div
      key={`bf-element-${replayKey}`}
      className={`bf-custom-image-element ${entryClass} ${idleClass} ${speedClass} ${intensityClass} ${className}`}
      style={containerStyle}
      aria-hidden="true"
    >
      <div className="bf-custom-image-wrapper">
        {effectiveSrc ? (
          <img
            src={effectiveSrc}
            alt="Black Friday"
            className="bf-custom-image-tag"
            style={{
              width: "100%",
              height: heightPct ? "100%" : "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <div className="bf-stamp-cartaz-badge default-theme-stamp">
            <span className="bf-badge-word-black">BLACK</span>
            <span className="bf-badge-word-friday">FRIDAY</span>
          </div>
        )}
      </div>
    </div>
  );
}
