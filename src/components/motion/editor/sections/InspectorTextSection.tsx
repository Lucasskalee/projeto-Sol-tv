import React from "react";
import { Type, Sparkles } from "lucide-react";
import type { MotionConfig } from "../../../../motion/types";

export interface InspectorTextSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay?: () => void;
}

export const InspectorTextSection: React.FC<InspectorTextSectionProps> = ({
  config,
  onChange,
}) => {
  const sub = config.subtitle || {
    text: "Qualidade para o seu dia.",
    fontSize: 40,
    offsetX: 0,
    offsetY: 0,
    color: "#111111",
    visible: true,
    showBrush: true,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* 1. Slogan / Subtitle Text */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--skalee-text-secondary, #94a3b8)",
            marginBottom: "6px",
          }}
        >
          Texto do Slogan / Subtítulo
        </label>
        <input
          type="text"
          className="admin-input"
          value={sub.text || ""}
          onChange={(e) => {
            onChange((prev) => ({
              ...prev,
              subtitle: { ...(prev.subtitle || sub), text: e.target.value },
            }));
          }}
          placeholder="Ex: Qualidade para o seu dia."
          style={{ width: "100%" }}
        />
      </div>

      {/* 2. Font Size */}
      <div>
        <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Tamanho da Fonte: <strong>{sub.fontSize || 40}px</strong>
          <input
            type="range"
            min="20"
            max="72"
            step="2"
            value={sub.fontSize || 40}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                subtitle: { ...(prev.subtitle || sub), fontSize: Number(e.target.value) },
              }));
            }}
            style={{ width: "100%", marginTop: "6px" }}
          />
        </label>
      </div>

      {/* 3. Color */}
      <div>
        <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Cor do Texto do Slogan
          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            <input
              type="color"
              value={sub.color || "#111111"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  subtitle: { ...(prev.subtitle || sub), color: e.target.value },
                }));
              }}
              style={{ width: "38px", height: "34px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
            />
            <input
              type="text"
              className="admin-input"
              value={sub.color || "#111111"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  subtitle: { ...(prev.subtitle || sub), color: e.target.value },
                }));
              }}
              style={{ flex: 1 }}
            />
          </div>
        </label>
      </div>

      {/* 4. Brush Effect & Visibility */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#fff", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={sub.showBrush !== false}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                subtitle: { ...(prev.subtitle || sub), showBrush: e.target.checked },
              }));
            }}
          />
          <span>Exibir Efeito de Pincelada Sob o Slogan</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#fff", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={sub.visible !== false}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                subtitle: { ...(prev.subtitle || sub), visible: e.target.checked },
              }));
            }}
          />
          <span>Exibir Slogan na Apresentação</span>
        </label>
      </div>

      {/* 5. Offsets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Deslocamento X: <strong>{sub.offsetX || 0}px</strong>
          <input
            type="range"
            min="-600"
            max="600"
            step="5"
            value={sub.offsetX || 0}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                subtitle: { ...(prev.subtitle || sub), offsetX: Number(e.target.value) },
              }));
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>

        <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Deslocamento Y: <strong>{sub.offsetY || 0}px</strong>
          <input
            type="range"
            min="-600"
            max="600"
            step="5"
            value={sub.offsetY || 0}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                subtitle: { ...(prev.subtitle || sub), offsetY: Number(e.target.value) },
              }));
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
      </div>
    </div>
  );
};
