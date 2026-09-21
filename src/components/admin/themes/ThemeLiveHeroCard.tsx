import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Sliders, Eye, Monitor } from "lucide-react";
import type { ThemeDefinition } from "../../../themes/types";
import { ThemePreview16x9 } from "./ThemePreview16x9";
import { ThemeStatusChip } from "./ThemeStatusChip";
import { ThemePaletteSwatches } from "./ThemePaletteSwatches";

export interface ThemeLiveHeroCardProps {
  activeTheme: ThemeDefinition;
  sectorLabel: string;
  onOpenPreviewModal: (theme: ThemeDefinition) => void;
}

export const ThemeLiveHeroCard: React.FC<ThemeLiveHeroCardProps> = ({
  activeTheme,
  sectorLabel,
  onOpenPreviewModal,
}) => {
  const navigate = useNavigate();
  const isBlackFriday = activeTheme.slug === "black-friday";
  const friendlyName = isBlackFriday ? "Black Friday — Cartaz Digital" : "Sol Premium (Tema Padrão)";
  const categoryLabel = activeTheme.category === "special" ? "Campanha Promocional" : "Institucional";

  return (
    <div
      className="admin-card admin-card-elevated"
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--skalee-border, rgba(168, 85, 247, 0.2))",
        background: "linear-gradient(145deg, rgba(30, 24, 46, 0.7) 0%, rgba(18, 14, 28, 0.9) 100%)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.35)",
        padding: "24px",
      }}
    >
      {/* Top Banner & Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(168, 85, 247, 0.15)",
              color: "var(--skalee-purple-light, #c084fc)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Monitor size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--skalee-purple-light, #c084fc)",
                }}
              >
                Tema Ativo no Setor
              </span>
            </div>
            <h3
              style={{
                margin: "2px 0 0",
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--skalee-text-primary, #f8fafc)",
              }}
            >
              {friendlyName}
            </h3>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ThemeStatusChip isActive={true} size="md" />
          <span
            className="admin-chip"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "var(--skalee-text-secondary, #94a3b8)",
              fontSize: "12px",
            }}
          >
            Setor: <strong style={{ color: "#fff", marginLeft: "4px" }}>{sectorLabel}</strong>
          </span>
        </div>
      </div>

      {/* Main Split Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          alignItems: "center",
        }}
      >
        {/* Left: 16:9 Live Preview */}
        <div style={{ maxWidth: "480px", width: "100%", margin: "0 auto" }}>
          <ThemePreview16x9
            theme={activeTheme}
            interactive={true}
            onClick={() => onOpenPreviewModal(activeTheme)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => onOpenPreviewModal(activeTheme)}
              style={{
                background: "none",
                border: "none",
                color: "var(--skalee-purple-light, #c084fc)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
              }}
            >
              <Eye size={14} />
              Clique para ampliar detalhes do tema
            </button>
          </div>
        </div>

        {/* Right: Metadata & Actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "4px",
                background: isBlackFriday ? "rgba(239, 68, 68, 0.15)" : "rgba(242, 201, 76, 0.15)",
                color: isBlackFriday ? "#fca5a5" : "#f2c94c",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "6px",
              }}
            >
              {categoryLabel}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "13.5px",
                lineHeight: 1.5,
                color: "var(--skalee-text-secondary, #94a3b8)",
              }}
            >
              {isBlackFriday
                ? "Identidade visual temática de liquidação e alto impacto promocional, com cartazes digitais de contraste claro, preços em vermelho e tipografia agressiva."
                : "Identidade institucional elegante e equilibrada com paleta escura, destaques dourados e contraste refinado para apresentações do dia a dia."}
            </p>
          </div>

          {/* Palette Swatches */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.2)",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <ThemePaletteSwatches theme={activeTheme} size="sm" />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "4px",
            }}
          >
            <Link
              to="/studio/motion"
              className="admin-btn-primary"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <Sliders size={16} />
              Personalizar no Motion Studio
            </Link>

            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => onOpenPreviewModal(activeTheme)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                fontSize: "13px",
              }}
            >
              <Eye size={15} />
              Ver Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

