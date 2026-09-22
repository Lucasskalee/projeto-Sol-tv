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
import { TvViewport } from "./TvViewport";
import { ImageSlide } from "./ImageSlide";
import { OfferSlide, OpeningSlide } from "./OfferSlide";
import { VideoSlide } from "./VideoSlide";
import { PaintSwipeOverlay } from "./PaintSwipeOverlay";
import { BlackFridayDecorations } from "./BlackFridayDecorations";
import { BlackFridayImageElement } from "./motion/BlackFridayImageElement";
import { FireSparks } from "./effects/FireSparks";
import type { ThemeDefinition } from "../themes/types";
import { resolveTheme } from "../themes/resolveTheme";
import { toThemeStyle } from "../themes/toThemeStyle";
import { normalizeOfferLayout, type OfferLayout } from "../offers/layouts";
import type { MotionConfig } from "../motion/types";
import { loadActiveMotionConfig } from "../motion/storage";
import { isBlackFridayImageVisible as resolveBlackFridayImageVisibility } from "../motion/defaults";
import { useCachedMedia, preloadMediaList, pruneMediaCache } from "../mediaCache";

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
  paused?: boolean;
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
  paused: pausedProp,
}: TvPlayerProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [internalPaused, setInternalPaused] = useState(false);
  const paused = pausedProp !== undefined ? pausedProp : internalPaused;
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  const [paintPhase, setPaintPhase] = useState<"idle" | "covering" | "revealing">("idle");
  const exitTimerRef = useRef<number | null>(null);
  const paintRevealTimerRef = useRef<number | null>(null);
  const shell = useRef<HTMLDivElement>(null);

  // Resolve motion configuration (from props or local persistence for preview only)
  const activeMotion = useMemo(() => {
    if (motionConfig) return motionConfig;
    if (mode === "preview" && typeof window !== "undefined") {
      try {
        return loadActiveMotionConfig();
      } catch {}
    }
    return null;
  }, [motionConfig, mode]);

  // Resolve cached background image
  const rawBgImageUrl = activeMotion?.background?.imageUrl;
  const { url: cachedBgImageUrl } = useCachedMedia(rawBgImageUrl);
  const effectiveBgImageUrl = cachedBgImageUrl || rawBgImageUrl;

  // Theme resolution overlayed with active motion tokens
  const effectiveTheme = useMemo(() => {
    const targetTheme = activeMotion?.themeSlug ? resolveTheme(activeMotion.themeSlug) : theme;
    if (!activeMotion) return targetTheme;
    return {
      ...targetTheme,
      tokens: {
        ...targetTheme.tokens,
        badge: {
          ...targetTheme.tokens.badge,
          label: activeMotion.badge.text || targetTheme.tokens.badge.label,
          background: activeMotion.badge.background || targetTheme.tokens.badge.background,
        },
      },
    };
  }, [theme, activeMotion]);

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
  const duration = (currentItem?.duration || 10) * 1000;
  // Check if current slide is a video
  const isVideo = currentItem?.kind === "video" || (layoutOverride as string) === "video";

  // Video overlay configuration resolution
  const hasVideoOverlay = Boolean(isVideo && activeMotion?.videoOverlay?.enabled !== false);
  const videoLogoOverride = hasVideoOverlay ? activeMotion?.videoOverlay?.logo : undefined;
  const videoBfImageOverride = hasVideoOverlay ? activeMotion?.videoOverlay?.blackFridayImage : undefined;

  const effectiveLogoConfig = useMemo(() => {
    if (!activeMotion) return null;
    if (isVideo && videoLogoOverride) {
      return {
        ...activeMotion.logo,
        ...videoLogoOverride,
      };
    }
    return activeMotion.logo;
  }, [activeMotion, isVideo, videoLogoOverride]);

  const effectiveBfImageConfig = useMemo(() => {
    if (!activeMotion) return undefined;
    if (isVideo && videoBfImageOverride) {
      return {
        ...(activeMotion.blackFridayImage || {}),
        ...videoBfImageOverride,
      };
    }
    return activeMotion.blackFridayImage;
  }, [activeMotion, isVideo, videoBfImageOverride]);

  const isSolidBg =
    (activeMotion?.colorOverrides?.enabled && Boolean(activeMotion?.colorOverrides?.background)) ||
    activeMotion?.background?.type === "solid";

  const isNoFrame = activeMotion?.visibility?.frame === false;
  const isLogoVisible =
    isVideo && videoLogoOverride?.visible !== undefined
      ? videoLogoOverride.visible
      : activeMotion?.visibility?.logo !== false && activeMotion?.logo?.visible !== false;

  const isSloganVisible = activeMotion?.visibility?.slogan !== false && activeMotion?.subtitle?.visible !== false;
  const isDecorationsVisible = activeMotion?.visibility?.decorations !== false;
  const isBrushCornersVisible =
    activeMotion?.visibility?.brushCorners !== false &&
    activeMotion?.fx?.brushCorners?.enabled !== false &&
    isDecorationsVisible;
  const isFireSparksVisible = activeMotion?.visibility?.fireSparks !== false;
  const isBadgeAllowed = activeMotion?.visibility?.badge !== false && activeMotion?.badge?.visible !== false;
  const isOldPriceVisible = activeMotion?.visibility?.oldPrice !== false;
  const isUnitVisible = activeMotion?.visibility?.unit !== false;
  const isProductNameVisible = activeMotion?.visibility?.productName !== false;
  const isProductPriceVisible = activeMotion?.visibility?.productPrice !== false;
  const isProductImageVisible = activeMotion?.visibility?.productImage !== false;
  const isBlackFridayImageVisible =
    isVideo && videoBfImageOverride?.visible !== undefined
      ? videoBfImageOverride.visible
      : activeMotion
        ? resolveBlackFridayImageVisibility(activeMotion)
        : true;
  const isSunburstBg = activeMotion?.background?.type === "sunburst" && !isVideo;

  const logoInlineStyle: React.CSSProperties = useMemo(() => {
    if (!effectiveLogoConfig) return {};
    const st: React.CSSProperties = {
      display: isLogoVisible ? "flex" : "none",
    };

    if (effectiveLogoConfig.position === "custom") {
      if (effectiveLogoConfig.x !== undefined) st.left = `${effectiveLogoConfig.x}%`;
      if (effectiveLogoConfig.y !== undefined) st.top = `${effectiveLogoConfig.y}%`;
      st.right = "auto";
      st.bottom = "auto";
    }

    const tx = effectiveLogoConfig.offsetX || 0;
    const ty = effectiveLogoConfig.offsetY || 0;
    const sc = effectiveLogoConfig.scale ?? 1;
    const rot = effectiveLogoConfig.rotation ?? 0;
    st.transform = `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rot}deg)`;
    st.opacity = (effectiveLogoConfig.opacity ?? 100) / 100;

    return st;
  }, [effectiveLogoConfig, isLogoVisible]);

  const motionStyleOverrides = useMemo(() => {
    if (!activeMotion) return {};
    const styles: Record<string, string> = {
      "--lab-speed-scale": `${1 / (activeMotion.speed || 1)}`,
      "--lab-logo-size": `${effectiveLogoConfig?.size || activeMotion.logo.size}px`,
      "--lab-logo-x": `${effectiveLogoConfig?.offsetX || activeMotion.logo.offsetX || 0}px`,
      "--lab-logo-y": `${effectiveLogoConfig?.offsetY || activeMotion.logo.offsetY || 0}px`,
      "--lab-logo-display": isLogoVisible ? "flex" : "none",
      "--lab-sector-text-size": `${effectiveLogoConfig?.sectorTextSize || activeMotion.logo.sectorTextSize}px`,
      "--lab-sector-text-x": `${effectiveLogoConfig?.sectorOffsetX || activeMotion.logo.sectorOffsetX || 0}px`,
      "--lab-sector-text-y": `${effectiveLogoConfig?.sectorOffsetY || activeMotion.logo.sectorOffsetY || 0}px`,
      "--lab-subtitle-size": `${activeMotion.subtitle?.fontSize ?? 22}px`,
      "--lab-subtitle-x": `${activeMotion.subtitle?.offsetX || 0}px`,
      "--lab-subtitle-y": `${activeMotion.subtitle?.offsetY || 0}px`,
      "--lab-subtitle-color": activeMotion.subtitle?.color || "#111111",
      "--lab-subtitle-display": isSloganVisible ? "flex" : "none",
      "--lab-brush-corners-display": isBrushCornersVisible ? "block" : "none",
      "--lab-brush-corners-opacity": `${(activeMotion.fx?.brushCorners?.opacity ?? 100) / 100}`,
      "--lab-brush-corners-scale": `${activeMotion.fx?.brushCorners?.scale ?? 1}`,
      "--lab-badge-rotation": `${activeMotion.badge.rotation}deg`,
      "--lab-badge-size": `${activeMotion.badge.size || 70}px`,
      "--lab-badge-scale": `${(activeMotion.badge.size || 70) / 70}`,
      "--lab-badge-display": isBadgeAllowed ? "inline-flex" : "none",
      "--lab-ambient-speed": `${activeMotion.ambient.speed}s`,
      "--lab-ambient-opacity": `${activeMotion.ambient.opacity / 100}`,
      "--lab-shimmer-display": activeMotion.pricePhysics.shimmer ? "block" : "none",
    };

    // Normalized Logo Positioning & Transform
    if (effectiveLogoConfig?.x !== undefined) styles["--lab-logo-left"] = `${effectiveLogoConfig.x}%`;
    if (effectiveLogoConfig?.y !== undefined) styles["--lab-logo-top"] = `${effectiveLogoConfig.y}%`;
    styles["--lab-logo-scale"] = `${effectiveLogoConfig?.scale ?? 1}`;
    styles["--lab-logo-opacity"] = `${(effectiveLogoConfig?.opacity ?? 100) / 100}`;
    styles["--lab-logo-rotation"] = `${effectiveLogoConfig?.rotation ?? 0}deg`;

    if (effectiveLogoConfig?.sectorTextColor) {
      styles["--lab-sector-text-color"] = effectiveLogoConfig.sectorTextColor;
    }

    // Custom Color Overrides (Explicit overrides)
    if (activeMotion.colorOverrides?.enabled) {
      const co = activeMotion.colorOverrides;
      if (co.background) {
        styles["--bf-custom-bg"] = co.background;
        styles["--lab-custom-bg"] = co.background;
        styles["--theme-screen-background"] = co.background;
        styles["--theme-shell-background"] = co.background;
      }
      if (co.productName) {
        styles["--bf-custom-name-color"] = co.productName;
        styles["--theme-product-name-color"] = co.productName;
        styles["--color-product-name"] = co.productName;
      }
      if (co.price) {
        styles["--bf-custom-price-color"] = co.price;
        styles["--theme-price-color"] = co.price;
        styles["--color-product-price"] = co.price;
      }
      if (co.priceCents) {
        styles["--bf-custom-cents-color"] = co.priceCents;
        styles["--theme-price-cents-color"] = co.priceCents;
      }
      if (co.currency) {
        styles["--bf-custom-currency-color"] = co.currency;
        styles["--theme-price-currency-color"] = co.currency;
      }
      if (co.unit) {
        styles["--bf-custom-unit-color"] = co.unit;
        styles["--theme-price-unit-color"] = co.unit;
      }
      if (co.oldPrice) {
        styles["--bf-custom-oldprice-color"] = co.oldPrice;
        styles["--theme-oldprice-color"] = co.oldPrice;
      }
      if (co.strikeColor) {
        styles["--bf-custom-strike-color"] = co.strikeColor;
        styles["--theme-strike-color"] = co.strikeColor;
      }
      if (co.capsuleBg) styles["--bf-custom-capsule-bg"] = co.capsuleBg;
      if (co.capsuleText) styles["--bf-custom-capsule-text"] = co.capsuleText;
      if (co.sectorText) {
        styles["--bf-custom-sector-color"] = co.sectorText;
        styles["--lab-sector-text-color"] = co.sectorText;
      }
      if (co.badgeBg) styles["--bf-custom-badge-bg"] = co.badgeBg;
      if (co.badgeText) styles["--bf-custom-badge-text"] = co.badgeText;
      if (co.fontFamily) styles["--theme-product-font-family"] = co.fontFamily;
      if (co.fontFamilyPrice) styles["--theme-price-font-family"] = co.fontFamilyPrice;
      if (co.fontWeightName) styles["--theme-product-name-weight"] = String(co.fontWeightName);
      if (co.fontWeightPrice) styles["--theme-price-weight"] = String(co.fontWeightPrice);
      if (co.priceShadow !== undefined) styles["--theme-price-shadow"] = co.priceShadow;
    }

    if (activeMotion.background) {
      // General background override (Solid, Gradient, Image)
      if (activeMotion.background.type === "image" && effectiveBgImageUrl) {
        const bgImg = `url(${effectiveBgImageUrl})`;
        styles["--lab-custom-bg-image"] = bgImg;
        styles["--lab-custom-bg"] = `${bgImg} center/cover no-repeat`;
        styles["--bf-custom-bg"] = `${bgImg} center/cover no-repeat`;
        styles["--theme-screen-background"] = `${bgImg} center/cover no-repeat`;
      } else if (activeMotion.background.type === "solid" && activeMotion.background.color) {
        const solidBg = activeMotion.colorOverrides?.enabled && activeMotion.colorOverrides.background
          ? activeMotion.colorOverrides.background
          : activeMotion.background.color;
        styles["--lab-custom-bg"] = solidBg;
        styles["--bf-custom-bg"] = solidBg;
        styles["--theme-screen-background"] = solidBg;
        styles["--theme-shell-background"] = solidBg;
      } else if (activeMotion.background.type === "gradient") {
        const grad = `linear-gradient(${activeMotion.background.gradientAngle || 135}deg, ${activeMotion.background.gradientStart || "#1a0407"}, ${activeMotion.background.gradientEnd || "#050608"})`;
        styles["--lab-custom-bg"] = grad;
        styles["--bf-custom-bg"] = grad;
        styles["--theme-screen-background"] = grad;
        styles["--theme-shell-background"] = grad;
      } else if (activeMotion.background.type === "sunburst") {
        const sunburst = activeMotion.background.sunburst;
        const primary = sunburst?.primaryColor || activeMotion.background.gradientStart || "#FFB800";
        const secondary = sunburst?.secondaryColor || activeMotion.background.gradientEnd || "#FF6600";
        const speed = sunburst?.speed ?? 60;
        const scale = sunburst?.scale ?? 1.5;
        const rays = sunburst?.raysCount ?? 24;
        const pulse = sunburst?.glowPulse !== false;
        const rayAngle = 360 / Math.max(4, rays) / 2;

        styles["--sunburst-primary"] = primary;
        styles["--sunburst-secondary"] = secondary;
        styles["--sunburst-speed"] = `${speed}s`;
        styles["--sunburst-scale"] = `${scale}`;
        styles["--sunburst-ray-deg"] = `${rayAngle.toFixed(2)}deg`;
        styles["--sunburst-pulse-display"] = pulse ? "block" : "none";
        styles["--lab-custom-bg"] = primary;
        styles["--bf-custom-bg"] = primary;
        styles["--theme-screen-background"] = "transparent";
      }
    }

    if (isSolidBg && (!activeMotion.colorOverrides?.enabled || activeMotion.colorOverrides.priceShadow === undefined)) {
      styles["--theme-price-shadow"] = "none";
    }

    // Layout Tuning Overrides
    if (activeMotion.layoutTuning) {
      const activeLayoutRaw =
        layoutOverride ||
        (currentItem?.kind === "composition"
          ? currentItem.composition.layout || activeMotion.layout
          : currentItem?.kind === "offer"
            ? currentItem.offer.layout || activeMotion.layout || "hero"
            : activeMotion.layout || "hero");

      const targetLayout = normalizeOfferLayout(activeLayoutRaw);
      const tuning = activeMotion.layoutTuning[targetLayout];
      if (tuning) {
        if (tuning.productName) {
          if (tuning.productName.fontSizeOffset !== undefined) styles["--layout-name-size"] = `${tuning.productName.fontSizeOffset}px`;
          if (tuning.productName.x !== undefined) styles["--layout-name-x"] = `${tuning.productName.x}px`;
          if (tuning.productName.y !== undefined) styles["--layout-name-y"] = `${tuning.productName.y}px`;
          if (tuning.productName.maxLines !== undefined) styles["--layout-name-lines"] = `${tuning.productName.maxLines}`;
        }
        if (tuning.promotionalPrice) {
          if (tuning.promotionalPrice.fontSizeOffset !== undefined) styles["--layout-price-size"] = `${tuning.promotionalPrice.fontSizeOffset}px`;
          if (tuning.promotionalPrice.x !== undefined) styles["--layout-price-x"] = `${tuning.promotionalPrice.x}px`;
          if (tuning.promotionalPrice.y !== undefined) styles["--layout-price-y"] = `${tuning.promotionalPrice.y}px`;
        }
        if (tuning.oldPrice) {
          if (tuning.oldPrice.fontSizeOffset !== undefined) styles["--layout-oldprice-size"] = `${tuning.oldPrice.fontSizeOffset}px`;
          if (tuning.oldPrice.x !== undefined) styles["--layout-oldprice-x"] = `${tuning.oldPrice.x}px`;
          if (tuning.oldPrice.y !== undefined) styles["--layout-oldprice-y"] = `${tuning.oldPrice.y}px`;
        }
        if (tuning.productImage) {
          if (tuning.productImage.scale !== undefined) styles["--layout-img-scale"] = `${tuning.productImage.scale}`;
          if (tuning.productImage.x !== undefined) styles["--layout-img-x"] = `${tuning.productImage.x}px`;
          if (tuning.productImage.y !== undefined) styles["--layout-img-y"] = `${tuning.productImage.y}px`;
        }
        if (tuning.columnRatio !== undefined) {
          const ratio = tuning.columnRatio;
          styles["--layout-cols"] = `${(1 - ratio).toFixed(2)}fr ${ratio.toFixed(2)}fr`;
        }
        if (tuning.gap !== undefined) {
          styles["--layout-gap"] = `${tuning.gap}px`;
        }
        if (tuning.itemGap !== undefined) {
          styles["--layout-item-gap"] = `${tuning.itemGap}px`;
        }
      }
    }

    return styles as React.CSSProperties;
  }, [activeMotion, effectiveTheme, layoutOverride, currentItem, isLogoVisible, isSloganVisible, isDecorationsVisible, isBadgeAllowed, isSolidBg]);

  const motionClassNames = useMemo(() => {
    if (!activeMotion) return "";
    const cardStyle = activeMotion.productCard?.style || "transparent";
    const nameAnim = activeMotion.elementAnimations?.nameAnimation || "slide-up";
    const priceAnim = activeMotion.elementAnimations?.priceAnimation || "impact";
    const imgAnim = activeMotion.elementAnimations?.imageAnimation || "float";
    const choreo = activeMotion.elementAnimations?.choreography || "staggered";

    return `lab-pos-${activeMotion.logo.position} lab-sector-${activeMotion.logo.sectorLayout} lab-impact-${activeMotion.pricePhysics.impact} lab-card-${cardStyle} anim-name-${nameAnim} anim-price-${priceAnim} anim-image-${imgAnim} choreo-${choreo}`;
  }, [activeMotion]);
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

  // Preload all playlist & visual assets into persistent Cache Storage
  useEffect(() => {
    const urlsToPreload: string[] = [];
    content.offers.forEach((o) => {
      if (o.image) urlsToPreload.push(o.image);
      if (o.video) urlsToPreload.push(o.video);
    });
    content.media.forEach((m) => {
      if (m.mediaUrl) urlsToPreload.push(m.mediaUrl);
    });
    content.compositions.forEach((c) => {
      c.offers.forEach((o) => {
        if (o.image) urlsToPreload.push(o.image);
        if (o.video) urlsToPreload.push(o.video);
      });
    });
    if (activeMotion?.logo?.image) urlsToPreload.push(activeMotion.logo.image);
    if (activeMotion?.badge?.image) urlsToPreload.push(activeMotion.badge.image);
    if (activeMotion?.blackFridayImage?.src) urlsToPreload.push(activeMotion.blackFridayImage.src);
    if (activeMotion?.background?.imageUrl) urlsToPreload.push(activeMotion.background.imageUrl);

    void preloadMediaList(urlsToPreload);

    // Prune obsolete orphan files after 30s
    const cleanupTimer = window.setTimeout(() => {
      void pruneMediaCache(urlsToPreload);
    }, 30000);

    return () => {
      window.clearTimeout(cleanupTimer);
    };
  }, [content, activeMotion]);

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

  const rawLogoSrc = effectiveLogoConfig?.image || activeMotion?.logo.image || "/logo-sol.png";
  const { url: cachedLogoSrc } = useCachedMedia(rawLogoSrc);
  const logoImageSrc = cachedLogoSrc || rawLogoSrc;

  function renderSlideContent(item: TvPlaylistItem) {
    if (item.kind === "composition") {
      const activeCompositionOffers = item.composition.offers.filter((o) => o.active && isEligible(o));
      if (activeCompositionOffers.length === 0) return null;

      return (
        <OfferSlide
          key={`comp-${item.id}`}
          offers={activeCompositionOffers}
          layout={layoutOverride || item.composition.layout || activeMotion?.layout}
          paused={paused}
          badgeLabel={activeMotion?.badge.text || effectiveTheme.tokens.badge.label}
          badgeType={activeMotion?.badge.type || "text"}
          badgeImage={activeMotion?.badge.image}
          badgeSize={activeMotion?.badge.size}
          badgePosition={activeMotion?.badge.position || "top-right"}
          badgeOffsetX={activeMotion?.badge.offsetX || 0}
          badgeOffsetY={activeMotion?.badge.offsetY || 0}
          badgeVisible={isBadgeAllowed}
          showProductName={isProductNameVisible}
          showProductPrice={isProductPriceVisible}
          showOldPrice={isOldPriceVisible}
          showUnit={isUnitVisible}
          showBadge={isBadgeAllowed}
          showProductImage={isProductImageVisible}
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
          layout={layoutOverride || item.offer.layout || activeMotion?.layout}
          paused={paused}
          badgeLabel={activeMotion?.badge.text || effectiveTheme.tokens.badge.label}
          badgeType={activeMotion?.badge.type || "text"}
          badgeImage={activeMotion?.badge.image}
          badgeSize={activeMotion?.badge.size}
          badgePosition={activeMotion?.badge.position || "top-right"}
          badgeOffsetX={activeMotion?.badge.offsetX || 0}
          badgeOffsetY={activeMotion?.badge.offsetY || 0}
          badgeVisible={isBadgeAllowed}
          showProductName={isProductNameVisible}
          showProductPrice={isProductPriceVisible}
          showOldPrice={isOldPriceVisible}
          showUnit={isUnitVisible}
          showBadge={isBadgeAllowed}
          showProductImage={isProductImageVisible}
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
          mode={mode}
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
      <TvViewport viewportRef={shell}>
      <div
        className={`tv-shell ${motionClassNames} ${isNoFrame ? "no-frame" : ""}`}
        data-theme={effectiveTheme.slug}
        data-background-type={activeMotion?.background?.type || "solid"}
        data-solid-bg={isSolidBg ? "true" : undefined}
        data-animation-intensity={effectiveTheme.tokens.animationIntensity}
        style={{ ...themeStyle, ...motionStyleOverrides }}

        onDoubleClick={toggleFullscreen}
        title="Dê um duplo clique ou pressione F para tela cheia"
      >
        {isLogoVisible && effectiveLogoConfig && (
          <div
            className={`tv-top-brand ${effectiveLogoConfig.position ? `lab-pos-${effectiveLogoConfig.position}` : ""}`}
            style={logoInlineStyle}
          >
            <img
              src={logoImageSrc}
              alt="Supermercado Sol"
              className="tv-brand-logo"
              style={{
                width: `${effectiveLogoConfig.size}px`,
              }}
            />
            {effectiveLogoConfig.sectorLayout !== "hidden" && (
              <span
                className="tv-brand-sector-text"
                style={{
                  color: effectiveLogoConfig.sectorTextColor,
                  fontSize: `${effectiveLogoConfig.sectorTextSize}px`,
                  transform: `translate(${effectiveLogoConfig.sectorOffsetX || 0}px, ${effectiveLogoConfig.sectorOffsetY || 0}px)`,
                }}
              >
                {sectorTitle}
              </span>
            )}
          </div>
        )}
        <div className="tv-screen">
          {isSunburstBg && (
            <div className="tv-sunburst-background" aria-hidden="true">
              <div className="tv-sunburst-rays" />
              <div className="tv-sunburst-glow" />
            </div>
          )}
          {currentItem ? (
            <div
              key={currentItem.id}
              className={`tv-screen-content ${getTransitionClasses(activeTransitionPreset, isExiting, currentExitPreset)} ${paintPhase === "revealing" ? "slide-enter-paint-swipe" : ""}`}
            >
              {renderSlideContent(currentItem)}

              {/* Black Friday — Cartaz Digital Framing & Signature (Sincronizado com a transição da oferta) */}
              {effectiveTheme.slug === "black-friday" && (
                <>
                  <BlackFridayImageElement
                    config={effectiveBfImageConfig}
                    visible={isBlackFridayImageVisible}
                  />
                  {isBrushCornersVisible && (
                    <div className="bf-screen-brush-corners" aria-hidden="true">
                      <div className="bf-brush-corner bf-brush-tl" />
                      <div className="bf-brush-corner bf-brush-bl" />
                      <div className="bf-brush-corner bf-brush-tr" />
                      <div className="bf-brush-corner bf-brush-br" />
                    </div>
                  )}
                  {isSloganVisible && (
                    <div className="bf-signature-slogan" aria-hidden="true">
                      <span>{activeMotion?.subtitle?.text || "Qualidade para o seu dia."}</span>
                      {activeMotion?.subtitle?.showBrush !== false && (
                        <svg className="bf-slogan-brush" viewBox="0 0 160 10" fill="none">
                          <path d="M2 6C40 2 120 3 158 7" stroke="#F2381E" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                        </svg>
                      )}
                    </div>
                  )}
                </>
              )}
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
          {isDecorationsVisible && <BlackFridayDecorations fx={activeMotion?.fx} />}
          {isFireSparksVisible && (
            <FireSparks
              enabled={true}
              intensity={activeMotion?.fx?.fireSparks?.intensity || activeMotion?.fireSparks?.intensity || "commercial"}
              particleCount={activeMotion?.fx?.fireSparks?.particleCount ?? activeMotion?.fireSparks?.particleCount ?? 28}
              speed={activeMotion?.fx?.fireSparks?.speed ?? activeMotion?.fireSparks?.speed ?? 1}
              size={activeMotion?.fx?.fireSparks?.size ?? activeMotion?.fireSparks?.size ?? 1.1}
              bottomGlow={activeMotion?.fx?.fireSparks?.bottomGlow ?? activeMotion?.fireSparks?.bottomGlow ?? true}
              bottomGlowOpacity={activeMotion?.fx?.fireSparks?.bottomGlowOpacity ?? activeMotion?.fireSparks?.bottomGlowOpacity ?? 45}
              maxHeight={activeMotion?.fx?.fireSparks?.maxHeight ?? activeMotion?.fireSparks?.maxHeight ?? 105}
              performance={activeMotion?.fx?.fireSparks?.performance || activeMotion?.fireSparks?.performance || "normal"}
              zIndex={50}
            />
          )}
        </div>
        <div
          className="progress"
          style={{
            width: currentItem && !isVideo ? `${Math.min(100, (elapsed / duration) * 100)}%` : 0,
          }}
        />
      </div>
      </TvViewport>
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
            onClick={() => setInternalPaused((p) => !p)}
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
      <TvViewport viewportRef={shell}>
      <div
        className={`tv-shell ${motionClassNames} ${isNoFrame ? "no-frame" : ""}`}
        data-theme={effectiveTheme.slug}
        data-background-type={activeMotion?.background?.type || "solid"}
        data-solid-bg={isSolidBg ? "true" : undefined}
        data-animation-intensity={effectiveTheme.tokens.animationIntensity}
        style={{ ...themeStyle, ...motionStyleOverrides }}

      >
        {isLogoVisible && effectiveLogoConfig && (
          <div
            className={`tv-top-brand ${effectiveLogoConfig.position ? `lab-pos-${effectiveLogoConfig.position}` : ""}`}
            style={logoInlineStyle}
          >
            <img
              src={logoImageSrc}
              alt="Supermercado Sol"
              className="tv-brand-logo"
              style={{
                width: `${effectiveLogoConfig.size}px`,
              }}
            />
            {effectiveLogoConfig.sectorLayout !== "hidden" && (
              <span
                className="tv-brand-sector-text"
                style={{
                  color: effectiveLogoConfig.sectorTextColor,
                  fontSize: `${effectiveLogoConfig.sectorTextSize}px`,
                  transform: `translate(${effectiveLogoConfig.sectorOffsetX || 0}px, ${effectiveLogoConfig.sectorOffsetY || 0}px)`,
                }}
              >
                {sectorTitle}
              </span>
            )}
          </div>
        )}
        <div className="tv-screen">
          {isSunburstBg && (
            <div className="tv-sunburst-background" aria-hidden="true">
              <div className="tv-sunburst-rays" />
              <div className="tv-sunburst-glow" />
            </div>
          )}
          {currentItem ? (
            <div
              key={currentItem.id}
              className={`tv-screen-content ${getTransitionClasses(activeTransitionPreset, isExiting, currentExitPreset)} ${paintPhase === "revealing" ? "slide-enter-paint-swipe" : ""}`}
            >
              {renderSlideContent(currentItem)}

              {/* Black Friday — Cartaz Digital Framing & Signature (Sincronizado com a transição da oferta) */}
              {effectiveTheme.slug === "black-friday" && (
                <>
                  <BlackFridayImageElement
                    config={effectiveBfImageConfig}
                    visible={isBlackFridayImageVisible}
                  />
                  {isBrushCornersVisible && (
                    <div className="bf-screen-brush-corners" aria-hidden="true">
                      <div className="bf-brush-corner bf-brush-tl" />
                      <div className="bf-brush-corner bf-brush-bl" />
                      <div className="bf-brush-corner bf-brush-tr" />
                      <div className="bf-brush-corner bf-brush-br" />
                    </div>
                  )}
                  {isSloganVisible && (
                    <div className="bf-signature-slogan" aria-hidden="true">
                      <span>{activeMotion?.subtitle?.text || "Qualidade para o seu dia."}</span>
                      {activeMotion?.subtitle?.showBrush !== false && (
                        <svg className="bf-slogan-brush" viewBox="0 0 160 10" fill="none">
                          <path d="M2 6C40 2 120 3 158 7" stroke="#F2381E" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                        </svg>
                      )}
                    </div>
                  )}
                </>
              )}
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
          {isDecorationsVisible && <BlackFridayDecorations fx={activeMotion?.fx} />}
          {isFireSparksVisible && (
            <FireSparks
              enabled={true}
              intensity={activeMotion?.fx?.fireSparks?.intensity || activeMotion?.fireSparks?.intensity || "commercial"}
              particleCount={activeMotion?.fx?.fireSparks?.particleCount ?? activeMotion?.fireSparks?.particleCount ?? 28}
              speed={activeMotion?.fx?.fireSparks?.speed ?? activeMotion?.fireSparks?.speed ?? 1}
              size={activeMotion?.fx?.fireSparks?.size ?? activeMotion?.fireSparks?.size ?? 1.1}
              bottomGlow={activeMotion?.fx?.fireSparks?.bottomGlow ?? activeMotion?.fireSparks?.bottomGlow ?? true}
              bottomGlowOpacity={activeMotion?.fx?.fireSparks?.bottomGlowOpacity ?? activeMotion?.fireSparks?.bottomGlowOpacity ?? 45}
              maxHeight={activeMotion?.fx?.fireSparks?.maxHeight ?? activeMotion?.fireSparks?.maxHeight ?? 105}
              performance={activeMotion?.fx?.fireSparks?.performance || activeMotion?.fireSparks?.performance || "normal"}
              zIndex={50}
            />
          )}
        </div>
        <div
          className="progress"
          style={{
            width: currentItem && !isVideo ? `${Math.min(100, (elapsed / duration) * 100)}%` : 0,
          }}
        />
      </div>
      </TvViewport>
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

