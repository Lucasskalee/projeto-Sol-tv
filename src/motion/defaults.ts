import type { MotionConfig } from "./types";

export const DEFAULT_MOTION_CONFIG: MotionConfig = Object.freeze({
  themeSlug: "black-friday",
  layout: "hero",
  speed: 1,
  exitPreset: "paint-swipe",
  logo: Object.freeze({
    position: "top-left",
    size: 68,
    sectorText: "AÇOUGUE",
    sectorTextColor: "",
    sectorTextSize: 13,
    sectorLayout: "column",
  }),
  badge: Object.freeze({
    type: "text",
    text: "BLACK FRIDAY",
    size: 70,
    rotation: 3.5,
    background: "#111111",
    color: "#ffffff",
    position: "top-right",
    offsetX: 0,
    offsetY: 0,
  }),
  background: Object.freeze({
    type: "solid",
    color: "#F7F6F2",
    gradientStart: "#FFFFFF",
    gradientEnd: "#F7F6F2",
    gradientAngle: 135,
  }),
  productCard: Object.freeze({
    style: "transparent", // Default: "sem o quadrado, só a imagem do produto"
  }),
  pricePhysics: Object.freeze({
    impact: "impact",
    shimmer: false,
    shimmerColor: "white",
  }),
  ambient: Object.freeze({
    speed: 18,
    opacity: 30,
  }),
  paintSwipe: Object.freeze({
    direction: "left-to-right",
    colorMode: "dual",
    speed: "normal",
  }),
  fx: Object.freeze({
    balloons: Object.freeze({
      enabled: false,
      count: 2,
      speed: "normal",
      opacity: 85,
    }),
    priceTag: Object.freeze({
      enabled: false,
      position: "top-right",
    }),
    paintStrokes: Object.freeze({
      enabled: false,
      variant: "corners",
    }),
    strikeAnimation: Object.freeze({
      enabled: true,
    }),
    stamp: Object.freeze({
      enabled: false,
      text: "OFERTA REAL",
      position: "bottom-right",
    }),
    confetti: Object.freeze({
      enabled: false,
      count: 18,
      speed: "normal",
    }),
    cornerTapes: Object.freeze({
      enabled: false,
      text: "BLACK FRIDAY",
      position: "top-left",
    }),
  }),
  colorOverrides: Object.freeze({
    enabled: false,
  }),
  elementAnimations: Object.freeze({
    nameAnimation: "slide-up",
    priceAnimation: "impact",
    imageAnimation: "float",
    choreography: "staggered",
  }),
});

export function cloneMotionConfig(config: MotionConfig): MotionConfig {
  return {
    themeSlug: config.themeSlug || "black-friday",
    layout: config.layout || "hero",
    speed: config.speed ?? 1,
    exitPreset: config.exitPreset || "paint-swipe",
    logo: { ...(config.logo || DEFAULT_MOTION_CONFIG.logo) },
    badge: { ...(config.badge || DEFAULT_MOTION_CONFIG.badge) },
    background: { ...(config.background || DEFAULT_MOTION_CONFIG.background) },
    productCard: { ...(config.productCard || DEFAULT_MOTION_CONFIG.productCard) },
    pricePhysics: { ...(config.pricePhysics || DEFAULT_MOTION_CONFIG.pricePhysics) },
    ambient: { ...(config.ambient || DEFAULT_MOTION_CONFIG.ambient) },
    paintSwipe: { ...(config.paintSwipe || DEFAULT_MOTION_CONFIG.paintSwipe) },
    fx: config.fx
      ? {
          balloons: config.fx.balloons ? { ...config.fx.balloons } : undefined,
          priceTag: config.fx.priceTag ? { ...config.fx.priceTag } : undefined,
          paintStrokes: config.fx.paintStrokes ? { ...config.fx.paintStrokes } : undefined,
          strikeAnimation: config.fx.strikeAnimation ? { ...config.fx.strikeAnimation } : undefined,
          stamp: config.fx.stamp ? { ...config.fx.stamp } : undefined,
          confetti: config.fx.confetti ? { ...config.fx.confetti } : undefined,
          cornerTapes: config.fx.cornerTapes ? { ...config.fx.cornerTapes } : undefined,
        }
      : undefined,
    colorOverrides: config.colorOverrides ? { ...config.colorOverrides } : undefined,
    elementAnimations: config.elementAnimations ? { ...config.elementAnimations } : undefined,
  };
}

export function areConfigsEqual(a: MotionConfig, b: MotionConfig): boolean {
  if (a.themeSlug !== b.themeSlug) return false;
  if (a.layout !== b.layout) return false;
  if (a.speed !== b.speed) return false;
  if (a.exitPreset !== b.exitPreset) return false;

  // Logo comparison
  if (a.logo.image !== b.logo.image) return false;
  if (a.logo.position !== b.logo.position) return false;
  if (a.logo.size !== b.logo.size) return false;
  if (a.logo.sectorText !== b.logo.sectorText) return false;
  if (a.logo.sectorTextColor !== b.logo.sectorTextColor) return false;
  if (a.logo.sectorTextSize !== b.logo.sectorTextSize) return false;
  if (a.logo.sectorLayout !== b.logo.sectorLayout) return false;

  // Badge comparison
  if (a.badge.type !== b.badge.type) return false;
  if (a.badge.text !== b.badge.text) return false;
  if (a.badge.image !== b.badge.image) return false;
  if (a.badge.size !== b.badge.size) return false;
  if (a.badge.rotation !== b.badge.rotation) return false;
  if (a.badge.background !== b.badge.background) return false;
  if (a.badge.color !== b.badge.color) return false;
  if (a.badge.position !== b.badge.position) return false;
  if (a.badge.offsetX !== b.badge.offsetX) return false;
  if (a.badge.offsetY !== b.badge.offsetY) return false;

  // Background comparison
  if (a.background?.type !== b.background?.type) return false;
  if (a.background?.color !== b.background?.color) return false;
  if (a.background?.gradientStart !== b.background?.gradientStart) return false;
  if (a.background?.gradientEnd !== b.background?.gradientEnd) return false;
  if (a.background?.gradientAngle !== b.background?.gradientAngle) return false;
  if (a.background?.imageUrl !== b.background?.imageUrl) return false;

  // Product Card comparison
  if (a.productCard?.style !== b.productCard?.style) return false;
  if (a.productCard?.customBorderColor !== b.productCard?.customBorderColor) return false;
  if (a.productCard?.customBgColor !== b.productCard?.customBgColor) return false;

  // Price Physics comparison
  if (a.pricePhysics.impact !== b.pricePhysics.impact) return false;
  if (a.pricePhysics.shimmer !== b.pricePhysics.shimmer) return false;
  if (a.pricePhysics.shimmerColor !== b.pricePhysics.shimmerColor) return false;

  // Ambient comparison
  if (a.ambient.speed !== b.ambient.speed) return false;
  if (a.ambient.opacity !== b.ambient.opacity) return false;
  if (a.ambient.haloColor !== b.ambient.haloColor) return false;

  // Paint Swipe comparison
  if (a.paintSwipe?.direction !== b.paintSwipe?.direction) return false;
  if (a.paintSwipe?.colorMode !== b.paintSwipe?.colorMode) return false;
  if (a.paintSwipe?.speed !== b.paintSwipe?.speed) return false;

  // FX comparison (JSON string check for deep objects)
  if (JSON.stringify(a.fx) !== JSON.stringify(b.fx)) return false;

  // Color overrides comparison
  if (JSON.stringify(a.colorOverrides) !== JSON.stringify(b.colorOverrides)) return false;

  // Element animations comparison
  if (JSON.stringify(a.elementAnimations) !== JSON.stringify(b.elementAnimations)) return false;

  return true;
}
