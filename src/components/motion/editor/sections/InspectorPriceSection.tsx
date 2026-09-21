import React from "react";
import { DollarSign, Sparkles, Flame, Info } from "lucide-react";
import type { MotionConfig, PriceImpact, ShimmerColor } from "../../../../motion/types";

export interface InspectorPriceSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
}

export const InspectorPriceSection: React.FC<InspectorPriceSectionProps> = ({
  config,
  onChange,
  onReplay,
}) => {
  const price = config.pricePhysics || {
    impact: "impact" as PriceImpact,
    shimmer: true,
    shimmerColor: "gold" as ShimmerColor,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Informative Note */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          padding: "10px 12px",
          borderRadius: "8px",
          background: "rgba(168, 85, 247, 0.08)",
          border: "1px solid rgba(168, 85, 247, 0.2)",
          fontSize: "12px",
          color: "var(--skalee-text-secondary, #94a3b8)",
          lineHeight: 1.45,
        }}
      >
        <Info size={16} style={{ color: "var(--skalee-purple-light, #c084fc)", flexShrink: 0, marginTop: "2px" }} />
        <span>
          O Motion Studio calibra a <strong>física, sombras e acabamento visual</strong> do preço. Os valores comerciais são definidos na aba Ofertas.
        </span>
      </div>

      {/* 1. Impact Mode */}
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
          Impacto de Entrada do Preço
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { id: "impact" as PriceImpact, label: "Pop + Bounce (Impacto Forte)", desc: "Entrada enérgica com rebote característico de ofertas" },
            { id: "smooth" as PriceImpact, label: "Suave (Fade + Scale)", desc: "Entrada elegante e discreta sem salto" },
            { id: "none" as PriceImpact, label: "Estático", desc: "Sem animação de impacto" },
          ].map((item) => {
            const isSelected = (price.impact || "impact") === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange((prev) => ({
                    ...prev,
                    pricePhysics: { ...(prev.pricePhysics || price), impact: item.id },
                  }));
                  onReplay();
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: isSelected ? "rgba(168, 85, 247, 0.18)" : "rgba(255, 255, 255, 0.02)",
                  border: isSelected ? "1px solid var(--skalee-purple, #a855f7)" : "1px solid rgba(255, 255, 255, 0.06)",
                  color: isSelected ? "#fff" : "var(--skalee-text-secondary, #94a3b8)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 500 }}>{item.label}</span>
                <span style={{ fontSize: "11px", color: "var(--skalee-text-secondary, #94a3b8)", marginTop: "2px" }}>
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Shimmer Light Reflection */}
      <div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            color: "#fff",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          <input
            type="checkbox"
            checked={price.shimmer !== false}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                pricePhysics: { ...(prev.pricePhysics || price), shimmer: e.target.checked },
              }));
              onReplay();
            }}
          />
          <span>Ativar Reflexo Metálico (Shimmer de Luz no Preço)</span>
        </label>

        {price.shimmer !== false && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "24px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--skalee-text-secondary, #94a3b8)", textTransform: "uppercase" }}>
              Tom do Brilho
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {[
                { id: "gold" as ShimmerColor, label: "Ouro Sol", color: "#f2c94c" },
                { id: "silver" as ShimmerColor, label: "Prata", color: "#e2e8f0" },
                { id: "white" as ShimmerColor, label: "Branco Puro", color: "#ffffff" },
              ].map((s) => {
                const isSelected = (price.shimmerColor || "gold") === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onChange((prev) => ({
                        ...prev,
                        pricePhysics: { ...(prev.pricePhysics || price), shimmerColor: s.id },
                      }));
                      onReplay();
                    }}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      border: isSelected ? "1px solid var(--skalee-purple, #a855f7)" : "1px solid rgba(255, 255, 255, 0.06)",
                      color: isSelected ? "#fff" : "var(--skalee-text-secondary, #94a3b8)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
