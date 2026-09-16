import { useMemo, useRef, useState, useEffect } from "react";
import { Maximize2, Minimize2, Play, Copy, Check } from "lucide-react";
import { TvPlayer } from "../TvPlayer";
import { contentFromData, seedOffers } from "../../data";
import { resolveTheme } from "../../themes/resolveTheme";
import type { MotionConfig } from "../../motion/types";
import type { Offer } from "../../types";

export type MotionPreviewProps = {
  config: MotionConfig;
  activePresetName?: string;
  replayKey: number;
  onReplay: () => void;
  onSpeedChange: (speed: number) => void;
  onCopyConfig: () => void;
  copied: boolean;
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
}: MotionPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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
      // Toggle fullscreen with 'f' if not inside an input/textarea
      const target = e.target as HTMLElement;
      if (
        (e.key === "f" || e.key === "F") &&
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA" &&
        target.tagName !== "SELECT"
      ) {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <main className="motion-preview-area">
      {/* Monitor Header Meta */}
      <div className="preview-top-meta">
        <div className="preview-meta-left">
          <span className="live-pulse-dot" />
          <span className="meta-badge-live">CANVAS AO VIVO (16:9)</span>
          {activePresetName && (
            <span className="meta-preset-badge">Preset: <strong>{activePresetName}</strong></span>
          )}
          <span className="meta-details">
            Tema: {baseTheme.name} · Layout: {config.layout.toUpperCase()}
          </span>
        </div>

        <div className="preview-meta-right">
          <span className="shortcut-tip">Pressione <kbd>F</kbd> para tela cheia</span>
        </div>
      </div>

      {/* 16:9 Hero Display Frame */}
      <div
        ref={containerRef}
        className={`motion-preview-monitor ${isFullscreen ? "is-fullscreen" : ""}`}
        onDoubleClick={toggleFullscreen}
      >
        <div
          className={`motion-lab-player-wrapper lab-pos-${config.logo.position} lab-sector-${config.logo.sectorLayout} lab-impact-${config.pricePhysics.impact}`}
          style={styleOverrides}
          key={`motion-preview-key-${replayKey}`}
        >
          <TvPlayer
            content={studioContent}
            mode="preview"
            connection="online"
            sectorLabel={config.logo.sectorText}
            theme={studioTheme}
            layoutOverride={config.layout}
            motionConfig={config}
          />
        </div>

        {/* Floating Quick Fullscreen Trigger */}
        <button
          type="button"
          className="btn-monitor-fullscreen"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia (F)"}
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

