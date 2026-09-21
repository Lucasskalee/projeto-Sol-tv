import type { OfferLayout } from "../offers/layouts";
import type { ExitPreset } from "../transitions";

export type LogoPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "center"
  | "custom";
export type SectorLayout = "column" | "row" | "hidden";
export type PriceImpact = "impact" | "smooth" | "none";
export type ShimmerColor = "gold" | "silver" | "white";
export type BackgroundType = "solid" | "gradient" | "image" | "sunburst";
export type ProductCardStyle = "transparent" | "card" | "glass" | "bordered";
export type BadgeType = "text" | "image";
export type BadgePosition = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "over-price";

export interface MotionLogoConfig {
  image?: string; // Custom logo PNG URL / Data URL
  originalImage?: string; // Original uploaded logo URL before background removal
  removeBackground?: boolean; // Whether background removal was applied
  position: LogoPosition;
  size: number; // in px (e.g. 36-110)
  x?: number; // Normalized horizontal position in percentage (0 to 100%)
  y?: number; // Normalized vertical position in percentage (0 to 100%)
  scale?: number; // Scale multiplier (0.2 to 3.0)
  opacity?: number; // Opacity in percentage (0 to 100)
  rotation?: number; // Rotation in degrees (-180 to 180)
  offsetX?: number; // Fine position offset X in px
  offsetY?: number; // Fine position offset Y in px
  sectorText: string;
  sectorTextColor: string;
  sectorTextSize: number; // in px (e.g. 9-22)
  sectorOffsetX?: number; // Fine position offset X in px
  sectorOffsetY?: number; // Fine position offset Y in px
  sectorLayout: SectorLayout;
  visible?: boolean;
}

export interface MotionSubtitleConfig {
  text?: string; // Custom bottom slogan/footer text
  fontSize?: number; // in px (e.g. 12-40)
  offsetX?: number; // Fine position offset X in px
  offsetY?: number; // Fine position offset Y in px
  color?: string; // Custom text color
  visible?: boolean; // Show or hide bottom text
  showBrush?: boolean; // Show or hide red underline brush
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
  visible?: boolean; // Show or hide badge / tag promocional
}

export interface MotionSunburstConfig {
  primaryColor?: string; // Cor primária dos raios (default: #FFB800)
  secondaryColor?: string; // Cor secundária dos raios (default: #FF6600)
  speed?: number; // Duração da rotação em segundos (ex: 20 a 150s, default: 60)
  raysCount?: number; // Quantidade de raios radiais (ex: 12 a 48, default: 24)
  scale?: number; // Escala/Zoom dos raios (ex: 1.0 a 3.0, default: 1.5)
  glowPulse?: boolean; // Respiração/pulso do brilho radial central (default: true)
}

export interface MotionBackgroundConfig {
  type: BackgroundType; // "solid" | "gradient" | "image" | "sunburst"
  color: string; // Solid or base color (e.g. #080a0e)
  gradientStart: string; // Gradient start color
  gradientEnd: string; // Gradient end color
  gradientAngle: number; // in degrees, e.g. 135
  imageUrl?: string; // Custom background image URL / Data URL
  sunburst?: MotionSunburstConfig;
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

export type FireSparksIntensity = "subtle" | "commercial" | "fire-sale" | "custom";
export type FireSparksPerformance = "normal" | "low";

export interface MotionFireSparksConfig {
  enabled: boolean;
  intensity?: FireSparksIntensity;
  particleCount?: number; // 10 a 50 partículas (default: 26)
  speed?: number; // multiplicador de velocidade 0.5 a 2.5 (default: 1)
  size?: number; // multiplicador de tamanho 0.5 a 2.0 (default: 1)
  bottomGlow?: boolean; // brilho de calor na base da tela (default: true)
  bottomGlowOpacity?: number; // 0 a 100% (default: 25)
  maxHeight?: number; // altura máxima de subida das faíscas em %/vh (default: 105)
  performance?: FireSparksPerformance; // "normal" ou "low" para Smart TVs antigas
}

export interface BlackFridayFxConfig {
  brushCorners?: {
    enabled: boolean;
    opacity?: number; // 0 to 100
    scale?: number;
  };
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
    scale?: number;
    offsetX?: number;
    offsetY?: number;
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
  fireSparks?: MotionFireSparksConfig;
}

export interface VisualElementsVisibility {
  logo?: boolean; // Mostrar logo da TV (default true)
  blackFridayImage?: boolean; // Mostrar imagem/logo Black Friday (default true)
  slogan?: boolean; // Mostrar slogan / frase de rodapé (default true)
  brushCorners?: boolean; // Mostrar molduras pretas / pinceladas nos 4 cantos (default true)
  frame?: boolean; // Mostrar moldura / borda externa da tela (default true)
  decorations?: boolean; // Mostrar decorações do tema (pinceladas, carimbos, balões) (default true)
  badge?: boolean; // Mostrar selo promocional nos produtos (default true)
  fireSparks?: boolean; // Mostrar faíscas de fogo / queima de estoque (default true)
  oldPrice?: boolean; // Mostrar preço anterior ("De R$ ...") (default true)
  unit?: boolean; // Mostrar unidade (/kg, /un) (default true)
  productName?: boolean; // Mostrar nome do produto (default true)
  productPrice?: boolean; // Mostrar preço do produto (default true)
  productImage?: boolean; // Mostrar imagem do produto (default true)
}

export type BlackFridayAnimationPreset =
  | "none"
  | "fade-in"
  | "slide-in"
  | "zoom-in"
  | "pulse"
  | "bounce"
  | "float"
  | "rotate-smooth"
  | "shake"
  | "flip"
  | "neon";

export type BlackFridayEntryAnimationPreset = "none" | "fade-in" | "slide-in" | "zoom-in" | "bounce";
export type BlackFridayIdleAnimationPreset = "none" | "pulse" | "float" | "rotate-smooth" | "shake" | "flip" | "neon";

export interface MotionBlackFridayImageAnimation {
  preset?: BlackFridayAnimationPreset;
  entryPreset?: BlackFridayEntryAnimationPreset;
  idlePreset?: BlackFridayIdleAnimationPreset;
  duration?: number; // em segundos (ex: 0.8)
  delay?: number; // em segundos (ex: 0.2)
  speed?: "slow" | "normal" | "fast";
  intensity?: "subtle" | "normal" | "strong" | "intense";
  easing?: "ease" | "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring";
  direction?: "top" | "bottom" | "left" | "right";
  iterationCount?: "once" | "1" | "2" | "3" | "infinite";
}

export interface MotionBlackFridayImageConfig {
  visible?: boolean; // visibilidade (default true)
  src?: string; // URL da imagem enviada ou SVG customizado
  originalSrc?: string; // URL original antes de remover fundo
  x?: number; // Posição horizontal normalizada em % (0 a 100, default 82)
  y?: number; // Posição vertical normalizada em % (0 a 100, default 6)
  width?: number; // Largura em % da tela (default 18)
  height?: number | null; // Altura em % da tela (ou null para proporcional)
  scale?: number; // Escala multiplicadora (default 1)
  lockAspectRatio?: boolean; // Travar proporção (default true)
  rotation?: number; // Rotação em graus (-180 a 180, default 0)
  opacity?: number; // Opacidade de 0 a 100% (default 100)
  zIndex?: number; // Camada z-index (default 25)
  removeBackground?: boolean; // Fundo removido
  animation?: MotionBlackFridayImageAnimation;
}

export interface ThemeColorOverrides {
  enabled?: boolean;
  background?: string;
  productName?: string;
  price?: string; // Cor do preço promocional / número inteiro
  cents?: string; // Cor dos centavos
  priceCents?: string; // Cor dos centavos (alias)
  currency?: string; // Cor do símbolo R$
  unit?: string; // Cor da unidade (/kg, /un)
  oldPrice?: string; // Cor do preço anterior
  strikeColor?: string; // Cor do traço de corte do preço anterior
  capsuleBg?: string;
  capsuleText?: string;
  sectorText?: string;
  badgeBg?: string;
  badgeText?: string;
  fontFamily?: string; // Tipografia dos títulos e textos
  fontFamilyPrice?: string; // Tipografia dos preços
  productNameFontWeight?: string | number; // Peso da fonte do nome do produto
  fontWeightName?: string | number; // Peso da fonte do nome do produto (alias)
  priceFontWeight?: string | number; // Peso da fonte do preço
  fontWeightPrice?: string | number; // Peso da fonte do preço (alias)
  textShadow?: string; // Sombra do preço ("none", "subtle", "gold", "red", etc.)
  priceShadow?: string; // Sombra do preço (alias)
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

export interface LayoutElementConfig {
  scale?: number; // 0.5 to 2.5 multiplier
  fontSizeOffset?: number; // -30 to +80 px
  x?: number; // -200 to +200 px offset
  y?: number; // -200 to +200 px offset
  opacity?: number; // 0 to 100%
}

export interface PerLayoutTuning {
  productName?: LayoutElementConfig;
  promotionalPrice?: LayoutElementConfig;
  oldPrice?: LayoutElementConfig;
  productImage?: LayoutElementConfig;
  columnRatio?: number; // 0.20 to 0.85 ratio
  gap?: number; // spacing between product cards in px (0 to 160)
  itemGap?: number; // spacing between image and texts inside each product in px (0 to 100)
}

export type LayoutTuningMap = Partial<Record<OfferLayout, PerLayoutTuning>>;

export interface MotionVideoLogoConfig {
  visible?: boolean;
  position?: LogoPosition;
  size?: number; // em px (ex: 36-110)
  x?: number; // Posição horizontal normalizada em % (0 a 100)
  y?: number; // Posição vertical normalizada em % (0 a 100)
  scale?: number; // Escala multiplicadora (0.2 a 3.0)
  opacity?: number; // Opacidade de 0 a 100
  rotation?: number; // Rotação em graus (-180 a 180)
  offsetX?: number; // Offset X em px
  offsetY?: number; // Offset Y em px
  sectorText?: string;
  sectorTextColor?: string;
  sectorTextSize?: number;
  sectorOffsetX?: number;
  sectorOffsetY?: number;
  sectorLayout?: SectorLayout;
}

export interface MotionVideoBlackFridayImageConfig {
  visible?: boolean;
  x?: number; // Posição horizontal em % (0 a 100)
  y?: number; // Posição vertical em % (0 a 100)
  width?: number; // Largura em % (default 18)
  height?: number | null;
  scale?: number;
  rotation?: number;
  opacity?: number; // 0 a 100
}

export interface MotionVideoOverlayConfig {
  enabled?: boolean; // Se true, utiliza posições separadas nos vídeos
  logo?: MotionVideoLogoConfig;
  blackFridayImage?: MotionVideoBlackFridayImageConfig;
}

export interface MotionConfig {
  themeSlug: string;
  layout: OfferLayout;
  speed: number;
  exitPreset: ExitPreset;
  logo: MotionLogoConfig;
  subtitle?: MotionSubtitleConfig;
  badge: MotionBadgeConfig;
  background: MotionBackgroundConfig;
  productCard: MotionProductCardConfig;
  pricePhysics: MotionPricePhysicsConfig;
  ambient: MotionAmbientConfig;
  paintSwipe?: MotionPaintSwipeConfig;
  fx?: BlackFridayFxConfig;
  colorOverrides?: ThemeColorOverrides;
  elementAnimations?: ElementAnimationConfig;
  layoutTuning?: LayoutTuningMap;
  visibility?: VisualElementsVisibility;
  blackFridayImage?: MotionBlackFridayImageConfig;
  videoOverlay?: MotionVideoOverlayConfig;
  fireSparks?: MotionFireSparksConfig;
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

export interface VisualConfigData {
  sector: string;
  draftConfig: MotionConfig;
  publishedConfig: MotionConfig;
  publishedVersion: number;
  publishedAt: string;
  updatedAt: string;
}

