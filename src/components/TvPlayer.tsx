import { useEffect, useMemo, useRef, useState } from "react";
import { isEligible, isMediaEligible } from "../data";
import type { TvContent, TvPlaylistItem } from "../types";
import {
  DEFAULT_TRANSITION_PRESET,
  EXIT_ANIMATION_DURATION,
  PAINT_SWIPE_COVER_DURATION,
  PAINT_SWIPE_REVEAL_DURATION,
  getExitPresetForItem,
  getTransitionClasses,
  type ExitPreset,
  type TransitionPreset,
} from "../transitions";
import { ImageSlide } from "./ImageSlide";
import { OfferSlide, OpeningSlide } from "./OfferSlide";
import { VideoSlide } from "./VideoSlide";
import { PaintSwipeOverlay } from "./PaintSwipeOverlay";
import { BlackFridayDecorations } from "./BlackFridayDecorations";
import type { ThemeDefinition } from "../themes/types";
import { toThemeStyle } from "../themes/toThemeStyle";
import type { OfferLayout } from "../offers/layouts";
import type { MotionConfig } from "../motion/types";
import { loadActiveMotionConfig } from "../motion/storage";

export type TvPlayerProps = {
  content: TvContent;
  mode?: "tv" | "preview";
  connection?: "online" | "syncing" | "offline";
  lastSync?: Date | null;
  sectorLabel?: string;
  transitionPreset?: TransitionPreset;
  theme: ThemeDefinition;
  layoutOverride?: OfferLayout;
  motionConfig?: MotionConfig;
};

export function TvPlayer({
  content,
  mode = "tv",
  connection = "online",
  lastSync = null,
  sectorLabel,
  transitionPreset,
  theme,
  layoutOverride,
  motionConfig,
}: TvPlayerProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  const [paintPhase, setPaintPhase] = useState<"idle" | "covering" | "revealing">("idle");
  const exitTimerRef = useRef<number | null>(null);
  const paintRevealTimerRef = useRef<number | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

  // Resolve motion configuration (from props or local persistence)
  const activeMotion = useMemo(() => {
    if (motionConfig) return motionConfig;
    if (typeof window !== "undefined") {
      try {
        return loadActiveMotionConfig();
      } catch {}
    }
    return null;
  }, [motionConfig]);

  // Theme resolution overlayed with active motion tokens
  const effectiveTheme = useMemo(() => {
    if (!activeMotion) return theme;
    return {
      ...theme,
      tokens: {
        ...theme.tokens,
        badge: {
          ...theme.tokens.badge,
          label: activeMotion.badge.text || theme.tokens.badge.label,
          background: activeMotion.badge.background || theme.tokens.badge.background,
        },
      },
    };
  }, [theme, activeMotion]);

  const motionStyleOverrides = useMemo(() => {
    if (!activeMotion) return {};
    const styles: Record<string, string> = {
      "--lab-speed-scale": `${1 / (activeMotion.speed || 1)}`,
      "--lab-logo-size": `${activeMotion.logo.size}px`,
      "--lab-sector-text-size": `${activeMotion.logo.sectorTextSize}px`,
      "--lab-badge-rotation": `${activeMotion.badge.rotation}deg`,
      "--lab-ambient-speed": `${activeMotion.ambient.speed}s`,
      "--lab-ambient-opacity": `${activeMotion.ambient.opacity / 100}`,
      "--lab-shimmer-display": activeMotion.pricePhysics.shimmer ? "block" : "none",
    };

    if (activeMotion.logo.sectorTextColor) {
      styles["--lab-sector-text-color"] = activeMotion.logo.sectorTextColor;
    }

    // Theme slug of current effective theme
    const isThemeBlackFriday = effectiveTheme.slug === "black-friday";

    // Custom Color Overrides (Only injected if explicitly enabled by user)
    if (activeMotion.colorOverrides?.enabled) {
      const co = activeMotion.colorOverrides;
      if (co.background) {
        styles["--bf-custom-bg"] = co.background;
        styles["--lab-custom-bg"] = co.background;
      }
      if (co.productName) styles["--bf-custom-name-color"] = co.productName;
      if (co.price) styles["--bf-custom-price-color"] = co.price;
      if (co.currency) styles["--bf-custom-currency-color"] = co.currency;
      if (co.unit) styles["--bf-custom-unit-color"] = co.unit;
      if (co.oldPrice) styles["--bf-custom-oldprice-color"] = co.oldPrice;
      if (co.strikeColor) styles["--bf-custom-strike-color"] = co.strikeColor;
      if (co.capsuleBg) styles["--bf-custom-capsule-bg"] = co.capsuleBg;
      if (co.capsuleText) styles["--bf-custom-capsule-text"] = co.capsuleText;
      if (co.sectorText) {
        styles["--bf-custom-sector-color"] = co.sectorText;
        styles["--lab-sector-text-color"] = co.sectorText;
      }
      if (co.badgeBg) styles["--bf-custom-badge-bg"] = co.badgeBg;
      if (co.badgeText) styles["--bf-custom-badge-text"] = co.badgeText;
    } else if (activeMotion.background && !isThemeBlackFriday) {
      // General background override (only if not Black Friday default or explicitly modified)
      if (activeMotion.background.type === "image" && activeMotion.background.imageUrl) {
        styles["--lab-custom-bg-image"] = `url(${activeMotion.background.imageUrl})`;
      } else if (
        activeMotion.themeSlug !== "black-friday" &&
        activeMotion.background.type === "solid" &&
        activeMotion.background.color
      ) {
        styles["--lab-custom-bg"] = activeMotion.background.color;
      } else if (
        activeMotion.themeSlug !== "black-friday" &&
        activeMotion.background.type === "gradient"
      ) {
        styles["--lab-custom-bg"] = `linear-gradient(${activeMotion.background.gradientAngle || 135}deg, ${activeMotion.background.gradientStart || "#1a0407"}, ${activeMotion.background.gradientEnd || "#050608"})`;
      }
    }

    return styles as React.CSSProperties;
  }, [activeMotion, effectiveTheme]);

  const motionClassNames = useMemo(() => {
    if (!activeMotion) return "";
    const cardStyle = activeMotion.productCard?.style || "transparent";
    const nameAnim = activeMotion.elementAnimations?.nameAnimation || "slide-up";
    const priceAnim = activeMotion.elementAnimations?.priceAnimation || "impact";
    const imgAnim = activeMotion.elementAnimations?.imageAnimation || "float";
    const choreo = activeMotion.elementAnimations?.choreography || "staggered";

    return `lab-pos-${activeMotion.logo.position} lab-sector-${activeMotion.logo.sectorLayout} lab-impact-${activeMotion.pricePhysics.impact} lab-card-${cardStyle} anim-name-${nameAnim} anim-price-${priceAnim} anim-image-${imgAnim} choreo-${choreo}`;
  }, [activeMotion]);

  const themeStyle = useMemo(() => toThemeStyle(effectiveTheme), [effectiveTheme]);
  const activeTransitionPreset =
    transitionPreset || effectiveTheme.tokens.transitionPreset || DEFAULT_TRANSITION_PRESET;

  // Filter active and eligible offers and media (memoized for referential stability)
  const eligibleOffers = useMemo(
    () => content.offers.filter((o) => isEligible(o)),
    [content.offers],
  );
  const eligibleMedia = useMemo(
    () => content.media.filter((m) => isMediaEligible(m)),
    [content.media],
  );

  // Filter playlist items whose underlying offer/media/composition is active and eligible
  const playlist: TvPlaylistItem[] = useMemo(() => {
    return content.playlist.filter((item) => {
      if (!item.active) return false;
      if (item.kind === "offer") {
        return eligibleOffers.some((o) => o.id === item.offer.id);
      }
      if (item.kind === "composition") {
        return (
          item.composition.active &&
          item.composition.offers.length > 0 &&
          item.composition.offers.some((o) => isEligible(o))
        );
      }
      if (item.kind === "image" || item.kind === "video") {
        return eligibleMedia.some((m) => m.id === item.id);
      }
      return true;
    });
  }, [content.playlist, eligibleOffers, eligibleMedia]);

  const safeIndex = playlist.length ? index % playlist.length : 0;
  const currentItem = playlist[safeIndex];
  const isVideo = currentItem?.kind === "video";
  const duration = Math.max(2, Number(currentItem?.duration) || 8) * 1000;
  const currentExitPreset: ExitPreset =
    (activeMotion?.exitPreset as ExitPreset) || getExitPresetForItem(currentItem?.kind);

  const isPaintSwipe =
    currentExitPreset === "paint-swipe" || currentExitPreset === "paint-swipe-right";

  const paintSpeed = activeMotion?.paintSwipe?.speed || "normal";
  const paintCoverDuration =
    paintSpeed === "fast" ? 300 : paintSpeed === "smooth" ? 550 : PAINT_SWIPE_COVER_DURATION;
  const paintRevealDuration =
    paintSpeed === "fast" ? 300 : paintSpeed === "smooth" ? 550 : PAINT_SWIPE_REVEAL_DURATION;

  const currentExitDuration = isPaintSwipe ? paintCoverDuration : EXIT_ANIMATION_DURATION;

  const prevItemIdRef = useRef<string | undefined>(currentItem?.id);

  // Preload the next item to prevent black screens (without redundant requests)
  useEffect(() => {
    if (playlist.length <= 1) return;
    const nextIdx = (safeIndex + 1) % playlist.length;
    const nextItem = playlist[nextIdx];
    if (!nextItem) return;

    const urlToPreload =
      nextItem.kind === "image"
        ? nextItem.src
        : nextItem.kind === "offer"
          ? nextItem.offer.image
          : nextItem.kind === "composition"
            ? nextItem.composition.offers[0]?.image
            : null;

    if (urlToPreload && !preloadedUrlsRef.current.has(urlToPreload)) {
      preloadedUrlsRef.current.add(urlToPreload);
      const img = new Image();
      img.src = urlToPreload;
    }
  }, [safeIndex, playlist]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (paintRevealTimerRef.current) {
        window.clearTimeout(paintRevealTimerRef.current);
        paintRevealTimerRef.current = null;
      }
    };
  }, []);

  // When the active item changes (advance, deleted, inactivated), clean up exit timer and reset elapsed
  useEffect(() => {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setElapsed(0);
    setIsExiting(false);
    prevItemIdRef.current = currentItem?.id;
  }, [currentItem?.id]);

  // Synchronize index when playlist changes:
  // 1. If currently playing item is still in the playlist, preserve it uninterrupted.
  // 2. If currently playing item was deleted or inactivated, clamp index safely to next item.
  useEffect(() => {
    if (!playlist.length) {
      setIndex(0);
      return;
    }

    const currentId = prevItemIdRef.current;
    if (currentId) {
      const existingIdx = playlist.findIndex((item) => item.id === currentId);
      if (existingIdx !== -1) {
        if (existingIdx !== index) {
          setIndex(existingIdx);
        }
        return;
      } else {
        console.log("[SOL TV playlist] item removido por inatividade", currentId);
      }
    }

    // The previous item was deleted or inactivated -> safely clamp index
    if (index >= playlist.length) {
      setIndex(index % playlist.length);
    }
  }, [playlist, index]);

  // Timer for non-video slides (or fallback for videos with fixed duration)
  useEffect(() => {
    if (paused || !currentItem || isVideo) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const time = performance.now();
      setElapsed((e) => e + time - last);
      last = time;
    }, 100);
    return () => clearInterval(timer);
  }, [paused, currentItem?.id, isVideo]);

  const advanceToNextItem = (isManual = false) => {
    if (playlist.length <= 1) {
      setElapsed(0);
      setIsExiting(false);
      return;
    }

    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (paintRevealTimerRef.current) {
      window.clearTimeout(paintRevealTimerRef.current);
      paintRevealTimerRef.current = null;
    }

    setIndex((i) => (i + 1) % playlist.length);
    setElapsed(0);
    setIsExiting(false);

    if (isPaintSwipe) {
      setPaintPhase("revealing");
      paintRevealTimerRef.current = window.setTimeout(() => {
        setPaintPhase("idle");
        paintRevealTimerRef.current = null;
      }, paintRevealDuration);
    }
  };

  const advanceNext = () => {
    advanceToNextItem(true);
  };

  // Auto-advance and exit trigger for timed items (offers & images)
  useEffect(() => {
    if (isVideo || paused || playlist.length <= 1) return;

    // Trigger exit animation smoothly in the last milliseconds of the slide
    if (
      !isExiting &&
      duration > currentExitDuration &&
      elapsed >= duration - currentExitDuration
    ) {
      setIsExiting(true);
      if (isPaintSwipe) {
        setPaintPhase("covering");
      }
    }

    // Advance when full duration elapses
    if (elapsed >= duration) {
      advanceToNextItem(false);
    }
  }, [
    elapsed,
    duration,
    playlist.length,
    isVideo,
    paused,
    isExiting,
    currentExitDuration,
    isPaintSwipe,
    paintRevealDuration,
  ]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shell.current?.requestFullscreen();
      }
    } catch {
      setError("Não foi possível alternar o modo tela cheia.");
    }
  };

  useEffect(() => {
    if (mode !== "tv") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  const sectorTitle =
    activeMotion?.logo.sectorText ||
    sectorLabel ||
    (content.sector === "acougue"
      ? "AÇOUGUE"
      : content.sector === "padaria"
        ? "PADARIA"
        : content.sector === "caixas"
          ? "FRENTE DE CAIXAS"
          : content.sector.toUpperCase());

  const logoImageSrc = activeMotion?.logo.image || "/logo-sol.png";

  function renderSlideContent(item: TvPlaylistItem) {
    if (item.kind === "composition") {
      return (
        <OfferSlide
          key={`comp-${item.id}`}
          offers={item.composition.offers}
          layout={layoutOverride || item.composition.layout}
          paused={paused}
          badgeLabel={activeMotion?.badge.text || effectiveTheme.tokens.badge.label}
          badgeType={activeMotion?.badge.type || "text"}
          badgeImage={activeMotion?.badge.image}
          badgeSize={activeMotion?.badge.size}
          badgePosition={activeMotion?.badge.position || "top-right"}
          badgeOffsetX={activeMotion?.badge.offsetX || 0}
          badgeOffsetY={activeMotion?.badge.offsetY || 0}
          cardStyle={activeMotion?.productCard?.style || "transparent"}
        />
      );
    }

    if (item.kind === "offer") {
      return (
        <OfferSlide
          key={`offer-${item.id}`}
          offer={item.offer}
          offers={eligibleOffers}
          layout={layoutOverride || item.offer.layout}
          paused={paused}
          badgeLabel={activeMotion?.badge.text || effectiveTheme.tokens.badge.label}
          badgeType={activeMotion?.badge.type || "text"}
          badgeImage={activeMotion?.badge.image}
          badgeSize={activeMotion?.badge.size}
          badgePosition={activeMotion?.badge.position || "top-right"}
          badgeOffsetX={activeMotion?.badge.offsetX || 0}
          badgeOffsetY={activeMotion?.badge.offsetY || 0}
          cardStyle={activeMotion?.productCard?.style || "transparent"}
        />
      );
    }

    if (item.kind === "image") {
      return (
        <ImageSlide
          key={`image-${item.id}`}
          src={item.src}
          title={item.title}
          onError={advanceNext}
        />
      );
    }

    if (item.kind === "video") {
      return (
        <VideoSlide
          key={`video-${item.id}`}
          src={item.src}
          title={item.title}
          paused={paused}
          onEnded={advanceNext}
          onError={advanceNext}
        />
      );
    }

    if (item.kind === "opening") {
      return <OpeningSlide key={`opening-${item.id}`} sector={sectorTitle} />;
    }

    return null;
  }

  const paintDirection =
    currentExitPreset === "paint-swipe-right"
      ? "right-to-left"
      : (activeMotion?.paintSwipe?.direction || "left-to-right");
  const paintColorMode = activeMotion?.paintSwipe?.colorMode || "dual";

  if (mode === "tv") {
    return (
      <div
        className={`tv-shell ${motionClassNames}`}
        data-theme={effectiveTheme.slug}
        data-animation-intensity={effectiveTheme.tokens.animationIntensity}
        style={{ ...themeStyle, ...motionStyleOverrides }}
        ref={shell}
        onDoubleClick={toggleFullscreen}
        title="Dê um duplo clique ou pressione F para tela cheia"
      >
        <div className="tv-top-brand">
          <img src={logoImageSrc} alt="Supermercado Sol" className="tv-brand-logo" />
          <span className="tv-brand-sector-text">{sectorTitle}</span>
        </div>
        <div className="tv-screen">
          {currentItem ? (
            <div
              key={currentItem.id}
              className={`tv-screen-content ${getTransitionClasses(activeTransitionPreset, isExiting, currentExitPreset)} ${paintPhase === "revealing" ? "slide-enter-paint-swipe" : ""}`}
            >
              {renderSlideContent(currentItem)}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <strong>SOL TV</strong>
                <p>Nenhum conteúdo disponível agora para o setor {sectorTitle}.</p>
                <small>A programação será iniciada automaticamente assim que houver conteúdos ativos.</small>
              </div>
            </div>
          )}
          <PaintSwipeOverlay
            phase={paintPhase}
            direction={paintDirection}
            colorMode={paintColorMode}
            speed={paintSpeed}
          />
          <BlackFridayDecorations fx={activeMotion?.fx} />
        </div>
        <div
          className="progress"
          style={{
            width: currentItem && !isVideo ? `${Math.min(100, (elapsed / duration) * 100)}%` : 0,
          }}
        />
      </div>
    );
  }

  return (
    <div className="player">
      <div className="topbar">
        <div>
          <h2>Pré-visualização da TV ({sectorTitle})</h2>
          <p>
            Formato 16:9 · {playlist.length} itens na playlist ·{" "}
            {paused ? "Pausado" : "Reprodução automática"}
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!currentItem}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Continuar" : "Pausar"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!currentItem}
            onClick={advanceNext}
          >
            Próximo item
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleFullscreen}
          >
            Tela cheia
          </button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div
        className={`tv-shell ${motionClassNames}`}
        data-theme={effectiveTheme.slug}
        data-animation-intensity={effectiveTheme.tokens.animationIntensity}
        style={{ ...themeStyle, ...motionStyleOverrides }}
        ref={shell}
      >
        <div className="tv-top-brand">
          <img src={logoImageSrc} alt="Supermercado Sol" className="tv-brand-logo" />
          <span className="tv-brand-sector-text">{sectorTitle}</span>
        </div>
        <div className="tv-screen">
          {currentItem ? (
            <div
              key={currentItem.id}
              className={`tv-screen-content ${getTransitionClasses(activeTransitionPreset, isExiting, currentExitPreset)} ${paintPhase === "revealing" ? "slide-enter-paint-swipe" : ""}`}
            >
              {renderSlideContent(currentItem)}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <strong>SOL TV</strong>
                <p>Nenhum conteúdo disponível agora.</p>
                <small>
                  Cadastre uma oferta ou mídia ativa para este setor.
                </small>
              </div>
            </div>
          )}
          <PaintSwipeOverlay
            phase={paintPhase}
            direction={paintDirection}
            colorMode={paintColorMode}
            speed={paintSpeed}
          />
          <BlackFridayDecorations fx={activeMotion?.fx} />
        </div>
        <div
          className="progress"
          style={{
            width: currentItem && !isVideo ? `${Math.min(100, (elapsed / duration) * 100)}%` : 0,
          }}
        />
      </div>
      <div className="player-footer">
        <span>
          {currentItem
            ? `Item ${safeIndex + 1} de ${playlist.length} · ${currentItem.kind.toUpperCase()}${
                currentItem.duration ? ` · ${currentItem.duration}s` : ""
              }`
            : "Playlist vazia"}
        </span>
        <time>
          {lastSync
            ? `Sincronizado ${lastSync.toLocaleTimeString("pt-BR")}`
            : new Date(now).toLocaleTimeString("pt-BR")}
        </time>
      </div>
    </div>
  );
}
