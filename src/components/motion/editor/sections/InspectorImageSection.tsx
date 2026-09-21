import React, { useRef, useState } from "react";
import { Upload, Wand2, RotateCcw } from "lucide-react";
import type {
  MotionConfig,
  MotionBlackFridayImageConfig,
  BlackFridayEntryAnimationPreset,
  BlackFridayIdleAnimationPreset,
} from "../../../../motion/types";
import { removeWhiteBackground } from "../../../../images/removeWhiteBackground";
import { uploadMediaFile, databaseConfigured } from "../../../../supabase";

export interface InspectorImageSectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
  sector?: string;
}

export const InspectorImageSection: React.FC<InspectorImageSectionProps> = ({
  config,
  onChange,
  onReplay,
  sector = "acougue",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const imgConfig: MotionBlackFridayImageConfig = config.blackFridayImage || {
    visible: false,
    src: "",
    scale: 1,
    x: 82,
    y: 6,
    opacity: 100,
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (databaseConfigured) {
      try {
        const res = await uploadMediaFile(file, sector);
        onChange((prev) => ({
          ...prev,
          blackFridayImage: {
            ...(prev.blackFridayImage || imgConfig),
            visible: true,
            src: res.publicUrl,
            originalSrc: res.publicUrl,
          },
        }));
        onReplay();
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          onChange((prev) => ({
            ...prev,
            blackFridayImage: {
              ...(prev.blackFridayImage || imgConfig),
              visible: true,
              src: res,
              originalSrc: res,
            },
          }));
          onReplay();
        };
        reader.readAsDataURL(file);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        onChange((prev) => ({
          ...prev,
          blackFridayImage: {
            ...(prev.blackFridayImage || imgConfig),
            visible: true,
            src: res,
            originalSrc: res,
          },
        }));
        onReplay();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveWhiteBg = async () => {
    if (!imgConfig.src) return;
    setIsProcessingBg(true);
    try {
      const blob = await removeWhiteBackground(imgConfig.originalSrc || imgConfig.src, 30);
      const transparentPreviewUrl = URL.createObjectURL(blob);
      onChange((prev) => ({
        ...prev,
        blackFridayImage: {
          ...(prev.blackFridayImage || imgConfig),
          src: transparentPreviewUrl,
        },
      }));
      onReplay();
    } catch (err) {
      console.error("Erro ao remover fundo:", err);
    } finally {
      setIsProcessingBg(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (!imgConfig.originalSrc) return;
    onChange((prev) => ({
      ...prev,
      blackFridayImage: {
        ...(prev.blackFridayImage || imgConfig),
        src: imgConfig.originalSrc,
      },
    }));
    onReplay();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* 1. Toggle Black Friday / Campaign Special Image */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          fontWeight: 700,
          color: "#fff",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={imgConfig.visible !== false}
          onChange={(e) => {
            onChange((prev) => ({
              ...prev,
              blackFridayImage: {
                ...(prev.blackFridayImage || imgConfig),
                visible: e.target.checked,
              },
            }));
            onReplay();
          }}
        />
        <span>Ativar Imagem Temática Especial (Ex: Black Friday)</span>
      </label>

      {/* 2. Image Source & Upload */}
      <div>
        <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          URL da Imagem
          <input
            type="text"
            className="admin-input"
            value={imgConfig.src || ""}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                blackFridayImage: {
                  ...(prev.blackFridayImage || imgConfig),
                  src: e.target.value,
                  originalSrc: e.target.value,
                },
              }));
              onReplay();
            }}
            placeholder="https://exemplo.com/imagem-tematica.png"
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadImage}
          style={{ display: "none" }}
        />

        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px" }}
          >
            <Upload size={14} />
            Fazer Upload
          </button>

          {imgConfig.src && (
            <>
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={isProcessingBg}
                onClick={handleRemoveWhiteBg}
                title="Remover fundo branco da imagem automaticamente"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <Wand2 size={14} style={{ color: "var(--skalee-purple-light, #c084fc)" }} />
                {isProcessingBg ? "Removendo..." : "Remover Fundo Branco"}
              </button>

              {imgConfig.originalSrc && imgConfig.originalSrc !== imgConfig.src && (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={handleRestoreOriginal}
                  title="Restaurar imagem original com fundo"
                  style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. Size & Opacity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Escala: <strong>{Math.round((imgConfig.scale || 1) * 100)}%</strong>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.05"
            value={imgConfig.scale || 1}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                blackFridayImage: {
                  ...(prev.blackFridayImage || imgConfig),
                  scale: Number(e.target.value),
                },
              }));
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>

        <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Opacidade: <strong>{imgConfig.opacity || 100}%</strong>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={imgConfig.opacity || 100}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                blackFridayImage: {
                  ...(prev.blackFridayImage || imgConfig),
                  opacity: Number(e.target.value),
                },
              }));
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
      </div>

      {/* 4. Animation Presets */}
      <div>
        <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Animação de Entrada
          <select
            className="admin-input"
            value={imgConfig.animation?.entryPreset || "fade-in"}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                blackFridayImage: {
                  ...(prev.blackFridayImage || imgConfig),
                  animation: {
                    ...(prev.blackFridayImage?.animation || {}),
                    entryPreset: e.target.value as BlackFridayEntryAnimationPreset,
                  },
                },
              }));
              onReplay();
            }}
            style={{ width: "100%", marginTop: "4px" }}
          >
            <option value="none">Nenhum</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-in">Deslizar</option>
            <option value="zoom-in">Zoom In</option>
            <option value="bounce">Bounce</option>
          </select>
        </label>
      </div>

      <div>
        <label style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Movimento Contínuo (Idle)
          <select
            className="admin-input"
            value={imgConfig.animation?.idlePreset || "float"}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                blackFridayImage: {
                  ...(prev.blackFridayImage || imgConfig),
                  animation: {
                    ...(prev.blackFridayImage?.animation || {}),
                    idlePreset: e.target.value as BlackFridayIdleAnimationPreset,
                  },
                },
              }));
              onReplay();
            }}
            style={{ width: "100%", marginTop: "4px" }}
          >
            <option value="none">Nenhum (Estático)</option>
            <option value="float">Flutuar Suave</option>
            <option value="pulse">Pulso de Destaque</option>
            <option value="rotate-smooth">Rotação Suave</option>
            <option value="shake">Vibração Rápida</option>
            <option value="flip">Giro 3D</option>
            <option value="neon">Brilho Neon</option>
          </select>
        </label>
      </div>

      {/* 5. Positions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Posição X (%): <strong>{imgConfig.x ?? 82}%</strong>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={imgConfig.x ?? 82}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                blackFridayImage: {
                  ...(prev.blackFridayImage || imgConfig),
                  x: Number(e.target.value),
                },
              }));
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>

        <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Posição Y (%): <strong>{imgConfig.y ?? 6}%</strong>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={imgConfig.y ?? 6}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                blackFridayImage: {
                  ...(prev.blackFridayImage || imgConfig),
                  y: Number(e.target.value),
                },
              }));
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
      </div>
    </div>
  );
};
