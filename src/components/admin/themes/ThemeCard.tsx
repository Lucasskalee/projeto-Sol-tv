import React from "react";
import { Link } from "react-router-dom";
import { Check, Eye, Sliders, Sparkles, Flame } from "lucide-react";
import type { ThemeDefinition } from "../../../themes/types";
import { ThemePreview16x9 } from "./ThemePreview16x9";
import { ThemeStatusChip } from "./ThemeStatusChip";
import { ThemePaletteSwatches } from "./ThemePaletteSwatches";

export interface ThemeCardProps {
  theme: ThemeDefinition;
  isActive: boolean;
  onOpenPreview: (theme: ThemeDefinition) => void;
  onRequestApply: (theme: ThemeDefinition) => void;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({
  theme,
  isActive,
  onOpenPreview,
  onRequestApply,
}) => {
  const isBlackFriday = theme.slug === "black-friday";
  const friendlyName = isBlackFriday ? "Black Friday" : "Sol Premium";
  const categoryLabel = theme.category === "special" ? "Campanha promocional" : "Institucional";

  return (
    <div
      className={`admin-card ${isActive ? "admin-card-elevated" : ""}`}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: "14px",
        overflow: "hidden",
        border: isActive
          ? isBlackFriday
            ? "2px solid #ef4444"
            : "2px solid var(--skalee-purple, #a855f7)"
          : "1px solid var(--skalee-border, rgba(255, 255, 255, 0.08))",
        background: "var(--skalee-card-bg, #151821)",
        boxShadow: isActive
          ? isBlackFriday
            ? "0 0 24px rgba(239, 68, 68, 0.25)"
            : "0 0 24px rgba(168, 85, 247, 0.2)"
          : "0 4px 16px rgba(0, 0, 0, 0.2)",
        transition: "all 0.25s ease",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* 16:9 Preview Section */}
      <div style={{ position: "relative", width: "100%", padding: "12px 12px 0" }}>
        <ThemePreview16x9
          theme={theme}
          interactive={true}
          onClick={() => onOpenPreview(theme)}
        />
        <button
          type="button"
          onClick={() => onOpenPreview(theme)}
          title="Clique para ampliar o preview"
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#fff",
            borderRadius: "6px",
            padding: "5px 8px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            zIndex: 2,
          }}
        >
          <Eye size={12} />
          Ampliar
        </button>
      </div>

      {/* Card Info Body */}
      <div
        style={{
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flex: 1,
        }}
      >
        {/* Header: Name, Category, Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: isBlackFriday ? "rgba(239, 68, 68, 0.15)" : "rgba(242, 201, 76, 0.15)",
                  color: isBlackFriday ? "#f87171" : "#f2c94c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isBlackFriday ? <Flame size={16} /> : <Sparkles size={16} />}
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "var(--skalee-text-primary, #f8fafc)",
                  }}
                >
                  {friendlyName}
                </h3>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "var(--skalee-text-secondary, #94a3b8)",
                  }}
                >
                  {categoryLabel}
                </span>
              </div>
            </div>
          </div>

          <ThemeStatusChip isActive={isActive} size="sm" />
        </div>

        {/* Short description */}
        <p
          style={{
            margin: 0,
            fontSize: "12.5px",
            lineHeight: 1.45,
            color: "var(--skalee-text-secondary, #94a3b8)",
          }}
        >
          {isBlackFriday
            ? "Cartaz digital claro com contraste preto & vermelho, transições enérgicas e decorações de liquidação."
            : "Visual escuro equilibrado com acentos dourados, tipografia nítida e cartões com sombras suaves."}
        </p>

        {/* Palette */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <ThemePaletteSwatches theme={theme} size="sm" />
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: "12px 18px 16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(255, 255, 255, 0.01)",
        }}
      >
        {/* Main action: Usar este Tema or Em Exibição */}
        {isActive ? (
          <button
            type="button"
            disabled
            className="admin-btn-primary"
            style={{
              flex: 1,
              justifyContent: "center",
              fontSize: "13px",
              opacity: 0.9,
              cursor: "default",
              minHeight: "44px",
            }}
          >
            <Check size={16} style={{ marginRight: "6px" }} />
            Tema em Exibição
          </button>
        ) : (
          <button
            type="button"
            className="admin-btn-primary"
            onClick={() => onRequestApply(theme)}
            style={{
              flex: 1,
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              minHeight: "44px",
              background: isBlackFriday ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" : undefined,
              boxShadow: isBlackFriday ? "0 4px 14px rgba(239, 68, 68, 0.3)" : undefined,
            }}
          >
            Usar este Tema
          </button>
        )}

        {/* Motion Studio shortcut */}
        <Link
          to="/studio/motion"
          className="admin-btn-secondary"
          title="Personalizar detalhes no Motion Studio"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "12.5px",
            padding: "0 12px",
            minHeight: "44px",
            flexShrink: 0,
          }}
        >
          <Sliders size={15} />
          <span style={{ display: "inline" }}>Personalizar</span>
        </Link>
      </div>
    </div>
  );
};

