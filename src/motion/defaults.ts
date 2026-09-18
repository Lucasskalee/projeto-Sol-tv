import type { MotionConfig, MotionBlackFridayImageConfig, MotionFireSparksConfig } from "./types";

export const DEFAULT_FIRE_SPARKS_CONFIG: MotionFireSparksConfig = Object.freeze({
  enabled: false,
  intensity: "commercial" as const,
  particleCount: 26,
  speed: 1,
  size: 1,
  bottomGlow: true,
  bottomGlowOpacity: 25,
  maxHeight: 105,
  performance: "normal" as const,
});

export const DEFAULT_BLACK_FRIDAY_IMAGE: MotionBlackFridayImageConfig = Object.freeze({
  visible: true,
  src: "",
  originalSrc: "",
  x: 82,
  y: 6,
  width: 18,
  height: null,
  scale: 1,
  lockAspectRatio: true,
  rotation: 0,
  opacity: 100,
  zIndex: 25,
  removeBackground: false,
  animation: Object.freeze({
    preset: "zoom-in" as const,
    entryPreset: "zoom-in" as const,
    idlePreset: "float" as const,
    duration: 0.8,
    delay: 0.1,
    speed: "normal" as const,
    intensity: "normal" as const,
    easing: "ease-out" as const,
    iterationCount: "infinite" as const,
  }),
});

export const DEFAULT_MOTION_CONFIG: MotionConfig = Object.freeze({
  themeSlug: "black-friday",
  layout: "grid8",
  speed: 1,
  exitPreset: "black-friday-lift",
  logo: Object.freeze({
    position: "top-left",
    size: 68,
    x: 4,
    y: 4,
    scale: 1,
    opacity: 100,
    rotation: 0,
    sectorText: "",
    sectorTextColor: "#f2c94c",
    sectorTextSize: 13,
    sectorLayout: "column",
    offsetX: 0,
    offsetY: 0,
    sectorOffsetX: 0,
    sectorOffsetY: 0,
    visible: true,
  }),
  subtitle: Object.freeze({
    text: "Qualidade para o seu dia.",
    fontSize: 40,
    offsetX: -293,
    offsetY: -74,
    color: "#111111",
    visible: true,
    showBrush: true,
  }),
  badge: Object.freeze({
    text: "",
    rotation: 3.5,
    background: "#e21b2d",
    offsetX: 231,
    offsetY: 368,
    size: 410,
    type: "text",
    visible: false,
  }),
  background: Object.freeze({
    type: "solid",
    color: "#F7F6F2",
    gradientStart: "#FFFFFF",
    gradientEnd: "#F7F6F2",
    gradientAngle: 135,
  }),
  productCard: Object.freeze({
    style: "transparent",
  }),
  pricePhysics: Object.freeze({
    impact: "impact",
    shimmer: true,
    shimmerColor: "gold",
  }),
  ambient: Object.freeze({
    speed: 18,
    opacity: 55,
  }),
  paintSwipe: Object.freeze({
    direction: "left-to-right",
    colorMode: "dual",
    speed: "normal",
  }),
  fx: Object.freeze({
    brushCorners: Object.freeze({
      enabled: true,
      opacity: 100,
    }),
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
    fireSparks: DEFAULT_FIRE_SPARKS_CONFIG,
  }),
  colorOverrides: Object.freeze({
    enabled: true,
    productName: "#ffffff",
    strikeColor: "#000000",
    background: "#000000",
    price: "#ec6f09",
    cents: "#ec6f09",
    currency: "#ec6f09",
    unit: "#ec6f09",
    oldPrice: "#666666",
    capsuleBg: "#000000",
    capsuleText: "#ffffff",
    sectorText: "#000000",
    badgeBg: "#000000",
    badgeText: "#ffffff",
    fontFamily: "",
    textShadow: "none",
  }),
  elementAnimations: Object.freeze({
    nameAnimation: "slide-up",
    priceAnimation: "impact",
    imageAnimation: "float",
    choreography: "staggered",
  }),
  visibility: Object.freeze({
    logo: true,
    blackFridayImage: true,
    slogan: true,
    brushCorners: true,
    frame: true,
    decorations: true,
    badge: true,
    fireSparks: true,
    oldPrice: true,
    unit: true,
    productName: true,
    productPrice: true,
    productImage: true,
  }),
  blackFridayImage: DEFAULT_BLACK_FRIDAY_IMAGE,
  layoutTuning: Object.freeze({
    hero: Object.freeze({
      productName: Object.freeze({
        fontSizeOffset: -42,
        x: 278,
        y: -7,
      }),
      oldPrice: Object.freeze({
        x: 289,
        y: 29,
      }),
      productImage: Object.freeze({
        scale: 0.85,
        x: 31,
        y: 26,
      }),
      promotionalPrice: Object.freeze({
        fontSizeOffset: 32,
        x: 276,
        y: 48,
      }),
    }),
    duo: Object.freeze({
      productImage: Object.freeze({
        x: -10,
        y: -9,
        scale: 0.85,
      }),
    }),
    trio: Object.freeze({
      productImage: Object.freeze({
        scale: 1,
        x: -44,
        y: 39,
      }),
    }),
    grid4: Object.freeze({
      productImage: Object.freeze({
        x: -43,
        y: 0,
        scale: 1.3,
      }),
    }),
    grid8: Object.freeze({
      productImage: Object.freeze({
        x: 28,
        y: 18,
        scale: 1.2,
      }),
      promotionalPrice: Object.freeze({
        x: -18,
        y: 76,
        fontSizeOffset: 8,
      }),
      oldPrice: Object.freeze({
        x: -17,
        y: 68,
      }),
      productName: Object.freeze({
        fontSizeOffset: 18,
        x: -4,
        y: 64,
      }),
    }),
  }),
});

export function cloneMotionConfig(config: MotionConfig): MotionConfig {
  return {
    themeSlug: config.themeSlug || "black-friday",
    layout: config.layout || "hero",
    speed: config.speed ?? 1,
    exitPreset: config.exitPreset || "paint-swipe",
    logo: { ...(config.logo || DEFAULT_MOTION_CONFIG.logo) },
    subtitle: config.subtitle
      ? { ...config.subtitle }
      : { ...DEFAULT_MOTION_CONFIG.subtitle },
    badge: { ...(config.badge || DEFAULT_MOTION_CONFIG.badge) },
    background: { ...(config.background || DEFAULT_MOTION_CONFIG.background) },
    productCard: { ...(config.productCard || DEFAULT_MOTION_CONFIG.productCard) },
    pricePhysics: { ...(config.pricePhysics || DEFAULT_MOTION_CONFIG.pricePhysics) },
    ambient: { ...(config.ambient || DEFAULT_MOTION_CONFIG.ambient) },
    paintSwipe: { ...(config.paintSwipe || DEFAULT_MOTION_CONFIG.paintSwipe) },
    fx: config.fx
      ? {
          brushCorners: config.fx.brushCorners ? { ...config.fx.brushCorners } : undefined,
          balloons: config.fx.balloons ? { ...config.fx.balloons } : undefined,
          priceTag: config.fx.priceTag ? { ...config.fx.priceTag } : undefined,
          paintStrokes: config.fx.paintStrokes ? { ...config.fx.paintStrokes } : undefined,
          strikeAnimation: config.fx.strikeAnimation ? { ...config.fx.strikeAnimation } : undefined,
          stamp: config.fx.stamp ? { ...config.fx.stamp } : undefined,
          confetti: config.fx.confetti ? { ...config.fx.confetti } : undefined,
          cornerTapes: config.fx.cornerTapes ? { ...config.fx.cornerTapes } : undefined,
          fireSparks: config.fx.fireSparks ? { ...config.fx.fireSparks } : undefined,
        }
      : undefined,
    colorOverrides: config.colorOverrides ? { ...config.colorOverrides } : undefined,
    elementAnimations: config.elementAnimations ? { ...config.elementAnimations } : undefined,
    visibility: config.visibility
      ? { ...config.visibility }
      : { ...(DEFAULT_MOTION_CONFIG.visibility || {}) },
    blackFridayImage: config.blackFridayImage
      ? {
          ...config.blackFridayImage,
          animation: config.blackFridayImage.animation
            ? { ...config.blackFridayImage.animation }
            : undefined,
        }
      : { ...DEFAULT_BLACK_FRIDAY_IMAGE, animation: { ...DEFAULT_BLACK_FRIDAY_IMAGE.animation } },
    videoOverlay: config.videoOverlay
      ? {
          enabled: config.videoOverlay.enabled,
          logo: config.videoOverlay.logo ? { ...config.videoOverlay.logo } : undefined,
          blackFridayImage: config.videoOverlay.blackFridayImage
            ? { ...config.videoOverlay.blackFridayImage }
            : undefined,
        }
      : undefined,
    fireSparks: config.fireSparks ? { ...config.fireSparks } : undefined,
    layoutTuning: config.layoutTuning ? JSON.parse(JSON.stringify(config.layoutTuning)) : undefined,
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
  if (a.logo.x !== b.logo.x) return false;
  if (a.logo.y !== b.logo.y) return false;
  if (a.logo.scale !== b.logo.scale) return false;
  if (a.logo.opacity !== b.logo.opacity) return false;
  if (a.logo.rotation !== b.logo.rotation) return false;
  if (a.logo.offsetX !== b.logo.offsetX) return false;
  if (a.logo.offsetY !== b.logo.offsetY) return false;
  if (a.logo.sectorText !== b.logo.sectorText) return false;
  if (a.logo.sectorTextColor !== b.logo.sectorTextColor) return false;
  if (a.logo.sectorTextSize !== b.logo.sectorTextSize) return false;
  if (a.logo.sectorOffsetX !== b.logo.sectorOffsetX) return false;
  if (a.logo.sectorOffsetY !== b.logo.sectorOffsetY) return false;
  if (a.logo.sectorLayout !== b.logo.sectorLayout) return false;
  if (a.logo.visible !== b.logo.visible) return false;

  // Subtitle comparison
  if (JSON.stringify(a.subtitle) !== JSON.stringify(b.subtitle)) return false;

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
  if (a.badge.visible !== b.badge.visible) return false;

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

  // Visibility comparison
  if (JSON.stringify(a.visibility) !== JSON.stringify(b.visibility)) return false;

  // Black Friday Image comparison
  if (JSON.stringify(a.blackFridayImage) !== JSON.stringify(b.blackFridayImage)) return false;

  // Video Overlay comparison
  if (JSON.stringify(a.videoOverlay) !== JSON.stringify(b.videoOverlay)) return false;

  // Layout tuning comparison
  if (JSON.stringify(a.layoutTuning) !== JSON.stringify(b.layoutTuning)) return false;

  return true;
}
