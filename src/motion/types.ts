import type { OfferLayout } from "../offers/layouts";
import type { ExitPreset } from "../transitions";

export type LogoPosition = "top-left" | "top-center" | "top-right" | "bottom-left";
export type SectorLayout = "column" | "row" | "hidden";
export type PriceImpact = "impact" | "smooth" | "none";
export type ShimmerColor = "gold" | "silver" | "white";
export type BackgroundType = "solid" | "gradient" | "image";
export type ProductCardStyle = "transparent" | "card" | "glass" | "bordered";
export type BadgeType = "text" | "image";
export type BadgePosition = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "over-price";

export interface MotionLogoConfig {
  image?: string; // Custom logo PNG URL / Data URL
  position: LogoPosition;
  size: number; // in px (e.g. 36-110)
  sectorText: string;
  sectorTextColor: string;
  sectorTextSize: number; // in px (e.g. 9-22)
  sectorLayout: SectorLayout;
}

export interface MotionBadgeConfig {
  type: BadgeType; // "text" | "image"
  text: string;
  image?: string; // Custom badge/tag PNG upload (Data URL or URL)
  size?: number; // Size of badge image in px (e.g. 40-160)
  rotation: number; // in deg (e.g. -25 to +25)
  background: string; // Background color for text badge
  color?: string; // Text color for text badge
  position?: BadgePosition; // "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "over-price"
  offsetX?: number; // Fine position offset X in px (-60 to +60)
  offsetY?: number; // Fine position offset Y in px (-60 to +60)
}

export interface MotionBackgroundConfig {
  type: BackgroundType; // "solid" | "gradient" | "image"
  color: string; // Solid or base color (e.g. #080a0e)
  gradientStart: string; // Gradient start color
  gradientEnd: string; // Gradient end color
  gradientAngle: number; // in degrees, e.g. 135
  imageUrl?: string; // Custom background image URL / Data URL
}

export interface MotionProductCardConfig {
  style: ProductCardStyle; // "transparent" (sem quadrado) | "card" | "glass" | "bordered"
  customBorderColor?: string;
  customBgColor?: string;
}

export interface MotionPricePhysicsConfig {
  impact: PriceImpact;
  shimmer: boolean;
  shimmerColor: ShimmerColor;
}

export interface MotionAmbientConfig {
  speed: number; // in seconds (e.g. 8-30)
  opacity: number; // percentage 10-100
  haloColor?: string; // Halo tint (e.g. #e21b2d or #f2c94c)
}

export type PaintSwipeDirection = "left-to-right" | "right-to-left";
export type PaintSwipeColorMode = "dual" | "red" | "black";
export type PaintSwipeSpeed = "smooth" | "normal" | "fast";

export interface MotionPaintSwipeConfig {
  direction?: PaintSwipeDirection; // "left-to-right" | "right-to-left"
  colorMode?: PaintSwipeColorMode; // "dual" (preto + vermelho) | "red" | "black"
  speed?: PaintSwipeSpeed; // "smooth" | "normal" | "fast"
}

export type BalloonSpeed = "slow" | "normal" | "fast";
export type CornerTapePosition = "top-left" | "top-right" | "both" | "none";
export type StampPosition = "bottom-right" | "top-right" | "badge";
export type PaintStrokeVariant = "corners" | "price-accent" | "subtle" | "none";
export type PriceTagPosition = "top-right" | "top-left" | "near-price";

export interface BlackFridayFxConfig {
  balloons?: {
    enabled: boolean;
    count: number; // 1 to 3
    speed: BalloonSpeed;
    opacity: number; // 20 to 100
  };
  priceTag?: {
    enabled: boolean;
    position: PriceTagPosition;
  };
  paintStrokes?: {
    enabled: boolean;
    variant: PaintStrokeVariant;
  };
  strikeAnimation?: {
    enabled: boolean;
  };
  stamp?: {
    enabled: boolean;
    text: string;
    position: StampPosition;
  };
  confetti?: {
    enabled: boolean;
    count: number; // 10 to 30
    speed: "slow" | "normal";
  };
  cornerTapes?: {
    enabled: boolean;
    text: string;
    position: CornerTapePosition;
  };
}

export interface ThemeColorOverrides {
  enabled?: boolean;
  background?: string;
  productName?: string;
  price?: string;
  currency?: string;
  unit?: string;
  oldPrice?: string;
  strikeColor?: string;
  capsuleBg?: string;
  capsuleText?: string;
  sectorText?: string;
  badgeBg?: string;
  badgeText?: string;
}

export type ProductNameAnimation = "slide-up" | "fade" | "paint-reveal" | "impact";
export type ProductPriceAnimation = "impact" | "scale" | "pop" | "paint-reveal";
export type ProductImageAnimation = "float" | "fade" | "slide-left" | "none";
export type EntranceChoreography = "staggered" | "simultaneous" | "delayed-price";

export interface ElementAnimationConfig {
  nameAnimation?: ProductNameAnimation;
  priceAnimation?: ProductPriceAnimation;
  imageAnimation?: ProductImageAnimation;
  choreography?: EntranceChoreography;
}

export interface MotionConfig {
  themeSlug: string;
  layout: OfferLayout;
  speed: number;
  exitPreset: ExitPreset;
  logo: MotionLogoConfig;
  badge: MotionBadgeConfig;
  background: MotionBackgroundConfig;
  productCard: MotionProductCardConfig;
  pricePhysics: MotionPricePhysicsConfig;
  ambient: MotionAmbientConfig;
  paintSwipe?: MotionPaintSwipeConfig;
  fx?: BlackFridayFxConfig;
  colorOverrides?: ThemeColorOverrides;
  elementAnimations?: ElementAnimationConfig;
}

export interface MotionPreset {
  id: string;
  name: string;
  description?: string;
  isBuiltin?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  config: MotionConfig;
}
