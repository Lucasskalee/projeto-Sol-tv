import React from "react";
import {
  LayoutGrid,
  Palette,
  Image as ImageIcon,
  Type,
  DollarSign,
  Sparkles,
  Flame,
  Play,
  Layers,
  Sliders,
} from "lucide-react";

export type MotionCategory =
  | "layout"
  | "fundo"
  | "produto"
  | "texto"
  | "preco"
  | "marca"
  | "efeitos"
  | "motion"
  | "presets"
  | "avancado";

export interface CategoryItem {
  id: MotionCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const MOTION_CATEGORIES: CategoryItem[] = [
  {
    id: "layout",
    label: "Layout",
    icon: <LayoutGrid size={14} />,
    description: "Composição, grades e posições",
  },
  {
    id: "fundo",
    label: "Fundo",
    icon: <Palette size={14} />,
    description: "Cores, gradientes, sunburst e iluminação",
  },
  {
    id: "produto",
    label: "Produto",
    icon: <ImageIcon size={14} />,
    description: "Card, fotos, proporção e escala",
  },
  {
    id: "texto",
    label: "Texto",
    icon: <Type size={14} />,
    description: "Tipografia, nomes, cores e slogan",
  },
  {
    id: "preco",
    label: "Preço",
    icon: <DollarSign size={14} />,
    description: "Valores, impacto, selos e tags",
  },
  {
    id: "marca",
    label: "Marca",
    icon: <Sparkles size={14} />,
    description: "Logo, setor e identidade da loja",
  },
  {
    id: "efeitos",
    label: "Efeitos",
    icon: <Flame size={14} />,
    description: "Faíscas de fogo, partículas e brilho",
  },
  {
    id: "motion",
    label: "Motion",
    icon: <Play size={14} />,
    description: "Velocidade, coreografia e transições",
  },
  {
    id: "presets",
    label: "Presets",
    icon: <Layers size={14} />,
    description: "Biblioteca de estilos e temas",
  },
  {
    id: "avancado",
    label: "Avançado",
    icon: <Sliders size={14} />,
    description: "Ajuste fino, visibilidade e exportar",
  },
];

export interface MotionCategoryBarProps {
  activeCategory: MotionCategory;
  onSelectCategory: (category: MotionCategory) => void;
}

export function MotionCategoryBar({
  activeCategory,
  onSelectCategory,
}: MotionCategoryBarProps) {
  return (
    <nav className="motion-category-bar" aria-label="Categorias de customização do Motion Studio">
      <div className="motion-category-scroll-wrapper">
        {MOTION_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-pill-btn ${isActive ? "active" : ""}`}
              onClick={() => onSelectCategory(cat.id)}
              title={`${cat.label}: ${cat.description}`}
            >
              <span className="category-pill-icon">{cat.icon}</span>
              <span className="category-pill-label">{cat.label}</span>
              {isActive && <span className="category-active-indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

