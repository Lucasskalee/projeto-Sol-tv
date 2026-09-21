import React, { useRef } from "react";
import { Sun, Image as ImageIcon, Sparkles, Upload, RotateCcw } from "lucide-react";
import type { MotionConfig, BackgroundType, MotionSunburstConfig } from "../../../../motion/types";
import { uploadMediaFile, databaseConfigured } from "../../../../supabase";

export interface InspectorBackgroundSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay?: () => void;
  sector?: string;
}

const GRADIENT_PRESETS = [
  { label: "Black Friday Luxo", start: "#1a0407", end: "#050608", angle: 135 },
  { label: "Vinho & Escuro", start: "#300508", end: "#0d0203", angle: 145 },
  { label: "Dourado & Carvão", start: "#1f1807", end: "#06070a", angle: 135 },
  { label: "Minimalista Escuro", start: "#181b22", end: "#090b0e", angle: 180 },
  { label: "Azul Noturno", start: "#081426", end: "#03070d", angle: 135 },
  { label: "Verde Esmeralda", start: "#051c10", end: "#020a06", angle: 135 },
];

const SUNBURST_PRESETS = [
  { label: "Ouro & Laranja Sol", primary: "#FFB800", secondary: "#FF6600" },
  { label: "Fogo & Vermelho", primary: "#FF3300", secondary: "#990000" },
  { label: "Dourado & Preto", primary: "#D4AF37", secondary: "#111111" },
  { label: "Amarelo Vibrante", primary: "#FACC15", secondary: "#CA8A04" },
  { label: "Púrpura Skalee", primary: "#A855F7", secondary: "#581C87" },
];

export const InspectorBackgroundSection: React.FC<InspectorBackgroundSectionProps> = ({
  config,
  onChange,
  onReplay,
  sector = "acougue",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bg = config.background || { type: "gradient" as BackgroundType };
  const sunburst: MotionSunburstConfig = bg.sunburst || {
    primaryColor: "#FFB800",
    secondaryColor: "#FF6600",
    speed: 60,
    raysCount: 24,
    scale: 1.5,
    glowPulse: true,
  };

  const handleUploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (databaseConfigured) {
      try {
        const res = await uploadMediaFile(file, sector);
        onChange((prev) => ({
          ...prev,
          background: {
            ...(prev.background || { type: "image" }),
            type: "image",
            imageUrl: res.publicUrl,
          },
        }));
      } catch {
        // Fallback local reader
        const reader = new FileReader();
        reader.onload = () => {
          onChange((prev) => ({
            ...prev,
            background: {
              ...(prev.background || { type: "image" }),
              type: "image",
              imageUrl: reader.result as string,
            },
          }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        onChange((prev) => ({
          ...prev,
          background: {
            ...(prev.background || { type: "image" }),
            type: "image",
            imageUrl: reader.result as string,
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Background Type Switcher */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--skalee-text-secondary, #94a3b8)",
            marginBottom: "8px",
          }}
        >
          Tipo de Fundo
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {[
            { id: "solid" as BackgroundType, label: "Sólido" },
            { id: "gradient" as BackgroundType, label: "Gradiente" },
            { id: "sunburst" as BackgroundType, label: "Sunburst" },
            { id: "image" as BackgroundType, label: "Imagem" },
          ].map((t) => {
            const isSelected = bg.type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChange((prev) => ({
                    ...prev,
                    background: {
                      ...(prev.background || {}),
                      type: t.id,
                      color: prev.background?.color || "#0b0e14",
                      gradientStart: prev.background?.gradientStart || "#141822",
                      gradientEnd: prev.background?.gradientEnd || "#07090c",
                      gradientAngle: prev.background?.gradientAngle || 150,
                      sunburst: prev.background?.sunburst || { ...sunburst },
                    },
                  }));
                }}
                style={{
                  padding: "8px 4px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? "var(--skalee-purple, #a855f7)" : "rgba(255, 255, 255, 0.04)",
                  border: isSelected ? "1px solid var(--skalee-purple-light, #c084fc)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "#fff" : "var(--skalee-text-secondary, #94a3b8)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SOLID CONTROLS */}
      {bg.type === "solid" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Cor Sólida do Fundo
            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              <input
                type="color"
                value={bg.color || "#0b0e14"}
                onChange={(e) => {
                  onChange((prev) => ({
                    ...prev,
                    background: { ...(prev.background || { type: "solid" }), color: e.target.value },
                  }));
                }}
                style={{ width: "44px", height: "38px", padding: 0, border: "none", borderRadius: "6px", cursor: "pointer" }}
              />
              <input
                type="text"
                className="admin-input"
                value={bg.color || "#0b0e14"}
                onChange={(e) => {
                  onChange((prev) => ({
                    ...prev,
                    background: { ...(prev.background || { type: "solid" }), color: e.target.value },
                  }));
                }}
                style={{ flex: 1 }}
              />
            </div>
          </label>
        </div>
      )}

      {/* 3. GRADIENT CONTROLS */}
      {bg.type === "gradient" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
              Cor Inicial
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <input
                  type="color"
                  value={bg.gradientStart || "#141822"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: { ...(prev.background || { type: "gradient" }), gradientStart: e.target.value },
                    }));
                  }}
                  style={{ width: "38px", height: "34px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                />
                <input
                  type="text"
                  className="admin-input"
                  value={bg.gradientStart || "#141822"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: { ...(prev.background || { type: "gradient" }), gradientStart: e.target.value },
                    }));
                  }}
                  style={{ flex: 1, fontSize: "11px" }}
                />
              </div>
            </label>

            <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
              Cor Final
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <input
                  type="color"
                  value={bg.gradientEnd || "#07090c"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: { ...(prev.background || { type: "gradient" }), gradientEnd: e.target.value },
                    }));
                  }}
                  style={{ width: "38px", height: "34px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                />
                <input
                  type="text"
                  className="admin-input"
                  value={bg.gradientEnd || "#07090c"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: { ...(prev.background || { type: "gradient" }), gradientEnd: e.target.value },
                    }));
                  }}
                  style={{ flex: 1, fontSize: "11px" }}
                />
              </div>
            </label>
          </div>

          <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Ângulo do Gradiente: <strong>{bg.gradientAngle || 150}°</strong>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={bg.gradientAngle || 150}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  background: { ...(prev.background || { type: "gradient" }), gradientAngle: Number(e.target.value) },
                }));
              }}
              style={{ width: "100%", marginTop: "6px" }}
            />
          </label>

          {/* Gradient Presets */}
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--skalee-text-secondary, #94a3b8)", textTransform: "uppercase" }}>
              Paletas Rápidas de Gradiente
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
              {GRADIENT_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange((prev) => ({
                      ...prev,
                      background: {
                        ...(prev.background || { type: "gradient" }),
                        gradientStart: p.start,
                        gradientEnd: p.end,
                        gradientAngle: p.angle,
                      },
                    }));
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "var(--skalee-text-primary, #f8fafc)",
                    cursor: "pointer",
                    fontSize: "11px",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      background: `linear-gradient(${p.angle}deg, ${p.start}, ${p.end})`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUNBURST CONTROLS */}
      {bg.type === "sunburst" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(255, 184, 0, 0.1)",
              border: "1px solid rgba(255, 184, 0, 0.25)",
              fontSize: "12px",
              color: "#fbbf24",
            }}
          >
            <strong>Fundo Sunburst:</strong> Efeito procedural de raios solares giratórios em alta definição para alto impacto promocional.
          </div>

          {/* Color pair */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
              Cor Primária
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <input
                  type="color"
                  value={sunburst.primaryColor || "#FFB800"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: {
                        ...(prev.background || { type: "sunburst" }),
                        sunburst: { ...(prev.background?.sunburst || sunburst), primaryColor: e.target.value },
                      },
                    }));
                  }}
                  style={{ width: "38px", height: "34px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                />
                <input
                  type="text"
                  className="admin-input"
                  value={sunburst.primaryColor || "#FFB800"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: {
                        ...(prev.background || { type: "sunburst" }),
                        sunburst: { ...(prev.background?.sunburst || sunburst), primaryColor: e.target.value },
                      },
                    }));
                  }}
                  style={{ flex: 1, fontSize: "11px" }}
                />
              </div>
            </label>

            <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
              Cor Secundária
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <input
                  type="color"
                  value={sunburst.secondaryColor || "#FF6600"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: {
                        ...(prev.background || { type: "sunburst" }),
                        sunburst: { ...(prev.background?.sunburst || sunburst), secondaryColor: e.target.value },
                      },
                    }));
                  }}
                  style={{ width: "38px", height: "34px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                />
                <input
                  type="text"
                  className="admin-input"
                  value={sunburst.secondaryColor || "#FF6600"}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      background: {
                        ...(prev.background || { type: "sunburst" }),
                        sunburst: { ...(prev.background?.sunburst || sunburst), secondaryColor: e.target.value },
                      },
                    }));
                  }}
                  style={{ flex: 1, fontSize: "11px" }}
                />
              </div>
            </label>
          </div>

          {/* Sunburst Presets */}
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--skalee-text-secondary, #94a3b8)", textTransform: "uppercase" }}>
              Combinações de Cores Sunburst
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
              {SUNBURST_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange((prev) => ({
                      ...prev,
                      background: {
                        ...(prev.background || { type: "sunburst" }),
                        sunburst: {
                          ...(prev.background?.sunburst || sunburst),
                          primaryColor: p.primary,
                          secondaryColor: p.secondary,
                        },
                      },
                    }));
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "var(--skalee-text-primary, #f8fafc)",
                    cursor: "pointer",
                    fontSize: "11px",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: `conic-gradient(${p.primary} 0deg 30deg, ${p.secondary} 30deg 60deg, ${p.primary} 60deg 90deg, ${p.secondary} 90deg 120deg)`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Velocidade de Rotação: <strong>{sunburst.speed}s por volta</strong>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={sunburst.speed}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  background: {
                    ...(prev.background || { type: "sunburst" }),
                    sunburst: { ...(prev.background?.sunburst || sunburst), speed: Number(e.target.value) },
                  },
                }));
              }}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>

          {/* Rays Count */}
          <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Quantidade de Raios: <strong>{sunburst.raysCount} raios</strong>
            <input
              type="range"
              min="8"
              max="48"
              step="4"
              value={sunburst.raysCount}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  background: {
                    ...(prev.background || { type: "sunburst" }),
                    sunburst: { ...(prev.background?.sunburst || sunburst), raysCount: Number(e.target.value) },
                  },
                }));
              }}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>

          {/* Scale */}
          <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Escala / Zoom dos Raios: <strong>{sunburst.scale}x</strong>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={sunburst.scale}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  background: {
                    ...(prev.background || { type: "sunburst" }),
                    sunburst: { ...(prev.background?.sunburst || sunburst), scale: Number(e.target.value) },
                  },
                }));
              }}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>

          {/* Glow Pulse */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={sunburst.glowPulse !== false}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  background: {
                    ...(prev.background || { type: "sunburst" }),
                    sunburst: { ...(prev.background?.sunburst || sunburst), glowPulse: e.target.checked },
                  },
                }));
              }}
            />
            <span>Ativar Pulso & Brilho Central</span>
          </label>
        </div>
      )}

      {/* 5. IMAGE CONTROLS */}
      {bg.type === "image" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            URL da Imagem de Fundo
            <input
              type="text"
              className="admin-input"
              value={bg.imageUrl || ""}
              placeholder="https://exemplo.com/fundo.jpg"
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  background: { ...(prev.background || { type: "image" }), imageUrl: e.target.value },
                }));
              }}
              style={{ width: "100%", marginTop: "6px" }}
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadBgImage}
            style={{ display: "none" }}
          />

          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            <Upload size={14} />
            Fazer Upload de Fundo
          </button>
        </div>
      )}
    </div>
  );
};
