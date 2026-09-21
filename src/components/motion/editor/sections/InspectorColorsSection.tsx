import React from "react";
import { Palette, RotateCcw } from "lucide-react";
import type { MotionConfig, ThemeColorOverrides } from "../../../../motion/types";

export interface InspectorColorsSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay?: () => void;
}

export const InspectorColorsSection: React.FC<InspectorColorsSectionProps> = ({
  config,
  onChange,
}) => {
  const overrides: ThemeColorOverrides = config.colorOverrides || {};
  const isEnabled = overrides.enabled !== false;

  const handleColorChange = (key: keyof ThemeColorOverrides, value: string) => {
    onChange((prev) => ({
      ...prev,
      colorOverrides: {
        ...(prev.colorOverrides || {}),
        enabled: true,
        [key]: value,
      },
    }));
  };

  const handleResetColors = () => {
    onChange((prev) => ({
      ...prev,
      colorOverrides: { enabled: false },
    }));
  };

  const colorFields: { key: keyof ThemeColorOverrides; label: string; defaultVal: string }[] = [
    { key: "productName", label: "Nome do Produto", defaultVal: "#ffffff" },
    { key: "price", label: "Preço Promocional", defaultVal: "#ec6f09" },
    { key: "cents", label: "Centavos", defaultVal: "#ec6f09" },
    { key: "currency", label: "Símbolo R$", defaultVal: "#ec6f09" },
    { key: "unit", label: "Unidade (/KG)", defaultVal: "#ec6f09" },
    { key: "oldPrice", label: "Preço Regular / 'De'", defaultVal: "#666666" },
    { key: "strikeColor", label: "Linha de Risco do Preço", defaultVal: "#000000" },
    { key: "capsuleBg", label: "Fundo da Cápsula", defaultVal: "#000000" },
    { key: "capsuleText", label: "Texto da Cápsula", defaultVal: "#ffffff" },
    { key: "sectorText", label: "Texto do Setor", defaultVal: "#f2c94c" },
    { key: "badgeBg", label: "Fundo do Selo / Badge", defaultVal: "#e21b2d" },
    { key: "badgeText", label: "Texto do Selo / Badge", defaultVal: "#ffffff" },
    { key: "background", label: "Cor Geral de Destaque", defaultVal: "#000000" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Enable / Disable Overrides */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          borderRadius: "8px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--skalee-text-primary, #f8fafc)" }}>
            Sobreposição de Cores
          </span>
          <span style={{ fontSize: "11px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Personaliza cores independentemente do tema base
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetColors}
          className="admin-btn-secondary"
          title="Restaurar cores originais do tema"
          style={{ padding: "4px 8px", fontSize: "11px" }}
        >
          <RotateCcw size={12} style={{ marginRight: "4px" }} />
          Restaurar
        </button>
      </div>

      {/* Colors Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {colorFields.map((field) => {
          const val = (overrides[field.key] as string) || field.defaultVal;
          return (
            <div
              key={field.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)", fontWeight: 500 }}>
                {field.label}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="color"
                  value={val}
                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                  style={{
                    width: "32px",
                    height: "28px",
                    padding: 0,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                  style={{
                    width: "72px",
                    padding: "4px 6px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    color: "#fff",
                    textAlign: "center",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
