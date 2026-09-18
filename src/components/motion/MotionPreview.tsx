import { useMemo, useRef, useState, useEffect } from "react";
import {
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Copy,
  Check,
  Tv,
  Database,
  LayoutGrid,
  Sliders,
  ZoomIn,
} from "lucide-react";
import { TvPlayer } from "../TvPlayer";
import { contentFromData, seedOffers, SECTORS } from "../../data";
import { resolveTheme } from "../../themes/resolveTheme";
import { cachedContent, databaseConfigured, loadTvContent, subscribeToTvContent } from "../../supabase";
import type { MotionConfig, PerLayoutTuning } from "../../motion/types";
import type { Offer, TvContent } from "../../types";
import type { OfferLayout } from "../../offers/layouts";
import { InteractiveLayoutOverlay } from "./InteractiveLayoutOverlay";
import { formatCompleteTuningExport } from "../../motion/layoutTuningFormatter";

export type MotionPreviewProps = {
  config: MotionConfig;
  activePresetName?: string;
  replayKey: number;
  onReplay: () => void;
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
}: MotionPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [previewSector, setPreviewSector] = useState<string>(sector);
  const [useRealData, setUseRealData] = useState<boolean>(true);
  const [realContent, setRealContent] = useState<TvContent>(() => cachedContent(sector));
  const [isInteractiveMode, setIsInteractiveMode] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [tuningCopied, setTuningCopied] = useState<boolean>(false);
  const [tuningSaved, setTuningSaved] = useState<boolean>(false);
  const [zoom, setZoom] = useState<"fit" | "50" | "75" | "100" | "125">("fit");

  // Keep previewSector synchronized with parent sector
  useEffect(() => {
    if (sector && sector !== previewSector) {
      setPreviewSector(sector);
    }
  }, [sector]);

  // Realtime subscription to live TV data for the selected sector
  useEffect(() => {
    setRealContent(cachedContent(previewSector));

    if (!databaseConfigured) return;

    loadTvContent(previewSector, true)
      .then((data) => {
        setRealContent(data);
      })
      .catch((err) => {
        console.error("[MotionPreview] Erro ao carregar TV:", err);
      });

    const unsubscribe = subscribeToTvContent(
      previewSector,
      (data) => {
        setRealContent(data);
      },
      () => {},
      true
    );

    return () => {
      unsubscribe();
    };
  }, [previewSector]);

  const sampleVideoUrl =
    realContent.media.find((m) => m.type === "video")?.mediaUrl ||
    "https://cdn.coverr.co/videos/coverr-a-chef-preparing-meat-1577/1080p.mp4";

  const videoContent = useMemo((): TvContent => {
    return {
      sector: previewSector,
      offers: [],
      media: [
        {
          id: "preview-video-slide",
          type: "video",
          title: "Vídeo Institucional / Ofertas",
          mediaUrl: sampleVideoUrl,
          sector: previewSector,
          duration: 15,
          position: 0,
          active: true,
        },
      ],
      compositions: [],
      playlist: [
        {
          id: "preview-video-slide",
          kind: "video",
          title: "Vídeo Institucional / Ofertas",
          src: sampleVideoUrl,
          duration: 15,
          position: 0,
          active: true,
        },
      ],
      publishedAt: new Date().toISOString(),
    };
  }, [previewSector, sampleVideoUrl]);

  // Determine active content (real TV content, demo fallback, or video preview)
  const activeContent = useMemo(() => {
    if ((config.layout as string) === "video") {
      return videoContent;
    }
    if (!useRealData) {
      return studioContent;
    }
    return realContent;
  }, [config.layout, videoContent, useRealData, realContent]);

  const currentSectorLabel = useMemo(() => {
    const match = SECTORS.find((s) => s.id === previewSector);
    return match?.label || previewSector.toUpperCase();
  }, [previewSector]);

  // Base theme resolution
  const baseTheme = resolveTheme(config.themeSlug);

  // Dynamic Theme overlay with badge overrides
  const studioTheme = useMemo(() => {
    return {
      ...baseTheme,
      tokens: {
        ...baseTheme.tokens,
        badge: {
          ...baseTheme.tokens.badge,
          label: config.badge.text || baseTheme.tokens.badge.label,
          background: config.badge.background || baseTheme.tokens.badge.background,
        },
      },
    };
  }, [baseTheme, config.badge.text, config.badge.background]);

  // CSS Variable Overrides for realtime fine-tuning
  const styleOverrides = useMemo(() => {
    return {
      "--lab-speed-scale": `${1 / (config.speed || 1)}`,
      "--lab-logo-size": `${config.logo.size}px`,
      "--lab-sector-text-color": config.logo.sectorTextColor,
      "--lab-sector-text-size": `${config.logo.sectorTextSize}px`,
      "--lab-badge-rotation": `${config.badge.rotation}deg`,
      "--lab-ambient-speed": `${config.ambient.speed}s`,
      "--lab-ambient-opacity": `${config.ambient.opacity / 100}`,
      "--lab-shimmer-display": config.pricePhysics.shimmer ? "block" : "none",
    } as React.CSSProperties;
  }, [
    config.speed,
    config.logo.size,
    config.logo.sectorTextColor,
    config.logo.sectorTextSize,
    config.badge.rotation,
    config.ambient.speed,
    config.ambient.opacity,
    config.pricePhysics.shimmer,
  ]);

  // Handle Copy of Layout CSS & JSON
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

  // Fullscreen handlers
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      void containerRef.current.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onReplay();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onReplay]);

  const LAYOUT_OPTIONS: Array<{ id: OfferLayout | "video"; label: string }> = [
    { id: "hero", label: "1 Prod (Hero)" },
    { id: "duo", label: "2 Prods (Duo)" },
    { id: "trio", label: "3 Prods (Trio)" },
    { id: "grid4", label: "4 Prods (Grid 4)" },
    { id: "grid8", label: "8 Prods (Grid 8)" },
    { id: "video", label: "🎬 Vídeo" },
  ];

  const ZOOM_OPTIONS: Array<{ id: "fit" | "50" | "75" | "100" | "125"; label: string }> = [
    { id: "fit", label: "Ajustar" },
    { id: "50", label: "50%" },
    { id: "75", label: "75%" },
    { id: "100", label: "100%" },
    { id: "125", label: "125%" },
  ];

  const monitorZoomStyle: React.CSSProperties = useMemo(() => {
    if (isFullscreen || zoom === "fit") {
      return { position: "relative", width: "100%", maxWidth: "1100px" };
    }
    const factor = Number(zoom) / 100;
    return {
      position: "relative",
      width: `${Math.round(1100 * factor)}px`,
      maxWidth: "100%",
    };
  }, [isFullscreen, zoom]);

  return (
    <main className="motion-preview-area">
      {/* Monitor Header Meta */}
      <div className="preview-top-meta">
        <div className="preview-meta-left">
          <span className="live-pulse-dot" />
          <span className="meta-badge-live">CANVAS 16:9</span>

          {/* Layout Selector Bar */}
          <div className="preview-layout-switcher">
            <LayoutGrid size={12} className="meta-icon" style={{ color: "var(--accent)" }} />
            {LAYOUT_OPTIONS.map((lo) => (
              <button
                key={lo.id}
                type="button"
                className={`layout-switch-btn ${config.layout === lo.id ? "active" : ""}`}
                onClick={() => {
                  if (onLayoutChange) {
                    onLayoutChange(lo.id as OfferLayout);
                  }
                }}
                title={`Visualizar e ajustar layout com ${lo.label}`}
              >
                {lo.label}
              </button>
            ))}
          </div>

          {/* Zoom Selector Bar */}
          <div className="preview-zoom-switcher">
            <ZoomIn size={12} className="meta-icon" />
            {ZOOM_OPTIONS.map((zo) => (
              <button
                key={zo.id}
                type="button"
                className={`zoom-switch-btn ${zoom === zo.id ? "active" : ""}`}
                onClick={() => setZoom(zo.id)}
                title={`Zoom do canvas: ${zo.label}`}
              >
                {zo.label}
              </button>
            ))}
          </div>

          {/* Interactive Mode Toggle */}
          <button
            type="button"
            className={`interactive-mode-toggle-btn ${isInteractiveMode ? "active" : ""}`}
            onClick={() => setIsInteractiveMode((prev) => !prev)}
            title="Ativar/Desativar ajuste interativo com mouse na tela"
          >
            <Sliders size={12} />
            <span>{isInteractiveMode ? "Ajuste com Mouse: ON" : "Ajuste com Mouse: OFF"}</span>
          </button>

          {/* Sector Selector Pill */}
          <div className="preview-sector-pill-wrapper">
            <Tv size={12} className="meta-icon" />
            <select
              className="preview-sector-select"
              value={previewSector}
              onChange={(e) => {
                setPreviewSector(e.target.value);
                if (onSectorChange) {
                  onSectorChange(e.target.value);
                }
              }}
              title="Selecione o setor da TV para pré-visualizar"
            >
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>
                  TV {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Real vs Mock Data Toggle */}
          <button
            type="button"
            className={`preview-source-btn ${useRealData ? "active" : ""}`}
            onClick={() => setUseRealData((prev) => !prev)}
            title={
              useRealData
                ? "Exibindo dados reais cadastrados na TV. Clique para usar produtos de teste."
                : "Exibindo produtos de teste. Clique para usar os dados reais da TV."
            }
          >
            <Database size={11} />
            <span>{useRealData ? "TV Real" : "Modo Teste"}</span>
          </button>
        </div>

        <div className="preview-meta-right">
          <span className="shortcut-tip">
            <kbd>Espaço</kbd> Pausar · <kbd>R</kbd> Replay · <kbd>F</kbd> Tela Cheia · <kbd>H</kbd> Modo Limpo
          </span>
        </div>
      </div>

      {/* 16:9 Hero Display Frame */}
      <div
        ref={containerRef}
        className={`motion-preview-monitor ${isFullscreen ? "is-fullscreen" : ""}`}
        onDoubleClick={toggleFullscreen}
        style={monitorZoomStyle}
      >
        <div
          className={`motion-lab-player-wrapper lab-pos-${config.logo.position} lab-sector-${config.logo.sectorLayout} lab-impact-${config.pricePhysics.impact}`}
          style={styleOverrides}
          key={`motion-preview-key-${replayKey}`}
        >
          <TvPlayer
            content={activeContent}
            mode="preview"
            connection="online"
            sectorLabel={config.logo.sectorText || currentSectorLabel}
            theme={studioTheme}
            layoutOverride={config.layout}
            motionConfig={config}
            paused={isPaused}
          />
        </div>

        {/* Interactive Layout Overlay */}
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
            onTogglePause={() => setIsPaused((p) => !p)}
            containerRef={containerRef}
          />
        )}

        {/* Floating Quick Fullscreen Trigger */}
        <button
          type="button"
          className="btn-monitor-fullscreen"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia (F)"}
          style={{ zIndex: 70 }}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Inline Playback and Quick Actions Toolbar */}
      <div className="preview-playback-bar">
        <div className="playback-left">
          <button
            type="button"
            className="btn btn-primary replay-action-btn"
            onClick={onReplay}
            title="Reiniciar animações de entrada do início"
          >
            <Play size={15} />
            <span>Replay Animação</span>
          </button>

          <button
            type="button"
            className={`btn ${isPaused ? "btn-warning" : "btn-secondary"} pause-action-btn`}
            onClick={() => setIsPaused((p) => !p)}
            title={isPaused ? "Continuar reprodução da TV" : "Pausar tela para editar"}
            style={{ fontWeight: 600 }}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
            <span>{isPaused ? "Continuar TV" : "Pausar TV"}</span>
          </button>

          <div className="speed-selector-group">
            <span className="speed-group-label">Velocidade:</span>
            {[
              { value: 0.25, label: "0.25x" },
              { value: 0.5, label: "0.5x" },
              { value: 1, label: "1.0x" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                className={`speed-pill-btn ${config.speed === s.value ? "active" : ""}`}
                onClick={() => {
                  onSpeedChange(s.value);
                  onReplay();
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="playback-right">
          <button
            type="button"
            className="btn btn-secondary copy-config-btn"
            onClick={onCopyConfig}
            title="Copiar configuração JSON para área de transferência"
          >
            {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
            <span>{copied ? "Configuração Copiada!" : "Copiar Configuração"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary fullscreen-bar-btn"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullscreen ? "Sair Tela Cheia" : "Tela Cheia"}</span>
          </button>
        </div>
      </div>

      {/* Footer Specs Summary Bar */}
      <div className="preview-footer-specs">
        <div className="spec-card">
          <span className="spec-label">Fundo & Visual</span>
          <span className="spec-val">
            {config.background.type.toUpperCase()}{" "}
            {config.background.type === "gradient" ? `(${config.background.gradientAngle}°)` : ""}
          </span>
        </div>
        <div className="spec-card">
          <span className="spec-label">Produto & Cards</span>
          <span className="spec-val">
            {config.productCard.style === "transparent"
              ? "Transparente (Sem Quadrado)"
              : config.productCard.style.toUpperCase()}
          </span>
        </div>
        <div className="spec-card">
          <span className="spec-label">Selo Promocional</span>
          <span className="spec-val">
            {config.badge.type === "image"
              ? `Imagem PNG (${config.badge.size || 70}px)`
              : `${config.badge.text} (${config.badge.rotation}°)`}
          </span>
        </div>
        <div className="spec-card">
          <span className="spec-label">Preço & Física</span>
          <span className="spec-val">
            {config.pricePhysics.impact.toUpperCase()} · Shimmer{" "}
            {config.pricePhysics.shimmer ? `(${config.pricePhysics.shimmerColor})` : "OFF"}
          </span>
        </div>
      </div>
    </main>
  );
}

