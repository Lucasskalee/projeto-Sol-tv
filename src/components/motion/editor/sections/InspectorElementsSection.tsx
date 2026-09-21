import React from "react";
import { Check, X } from "lucide-react";
import type { MotionConfig, VisualElementsVisibility } from "../../../../motion/types";

export interface InspectorElementsSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay?: () => void;
}

export const InspectorElementsSection: React.FC<InspectorElementsSectionProps> = ({
  config,
  onChange,
}) => {
  const vis: VisualElementsVisibility = config.visibility || {};

  const toggleElement = (key: keyof VisualElementsVisibility) => {
    onChange((prev) => {
      const current = prev.visibility || {};
      const currentVal = current[key] !== false; // default true
      return {
        ...prev,
        visibility: {
          ...current,
          [key]: !currentVal,
        },
      };
    });
  };

  const sections = [
    {
      title: "Elementos Essenciais",
      items: [
        { key: "logo" as const, label: "Logo & Identidade da Loja", defaultVal: true },
        { key: "productName" as const, label: "Nome do Produto", defaultVal: true },
        { key: "productImage" as const, label: "Foto do Produto", defaultVal: true },
        { key: "productPrice" as const, label: "Preço Promocional", defaultVal: true },
        { key: "unit" as const, label: "Unidade de Medida (KG/UN)", defaultVal: true },
      ],
    },
    {
      title: "Comerciais & Oferta",
      items: [
        { key: "oldPrice" as const, label: "Preço Normal / 'De' Risco", defaultVal: true },
        { key: "badge" as const, label: "Selo / Badge Promocional", defaultVal: true },
        { key: "slogan" as const, label: "Slogan / Subtítulo Institucional", defaultVal: true },
      ],
    },
    {
      title: "Decorações & Efeitos Especiais",
      items: [
        { key: "decorations" as const, label: "Molduras & Cantoneiras", defaultVal: true },
        { key: "fireSparks" as const, label: "Faíscas & Chamas Dinâmicas", defaultVal: true },
        { key: "blackFridayImage" as const, label: "Imagem Temática Especial", defaultVal: true },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <p style={{ margin: 0, fontSize: "12.5px", color: "var(--skalee-text-secondary, #94a3b8)", lineHeight: 1.4 }}>
        Ative ou desative elementos visuais exibidos nas telas de apresentação deste setor.
      </p>

      {sections.map((sec, idx) => (
        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--skalee-purple-light, #c084fc)",
            }}
          >
            {sec.title}
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {sec.items.map((item) => {
              const isVisible = vis[item.key] !== false;
              return (
                <div
                  key={item.key}
                  onClick={() => toggleElement(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: isVisible ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.2)",
                    border: isVisible ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.04)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: isVisible ? "#fff" : "var(--skalee-text-secondary, #94a3b8)",
                      opacity: isVisible ? 1 : 0.6,
                      textDecoration: isVisible ? "none" : "line-through",
                    }}
                  >
                    {item.label}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "22px",
                      height: "22px",
                      borderRadius: "6px",
                      background: isVisible ? "var(--skalee-purple, #a855f7)" : "rgba(255, 255, 255, 0.05)",
                      color: isVisible ? "#fff" : "rgba(255, 255, 255, 0.3)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isVisible ? <Check size={13} strokeWidth={3} /> : <X size={13} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
