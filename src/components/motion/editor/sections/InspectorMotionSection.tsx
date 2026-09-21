import React from "react";
import { Sparkles, Flame, Play, Wind, Layers } from "lucide-react";
import type {
  MotionConfig,
  ElementAnimationConfig,
  EntranceChoreography,
  ProductNameAnimation,
  ProductPriceAnimation,
  ProductImageAnimation,
  MotionFireSparksConfig,
  FireSparksIntensity,
  FireSparksPerformance,
} from "../../../../motion/types";

export interface InspectorMotionSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
}

export const InspectorMotionSection: React.FC<InspectorMotionSectionProps> = ({
  config,
  onChange,
  onReplay,
}) => {
  const elemAnim: ElementAnimationConfig = config.elementAnimations || {
    nameAnimation: "slide-up",
    priceAnimation: "impact",
    imageAnimation: "float",
    choreography: "staggered",
  };

  const sparks: MotionFireSparksConfig = config.fx?.fireSparks || {
    enabled: true,
    intensity: "commercial",
    particleCount: 26,
    speed: 1,
    size: 1,
    bottomGlow: true,
    bottomGlowOpacity: 25,
    maxHeight: 105,
    performance: "normal",
  };

  const paint = config.paintSwipe || {
    direction: "left-to-right",
    colorMode: "dual",
    speed: "normal",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* 1. Element Entrance Choreography */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--skalee-purple-light, #c084fc)",
          }}
        >
          Coreografia de Entrada dos Elementos
        </span>

        <div>
          <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Sequência / Timing
            <select
              className="admin-input"
              value={elemAnim.choreography || "staggered"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  elementAnimations: {
                    ...(prev.elementAnimations || elemAnim),
                    choreography: e.target.value as EntranceChoreography,
                  },
                }));
                onReplay();
              }}
              style={{ width: "100%", marginTop: "4px" }}
            >
              <option value="staggered">Escalonada (Staggered: Produto → Título → Preço)</option>
              <option value="together">Simultânea (Todos ao mesmo tempo)</option>
              <option value="cascading">Cascata Rápida</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Animação do Título
            <select
              className="admin-input"
              value={elemAnim.nameAnimation || "slide-up"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  elementAnimations: {
                    ...(prev.elementAnimations || elemAnim),
                    nameAnimation: e.target.value as ProductNameAnimation,
                  },
                }));
                onReplay();
              }}
              style={{ width: "100%", marginTop: "4px", fontSize: "11.5px" }}
            >
              <option value="slide-up">Deslizar para Cima</option>
              <option value="fade-in">Fade In Suave</option>
              <option value="zoom-in">Zoom In</option>
              <option value="none">Nenhum</option>
            </select>
          </label>

          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Animação da Foto
            <select
              className="admin-input"
              value={elemAnim.imageAnimation || "float"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  elementAnimations: {
                    ...(prev.elementAnimations || elemAnim),
                    imageAnimation: e.target.value as ProductImageAnimation,
                  },
                }));
                onReplay();
              }}
              style={{ width: "100%", marginTop: "4px", fontSize: "11.5px" }}
            >
              <option value="float">Flutuação Contínua</option>
              <option value="pop">Pop com Zoom</option>
              <option value="slide">Deslizar Lateral</option>
              <option value="none">Estático</option>
            </select>
          </label>
        </div>
      </div>

      {/* 2. Paint Swipe Transition */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--skalee-purple-light, #c084fc)",
          }}
        >
          Transição Paint Swipe (Pincelada)
        </span>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Direção
            <select
              className="admin-input"
              value={paint.direction || "left-to-right"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  paintSwipe: {
                    ...(prev.paintSwipe || paint),
                    direction: e.target.value as any,
                  },
                }));
                onReplay();
              }}
              style={{ width: "100%", marginTop: "4px", fontSize: "11.5px" }}
            >
              <option value="left-to-right">Esquerda → Direita</option>
              <option value="right-to-left">Direita → Esquerda</option>
            </select>
          </label>

          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Cores da Tinta
            <select
              className="admin-input"
              value={paint.colorMode || "dual"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  paintSwipe: {
                    ...(prev.paintSwipe || paint),
                    colorMode: e.target.value as any,
                  },
                }));
                onReplay();
              }}
              style={{ width: "100%", marginTop: "4px", fontSize: "11.5px" }}
            >
              <option value="dual">Dupla (Preto + Vermelho)</option>
              <option value="red">Apenas Vermelho</option>
              <option value="black">Apenas Preto</option>
            </select>
          </label>
        </div>
      </div>

      {/* 3. FireSparks & Particles */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--skalee-purple-light, #c084fc)",
            }}
          >
            Faíscas & Chamas (FireSparks)
          </span>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#fff", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={sparks.enabled !== false}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  fx: {
                    ...(prev.fx || {}),
                    fireSparks: { ...(prev.fx?.fireSparks || sparks), enabled: e.target.checked },
                  },
                }));
                onReplay();
              }}
            />
            <span>Ativar</span>
          </label>
        </div>

        {sparks.enabled !== false && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
              Intensidade
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginTop: "4px" }}>
                {[
                  { id: "subtle" as FireSparksIntensity, label: "Suave" },
                  { id: "commercial" as FireSparksIntensity, label: "Comercial" },
                  { id: "fire-sale" as FireSparksIntensity, label: "Queima Total" },
                ].map((item) => {
                  const isSelected = (sparks.intensity || "commercial") === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onChange((prev) => ({
                          ...prev,
                          fx: {
                            ...(prev.fx || {}),
                            fireSparks: { ...(prev.fx?.fireSparks || sparks), intensity: item.id },
                          },
                        }));
                        onReplay();
                      }}
                      style={{
                        padding: "6px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: isSelected ? 700 : 500,
                        background: isSelected ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.03)",
                        border: isSelected ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.06)",
                        color: isSelected ? "#fca5a5" : "var(--skalee-text-secondary, #94a3b8)",
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
                Partículas: <strong>{sparks.particleCount || 26}</strong>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="2"
                  value={sparks.particleCount || 26}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      fx: {
                        ...(prev.fx || {}),
                        fireSparks: { ...(prev.fx?.fireSparks || sparks), particleCount: Number(e.target.value) },
                      },
                    }));
                  }}
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </label>

              <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
                Brilho da Base: <strong>{sparks.bottomGlowOpacity || 25}%</strong>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={sparks.bottomGlowOpacity || 25}
                  onChange={(e) => {
                    onChange((prev) => ({
                      ...prev,
                      fx: {
                        ...(prev.fx || {}),
                        fireSparks: { ...(prev.fx?.fireSparks || sparks), bottomGlowOpacity: Number(e.target.value) },
                      },
                    }));
                  }}
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
