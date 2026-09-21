import React from "react";
import { LayoutGrid } from "lucide-react";
import { OFFER_LAYOUTS, type OfferLayoutDefinition } from "../../../../offers/layouts";
import { EXIT_PRESETS, type ExitPreset } from "../../../../transitions";
import type { MotionConfig, ProductCardStyle } from "../../../../motion/types";
import { themeRegistry } from "../../../../themes/registry";

export interface InspectorLayoutSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
}

const CARD_STYLES: { id: ProductCardStyle; label: string; desc: string }[] = [
  { id: "transparent", label: "Transparente", desc: "Sem fundo sólido no card" },
  { id: "glass", label: "Vidro / Glass", desc: "Efeito translúcido com desfoque" },
  { id: "card", label: "Card Sólido", desc: "Painel escuro encorpado" },
  { id: "bordered", label: "Borda Fina", desc: "Destaque apenas no contorno" },
];

export const InspectorLayoutSection: React.FC<InspectorLayoutSectionProps> = ({
  config,
  onChange,
  onReplay,
}) => {
  const currentTheme = themeRegistry[config.themeSlug] || themeRegistry["normal"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Base Layout Selection */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--skalee-text-secondary, #94a3b8)",
            marginBottom: "8px",
          }}
        >
          Grade de Produtos (Layout)
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
          {(Object.values(OFFER_LAYOUTS) as OfferLayoutDefinition[]).map((item) => {
            const isSelected = config.layout === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange((prev) => ({ ...prev, layout: item.id }));
                  onReplay();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: isSelected ? "rgba(168, 85, 247, 0.18)" : "rgba(255, 255, 255, 0.03)",
                  border: isSelected ? "1px solid var(--skalee-purple, #a855f7)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "#fff" : "var(--skalee-text-secondary, #94a3b8)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
                  <LayoutGrid size={14} style={{ color: isSelected ? "var(--skalee-purple-light, #c084fc)" : undefined }} />
                  <span style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 600 }}>{item.label}</span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--skalee-text-secondary, #94a3b8)", marginTop: "2px" }}>
                  {item.productCount} {item.productCount === 1 ? "produto" : "produtos"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Playback Speed */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--skalee-text-secondary, #94a3b8)",
            marginBottom: "8px",
          }}
        >
          Velocidade da Animação
        </label>
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { value: 0.25, label: "0.25x (Super Lenta)" },
            { value: 0.5, label: "0.5x (Lenta)" },
            { value: 1, label: "1.0x (Padrão)" },
          ].map((s) => {
            const isSelected = (config.speed || 1) === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  onChange((prev) => ({ ...prev, speed: s.value }));
                  onReplay();
                }}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? "var(--skalee-purple, #a855f7)" : "rgba(255, 255, 255, 0.04)",
                  border: isSelected ? "1px solid var(--skalee-purple-light, #c084fc)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "#fff" : "var(--skalee-text-secondary, #94a3b8)",
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Exit Animation Preset */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--skalee-text-secondary, #94a3b8)",
            marginBottom: "6px",
          }}
        >
          Transição de Saída da Tela
        </label>
        <select
          className="admin-input"
          value={config.exitPreset || "hop-lift"}
          onChange={(e) => {
            onChange((prev) => ({ ...prev, exitPreset: e.target.value as ExitPreset }));
            onReplay();
          }}
          style={{ width: "100%" }}
        >
          {EXIT_PRESETS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Product Card Style */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--skalee-text-secondary, #94a3b8)",
            marginBottom: "8px",
          }}
        >
          Estilo dos Cards de Produto
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {CARD_STYLES.map((style) => {
            const isSelected = (config.productCard?.style || "transparent") === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onChange((prev) => ({
                    ...prev,
                    productCard: {
                      ...(prev.productCard || { style: "transparent" }),
                      style: style.id,
                    },
                  }));
                  onReplay();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: isSelected ? "rgba(168, 85, 247, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  border: isSelected ? "1px solid var(--skalee-purple, #a855f7)" : "1px solid rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "12.5px", fontWeight: 600, color: isSelected ? "#fff" : "var(--skalee-text-secondary, #94a3b8)" }}>
                  {style.label}
                </span>
                <span style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.4)", marginTop: "2px" }}>
                  {style.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
