import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Eye, Minimize2, Maximize2 } from "lucide-react";
import { TvPlayer } from "../TvPlayer";
import { contentFromData, seedOffers, SECTORS } from "../../data";
import { resolveTheme } from "../../themes/resolveTheme";
import { cachedContent, databaseConfigured, loadTvContent, subscribeToTvContent } from "../../supabase";
import type { MotionConfig, PerLayoutTuning } from "../../motion/types";
import type { Offer, TvContent } from "../../types";
import type { OfferLayout } from "../../offers/layouts";
import { InteractiveLayoutOverlay, type SelectableElementType } from "./InteractiveLayoutOverlay";
import { formatCompleteTuningExport } from "../../motion/layoutTuningFormatter";

export type MotionPreviewProps = {
  config: MotionConfig;
  activePresetName?: string;
  replayKey: number;
  onReplay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onCopyConfig: () => void;
  copied: boolean;
  onLayoutChange?: (layout: OfferLayout) => void;
  onUpdateConfig?: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onUpdateLayoutTuning?: (layout: OfferLayout, updater: (prev: PerLayoutTuning) => PerLayoutTuning) => void;
  onResetLayoutTuning?: (layout: OfferLayout) => void;
  onSaveLayoutToTv?: () => void;
  sector?: string;
  onSectorChange?: (sector: string) => void;
  onSelectElement?: (element: SelectableElementType) => void;
  isCleanView?: boolean;
  onExitCleanView?: () => void;
  zoom?: "fit" | "50" | "75" | "100" | "125";
  onZoomChange?: (zoom: "fit" | "50" | "75" | "100" | "125") => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  showBoxes?: boolean;
  onToggleShowBoxes?: () => void;
  isInteractiveMode?: boolean;
  onToggleInteractiveMode?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

const STUDIO_PRODUCT_OFFERS = [
  {
    name: "Picanha bovina especial",
    regularPrice: "69,90",
    promotionalPrice: "49,99",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Costela janela bovina",
    regularPrice: "39,90",
    promotionalPrice: "27,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Fraldinha maturada grill",
    regularPrice: "52,90",
    promotionalPrice: "38,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Linguiça toscana artesanal",
    regularPrice: "26,90",
    promotionalPrice: "19,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Contrafilé em bifes nobres",
    regularPrice: "58,90",
    promotionalPrice: "42,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Coxinha da asa temperada",
    regularPrice: "21,90",
    promotionalPrice: "15,99",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Acém bovino em cubos",
    regularPrice: "34,90",
    promotionalPrice: "24,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Cupim especial para churrasco",
    regularPrice: "46,90",
    promotionalPrice: "34,90",
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=85",
  },
] as const;

function createStudioOffers(): Offer[] {
  return STUDIO_PRODUCT_OFFERS.map((item, index) => {
    const source = seedOffers[index % seedOffers.length];
    return {
      ...source,
      id: `studio-offer-${index + 1}`,
      name: item.name,
      regularPrice: item.regularPrice,
      promotionalPrice: item.promotionalPrice,
      unit: item.unit,
      image: item.image,
      displayOrder: index,
      active: true,
    };
  });
}

const studioContent = contentFromData({
  sector: "acougue",
  offers: createStudioOffers(),
  media: [],
});

export function MotionPreview({
  config,
  activePresetName,
  replayKey,
  onReplay,
  speed,
  onSpeedChange,
  onCopyConfig,
  copied,
  onLayoutChange,
  onUpdateConfig,
  onUpdateLayoutTuning,
  onResetLayoutTuning,
  onSaveLayoutToTv,
  sector = "acougue",
  onSectorChange,
  onSelectElement,
  isCleanView = false,
  onExitCleanView,
  zoom = "fit",
  isPaused = true,
  onTogglePause,
  showBoxes = true,
  onToggleShowBoxes,
  isInteractiveMode = true,
  isFullscreen = false,
  onToggleFullscreen,
}: MotionPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic stage size measurement (width & height)
  const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 700,
  });

  const [useRealData, setUseRealData] = useState<boolean>(true);
  const [realContent, setRealContent] = useState<TvContent>(() => cachedContent(sector));
  const [tuningCopied, setTuningCopied] = useState<boolean>(false);
  const [tuningSaved, setTuningSaved] = useState<boolean>(false);

  // ResizeObserver to calculate available stage dimensions in real-time
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;

    const updateDimensions = () => {
      const rect = stageEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();

    const ro = new ResizeObserver(() => {
      updateDimensions();
    });

    ro.observe(stageEl);
    window.addEventListener("resize", updateDimensions);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Supabase real TV content subscription
  useEffect(() => {
    setRealContent(cachedContent(sector));
    if (!databaseConfigured) return;

    loadTvContent(sector)
      .then((data) => setRealContent(data))
      .catch((err) => console.warn("[MotionPreview] Erro ao carregar ofertas:", err));

    const unsubscribe = subscribeToTvContent(
      sector,
      (data) => setRealContent(data),
      (err) => console.warn("[MotionPreview] Erro Realtime:", err)
    );

    return () => unsubscribe();
  }, [sector]);

  const activeContent = useRealData ? realContent : studioContent;
  const currentSectorLabel =
    SECTORS.find((s) => s.id === sector)?.label || sector.toUpperCase();

  const studioTheme = useMemo(() => {
    const base = resolveTheme(config.themeSlug);
    const overrides = config.colorOverrides || {};
    return {
      ...base,
      tokens: {
        ...base.tokens,
        colors: {
          ...base.tokens.colors,
          ...(overrides.productName ? { text: overrides.productName } : {}),
          ...(overrides.background ? { background: overrides.background } : {}),
          ...(overrides.price ? { accent: overrides.price } : {}),
        },
        badge: {
          ...base.tokens.badge,
          ...(overrides.badgeBg ? { background: overrides.badgeBg } : {}),
          ...(overrides.badgeText ? { color: overrides.badgeText } : {}),
        },
      },
    };
  }, [config.themeSlug, config.colorOverrides]);

  const styleOverrides = useMemo(() => {
    const overrides: Record<string, string> = {};
    const co = config.colorOverrides || {};

    if (config.background.type === "solid") {
      const color = co.enabled && co.background ? co.background : config.background.color;
      overrides["--tv-bg-override"] = color;
      overrides["--tv-bg-gradient"] = color;
    } else if (config.background.type === "gradient") {
      const start = config.background.gradientStart;
      const end = config.background.gradientEnd;
      const angle = config.background.gradientAngle;
      overrides["--tv-bg-gradient"] = `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`;
      overrides["--tv-bg-override"] = start;
    }

    if (co.enabled) {
      if (co.productName) overrides["--color-product-name"] = co.productName;
      if (co.price) overrides["--color-price-integer"] = co.price;
      if (co.cents || co.priceCents) overrides["--color-price-cents"] = co.cents || co.priceCents || "";
      if (co.currency) overrides["--color-currency"] = co.currency;
      if (co.unit) overrides["--color-unit"] = co.unit;
      if (co.oldPrice) overrides["--color-old-price"] = co.oldPrice;
      if (co.strikeColor) overrides["--color-strike"] = co.strikeColor;
      if (co.badgeBg) overrides["--color-badge-bg"] = co.badgeBg;
      if (co.badgeText) overrides["--color-badge-text"] = co.badgeText;
      if (co.fontFamily) overrides["--font-family-titles"] = co.fontFamily;
      if (co.fontFamilyPrice) overrides["--font-family-price"] = co.fontFamilyPrice;
      if (co.productNameFontWeight || co.fontWeightName) {
        overrides["--font-weight-product-name"] = String(co.productNameFontWeight || co.fontWeightName);
      }
    }

    return overrides as React.CSSProperties;
  }, [config.background, config.colorOverrides]);

  const handleCopyLayoutCssAndJson = () => {
    const text = formatCompleteTuningExport(
      config.layout,
      config.layoutTuning?.[config.layout],
      config.layoutTuning
    );
    void navigator.clipboard.writeText(text);
    setTuningCopied(true);
    setTimeout(() => setTuningCopied(false), 2600);
  };

  const handleSaveToTv = () => {
    if (onSaveLayoutToTv) {
      onSaveLayoutToTv();
      setTuningSaved(true);
      setTimeout(() => setTuningSaved(false), 2600);
    }
  };

  // Keyboard shortcut listener for Clean View and Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      if (e.key === "Escape" && isCleanView && onExitCleanView) {
        e.preventDefault();
        onExitCleanView();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        onToggleFullscreen?.();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        onTogglePause?.();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onReplay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCleanView, onExitCleanView, onToggleFullscreen, onTogglePause, onReplay]);

  // 16:9 DYNAMIC CANVAS CALCULATION (Dominant, Max Available Space)
  const { canvasWidth, canvasHeight } = useMemo(() => {
    const pad = isCleanView ? 24 : 32;
    const availW = Math.max(100, stageDimensions.width - pad);
    const availH = Math.max(100, stageDimensions.height - pad);

    // Dynamic 16:9 aspect calculation
    let w = Math.min(availW, availH * (16 / 9));
    let h = w * (9 / 16);

    // Apply zoom multiplier
    if (zoom === "50") {
      w *= 0.5;
      h *= 0.5;
    } else if (zoom === "75") {
      w *= 0.75;
      h *= 0.75;
    } else if (zoom === "100") {
      // 100% fits max available or native 1:1
      w = Math.min(availW, Math.max(800, availW * 0.9));
      h = w * (9 / 16);
    } else if (zoom === "125") {
      w *= 1.25;
      h *= 1.25;
    }

    return {
      canvasWidth: Math.round(w),
      canvasHeight: Math.round(h),
    };
  }, [stageDimensions, isCleanView, zoom]);

  return (
    <main
      ref={stageRef}
      className={`motion-canvas-stage ${isCleanView ? "is-clean-stage" : ""}`}
      aria-label="Palco central do Canvas 16:9"
    >
      {/* Dynamic 16:9 Dominant Canvas Monitor */}
      <div
        ref={containerRef}
        className={`motion-preview-monitor ${isFullscreen ? "is-fullscreen" : ""}`}
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          aspectRatio: "16 / 9",
          position: "relative",
          borderRadius: "8px",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
          flex: "none",
        }}
      >
        <div
          className={`motion-lab-player-wrapper lab-pos-${config.logo.position} lab-sector-${config.logo.sectorLayout} lab-impact-${config.pricePhysics.impact}`}
          style={styleOverrides}
          key={`motion-preview-key-${replayKey}`}
        >
          <TvPlayer
            content={activeContent}
            mode="tv"
            connection="online"
            sectorLabel={config.logo.sectorText || currentSectorLabel}
            theme={studioTheme}
            layoutOverride={config.layout}
            motionConfig={config}
            paused={isPaused}
          />
        </div>

        {/* Lightweight Non-Intrusive Interactive Selection Overlay */}
        {isInteractiveMode && (
          <InteractiveLayoutOverlay
            layout={config.layout}
            config={config}
            onUpdateConfig={onUpdateConfig}
            tuning={config.layoutTuning?.[config.layout] || {}}
            onUpdateTuning={(updater) => {
              if (onUpdateLayoutTuning) {
                onUpdateLayoutTuning(config.layout, updater);
              }
            }}
            onCopyCssAndJson={handleCopyLayoutCssAndJson}
            onSaveToTv={handleSaveToTv}
            onResetLayout={() => {
              if (onResetLayoutTuning) {
                onResetLayoutTuning(config.layout);
              }
            }}
            copied={tuningCopied}
            saved={tuningSaved}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            containerRef={containerRef}
            onSelectElement={onSelectElement}
            showTopBanner={false}
            showFloatingPanel={false}
            showOnScreenBoxes={showBoxes}
          />
        )}
      </div>

      {/* Floating Clean Mode Exit Button */}
      {isCleanView && (
        <button
          type="button"
          className="btn-clean-mode-floating-exit"
          onClick={onExitCleanView}
          title="Sair do Modo Limpo (Atalho: Esc ou H)"
        >
          <Eye size={13} />
          <span>Sair do Modo Limpo (Esc / H)</span>
        </button>
      )}
    </main>
  );
}
