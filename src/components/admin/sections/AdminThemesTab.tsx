import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Palette, Sliders, Sparkles, HelpCircle } from "lucide-react";
import type { ThemeDefinition } from "../../../themes/types";
import { themeRegistry } from "../../../themes/registry";
import { normalTheme } from "../../../themes/normal";
import {
  ThemeLiveHeroCard,
  ThemeCard,
  ThemePreviewModal,
  ThemeApplyConfirmationModal,
} from "../themes";

export interface AdminThemesTabProps {
  currentSectorLabel: string;
  tvThemeSlug: "normal" | "black-friday";
  onSelectTheme: (slug: "normal" | "black-friday") => void;
}

export const AdminThemesTab: React.FC<AdminThemesTabProps> = ({
  currentSectorLabel,
  tvThemeSlug,
  onSelectTheme,
}) => {
  const [previewTheme, setPreviewTheme] = useState<ThemeDefinition | null>(null);
  const [confirmTheme, setConfirmTheme] = useState<ThemeDefinition | null>(null);

  // Active theme resolved from themeRegistry
  const activeTheme: ThemeDefinition =
    themeRegistry[tvThemeSlug] || normalTheme;

  // Real available themes from themeRegistry (only "normal" and "black-friday")
  const availableThemes: ThemeDefinition[] = Object.values(themeRegistry);

  function handleConfirmApply() {
    if (!confirmTheme) return;
    const slug = confirmTheme.slug as "normal" | "black-friday";
    onSelectTheme(slug);
    setConfirmTheme(null);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. TOP HEADER */}
      <div
        className="admin-card admin-card-elevated"
        style={{
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(168, 85, 247, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--skalee-purple-light, #c084fc)",
                boxShadow: "0 0 16px rgba(168, 85, 247, 0.2)",
              }}
            >
              <Palette size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="admin-section-title" style={{ margin: 0, fontSize: "20px" }}>
                  Temas Visuais
                </h2>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: "rgba(168, 85, 247, 0.12)",
                    color: "var(--skalee-purple-light, #c084fc)",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {availableThemes.length} TEMAS
                </span>
              </div>
              <p className="admin-section-subtitle" style={{ margin: "2px 0 0" }}>
                Escolha a identidade visual utilizada nas TVs do setor <strong>{currentSectorLabel}</strong>.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              to="/studio/motion"
              className="admin-btn-secondary"
              title="Abrir estúdio avançado de animação e layout"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: 600,
                minHeight: "44px",
              }}
            >
              <Sliders size={16} />
              Abrir Motion Studio
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HERO: TEMA ATIVO NO SETOR */}
      <ThemeLiveHeroCard
        activeTheme={activeTheme}
        sectorLabel={currentSectorLabel}
        onOpenPreviewModal={(theme) => setPreviewTheme(theme)}
      />

      {/* 3. SECTION: TEMAS DISPONÍVEIS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: 800,
                color: "var(--skalee-text-primary, #f8fafc)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Sparkles size={18} style={{ color: "var(--skalee-purple-light, #c084fc)" }} />
              Temas Disponíveis
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "12.5px",
                color: "var(--skalee-text-secondary, #94a3b8)",
              }}
            >
              Selecione uma identidade temática para aplicar instantaneamente a todas as telas conectadas.
            </p>
          </div>
        </div>

        {/* Balanced Grid for Available Themes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            maxWidth: "100%",
          }}
        >
          {availableThemes.map((theme) => {
            const isActive = theme.slug === tvThemeSlug;
            return (
              <ThemeCard
                key={theme.slug}
                theme={theme}
                isActive={isActive}
                onOpenPreview={(t) => setPreviewTheme(t)}
                onRequestApply={(t) => setConfirmTheme(t)}
              />
            );
          })}
        </div>
      </div>

      {/* 4. INFORMATIVE FOOTER NOTE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 18px",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          color: "var(--skalee-text-secondary, #94a3b8)",
          fontSize: "12px",
          lineHeight: 1.4,
        }}
      >
        <HelpCircle size={16} style={{ flexShrink: 0, color: "var(--skalee-purple-light, #c084fc)" }} />
        <span>
          <strong>Dica Skalee TV:</strong> As cores, tipografias e molduras de cada tema são calibradas para exibição em Full HD 16:9. Para personalizar animações, velocidades, logos ou transições, utilize o <strong>Motion Studio</strong>.
        </span>
      </div>

      {/* 5. MODAL DE VISUALIZAÇÃO AMPLIADA */}
      {previewTheme && (
        <ThemePreviewModal
          theme={previewTheme}
          isActive={previewTheme.slug === tvThemeSlug}
          sectorLabel={currentSectorLabel}
          onSelectTheme={(slug) => {
            onSelectTheme(slug);
            setPreviewTheme(null);
          }}
          onClose={() => setPreviewTheme(null)}
        />
      )}

      {/* 6. MODAL DE CONFIRMAÇÃO DE TROCA */}
      {confirmTheme && (
        <ThemeApplyConfirmationModal
          theme={confirmTheme}
          sectorLabel={currentSectorLabel}
          onConfirm={handleConfirmApply}
          onClose={() => setConfirmTheme(null)}
        />
      )}
    </div>
  );
};
