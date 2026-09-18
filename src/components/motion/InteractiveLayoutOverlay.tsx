import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Move,
  Maximize2,
  Minimize2,
  RotateCcw,
  Copy,
  Check,
  Save,
  Type,
  DollarSign,
  Image as ImageIcon,
  Tag,
  Sliders,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sun,
  Pause,
  Play,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  PenLine,
  Plus,
  Minus,
  SplitSquareHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Wand2,
  Upload,
} from "lucide-react";
import type { OfferLayout } from "../../offers/layouts";
import type { PerLayoutTuning, MotionConfig } from "../../motion/types";
import { DEFAULT_BLACK_FRIDAY_IMAGE } from "../../motion/defaults";
import { removeWhiteBackground } from "../../images/removeWhiteBackground";
import { uploadMediaFile, databaseConfigured } from "../../supabase";

export type SelectableElementType =
  | "productImage"
  | "productName"
  | "promotionalPrice"
  | "oldPrice"
  | "spacing"
  | "logo"
  | "subtitle"
  | "brushCorners"
  | "sectorText"
  | "badge"
  | "blackFridayImage";

export interface InteractiveLayoutOverlayProps {
  layout: OfferLayout | "video";
  config: MotionConfig;
  onUpdateConfig?: (updater: (prev: MotionConfig) => MotionConfig) => void;
  tuning: PerLayoutTuning;
  onUpdateTuning: (updater: (prev: PerLayoutTuning) => PerLayoutTuning) => void;
  onCopyCssAndJson: () => void;
  onSaveToTv: () => void;
  onResetLayout: () => void;
  copied: boolean;
  saved: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface ElementRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function InteractiveLayoutOverlay({
  layout,
  config,
  onUpdateConfig,
  tuning,
  onUpdateTuning,
  onCopyCssAndJson,
  onSaveToTv,
  onResetLayout,
  copied,
  saved,
  isPaused = true,
  onTogglePause,
  containerRef,
}: InteractiveLayoutOverlayProps) {
  const isVideoMode = (layout as string) === "video";
  const [selectedElement, setSelectedElement] =
    useState<SelectableElementType>(isVideoMode ? "blackFridayImage" : "productImage");
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<SelectableElementType | null>(null);
  const [elementRects, setElementRects] = useState<Partial<Record<SelectableElementType, ElementRect>>>({});
  const dragStartRef = useRef<{
    x: number;
    y: number;
    initialX: number;
    initialY: number;
    initialPctX?: number;
    initialPctY?: number;
  } | null>(null);

  // Auto-switch selected element in video mode
  useEffect(() => {
    if (isVideoMode) {
      if (selectedElement !== "logo" && selectedElement !== "blackFridayImage") {
        setSelectedElement("blackFridayImage");
      }
    }
  }, [isVideoMode, selectedElement]);

  // Visibilidade e Minimização dos Controles
  const [isUiVisible, setIsUiVisible] = useState<boolean>(true);
  const [isPanelMinimized, setIsPanelMinimized] = useState<boolean>(false);
  const [showOnScreenBoxes, setShowOnScreenBoxes] = useState<boolean>(true);

  // Estado para Remoção de Fundo e Upload da Logo
  const [logoBgTolerance, setLogoBgTolerance] = useState<number>(30);
  const [isRemovingLogoBg, setIsRemovingLogoBg] = useState<boolean>(false);
  const [logoBgRemovalError, setLogoBgRemovalError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Atalho de Teclado 'H' para Ocultar/Mostrar Controles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        (e.key === "h" || e.key === "H") &&
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA" &&
        target.tagName !== "SELECT"
      ) {
        setIsUiVisible((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Measure element positions inside containerRef dynamically
  const measureRects = useCallback(() => {
    if (!containerRef?.current) return;
    const container = containerRef.current;
    const containerBox = container.getBoundingClientRect();
    if (containerBox.width === 0 || containerBox.height === 0) return;

    const findRect = (selectors: string[]): ElementRect | null => {
      for (const sel of selectors) {
        const el = container.querySelector(sel);
        if (el) {
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.height > 0) {
            return {
              left: Math.max(-100, Math.min(200, ((b.left - containerBox.left) / containerBox.width) * 100)),
              top: Math.max(-100, Math.min(200, ((b.top - containerBox.top) / containerBox.height) * 100)),
              width: Math.max(4, Math.min(100, (b.width / containerBox.width) * 100)),
              height: Math.max(4, Math.min(100, (b.height / containerBox.height) * 100)),
            };
          }
        }
      }
      return null;
    };

    const newRects: Partial<Record<SelectableElementType, ElementRect>> = {};

    const imgRect = findRect([".product-image-scaler", ".media-wrap", ".offer-product-image"]);
    if (imgRect) newRects.productImage = imgRect;

    const nameRect = findRect([".product-name"]);
    if (nameRect) newRects.productName = nameRect;

    const priceRect = findRect([".price", ".price .value"]);
    if (priceRect) newRects.promotionalPrice = priceRect;

    const oldPriceRect = findRect([".old-price"]);
    if (oldPriceRect) newRects.oldPrice = oldPriceRect;

    const logoRect = findRect([".tv-top-brand", ".tv-brand-logo", ".opening-logo"]);
    if (logoRect) newRects.logo = logoRect;

    const sectorRect = findRect([".tv-brand-sector-text"]);
    if (sectorRect) newRects.sectorText = sectorRect;

    const subtitleRect = findRect([".tv-bottom-footer", ".slide-slogan"]);
    if (subtitleRect) newRects.subtitle = subtitleRect;

    const badgeRect = findRect([".offer-product .badge-image-tag", ".offer-product .badge-bf-cartaz", ".offer-product .product-badge", ".offer-product .badge"]);
    if (badgeRect) newRects.badge = badgeRect;

    const bfImgRect = findRect([".bf-custom-image-element", ".bf-top-right-stamp"]);
    if (bfImgRect) newRects.blackFridayImage = bfImgRect;

    const spacingRect = findRect([".offer-layout-duo", ".offer-layout-trio", ".offer-layout-grid4", ".offer-layout-grid8"]);
    if (spacingRect) newRects.spacing = spacingRect;

    setElementRects(newRects);
  }, [containerRef]);

  useEffect(() => {
    measureRects();
    const interval = setInterval(measureRects, 600);
    window.addEventListener("resize", measureRects);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measureRects);
    };
  }, [measureRects, layout, config, tuning]);

  // Extract current coordinates
  const getCoordinates = (): { x: number; y: number } => {
    if (isVideoMode) {
      if (selectedElement === "logo") {
        return {
          x: config.videoOverlay?.logo?.offsetX ?? config.logo.offsetX ?? 0,
          y: config.videoOverlay?.logo?.offsetY ?? config.logo.offsetY ?? 0,
        };
      }
      if (selectedElement === "blackFridayImage") {
        return {
          x: Math.round(config.videoOverlay?.blackFridayImage?.x ?? config.blackFridayImage?.x ?? 82),
          y: Math.round(config.videoOverlay?.blackFridayImage?.y ?? config.blackFridayImage?.y ?? 6),
        };
      }
      return { x: 0, y: 0 };
    }

    if (selectedElement === "productImage") return { x: tuning.productImage?.x || 0, y: tuning.productImage?.y || 0 };
    if (selectedElement === "productName") return { x: tuning.productName?.x || 0, y: tuning.productName?.y || 0 };
    if (selectedElement === "promotionalPrice") return { x: tuning.promotionalPrice?.x || 0, y: tuning.promotionalPrice?.y || 0 };
    if (selectedElement === "oldPrice") return { x: tuning.oldPrice?.x || 0, y: tuning.oldPrice?.y || 0 };
    if (selectedElement === "logo") return { x: config.logo.offsetX || 0, y: config.logo.offsetY || 0 };
    if (selectedElement === "subtitle") return { x: config.subtitle?.offsetX || 0, y: config.subtitle?.offsetY || 0 };
    if (selectedElement === "sectorText") return { x: config.logo.sectorOffsetX || 0, y: config.logo.sectorOffsetY || 0 };
    if (selectedElement === "badge") return { x: config.badge.offsetX || 0, y: config.badge.offsetY || 0 };
    if (selectedElement === "blackFridayImage") return { x: Math.round(config.blackFridayImage?.x ?? 82), y: Math.round(config.blackFridayImage?.y ?? 6) };
    return { x: 0, y: 0 };
  };

  const currentCoords = getCoordinates();

  // Position update dispatcher
  const updatePosition = useCallback(
    (newX: number, newY: number) => {
      const clampedX = Math.max(-1000, Math.min(1000, newX));
      const clampedY = Math.max(-1000, Math.min(1000, newY));

      if (isVideoMode) {
        if (selectedElement === "logo" && onUpdateConfig) {
          onUpdateConfig((prev) => ({
            ...prev,
            videoOverlay: {
              ...(prev.videoOverlay || {}),
              enabled: true,
              logo: {
                ...(prev.videoOverlay?.logo || {
                  visible: true,
                  size: prev.logo.size,
                  position: "custom",
                  x: prev.logo.x ?? 4,
                  y: prev.logo.y ?? 4,
                  scale: prev.logo.scale ?? 1,
                  opacity: prev.logo.opacity ?? 100,
                }),
                offsetX: clampedX,
                offsetY: clampedY,
                position: "custom",
              },
            },
          }));
        } else if (selectedElement === "blackFridayImage" && onUpdateConfig) {
          onUpdateConfig((prev) => ({
            ...prev,
            videoOverlay: {
              ...(prev.videoOverlay || {}),
              enabled: true,
              blackFridayImage: {
                ...(prev.videoOverlay?.blackFridayImage || {
                  visible: true,
                  x: prev.blackFridayImage?.x ?? 82,
                  y: prev.blackFridayImage?.y ?? 6,
                  width: prev.blackFridayImage?.width ?? 18,
                  scale: prev.blackFridayImage?.scale ?? 1,
                  opacity: prev.blackFridayImage?.opacity ?? 100,
                  rotation: prev.blackFridayImage?.rotation ?? 0,
                }),
                x: Math.max(-100, Math.min(200, clampedX)),
                y: Math.max(-100, Math.min(200, clampedY)),
              },
            },
          }));
        }
        return;
      }

      if (
        selectedElement === "productImage" ||
        selectedElement === "productName" ||
        selectedElement === "promotionalPrice" ||
        selectedElement === "oldPrice"
      ) {
        onUpdateTuning((prev) => ({
          ...prev,
          [selectedElement]: {
            ...(prev[selectedElement] || {}),
            x: clampedX,
            y: clampedY,
          },
        }));
      } else if (selectedElement === "logo" && onUpdateConfig) {
        onUpdateConfig((prev) => ({
          ...prev,
          logo: { ...prev.logo, offsetX: clampedX, offsetY: clampedY },
        }));
      } else if (selectedElement === "subtitle" && onUpdateConfig) {
        onUpdateConfig((prev) => ({
          ...prev,
          subtitle: { ...(prev.subtitle || {}), offsetX: clampedX, offsetY: clampedY },
        }));
      } else if (selectedElement === "sectorText" && onUpdateConfig) {
        onUpdateConfig((prev) => ({
          ...prev,
          logo: { ...prev.logo, sectorOffsetX: clampedX, sectorOffsetY: clampedY },
        }));
      } else if (selectedElement === "badge" && onUpdateConfig) {
        onUpdateConfig((prev) => ({
          ...prev,
          badge: { ...prev.badge, offsetX: clampedX, offsetY: clampedY },
        }));
      } else if (selectedElement === "blackFridayImage" && onUpdateConfig) {
        onUpdateConfig((prev) => ({
          ...prev,
          blackFridayImage: {
            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
            x: Math.max(-100, Math.min(200, clampedX)),
            y: Math.max(-100, Math.min(200, clampedY)),
          },
        }));
      }
    },
    [selectedElement, onUpdateTuning, onUpdateConfig, isVideoMode]
  );

  // Drag handlers
  const handleStartDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const initialPctX = isVideoMode
      ? selectedElement === "blackFridayImage"
        ? (config.videoOverlay?.blackFridayImage?.x ?? config.blackFridayImage?.x ?? 82)
        : (config.videoOverlay?.logo?.x ?? config.logo.x ?? 4)
      : selectedElement === "blackFridayImage"
      ? (config.blackFridayImage?.x ?? 82)
      : (config.logo.x ?? 4);

    const initialPctY = isVideoMode
      ? selectedElement === "blackFridayImage"
        ? (config.videoOverlay?.blackFridayImage?.y ?? config.blackFridayImage?.y ?? 6)
        : (config.videoOverlay?.logo?.y ?? config.logo.y ?? 4)
      : selectedElement === "blackFridayImage"
      ? (config.blackFridayImage?.y ?? 6)
      : (config.logo.y ?? 4);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: currentCoords.x,
      initialY: currentCoords.y,
      initialPctX,
      initialPctY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      if (isVideoMode) {
        if (selectedElement === "logo" && containerRef?.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          if (containerRect.width > 0 && containerRect.height > 0) {
            const deltaPctX = (deltaX / containerRect.width) * 100;
            const deltaPctY = (deltaY / containerRect.height) * 100;
            const newX = Math.max(0, Math.min(100, Number(((dragStartRef.current.initialPctX ?? 4) + deltaPctX).toFixed(1))));
            const newY = Math.max(0, Math.min(100, Number(((dragStartRef.current.initialPctY ?? 4) + deltaPctY).toFixed(1))));
            if (onUpdateConfig) {
              onUpdateConfig((prev) => ({
                ...prev,
                videoOverlay: {
                  ...(prev.videoOverlay || {}),
                  enabled: true,
                  logo: {
                    ...(prev.videoOverlay?.logo || {
                      visible: true,
                      size: prev.logo.size,
                      offsetX: prev.logo.offsetX || 0,
                      offsetY: prev.logo.offsetY || 0,
                      scale: prev.logo.scale ?? 1,
                      opacity: prev.logo.opacity ?? 100,
                    }),
                    x: newX,
                    y: newY,
                    position: "custom",
                  },
                },
              }));
            }
            return;
          }
        }

        if (selectedElement === "blackFridayImage" && containerRef?.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          if (containerRect.width > 0 && containerRect.height > 0) {
            const deltaPctX = (deltaX / containerRect.width) * 100;
            const deltaPctY = (deltaY / containerRect.height) * 100;
            const newX = Math.max(-100, Math.min(200, Number(((dragStartRef.current.initialPctX ?? 82) + deltaPctX).toFixed(1))));
            const newY = Math.max(-100, Math.min(200, Number(((dragStartRef.current.initialPctY ?? 6) + deltaPctY).toFixed(1))));
            if (onUpdateConfig) {
              onUpdateConfig((prev) => ({
                ...prev,
                videoOverlay: {
                  ...(prev.videoOverlay || {}),
                  enabled: true,
                  blackFridayImage: {
                    ...(prev.videoOverlay?.blackFridayImage || {
                      visible: true,
                      width: prev.blackFridayImage?.width ?? 18,
                      scale: prev.blackFridayImage?.scale ?? 1,
                      opacity: prev.blackFridayImage?.opacity ?? 100,
                      rotation: prev.blackFridayImage?.rotation ?? 0,
                    }),
                    x: newX,
                    y: newY,
                  },
                },
              }));
            }
            return;
          }
        }
      }

      if (selectedElement === "logo" && containerRef?.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
          const deltaPctX = (deltaX / containerRect.width) * 100;
          const deltaPctY = (deltaY / containerRect.height) * 100;
          const newX = Math.max(-20, Math.min(120, Number(((dragStartRef.current.initialPctX ?? 4) + deltaPctX).toFixed(1))));
          const newY = Math.max(-20, Math.min(120, Number(((dragStartRef.current.initialPctY ?? 4) + deltaPctY).toFixed(1))));
          if (onUpdateConfig) {
            onUpdateConfig((prev) => ({
              ...prev,
              logo: { ...prev.logo, x: newX, y: newY, position: "custom" },
            }));
          }
          return;
        }
      }

      if (selectedElement === "blackFridayImage" && containerRef?.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
          const deltaPctX = (deltaX / containerRect.width) * 100;
          const deltaPctY = (deltaY / containerRect.height) * 100;
          const newX = Math.max(-100, Math.min(200, Number(((dragStartRef.current.initialPctX ?? 82) + deltaPctX).toFixed(1))));
          const newY = Math.max(-100, Math.min(200, Number(((dragStartRef.current.initialPctY ?? 6) + deltaPctY).toFixed(1))));
          if (onUpdateConfig) {
            onUpdateConfig((prev) => ({
              ...prev,
              blackFridayImage: {
                ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                x: newX,
                y: newY,
              },
            }));
          }
          return;
        }
      }

      updatePosition(Math.round(dragStartRef.current.initialX + deltaX), Math.round(dragStartRef.current.initialY + deltaY));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, updatePosition, selectedElement, config.logo, config.blackFridayImage, config.videoOverlay, containerRef, onUpdateConfig, isVideoMode]);

  // Handlers para Upload e Remoção de Fundo da Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateConfig) return;

    // 1. Instant local preview (lightweight blob URL)
    const previewUrl = URL.createObjectURL(file);
    onUpdateConfig((prev) => ({
      ...prev,
      logo: {
        ...prev.logo,
        image: previewUrl,
        originalImage: previewUrl,
        removeBackground: false,
      },
    }));
    setLogoBgRemovalError(null);
    setLogoUploadSuccess(null);
    setIsUploadingLogo(true);

    // 2. Upload to Supabase Storage if configured
    if (databaseConfigured) {
      try {
        const res = await uploadMediaFile(file, "acougue");
        if (res.publicUrl) {
          onUpdateConfig((prev) => ({
            ...prev,
            logo: {
              ...prev.logo,
              image: res.publicUrl,
              originalImage: res.publicUrl,
            },
          }));
          setLogoUploadSuccess("Logo salva na nuvem!");
          setTimeout(() => setLogoUploadSuccess(null), 3000);
        }
      } catch (err: any) {
        console.warn("[InteractiveLayoutOverlay] Upload da logo para Supabase falhou:", err);
      } finally {
        setIsUploadingLogo(false);
      }
    } else {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogoBg = async () => {
    const src = config.logo.image;
    if (!src || !onUpdateConfig) return;
    setIsRemovingLogoBg(true);
    setLogoBgRemovalError(null);
    try {
      const blob = await removeWhiteBackground(src, logoBgTolerance);
      const transparentUrl = URL.createObjectURL(blob);
      const originalSrc = config.logo.originalImage || src;

      onUpdateConfig((prev) => ({
        ...prev,
        logo: {
          ...prev.logo,
          image: transparentUrl,
          originalImage: originalSrc,
          removeBackground: true,
        },
      }));

      // Upload transparent version to storage if database configured
      if (databaseConfigured) {
        try {
          const transparentFile = new File([blob], "logo_transparent.png", { type: "image/png" });
          const res = await uploadMediaFile(transparentFile, "acougue");
          if (res.publicUrl) {
            onUpdateConfig((prev) => ({
              ...prev,
              logo: {
                ...prev.logo,
                image: res.publicUrl,
              },
            }));
            setLogoUploadSuccess("Logo transparente salva na nuvem!");
            setTimeout(() => setLogoUploadSuccess(null), 3000);
          }
        } catch (uploadErr: any) {
          console.warn("[InteractiveLayoutOverlay] Upload de logo transparente falhou:", uploadErr);
        }
      }
    } catch (err: any) {
      setLogoBgRemovalError(err.message || "Falha ao remover o fundo da logo.");
    } finally {
      setIsRemovingLogoBg(false);
    }
  };

  const handleRestoreOriginalLogo = () => {
    if (config.logo.originalImage && onUpdateConfig) {
      onUpdateConfig((prev) => ({
        ...prev,
        logo: {
          ...prev.logo,
          image: prev.logo.originalImage,
          originalImage: "",
          removeBackground: false,
        },
      }));
      setLogoBgRemovalError(null);
    }
  };

  const handleResetToDefaultSolLogo = () => {
    if (onUpdateConfig) {
      onUpdateConfig((prev) => ({
        ...prev,
        logo: {
          ...prev.logo,
          image: "",
          originalImage: "",
          removeBackground: false,
        },
      }));
      setLogoBgRemovalError(null);
    }
  };

  // Nudge direction buttons
  const nudge = (dx: number, dy: number) => {
    updatePosition(currentCoords.x + dx, currentCoords.y + dy);
  };

  // Adjust size / scale / spacing helper
  const adjustSize = useCallback(
    (step: number) => {
      if (isVideoMode) {
        if (selectedElement === "logo" && onUpdateConfig) {
          const cur = config.videoOverlay?.logo?.size ?? config.logo.size ?? 68;
          const next = Math.max(20, Math.min(450, Math.round(cur + step * 10)));
          onUpdateConfig((prev) => ({
            ...prev,
            videoOverlay: {
              ...(prev.videoOverlay || {}),
              enabled: true,
              logo: {
                ...(prev.videoOverlay?.logo || {
                  visible: true,
                  size: prev.logo.size,
                  position: "custom",
                  x: prev.logo.x ?? 4,
                  y: prev.logo.y ?? 4,
                  scale: prev.logo.scale ?? 1,
                  opacity: prev.logo.opacity ?? 100,
                  offsetX: prev.logo.offsetX || 0,
                  offsetY: prev.logo.offsetY || 0,
                }),
                size: next,
              },
            },
          }));
        } else if (selectedElement === "blackFridayImage" && onUpdateConfig) {
          const cur = config.videoOverlay?.blackFridayImage?.scale ?? config.blackFridayImage?.scale ?? 1;
          const next = Math.max(0.2, Math.min(3.0, Number((cur + step * 0.1).toFixed(2))));
          onUpdateConfig((prev) => ({
            ...prev,
            videoOverlay: {
              ...(prev.videoOverlay || {}),
              enabled: true,
              blackFridayImage: {
                ...(prev.videoOverlay?.blackFridayImage || {
                  visible: true,
                  x: prev.blackFridayImage?.x ?? 82,
                  y: prev.blackFridayImage?.y ?? 6,
                  width: prev.blackFridayImage?.width ?? 18,
                  opacity: prev.blackFridayImage?.opacity ?? 100,
                  rotation: prev.blackFridayImage?.rotation ?? 0,
                }),
                scale: next,
              },
            },
          }));
        }
        return;
      }

      if (selectedElement === "productImage") {
        const cur = tuning.productImage?.scale ?? 1;
        const next = Math.max(0.2, Math.min(6.0, Number((cur + step * 0.15).toFixed(2))));
        onUpdateTuning((prev) => ({
          ...prev,
          productImage: { ...(prev.productImage || {}), scale: next },
        }));
      } else if (selectedElement === "productName") {
        const cur = tuning.productName?.fontSizeOffset ?? 0;
        const next = Math.max(-100, Math.min(350, Math.round(cur + step * 6)));
        onUpdateTuning((prev) => ({
          ...prev,
          productName: { ...(prev.productName || {}), fontSizeOffset: next },
        }));
      } else if (selectedElement === "promotionalPrice") {
        const cur = tuning.promotionalPrice?.fontSizeOffset ?? 0;
        const next = Math.max(-100, Math.min(450, Math.round(cur + step * 8)));
        onUpdateTuning((prev) => ({
          ...prev,
          promotionalPrice: { ...(prev.promotionalPrice || {}), fontSizeOffset: next },
        }));
      } else if (selectedElement === "oldPrice") {
        const cur = tuning.oldPrice?.fontSizeOffset ?? 0;
        const next = Math.max(-60, Math.min(200, Math.round(cur + step * 4)));
        onUpdateTuning((prev) => ({
          ...prev,
          oldPrice: { ...(prev.oldPrice || {}), fontSizeOffset: next },
        }));
      } else if (selectedElement === "spacing") {
        const cur = tuning.gap ?? 16;
        const next = Math.max(0, Math.min(160, Math.round(cur + step * 6)));
        onUpdateTuning((prev) => ({
          ...prev,
          gap: next,
        }));
      } else if (selectedElement === "brushCorners" && onUpdateConfig) {
        const cur = config.fx?.brushCorners?.scale ?? 1;
        const next = Math.max(0.2, Math.min(3.5, Number((cur + step * 0.15).toFixed(2))));
        onUpdateConfig((prev) => ({
          ...prev,
          fx: {
            ...(prev.fx || {}),
            brushCorners: {
              ...(prev.fx?.brushCorners || { enabled: true }),
              scale: next,
            },
          },
        }));
      } else if (selectedElement === "logo" && onUpdateConfig) {
        const cur = config.logo.size || 68;
        const next = Math.max(20, Math.min(450, Math.round(cur + step * 10)));
        onUpdateConfig((prev) => ({
          ...prev,
          logo: { ...prev.logo, size: next },
        }));
      } else if (selectedElement === "subtitle" && onUpdateConfig) {
        const cur = config.subtitle?.fontSize ?? 22;
        const next = Math.max(10, Math.min(160, Math.round(cur + step * 5)));
        onUpdateConfig((prev) => ({
          ...prev,
          subtitle: { ...(prev.subtitle || {}), fontSize: next },
        }));
      } else if (selectedElement === "sectorText" && onUpdateConfig) {
        const cur = config.logo.sectorTextSize || 13;
        const next = Math.max(8, Math.min(120, Math.round(cur + step * 4)));
        onUpdateConfig((prev) => ({
          ...prev,
          logo: { ...prev.logo, sectorTextSize: next },
        }));
      } else if (selectedElement === "badge" && onUpdateConfig) {
        const cur = config.badge.size || 70;
        const next = Math.max(20, Math.min(450, Math.round(cur + step * 10)));
        onUpdateConfig((prev) => ({
          ...prev,
          badge: { ...prev.badge, size: next },
        }));
      } else if (selectedElement === "blackFridayImage" && onUpdateConfig) {
        const cur = config.blackFridayImage?.scale ?? 1;
        const next = Math.max(0.2, Math.min(3.0, Number((cur + step * 0.1).toFixed(2))));
        onUpdateConfig((prev) => ({
          ...prev,
          blackFridayImage: {
            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
            scale: next,
          },
        }));
      }
    },
    [selectedElement, tuning, config, onUpdateTuning, onUpdateConfig, isVideoMode]
  );

  // Set explicit size / scale directly
  const setExplicitScale = (scale: number) => {
    onUpdateTuning((prev) => ({
      ...prev,
      productImage: { ...(prev.productImage || {}), scale },
    }));
  };

  const setExplicitOffset = (offset: number) => {
    if (selectedElement === "productName") {
      onUpdateTuning((prev) => ({
        ...prev,
        productName: { ...(prev.productName || {}), fontSizeOffset: offset },
      }));
    } else if (selectedElement === "promotionalPrice") {
      onUpdateTuning((prev) => ({
        ...prev,
        promotionalPrice: { ...(prev.promotionalPrice || {}), fontSizeOffset: offset },
      }));
    } else if (selectedElement === "oldPrice") {
      onUpdateTuning((prev) => ({
        ...prev,
        oldPrice: { ...(prev.oldPrice || {}), fontSizeOffset: offset },
      }));
    }
  };

  // Reset selected element
  const resetSelectedElement = () => {
    if (isVideoMode) {
      if (selectedElement === "logo" && onUpdateConfig) {
        onUpdateConfig((prev) => ({
          ...prev,
          videoOverlay: {
            ...(prev.videoOverlay || {}),
            logo: undefined,
          },
        }));
      } else if (selectedElement === "blackFridayImage" && onUpdateConfig) {
        onUpdateConfig((prev) => ({
          ...prev,
          videoOverlay: {
            ...(prev.videoOverlay || {}),
            blackFridayImage: undefined,
          },
        }));
      }
      return;
    }

    if (
      selectedElement === "productImage" ||
      selectedElement === "productName" ||
      selectedElement === "promotionalPrice" ||
      selectedElement === "oldPrice"
    ) {
      onUpdateTuning((prev) => {
        const next = { ...prev };
        delete next[selectedElement];
        return next;
      });
    } else if (selectedElement === "spacing") {
      onUpdateTuning((prev) => {
        const next = { ...prev };
        delete next.gap;
        delete next.itemGap;
        delete next.columnRatio;
        return next;
      });
    } else if (selectedElement === "brushCorners" && onUpdateConfig) {
      onUpdateConfig((prev) => ({
        ...prev,
        fx: {
          ...(prev.fx || {}),
          brushCorners: { enabled: true, opacity: 100, scale: 1 },
        },
      }));
    } else if (selectedElement === "logo" && onUpdateConfig) {
      onUpdateConfig((prev) => ({
        ...prev,
        logo: { ...prev.logo, size: 68, offsetX: 0, offsetY: 0 },
      }));
    } else if (selectedElement === "subtitle" && onUpdateConfig) {
      onUpdateConfig((prev) => ({
        ...prev,
        subtitle: { ...(prev.subtitle || {}), fontSize: 22, offsetX: 0, offsetY: 0 },
      }));
    } else if (selectedElement === "badge" && onUpdateConfig) {
      onUpdateConfig((prev) => ({
        ...prev,
        badge: { ...prev.badge, size: 70, offsetX: 0, offsetY: 0 },
      }));
    } else if (selectedElement === "blackFridayImage" && onUpdateConfig) {
      onUpdateConfig((prev) => ({
        ...prev,
        blackFridayImage: { ...DEFAULT_BLACK_FRIDAY_IMAGE },
      }));
    }
  };

  // Mouse wheel scaling on canvas
  const handleWheel = (e: React.WheelEvent) => {
    if (!isUiVisible) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      adjustSize(1);
    } else if (e.deltaY > 0) {
      adjustSize(-1);
    }
  };

  const ELEMENT_LABELS: Record<
    SelectableElementType,
    { label: string; icon: React.ReactNode; color: string; desc: string }
  > = {
    productImage: {
      label: "Foto da Carne",
      icon: <ImageIcon size={13} />,
      color: "#f2c94c",
      desc: "Aumente ou reposicione a imagem do produto",
    },
    productName: {
      label: "Nome do Produto",
      icon: <Type size={13} />,
      color: "#60a5fa",
      desc: "Tamanho da fonte e posição do título",
    },
    promotionalPrice: {
      label: "Preço Promocional",
      icon: <DollarSign size={13} />,
      color: "#ff5c5c",
      desc: "Destaque gigante dos números do preço",
    },
    oldPrice: {
      label: "Preço Anterior (De:)",
      icon: <Tag size={13} />,
      color: "#a78bfa",
      desc: "Valor cortado riscado",
    },
    spacing: {
      label: "Espaçamento / Distância",
      icon: <SplitSquareHorizontal size={13} />,
      color: "#38bdf8",
      desc: "Distância entre produtos (mais longe ou mais perto)",
    },
    badge: {
      label: "Selo nos Produtos (Tag)",
      icon: <Tag size={13} />,
      color: "#fb923c",
      desc: "Selo ou tag promocional impresso sobre a foto de cada produto",
    },
    brushCorners: {
      label: "Molduras Pretas (Cantos)",
      icon: <Layers size={13} />,
      color: "#e5e7eb",
      desc: "Aumentar ou diminuir pinceladas pretas nos 4 cantos",
    },
    logo: {
      label: isVideoMode ? "Logo no Vídeo" : "Logo do Sol",
      icon: <Sun size={13} />,
      color: "#f59e0b",
      desc: isVideoMode ? "Tamanho e posição da logo sobre os vídeos" : "Tamanho da logo no topo da tela",
    },
    subtitle: {
      label: "Frase em Baixo (Slogan)",
      icon: <PenLine size={13} />,
      color: "#34d399",
      desc: "Texto institucional no rodapé",
    },
    sectorText: {
      label: "Nome do Setor",
      icon: <Type size={13} />,
      color: "#ec4899",
      desc: "Texto do setor (ex: AÇOUGUE)",
    },
    blackFridayImage: {
      label: isVideoMode ? "Black Friday no Vídeo" : "Imagem Black Friday (Tela)",
      icon: <Sparkles size={13} />,
      color: "#ff3366",
      desc: isVideoMode ? "Posição e tamanho da imagem Black Friday sobre vídeos" : "Imagem/logo decorativa Black Friday na tela (suporta Y negativo como -15%)",
    },
  };

  // Fallback layout bounds
  const getFallbackRect = (type: SelectableElementType): ElementRect => {
    if (isVideoMode) {
      if (type === "logo") {
        return {
          left: config.videoOverlay?.logo?.x ?? config.logo.x ?? 3,
          top: config.videoOverlay?.logo?.y ?? config.logo.y ?? 3,
          width: 25,
          height: 12,
        };
      }
      if (type === "blackFridayImage") {
        return {
          left: config.videoOverlay?.blackFridayImage?.x ?? config.blackFridayImage?.x ?? 82,
          top: config.videoOverlay?.blackFridayImage?.y ?? config.blackFridayImage?.y ?? 6,
          width: config.videoOverlay?.blackFridayImage?.width ?? config.blackFridayImage?.width ?? 18,
          height: 14,
        };
      }
    }

    switch (type) {
      case "productImage":
        return layout === "hero"
          ? { left: 48, top: 12, width: 48, height: 76 }
          : layout === "duo"
          ? { left: 52, top: 18, width: 44, height: 64 }
          : { left: 45, top: 20, width: 50, height: 60 };
      case "productName":
        return layout === "hero"
          ? { left: 4, top: 18, width: 44, height: 26 }
          : { left: 4, top: 20, width: 46, height: 22 };
      case "promotionalPrice":
        return layout === "hero"
          ? { left: 4, top: 58, width: 44, height: 30 }
          : { left: 4, top: 56, width: 46, height: 28 };
      case "oldPrice":
        return { left: 4, top: 46, width: 35, height: 12 };
      case "spacing":
        return { left: 2, top: 10, width: 96, height: 80 };
      case "logo":
        return { left: 3, top: 3, width: 25, height: 12 };
      case "sectorText":
        return { left: 16, top: 4, width: 22, height: 10 };
      case "subtitle":
        return { left: 20, top: 88, width: 60, height: 10 };
      case "badge":
        return { left: 68, top: 10, width: 24, height: 18 };
      case "blackFridayImage":
        return {
          left: config.blackFridayImage?.x ?? 82,
          top: config.blackFridayImage?.y ?? 6,
          width: config.blackFridayImage?.width ?? 18,
          height: 14,
        };
      case "brushCorners":
        return { left: 0, top: 0, width: 100, height: 100 };
      default:
        return { left: 10, top: 10, width: 80, height: 80 };
    }
  };

  const activeRect = elementRects[selectedElement] || getFallbackRect(selectedElement);

  // Current display value
  const getCurrentDisplayValue = () => {
    if (isVideoMode) {
      if (selectedElement === "logo") {
        const sz = config.videoOverlay?.logo?.size ?? config.logo.size ?? 68;
        return `Vídeo: ${sz}px`;
      }
      if (selectedElement === "blackFridayImage") {
        const s = config.videoOverlay?.blackFridayImage?.scale ?? config.blackFridayImage?.scale ?? 1;
        const w = config.videoOverlay?.blackFridayImage?.width ?? config.blackFridayImage?.width ?? 18;
        return `Vídeo: ${w}% larg · ${Math.round(s * 100)}% (${s.toFixed(2)}x)`;
      }
    }

    if (selectedElement === "productImage") {
      const s = tuning.productImage?.scale ?? 1;
      return `${Math.round(s * 100)}% (${s.toFixed(2)}x)`;
    }
    if (selectedElement === "productName") {
      const off = tuning.productName?.fontSizeOffset ?? 0;
      return `${off >= 0 ? "+" : ""}${off}px`;
    }
    if (selectedElement === "promotionalPrice") {
      const off = tuning.promotionalPrice?.fontSizeOffset ?? 0;
      return `${off >= 0 ? "+" : ""}${off}px`;
    }
    if (selectedElement === "oldPrice") {
      const off = tuning.oldPrice?.fontSizeOffset ?? 0;
      return `${off >= 0 ? "+" : ""}${off}px`;
    }
    if (selectedElement === "spacing") {
      return `${tuning.gap ?? 16}px (Gap)`;
    }
    if (selectedElement === "brushCorners") {
      const s = config.fx?.brushCorners?.scale ?? 1;
      return `${Math.round(s * 100)}% (${s.toFixed(2)}x)`;
    }
    if (selectedElement === "blackFridayImage") {
      const s = config.blackFridayImage?.scale ?? 1;
      const w = config.blackFridayImage?.width ?? 18;
      return `${w}% larg · ${Math.round(s * 100)}% (${s.toFixed(2)}x)`;
    }
    if (selectedElement === "logo") return `${config.logo.size}px`;
    if (selectedElement === "subtitle") return `${config.subtitle?.fontSize ?? 22}px`;
    if (selectedElement === "sectorText") return `${config.logo.sectorTextSize}px`;
    if (selectedElement === "badge") {
      if (config.badge.visible === false) return `Oculto (${config.badge.size || 70}px)`;
      return `${config.badge.size || 70}px`;
    }
    return "";
  };

  // IF UI IS HIDDEN: Render only the floating restore pill
  if (!isUiVisible) {
    return (
      <div className="interactive-layout-editor-overlay is-hidden-mode">
        <button
          type="button"
          className="btn-floating-show-controls"
          onClick={() => setIsUiVisible(true)}
          title="Clique para voltar os controles de edição (Atalho: Tecla H)"
        >
          <Eye size={14} />
          <span>Mostrar Ferramentas de Edição (H)</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="interactive-layout-editor-overlay"
      onWheel={handleWheel}
    >
      {/* Top Banner Toolbar */}
      <div className="interactive-top-bar">
        {/* Play/Pause control */}
        {onTogglePause && (
          <button
            type="button"
            className={`btn-pause-pill ${isPaused ? "is-paused" : "is-playing"}`}
            onClick={onTogglePause}
            title={isPaused ? "Clique para continuar reprodução da TV" : "Clique para pausar e editar"}
          >
            {isPaused ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPaused ? "PAUSADO PARA EDITAR" : "EM REPRODUÇÃO"}</span>
          </button>
        )}

        {/* Camadas Selecionáveis */}
        {isVideoMode ? (
          <div className="interactive-elements-pills">
            <span className="interactive-hint-tag" style={{ background: "rgba(239, 68, 68, 0.25)", color: "#fca5a5" }}>
              🎬 CAMADA DE VÍDEO:
            </span>
            {(["blackFridayImage", "logo"] as SelectableElementType[]).map((key) => {
              const el = ELEMENT_LABELS[key];
              const isSelected = selectedElement === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`element-pill-btn ${isSelected ? "active" : ""}`}
                  style={{
                    borderColor: isSelected ? el.color : "rgba(255,255,255,0.15)",
                    color: isSelected ? el.color : "#ffffff",
                  }}
                  onClick={() => setSelectedElement(key)}
                >
                  {el.icon}
                  <span>{el.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="interactive-elements-pills">
            <span className="interactive-hint-tag">CAMADA:</span>
            {(Object.keys(ELEMENT_LABELS) as SelectableElementType[]).map((key) => {
              const el = ELEMENT_LABELS[key];
              const isSelected = selectedElement === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`element-pill-btn ${isSelected ? "active" : ""}`}
                  style={{
                    borderColor: isSelected ? el.color : "rgba(255,255,255,0.15)",
                    color: isSelected ? el.color : "#ffffff",
                  }}
                  onClick={() => setSelectedElement(key)}
                >
                  {el.icon}
                  <span>{el.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Ações de Visibilidade e Saída */}
        <div className="interactive-actions-right">
          {/* Botão de Copiar Padrão dos Produtos quando em Modo Vídeo */}
          {isVideoMode && onUpdateConfig && (
            <button
              type="button"
              className="btn btn-secondary btn-mini-interactive"
              onClick={() => {
                onUpdateConfig((prev) => ({
                  ...prev,
                  videoOverlay: {
                    enabled: true,
                    logo: {
                      visible: prev.logo.visible,
                      size: prev.logo.size,
                      position: prev.logo.position,
                      x: prev.logo.x,
                      y: prev.logo.y,
                      offsetX: prev.logo.offsetX,
                      offsetY: prev.logo.offsetY,
                      scale: prev.logo.scale,
                      opacity: prev.logo.opacity,
                      rotation: prev.logo.rotation,
                    },
                    blackFridayImage: {
                      visible: prev.blackFridayImage?.visible,
                      x: prev.blackFridayImage?.x,
                      y: prev.blackFridayImage?.y,
                      width: prev.blackFridayImage?.width,
                      scale: prev.blackFridayImage?.scale,
                      rotation: prev.blackFridayImage?.rotation,
                      opacity: prev.blackFridayImage?.opacity,
                    },
                  },
                }));
              }}
              title="Copiar posições da logo e Black Friday dos produtos para o vídeo"
            >
              <Copy size={13} />
              <span>Copiar Padrão</span>
            </button>
          )}

          {/* Botão de Ocultar/Sumir Controles */}
          <button
            type="button"
            className="btn btn-secondary btn-mini-interactive btn-hide-overlay"
            onClick={() => setIsUiVisible(false)}
            title="Ocultar caixas e painéis para ver a TV limpa (Atalho: Tecla H)"
          >
            <EyeOff size={13} />
            <span>Ver Tela Limpa (H)</span>
          </button>

          {/* Toggle Caixas na Tela */}
          <button
            type="button"
            className={`btn btn-secondary btn-mini-interactive ${showOnScreenBoxes ? "active" : ""}`}
            onClick={() => setShowOnScreenBoxes((prev) => !prev)}
            title="Ligar ou desligar as caixas luminosas sobre os elementos na tela"
          >
            <Layers size={13} />
            <span>{showOnScreenBoxes ? "Caixas: ON" : "Caixas: OFF"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-mini-interactive"
            onClick={onResetLayout}
            title="Restaurar layout para valores padrão"
          >
            <RotateCcw size={13} />
            <span>Resetar</span>
          </button>

          <button
            type="button"
            className={`btn btn-secondary btn-mini-interactive ${copied ? "btn-success" : ""}`}
            onClick={onCopyCssAndJson}
            title="Copiar código CSS e JSON formatados para salvar como padrão"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copiado!" : "Copiar Config"}</span>
          </button>

          <button
            type="button"
            className={`btn btn-primary btn-mini-interactive ${saved ? "btn-success" : ""}`}
            onClick={onSaveToTv}
            title="Salvar imediatamente na TV em exibição"
          >
            {saved ? <Check size={13} /> : <Save size={13} />}
            <span>{saved ? "Salvo na TV!" : "Salvar Padrão"}</span>
          </button>
        </div>
      </div>

      {/* DIRECT ON-SCREEN CLICKABLE HOTSPOTS & BOUNDING BOX (SE ATIVADO) */}
      {showOnScreenBoxes && (
        <div className="interactive-canvas-hotspots-layer">
          {(
            (isVideoMode
              ? (["logo", "blackFridayImage"] as SelectableElementType[])
              : (Object.keys(ELEMENT_LABELS) as SelectableElementType[]))
          ).map((key) => {
            if (key === "brushCorners" || key === "spacing") return null;
            const rect = elementRects[key] || getFallbackRect(key);
            const isSelected = selectedElement === key;
            const isHovered = hoveredElement === key;

            return (
              <div
                key={key}
                className={`canvas-element-hotspot ${isSelected ? "is-selected" : ""} ${isHovered ? "is-hovered" : ""}`}
                style={{
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  borderColor: ELEMENT_LABELS[key].color,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElement(key);
                }}
                onMouseEnter={() => setHoveredElement(key)}
                onMouseLeave={() => setHoveredElement(null)}
                title={`Clique para selecionar e editar: ${ELEMENT_LABELS[key].label}`}
              >
                {!isSelected && isHovered && (
                  <div className="hotspot-hover-pill" style={{ background: ELEMENT_LABELS[key].color }}>
                    {ELEMENT_LABELS[key].icon}
                    <span>{ELEMENT_LABELS[key].label}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* ACTIVE GLOWING BOUNDING BOX ON SELECTED ELEMENT */}
          <div
            className="canvas-active-selection-box"
            style={{
              left: `${activeRect.left}%`,
              top: `${activeRect.top}%`,
              width: `${activeRect.width}%`,
              height: `${activeRect.height}%`,
              borderColor: ELEMENT_LABELS[selectedElement].color,
              boxShadow: `0 0 0 1px ${ELEMENT_LABELS[selectedElement].color}, 0 0 24px ${ELEMENT_LABELS[selectedElement].color}44`,
            }}
            onMouseDown={handleStartDrag}
          >
            {/* Top Floating Action Bar on the Element */}
            <div
              className="selection-box-toolbar"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="selection-box-pill" style={{ background: ELEMENT_LABELS[selectedElement].color }}>
                {ELEMENT_LABELS[selectedElement].icon}
                <strong>{ELEMENT_LABELS[selectedElement].label}</strong>
                <span className="selection-value-tag">{getCurrentDisplayValue()}</span>
              </div>
            </div>

            {/* Corner Drag Grips */}
            <div className="selection-corner-handle handle-tl" />
            <div className="selection-corner-handle handle-tr" />
            <div className="selection-corner-handle handle-bl" />
            <div className="selection-corner-handle handle-br" />

            {/* Quick Preset Buttons for Spacing */}
            {selectedElement === "spacing" && (
              <div className="selection-box-presets" onMouseDown={(e) => e.stopPropagation()}>
                <span className="presets-label">Distância:</span>
                {[
                  { label: "Junto (0px)", val: 0 },
                  { label: "Perto (12px)", val: 12 },
                  { label: "Médio (28px)", val: 28 },
                  { label: "Longe (55px)", val: 55 },
                  { label: "Muito Longe (95px)", val: 95 },
                ].map((p) => {
                  const cur = tuning.gap ?? 16;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      className={`preset-scale-btn ${cur === p.val ? "active" : ""}`}
                      onClick={() =>
                        onUpdateTuning((prev) => ({
                          ...prev,
                          gap: p.val,
                        }))
                      }
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Preset Buttons for Titles & Prices */}
            {(selectedElement === "promotionalPrice" || selectedElement === "productName") && (
              <div className="selection-box-presets" onMouseDown={(e) => e.stopPropagation()}>
                <span className="presets-label">Tamanho:</span>
                {[
                  { label: "Padrão", val: 0 },
                  { label: "+30px", val: 30 },
                  { label: "+60px", val: 60 },
                  { label: "+100px", val: 100 },
                  { label: "+160px", val: 160 },
                ].map((p) => {
                  const cur = tuning[selectedElement]?.fontSizeOffset ?? 0;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      className={`preset-scale-btn ${cur === p.val ? "active" : ""}`}
                      onClick={() => setExplicitOffset(p.val)}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Corner Handles */}
            <div className="corner-handle top-left" />
            <div className="corner-handle top-right" />
            <div className="corner-handle bottom-left" />
            <div className="corner-handle bottom-right" />
          </div>
        </div>
      )}

      {/* Floating Canvas Control Panel for Selected Element */}
      {isPanelMinimized ? (
        <button
          type="button"
          className="btn-floating-panel-pill"
          onClick={() => setIsPanelMinimized(false)}
          title="Clique para expandir o painel de controles"
        >
          <Sliders size={13} style={{ color: ELEMENT_LABELS[selectedElement].color }} />
          <span>Painel: <strong>{ELEMENT_LABELS[selectedElement].label}</strong></span>
          <ChevronUp size={13} />
        </button>
      ) : (
        <div
          className="interactive-floating-controller"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="floating-ctrl-header">
            <div className="floating-ctrl-title">
              <span
                className="element-indicator-dot"
                style={{ background: ELEMENT_LABELS[selectedElement].color }}
              />
              <strong>{ELEMENT_LABELS[selectedElement].label}</strong>
            </div>

            <div className="floating-ctrl-window-actions">
              <button
                type="button"
                className="btn-win-action"
                onClick={() => setIsPanelMinimized(true)}
                title="Minimizar painel"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          <div className="floating-ctrl-grid">
            {/* LOGO CUSTOMIZADA & REMOVER FUNDO */}
            {selectedElement === "logo" && onUpdateConfig && (
              <div className="floating-ctrl-group" style={{ gridColumn: "span 2" }}>
                <span className="ctrl-group-label">Logo da Empresa & Imagem:</span>

                {/* Input oculto de arquivo */}
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />

                {/* Preview Thumbnail e Botões de Ação */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "6px",
                      background: "repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.2)",
                      flexShrink: 0,
                    }}
                  >
                    {config.logo.image ? (
                      <img
                        src={config.logo.image}
                        alt="Logo"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <Sun size={24} color="#f2c94c" />
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-mini-interactive"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={isUploadingLogo || isRemovingLogoBg}
                        title="Escolher arquivo de imagem do seu computador/celular"
                      >
                        <Upload size={12} />
                        <span>{isUploadingLogo ? "Enviando..." : "Carregar Foto"}</span>
                      </button>

                      {config.logo.image && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-mini-interactive"
                          onClick={handleRemoveLogoBg}
                          disabled={isRemovingLogoBg || isUploadingLogo}
                          style={{
                            background: "linear-gradient(135deg, rgba(235, 87, 87, 0.3), rgba(242, 201, 76, 0.3))",
                            borderColor: "rgba(242, 201, 76, 0.6)",
                            color: "#fff",
                          }}
                          title="Remover fundo branco ou sólido automaticamente com inteligência de cor"
                        >
                          <Wand2 size={12} style={{ color: "#f2c94c" }} />
                          <span>{isRemovingLogoBg ? "Removendo..." : "Remover Fundo"}</span>
                        </button>
                      )}

                      {config.logo.originalImage && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-mini-interactive"
                          onClick={handleRestoreOriginalLogo}
                          title="Restaurar logo com fundo original"
                        >
                          <RotateCcw size={12} />
                          <span>Original</span>
                        </button>
                      )}

                      {config.logo.image && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-mini-interactive"
                          onClick={handleResetToDefaultSolLogo}
                          title="Voltar para a Logo Sol padrão"
                        >
                          <X size={12} />
                          <span>Padrão</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>
                        {config.logo.image ? (config.logo.removeBackground ? "✨ Fundo Transparente" : "🖼️ Imagem Própria") : "☀️ Logo Sol TV"}
                      </span>
                      {logoUploadSuccess && (
                        <span style={{ fontSize: "10px", color: "#6fcf97", fontWeight: 600 }}>
                          ✓ {logoUploadSuccess}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slider de Tolerância para Remoção de Fundo */}
                {config.logo.image && (
                  <div style={{ marginBottom: "8px", background: "rgba(255,255,255,0.03)", padding: "6px 8px", borderRadius: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Wand2 size={11} style={{ color: "#f2c94c" }} /> Tolerância de Cor do Fundo:
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#f2c94c" }}>
                        {logoBgTolerance}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={logoBgTolerance}
                      onChange={(e) => setLogoBgTolerance(Number(e.target.value))}
                      style={{ width: "100%" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                      <span>1% (Só branco puro)</span>
                      <span>30% (Recomendado)</span>
                      <span>100% (Mais agressivo)</span>
                    </div>
                  </div>
                )}

                {logoBgRemovalError && (
                  <div style={{ fontSize: "11px", color: "#ff6b6b", marginBottom: "6px" }}>
                    ⚠️ {logoBgRemovalError}
                  </div>
                )}

                {/* Visibilidade da Logo */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    className={`btn-toggle-mini ${config.logo.visible !== false ? "active" : ""}`}
                    onClick={() =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        logo: {
                          ...prev.logo,
                          visible: prev.logo.visible === false ? true : false,
                        },
                      }))
                    }
                    title="Exibir ou ocultar a logo na tela"
                  >
                    {config.logo.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{config.logo.visible !== false ? "Logo: VISÍVEL" : "Logo: OCULTA"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* A. TEXTO CUSTOMIZÁVEL */}
            {selectedElement === "subtitle" && onUpdateConfig && (
              <div className="floating-ctrl-group" style={{ gridColumn: "span 2" }}>
                <span className="ctrl-group-label">Texto da Frase em Baixo:</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    className="input-text-dark"
                    value={config.subtitle?.text ?? "Qualidade para o seu dia."}
                    onChange={(e) =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        subtitle: { ...(prev.subtitle || {}), text: e.target.value },
                      }))
                    }
                    placeholder="Ex: Qualidade para o seu dia."
                    style={{ flex: 1, padding: "6px 10px", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    className={`btn-toggle-mini ${config.subtitle?.showBrush !== false ? "active" : ""}`}
                    onClick={() =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        subtitle: {
                          ...(prev.subtitle || {}),
                          showBrush: prev.subtitle?.showBrush === false ? true : false,
                        },
                      }))
                    }
                    title="Ativar/Desativar traço vermelho decorativo"
                  >
                    Pincel: {config.subtitle?.showBrush !== false ? "ON" : "OFF"}
                  </button>
                  <button
                    type="button"
                    className={`btn-toggle-mini ${config.subtitle?.visible !== false ? "active" : ""}`}
                    onClick={() =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        subtitle: {
                          ...(prev.subtitle || {}),
                          visible: prev.subtitle?.visible === false ? true : false,
                        },
                      }))
                    }
                    title="Exibir ou ocultar este texto"
                  >
                    {config.subtitle?.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                </div>
              </div>
            )}

            {selectedElement === "sectorText" && onUpdateConfig && (
              <div className="floating-ctrl-group" style={{ gridColumn: "span 2" }}>
                <span className="ctrl-group-label">Nome do Setor (Ao lado da Logo):</span>
                <input
                  type="text"
                  className="input-text-dark"
                  value={config.logo.sectorText || "AÇOUGUE"}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      logo: { ...prev.logo, sectorText: e.target.value },
                    }))
                  }
                  placeholder="Ex: AÇOUGUE, PADARIA, HORTIFRUTI..."
                  style={{ width: "100%", padding: "6px 10px", fontSize: "13px" }}
                />
              </div>
            )}

            {selectedElement === "badge" && onUpdateConfig && (
              <div className="floating-ctrl-group" style={{ gridColumn: "span 2" }}>
                <span className="ctrl-group-label">Selo / Tag Promocional na Oferta:</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <button
                    type="button"
                    className={`btn-toggle-mini ${config.badge.visible !== false ? "active" : ""}`}
                    onClick={() =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        badge: {
                          ...prev.badge,
                          visible: prev.badge.visible === false ? true : false,
                        },
                      }))
                    }
                    title="Exibir ou ocultar o selo/tag na tela"
                  >
                    {config.badge.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{config.badge.visible !== false ? "Selo: ATIVO" : "Selo: OCULTO"}</span>
                  </button>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                    {config.badge.visible !== false ? "Exibindo selo sobre as fotos" : "Selo promocional oculto"}
                  </span>
                </div>

                <span className="ctrl-group-label">Texto do Selo:</span>
                <input
                  type="text"
                  className="input-text-dark"
                  value={config.badge.text || "BLACK FRIDAY"}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      badge: { ...prev.badge, text: e.target.value },
                    }))
                  }
                  placeholder="Ex: BLACK FRIDAY, OFERTA, SUPER PREÇO..."
                  style={{ width: "100%", padding: "6px 10px", fontSize: "13px" }}
                />
              </div>
            )}

            {selectedElement === "blackFridayImage" && onUpdateConfig && (
              <div className="floating-ctrl-group" style={{ gridColumn: "span 2" }}>
                <span className="ctrl-group-label">Imagem / Selo Black Friday na Tela:</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <button
                    type="button"
                    className={`btn-toggle-mini ${config.blackFridayImage?.visible !== false ? "active" : ""}`}
                    onClick={() =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        blackFridayImage: {
                          ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                          visible: prev.blackFridayImage?.visible === false ? true : false,
                        },
                      }))
                    }
                    title="Exibir ou ocultar a imagem Black Friday"
                  >
                    {config.blackFridayImage?.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{config.blackFridayImage?.visible !== false ? "Imagem: ATIVA" : "Imagem: OCULTA"}</span>
                  </button>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                    Posição X: <strong>{config.blackFridayImage?.x ?? 82}%</strong> · Y: <strong>{config.blackFridayImage?.y ?? 6}%</strong>
                  </span>
                </div>

                {/* Presets Rápidos de Posição (Incluindo Y negativo como -15%) */}
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "3px" }}>
                    Posições Rápidas:
                  </span>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {[
                      { label: "↗ Topo Fora (Y: -15%)", x: 82, y: -15 },
                      { label: "↗ Topo Dir (Y: 6%)", x: 82, y: 6 },
                      { label: "↑ Topo Centro", x: 41, y: 4 },
                      { label: "↖ Topo Esq", x: 4, y: 4 },
                      { label: "• Centro", x: 41, y: 45 },
                    ].map((pos) => {
                      const isCurrent =
                        Math.round(config.blackFridayImage?.x ?? 82) === pos.x &&
                        Math.round(config.blackFridayImage?.y ?? 6) === pos.y;
                      return (
                        <button
                          key={pos.label}
                          type="button"
                          className={`btn-mini-preset ${isCurrent ? "active" : ""}`}
                          onClick={() =>
                            onUpdateConfig((prev) => ({
                              ...prev,
                              blackFridayImage: {
                                ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                                x: pos.x,
                                y: pos.y,
                              },
                            }))
                          }
                          style={{
                            padding: "2px 6px",
                            fontSize: "10px",
                            borderRadius: "4px",
                            background: isCurrent ? "#ff3366" : "rgba(255,255,255,0.08)",
                            border: isCurrent ? "1px solid #ff3366" : "1px solid rgba(255,255,255,0.15)",
                            color: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          {pos.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Posição X e Posição Y com Inputs Numéricos e Sliders */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span>Posição X (%):</span>
                      <input
                        type="number"
                        min="-100"
                        max="200"
                        step="1"
                        value={Math.round(config.blackFridayImage?.x ?? 82)}
                        onChange={(e) =>
                          onUpdateConfig((prev) => ({
                            ...prev,
                            blackFridayImage: {
                              ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                              x: Number(e.target.value),
                            },
                          }))
                        }
                        style={{
                          width: "48px",
                          padding: "1px 3px",
                          fontSize: "11px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#ffffff",
                          borderRadius: "3px",
                          textAlign: "right",
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="150"
                      step="1"
                      value={config.blackFridayImage?.x ?? 82}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          blackFridayImage: {
                            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                            x: Number(e.target.value),
                          },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span>Posição Y (%):</span>
                      <input
                        type="number"
                        min="-100"
                        max="200"
                        step="1"
                        value={Math.round(config.blackFridayImage?.y ?? 6)}
                        onChange={(e) =>
                          onUpdateConfig((prev) => ({
                            ...prev,
                            blackFridayImage: {
                              ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                              y: Number(e.target.value),
                            },
                          }))
                        }
                        style={{
                          width: "48px",
                          padding: "1px 3px",
                          fontSize: "11px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#ffffff",
                          borderRadius: "3px",
                          textAlign: "right",
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="150"
                      step="1"
                      value={config.blackFridayImage?.y ?? 6}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          blackFridayImage: {
                            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                            y: Number(e.target.value),
                          },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                    Largura ({config.blackFridayImage?.width ?? 18}%):
                    <input
                      type="range"
                      min="5"
                      max="80"
                      step="1"
                      value={config.blackFridayImage?.width ?? 18}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          blackFridayImage: {
                            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                            width: Number(e.target.value),
                          },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                    Escala ({Math.round((config.blackFridayImage?.scale ?? 1) * 100)}%):
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={config.blackFridayImage?.scale ?? 1}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          blackFridayImage: {
                            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                            scale: Number(e.target.value),
                          },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                    Rotação ({config.blackFridayImage?.rotation ?? 0}°):
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={config.blackFridayImage?.rotation ?? 0}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          blackFridayImage: {
                            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                            rotation: Number(e.target.value),
                          },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                    Opacidade ({config.blackFridayImage?.opacity ?? 100}%):
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={config.blackFridayImage?.opacity ?? 100}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          blackFridayImage: {
                            ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
                            opacity: Number(e.target.value),
                          },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* B. MOLDURAS PRETAS (TAMANHO, OPACIDADE E VISIBILIDADE) */}
            {selectedElement === "brushCorners" && onUpdateConfig && (
              <div className="floating-ctrl-group" style={{ gridColumn: "span 2" }}>
                <span className="ctrl-group-label">Molduras Pretas nos 4 Cantos da TV:</span>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <button
                    type="button"
                    className={`btn-toggle-mini ${config.fx?.brushCorners?.enabled !== false && config.visibility?.brushCorners !== false ? "active" : ""}`}
                    onClick={() =>
                      onUpdateConfig((prev) => {
                        const isCurrentlyEnabled = prev.fx?.brushCorners?.enabled !== false && prev.visibility?.brushCorners !== false;
                        const nextEnabled = !isCurrentlyEnabled;
                        return {
                          ...prev,
                          visibility: {
                            ...(prev.visibility || {}),
                            brushCorners: nextEnabled,
                          },
                          fx: {
                            ...(prev.fx || {}),
                            brushCorners: {
                              ...(prev.fx?.brushCorners || { opacity: 100, scale: 1 }),
                              enabled: nextEnabled,
                            },
                          },
                        };
                      })
                    }
                  >
                    {config.fx?.brushCorners?.enabled !== false && config.visibility?.brushCorners !== false ? "Molduras: ATIVAS" : "Molduras: OCULTAS"}
                  </button>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                    Opacidade: {config.fx?.brushCorners?.opacity ?? 100}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.fx?.brushCorners?.opacity ?? 100}
                    onChange={(e) =>
                      onUpdateConfig((prev) => ({
                        ...prev,
                        fx: {
                          ...(prev.fx || {}),
                          brushCorners: {
                            ...(prev.fx?.brushCorners || { enabled: true, scale: 1 }),
                            opacity: Number(e.target.value),
                          },
                        },
                      }))
                    }
                    style={{ flex: 1 }}
                  />
                </div>

                <span className="ctrl-group-label">Tamanho / Escala das Molduras:</span>
                <div className="floating-button-row">
                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => adjustSize(-1)}
                    title="Diminuir molduras"
                  >
                    <Minimize2 size={13} /> Menor
                  </button>

                  <span className="stepper-value-badge">
                    {Math.round((config.fx?.brushCorners?.scale ?? 1) * 100)}%
                  </span>

                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => adjustSize(1)}
                    title="Aumentar molduras"
                  >
                    <Maximize2 size={13} /> Maior
                  </button>
                </div>

                <input
                  type="range"
                  min="0.2"
                  max="3.5"
                  step="0.05"
                  value={config.fx?.brushCorners?.scale ?? 1}
                  onChange={(e) =>
                    onUpdateConfig((prev) => ({
                      ...prev,
                      fx: {
                        ...(prev.fx || {}),
                        brushCorners: {
                          ...(prev.fx?.brushCorners || { enabled: true, opacity: 100 }),
                          scale: Number(e.target.value),
                        },
                      },
                    }))
                  }
                  style={{ width: "100%", marginTop: "6px" }}
                />
              </div>
            )}

            {/* C. ESPAÇAMENTO ENTRE PRODUTOS (MAIS LONGE / MAIS PERTO) */}
            {selectedElement === "spacing" && (
              <div className="floating-ctrl-group" style={{ gridColumn: "span 2" }}>
                <span className="ctrl-group-label">Distância Entre os Produtos na Tela (Gap):</span>
                <div className="floating-button-row">
                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => adjustSize(-1)}
                    title="Aproximar produtos (diminuir espaço)"
                  >
                    <Minimize2 size={13} /> Mais Perto
                  </button>

                  <span className="stepper-value-badge">{tuning.gap ?? 16}px</span>

                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => adjustSize(1)}
                    title="Afastar produtos (aumentar espaço)"
                  >
                    <Maximize2 size={13} /> Mais Longe
                  </button>
                </div>

                <input
                  type="range"
                  min="0"
                  max="160"
                  step="2"
                  value={tuning.gap ?? 16}
                  onChange={(e) =>
                    onUpdateTuning((prev) => ({
                      ...prev,
                      gap: Number(e.target.value),
                    }))
                  }
                  style={{ width: "100%", marginTop: "6px" }}
                />

                <span className="ctrl-group-label" style={{ marginTop: "8px" }}>
                  Espaço Foto vs Preço (Dentro do Produto):
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="2"
                  value={tuning.itemGap ?? 10}
                  onChange={(e) =>
                    onUpdateTuning((prev) => ({
                      ...prev,
                      itemGap: Number(e.target.value),
                    }))
                  }
                  style={{ width: "100%" }}
                />

                <span className="ctrl-group-label" style={{ marginTop: "8px" }}>
                  Proporção da Coluna (Foto vs Textos):
                </span>
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.02"
                  value={tuning.columnRatio ?? 0.52}
                  onChange={(e) =>
                    onUpdateTuning((prev) => ({
                      ...prev,
                      columnRatio: Number(e.target.value),
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </div>
            )}

            {/* 1. Tamanho / Escala (Com Stepper e Slider Direto) */}
            {selectedElement !== "brushCorners" && selectedElement !== "spacing" && (
              <div className="floating-ctrl-group">
                <span className="ctrl-group-label">
                  {selectedElement === "productImage"
                    ? "Escala da Foto:"
                    : selectedElement === "logo" || selectedElement === "badge"
                    ? "Tamanho (px):"
                    : "Tamanho da Letra:"}
                </span>
                <div className="floating-button-row">
                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => adjustSize(-1)}
                    title="Diminuir"
                  >
                    <Minimize2 size={13} /> Menor
                  </button>

                  <span className="stepper-value-badge">{getCurrentDisplayValue()}</span>

                  <button
                    type="button"
                    className="btn-stepper"
                    onClick={() => adjustSize(1)}
                    title="Aumentar"
                  >
                    <Maximize2 size={13} /> Maior
                  </button>
                </div>

                {/* Slider de Tamanho Direto */}
                <div style={{ marginTop: "6px" }}>
                  {selectedElement === "productImage" && (
                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.05"
                      value={tuning.productImage?.scale ?? 1}
                      onChange={(e) =>
                        onUpdateTuning((prev) => ({
                          ...prev,
                          productImage: { ...(prev.productImage || {}), scale: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                  {selectedElement === "productName" && (
                    <input
                      type="range"
                      min="-80"
                      max="350"
                      step="2"
                      value={tuning.productName?.fontSizeOffset ?? 0}
                      onChange={(e) =>
                        onUpdateTuning((prev) => ({
                          ...prev,
                          productName: { ...(prev.productName || {}), fontSizeOffset: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                  {selectedElement === "promotionalPrice" && (
                    <input
                      type="range"
                      min="-80"
                      max="450"
                      step="2"
                      value={tuning.promotionalPrice?.fontSizeOffset ?? 0}
                      onChange={(e) =>
                        onUpdateTuning((prev) => ({
                          ...prev,
                          promotionalPrice: { ...(prev.promotionalPrice || {}), fontSizeOffset: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                  {selectedElement === "oldPrice" && (
                    <input
                      type="range"
                      min="-50"
                      max="200"
                      step="2"
                      value={tuning.oldPrice?.fontSizeOffset ?? 0}
                      onChange={(e) =>
                        onUpdateTuning((prev) => ({
                          ...prev,
                          oldPrice: { ...(prev.oldPrice || {}), fontSizeOffset: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                  {selectedElement === "logo" && onUpdateConfig && (
                    <input
                      type="range"
                      min="20"
                      max="450"
                      step="4"
                      value={config.logo.size || 68}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          logo: { ...prev.logo, size: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                  {selectedElement === "subtitle" && onUpdateConfig && (
                    <input
                      type="range"
                      min="10"
                      max="160"
                      step="2"
                      value={config.subtitle?.fontSize ?? 22}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          subtitle: { ...(prev.subtitle || {}), fontSize: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                  {selectedElement === "sectorText" && onUpdateConfig && (
                    <input
                      type="range"
                      min="8"
                      max="120"
                      step="2"
                      value={config.logo.sectorTextSize || 13}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          logo: { ...prev.logo, sectorTextSize: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                  {selectedElement === "badge" && onUpdateConfig && (
                    <input
                      type="range"
                      min="20"
                      max="400"
                      step="4"
                      value={config.badge.size || 70}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          badge: { ...prev.badge, size: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 2. Posição X / Y (Botões direcionais dpad e sliders) */}
            {selectedElement !== "brushCorners" && selectedElement !== "spacing" && (() => {
              const isPctCoord = selectedElement === "blackFridayImage" || isVideoMode;
              const nudgeStep = isPctCoord ? 2 : 10;
              const sliderMin = isPctCoord ? -50 : -800;
              const sliderMax = isPctCoord ? 150 : 800;
              const sliderStep = isPctCoord ? 1 : 2;
              const unit = isPctCoord ? "%" : "px";

              return (
                <div className="floating-ctrl-group">
                  <span className="ctrl-group-label">Posição X & Y:</span>
                  <div className="floating-dpad">
                    <div className="dpad-row">
                      <button
                        type="button"
                        className="btn-dpad"
                        onClick={() => nudge(0, -nudgeStep)}
                        title="Mover para cima"
                      >
                        <ArrowUp size={12} />
                      </button>
                    </div>
                    <div className="dpad-row">
                      <button
                        type="button"
                        className="btn-dpad"
                        onClick={() => nudge(-nudgeStep, 0)}
                        title="Mover para esquerda"
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <span className="dpad-coords">
                        {currentCoords.x}{unit}, {currentCoords.y}{unit}
                      </span>
                      <button
                        type="button"
                        className="btn-dpad"
                        onClick={() => nudge(nudgeStep, 0)}
                        title="Mover para direita"
                      >
                        <ArrowRight size={12} />
                      </button>
                    </div>
                    <div className="dpad-row">
                      <button
                        type="button"
                        className="btn-dpad"
                        onClick={() => nudge(0, nudgeStep)}
                        title="Mover para baixo"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Sliders X e Y */}
                  <div className="slider-row-compact" style={{ marginTop: "4px" }}>
                    <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>
                      X ({currentCoords.x}{unit}):
                      <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        step={sliderStep}
                        value={currentCoords.x}
                        onChange={(e) => updatePosition(Number(e.target.value), currentCoords.y)}
                      />
                    </label>
                    <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                      Y ({currentCoords.y}{unit}):
                      <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        step={sliderStep}
                        value={currentCoords.y}
                        onChange={(e) => updatePosition(currentCoords.x, Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
