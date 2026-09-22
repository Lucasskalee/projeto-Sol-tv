import type { MotionCategory } from "./MotionCategoryBar";
import { useState, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  DollarSign,
  Tag,
  Sun,
  Play,
  LayoutGrid,
  Palette,
  Layers,
  Upload,
  X,
  Image as ImageIcon,
  Flame,
  RotateCcw,
  Sliders,
  Wand2,
  Type,
  Copy,
  Check,
  Move,
  Maximize2,
  Minimize2,
  Eye,
} from "lucide-react";
import { OFFER_LAYOUTS, type OfferLayout } from "../../offers/layouts";
import { themeRegistry } from "../../themes/registry";
import { EXIT_PRESETS, type ExitPreset } from "../../transitions";
import type {
  BackgroundType,
  BadgePosition,
  BadgeType,
  BalloonSpeed,
  BlackFridayFxConfig,
  CornerTapePosition,
  ElementAnimationConfig,
  EntranceChoreography,
  LogoPosition,
  MotionConfig,
  PaintStrokeVariant,
  PriceImpact,
  PriceTagPosition,
  ProductCardStyle,
  ProductImageAnimation,
  ProductNameAnimation,
  ProductPriceAnimation,
  SectorLayout,
  ShimmerColor,
  StampPosition,
  ThemeColorOverrides,
  PerLayoutTuning,
  LayoutElementConfig,
  VisualElementsVisibility,
  MotionBlackFridayImageConfig,
  BlackFridayAnimationPreset,
  BlackFridayEntryAnimationPreset,
  BlackFridayIdleAnimationPreset,
  MotionFireSparksConfig,
  FireSparksIntensity,
  FireSparksPerformance,
} from "../../motion/types";
import {
  DEFAULT_MOTION_CONFIG,
  DEFAULT_BLACK_FRIDAY_IMAGE,
  DEFAULT_FIRE_SPARKS_CONFIG,
  isBlackFridayImageVisible,
  setBlackFridayImageVisibility,
} from "../../motion/defaults";
import { formatCompleteTuningExport } from "../../motion/layoutTuningFormatter";
import { removeWhiteBackground } from "../../images/removeWhiteBackground";
import { uploadMediaFile, databaseConfigured } from "../../supabase";

export type MotionControlsProps = {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
  sector?: string;
  activeCategory?: MotionCategory;
  onSelectCategory?: (category: MotionCategory) => void;
  activeLayoutTuningTab?: "image" | "name" | "price" | "oldPrice" | "columns";
  onSelectLayoutTuningTab?: (tab: "image" | "name" | "price" | "oldPrice" | "columns") => void;
};

const AVAILABLE_THEMES = Object.values(themeRegistry);

const PRESET_BADGE_TAGS = [
  {
    id: "bf-gold",
    label: "Tag Black Friday",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 64' width='200' height='64'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23ff1a2d'/><stop offset='100%25' stop-color='%23850510'/></linearGradient><linearGradient id='gold' x1='0%25' y1='0%25' x2='100%25' y2='0%25'><stop offset='0%25' stop-color='%23ffd700'/><stop offset='50%25' stop-color='%23fff2a3'/><stop offset='100%25' stop-color='%23d4af37'/></linearGradient></defs><rect x='4' y='6' width='192' height='52' rx='10' fill='url(%23g)' stroke='url(%23gold)' stroke-width='3'/><text x='100' y='38' font-family='system-ui,-apple-system,sans-serif' font-size='18' font-weight='900' fill='%23ffffff' text-anchor='middle' letter-spacing='1'>★ BLACK FRIDAY ★</text></svg>",
  },
  {
    id: "oferta-special",
    label: "Tag Oferta Especial",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 64' width='200' height='64'><defs><linearGradient id='og' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23f2c94c'/><stop offset='100%25' stop-color='%23e28a00'/></linearGradient></defs><rect x='4' y='6' width='192' height='52' rx='26' fill='url(%23og)' stroke='%23ffffff' stroke-width='2.5'/><text x='100' y='39' font-family='system-ui,-apple-system,sans-serif' font-size='18' font-weight='1000' fill='%23000000' text-anchor='middle' letter-spacing='1.5'>⚡ OFERTA ESPECIAL</text></svg>",
  },
  {
    id: "super-preco",
    label: "Tag Super Preço",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 64' width='200' height='64'><defs><linearGradient id='pg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%2300d26a'/><stop offset='100%25' stop-color='%23007a3d'/></linearGradient></defs><rect x='4' y='6' width='192' height='52' rx='12' fill='url(%23pg)' stroke='%239affc7' stroke-width='2.5'/><text x='100' y='39' font-family='system-ui,-apple-system,sans-serif' font-size='18' font-weight='900' fill='%23ffffff' text-anchor='middle' letter-spacing='1'>SUPER PREÇO 🔥</text></svg>",
  },
  {
    id: "queima-total",
    label: "Tag Queima Total",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 64' width='200' height='64'><defs><linearGradient id='qg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23e21b2d'/><stop offset='100%25' stop-color='%2357030a'/></linearGradient></defs><rect x='4' y='6' width='192' height='52' rx='8' fill='url(%23qg)' stroke='%23ff7b72' stroke-width='2.5'/><text x='100' y='39' font-family='system-ui,-apple-system,sans-serif' font-size='18' font-weight='900' fill='%23ffffff' text-anchor='middle' letter-spacing='1.2'>QUEIMA TOTAL 🏷️</text></svg>",
  },
];

const GRADIENT_PRESETS = [
  {
    label: "Black Friday Luxo",
    start: "#1a0407",
    end: "#050608",
    angle: 135,
  },
  {
    label: "Vinho & Escuro",
    start: "#300508",
    end: "#0d0203",
    angle: 145,
  },
  {
    label: "Dourado & Carvão",
    start: "#1f1807",
    end: "#06070a",
    angle: 135,
  },
  {
    label: "Minimalista Escuro",
    start: "#181b22",
    end: "#090b0e",
    angle: 180,
  },
  {
    label: "Azul Noturno",
    start: "#081426",
    end: "#03070d",
    angle: 135,
  },
  {
    label: "Verde Esmeralda",
    start: "#051c10",
    end: "#020a06",
    angle: 135,
  },
];

export function MotionControls({
  config,
  onChange,
  onReplay,
  sector = "acougue",
  activeCategory,
  onSelectCategory,
  activeLayoutTuningTab: externalLayoutTuningTab,
  onSelectLayoutTuningTab,
}: MotionControlsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layoutTuning: true,
    visibility: true,
    fireSparks: true,
    cartazColors: true,
    blackFridayFx: true,
    blackFridayImage: true,
    videoOverlay: false,
    elementAnimations: false,
    background: false,
    productCard: false,
    badge: false,
    identity: false,
    price: false,
    ambient: false,
    motion: false,
    layout: false,
    theme: false,
  });

  const [localLayoutTuningTab, setLocalLayoutTuningTab] = useState<
    "image" | "name" | "price" | "oldPrice" | "columns"
  >("image");
  const activeLayoutTuningTab = externalLayoutTuningTab ?? localLayoutTuningTab;
  const setActiveLayoutTuningTab = (tab: "image" | "name" | "price" | "oldPrice" | "columns") => {
    setLocalLayoutTuningTab(tab);
    onSelectLayoutTuningTab?.(tab);
  };
  const [activeBfImageTab, setActiveBfImageTab] = useState<
    "content" | "style" | "animation"
  >("content");
  const [bgRemovalTolerance, setBgRemovalTolerance] = useState<number>(30);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null);
  const [isUploadingBfImage, setIsUploadingBfImage] = useState<boolean>(false);
  const [bfUploadError, setBfUploadError] = useState<string | null>(null);
  const [bfUploadSuccess, setBfUploadSuccess] = useState<string | null>(null);
  const [tuningCopied, setTuningCopied] = useState<boolean>(false);

  // Logo background removal state
  const [logoBgTolerance, setLogoBgTolerance] = useState<number>(30);
  const [isRemovingLogoBg, setIsRemovingLogoBg] = useState<boolean>(false);
  const [logoBgRemovalError, setLogoBgRemovalError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string | null>(null);

  const activeLayout = config.layout || "hero";
  const currentTuning = config.layoutTuning?.[activeLayout] || {};

  const updateLayoutTuning = (
    updater: (prev: PerLayoutTuning) => PerLayoutTuning
  ) => {
    onChange((prev) => {
      const currentTunings = prev.layoutTuning || {};
      const layoutTuning = currentTunings[activeLayout] || {};
      const updated = updater(layoutTuning);
      return {
        ...prev,
        layoutTuning: {
          ...currentTunings,
          [activeLayout]: updated,
        },
      };
    });
  };

  const resetCurrentLayoutTuning = () => {
    onChange((prev) => {
      const currentTunings = { ...(prev.layoutTuning || {}) };
      delete currentTunings[activeLayout];
      return {
        ...prev,
        layoutTuning: currentTunings,
      };
    });
  };

  const copyLayoutConfig = () => {
    const text = formatCompleteTuningExport(
      activeLayout,
      config.layoutTuning?.[activeLayout],
      config.layoutTuning
    );
    void navigator.clipboard.writeText(text);
    setTuningCopied(true);
    setTimeout(() => setTuningCopied(false), 2600);
  };

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const badgeFileInputRef = useRef<HTMLInputElement>(null);
  const bfImageFileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateBlackFridayImage = (
    patch:
      | Partial<MotionBlackFridayImageConfig>
      | ((prev: MotionBlackFridayImageConfig) => MotionBlackFridayImageConfig)
  ) => {
    onChange((prev) => {
      const current = prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE;
      const updated = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      const next = {
        ...prev,
        blackFridayImage: updated,
      };
      return updated.visible === undefined
        ? next
        : setBlackFridayImageVisibility(next, updated.visible);
    });
  };

  const updateVideoOverlay = (
    patch:
      | Partial<NonNullable<MotionConfig["videoOverlay"]>>
      | ((prev: NonNullable<MotionConfig["videoOverlay"]>) => NonNullable<MotionConfig["videoOverlay"]>)
  ) => {
    onChange((prev) => {
      const current = prev.videoOverlay || {
        enabled: true,
        logo: {
          visible: prev.logo.visible,
          size: prev.logo.size,
          position: "custom",
          x: prev.logo.x ?? 4,
          y: prev.logo.y ?? 4,
          scale: prev.logo.scale ?? 1,
          opacity: prev.logo.opacity ?? 100,
        },
        blackFridayImage: {
          visible: prev.blackFridayImage?.visible ?? true,
          x: prev.blackFridayImage?.x ?? 82,
          y: prev.blackFridayImage?.y ?? 6,
          width: prev.blackFridayImage?.width ?? 18,
          scale: prev.blackFridayImage?.scale ?? 1,
          rotation: prev.blackFridayImage?.rotation ?? 0,
          opacity: prev.blackFridayImage?.opacity ?? 100,
        },
      };
      const updated = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      return {
        ...prev,
        videoOverlay: updated,
      };
    });
  };

  const updateFireSparks = (
    patch:
      | Partial<MotionFireSparksConfig>
      | ((prev: MotionFireSparksConfig) => MotionFireSparksConfig)
  ) => {
    onChange((prev) => {
      const current =
        prev.fx?.fireSparks || prev.fireSparks || DEFAULT_FIRE_SPARKS_CONFIG;
      const updated =
        typeof patch === "function" ? patch(current) : { ...current, ...patch };
      return {
        ...prev,
        fireSparks: updated,
        fx: {
          ...(prev.fx || DEFAULT_MOTION_CONFIG.fx),
          fireSparks: updated,
        },
      };
    });
  };

  const handleBfImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local preview (lightweight blob URL, 0 lag, zero base64 payload)
    const previewUrl = URL.createObjectURL(file);
    updateBlackFridayImage({
      src: previewUrl,
      originalSrc: previewUrl,
      visible: true,
      removeBackground: false,
    });
    setBgRemovalError(null);
    setBfUploadError(null);
    setBfUploadSuccess(null);
    setIsUploadingBfImage(true);

    // 2. Upload to Supabase Storage if configured
    if (databaseConfigured) {
      try {
        const res = await uploadMediaFile(file, sector);
        if (res.publicUrl) {
          updateBlackFridayImage({
            src: res.publicUrl,
            originalSrc: res.publicUrl,
          });
          setBfUploadSuccess("Imagem salva no banco/nuvem com sucesso!");
          setTimeout(() => setBfUploadSuccess(null), 4000);
        }
      } catch (err: any) {
        console.error("[MotionLab] Upload para Supabase Storage falhou:", err);
        const isPolicyError = err?.message?.includes("policy") || err?.statusCode === "403" || err?.status === 403;
        setBfUploadError(
          isPolicyError
            ? "Permissão de gravação no Storage não configurada. Execute 'database/tv_media_storage.sql' no Supabase."
            : (err?.message || "Falha ao gravar arquivo no Supabase Storage.")
        );
      } finally {
        setIsUploadingBfImage(false);
      }
    } else {
      setIsUploadingBfImage(false);
    }
  };

  const handleRemoveBg = async () => {
    const src = config.blackFridayImage?.src;
    if (!src) return;
    setIsRemovingBg(true);
    setBgRemovalError(null);
    setBfUploadError(null);
    try {
      const blob = await removeWhiteBackground(src, bgRemovalTolerance);
      const transparentPreviewUrl = URL.createObjectURL(blob);
      updateBlackFridayImage((prev) => ({
        ...prev,
        src: transparentPreviewUrl,
        originalSrc: prev.originalSrc || prev.src,
        removeBackground: true,
      }));

      if (databaseConfigured) {
        const transparentFile = new File([blob], `bf-transparent-${Date.now()}.png`, { type: "image/png" });
        try {
          const res = await uploadMediaFile(transparentFile, sector);
          if (res.publicUrl) {
            updateBlackFridayImage((prev) => ({
              ...prev,
              src: res.publicUrl,
            }));
            setBfUploadSuccess("Imagem sem fundo salva no banco/nuvem!");
            setTimeout(() => setBfUploadSuccess(null), 4000);
          }
        } catch (uploadErr: any) {
          console.warn("[MotionLab] Upload de imagem transparente para Supabase Storage falhou:", uploadErr);
        }
      }
    } catch (err: any) {
      setBgRemovalError(err.message || "Não foi possível remover o fundo.");
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (config.blackFridayImage?.originalSrc) {
      updateBlackFridayImage({
        src: config.blackFridayImage.originalSrc,
        originalSrc: "",
        removeBackground: false,
      });
      setBgRemovalError(null);
    }
  };

  const handleResetToDefaultBadge = () => {
    updateBlackFridayImage({
      src: "",
      originalSrc: "",
      removeBackground: false,
    });
  };

  const updateLogo = (patch: Partial<MotionConfig["logo"]>) => {
    onChange((prev) => ({
      ...prev,
      logo: { ...prev.logo, ...patch },
    }));
  };

  const updateBackground = (patch: Partial<MotionConfig["background"]>) => {
    onChange((prev) => ({
      ...prev,
      background: { ...prev.background, ...patch },
      colorOverrides: patch.color
        ? { ...prev.colorOverrides, background: patch.color }
        : prev.colorOverrides,
    }));
  };

  const updateProductCard = (patch: Partial<MotionConfig["productCard"]>) => {
    onChange((prev) => ({
      ...prev,
      productCard: { ...prev.productCard, ...patch },
    }));
  };

  const updateBadge = (patch: Partial<MotionConfig["badge"]>) => {
    onChange((prev) => ({
      ...prev,
      badge: { ...prev.badge, ...patch },
      ...(patch.visible !== undefined
        ? {
            visibility: {
              ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
              badge: patch.visible,
            },
          }
        : {}),
    }));
  };

  const updatePricePhysics = (patch: Partial<MotionConfig["pricePhysics"]>) => {
    onChange((prev) => ({
      ...prev,
      pricePhysics: { ...prev.pricePhysics, ...patch },
    }));
    onReplay();
  };

  const updateSubtitle = (patch: Partial<NonNullable<MotionConfig["subtitle"]>>) => {
    onChange((prev) => ({
      ...prev,
      subtitle: {
        ...(prev.subtitle || DEFAULT_MOTION_CONFIG.subtitle || { text: "Qualidade para o seu dia.", fontSize: 22, visible: true }),
        ...patch,
      },
      ...(patch.visible !== undefined
        ? {
            visibility: {
              ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
              slogan: patch.visible,
            },
          }
        : {}),
    }));
  };

  const updateAmbient = (patch: Partial<MotionConfig["ambient"]>) => {
    onChange((prev) => ({
      ...prev,
      ambient: { ...prev.ambient, ...patch },
    }));
  };

  const updateFx = (patch: Partial<NonNullable<MotionConfig["fx"]>>) => {
    onChange((prev) => ({
      ...prev,
      fx: {
        ...(prev.fx || DEFAULT_MOTION_CONFIG.fx),
        ...patch,
      },
    }));
    onReplay();
  };

  const updateColorOverrides = (patch: Partial<NonNullable<MotionConfig["colorOverrides"]>>) => {
    onChange((prev) => ({
      ...prev,
      colorOverrides: {
        ...(prev.colorOverrides || {}),
        enabled: true,
        ...patch,
      },
    }));
  };

  const updateVisibility = (patch: Partial<VisualElementsVisibility>) => {
    onChange((prev) => ({
      ...prev,
      visibility: {
        ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
        ...patch,
      },
      ...(patch.badge !== undefined
        ? {
            badge: {
              ...prev.badge,
              visible: patch.badge,
            },
          }
        : {}),
      ...(patch.slogan !== undefined
        ? {
            subtitle: {
              ...(prev.subtitle || DEFAULT_MOTION_CONFIG.subtitle || { text: "Qualidade para o seu dia.", fontSize: 22, visible: true }),
              visible: patch.slogan,
            },
          }
        : {}),
      ...(patch.logo !== undefined
        ? {
            logo: {
              ...prev.logo,
              visible: patch.logo,
            },
          }
        : {}),
      ...(patch.brushCorners !== undefined
        ? {
            fx: {
              ...(prev.fx || DEFAULT_MOTION_CONFIG.fx),
              brushCorners: {
                ...(prev.fx?.brushCorners || { enabled: true, opacity: 100, scale: 1 }),
                enabled: patch.brushCorners,
              },
            },
          }
        : {}),
      ...(patch.blackFridayImage !== undefined
        ? {
            blackFridayImage: {
              ...(prev.blackFridayImage || DEFAULT_BLACK_FRIDAY_IMAGE),
              visible: patch.blackFridayImage,
            },
          }
        : {}),
      ...(patch.fireSparks !== undefined
        ? {
            fireSparks: {
              ...(prev.fireSparks || prev.fx?.fireSparks || DEFAULT_FIRE_SPARKS_CONFIG),
              enabled: patch.fireSparks,
            },
            fx: {
              ...(prev.fx || DEFAULT_MOTION_CONFIG.fx),
              fireSparks: {
                ...(prev.fx?.fireSparks || prev.fireSparks || DEFAULT_FIRE_SPARKS_CONFIG),
                enabled: patch.fireSparks,
              },
            },
          }
        : {}),
    }));
  };

  const restoreThemeColors = () => {
    onChange((prev) => ({
      ...prev,
      colorOverrides: {
        enabled: false,
      },
      logo: {
        ...prev.logo,
        sectorTextColor: "",
      },
    }));
  };

  const updateElementAnimations = (
    patch: Partial<NonNullable<MotionConfig["elementAnimations"]>>
  ) => {
    onChange((prev) => ({
      ...prev,
      elementAnimations: {
        ...(prev.elementAnimations ||
          DEFAULT_MOTION_CONFIG.elementAnimations || {
            nameAnimation: "slide-up",
            priceAnimation: "impact",
            imageAnimation: "float",
            choreography: "staggered",
          }),
        ...patch,
      },
    }));
    onReplay();
  };

  // Handlers for Local Logo Upload & Background Removal
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local preview (lightweight blob URL)
    const previewUrl = URL.createObjectURL(file);
    updateLogo({
      image: previewUrl,
      originalImage: previewUrl,
      removeBackground: false,
    });
    setLogoBgRemovalError(null);
    setLogoUploadError(null);
    setLogoUploadSuccess(null);
    setIsUploadingLogo(true);

    // 2. Upload to Supabase Storage if configured
    if (databaseConfigured) {
      try {
        const res = await uploadMediaFile(file, sector);
        if (res.publicUrl) {
          updateLogo({
            image: res.publicUrl,
            originalImage: res.publicUrl,
          });
          setLogoUploadSuccess("Logo salva no banco/nuvem com sucesso!");
          setTimeout(() => setLogoUploadSuccess(null), 4000);
        }
      } catch (err: any) {
        console.error("[MotionLab] Upload da logo para Supabase Storage falhou:", err);
        setLogoUploadError(err?.message || "Falha ao gravar logo no Storage.");
      } finally {
        setIsUploadingLogo(false);
      }
    } else {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogoBg = async () => {
    const src = config.logo.image;
    if (!src) return;
    setIsRemovingLogoBg(true);
    setLogoBgRemovalError(null);
    setLogoUploadError(null);
    try {
      const blob = await removeWhiteBackground(src, logoBgTolerance);
      const transparentPreviewUrl = URL.createObjectURL(blob);
      updateLogo({
        image: transparentPreviewUrl,
        originalImage: config.logo.originalImage || config.logo.image,
        removeBackground: true,
      });

      if (databaseConfigured) {
        const transparentFile = new File([blob], `logo-transparent-${Date.now()}.png`, { type: "image/png" });
        try {
          const res = await uploadMediaFile(transparentFile, sector);
          if (res.publicUrl) {
            updateLogo({
              image: res.publicUrl,
            });
            setLogoUploadSuccess("Logo sem fundo salva no banco/nuvem!");
            setTimeout(() => setLogoUploadSuccess(null), 4000);
          }
        } catch (uploadErr: any) {
          console.warn("[MotionLab] Upload da logo transparente para Supabase Storage falhou:", uploadErr);
        }
      }
    } catch (err: any) {
      setLogoBgRemovalError(err.message || "Não foi possível remover o fundo da logo.");
    } finally {
      setIsRemovingLogoBg(false);
    }
  };

  const handleRestoreOriginalLogo = () => {
    if (config.logo.originalImage) {
      updateLogo({
        image: config.logo.originalImage,
        originalImage: "",
        removeBackground: false,
      });
      setLogoBgRemovalError(null);
    }
  };

  const handleResetToDefaultSolLogo = () => {
    updateLogo({
      image: undefined,
      originalImage: undefined,
      removeBackground: false,
    });
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local preview (lightweight blob URL)
    const previewUrl = URL.createObjectURL(file);
    updateBackground({ type: "image", imageUrl: previewUrl });

    // 2. Upload to Supabase Storage if configured
    if (databaseConfigured) {
      void uploadMediaFile(file, sector)
        .then((res) => {
          if (res.publicUrl) {
            updateBackground({ type: "image", imageUrl: res.publicUrl });
          }
        })
        .catch((err) => {
          console.warn("[MotionLab] Upload do fundo para Supabase Storage falhou, mantendo preview:", err);
        });
    }
  };

  const handleBadgeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local preview (lightweight blob URL)
    const previewUrl = URL.createObjectURL(file);
    updateBadge({ type: "image", image: previewUrl });

    // 2. Upload to Supabase Storage if configured
    if (databaseConfigured) {
      void uploadMediaFile(file, sector)
        .then((res) => {
          if (res.publicUrl) {
            updateBadge({ type: "image", image: res.publicUrl });
          }
        })
        .catch((err) => {
          console.warn("[MotionLab] Upload da tag/selo para Supabase Storage falhou, mantendo preview:", err);
        });
    }
  };

  const isSectionVisible = (sectionKey: string) => {
    if (!activeCategory) return true;
    switch (activeCategory) {
      case "layout":
        return ["layoutTuning", "layout", "videoOverlay"].includes(sectionKey);
      case "fundo":
        return ["background", "theme", "cartazColors", "ambient"].includes(sectionKey);
      case "produto":
        return ["productCard", "elementAnimations", "badge", "cartazColors", "layoutTuning", "visibility"].includes(sectionKey);
      case "texto":
        return ["cartazColors", "identity", "layoutTuning", "visibility"].includes(sectionKey);
      case "preco":
        return ["price", "badge", "cartazColors", "layoutTuning", "visibility"].includes(sectionKey);
      case "marca":
        return ["identity", "visibility"].includes(sectionKey);
      case "efeitos":
        return ["fireSparks", "blackFridayFx", "blackFridayImage", "ambient", "visibility"].includes(sectionKey);
      case "motion":
        return ["motion", "elementAnimations"].includes(sectionKey);
      case "presets":
        return false;
      case "avancado":
        return ["visibility", "layoutTuning", "cartazColors", "theme"].includes(sectionKey);
      default:
        return true;
    }
  };

  const fx = config.fx || DEFAULT_MOTION_CONFIG.fx || {};
  const co = config.colorOverrides || {};
  const ea = config.elementAnimations || DEFAULT_MOTION_CONFIG.elementAnimations || {};

  return (
    <aside className="motion-controls-panel">
      <div className="controls-header">
        <h2>Controles de Visual & Motion</h2>
        <small>Ajuste milimétrico de cada camada visual</small>
      </div>

      <div className="controls-accordion-list">
        {/* SEÇÃO 0: AJUSTE INTERATIVO DE LAYOUTS (1, 2, 3, 4 PRODUTOS) */}
        {isSectionVisible("layoutTuning") && (
        <div className={`accordion-item ${openSections.layoutTuning ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("layoutTuning")}
            style={{ borderLeft: "3px solid var(--accent)" }}
          >
            <div className="accordion-header-title">
              <Sliders size={15} className="accordion-icon" style={{ color: "var(--accent)" }} />
              <span style={{ color: "var(--accent)", fontWeight: 800 }}>
                Ajuste Fino de Layouts ({activeLayout.toUpperCase()})
              </span>
            </div>
            {openSections.layoutTuning ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.layoutTuning && (
            <div className="accordion-body">
              {/* 1. Escolha do Layout de Teste */}
              <div className="control-field">
                <span className="control-label-mini">Layout Selecionado para Teste & Ajuste:</span>
                <div className="segmented-grid-layouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {[
                    { id: "hero", label: "1 Prod (Hero)" },
                    { id: "duo", label: "2 Prods (Duo)" },
                    { id: "trio", label: "3 Prods (Trio)" },
                    { id: "grid4", label: "4 Prods (Grid 4)" },
                    { id: "grid8", label: "8 Prods (Grid 8)" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={`layout-pill-btn ${activeLayout === l.id ? "active" : ""}`}
                      onClick={() => {
                        onChange((prev) => ({ ...prev, layout: l.id as OfferLayout }));
                        onReplay();
                      }}
                    >
                      <strong>{l.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Abas de Elemento */}
              <div className="control-field" style={{ marginTop: "12px" }}>
                <span className="control-label-mini">Elemento a Customizar ({activeLayout.toUpperCase()}):</span>
                <div className="segmented-group" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
                  <button
                    type="button"
                    className={activeLayoutTuningTab === "image" ? "active" : ""}
                    onClick={() => setActiveLayoutTuningTab("image")}
                  >
                    <ImageIcon size={12} /> Foto
                  </button>
                  <button
                    type="button"
                    className={activeLayoutTuningTab === "name" ? "active" : ""}
                    onClick={() => setActiveLayoutTuningTab("name")}
                  >
                    <Type size={12} /> Nome
                  </button>
                  <button
                    type="button"
                    className={activeLayoutTuningTab === "price" ? "active" : ""}
                    onClick={() => setActiveLayoutTuningTab("price")}
                  >
                    <DollarSign size={12} /> Preço
                  </button>
                  <button
                    type="button"
                    className={activeLayoutTuningTab === "oldPrice" ? "active" : ""}
                    onClick={() => setActiveLayoutTuningTab("oldPrice")}
                  >
                    <Tag size={12} /> De: ...
                  </button>
                  <button
                    type="button"
                    className={activeLayoutTuningTab === "columns" ? "active" : ""}
                    onClick={() => setActiveLayoutTuningTab("columns")}
                    style={{ gridColumn: "span 2" }}
                  >
                    <LayoutGrid size={12} /> Espaço & Colunas
                  </button>
                </div>
              </div>

              {/* 3. Controles do Elemento Selecionado */}
              {activeLayoutTuningTab === "image" && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginTop: "8px" }}>
                  <label>
                    Escala da Imagem: <strong>{Math.round(((currentTuning.productImage?.scale ?? 1)) * 100)}%</strong>
                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.05"
                      value={currentTuning.productImage?.scale ?? 1}
                      onChange={(e) =>
                        updateLayoutTuning((prev) => ({
                          ...prev,
                          productImage: {
                            ...(prev.productImage || {}),
                            scale: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    <label>
                      Posição X: <strong>{currentTuning.productImage?.x || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.productImage?.x || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            productImage: {
                              ...(prev.productImage || {}),
                              x: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Posição Y: <strong>{currentTuning.productImage?.y || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.productImage?.y || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            productImage: {
                              ...(prev.productImage || {}),
                              y: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeLayoutTuningTab === "name" && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginTop: "8px" }}>
                  <label>
                    Tamanho do Nome: <strong>{(currentTuning.productName?.fontSizeOffset ?? 0) >= 0 ? "+" : ""}{currentTuning.productName?.fontSizeOffset ?? 0}px</strong>
                    <input
                      type="range"
                      min="-80"
                      max="350"
                      step="1"
                      value={currentTuning.productName?.fontSizeOffset ?? 0}
                      onChange={(e) =>
                        updateLayoutTuning((prev) => ({
                          ...prev,
                          productName: {
                            ...(prev.productName || {}),
                            fontSizeOffset: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    <label>
                      Posição X: <strong>{currentTuning.productName?.x || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.productName?.x || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            productName: {
                              ...(prev.productName || {}),
                              x: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Posição Y: <strong>{currentTuning.productName?.y || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.productName?.y || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            productName: {
                              ...(prev.productName || {}),
                              y: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>

                  {/* Linhas Máximas do Nome */}
                  <div style={{ marginTop: "12px" }}>
                    <span className="control-label-mini">Máximo de Linhas (Evita cortar com "..."):</span>
                    <div className="segmented-group" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginTop: "4px" }}>
                      {[
                        { val: 2, label: "2 Linhas" },
                        { val: 3, label: "3 Linhas" },
                        { val: 4, label: "4 Linhas" },
                        { val: 6, label: "Livre" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          className={(currentTuning.productName?.maxLines ?? 3) === item.val ? "active" : ""}
                          onClick={() =>
                            updateLayoutTuning((prev) => ({
                              ...prev,
                              productName: {
                                ...(prev.productName || {}),
                                maxLines: item.val,
                              },
                            }))
                          }
                          style={{ fontSize: "11px", padding: "4px 2px" }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: "10px", padding: "8px", background: "rgba(255, 255, 255, 0.04)", borderRadius: "6px" }}>
                    <p style={{ margin: "0 0 6px", fontSize: "11px", color: "var(--muted)" }}>
                      💡 <strong>Dica de Enquadramento:</strong> Para textos longos, aumente o espaço da coluna ou o enquadramento do produto.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", fontSize: "11px", padding: "5px 8px" }}
                      onClick={() => setActiveLayoutTuningTab("columns")}
                    >
                      <LayoutGrid size={12} /> Aumentar Largura da Coluna de Texto
                    </button>
                  </div>
                </div>
              )}

              {activeLayoutTuningTab === "price" && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginTop: "8px" }}>
                  <label>
                    Tamanho do Preço: <strong>{(currentTuning.promotionalPrice?.fontSizeOffset ?? 0) >= 0 ? "+" : ""}{currentTuning.promotionalPrice?.fontSizeOffset ?? 0}px</strong>
                    <input
                      type="range"
                      min="-80"
                      max="450"
                      step="1"
                      value={currentTuning.promotionalPrice?.fontSizeOffset ?? 0}
                      onChange={(e) =>
                        updateLayoutTuning((prev) => ({
                          ...prev,
                          promotionalPrice: {
                            ...(prev.promotionalPrice || {}),
                            fontSizeOffset: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    <label>
                      Posição X: <strong>{currentTuning.promotionalPrice?.x || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.promotionalPrice?.x || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            promotionalPrice: {
                              ...(prev.promotionalPrice || {}),
                              x: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Posição Y: <strong>{currentTuning.promotionalPrice?.y || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.promotionalPrice?.y || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            promotionalPrice: {
                              ...(prev.promotionalPrice || {}),
                              y: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeLayoutTuningTab === "oldPrice" && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginTop: "8px" }}>
                  <label>
                    Tamanho Preço Anterior: <strong>{(currentTuning.oldPrice?.fontSizeOffset ?? 0) >= 0 ? "+" : ""}{currentTuning.oldPrice?.fontSizeOffset ?? 0}px</strong>
                    <input
                      type="range"
                      min="-50"
                      max="200"
                      step="1"
                      value={currentTuning.oldPrice?.fontSizeOffset ?? 0}
                      onChange={(e) =>
                        updateLayoutTuning((prev) => ({
                          ...prev,
                          oldPrice: {
                            ...(prev.oldPrice || {}),
                            fontSizeOffset: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    <label>
                      Posição X: <strong>{currentTuning.oldPrice?.x || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.oldPrice?.x || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            oldPrice: {
                              ...(prev.oldPrice || {}),
                              x: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Posição Y: <strong>{currentTuning.oldPrice?.y || 0}px</strong>
                      <input
                        type="range"
                        min="-800"
                        max="800"
                        step="2"
                        value={currentTuning.oldPrice?.y || 0}
                        onChange={(e) =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            oldPrice: {
                              ...(prev.oldPrice || {}),
                              y: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeLayoutTuningTab === "columns" && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", marginTop: "8px" }}>
                  <label>
                    Espaço da Foto vs Textos: <strong>{Math.round((currentTuning.columnRatio ?? 0.56) * 100)}% para foto ({100 - Math.round((currentTuning.columnRatio ?? 0.56) * 100)}% para texto)</strong>
                    <input
                      type="range"
                      min="0.20"
                      max="0.85"
                      step="0.01"
                      value={currentTuning.columnRatio ?? 0.56}
                      onChange={(e) =>
                        updateLayoutTuning((prev) => ({
                          ...prev,
                          columnRatio: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <div className="segmented-group" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", marginTop: "6px" }}>
                    {[
                      { ratio: 0.40, label: "60% Texto / 40% Foto" },
                      { ratio: 0.50, label: "50% Texto / 50% Foto" },
                      { ratio: 0.56, label: "44% Texto (Padrão)" },
                    ].map((p) => (
                      <button
                        key={p.ratio}
                        type="button"
                        className={Math.abs((currentTuning.columnRatio ?? 0.56) - p.ratio) < 0.02 ? "active" : ""}
                        onClick={() =>
                          updateLayoutTuning((prev) => ({
                            ...prev,
                            columnRatio: p.ratio,
                          }))
                        }
                        style={{ fontSize: "10px", padding: "4px 2px" }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <label style={{ marginTop: "8px" }}>
                    Distância entre Produtos (Gap): <strong>{currentTuning.gap ?? 16}px</strong>
                    <input
                      type="range"
                      min="0"
                      max="160"
                      step="2"
                      value={currentTuning.gap ?? 16}
                      onChange={(e) =>
                        updateLayoutTuning((prev) => ({
                          ...prev,
                          gap: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ marginTop: "8px" }}>
                    Espaço Foto vs Preço (Gap Interno): <strong>{currentTuning.itemGap ?? 10}px</strong>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="2"
                      value={currentTuning.itemGap ?? 10}
                      onChange={(e) =>
                        updateLayoutTuning((prev) => ({
                          ...prev,
                          itemGap: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
              )}

              {/* Botões de Ação */}
              <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={copyLayoutConfig}
                >
                  {tuningCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  <span>{tuningCopied ? "CSS & JSON Copiados!" : "Copiar Configuração"}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetCurrentLayoutTuning}
                  title="Restaurar layout original"
                >
                  <RotateCcw size={14} />
                  <span>Resetar</span>
                </button>
              </div>
            </div>
          )}
        </div>
        )}
        {/* SEÇÃO: ELEMENTOS VISÍVEIS */}
        {isSectionVisible("visibility") && (
        <div className={`accordion-item ${openSections.visibility ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("visibility")}
          >
            <div className="accordion-header-title">
              <Eye size={15} className="accordion-icon" />
              <span>Elementos Visíveis na TV</span>
            </div>
            {openSections.visibility ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.visibility && (
            <div className="accordion-body">
              <p className="control-help" style={{ margin: "0 0 10px", fontSize: "11px", color: "var(--muted)" }}>
                Ative ou desative cada elemento individualmente. Elementos desativados são completamente removidos do layout da TV.
              </p>

              <div style={{ display: "grid", gap: "8px" }}>
                <label className="toggle-field">
                  <span>🏷️ Logo da Loja / Setor</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.logo !== false && config.logo?.visible !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange((prev) => ({
                        ...prev,
                        visibility: {
                          ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
                          logo: checked,
                        },
                        logo: {
                          ...prev.logo,
                          visible: checked,
                        },
                      }));
                    }}
                  />
                </label>

                <label className="toggle-field">
                  <span>💬 Slogan / Frase Inferior</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.slogan !== false && config.subtitle?.visible !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange((prev) => ({
                        ...prev,
                        visibility: {
                          ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
                          slogan: checked,
                        },
                        subtitle: {
                          ...(prev.subtitle || DEFAULT_MOTION_CONFIG.subtitle || { text: "Qualidade para o seu dia.", fontSize: 22, visible: true }),
                          visible: checked,
                        },
                      }));
                    }}
                  />
                </label>

                <label className="toggle-field">
                  <span>🖌️ Molduras Pretas nos 4 Cantos (Pinceladas)</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.brushCorners !== false && config.fx?.brushCorners?.enabled !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange((prev) => ({
                        ...prev,
                        visibility: {
                          ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
                          brushCorners: checked,
                        },
                        fx: {
                          ...(prev.fx || DEFAULT_MOTION_CONFIG.fx),
                          brushCorners: {
                            ...(prev.fx?.brushCorners || { enabled: true, opacity: 100, scale: 1 }),
                            enabled: checked,
                          },
                        },
                      }));
                    }}
                  />
                </label>

                <label className="toggle-field">
                  <span>🖼️ Moldura da TV (Bordas & Sombras Externas)</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.frame !== false}
                    onChange={(e) => updateVisibility({ frame: e.target.checked })}
                  />
                </label>

                <label className="toggle-field">
                  <span>🎨 Decorações do Tema (Selos & Pinceladas)</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.decorations !== false}
                    onChange={(e) => updateVisibility({ decorations: e.target.checked })}
                  />
                </label>

                <label className="toggle-field">
                  <span>✨ Faíscas de Fogo / Queima de Estoque</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.fireSparks !== false && (config.fx?.fireSparks?.enabled || config.fireSparks?.enabled) !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange((prev) => ({
                        ...prev,
                        visibility: {
                          ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
                          fireSparks: checked,
                        },
                        fireSparks: {
                          ...(prev.fireSparks || prev.fx?.fireSparks || DEFAULT_FIRE_SPARKS_CONFIG),
                          enabled: checked,
                        },
                        fx: {
                          ...(prev.fx || DEFAULT_MOTION_CONFIG.fx),
                          fireSparks: {
                            ...(prev.fx?.fireSparks || prev.fireSparks || DEFAULT_FIRE_SPARKS_CONFIG),
                            enabled: checked,
                          },
                        },
                      }));
                    }}
                  />
                </label>

                <label className="toggle-field">
                  <span>🔥 Imagem / Logo Black Friday</span>
                  <input
                    type="checkbox"
                    checked={isBlackFridayImageVisible(config)}
                    onChange={(e) => {
                      onChange((prev) => setBlackFridayImageVisibility(prev, e.target.checked));
                    }}
                  />
                </label>

                <label className="toggle-field">
                  <span>🏅 Selo da Oferta / Tag</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.badge !== false && config.badge?.visible !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange((prev) => ({
                        ...prev,
                        visibility: {
                          ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
                          badge: checked,
                        },
                        badge: {
                          ...prev.badge,
                          visible: checked,
                        },
                      }));
                    }}
                  />
                </label>

                <label className="toggle-field">
                  <span>💰 Preço Anterior ("De: R$ ...")</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.oldPrice !== false}
                    onChange={(e) => updateVisibility({ oldPrice: e.target.checked })}
                  />
                </label>

                <label className="toggle-field">
                  <span>📏 Unidade de Medida ("/kg", "/un")</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.unit !== false}
                    onChange={(e) => updateVisibility({ unit: e.target.checked })}
                  />
                </label>

                <label className="toggle-field">
                  <span>📝 Nome do Produto</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.productName !== false}
                    onChange={(e) => updateVisibility({ productName: e.target.checked })}
                  />
                </label>

                <label className="toggle-field">
                  <span>💲 Preço Promocional</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.productPrice !== false}
                    onChange={(e) => updateVisibility({ productPrice: e.target.checked })}
                  />
                </label>

                <label className="toggle-field">
                  <span>📸 Imagem do Produto</span>
                  <input
                    type="checkbox"
                    checked={config.visibility?.productImage !== false}
                    onChange={(e) => updateVisibility({ productImage: e.target.checked })}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
        )}

        {/* A. SEÇÃO: CORES DO CARTAZ (PERSONALIZAÇÃO INDIVIDUAL & PRESETS) */}
        {isSectionVisible("cartazColors") && (
        <div className={`accordion-item ${openSections.cartazColors ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("cartazColors")}
          >
            <div className="accordion-header-title">
              <Palette size={15} className="accordion-icon" />
              <span>Cores & Tipografia do Cartaz</span>
            </div>
            {openSections.cartazColors ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.cartazColors && (
            <div className="accordion-body">
              <div className="control-field">
                <span className="control-label-mini">Presets Rápidos de Paleta:</span>
                <div className="segmented-grid-layouts" style={{ gridTemplateColumns: "1fr" }}>
                  <button
                    type="button"
                    className={`layout-pill-btn ${co.background === "#000000" && co.productName === "#ffffff" ? "active" : ""}`}
                    onClick={() => {
                      updateColorOverrides({
                        enabled: true,
                        background: "#000000",
                        productName: "#ffffff",
                        price: "#F2381E",
                        priceCents: "#F2381E",
                        currency: "#ffffff",
                        unit: "#ffffff",
                        oldPrice: "#888888",
                        strikeColor: "#F2381E",
                        capsuleBg: "#F2381E",
                        capsuleText: "#ffffff",
                        sectorText: "#ffffff",
                        badgeBg: "#F2381E",
                        badgeText: "#ffffff",
                        priceShadow: "none",
                      });
                      updateBackground({ type: "solid", color: "#000000" });
                    }}
                  >
                    <strong>🖤 Black Friday Preto Sólido (100% Puro)</strong>
                    <small>Fundo #000000 puro sem textura ou manchas · Texto Branco · Preço Vermelho</small>
                  </button>

                  <button
                    type="button"
                    className={`layout-pill-btn ${!co.enabled || (co.background === "#F7F6F2" && co.productName === "#111111") ? "active" : ""}`}
                    onClick={() => {
                      updateColorOverrides({
                        enabled: true,
                        background: "#F7F6F2",
                        productName: "#111111",
                        price: "#F2381E",
                        priceCents: "#F2381E",
                        currency: "#111111",
                        unit: "#111111",
                        oldPrice: "#444444",
                        strikeColor: "#F2381E",
                        capsuleBg: "#F2381E",
                        capsuleText: "#ffffff",
                        sectorText: "#111111",
                        badgeBg: "#111111",
                        badgeText: "#ffffff",
                        priceShadow: "none",
                      });
                      updateBackground({ type: "solid", color: "#F7F6F2" });
                    }}
                  >
                    <strong>Cartaz Original (Padrão Aprovado)</strong>
                    <small>Fundo claro (#F7F6F2) · Texto Preto (#111111) · Preço Vermelho (#F2381E)</small>
                  </button>

                  <button
                    type="button"
                    className={`layout-pill-btn ${co.background === "#FFFFFF" && co.price === "#000000" ? "active" : ""}`}
                    onClick={() => {
                      updateColorOverrides({
                        enabled: true,
                        background: "#FFFFFF",
                        productName: "#000000",
                        price: "#000000",
                        priceCents: "#000000",
                        currency: "#000000",
                        unit: "#000000",
                        oldPrice: "#666666",
                        strikeColor: "#000000",
                        capsuleBg: "#000000",
                        capsuleText: "#ffffff",
                        sectorText: "#000000",
                        badgeBg: "#000000",
                        badgeText: "#ffffff",
                        priceShadow: "none",
                      });
                      updateBackground({ type: "solid", color: "#FFFFFF" });
                    }}
                  >
                    <strong>Black & White Puro</strong>
                    <small>Fundo Branco Puro · Contrastes em Preto Total</small>
                  </button>

                  <button
                    type="button"
                    className={`layout-pill-btn ${co.price === "#E60000" && co.capsuleBg === "#E60000" ? "active" : ""}`}
                    onClick={() => {
                      updateColorOverrides({
                        enabled: true,
                        background: "#FFF5F5",
                        productName: "#111111",
                        price: "#E60000",
                        priceCents: "#E60000",
                        currency: "#E60000",
                        unit: "#111111",
                        oldPrice: "#555555",
                        strikeColor: "#E60000",
                        capsuleBg: "#E60000",
                        capsuleText: "#ffffff",
                        sectorText: "#E60000",
                        badgeBg: "#E60000",
                        badgeText: "#ffffff",
                        priceShadow: "none",
                      });
                      updateBackground({ type: "solid", color: "#FFF5F5" });
                    }}
                  >
                    <strong>Red Impact</strong>
                    <small>Realce em Vermelho Intenso para todas as chamadas</small>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: "10px", marginBottom: "14px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "8px" }}
                  onClick={restoreThemeColors}
                >
                  <RotateCcw size={14} />
                  <span>Restaurar Cores Originais do Tema</span>
                </button>
              </div>

              {/* Color Pickers Individuais */}
              <div className="control-field">
                <span className="control-label-mini">Fundo da TV:</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.background || "#F7F6F2"}
                    onChange={(e) => {
                      updateColorOverrides({ background: e.target.value });
                      updateBackground({ type: "solid", color: e.target.value });
                    }}
                  />
                  <span className="color-hex-text">{co.background || "#F7F6F2"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Nome do Produto:</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.productName || "#111111"}
                    onChange={(e) => updateColorOverrides({ productName: e.target.value })}
                  />
                  <span className="color-hex-text">{co.productName || "#111111"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Preço Inteiro:</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.price || "#F2381E"}
                    onChange={(e) => updateColorOverrides({ price: e.target.value })}
                  />
                  <span className="color-hex-text">{co.price || "#F2381E"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Centavos (,00):</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.priceCents || co.price || "#F2381E"}
                    onChange={(e) => updateColorOverrides({ priceCents: e.target.value })}
                  />
                  <span className="color-hex-text">{co.priceCents || co.price || "#F2381E"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Cifrão (R$):</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.currency || "#111111"}
                    onChange={(e) => updateColorOverrides({ currency: e.target.value })}
                  />
                  <span className="color-hex-text">{co.currency || "#111111"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Unidade de Medida (/kg, /un):</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.unit || "#111111"}
                    onChange={(e) => updateColorOverrides({ unit: e.target.value })}
                  />
                  <span className="color-hex-text">{co.unit || "#111111"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Preço Anterior ("De:"):</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.oldPrice || "#444444"}
                    onChange={(e) => updateColorOverrides({ oldPrice: e.target.value })}
                  />
                  <span className="color-hex-text">{co.oldPrice || "#444444"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Traço Cortando o Preço Anterior:</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.strikeColor || "#F2381E"}
                    onChange={(e) => updateColorOverrides({ strikeColor: e.target.value })}
                  />
                  <span className="color-hex-text">{co.strikeColor || "#F2381E"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Efeito de Sombra / Halo do Preço:</span>
                <select
                  className="control-select"
                  value={co.priceShadow || "none"}
                  onChange={(e) => updateColorOverrides({ priceShadow: e.target.value })}
                >
                  <option value="none">Sem sombra (100% Plano / Fundo Limpo)</option>
                  <option value="0 0 45px rgba(242, 201, 76, 0.35)">Halo Dourado / Amarelo</option>
                  <option value="0 2px 14px rgba(0, 0, 0, 0.9)">Sombra Preta de Contraste</option>
                  <option value="0 0 35px rgba(242, 56, 30, 0.4)">Glow Vermelho Impact</option>
                </select>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Cápsula "Oferta Especial" (Fundo):</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.capsuleBg || "#F2381E"}
                    onChange={(e) => updateColorOverrides({ capsuleBg: e.target.value })}
                  />
                  <span className="color-hex-text">{co.capsuleBg || "#F2381E"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Setor no Topo:</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.sectorText || config.logo.sectorTextColor || "#111111"}
                    onChange={(e) => updateColorOverrides({ sectorText: e.target.value })}
                  />
                  <span className="color-hex-text">{co.sectorText || config.logo.sectorTextColor || "#111111"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* SEÇÃO: FAÍSCAS DE FOGO / QUEIMA DE ESTOQUE */}
        {isSectionVisible("fireSparks") && (
        <div className={`accordion-item ${openSections.fireSparks ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("fireSparks")}
          >
            <div className="accordion-header-title">
              <Flame size={15} className="accordion-icon" style={{ color: "#ff5a00" }} />
              <span>🔥 Faíscas de Queima de Estoque</span>
            </div>
            {openSections.fireSparks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.fireSparks && (
            <div className="accordion-body">
              <p className="control-help" style={{ margin: "0 0 10px", fontSize: "11px", color: "var(--muted)" }}>
                Efeito cinematográfico de brasas e faíscas subindo na tela. Otimizado para aceleração por GPU em Smart TVs.
              </p>

              {/* 1. Toggle Principal */}
              <label className="toggle-field" style={{ marginBottom: "12px" }}>
                <span>🔥 Ativar Faíscas de Fogo na TV</span>
                <input
                  type="checkbox"
                  checked={Boolean(config.fx?.fireSparks?.enabled || config.fireSparks?.enabled)}
                  onChange={(e) => updateFireSparks({ enabled: e.target.checked })}
                />
              </label>

              {(config.fx?.fireSparks?.enabled || config.fireSparks?.enabled) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* 2. Presets Rápidos */}
                  <div className="control-field">
                    <span className="control-label-mini">Presets de Intensidade:</span>
                    <div className="segmented-group" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
                      {[
                        { id: "subtle", label: "Sutil", desc: "16 brasas leves" },
                        { id: "commercial", label: "Comercial", desc: "26 faíscas balanceadas" },
                        { id: "fire-sale", label: "Queima Total", desc: "38 faíscas + glow" },
                      ].map((p) => {
                        const currentIntensity =
                          config.fx?.fireSparks?.intensity ||
                          config.fireSparks?.intensity ||
                          "commercial";
                        const isActive = currentIntensity === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={isActive ? "active" : ""}
                            onClick={() => {
                              if (p.id === "subtle") {
                                updateFireSparks({
                                  intensity: "subtle",
                                  particleCount: 16,
                                  speed: 0.85,
                                  size: 0.8,
                                  bottomGlow: true,
                                  bottomGlowOpacity: 16,
                                  maxHeight: 90,
                                });
                              } else if (p.id === "commercial") {
                                updateFireSparks({
                                  intensity: "commercial",
                                  particleCount: 26,
                                  speed: 1.0,
                                  size: 1.0,
                                  bottomGlow: true,
                                  bottomGlowOpacity: 25,
                                  maxHeight: 105,
                                });
                              } else {
                                updateFireSparks({
                                  intensity: "fire-sale",
                                  particleCount: 38,
                                  speed: 1.25,
                                  size: 1.2,
                                  bottomGlow: true,
                                  bottomGlowOpacity: 45,
                                  maxHeight: 110,
                                });
                              }
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Sliders de Ajuste Fino */}
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <label style={{ fontSize: "11px" }}>
                      Quantidade de Partículas: <strong>{config.fx?.fireSparks?.particleCount ?? config.fireSparks?.particleCount ?? 26} faíscas</strong>
                      <input
                        type="range"
                        min="8"
                        max="50"
                        step="2"
                        value={config.fx?.fireSparks?.particleCount ?? config.fireSparks?.particleCount ?? 26}
                        onChange={(e) =>
                          updateFireSparks({
                            particleCount: Number(e.target.value),
                            intensity: "custom",
                          })
                        }
                      />
                    </label>

                    <label style={{ fontSize: "11px", marginTop: "8px" }}>
                      Velocidade de Subida: <strong>{((config.fx?.fireSparks?.speed ?? config.fireSparks?.speed ?? 1)).toFixed(2)}x</strong>
                      <input
                        type="range"
                        min="0.4"
                        max="2.5"
                        step="0.05"
                        value={config.fx?.fireSparks?.speed ?? config.fireSparks?.speed ?? 1}
                        onChange={(e) =>
                          updateFireSparks({
                            speed: Number(e.target.value),
                            intensity: "custom",
                          })
                        }
                      />
                    </label>

                    <label style={{ fontSize: "11px", marginTop: "8px" }}>
                      Tamanho das Faíscas: <strong>{Math.round(((config.fx?.fireSparks?.size ?? config.fireSparks?.size ?? 1)) * 100)}%</strong>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={config.fx?.fireSparks?.size ?? config.fireSparks?.size ?? 1}
                        onChange={(e) =>
                          updateFireSparks({
                            size: Number(e.target.value),
                            intensity: "custom",
                          })
                        }
                      />
                    </label>

                    <label style={{ fontSize: "11px", marginTop: "8px" }}>
                      Altura Máxima de Subida: <strong>{config.fx?.fireSparks?.maxHeight ?? config.fireSparks?.maxHeight ?? 105}%</strong>
                      <input
                        type="range"
                        min="40"
                        max="120"
                        step="5"
                        value={config.fx?.fireSparks?.maxHeight ?? config.fireSparks?.maxHeight ?? 105}
                        onChange={(e) =>
                          updateFireSparks({
                            maxHeight: Number(e.target.value),
                            intensity: "custom",
                          })
                        }
                      />
                    </label>
                  </div>

                  {/* 4. Brilho Inferior (Calor da Base) */}
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <label className="toggle-field" style={{ margin: 0 }}>
                      <span>Brilho de Calor na Base da TV</span>
                      <input
                        type="checkbox"
                        checked={Boolean(config.fx?.fireSparks?.bottomGlow ?? config.fireSparks?.bottomGlow ?? true)}
                        onChange={(e) =>
                          updateFireSparks({
                            bottomGlow: e.target.checked,
                          })
                        }
                      />
                    </label>

                    {(config.fx?.fireSparks?.bottomGlow ?? config.fireSparks?.bottomGlow ?? true) && (
                      <label style={{ fontSize: "11px", marginTop: "8px" }}>
                        Intensidade do Brilho Inferior: <strong>{config.fx?.fireSparks?.bottomGlowOpacity ?? config.fireSparks?.bottomGlowOpacity ?? 25}%</strong>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={config.fx?.fireSparks?.bottomGlowOpacity ?? config.fireSparks?.bottomGlowOpacity ?? 25}
                          onChange={(e) =>
                            updateFireSparks({
                              bottomGlowOpacity: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    )}
                  </div>

                  {/* 5. Modo de Desempenho */}
                  <div className="control-field">
                    <span className="control-label-mini">Modo de Desempenho do Dispositivo:</span>
                    <div className="segmented-group">
                      <button
                        type="button"
                        className={
                          (config.fx?.fireSparks?.performance || config.fireSparks?.performance || "normal") === "normal"
                            ? "active"
                            : ""
                        }
                        onClick={() => updateFireSparks({ performance: "normal" })}
                      >
                        ⚡ Normal (GPU Completa)
                      </button>
                      <button
                        type="button"
                        className={
                          (config.fx?.fireSparks?.performance || config.fireSparks?.performance) === "low"
                            ? "active"
                            : ""
                        }
                        onClick={() => updateFireSparks({ performance: "low" })}
                        title="Reduz partículas e sombras para TVs mais antigas ou TV Box"
                      >
                        🍃 Econômico (TV Box / Antiga)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* B. SEÇÃO: BLACK FRIDAY FX (DECORAÇÕES OPCIONAIS) */}
        {isSectionVisible("blackFridayFx") && (
        <div className={`accordion-item ${openSections.blackFridayFx ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("blackFridayFx")}
          >
            <div className="accordion-header-title">
              <Flame size={15} className="accordion-icon" />
              <span>Black Friday FX (Decorações)</span>
            </div>
            {openSections.blackFridayFx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.blackFridayFx && (
            <div className="accordion-body">
              {/* 0. Molduras de Pinceladas Pretas nos Cantos */}
              <label className="toggle-field">
                <span>🖌️ Molduras Pretas nos 4 Cantos da TV</span>
                <input
                  type="checkbox"
                  checked={config.fx?.brushCorners?.enabled !== false && config.visibility?.brushCorners !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChange((prev) => ({
                      ...prev,
                      visibility: {
                        ...(prev.visibility || DEFAULT_MOTION_CONFIG.visibility),
                        brushCorners: checked,
                      },
                      fx: {
                        ...(prev.fx || DEFAULT_MOTION_CONFIG.fx),
                        brushCorners: {
                          ...(prev.fx?.brushCorners || { opacity: 100, scale: 1 }),
                          enabled: checked,
                        },
                      },
                    }));
                    onReplay();
                  }}
                />
              </label>

              {config.fx?.brushCorners?.enabled !== false && config.visibility?.brushCorners !== false && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
                  <label>
                    Tamanho / Escala das Molduras: <strong>{Math.round((config.fx?.brushCorners?.scale ?? 1) * 100)}%</strong>
                    <input
                      type="range"
                      min="0.2"
                      max="3.5"
                      step="0.05"
                      value={config.fx?.brushCorners?.scale ?? 1}
                      onChange={(e) =>
                        updateFx({
                          brushCorners: {
                            ...(config.fx?.brushCorners || { enabled: true, opacity: 100 }),
                            scale: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>

                  <label style={{ marginTop: "8px" }}>
                    Opacidade: <strong>{config.fx?.brushCorners?.opacity ?? 100}%</strong>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={config.fx?.brushCorners?.opacity ?? 100}
                      onChange={(e) =>
                        updateFx({
                          brushCorners: {
                            ...(config.fx?.brushCorners || { enabled: true, scale: 1 }),
                            opacity: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
              )}

              {/* 1. Balões Flutuantes Pretos */}
              <label className="toggle-field" style={{ marginTop: "12px" }}>
                <span>🎈 Balões Flutuantes Pretos (Sway Lateral)</span>
                <input
                  type="checkbox"
                  checked={Boolean(fx.balloons?.enabled)}
                  onChange={(e) =>
                    updateFx({
                      balloons: {
                        enabled: e.target.checked,
                        count: fx.balloons?.count || 2,
                        speed: fx.balloons?.speed || "normal",
                        opacity: fx.balloons?.opacity ?? 85,
                      },
                    })
                  }
                />
              </label>

              {fx.balloons?.enabled && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
                  <label>
                    Quantidade de Balões: <strong>{fx.balloons.count || 2}</strong>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="1"
                      value={fx.balloons.count || 2}
                      onChange={(e) =>
                        updateFx({
                          balloons: { ...fx.balloons!, count: Number(e.target.value) },
                        })
                      }
                    />
                  </label>

                  <label>
                    Velocidade de Subida
                    <div className="segmented-group">
                      {(["slow", "normal", "fast"] as BalloonSpeed[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={fx.balloons?.speed === s ? "active" : ""}
                          onClick={() =>
                            updateFx({ balloons: { ...fx.balloons!, speed: s } })
                          }
                        >
                          {s === "slow" ? "Suave" : s === "normal" ? "Normal" : "Rápida"}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label>
                    Opacidade: <strong>{fx.balloons.opacity ?? 85}%</strong>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={fx.balloons.opacity ?? 85}
                      onChange={(e) =>
                        updateFx({
                          balloons: { ...fx.balloons!, opacity: Number(e.target.value) },
                        })
                      }
                    />
                  </label>
                </div>
              )}

              {/* 2. Carimbo Black Friday */}
              <label className="toggle-field" style={{ marginTop: "12px" }}>
                <span>🎯 Carimbo de Impacto ("OFERTA REAL")</span>
                <input
                  type="checkbox"
                  checked={Boolean(fx.stamp?.enabled)}
                  onChange={(e) =>
                    updateFx({
                      stamp: {
                        enabled: e.target.checked,
                        text: fx.stamp?.text || "OFERTA REAL",
                        position: fx.stamp?.position || "bottom-right",
                      },
                    })
                  }
                />
              </label>

              {fx.stamp?.enabled && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
                  <label>
                    Texto do Carimbo
                    <input
                      type="text"
                      value={fx.stamp.text || "OFERTA REAL"}
                      onChange={(e) =>
                        updateFx({ stamp: { ...fx.stamp!, text: e.target.value } })
                      }
                    />
                  </label>

                  <label>
                    Posição do Carimbo
                    <div className="segmented-group">
                      {[
                        { id: "bottom-right", label: "Canto Inferior" },
                        { id: "top-right", label: "Canto Superior" },
                        { id: "badge", label: "Ao Lado do Selo" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          className={fx.stamp?.position === pos.id ? "active" : ""}
                          onClick={() =>
                            updateFx({ stamp: { ...fx.stamp!, position: pos.id as StampPosition } })
                          }
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              )}

              {/* 3. Confete Controlado */}
              <label className="toggle-field" style={{ marginTop: "12px" }}>
                <span>🎉 Confete Festivo Controlado (Preto & Vermelho)</span>
                <input
                  type="checkbox"
                  checked={Boolean(fx.confetti?.enabled)}
                  onChange={(e) =>
                    updateFx({
                      confetti: {
                        enabled: e.target.checked,
                        count: fx.confetti?.count || 18,
                        speed: fx.confetti?.speed || "normal",
                      },
                    })
                  }
                />
              </label>

              {fx.confetti?.enabled && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
                  <label>
                    Quantidade de Partículas: <strong>{fx.confetti.count || 18}</strong>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      step="2"
                      value={fx.confetti.count || 18}
                      onChange={(e) =>
                        updateFx({
                          confetti: { ...fx.confetti!, count: Number(e.target.value) },
                        })
                      }
                    />
                  </label>
                </div>
              )}

              {/* 4. Fitas Diagonais nos Cantos */}
              <label className="toggle-field" style={{ marginTop: "12px" }}>
                <span>🎗️ Fita Diagonal nos Cantos ("BLACK FRIDAY")</span>
                <input
                  type="checkbox"
                  checked={Boolean(fx.cornerTapes?.enabled)}
                  onChange={(e) =>
                    updateFx({
                      cornerTapes: {
                        enabled: e.target.checked,
                        text: fx.cornerTapes?.text || "BLACK FRIDAY",
                        position: fx.cornerTapes?.position || "top-left",
                      },
                    })
                  }
                />
              </label>

              {fx.cornerTapes?.enabled && (
                <div className="control-field" style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
                  <label>
                    Posição da Fita
                    <div className="segmented-group">
                      {[
                        { id: "top-left", label: "Canto Esquerdo" },
                        { id: "top-right", label: "Canto Direito" },
                        { id: "both", label: "Ambos os Cantos" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          className={fx.cornerTapes?.position === pos.id ? "active" : ""}
                          onClick={() =>
                            updateFx({
                              cornerTapes: {
                                ...fx.cornerTapes!,
                                position: pos.id as CornerTapePosition,
                              },
                            })
                          }
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              )}

              {/* 5. Pinceladas Decorativas */}
              <label className="toggle-field" style={{ marginTop: "12px" }}>
                <span>🖌️ Pinceladas Decorativas Orgânicas</span>
                <input
                  type="checkbox"
                  checked={Boolean(fx.paintStrokes?.enabled)}
                  onChange={(e) =>
                    updateFx({
                      paintStrokes: {
                        enabled: e.target.checked,
                        variant: fx.paintStrokes?.variant || "corners",
                      },
                    })
                  }
                />
              </label>

              {/* 6. Etiqueta / Price Tag Suspensa */}
              <label className="toggle-field" style={{ marginTop: "12px" }}>
                <span>🏷️ Etiqueta Suspensa Balançando (Price Tag)</span>
                <input
                  type="checkbox"
                  checked={Boolean(fx.priceTag?.enabled)}
                  onChange={(e) =>
                    updateFx({
                      priceTag: {
                        enabled: e.target.checked,
                        position: fx.priceTag?.position || "top-right",
                      },
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>
        )}

        {/* SEÇÃO: IMAGEM / LOGO BLACK FRIDAY (CAMADA EDITÁVEL) */}
        {isSectionVisible("blackFridayImage") && (
        <div className={`accordion-item ${openSections.blackFridayImage ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("blackFridayImage")}
            style={{ borderLeft: "3px solid #ff3366" }}
          >
            <div className="accordion-header-title">
              <Sparkles size={15} className="accordion-icon" style={{ color: "#ff3366" }} />
              <span style={{ color: "#ff3366", fontWeight: 800 }}>
                🔥 Imagem Black Friday
              </span>
            </div>
            {openSections.blackFridayImage ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.blackFridayImage && (
            <div className="accordion-body">
              {/* Abas: Conteúdo, Estilo, Animação */}
              <div
                className="segmented-group"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "4px",
                  marginBottom: "14px",
                }}
              >
                <button
                  type="button"
                  className={activeBfImageTab === "content" ? "active" : ""}
                  onClick={() => setActiveBfImageTab("content")}
                >
                  <ImageIcon size={12} /> Conteúdo
                </button>
                <button
                  type="button"
                  className={activeBfImageTab === "style" ? "active" : ""}
                  onClick={() => setActiveBfImageTab("style")}
                >
                  <Sliders size={12} /> Estilo
                </button>
                <button
                  type="button"
                  className={activeBfImageTab === "animation" ? "active" : ""}
                  onClick={() => setActiveBfImageTab("animation")}
                >
                  <Play size={12} /> Animação
                </button>
              </div>

              {/* ABA 1: CONTEÚDO */}
              {activeBfImageTab === "content" && (
                <div>
                  <label className="toggle-field" style={{ marginBottom: "12px" }}>
                    <span>👁️ Exibir Imagem / Selo Black Friday</span>
                    <input
                      type="checkbox"
                      checked={isBlackFridayImageVisible(config)}
                      onChange={(e) => updateBlackFridayImage({ visible: e.target.checked })}
                    />
                  </label>

                  {/* Preview da Imagem Atual */}
                  <div
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      padding: "12px",
                      textAlign: "center",
                      marginBottom: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "100px",
                    }}
                  >
                    {config.blackFridayImage?.src ? (
                      <img
                        src={config.blackFridayImage.src}
                        alt="Imagem Black Friday Customizada"
                        style={{
                          maxHeight: "80px",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div className="bf-stamp-cartaz-badge" style={{ transform: "scale(0.85)" }}>
                        <span className="bf-badge-word-black">BLACK</span>
                        <span className="bf-badge-word-friday">FRIDAY</span>
                      </div>
                    )}
                    <small style={{ marginTop: "6px", color: "var(--muted)", fontSize: "11px" }}>
                      {config.blackFridayImage?.src
                        ? "Imagem personalizada ativa"
                        : "Selo tipográfico padrão ativo"}
                    </small>
                  </div>

                  {/* Upload de Nova Imagem */}
                  <input
                    type="file"
                    ref={bfImageFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    style={{ display: "none" }}
                    onChange={handleBfImageUpload}
                  />

                  <div style={{ display: "grid", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={isUploadingBfImage}
                      onClick={() => bfImageFileInputRef.current?.click()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Upload size={14} />
                      <span>
                        {isUploadingBfImage
                          ? "Enviando para o Supabase..."
                          : config.blackFridayImage?.src
                            ? "Substituir Imagem / Logo"
                            : "Escolher Imagem / Logo"}
                      </span>
                    </button>

                    {/* Status de Upload / Erro */}
                    {isUploadingBfImage && (
                      <div style={{ fontSize: "11px", color: "var(--accent, #f2c94c)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>⏳ Enviando imagem para o Supabase Storage...</span>
                      </div>
                    )}

                    {bfUploadSuccess && (
                      <div style={{ fontSize: "11px", color: "#4ade80", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>✓ {bfUploadSuccess}</span>
                      </div>
                    )}

                    {bfUploadError && (
                      <div style={{ fontSize: "11px", color: "#f87171", background: "rgba(239,68,68,0.1)", padding: "6px 8px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)" }}>
                        ⚠️ {bfUploadError}
                      </div>
                    )}

                    {/* Input manual de URL da Imagem */}
                    <div className="control-field" style={{ marginTop: "4px" }}>
                      <label style={{ fontSize: "11px" }}>
                        Ou URL pública da Imagem (HTTPS):
                        <input
                          type="text"
                          placeholder="https://.../sua-imagem.png"
                          value={config.blackFridayImage?.src || ""}
                          onChange={(e) =>
                            updateBlackFridayImage({
                              src: e.target.value,
                              originalSrc: e.target.value,
                              visible: true,
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontSize: "11px",
                            borderRadius: "4px",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "#ffffff",
                            marginTop: "4px",
                          }}
                        />
                      </label>
                    </div>

                    {/* Ferramenta de Remoção de Fundo */}
                    {config.blackFridayImage?.src && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px dashed rgba(255,255,255,0.15)",
                          borderRadius: "8px",
                          padding: "10px",
                          marginTop: "6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                          <Wand2 size={14} style={{ color: "#ff3366" }} />
                          <strong style={{ fontSize: "12px", color: "#ffffff" }}>
                            Removedor de Fundo Branco
                          </strong>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: "11px", color: "var(--muted)" }}>
                          Remove automaticamente o fundo branco ou claro da imagem enviada diretamente no navegador.
                        </p>

                        <div className="control-field">
                          <label style={{ fontSize: "11px" }}>
                            Tolerância do Branco: <strong>{bgRemovalTolerance}</strong>
                            <input
                              type="range"
                              min="5"
                              max="100"
                              step="1"
                              value={bgRemovalTolerance}
                              onChange={(e) => setBgRemovalTolerance(Number(e.target.value))}
                            />
                          </label>
                        </div>

                        {bgRemovalError && (
                          <div style={{ color: "#ff5c5c", fontSize: "11px", marginBottom: "8px" }}>
                            ⚠️ {bgRemovalError}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1, fontSize: "12px", padding: "6px 8px" }}
                            disabled={isRemovingBg}
                            onClick={handleRemoveBg}
                          >
                            <Wand2 size={12} />
                            <span>{isRemovingBg ? "Processando..." : "Remover Fundo"}</span>
                          </button>

                          {config.blackFridayImage?.originalSrc && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: "12px", padding: "6px 8px" }}
                              onClick={handleRestoreOriginal}
                              title="Restaurar a foto original antes do recorte"
                            >
                              <RotateCcw size={12} />
                              <span>Original</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {config.blackFridayImage?.src && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleResetToDefaultBadge}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          marginTop: "4px",
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Reverter para Selo Padrão Black Friday</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 2: ESTILO & POSICIONAMENTO */}
              {activeBfImageTab === "style" && (
                <div>
                  {/* Presets de Posição 3x3 */}
                  <div className="control-field">
                    <span className="control-label-mini">Presets de Posição Rápida (Grade Rápida):</span>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "4px",
                        marginBottom: "12px",
                      }}
                    >
                      {[
                        { label: "↖ Topo Esq", x: 4, y: 4 },
                        { label: "↑ Topo Centro", x: 41, y: 4 },
                        { label: "↗ Topo Dir", x: 82, y: 6 },
                        { label: "↗ Topo Fora (Y: -15%)", x: 82, y: -15 },
                        { label: "↑ Topo Fora (Y: -15%)", x: 41, y: -15 },
                        { label: "• Centro", x: 41, y: 45 },
                        { label: "← Centro Esq", x: 4, y: 45 },
                        { label: "→ Centro Dir", x: 82, y: 45 },
                        { label: "↙ Base Esq", x: 4, y: 82 },
                        { label: "↓ Base Centro", x: 41, y: 82 },
                        { label: "↘ Base Dir", x: 82, y: 82 },
                      ].map((pos) => {
                        const isCur =
                          Math.round(config.blackFridayImage?.x ?? 82) === pos.x &&
                          Math.round(config.blackFridayImage?.y ?? 6) === pos.y;
                        return (
                          <button
                            key={pos.label}
                            type="button"
                            className={`layout-pill-btn ${isCur ? "active" : ""}`}
                            style={{ padding: "6px 2px", fontSize: "11px", textAlign: "center" }}
                            onClick={() => updateBlackFridayImage({ x: pos.x, y: pos.y })}
                          >
                            {pos.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coordenadas X e Y Normalizadas (Permite Valores Negativos como -15%) */}
                  <div className="control-field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "11px", margin: 0 }}>Posição X (Horizontal %):</label>
                      <input
                        type="number"
                        min="-100"
                        max="200"
                        step="1"
                        value={Math.round(config.blackFridayImage?.x ?? 82)}
                        onChange={(e) => updateBlackFridayImage({ x: Number(e.target.value) })}
                        style={{
                          width: "56px",
                          padding: "2px 4px",
                          fontSize: "11px",
                          borderRadius: "4px",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#ffffff",
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
                      onChange={(e) => updateBlackFridayImage({ x: Number(e.target.value) })}
                    />
                  </div>

                  <div className="control-field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "11px", margin: 0 }}>Posição Y (Vertical %):</label>
                      <input
                        type="number"
                        min="-100"
                        max="200"
                        step="1"
                        value={Math.round(config.blackFridayImage?.y ?? 6)}
                        onChange={(e) => updateBlackFridayImage({ y: Number(e.target.value) })}
                        style={{
                          width: "56px",
                          padding: "2px 4px",
                          fontSize: "11px",
                          borderRadius: "4px",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#ffffff",
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
                      onChange={(e) => updateBlackFridayImage({ y: Number(e.target.value) })}
                    />
                  </div>

                  {/* Largura (%) e Escala */}
                  <div className="control-field">
                    <label style={{ fontSize: "11px" }}>
                      Largura da Imagem na Tela: <strong>{config.blackFridayImage?.width ?? 18}%</strong>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        step="1"
                        value={config.blackFridayImage?.width ?? 18}
                        onChange={(e) => updateBlackFridayImage({ width: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="control-field">
                    <label style={{ fontSize: "11px" }}>
                      Escala / Zoom: <strong>{Math.round((config.blackFridayImage?.scale ?? 1) * 100)}% ({config.blackFridayImage?.scale ?? 1}x)</strong>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.05"
                        value={config.blackFridayImage?.scale ?? 1}
                        onChange={(e) => updateBlackFridayImage({ scale: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  {/* Rotação e Opacidade */}
                  <div className="control-field">
                    <label style={{ fontSize: "11px" }}>
                      Rotação: <strong>{config.blackFridayImage?.rotation ?? 0}°</strong>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={config.blackFridayImage?.rotation ?? 0}
                        onChange={(e) => updateBlackFridayImage({ rotation: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="control-field">
                    <label style={{ fontSize: "11px" }}>
                      Opacidade: <strong>{config.blackFridayImage?.opacity ?? 100}%</strong>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={config.blackFridayImage?.opacity ?? 100}
                        onChange={(e) => updateBlackFridayImage({ opacity: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="control-field">
                    <label style={{ fontSize: "11px" }}>
                      Camada / Z-Index: <strong>{config.blackFridayImage?.zIndex ?? 25}</strong>
                      <input
                        type="range"
                        min="1"
                        max="60"
                        step="1"
                        value={config.blackFridayImage?.zIndex ?? 25}
                        onChange={(e) => updateBlackFridayImage({ zIndex: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* ABA 3: ANIMAÇÃO */}
              {activeBfImageTab === "animation" && (
                <div>
                  <div className="control-field">
                    <span className="control-label-mini">Animação de Entrada (Ao Trocar de Oferta):</span>
                    <select
                      className="control-select"
                      value={config.blackFridayImage?.animation?.entryPreset || config.blackFridayImage?.animation?.preset || "zoom-in"}
                      onChange={(e) =>
                        updateBlackFridayImage((prev) => ({
                          ...prev,
                          animation: {
                            ...(prev.animation || DEFAULT_BLACK_FRIDAY_IMAGE.animation),
                            entryPreset: e.target.value as BlackFridayEntryAnimationPreset,
                            preset: e.target.value as BlackFridayAnimationPreset,
                          },
                        }))
                      }
                    >
                      <option value="none">Nenhuma (Estática)</option>
                      <option value="zoom-in">Zoom-in / Impacto (Padrão)</option>
                      <option value="fade-in">Fade Suave</option>
                      <option value="slide-in">Slide da Direita</option>
                      <option value="bounce">Bounce Elástico</option>
                    </select>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Animação Contínua (Idle / Loop):</span>
                    <select
                      className="control-select"
                      value={config.blackFridayImage?.animation?.idlePreset || "float"}
                      onChange={(e) =>
                        updateBlackFridayImage((prev) => ({
                          ...prev,
                          animation: {
                            ...(prev.animation || DEFAULT_BLACK_FRIDAY_IMAGE.animation),
                            idlePreset: e.target.value as BlackFridayIdleAnimationPreset,
                          },
                        }))
                      }
                    >
                      <option value="none">Nenhuma (Parada)</option>
                      <option value="float">Flutuação Suave (Padrão)</option>
                      <option value="pulse">Pulsação / Batimento</option>
                      <option value="rotate-smooth">Giro Lento Contínuo</option>
                      <option value="shake">Tremor de Destaque (Shake)</option>
                      <option value="flip">Giro 3D (Flip)</option>
                      <option value="neon">Brilho Neon Oscilante</option>
                    </select>
                  </div>

                  <div className="control-field">
                    <label style={{ fontSize: "11px" }}>
                      Duração da Animação: <strong>{config.blackFridayImage?.animation?.duration ?? 0.8}s</strong>
                      <input
                        type="range"
                        min="0.2"
                        max="4.0"
                        step="0.1"
                        value={config.blackFridayImage?.animation?.duration ?? 0.8}
                        onChange={(e) =>
                          updateBlackFridayImage((prev) => ({
                            ...prev,
                            animation: {
                              ...(prev.animation || DEFAULT_BLACK_FRIDAY_IMAGE.animation),
                              duration: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="control-field">
                    <label style={{ fontSize: "11px" }}>
                      Atraso de Início (Delay): <strong>{config.blackFridayImage?.animation?.delay ?? 0.1}s</strong>
                      <input
                        type="range"
                        min="0"
                        max="2.0"
                        step="0.05"
                        value={config.blackFridayImage?.animation?.delay ?? 0.1}
                        onChange={(e) =>
                          updateBlackFridayImage((prev) => ({
                            ...prev,
                            animation: {
                              ...(prev.animation || DEFAULT_BLACK_FRIDAY_IMAGE.animation),
                              delay: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Velocidade da Animação:</span>
                    <div className="segmented-group">
                      {(["slow", "normal", "fast"] as const).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          className={
                            (config.blackFridayImage?.animation?.speed || "normal") === spd
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            updateBlackFridayImage((prev) => ({
                              ...prev,
                              animation: {
                                ...(prev.animation || DEFAULT_BLACK_FRIDAY_IMAGE.animation),
                                speed: spd,
                              },
                            }))
                          }
                        >
                          {spd === "slow" ? "Suave" : spd === "normal" ? "Normal" : "Rápido"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Intensidade do Movimento:</span>
                    <div className="segmented-group">
                      {(["subtle", "normal", "strong"] as const).map((int) => (
                        <button
                          key={int}
                          type="button"
                          className={
                            (config.blackFridayImage?.animation?.intensity || "normal") === int
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            updateBlackFridayImage((prev) => ({
                              ...prev,
                              animation: {
                                ...(prev.animation || DEFAULT_BLACK_FRIDAY_IMAGE.animation),
                                intensity: int,
                              },
                            }))
                          }
                        >
                          {int === "subtle" ? "Sutil" : int === "normal" ? "Normal" : "Forte"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onReplay}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "10px",
                      }}
                    >
                      <Play size={14} />
                      <span>▶ Testar / Pré-visualizar Animação</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 2.5 SEÇÃO: SOBREPOSIÇÃO EM VÍDEOS (LOGO & BLACK FRIDAY) */}
        {isSectionVisible("videoOverlay") && (
        <div className={`accordion-item ${openSections.videoOverlay ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("videoOverlay")}
          >
            <div className="accordion-header-title">
              <Play size={15} className="accordion-icon" style={{ color: "#a78bfa" }} />
              <span>🎬 Sobreposição em Vídeos (Logo & Black Friday)</span>
            </div>
            {openSections.videoOverlay ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.videoOverlay && (
            <div className="accordion-body">
              <div className="info-tip-box" style={{ marginBottom: "12px", background: "rgba(167, 139, 250, 0.1)", borderColor: "rgba(167, 139, 250, 0.25)" }}>
                <span>🎬</span>
                <small style={{ color: "#d8b4fe" }}>
                  <strong>Ajuste Exclusivo para Vídeos:</strong> Posicione a Logo e a Imagem Black Friday de forma independente quando um vídeo estiver passando na TV, sem afetar o layout dos produtos!
                </small>
              </div>

              {/* Botão de Trocar Pré-visualização para Modo Vídeo */}
              <div style={{ marginBottom: "14px" }}>
                <button
                  type="button"
                  className={`btn ${(config.layout as string) === "video" ? "btn-success" : "btn-secondary"}`}
                  onClick={() => onChange((prev) => ({ ...prev, layout: "video" as OfferLayout }))}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                  }}
                >
                  <Play size={14} />
                  <span>{(config.layout as string) === "video" ? "✓ Visualizando no Vídeo Pausado" : "🎬 Abrir Pré-visualização no Vídeo Pausado"}</span>
                </button>
              </div>

              {/* Toggle Habilitar Sobreposição de Vídeo */}
              <label className="toggle-field" style={{ marginBottom: "12px" }}>
                <span>Ativar Posições Específicas para Vídeos</span>
                <input
                  type="checkbox"
                  checked={config.videoOverlay?.enabled !== false}
                  onChange={(e) => updateVideoOverlay({ enabled: e.target.checked })}
                />
              </label>

              {/* SUBSEÇÃO 1: LOGO NO VÍDEO */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "12px", color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sun size={13} /> Logo sobre o Vídeo
                  </strong>
                  <label style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", margin: 0, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={config.videoOverlay?.logo?.visible !== false && config.logo.visible !== false}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          logo: { ...(prev.logo || {}), visible: e.target.checked },
                        }))
                      }
                    />
                    <span>Exibir</span>
                  </label>
                </div>

                <div className="control-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <label style={{ fontSize: "11px", margin: 0 }}>Posição X (Horizontal %):</label>
                    <input
                      type="number"
                      min="-20"
                      max="120"
                      step="1"
                      value={Math.round(config.videoOverlay?.logo?.x ?? config.logo.x ?? 4)}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          logo: { ...(prev.logo || {}), x: Number(e.target.value), position: "custom" },
                        }))
                      }
                      style={{ width: "50px", padding: "1px 4px", fontSize: "11px", textAlign: "right", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "4px" }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={config.videoOverlay?.logo?.x ?? config.logo.x ?? 4}
                    onChange={(e) =>
                      updateVideoOverlay((prev) => ({
                        ...prev,
                        logo: { ...(prev.logo || {}), x: Number(e.target.value), position: "custom" },
                      }))
                    }
                  />
                </div>

                <div className="control-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <label style={{ fontSize: "11px", margin: 0 }}>Posição Y (Vertical %):</label>
                    <input
                      type="number"
                      min="-20"
                      max="120"
                      step="1"
                      value={Math.round(config.videoOverlay?.logo?.y ?? config.logo.y ?? 4)}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          logo: { ...(prev.logo || {}), y: Number(e.target.value), position: "custom" },
                        }))
                      }
                      style={{ width: "50px", padding: "1px 4px", fontSize: "11px", textAlign: "right", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "4px" }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={config.videoOverlay?.logo?.y ?? config.logo.y ?? 4}
                    onChange={(e) =>
                      updateVideoOverlay((prev) => ({
                        ...prev,
                        logo: { ...(prev.logo || {}), y: Number(e.target.value), position: "custom" },
                      }))
                    }
                  />
                </div>

                <div className="control-field">
                  <label style={{ fontSize: "11px" }}>
                    Tamanho da Logo no Vídeo: <strong>{config.videoOverlay?.logo?.size ?? config.logo.size}px</strong>
                    <input
                      type="range"
                      min="20"
                      max="400"
                      step="4"
                      value={config.videoOverlay?.logo?.size ?? config.logo.size}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          logo: { ...(prev.logo || {}), size: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              {/* SUBSEÇÃO 2: BLACK FRIDAY NO VÍDEO */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "12px", color: "#ff3366", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={13} /> Imagem Black Friday sobre o Vídeo
                  </strong>
                  <label style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", margin: 0, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={config.videoOverlay?.blackFridayImage?.visible !== false && config.blackFridayImage?.visible !== false}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          blackFridayImage: { ...(prev.blackFridayImage || {}), visible: e.target.checked },
                        }))
                      }
                    />
                    <span>Exibir</span>
                  </label>
                </div>

                {/* Presets de Posição no Vídeo */}
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "3px" }}>
                    Posições Rápidas no Vídeo:
                  </span>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {[
                      { label: "↗ Topo Fora (Y: -15%)", x: 82, y: -15 },
                      { label: "↗ Topo Dir (Y: 6%)", x: 82, y: 6 },
                      { label: "↑ Topo Centro", x: 41, y: 4 },
                      { label: "↖ Topo Esq", x: 4, y: 4 },
                      { label: "• Centro", x: 41, y: 45 },
                      { label: "↘ Base Dir", x: 82, y: 82 },
                    ].map((pos) => {
                      const isCurrent =
                        Math.round(config.videoOverlay?.blackFridayImage?.x ?? config.blackFridayImage?.x ?? 82) === pos.x &&
                        Math.round(config.videoOverlay?.blackFridayImage?.y ?? config.blackFridayImage?.y ?? 6) === pos.y;
                      return (
                        <button
                          key={pos.label}
                          type="button"
                          className={`btn-mini-preset ${isCurrent ? "active" : ""}`}
                          onClick={() =>
                            updateVideoOverlay((prev) => ({
                              ...prev,
                              blackFridayImage: {
                                ...(prev.blackFridayImage || {}),
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

                <div className="control-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <label style={{ fontSize: "11px", margin: 0 }}>Posição X (Horizontal %):</label>
                    <input
                      type="number"
                      min="-100"
                      max="200"
                      step="1"
                      value={Math.round(config.videoOverlay?.blackFridayImage?.x ?? config.blackFridayImage?.x ?? 82)}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          blackFridayImage: { ...(prev.blackFridayImage || {}), x: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "50px", padding: "1px 4px", fontSize: "11px", textAlign: "right", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "4px" }}
                    />
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="150"
                    step="1"
                    value={config.videoOverlay?.blackFridayImage?.x ?? config.blackFridayImage?.x ?? 82}
                    onChange={(e) =>
                      updateVideoOverlay((prev) => ({
                        ...prev,
                        blackFridayImage: { ...(prev.blackFridayImage || {}), x: Number(e.target.value) },
                      }))
                    }
                  />
                </div>

                <div className="control-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <label style={{ fontSize: "11px", margin: 0 }}>Posição Y (Vertical %):</label>
                    <input
                      type="number"
                      min="-100"
                      max="200"
                      step="1"
                      value={Math.round(config.videoOverlay?.blackFridayImage?.y ?? config.blackFridayImage?.y ?? 6)}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          blackFridayImage: { ...(prev.blackFridayImage || {}), y: Number(e.target.value) },
                        }))
                      }
                      style={{ width: "50px", padding: "1px 4px", fontSize: "11px", textAlign: "right", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "4px" }}
                    />
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="150"
                    step="1"
                    value={config.videoOverlay?.blackFridayImage?.y ?? config.blackFridayImage?.y ?? 6}
                    onChange={(e) =>
                      updateVideoOverlay((prev) => ({
                        ...prev,
                        blackFridayImage: { ...(prev.blackFridayImage || {}), y: Number(e.target.value) },
                      }))
                    }
                  />
                </div>

                <div className="control-field">
                  <label style={{ fontSize: "11px" }}>
                    Largura da Imagem no Vídeo: <strong>{config.videoOverlay?.blackFridayImage?.width ?? config.blackFridayImage?.width ?? 18}%</strong>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      step="1"
                      value={config.videoOverlay?.blackFridayImage?.width ?? config.blackFridayImage?.width ?? 18}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          blackFridayImage: { ...(prev.blackFridayImage || {}), width: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="control-field">
                  <label style={{ fontSize: "11px" }}>
                    Escala / Zoom no Vídeo: <strong>{Math.round((config.videoOverlay?.blackFridayImage?.scale ?? config.blackFridayImage?.scale ?? 1) * 100)}%</strong>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={config.videoOverlay?.blackFridayImage?.scale ?? config.blackFridayImage?.scale ?? 1}
                      onChange={(e) =>
                        updateVideoOverlay((prev) => ({
                          ...prev,
                          blackFridayImage: { ...(prev.blackFridayImage || {}), scale: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* C. SEÇÃO: ANIMAÇÃO DOS ELEMENTOS INDIVIDUAIS */}
        {isSectionVisible("elementAnimations") && (
        <div className={`accordion-item ${openSections.elementAnimations ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("elementAnimations")}
          >
            <div className="accordion-header-title">
              <Sliders size={15} className="accordion-icon" />
              <span>Animação dos Elementos</span>
            </div>
            {openSections.elementAnimations ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.elementAnimations && (
            <div className="accordion-body">
              <label>
                Animação do Nome do Produto
                <select
                  value={ea.nameAnimation || "slide-up"}
                  onChange={(e) =>
                    updateElementAnimations({
                      nameAnimation: e.target.value as ProductNameAnimation,
                    })
                  }
                >
                  <option value="slide-up">Slide de Baixo para Cima (Padrão)</option>
                  <option value="paint-reveal">Revelação em Tinta (Clip-Path)</option>
                  <option value="impact">Impacto Tipográfico Direto</option>
                  <option value="fade">Fade Suave</option>
                </select>
              </label>

              <label>
                Animação do Preço Promocional
                <select
                  value={ea.priceAnimation || "impact"}
                  onChange={(e) =>
                    updateElementAnimations({
                      priceAnimation: e.target.value as ProductPriceAnimation,
                    })
                  }
                >
                  <option value="impact">Impacto de Cartaz (Padrão)</option>
                  <option value="pop">Pop Elástico (Bounce)</option>
                  <option value="scale">Escala com Realce</option>
                  <option value="paint-reveal">Revelação de Tinta</option>
                </select>
              </label>

              <label>
                Animação da Imagem do Produto
                <select
                  value={ea.imageAnimation || "float"}
                  onChange={(e) =>
                    updateElementAnimations({
                      imageAnimation: e.target.value as ProductImageAnimation,
                    })
                  }
                >
                  <option value="float">Flutuação Sutil Contínua (Padrão)</option>
                  <option value="slide-left">Slide da Direita</option>
                  <option value="fade">Fade In</option>
                  <option value="none">Estático</option>
                </select>
              </label>

              <label>
                Sequência de Entrada (Coreografia)
                <select
                  value={ea.choreography || "staggered"}
                  onChange={(e) =>
                    updateElementAnimations({
                      choreography: e.target.value as EntranceChoreography,
                    })
                  }
                >
                  <option value="staggered">Escalonada Suave (Título → Imagem → Preço)</option>
                  <option value="delayed-price">Preço por Último (Foco no Valor)</option>
                  <option value="simultaneous">Simultânea (Todos os Elementos Juntos)</option>
                </select>
              </label>
            </div>
          )}
        </div>
        )}

        {/* 1. SEÇÃO: FUNDO & CORES DA TV */}
        {isSectionVisible("background") && (
        <div className={`accordion-item ${openSections.background ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("background")}
          >
            <div className="accordion-header-title">
              <Palette size={15} className="accordion-icon" />
              <span>Fundo & Cores da TV</span>
            </div>
            {openSections.background ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.background && (
            <div className="accordion-body">
              <label>
                Tipo de Fundo
                <div className="segmented-group">
                  <button
                    type="button"
                    className={config.background?.type === "gradient" ? "active" : ""}
                    onClick={() => updateBackground({ type: "gradient" as BackgroundType })}
                  >
                    Gradiente
                  </button>
                  <button
                    type="button"
                    className={config.background?.type === "solid" ? "active" : ""}
                    onClick={() => updateBackground({ type: "solid" as BackgroundType })}
                  >
                    Cor Sólida
                  </button>
                  <button
                    type="button"
                    className={config.background?.type === "sunburst" ? "active" : ""}
                    onClick={() =>
                      updateBackground({
                        type: "sunburst" as BackgroundType,
                        color: config.background?.color || "#FF8C00",
                        gradientStart: config.background?.gradientStart || "#FFB800",
                        gradientEnd: config.background?.gradientEnd || "#FF6600",
                        sunburst: {
                          primaryColor: config.background?.sunburst?.primaryColor || "#FFB800",
                          secondaryColor: config.background?.sunburst?.secondaryColor || "#FF6600",
                          speed: config.background?.sunburst?.speed ?? 60,
                          raysCount: config.background?.sunburst?.raysCount ?? 24,
                          scale: config.background?.sunburst?.scale ?? 1.5,
                          glowPulse: config.background?.sunburst?.glowPulse ?? true,
                        },
                      })
                    }
                  >
                    Sunburst
                  </button>
                  <button
                    type="button"
                    className={config.background?.type === "image" ? "active" : ""}
                    onClick={() => updateBackground({ type: "image" as BackgroundType })}
                  >
                    Imagem PNG/JPG
                  </button>
                </div>
              </label>

              {/* Seção Gradiente */}
              {config.background?.type === "gradient" && (
                <>
                  <div className="control-field">
                    <span className="control-label-mini">Presets Rápidos de Gradiente:</span>
                    <div className="gradient-presets-grid">
                      {GRADIENT_PRESETS.map((gp) => (
                        <button
                          key={gp.label}
                          type="button"
                          className="gradient-preset-btn"
                          style={{
                            background: `linear-gradient(${gp.angle}deg, ${gp.start}, ${gp.end})`,
                          }}
                          onClick={() =>
                            updateBackground({
                              gradientStart: gp.start,
                              gradientEnd: gp.end,
                              gradientAngle: gp.angle,
                            })
                          }
                          title={gp.label}
                        >
                          <span>{gp.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Cor Inicial (Topo/Início):</span>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        className="color-picker-input"
                        value={config.background?.gradientStart || "#1a0407"}
                        onChange={(e) => updateBackground({ gradientStart: e.target.value })}
                      />
                      <span className="color-hex-text">
                        {config.background?.gradientStart || "#1a0407"}
                      </span>
                      <div className="color-presets-list">
                        {["#1a0407", "#300508", "#1f1807", "#181b22", "#081426", "#051c10"].map(
                          (c) => (
                            <button
                              key={c}
                              type="button"
                              className={`color-pill ${config.background?.gradientStart === c ? "selected" : ""}`}
                              style={{ background: c }}
                              onClick={() => updateBackground({ gradientStart: c })}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Cor Final (Base/Fim):</span>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        className="color-picker-input"
                        value={config.background?.gradientEnd || "#050608"}
                        onChange={(e) => updateBackground({ gradientEnd: e.target.value })}
                      />
                      <span className="color-hex-text">
                        {config.background?.gradientEnd || "#050608"}
                      </span>
                      <div className="color-presets-list">
                        {["#050608", "#000000", "#0c0d12", "#0a1128", "#020a06"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-pill ${config.background?.gradientEnd === c ? "selected" : ""}`}
                            style={{ background: c }}
                            onClick={() => updateBackground({ gradientEnd: c })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <label>
                    Ângulo do Gradiente: <strong>{config.background?.gradientAngle || 135}°</strong>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={config.background?.gradientAngle || 135}
                      onChange={(e) => updateBackground({ gradientAngle: Number(e.target.value) })}
                    />
                  </label>
                </>
              )}

              {/* Seção Cor Sólida */}
              {config.background?.type === "solid" && (
                <div className="control-field">
                  <span className="control-label-mini">Cor de Fundo Sólida:</span>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      className="color-picker-input"
                      value={config.background?.color || "#080a0e"}
                      onChange={(e) => updateBackground({ color: e.target.value })}
                    />
                    <span className="color-hex-text">{config.background?.color || "#080a0e"}</span>
                    <div className="color-presets-list">
                      {["#000000", "#080a0e", "#12151b", "#1a0508", "#0a1220", "#031a0e"].map(
                        (c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-pill ${config.background?.color === c ? "selected" : ""}`}
                            style={{ background: c }}
                            onClick={() => updateBackground({ color: c })}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Seção Imagem de Fundo */}
              {config.background?.type === "image" && (
                <div className="control-field">
                  <span className="control-label-mini">Upload de Fundo Personalizado:</span>
                  <input
                    type="file"
                    ref={bgFileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleBgImageUpload}
                  />
                  <div className="file-upload-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-upload-pill"
                      onClick={() => bgFileInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>Escolher Imagem do Computador</span>
                    </button>
                    {config.background?.imageUrl && (
                      <button
                        type="button"
                        className="btn-icon-sub delete-btn"
                        onClick={() =>
                          updateBackground({ type: "gradient", imageUrl: undefined })
                        }
                        title="Remover imagem de fundo"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <label style={{ marginTop: "6px" }}>
                    Ou cole o link da imagem:
                    <input
                      type="text"
                      value={config.background?.imageUrl || ""}
                      onChange={(e) => updateBackground({ imageUrl: e.target.value })}
                      placeholder="https://exemplo.com/fundo.jpg"
                    />
                  </label>

                  {config.background?.imageUrl && (
                    <div className="image-preview-thumbnail">
                      <img src={config.background.imageUrl} alt="Prévia do fundo" />
                      <small>Fundo ativo aplicado ao Canvas</small>
                    </div>
                  )}
                </div>
              )}

              {/* Seção Sunburst Animado */}
              {config.background?.type === "sunburst" && (
                <>
                  <div className="control-field">
                    <span className="control-label-mini">Presets de Cores Sunburst:</span>
                    <div className="gradient-presets-grid">
                      {[
                        { label: "Sol Amarelo & Laranja", primary: "#FFB800", secondary: "#FF6600" },
                        { label: "Âmbar & Dourado", primary: "#F59E0B", secondary: "#D97706" },
                        { label: "Laranja & Fogo", primary: "#FF6B00", secondary: "#DC2626" },
                        { label: "Black Friday & Grafite", primary: "#333333", secondary: "#111111" },
                        { label: "Azul Ofertas", primary: "#0284C7", secondary: "#0369A1" },
                      ].map((sp) => (
                        <button
                          key={sp.label}
                          type="button"
                          className="gradient-preset-btn"
                          style={{
                            background: `linear-gradient(135deg, ${sp.primary}, ${sp.secondary})`,
                          }}
                          onClick={() =>
                            updateBackground({
                              gradientStart: sp.primary,
                              gradientEnd: sp.secondary,
                              sunburst: {
                                ...(config.background?.sunburst || {}),
                                primaryColor: sp.primary,
                                secondaryColor: sp.secondary,
                              },
                            })
                          }
                          title={sp.label}
                        >
                          <span>{sp.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Cor Primária (Raios Claros):</span>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        className="color-picker-input"
                        value={
                          config.background?.sunburst?.primaryColor ||
                          config.background?.gradientStart ||
                          "#FFB800"
                        }
                        onChange={(e) =>
                          updateBackground({
                            gradientStart: e.target.value,
                            sunburst: {
                              ...(config.background?.sunburst || {}),
                              primaryColor: e.target.value,
                            },
                          })
                        }
                      />
                      <span className="color-hex-text">
                        {config.background?.sunburst?.primaryColor ||
                          config.background?.gradientStart ||
                          "#FFB800"}
                      </span>
                    </div>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Cor Secundária (Raios Escuros):</span>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        className="color-picker-input"
                        value={
                          config.background?.sunburst?.secondaryColor ||
                          config.background?.gradientEnd ||
                          "#FF6600"
                        }
                        onChange={(e) =>
                          updateBackground({
                            gradientEnd: e.target.value,
                            sunburst: {
                              ...(config.background?.sunburst || {}),
                              secondaryColor: e.target.value,
                            },
                          })
                        }
                      />
                      <span className="color-hex-text">
                        {config.background?.sunburst?.secondaryColor ||
                          config.background?.gradientEnd ||
                          "#FF6600"}
                      </span>
                    </div>
                  </div>

                  <label>
                    Velocidade da Rotação: <strong>{config.background?.sunburst?.speed ?? 60}s</strong>
                    <input
                      type="range"
                      min="15"
                      max="150"
                      step="5"
                      value={config.background?.sunburst?.speed ?? 60}
                      onChange={(e) =>
                        updateBackground({
                          sunburst: {
                            ...(config.background?.sunburst || {}),
                            speed: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>

                  <label>
                    Densidade de Raios: <strong>{config.background?.sunburst?.raysCount ?? 24} raios</strong>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      step="4"
                      value={config.background?.sunburst?.raysCount ?? 24}
                      onChange={(e) =>
                        updateBackground({
                          sunburst: {
                            ...(config.background?.sunburst || {}),
                            raysCount: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>

                  <label>
                    Escala / Zoom dos Raios: <strong>{(config.background?.sunburst?.scale ?? 1.5).toFixed(1)}x</strong>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.1"
                      value={config.background?.sunburst?.scale ?? 1.5}
                      onChange={(e) =>
                        updateBackground({
                          sunburst: {
                            ...(config.background?.sunburst || {}),
                            scale: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>

                  <div className="control-field" style={{ marginTop: "6px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={config.background?.sunburst?.glowPulse !== false}
                        onChange={(e) =>
                          updateBackground({
                            sunburst: {
                              ...(config.background?.sunburst || {}),
                              glowPulse: e.target.checked,
                            },
                          })
                        }
                      />
                      <span>Pulso de Brilho Central Suave</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        )}

        {/* 2. SEÇÃO: APRESENTAÇÃO DO PRODUTO (SEM QUADRADO / CARDS) */}
        {isSectionVisible("productCard") && (
        <div className={`accordion-item ${openSections.productCard ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("productCard")}
          >
            <div className="accordion-header-title">
              <Layers size={15} className="accordion-icon" />
              <span>Apresentação do Produto</span>
            </div>
            {openSections.productCard ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.productCard && (
            <div className="accordion-body">
              <label>
                Estilo do Produto
                <div className="segmented-grid-layouts">
                  <button
                    type="button"
                    className={`layout-pill-btn ${config.productCard?.style === "transparent" ? "active" : ""}`}
                    onClick={() =>
                      updateProductCard({ style: "transparent" as ProductCardStyle })
                    }
                  >
                    <strong>Transparente (Sem Quadrado)</strong>
                    <small>✨ Só a foto flutuando com sombra natural</small>
                  </button>

                  <button
                    type="button"
                    className={`layout-pill-btn ${config.productCard?.style === "card" ? "active" : ""}`}
                    onClick={() => updateProductCard({ style: "card" as ProductCardStyle })}
                  >
                    <strong>Cartão Escuro</strong>
                    <small>Container com fundo e borda</small>
                  </button>

                  <button
                    type="button"
                    className={`layout-pill-btn ${config.productCard?.style === "glass" ? "active" : ""}`}
                    onClick={() => updateProductCard({ style: "glass" as ProductCardStyle })}
                  >
                    <strong>Efeito Vidro (Glass)</strong>
                    <small>Translúcido com desfoque</small>
                  </button>

                  <button
                    type="button"
                    className={`layout-pill-btn ${config.productCard?.style === "bordered" ? "active" : ""}`}
                    onClick={() => updateProductCard({ style: "bordered" as ProductCardStyle })}
                  >
                    <strong>Borda Dourada</strong>
                    <small>Borda com realce ouro Sol</small>
                  </button>
                </div>
              </label>

              {config.productCard?.style === "transparent" && (
                <div className="info-tip-box">
                  <span>💡</span>
                  <small>
                    <strong>Modo sem quadrado ativado:</strong> As imagens dos produtos são exibidas
                    recortadas diretamente sobre o fundo da TV, sem caixas escuras ou bordas rígidas.
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 3. SEÇÃO: SELO / BADGE / TAG NOS PRODUTOS */}
        {isSectionVisible("badge") && (
        <div className={`accordion-item ${openSections.badge ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("badge")}
          >
            <div className="accordion-header-title">
              <Tag size={15} className="accordion-icon" />
              <span>🏷️ Selo nos Produtos / Tag (Cards)</span>
            </div>
            {openSections.badge ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.badge && (
            <div className="accordion-body">
              {/* Toggle Principal de Visibilidade do Selo */}
              <label className="toggle-field" style={{ marginBottom: "12px" }}>
                <span>🏷️ Exibir Selo / Tag sobre a foto dos Produtos</span>
                <input
                  type="checkbox"
                  checked={config.badge.visible !== false}
                  onChange={(e) => updateBadge({ visible: e.target.checked })}
                />
              </label>

              {config.badge.visible === false && (
                <div className="info-tip-box" style={{ marginBottom: "12px", background: "rgba(255, 92, 92, 0.1)", borderColor: "rgba(255, 92, 92, 0.3)" }}>
                  <span>👁️‍🗨️</span>
                  <small style={{ color: "#ff9999" }}>
                    <strong>Selo Promocional Oculto:</strong> O selo/tag não está sendo exibido na TV. Marque a caixa acima para reativar a qualquer momento.
                  </small>
                </div>
              )}

              <label>
                Tipo do Selo
                <div className="segmented-group">
                  <button
                    type="button"
                    className={config.badge.type === "image" ? "active" : ""}
                    onClick={() => updateBadge({ type: "image" as BadgeType })}
                  >
                    Imagem PNG / Tag
                  </button>
                  <button
                    type="button"
                    className={config.badge.type === "text" || !config.badge.type ? "active" : ""}
                    onClick={() => updateBadge({ type: "text" as BadgeType })}
                  >
                    Texto do Selo
                  </button>
                </div>
              </label>

              {/* Modo Selo Imagem PNG */}
              {config.badge.type === "image" && (
                <>
                  <div className="control-field">
                    <span className="control-label-mini">Tags PNG Prontas para Uso:</span>
                    <div className="preset-badges-grid">
                      {PRESET_BADGE_TAGS.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className={`preset-badge-item ${config.badge.image === tag.url ? "selected" : ""}`}
                          onClick={() => updateBadge({ type: "image", image: tag.url })}
                        >
                          <img src={tag.url} alt={tag.label} />
                          <span>{tag.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Upload de Tag PNG Personalizada:</span>
                    <input
                      type="file"
                      ref={badgeFileInputRef}
                      accept="image/png,image/webp,image/svg+xml"
                      style={{ display: "none" }}
                      onChange={handleBadgeImageUpload}
                    />
                    <div className="file-upload-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-upload-pill"
                        onClick={() => badgeFileInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>Fazer Upload de PNG do Computador</span>
                      </button>
                      {config.badge.image && (
                        <button
                          type="button"
                          className="btn-icon-sub delete-btn"
                          onClick={() => updateBadge({ type: "text", image: undefined })}
                          title="Remover imagem e usar texto"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <label>
                    Tamanho da Tag PNG: <strong>{config.badge.size || 70}px</strong>
                    <input
                      type="range"
                      min="20"
                      max="400"
                      step="2"
                      value={config.badge.size || 70}
                      onChange={(e) => updateBadge({ size: Number(e.target.value) })}
                    />
                  </label>

                  <label>
                    Inclinação / Rotação: <strong>{config.badge.rotation}°</strong>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={config.badge.rotation}
                      onChange={(e) => updateBadge({ rotation: Number(e.target.value) })}
                    />
                  </label>
                </>
              )}

              {/* Modo Selo Texto */}
              {(config.badge.type === "text" || !config.badge.type) && (
                <>
                  <label>
                    Texto do Selo
                    <input
                      type="text"
                      value={config.badge.text}
                      onChange={(e) => updateBadge({ text: e.target.value })}
                      placeholder="Ex: OFERTA, BLACK FRIDAY"
                    />
                  </label>

                  <div className="control-field">
                    <span className="control-label-mini">Cor de Fundo do Selo:</span>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        className="color-picker-input"
                        value={config.badge.background || "#e21b2d"}
                        onChange={(e) => updateBadge({ background: e.target.value })}
                      />
                      <span className="color-hex-text">
                        {config.badge.background || "#e21b2d"}
                      </span>
                      <div className="color-presets-list">
                        {[
                          "#e21b2d",
                          "#9e0e1c",
                          "#f2c94c",
                          "#2ea043",
                          "#252a32",
                          "#ff5c5c",
                        ].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-pill ${config.badge.background === c ? "selected" : ""}`}
                            style={{ background: c }}
                            onClick={() => updateBadge({ background: c })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="control-field">
                    <span className="control-label-mini">Cor do Texto do Selo:</span>
                    <div className="color-picker-row">
                      <input
                        type="color"
                        className="color-picker-input"
                        value={config.badge.color || "#ffffff"}
                        onChange={(e) => updateBadge({ color: e.target.value })}
                      />
                      <span className="color-hex-text">{config.badge.color || "#ffffff"}</span>
                      <div className="color-presets-list">
                        {["#ffffff", "#000000", "#f2c94c"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-pill ${config.badge.color === c ? "selected" : ""}`}
                            style={{ background: c }}
                            onClick={() => updateBadge({ color: c })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <label>
                    Inclinação / Rotação: <strong>{config.badge.rotation}°</strong>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={config.badge.rotation}
                      onChange={(e) => updateBadge({ rotation: Number(e.target.value) })}
                    />
                  </label>
                </>
              )}

              {/* Controles de Posição da Tag (Fixa e Sincronizada) */}
              <div className="control-field" style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="control-label-mini">Posição da Tag no Produto:</span>
                <div className="segmented-grid-layouts">
                  {[
                    { id: "top-right", label: "Topo Direito", desc: "Padrão superior" },
                    { id: "top-left", label: "Topo Esquerdo", desc: "Superior esquerdo" },
                    { id: "top-center", label: "Topo Central", desc: "Centro superior" },
                    { id: "bottom-right", label: "Inferior Direito", desc: "Base direita" },
                    { id: "bottom-left", label: "Inferior Esquerdo", desc: "Base esquerda" },
                    { id: "over-price", label: "Acima do Preço", desc: "Junto ao valor" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      className={`layout-pill-btn ${(config.badge.position || "top-right") === pos.id ? "active" : ""}`}
                      onClick={() => updateBadge({ position: pos.id as BadgePosition })}
                    >
                      <strong>{pos.label}</strong>
                      <small>{pos.desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              <label>
                Ajuste Fino Horizontal (Offset X): <strong>{config.badge.offsetX || 0}px</strong>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  step="1"
                  value={config.badge.offsetX || 0}
                  onChange={(e) => updateBadge({ offsetX: Number(e.target.value) })}
                />
              </label>

              <label>
                Ajuste Fino Vertical (Offset Y): <strong>{config.badge.offsetY || 0}px</strong>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  step="1"
                  value={config.badge.offsetY || 0}
                  onChange={(e) => updateBadge({ offsetY: Number(e.target.value) })}
                />
              </label>

              <div className="info-tip-box">
                <span>📌</span>
                <small>
                  <strong>Posição Fixa Sincronizada:</strong> A posição e os ajustes finos definidos aqui são salvos e aplicados de forma fixa e consistente a todos os layouts (1, 2, 4 e 8 produtos).
                </small>
              </div>
            </div>
          )}
        </div>
        )}

        {/* 4. SEÇÃO: IDENTIDADE DA LOGO */}
        {isSectionVisible("identity") && (
        <div className={`accordion-item ${openSections.identity ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("identity")}
          >
            <div className="accordion-header-title">
              <Sun size={15} className="accordion-icon" />
              <span>Identidade & Logo</span>
            </div>
            {openSections.identity ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.identity && (
            <div className="accordion-body">
              <label>
                Posição da Logo (Presets)
                <select
                  value={config.logo.position}
                  onChange={(e) => {
                    const pos = e.target.value as LogoPosition;
                    let x = config.logo.x ?? 4;
                    let y = config.logo.y ?? 4;
                    if (pos === "top-left") { x = 3.5; y = 3.5; }
                    else if (pos === "top-center") { x = 50; y = 3.5; }
                    else if (pos === "top-right") { x = 96.5; y = 3.5; }
                    else if (pos === "bottom-left") { x = 3.5; y = 92; }
                    else if (pos === "bottom-center") { x = 50; y = 92; }
                    else if (pos === "bottom-right") { x = 96.5; y = 92; }
                    else if (pos === "center") { x = 50; y = 50; }
                    updateLogo({ position: pos, x, y });
                  }}
                >
                  <option value="top-left">Topo Esquerdo (Padrão)</option>
                  <option value="top-center">Topo Centralizado</option>
                  <option value="top-right">Topo Direito</option>
                  <option value="bottom-left">Rodapé Esquerdo</option>
                  <option value="bottom-center">Rodapé Centralizado</option>
                  <option value="bottom-right">Rodapé Direito</option>
                  <option value="center">Centro da Tela</option>
                  <option value="custom">Personalizado (Livre)</option>
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label>
                  Posição X: <strong>{(config.logo.x ?? 4).toFixed(1)}%</strong>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={config.logo.x ?? 4}
                    onChange={(e) => updateLogo({ x: Number(e.target.value), position: "custom" })}
                  />
                </label>
                <label>
                  Posição Y: <strong>{(config.logo.y ?? 4).toFixed(1)}%</strong>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={config.logo.y ?? 4}
                    onChange={(e) => updateLogo({ y: Number(e.target.value), position: "custom" })}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label>
                  Escala: <strong>{Math.round((config.logo.scale ?? 1) * 100)}%</strong>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={config.logo.scale ?? 1}
                    onChange={(e) => updateLogo({ scale: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Opacidade: <strong>{config.logo.opacity ?? 100}%</strong>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.logo.opacity ?? 100}
                    onChange={(e) => updateLogo({ opacity: Number(e.target.value) })}
                  />
                </label>
              </div>

              <label>
                Rotação da Logo: <strong>{config.logo.rotation ?? 0}°</strong>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={config.logo.rotation ?? 0}
                  onChange={(e) => updateLogo({ rotation: Number(e.target.value) })}
                />
              </label>

              {/* UPLOAD DA LOGO E REMOÇÃO DE FUNDO */}
              <div className="control-field" style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", marginTop: "8px", marginBottom: "12px" }}>
                <span className="control-label-mini" style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <ImageIcon size={13} /> Imagem da Logo da TV:
                </span>

                {/* Prévia da Logo Atual */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px",
                    background: "rgba(0,0,0,0.4)",
                    borderRadius: "6px",
                    border: "1px dashed rgba(255,255,255,0.2)",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "6px",
                      background: "repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {config.logo.image ? (
                      <img
                        src={config.logo.image}
                        alt="Logo Preview"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", fontSize: "10px", color: "#f2c94c", fontWeight: "bold" }}>
                        SOL TV
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#ffffff" }}>
                      {config.logo.image ? "Logo Personalizada" : "Logo Padrão Sol"}
                    </div>
                    <div style={{ fontSize: "10px", color: config.logo.removeBackground ? "#4ade80" : "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                      {config.logo.removeBackground
                        ? "✓ Fundo transparente aplicado"
                        : config.logo.image
                        ? "Imagem carregada"
                        : "Vetor nativo do tema"}
                    </div>
                  </div>
                </div>

                {/* Input de Arquivo */}
                <input
                  type="file"
                  ref={logoFileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />

                {/* Botões de Upload e Ações */}
                <div style={{ display: "grid", gap: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isUploadingLogo}
                    onClick={() => logoFileInputRef.current?.click()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Upload size={14} />
                    <span>
                      {isUploadingLogo
                        ? "Enviando para o Supabase..."
                        : config.logo.image
                        ? "Substituir Imagem da Logo"
                        : "Carregar Imagem da Logo"}
                    </span>
                  </button>

                  {/* Feedback de Upload */}
                  {logoUploadSuccess && (
                    <div style={{ fontSize: "11px", color: "#4ade80", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>✓ {logoUploadSuccess}</span>
                    </div>
                  )}

                  {logoUploadError && (
                    <div style={{ fontSize: "11px", color: "#f87171", background: "rgba(239,68,68,0.1)", padding: "6px 8px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <span>⚠️ {logoUploadError}</span>
                    </div>
                  )}

                  {/* MÓDULO DE REMOÇÃO DE FUNDO */}
                  {config.logo.image && (
                    <div
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(242, 201, 76, 0.25)",
                        marginTop: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#f2c94c", display: "flex", alignItems: "center", gap: "5px" }}>
                          <Wand2 size={13} /> Remoção de Fundo da Logo:
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                          Tolerância: {logoBgTolerance}%
                        </span>
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={logoBgTolerance}
                        onChange={(e) => setLogoBgTolerance(Number(e.target.value))}
                        style={{ width: "100%", marginBottom: "8px" }}
                      />

                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={isRemovingLogoBg}
                        onClick={handleRemoveLogoBg}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          background: "rgba(242, 201, 76, 0.15)",
                          borderColor: "rgba(242, 201, 76, 0.4)",
                          color: "#ffffff",
                        }}
                      >
                        <Wand2 size={14} />
                        <span>{isRemovingLogoBg ? "Removendo Fundo..." : "🪄 Remover Fundo Branco / Sólido"}</span>
                      </button>

                      {logoBgRemovalError && (
                        <div style={{ fontSize: "11px", color: "#f87171", marginTop: "6px" }}>
                          ⚠️ {logoBgRemovalError}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                        {config.logo.originalImage && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleRestoreOriginalLogo}
                            style={{ flex: 1, fontSize: "11px", padding: "4px 8px" }}
                            title="Desfazer remoção de fundo e restaurar arquivo original"
                          >
                            <RotateCcw size={11} />
                            <span>Restaurar Original</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleResetToDefaultSolLogo}
                          style={{ flex: 1, fontSize: "11px", padding: "4px 8px", color: "#f87171" }}
                          title="Remover imagem personalizada e voltar para logo nativa Sol"
                        >
                          <X size={11} />
                          <span>Logo Padrão</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <label>
                Tamanho Base: <strong>{config.logo.size}px</strong>
                <input
                  type="range"
                  min="20"
                  max="450"
                  step="2"
                  value={config.logo.size}
                  onChange={(e) => updateLogo({ size: Number(e.target.value) })}
                />
              </label>

              <label>
                Texto do Setor / Subtítulo
                <input
                  type="text"
                  value={config.logo.sectorText}
                  onChange={(e) => updateLogo({ sectorText: e.target.value })}
                  placeholder="Ex: AÇOUGUE"
                />
              </label>

              <div className="control-field">
                <span className="control-label-mini">Cor do Texto:</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={config.logo.sectorTextColor || "#f2c94c"}
                    onChange={(e) => updateLogo({ sectorTextColor: e.target.value })}
                  />
                  <span className="color-hex-text">
                    {config.logo.sectorTextColor || "#f2c94c"}
                  </span>
                  <div className="color-presets-list">
                    {["#f2c94c", "#ffffff", "#e21b2d", "#3ddc97", "#c4cad2"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-pill ${config.logo.sectorTextColor === c ? "selected" : ""}`}
                        style={{ background: c }}
                        onClick={() => updateLogo({ sectorTextColor: c })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <label>
                Tamanho do Texto: <strong>{config.logo.sectorTextSize}px</strong>
                <input
                  type="range"
                  min="8"
                  max="120"
                  step="1"
                  value={config.logo.sectorTextSize}
                  onChange={(e) => updateLogo({ sectorTextSize: Number(e.target.value) })}
                />
              </label>

              <label>
                Disposição da Assinatura
                <div className="segmented-group">
                  <button
                    type="button"
                    className={config.logo.sectorLayout === "column" ? "active" : ""}
                    onClick={() => updateLogo({ sectorLayout: "column" as SectorLayout })}
                  >
                    Abaixo
                  </button>
                  <button
                    type="button"
                    className={config.logo.sectorLayout === "row" ? "active" : ""}
                    onClick={() => updateLogo({ sectorLayout: "row" as SectorLayout })}
                  >
                    Ao Lado
                  </button>
                  <button
                    type="button"
                    className={config.logo.sectorLayout === "hidden" ? "active" : ""}
                    onClick={() => updateLogo({ sectorLayout: "hidden" as SectorLayout })}
                  >
                    Ocultar
                  </button>
                </div>
              </label>
            </div>
          )}
        </div>
        )}

        {/* 5. SEÇÃO: FÍSICA DO PREÇO */}
        {isSectionVisible("price") && (
        <div className={`accordion-item ${openSections.price ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("price")}
          >
            <div className="accordion-header-title">
              <DollarSign size={15} className="accordion-icon" />
              <span>Preço & Impacto</span>
            </div>
            {openSections.price ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.price && (
            <div className="accordion-body">
              <label>
                Animação de Entrada do Preço
                <div className="segmented-group">
                  <button
                    type="button"
                    className={config.pricePhysics.impact === "impact" ? "active" : ""}
                    onClick={() => updatePricePhysics({ impact: "impact" as PriceImpact })}
                  >
                    Pop + Bounce
                  </button>
                  <button
                    type="button"
                    className={config.pricePhysics.impact === "smooth" ? "active" : ""}
                    onClick={() => updatePricePhysics({ impact: "smooth" as PriceImpact })}
                  >
                    Suave
                  </button>
                  <button
                    type="button"
                    className={config.pricePhysics.impact === "none" ? "active" : ""}
                    onClick={() => updatePricePhysics({ impact: "none" as PriceImpact })}
                  >
                    Estático
                  </button>
                </div>
              </label>

              <label className="toggle-field">
                <span>Reflexo Metálico (Shimmer no Preço)</span>
                <input
                  type="checkbox"
                  checked={config.pricePhysics.shimmer}
                  onChange={(e) => updatePricePhysics({ shimmer: e.target.checked })}
                />
              </label>

              {config.pricePhysics.shimmer && (
                <div className="control-field">
                  <span className="control-label-mini">Tom do Reflexo:</span>
                  <div className="segmented-group">
                    {[
                      { id: "gold", label: "Ouro" },
                      { id: "silver", label: "Prata" },
                      { id: "white", label: "Branco" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={config.pricePhysics.shimmerColor === s.id ? "active" : ""}
                        onClick={() => updatePricePhysics({ shimmerColor: s.id as ShimmerColor })}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 6. SEÇÃO: AMBIENTE & LUZ */}
        {isSectionVisible("ambient") && (
        <div className={`accordion-item ${openSections.ambient ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("ambient")}
          >
            <div className="accordion-header-title">
              <Sparkles size={15} className="accordion-icon" />
              <span>Ambiente & Luz</span>
            </div>
            {openSections.ambient ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.ambient && (
            <div className="accordion-body">
              <label>
                Ciclo do Halo de Fundo: <strong>{config.ambient.speed}s</strong>
                <input
                  type="range"
                  min="8"
                  max="30"
                  step="2"
                  value={config.ambient.speed}
                  onChange={(e) => updateAmbient({ speed: Number(e.target.value) })}
                />
              </label>

              <label>
                Intensidade da Luz / Halo: <strong>{config.ambient.opacity}%</strong>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={config.ambient.opacity}
                  onChange={(e) => updateAmbient({ opacity: Number(e.target.value) })}
                />
              </label>
            </div>
          )}
        </div>
        )}

        {/* 7. SEÇÃO: MOTION & VELOCIDADE */}
        {isSectionVisible("motion") && (
        <div className={`accordion-item ${openSections.motion ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("motion")}
          >
            <div className="accordion-header-title">
              <Play size={15} className="accordion-icon" />
              <span>Motion & Transições</span>
            </div>
            {openSections.motion ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.motion && (
            <div className="accordion-body">
              <label>
                Velocidade Global da Animação
                <div className="segmented-group">
                  {[
                    { value: 0.25, label: "0.25x (Super Lenta)" },
                    { value: 0.5, label: "0.5x (Câmera Lenta)" },
                    { value: 1, label: "1.0x (Tempo Real)" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={config.speed === s.value ? "active" : ""}
                      onClick={() => {
                        onChange((prev) => ({ ...prev, speed: s.value }));
                        onReplay();
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                Transição de Saída (Exit Preset)
                <select
                  value={config.exitPreset}
                  onChange={(e) => {
                    const nextPreset = e.target.value as ExitPreset;
                    onChange((prev) => ({
                      ...prev,
                      exitPreset: nextPreset,
                      paintSwipe: {
                        ...prev.paintSwipe,
                        direction: nextPreset === "paint-swipe-right" ? "right-to-left" : "left-to-right",
                      },
                    }));
                    onReplay();
                  }}
                >
                  {EXIT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              {(config.exitPreset === "paint-swipe" || config.exitPreset === "paint-swipe-right") && (
                <div className="lab-paint-swipe-controls" style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <label>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      Direção da Pincelada
                    </span>
                    <div className="lab-segmented-btn" style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className={config.paintSwipe?.direction !== "right-to-left" && config.exitPreset !== "paint-swipe-right" ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            exitPreset: "paint-swipe",
                            paintSwipe: { ...prev.paintSwipe, direction: "left-to-right" },
                          }));
                          onReplay();
                        }}
                      >
                        Esquerda → Direita
                      </button>
                      <button
                        type="button"
                        className={config.paintSwipe?.direction === "right-to-left" || config.exitPreset === "paint-swipe-right" ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            exitPreset: "paint-swipe-right",
                            paintSwipe: { ...prev.paintSwipe, direction: "right-to-left" },
                          }));
                          onReplay();
                        }}
                      >
                        Direita → Esquerda
                      </button>
                    </div>
                  </label>

                  <label>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      Camadas & Cor da Tinta
                    </span>
                    <div className="lab-segmented-btn" style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className={(!config.paintSwipe?.colorMode || config.paintSwipe?.colorMode === "dual") ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            paintSwipe: { ...prev.paintSwipe, colorMode: "dual" },
                          }));
                          onReplay();
                        }}
                      >
                        Dupla (Preto + Vermelho)
                      </button>
                      <button
                        type="button"
                        className={config.paintSwipe?.colorMode === "red" ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            paintSwipe: { ...prev.paintSwipe, colorMode: "red" },
                          }));
                          onReplay();
                        }}
                      >
                        Vermelho Cartaz
                      </button>
                      <button
                        type="button"
                        className={config.paintSwipe?.colorMode === "black" ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            paintSwipe: { ...prev.paintSwipe, colorMode: "black" },
                          }));
                          onReplay();
                        }}
                      >
                        Preto Cartaz
                      </button>
                    </div>
                  </label>

                  <label>
                    <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      Velocidade da Transição
                    </span>
                    <div className="lab-segmented-btn" style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className={config.paintSwipe?.speed === "smooth" ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            paintSwipe: { ...prev.paintSwipe, speed: "smooth" },
                          }));
                          onReplay();
                        }}
                      >
                        Suave (1.1s)
                      </button>
                      <button
                        type="button"
                        className={(!config.paintSwipe?.speed || config.paintSwipe?.speed === "normal") ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            paintSwipe: { ...prev.paintSwipe, speed: "normal" },
                          }));
                          onReplay();
                        }}
                      >
                        Normal (0.85s)
                      </button>
                      <button
                        type="button"
                        className={config.paintSwipe?.speed === "fast" ? "active" : ""}
                        onClick={() => {
                          onChange((prev) => ({
                            ...prev,
                            paintSwipe: { ...prev.paintSwipe, speed: "fast" },
                          }));
                          onReplay();
                        }}
                      >
                        Rápida (0.6s)
                      </button>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* 8. SEÇÃO: LAYOUT */}
        {isSectionVisible("layout") && (
        <div className={`accordion-item ${openSections.layout ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("layout")}
          >
            <div className="accordion-header-title">
              <LayoutGrid size={15} className="accordion-icon" />
              <span>Layout em Teste</span>
            </div>
            {openSections.layout ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.layout && (
            <div className="accordion-body">
              <div className="segmented-grid-layouts">
                {Object.values(OFFER_LAYOUTS).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`layout-pill-btn ${config.layout === opt.id ? "active" : ""}`}
                    onClick={() => {
                      onChange((prev) => ({ ...prev, layout: opt.id as OfferLayout }));
                      onReplay();
                    }}
                  >
                    <strong>{opt.label}</strong>
                    <small>
                      {opt.productCount} {opt.productCount === 1 ? "produto" : "produtos"}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* 9. SEÇÃO: TEMA BASE */}
        {isSectionVisible("theme") && (
        <div className={`accordion-item ${openSections.theme ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("theme")}
          >
            <div className="accordion-header-title">
              <Palette size={15} className="accordion-icon" />
              <span>Tema Base</span>
            </div>
            {openSections.theme ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.theme && (
            <div className="accordion-body">
              <div className="segmented-group">
                {AVAILABLE_THEMES.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    className={config.themeSlug === t.slug ? "active" : ""}
                    onClick={() => {
                      onChange((prev) => ({ ...prev, themeSlug: t.slug }));
                      onReplay();
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </aside>
  );
}
