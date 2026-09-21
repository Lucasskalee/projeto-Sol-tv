import React from "react";
import {
  LayoutGrid,
  Eye,
  Sun,
  Palette,
  Type,
  DollarSign,
  Image as ImageIcon,
  Sparkles,
  Shield,
  Bookmark,
  Sliders,
} from "lucide-react";

export type MotionCategoryKey =
  | "layout"
  | "elements"
  | "background"
  | "colors"
  | "text"
  | "price"
  | "image"
  | "motion"
  | "identity"
  | "presets"
  | "tuning";

export type MotionEditorCategory = MotionCategoryKey;

export interface MotionCategoryItem {
  key: MotionCategoryKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
}

export const MOTION_CATEGORIES: MotionCategoryItem[] = [
  {
    key: "layout",
    label: "Layout & Grades",
    shortLabel: "Layout",
    icon: LayoutGrid,
    description: "Grades de 1, 2, 3, 4 e 8 produtos e velocidade",
  },
  {
    key: "elements",
    label: "Elementos Visíveis",
    shortLabel: "Elementos",
    icon: Eye,
    description: "Visibilidade de cards, logos, selos e preços",
  },
  {
    key: "background",
    label: "Fundo da TV",
    shortLabel: "Fundo",
    icon: Sun,
    description: "Sólido, gradiente, imagem e raios Sunburst",
  },
  {
    key: "colors",
    label: "Cores & Cartaz",
    shortLabel: "Cores",
    icon: Palette,
    description: "Paleta do produto, preços, capsulas e contrastes",
  },
  {
    key: "text",
    label: "Texto & Slogan",
    shortLabel: "Texto",
    icon: Type,
    description: "Subtítulo da loja, tipografia e pinceladas",
  },
  {
    key: "price",
    label: "Preço & Física",
    shortLabel: "Preço",
    icon: DollarSign,
    description: "Física de impacto, reflexo metálico e sombras",
  },
  {
    key: "image",
    label: "Imagem & Temática",
    shortLabel: "Imagem",
    icon: ImageIcon,
    description: "Imagem promocional, Black Friday e removedor de fundo",
  },
  {
    key: "motion",
    label: "Motion & Efeitos",
    shortLabel: "Motion",
    icon: Sparkles,
    description: "Coreografia de entrada, Paint Swipe e faíscas",
  },
  {
    key: "identity",
    label: "Identidade & Logo",
    shortLabel: "Identidade",
    icon: Shield,
    description: "Logo da loja, posição, setor e selo da oferta",
  },
  {
    key: "presets",
    label: "Presets & Estilos",
    shortLabel: "Presets",
    icon: Bookmark,
    description: "Biblioteca de configurações salvas",
  },
  {
    key: "tuning",
    label: "Ajustes Finos",
    shortLabel: "Ajustes",
    icon: Sliders,
    description: "Calibração pixel a pixel de posições e escalas",
  },
];

export interface MotionCategoryNavProps {
  activeCategory: MotionCategoryKey;
  onSelectCategory: (key: MotionCategoryKey) => void;
  orientation?: "vertical" | "horizontal";
}

export const MotionCategoryNav: React.FC<MotionCategoryNavProps> = ({
  activeCategory,
  onSelectCategory,
  orientation = "vertical",
}) => {
  const isVertical = orientation === "vertical";

  if (!isVertical) {
    // Horizontal pill bar for Mobile & Compact Views
    return (
      <nav
        className="motion-nav-horizontal motion-category-nav"
        aria-label="Ferramentas do Motion Studio"
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          padding: "8px 12px",
          background: "var(--skalee-sidebar-bg, #0d1017)",
          borderBottom: "1px solid var(--skalee-border, rgba(255, 255, 255, 0.08))",
          scrollbarWidth: "none",
        }}
      >
        {MOTION_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              className={`motion-category-pill motion-category-btn ${isActive ? "active" : ""}`}
              onClick={() => onSelectCategory(cat.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "20px",
                whiteSpace: "nowrap",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                background: isActive
                  ? "var(--skalee-purple, #a855f7)"
                  : "rgba(255, 255, 255, 0.05)",
                color: isActive ? "#ffffff" : "var(--skalee-text-secondary, #94a3b8)",
                border: isActive
                  ? "1px solid var(--skalee-purple-light, #c084fc)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={14} />
              <span>{cat.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Vertical slim icon sidebar for Desktop (76px width)
  return (
    <aside
      className="motion-nav-vertical motion-category-nav"
      aria-label="Ferramentas do Motion Studio"
      style={{
        width: "76px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 6px",
        background: "var(--skalee-sidebar-bg, #0d1017)",
        borderRight: "1px solid var(--skalee-border, rgba(255, 255, 255, 0.08))",
        gap: "6px",
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
        zIndex: 10,
        scrollbarWidth: "none",
      }}
    >
      {MOTION_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = activeCategory === cat.key;
        return (
          <button
            key={cat.key}
            type="button"
            className={`motion-category-btn ${isActive ? "active" : ""}`}
            onClick={() => onSelectCategory(cat.key)}
            title={`${cat.label} — ${cat.description}`}
            style={{
              width: "60px",
              height: "56px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              borderRadius: "10px",
              background: isActive
                ? "rgba(168, 85, 247, 0.18)"
                : "transparent",
              border: isActive
                ? "1px solid var(--skalee-purple, #a855f7)"
                : "1px solid transparent",
              color: isActive
                ? "var(--skalee-purple-light, #c084fc)"
                : "var(--skalee-text-secondary, #94a3b8)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              padding: "4px",
              flexShrink: 0,
            }}
          >
            <Icon size={20} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.02em",
                textAlign: "center",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "54px",
              }}
            >
              {cat.shortLabel}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
