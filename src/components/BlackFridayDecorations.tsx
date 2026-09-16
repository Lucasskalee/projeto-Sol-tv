import { useMemo } from "react";
import type { BlackFridayFxConfig } from "../motion/types";

export interface BlackFridayDecorationsProps {
  fx?: BlackFridayFxConfig;
}

export function BlackFridayDecorations({ fx }: BlackFridayDecorationsProps) {
  if (!fx) return null;

  const {
    balloons,
    priceTag,
    paintStrokes,
    stamp,
    confetti,
    cornerTapes,
  } = fx;

  const hasAnyFx =
    balloons?.enabled ||
    priceTag?.enabled ||
    paintStrokes?.enabled ||
    stamp?.enabled ||
    confetti?.enabled ||
    cornerTapes?.enabled;

  if (!hasAnyFx) return null;

  // Memoize confetti particles with deterministic positions to prevent re-render jumps
  const confettiParticles = useMemo(() => {
    if (!confetti?.enabled) return [];
    const count = Math.min(Math.max(confetti.count || 18, 10), 30);
    const colors = ["#111111", "#F2381E", "#FFFFFF", "#FFBE00"];
    const shapes = ["rect", "square", "circle"];

    return Array.from({ length: count }, (_, i) => {
      // Deterministic layout along top 40% of screen & edges
      const left = ((i * 100) / count + (i % 3) * 4) % 96 + 2;
      const delay = (i * 0.28) % 4.5;
      const duration = confetti.speed === "slow" ? 6 + (i % 4) * 0.8 : 3.8 + (i % 3) * 0.6;
      const size = 6 + (i % 4) * 3;
      const color = colors[i % colors.length];
      const shape = shapes[i % shapes.length];
      const rotation = (i * 45) % 360;

      return { id: i, left, delay, duration, size, color, shape, rotation };
    });
  }, [confetti?.enabled, confetti?.count, confetti?.speed]);

  // Balloons data
  const balloonList = useMemo(() => {
    if (!balloons?.enabled) return [];
    const count = Math.min(Math.max(balloons.count || 2, 1), 3);
    const speedSec = balloons.speed === "slow" ? 10 : balloons.speed === "fast" ? 4.5 : 7;
    const baseOpacity = (balloons.opacity ?? 85) / 100;

    return Array.from({ length: count }, (_, i) => {
      const isLeft = i % 2 === 0;
      const xOffset = isLeft ? 2.5 + i * 2 : 92 - (i - 1) * 2.5;
      const size = 58 + i * 12;
      const delay = i * 1.8;
      const swayDuration = 3 + i * 0.7;

      return {
        id: i,
        xOffset,
        size,
        speedSec,
        delay,
        swayDuration,
        opacity: baseOpacity,
      };
    });
  }, [balloons?.enabled, balloons?.count, balloons?.speed, balloons?.opacity]);

  return (
    <div className="bf-fx-container" aria-hidden="true">
      {/* 1. CORNER DIAGONAL TAPES (Safe zone: cantos superiores) */}
      {cornerTapes?.enabled && (
        <>
          {(cornerTapes.position === "top-left" || cornerTapes.position === "both") && (
            <div className="bf-corner-tape bf-corner-tape-tl">
              <div className="bf-tape-ribbon">
                <span>{cornerTapes.text || "BLACK FRIDAY"} • {cornerTapes.text || "BLACK FRIDAY"}</span>
              </div>
            </div>
          )}
          {(cornerTapes.position === "top-right" || cornerTapes.position === "both") && (
            <div className="bf-corner-tape bf-corner-tape-tr">
              <div className="bf-tape-ribbon">
                <span>{cornerTapes.text || "BLACK FRIDAY"} • {cornerTapes.text || "BLACK FRIDAY"}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. BALÕES FLUTUANTES PRETOS (Safe zone: margens laterais) */}
      {balloons?.enabled &&
        balloonList.map((b) => (
          <div
            key={`balloon-${b.id}`}
            className="bf-balloon-wrapper"
            style={{
              left: `${b.xOffset}%`,
              opacity: b.opacity,
              animationDuration: `${b.speedSec}s`,
              animationDelay: `${b.delay}s`,
            }}
          >
            <div
              className="bf-balloon"
              style={{
                width: `${b.size}px`,
                height: `${b.size * 1.25}px`,
                animationDuration: `${b.swayDuration}s`,
              }}
            >
              <svg viewBox="0 0 100 135" className="bf-balloon-svg">
                {/* Highlight/gloss */}
                <defs>
                  <radialGradient id={`balloon-grad-${b.id}`} cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#444444" />
                    <stop offset="40%" stopColor="#1e1e1e" />
                    <stop offset="100%" stopColor="#080808" />
                  </radialGradient>
                  <linearGradient id="bf-gold-knot" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F2381E" />
                    <stop offset="100%" stopColor="#9b1100" />
                  </linearGradient>
                </defs>
                {/* Balloon body */}
                <ellipse cx="50" cy="55" rx="42" ry="50" fill={`url(#balloon-grad-${b.id})`} />
                {/* Specular gloss sheen */}
                <ellipse cx="34" cy="34" rx="14" ry="7" fill="rgba(255, 255, 255, 0.28)" transform="rotate(-30 34 34)" />
                {/* Knot */}
                <polygon points="46,104 54,104 50,110" fill="url(#bf-gold-knot)" />
                {/* String / ribbon */}
                <path
                  d="M50,110 Q46,120 52,130 T48,140"
                  fill="none"
                  stroke="#F2381E"
                  strokeWidth="1.5"
                  opacity="0.8"
                />
              </svg>
            </div>
          </div>
        ))}

      {/* 3. CONFETE CONTROLADO */}
      {confetti?.enabled && (
        <div className="bf-confetti-layer">
          {confettiParticles.map((p) => (
            <div
              key={`confetti-${p.id}`}
              className={`bf-confetti-particle bf-confetti-${p.shape}`}
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: p.shape === "rect" ? `${p.size * 1.8}px` : `${p.size}px`,
                backgroundColor: p.color,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* 4. CARIMBO BLACK FRIDAY (Impacto no canto inferior direito ou superior) */}
      {stamp?.enabled && (
        <div
          className={`bf-stamp bf-stamp-${stamp.position || "bottom-right"}`}
          style={{ animationDuration: "0.55s" }}
        >
          <div className="bf-stamp-inner">
            <div className="bf-stamp-border">
              <span className="bf-stamp-star">★</span>
              <span className="bf-stamp-text">{stamp.text || "OFERTA REAL"}</span>
              <span className="bf-stamp-star">★</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. ETIQUETA / PRICE TAG SUSPENSA */}
      {priceTag?.enabled && (
        <div className={`bf-price-tag-hanging bf-price-tag-${priceTag.position || "top-right"}`}>
          <div className="bf-tag-string" />
          <div className="bf-tag-body">
            <div className="bf-tag-hole" />
            <span className="bf-tag-label">BLACK FRIDAY</span>
            <span className="bf-tag-icon">🔥</span>
          </div>
        </div>
      )}

      {/* 6. PINCELADAS DECORATIVAS ORGÂNICAS */}
      {paintStrokes?.enabled && paintStrokes.variant !== "none" && (
        <div className={`bf-paint-strokes bf-paint-strokes-${paintStrokes.variant}`}>
          <svg viewBox="0 0 400 80" className="bf-paint-stroke-svg" preserveAspectRatio="none">
            <path
              d="M 5,42 C 45,28 110,34 185,38 C 265,42 340,32 395,39 C 375,48 315,54 240,51 C 160,48 85,58 5,42 Z"
              fill="#F2381E"
              opacity="0.9"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

