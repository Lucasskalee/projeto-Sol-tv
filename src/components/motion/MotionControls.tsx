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
} from "../../motion/types";
import { DEFAULT_MOTION_CONFIG } from "../../motion/defaults";

export type MotionControlsProps = {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
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

export function MotionControls({ config, onChange, onReplay }: MotionControlsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cartazColors: true,
    blackFridayFx: true,
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

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const badgeFileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
    }));
  };

  const updatePricePhysics = (patch: Partial<MotionConfig["pricePhysics"]>) => {
    onChange((prev) => ({
      ...prev,
      pricePhysics: { ...prev.pricePhysics, ...patch },
    }));
    onReplay();
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
      fx: { ...(prev.fx || DEFAULT_MOTION_CONFIG.fx || {}), ...patch },
    }));
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

  // Handlers for Local File Uploads (PNG/JPG -> Data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateLogo({ image: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateBackground({ type: "image", imageUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBadgeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateBadge({ type: "image", image: dataUrl });
      }
    };
    reader.readAsDataURL(file);
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
        {/* A. SEÇÃO: CORES DO CARTAZ (PERSONALIZAÇÃO INDIVIDUAL & PRESETS) */}
        <div className={`accordion-item ${openSections.cartazColors ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("cartazColors")}
          >
            <div className="accordion-header-title">
              <Palette size={15} className="accordion-icon" />
              <span>Cores do Cartaz (Black Friday)</span>
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
                    className={`layout-pill-btn ${!co.enabled || co.background === "#F7F6F2" ? "active" : ""}`}
                    onClick={() => {
                      updateColorOverrides({
                        enabled: true,
                        background: "#F7F6F2",
                        productName: "#111111",
                        price: "#F2381E",
                        currency: "#111111",
                        unit: "#111111",
                        oldPrice: "#444444",
                        strikeColor: "#F2381E",
                        capsuleBg: "#F2381E",
                        capsuleText: "#ffffff",
                        sectorText: "#111111",
                        badgeBg: "#111111",
                        badgeText: "#ffffff",
                      });
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
                        currency: "#000000",
                        unit: "#000000",
                        oldPrice: "#666666",
                        strikeColor: "#000000",
                        capsuleBg: "#000000",
                        capsuleText: "#ffffff",
                        sectorText: "#000000",
                        badgeBg: "#000000",
                        badgeText: "#ffffff",
                      });
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
                        currency: "#E60000",
                        unit: "#111111",
                        oldPrice: "#555555",
                        strikeColor: "#E60000",
                        capsuleBg: "#E60000",
                        capsuleText: "#ffffff",
                        sectorText: "#E60000",
                        badgeBg: "#E60000",
                        badgeText: "#ffffff",
                      });
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
                    onChange={(e) => updateColorOverrides({ background: e.target.value })}
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
                <span className="control-label-mini">Preço Promocional:</span>
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
                <span className="control-label-mini">Cifrão (R$) & Unidade (/kg):</span>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={co.currency || "#111111"}
                    onChange={(e) => updateColorOverrides({ currency: e.target.value, unit: e.target.value })}
                  />
                  <span className="color-hex-text">{co.currency || "#111111"}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="control-label-mini">Traço Cortando o Preço Antigo:</span>
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

        {/* B. SEÇÃO: BLACK FRIDAY FX (DECORAÇÕES OPCIONAIS) */}
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
              {/* 1. Balões Flutuantes Pretos */}
              <label className="toggle-field">
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

        {/* C. SEÇÃO: ANIMAÇÃO DOS ELEMENTOS INDIVIDUAIS */}
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

        {/* 1. SEÇÃO: FUNDO & CORES DA TV */}
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
            </div>
          )}
        </div>

        {/* 2. SEÇÃO: APRESENTAÇÃO DO PRODUTO (SEM QUADRADO / CARDS) */}
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

        {/* 3. SEÇÃO: SELO / BADGE / TAG PROMOCIONAL */}
        <div className={`accordion-item ${openSections.badge ? "open" : ""}`}>
          <button
            type="button"
            className="accordion-header"
            onClick={() => toggleSection("badge")}
          >
            <div className="accordion-header-title">
              <Tag size={15} className="accordion-icon" />
              <span>Selo / Tag Promocional</span>
            </div>
            {openSections.badge ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.badge && (
            <div className="accordion-body">
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
                      min="35"
                      max="140"
                      step="2"
                      value={config.badge.size || 70}
                      onChange={(e) => updateBadge({ size: Number(e.target.value) })}
                    />
                  </label>

                  <label>
                    Inclinação / Rotação: <strong>{config.badge.rotation}°</strong>
                    <input
                      type="range"
                      min="-25"
                      max="25"
                      step="0.5"
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
                      min="-15"
                      max="15"
                      step="0.5"
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
                  min="-60"
                  max="60"
                  step="1"
                  value={config.badge.offsetX || 0}
                  onChange={(e) => updateBadge({ offsetX: Number(e.target.value) })}
                />
              </label>

              <label>
                Ajuste Fino Vertical (Offset Y): <strong>{config.badge.offsetY || 0}px</strong>
                <input
                  type="range"
                  min="-60"
                  max="60"
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

        {/* 4. SEÇÃO: IDENTIDADE DA LOGO */}
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
                Posição da Logo
                <select
                  value={config.logo.position}
                  onChange={(e) => updateLogo({ position: e.target.value as LogoPosition })}
                >
                  <option value="top-left">Topo Esquerdo (Padrão)</option>
                  <option value="top-center">Topo Centralizado</option>
                  <option value="top-right">Topo Direito</option>
                  <option value="bottom-left">Rodapé Esquerdo</option>
                </select>
              </label>

              <div className="control-field">
                <span className="control-label-mini">Logo da TV (PNG sem fundo):</span>
                <input
                  type="file"
                  ref={logoFileInputRef}
                  accept="image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
                <div className="file-upload-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-upload-pill"
                    onClick={() => logoFileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    <span>Upload Logo PNG</span>
                  </button>
                  {config.logo.image && (
                    <button
                      type="button"
                      className="btn-icon-sub delete-btn"
                      onClick={() => updateLogo({ image: undefined })}
                      title="Restaurar logo padrão Sol"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <label>
                Tamanho da Logo: <strong>{config.logo.size}px</strong>
                <input
                  type="range"
                  min="36"
                  max="120"
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
                  min="9"
                  max="24"
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

        {/* 5. SEÇÃO: FÍSICA DO PREÇO */}
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

        {/* 6. SEÇÃO: AMBIENTE & LUZ */}
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

        {/* 7. SEÇÃO: MOTION & VELOCIDADE */}
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

        {/* 8. SEÇÃO: LAYOUT */}
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

        {/* 9. SEÇÃO: TEMA BASE */}
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
      </div>
    </aside>
  );
}
