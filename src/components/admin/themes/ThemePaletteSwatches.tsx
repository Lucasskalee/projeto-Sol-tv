import React from "react";
import type { ThemeDefinition } from "../../../themes/types";

export interface ThemePaletteSwatchesProps {
  theme: ThemeDefinition;
  size?: "sm" | "md";
}

export const ThemePaletteSwatches: React.FC<ThemePaletteSwatchesProps> = ({
  theme,
  size = "md",
}) => {
  const { tokens } = theme;
  const isSm = size === "sm";
  const circleSize = isSm ? 16 : 20;

  const swatches = [
    {
      label: "Fundo",
      color: tokens.colors.background,
      desc: "Cor base da tela",
    },
    {
      label: "Card",
      color: tokens.colors.panel,
      desc: "Painel do produto",
    },
    {
      label: "Texto",
      color: tokens.colors.text,
      desc: "Tipografia principal",
    },
    {
      label: "Preço",
      color: tokens.priceStyle.color,
      desc: "Realce numérico da oferta",
    },
    {
      label: "Destaque",
      color: tokens.colors.accent,
      desc: "Acentos e decorações",
    },
    {
      label: "Badge",
      color: tokens.badge.background,
      desc: "Etiqueta promocional",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <span
        style={{
          fontSize: isSm ? "10px" : "11px",
          fontWeight: 600,
          color: "var(--skalee-text-secondary, #94a3b8)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Paleta Visual
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isSm ? "6px" : "8px",
          flexWrap: "wrap",
        }}
      >
        {swatches.map((swatch, idx) => (
          <div
            key={idx}
            title={`${swatch.label}: ${swatch.color} (${swatch.desc})`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              padding: isSm ? "2px 6px 2px 3px" : "3px 8px 3px 4px",
            }}
          >
            <span
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                borderRadius: "4px",
                backgroundColor: swatch.color,
                border: "1px solid rgba(0, 0, 0, 0.25)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: isSm ? "10px" : "11px",
                color: "var(--skalee-text-primary, #f8fafc)",
                fontWeight: 500,
              }}
            >
              {swatch.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

