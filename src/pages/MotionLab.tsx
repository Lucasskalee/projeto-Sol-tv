import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TvPlayer } from "../components/TvPlayer";
import { contentFromData, seedOffers } from "../data";
import { OFFER_LAYOUTS, type OfferLayout } from "../offers/layouts";
import { resolveTheme } from "../themes/resolveTheme";
import { themeRegistry } from "../themes/registry";
import type { Offer } from "../types";

const LAB_PRODUCT_OFFERS = [
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

function createLabOffers(): Offer[] {
  return LAB_PRODUCT_OFFERS.map((item, index) => {
    const source = seedOffers[index % seedOffers.length];
    return {
      ...source,
      id: `lab-offer-${index + 1}`,
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

const labContent = contentFromData({
  sector: "acougue",
  offers: createLabOffers(),
  media: [],
});

const AVAILABLE_THEMES = Object.values(themeRegistry);

export default function MotionLab() {
  // Timeline & Playback State
  const [themeSlug, setThemeSlug] = useState<string>("black-friday");
  const [layout, setLayout] = useState<OfferLayout>("hero");
  const [speed, setSpeed] = useState<number>(1);
  const [replayKey, setReplayKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"logo" | "price" | "ambient" | "badge" | "paint">("paint");
  const [copied, setCopied] = useState<boolean>(false);

  // Exit & Paint Swipe State
  const [exitPreset, setExitPreset] = useState<string>("paint-swipe");
  const [paintDirection, setPaintDirection] = useState<"left-to-right" | "right-to-left">("left-to-right");
  const [paintColorMode, setPaintColorMode] = useState<"dual" | "red" | "black">("dual");
  const [paintSpeed, setPaintSpeed] = useState<"smooth" | "normal" | "fast">("normal");

  // Logo & Branding State
  const [logoPosition, setLogoPosition] = useState<"top-left" | "top-center" | "top-right" | "bottom-left">("top-left");
  const [logoSize, setLogoSize] = useState<number>(68);
  const [sectorText, setSectorText] = useState<string>("AÇOUGUE");
  const [sectorTextColor, setSectorTextColor] = useState<string>("#111111");
  const [sectorTextSize, setSectorTextSize] = useState<number>(13);
  const [sectorLayout, setSectorLayout] = useState<"column" | "row" | "hidden">("column");

  // Badge State
  const [badgeText, setBadgeText] = useState<string>("BLACK FRIDAY");
  const [badgeRotation, setBadgeRotation] = useState<number>(3);
  const [badgeBg, setBadgeBg] = useState<string>("#111111");

  // Price Physics State
  const [priceImpact, setPriceImpact] = useState<"impact" | "smooth" | "none">("impact");
  const [priceShimmer, setPriceShimmer] = useState<boolean>(false);
  const [priceShimmerColor, setPriceShimmerColor] = useState<"gold" | "silver" | "white">("gold");

  // Ambient & Background State
  const [ambientSpeed, setAmbientSpeed] = useState<number>(18);
  const [ambientOpacity, setAmbientOpacity] = useState<number>(50);

  // Base Theme resolution
  const baseTheme = resolveTheme(themeSlug);

  // Dynamic Theme overlay with lab overrides
  const labTheme = useMemo(() => {
    return {
      ...baseTheme,
      tokens: {
        ...baseTheme.tokens,
        badge: {
          ...baseTheme.tokens.badge,
          label: badgeText || baseTheme.tokens.badge.label,
          background: badgeBg || baseTheme.tokens.badge.background,
        },
      },
    };
  }, [baseTheme, badgeText, badgeBg]);

  // Dynamic CSS variables applied to the lab preview player container
  const labStyleOverrides = useMemo(() => {
    return {
      "--lab-speed-scale": `${1 / speed}`,
      "--lab-logo-size": `${logoSize}px`,
      "--lab-sector-text-color": sectorTextColor,
      "--lab-sector-text-size": `${sectorTextSize}px`,
      "--lab-badge-rotation": `${badgeRotation}deg`,
      "--lab-ambient-speed": `${ambientSpeed}s`,
      "--lab-ambient-opacity": `${ambientOpacity / 100}`,
      "--lab-shimmer-display": priceShimmer ? "block" : "none",
    } as React.CSSProperties;
  }, [
    speed,
    logoSize,
    sectorTextColor,
    sectorTextSize,
    badgeRotation,
    ambientSpeed,
    ambientOpacity,
    priceShimmer,
  ]);

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  const handleResetDefaults = () => {
    setThemeSlug("black-friday");
    setLayout("hero");
    setSpeed(1);
    setExitPreset("paint-swipe");
    setPaintDirection("left-to-right");
    setPaintColorMode("dual");
    setPaintSpeed("normal");
    setLogoPosition("top-left");
    setLogoSize(68);
    setSectorText("AÇOUGUE");
    setSectorTextColor("#111111");
    setSectorTextSize(13);
    setSectorLayout("column");
    setBadgeText("BLACK FRIDAY");
    setBadgeRotation(3.5);
    setBadgeBg("#111111");
    setPriceImpact("impact");
    setPriceShimmer(false);
    setPriceShimmerColor("white");
    setAmbientSpeed(18);
    setAmbientOpacity(30);
    setReplayKey((k) => k + 1);
  };

  const handleCopyConfig = () => {
    const config = {
      theme: themeSlug,
      layout,
      logo: {
        position: logoPosition,
        size: `${logoSize}px`,
        sectorText,
        sectorTextColor,
        sectorTextSize: `${sectorTextSize}px`,
        sectorLayout,
      },
      badge: {
        text: badgeText,
        rotation: `${badgeRotation}deg`,
        background: badgeBg,
      },
      pricePhysics: {
        impact: priceImpact,
        shimmer: priceShimmer,
        shimmerColor: priceShimmerColor,
      },
      ambient: {
        speed: `${ambientSpeed}s`,
        opacity: `${ambientOpacity}%`,
      },
    };

    void navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="motion-lab-page">
      {/* Top Header Bar */}
      <header className="motion-lab-topbar">
        <div className="lab-title-group">
          <div className="lab-badge-icon">⚡</div>
          <div>
            <h1>Laboratório de Motion & Identidade Visual</h1>
            <p>Ajuste de física, animações, logos e tipografia em tempo real · Skalee TV</p>
          </div>
        </div>

        <div className="lab-header-actions">
          <button
            type="button"
            className="btn btn-secondary lab-btn-compact"
            onClick={handleResetDefaults}
          >
            Restaurar Padrões
          </button>
          <button
            type="button"
            className="btn btn-primary lab-btn-compact"
            onClick={handleCopyConfig}
          >
            {copied ? "✓ Copiado!" : "Copiar Configuração"}
          </button>
          <Link to="/admin" className="btn btn-secondary lab-btn-compact">
            Voltar ao Admin
          </Link>
        </div>
      </header>

      {/* Main Studio Grid */}
      <div className="motion-lab-grid">
        {/* Left Column: Control Panel */}
        <aside className="motion-lab-sidebar">
          {/* Timeline & Replay Card */}
          <section className="lab-card lab-timeline-card">
            <div className="lab-card-title">
              <span>🎬</span>
              <h3>Controle de Animação & Timeline</h3>
            </div>

            <div className="lab-playback-actions">
              <button
                type="button"
                className="btn btn-primary lab-replay-btn"
                onClick={handleReplay}
                title="Executar animação de entrada do início"
              >
                ▶ Replay Animação
              </button>

              <div className="lab-speed-pills">
                <span className="speed-label">Velocidade:</span>
                {[
                  { value: 0.25, label: "0.25x (Super Lenta)" },
                  { value: 0.5, label: "0.5x (Câmera Lenta)" },
                  { value: 1, label: "1.0x (Real)" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`lab-speed-btn ${speed === s.value ? "active" : ""}`}
                    onClick={() => {
                      setSpeed(s.value);
                      handleReplay();
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lab-selectors-row">
              <label>
                Tema Base
                <select
                  value={themeSlug}
                  onChange={(e) => {
                    setThemeSlug(e.target.value);
                    handleReplay();
                  }}
                >
                  {AVAILABLE_THEMES.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Layout em Teste
                <select
                  value={layout}
                  onChange={(e) => {
                    setLayout(e.target.value as OfferLayout);
                    handleReplay();
                  }}
                >
                  {Object.values(OFFER_LAYOUTS).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} ({opt.productCount} prod)
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Tab Navigation for Fine Controls */}
          <div className="lab-control-tabs">
            <button
              type="button"
              className={`lab-tab-btn ${activeTab === "paint" ? "active" : ""}`}
              onClick={() => setActiveTab("paint")}
            >
              🎨 Pincelada de Tinta
            </button>
            <button
              type="button"
              className={`lab-tab-btn ${activeTab === "logo" ? "active" : ""}`}
              onClick={() => setActiveTab("logo")}
            >
              ☀️ Logo & Marca
            </button>
            <button
              type="button"
              className={`lab-tab-btn ${activeTab === "price" ? "active" : ""}`}
              onClick={() => setActiveTab("price")}
            >
              💥 Física do Preço
            </button>
            <button
              type="button"
              className={`lab-tab-btn ${activeTab === "badge" ? "active" : ""}`}
              onClick={() => setActiveTab("badge")}
            >
              🏷️ Selo / Badge
            </button>
            <button
              type="button"
              className={`lab-tab-btn ${activeTab === "ambient" ? "active" : ""}`}
              onClick={() => setActiveTab("ambient")}
            >
              🌌 Fundo & Luz
            </button>
          </div>

          {/* Tab 0: Pincelada de Tinta */}
          {activeTab === "paint" && (
            <section className="lab-card">
              <div className="lab-card-title">
                <span>🎨</span>
                <h3>Pincelada de Tinta (Paint Swipe)</h3>
              </div>

              <div className="lab-control-group">
                <label>
                  Transição de Saída
                  <select
                    value={exitPreset}
                    onChange={(e) => {
                      setExitPreset(e.target.value);
                      if (e.target.value === "paint-swipe-right") {
                        setPaintDirection("right-to-left");
                      } else if (e.target.value === "paint-swipe") {
                        setPaintDirection("left-to-right");
                      }
                      handleReplay();
                    }}
                  >
                    <option value="paint-swipe">Pincelada de Tinta (Esquerda → Direita)</option>
                    <option value="paint-swipe-right">Pincelada de Tinta (Direita → Esquerda)</option>
                    <option value="black-friday-lift">Black Friday Lift (Elegante)</option>
                    <option value="hop-lift">Hop-Lift (Padrão)</option>
                    <option value="fade-out">Fade Out</option>
                  </select>
                </label>

                <label>
                  Direção da Pincelada
                  <div className="lab-segmented-btn">
                    <button
                      type="button"
                      className={paintDirection === "left-to-right" ? "active" : ""}
                      onClick={() => {
                        setPaintDirection("left-to-right");
                        setExitPreset("paint-swipe");
                        handleReplay();
                      }}
                    >
                      Esquerda → Direita
                    </button>
                    <button
                      type="button"
                      className={paintDirection === "right-to-left" ? "active" : ""}
                      onClick={() => {
                        setPaintDirection("right-to-left");
                        setExitPreset("paint-swipe-right");
                        handleReplay();
                      }}
                    >
                      Direita → Esquerda
                    </button>
                  </div>
                </label>

                <label>
                  Camadas & Cores da Tinta
                  <div className="lab-segmented-btn">
                    <button
                      type="button"
                      className={paintColorMode === "dual" ? "active" : ""}
                      onClick={() => {
                        setPaintColorMode("dual");
                        handleReplay();
                      }}
                    >
                      Dupla (Preto + Vermelho)
                    </button>
                    <button
                      type="button"
                      className={paintColorMode === "red" ? "active" : ""}
                      onClick={() => {
                        setPaintColorMode("red");
                        handleReplay();
                      }}
                    >
                      Vermelho Cartaz
                    </button>
                    <button
                      type="button"
                      className={paintColorMode === "black" ? "active" : ""}
                      onClick={() => {
                        setPaintColorMode("black");
                        handleReplay();
                      }}
                    >
                      Preto Cartaz
                    </button>
                  </div>
                </label>

                <label>
                  Velocidade da Pincelada
                  <div className="lab-segmented-btn">
                    <button
                      type="button"
                      className={paintSpeed === "smooth" ? "active" : ""}
                      onClick={() => {
                        setPaintSpeed("smooth");
                        handleReplay();
                      }}
                    >
                      Suave (1.1s)
                    </button>
                    <button
                      type="button"
                      className={paintSpeed === "normal" ? "active" : ""}
                      onClick={() => {
                        setPaintSpeed("normal");
                        handleReplay();
                      }}
                    >
                      Normal (0.85s)
                    </button>
                    <button
                      type="button"
                      className={paintSpeed === "fast" ? "active" : ""}
                      onClick={() => {
                        setPaintSpeed("fast");
                        handleReplay();
                      }}
                    >
                      Rápida (0.6s)
                    </button>
                  </div>
                </label>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "6px" }}
                  onClick={handleReplay}
                >
                  ▶ Disparar Pincelada de Tinta
                </button>
              </div>
            </section>
          )}

          {/* Tab 1: Logo & Branding */}
          {activeTab === "logo" && (
            <section className="lab-card">
              <div className="lab-card-title">
                <span>☀️</span>
                <h3>Logo & Assinatura da TV</h3>
              </div>

              <div className="lab-control-group">
                <label>
                  Posição da Logo
                  <select
                    value={logoPosition}
                    onChange={(e) => setLogoPosition(e.target.value as any)}
                  >
                    <option value="top-left">Topo Esquerdo (Padrão)</option>
                    <option value="top-center">Topo Centralizado</option>
                    <option value="top-right">Topo Direito</option>
                    <option value="bottom-left">Rodapé Esquerdo</option>
                  </select>
                </label>

                <label>
                  Tamanho da Logo: <strong>{logoSize}px</strong>
                  <input
                    type="range"
                    min="36"
                    max="110"
                    step="2"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                  />
                </label>

                <label>
                  Texto do Setor / Subtítulo
                  <input
                    type="text"
                    value={sectorText}
                    onChange={(e) => setSectorText(e.target.value)}
                    placeholder="Ex: AÇOUGUE, OFERTAS DA SEMANA"
                  />
                </label>

                <div className="lab-color-presets-row">
                  <span className="control-sublabel">Cor do Texto:</span>
                  {[
                    { label: "Dourado Sol", color: "#f2c94c" },
                    { label: "Branco Puro", color: "#ffffff" },
                    { label: "Vermelho", color: "#e21b2d" },
                    { label: "Cinza Claro", color: "#c4cad2" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      className={`color-pill ${sectorTextColor === c.color ? "selected" : ""}`}
                      style={{ background: c.color }}
                      onClick={() => setSectorTextColor(c.color)}
                      title={c.label}
                    />
                  ))}
                </div>

                <label>
                  Tamanho do Texto: <strong>{sectorTextSize}px</strong>
                  <input
                    type="range"
                    min="9"
                    max="22"
                    step="1"
                    value={sectorTextSize}
                    onChange={(e) => setSectorTextSize(Number(e.target.value))}
                  />
                </label>

                <label>
                  Disposição do Texto
                  <div className="lab-segmented-btn">
                    <button
                      type="button"
                      className={sectorLayout === "column" ? "active" : ""}
                      onClick={() => setSectorLayout("column")}
                    >
                      Abaixo da Logo
                    </button>
                    <button
                      type="button"
                      className={sectorLayout === "row" ? "active" : ""}
                      onClick={() => setSectorLayout("row")}
                    >
                      Ao Lado
                    </button>
                    <button
                      type="button"
                      className={sectorLayout === "hidden" ? "active" : ""}
                      onClick={() => setSectorLayout("hidden")}
                    >
                      Ocultar Texto
                    </button>
                  </div>
                </label>
              </div>
            </section>
          )}

          {/* Tab 2: Price Physics */}
          {activeTab === "price" && (
            <section className="lab-card">
              <div className="lab-card-title">
                <span>💥</span>
                <h3>Física & Microanimações do Preço</h3>
              </div>

              <div className="lab-control-group">
                <label>
                  Impacto de Entrada do Preço
                  <div className="lab-segmented-btn">
                    <button
                      type="button"
                      className={priceImpact === "impact" ? "active" : ""}
                      onClick={() => {
                        setPriceImpact("impact");
                        handleReplay();
                      }}
                    >
                      Pop + Bounce (Forte)
                    </button>
                    <button
                      type="button"
                      className={priceImpact === "smooth" ? "active" : ""}
                      onClick={() => {
                        setPriceImpact("smooth");
                        handleReplay();
                      }}
                    >
                      Suave (Fade + Scale)
                    </button>
                    <button
                      type="button"
                      className={priceImpact === "none" ? "active" : ""}
                      onClick={() => {
                        setPriceImpact("none");
                        handleReplay();
                      }}
                    >
                      Estático
                    </button>
                  </div>
                </label>

                <label className="lab-toggle-row">
                  <span>Reflexo Metálico (Shimmer de Luz no Preço)</span>
                  <input
                    type="checkbox"
                    checked={priceShimmer}
                    onChange={(e) => {
                      setPriceShimmer(e.target.checked);
                      handleReplay();
                    }}
                  />
                </label>

                {priceShimmer && (
                  <div className="lab-color-presets-row">
                    <span className="control-sublabel">Tom do Brilho:</span>
                    {[
                      { id: "gold", label: "Ouro Sol" },
                      { id: "silver", label: "Prata Metálica" },
                      { id: "white", label: "Branco Puro" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`lab-mini-tag ${priceShimmerColor === s.id ? "active" : ""}`}
                        onClick={() => {
                          setPriceShimmerColor(s.id as any);
                          handleReplay();
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tab 3: Badge / Selo */}
          {activeTab === "badge" && (
            <section className="lab-card">
              <div className="lab-card-title">
                <span>🏷️</span>
                <h3>Selo & Badge Promocional</h3>
              </div>

              <div className="lab-control-group">
                <label>
                  Texto do Selo
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Ex: OFERTA, BLACK FRIDAY"
                  />
                </label>

                <label>
                  Inclinação / Rotação: <strong>{badgeRotation}°</strong>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={badgeRotation}
                    onChange={(e) => setBadgeRotation(Number(e.target.value))}
                  />
                </label>

                <div className="lab-color-presets-row">
                  <span className="control-sublabel">Cor de Fundo:</span>
                  {[
                    { label: "Vermelho Black Friday", color: "#e21b2d" },
                    { label: "Vinho Escuro", color: "#9e0e1c" },
                    { label: "Dourado Sol", color: "#f2c94c" },
                    { label: "Verde Oferta", color: "#2ea043" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      className={`color-pill ${badgeBg === c.color ? "selected" : ""}`}
                      style={{ background: c.color }}
                      onClick={() => setBadgeBg(c.color)}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Tab 4: Ambient & Background */}
          {activeTab === "ambient" && (
            <section className="lab-card">
              <div className="lab-card-title">
                <span>🌌</span>
                <h3>Ambient Motion & Luz de Fundo</h3>
              </div>

              <div className="lab-control-group">
                <label>
                  Ciclo de Respiração do Halo: <strong>{ambientSpeed}s</strong>
                  <input
                    type="range"
                    min="8"
                    max="30"
                    step="2"
                    value={ambientSpeed}
                    onChange={(e) => setAmbientSpeed(Number(e.target.value))}
                  />
                </label>

                <label>
                  Intensidade da Luz / Brilho: <strong>{ambientOpacity}%</strong>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={ambientOpacity}
                    onChange={(e) => setAmbientOpacity(Number(e.target.value))}
                  />
                </label>
              </div>
            </section>
          )}
        </aside>

        {/* Right Column: Live 16:9 Canvas */}
        <main className="motion-lab-canvas-area">
          <div className="canvas-frame-header">
            <div className="frame-meta">
              <span className="live-indicator">● AO VIVO (16:9)</span>
              <strong>{baseTheme.name}</strong> · Layout: {layout.toUpperCase()} · Vel: {speed}x
            </div>
            <div className="frame-shortcuts">
              <small>Pressione <strong>F</strong> para tela cheia · Duplo clique para expandir</small>
            </div>
          </div>

          <div
            className={`motion-lab-player-wrapper lab-pos-${logoPosition} lab-sector-${sectorLayout} lab-impact-${priceImpact}`}
            style={labStyleOverrides}
            key={`lab-player-key-${replayKey}`}
          >
            <TvPlayer
              content={labContent}
              mode="preview"
              connection="online"
              sectorLabel={sectorText}
              theme={labTheme}
              layoutOverride={layout}
              motionConfig={{
                themeSlug,
                layout,
                speed,
                exitPreset: exitPreset as any,
                logo: {
                  position: logoPosition,
                  size: logoSize,
                  sectorText,
                  sectorTextColor,
                  sectorTextSize,
                  sectorLayout,
                },
                badge: {
                  type: "text",
                  text: badgeText,
                  rotation: badgeRotation,
                  background: badgeBg,
                },
                background: {
                  type: "solid",
                  color: "#F7F6F2",
                  gradientStart: "#FFFFFF",
                  gradientEnd: "#F7F6F2",
                  gradientAngle: 180,
                },
                productCard: {
                  style: "transparent",
                },
                pricePhysics: {
                  impact: priceImpact,
                  shimmer: priceShimmer,
                  shimmerColor: priceShimmerColor,
                },
                ambient: {
                  speed: ambientSpeed,
                  opacity: ambientOpacity,
                },
                paintSwipe: {
                  direction: paintDirection,
                  colorMode: paintColorMode,
                  speed: paintSpeed,
                },
              }}
            />
          </div>

          <div className="lab-footer-summary">
            <div className="summary-item">
              <span className="label">Logo:</span>
              <span className="val">{logoSize}px ({logoPosition})</span>
            </div>
            <div className="summary-item">
              <span className="label">Física Preço:</span>
              <span className="val">{priceImpact.toUpperCase()} · Shimmer {priceShimmer ? "ON" : "OFF"}</span>
            </div>
            <div className="summary-item">
              <span className="label">Ambient:</span>
              <span className="val">Ciclo {ambientSpeed}s ({ambientOpacity}%)</span>
            </div>
            <div className="summary-item">
              <span className="label">Selo:</span>
              <span className="val">{badgeText} ({badgeRotation}°)</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

