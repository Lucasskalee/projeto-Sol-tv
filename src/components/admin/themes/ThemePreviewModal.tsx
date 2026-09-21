import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Check, Sliders, Palette, Eye, Type, Square, Tag } from "lucide-react";
import type { ThemeDefinition } from "../../../themes/types";
import { ThemePreview16x9 } from "./ThemePreview16x9";
import { ThemeStatusChip } from "./ThemeStatusChip";
import { ThemePaletteSwatches } from "./ThemePaletteSwatches";

export interface ThemePreviewModalProps {
  theme: ThemeDefinition;
  isActive: boolean;
  sectorLabel: string;
  onSelectTheme: (slug: "normal" | "black-friday") => void;
  onClose: () => void;
}

export const ThemePreviewModal: React.FC<ThemePreviewModalProps> = ({
  theme,
  isActive,
  sectorLabel,
  onSelectTheme,
  onClose,
}) => {
  const isBlackFriday = theme.slug === "black-friday";
  const friendlyName = isBlackFriday ? "Black Friday — Cartaz Digital" : "Sol Premium (Tema Padrão)";
  const categoryLabel = theme.category === "special" ? "Campanha Promocional" : "Institucional";
  const { tokens } = theme;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="admin-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="admin-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-preview-title"
        style={{
          width: "100%",
          maxWidth: "760px",
          background: "var(--skalee-card-bg, #181424)",
          border: "1px solid var(--skalee-border, rgba(168, 85, 247, 0.3))",
          borderRadius: "18px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.2s ease-out",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: isBlackFriday ? "rgba(239, 68, 68, 0.15)" : "rgba(168, 85, 247, 0.15)",
                color: isBlackFriday ? "#f87171" : "var(--skalee-purple-light, #c084fc)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Palette size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3
                  id="theme-preview-title"
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 800,
                    color: "var(--skalee-text-primary, #f8fafc)",
                  }}
                >
                  {friendlyName}
                </h3>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.06)",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "var(--skalee-text-secondary, #94a3b8)",
                    textTransform: "uppercase",
                  }}
                >
                  {categoryLabel}
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
                Slug do Tema: <code style={{ color: "var(--skalee-purple-light, #c084fc)" }}>{theme.slug}</code>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ThemeStatusChip isActive={isActive} size="md" />
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--skalee-text-secondary, #94a3b8)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* 16:9 Large Preview */}
          <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
            <ThemePreview16x9 theme={theme} />
          </div>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: "13.5px",
              lineHeight: 1.5,
              color: "var(--skalee-text-secondary, #94a3b8)",
              textAlign: "center",
            }}
          >
            {isBlackFriday
              ? "Visual promocional de alta agressividade comercial, ideal para campanhas relâmpago, datas festivas e queimas de estoque com alto contraste."
              : "Identidade visual elegante para o dia a dia do Supermercado Sol, com paleta escura que destaca os produtos e preços com sobriedade."}
          </p>

          {/* Color Palette */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <ThemePaletteSwatches theme={theme} size="md" />
          </div>

          {/* Token Specifications Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--skalee-purple-light, #c084fc)", marginBottom: "4px" }}>
                <Type size={14} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Tipografia</span>
              </div>
              <div style={{ fontSize: "12px", color: "#fff", fontWeight: 600 }}>Inter Sans-serif</div>
              <div style={{ fontSize: "11px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
                Caixa: {tokens.typography.headingTransform === "uppercase" ? "MAIÚSCULA" : "Padrão"}
              </div>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--skalee-purple-light, #c084fc)", marginBottom: "4px" }}>
                <Square size={14} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Cartão / Card</span>
              </div>
              <div style={{ fontSize: "12px", color: "#fff", fontWeight: 600 }}>
                Borda: {tokens.cardStyle.borderRadius}
              </div>
              <div style={{ fontSize: "11px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
                Sombra calibrada Full HD
              </div>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--skalee-purple-light, #c084fc)", marginBottom: "4px" }}>
                <Tag size={14} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Badge & Preço</span>
              </div>
              <div style={{ fontSize: "12px", color: "#fff", fontWeight: 600 }}>
                Etiqueta: {tokens.badge.label}
              </div>
              <div style={{ fontSize: "11px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
                Cor do preço: {tokens.priceStyle.color}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <Link
            to="/studio/motion"
            className="admin-btn-secondary"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              minHeight: "44px",
              padding: "0 16px",
            }}
          >
            <Sliders size={16} />
            Personalizar no Motion Studio
          </Link>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                fontSize: "13px",
                minHeight: "44px",
              }}
            >
              Fechar
            </button>

            {!isActive ? (
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => {
                  onSelectTheme(theme.slug as "normal" | "black-friday");
                  onClose();
                }}
                style={{
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  minHeight: "44px",
                  background: isBlackFriday ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" : undefined,
                }}
              >
                <Check size={16} style={{ marginRight: "6px" }} />
                Aplicar às TVs ({sectorLabel})
              </button>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0 16px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#4ade80",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                <Check size={16} />
                Em Exibição no Setor
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

