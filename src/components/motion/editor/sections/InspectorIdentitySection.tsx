import React, { useRef, useState } from "react";
import { Shield, Upload, Wand2, RotateCcw, Tag, Sun } from "lucide-react";
import type { MotionConfig, LogoPosition, SectorLayout, BadgeType } from "../../../../motion/types";
import { removeWhiteBackground } from "../../../../images/removeWhiteBackground";
import { uploadMediaFile, databaseConfigured } from "../../../../supabase";

export interface InspectorIdentitySectionProps {
  config: MotionConfig;
  onChange: (updater: (prev: MotionConfig) => MotionConfig) => void;
  onReplay: () => void;
  sector?: string;
}

export const InspectorIdentitySection: React.FC<InspectorIdentitySectionProps> = ({
  config,
  onChange,
  onReplay,
  sector = "acougue",
}) => {
  const logoFileRef = useRef<HTMLInputElement>(null);
  const badgeFileRef = useRef<HTMLInputElement>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  const logo = config.logo || {
    position: "top-left" as LogoPosition,
    size: 68,
    sectorText: "AÇOUGUE",
    sectorTextColor: "#f2c94c",
    sectorTextSize: 13,
    sectorLayout: "column" as SectorLayout,
    visible: true,
  };

  const badge = config.badge || {
    type: "text" as BadgeType,
    text: "OFERTA",
    size: 70,
    rotation: 3.5,
    background: "#e21b2d",
    color: "#ffffff",
    visible: true,
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (databaseConfigured) {
      try {
        const res = await uploadMediaFile(file, sector);
        onChange((prev) => ({
          ...prev,
          logo: {
            ...(prev.logo || logo),
            image: res.publicUrl,
            originalImage: res.publicUrl,
          },
        }));
        onReplay();
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          onChange((prev) => ({
            ...prev,
            logo: {
              ...(prev.logo || logo),
              image: res,
              originalImage: res,
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
          logo: {
            ...(prev.logo || logo),
            image: res,
            originalImage: res,
          },
        }));
        onReplay();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogoBg = async () => {
    if (!logo.image) return;
    setIsProcessingLogo(true);
    try {
      const blob = await removeWhiteBackground(logo.originalImage || logo.image, 30);
      const transparentPreviewUrl = URL.createObjectURL(blob);
      onChange((prev) => ({
        ...prev,
        logo: {
          ...(prev.logo || logo),
          image: transparentPreviewUrl,
        },
      }));
      onReplay();
    } catch (err) {
      console.error("Erro ao remover fundo da logo:", err);
    } finally {
      setIsProcessingLogo(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. LOGO & BRANDING */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--skalee-purple-light, #c084fc)",
          }}
        >
          Logo do Supermercado
        </span>

        {/* Position */}
        <div>
          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Posição da Logo
            <select
              className="admin-input"
              value={logo.position || "top-left"}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  logo: { ...(prev.logo || logo), position: e.target.value as LogoPosition },
                }));
                onReplay();
              }}
              style={{ width: "100%", marginTop: "4px" }}
            >
              <option value="top-left">Topo Esquerdo (Padrão)</option>
              <option value="top-center">Topo Centralizado</option>
              <option value="top-right">Topo Direito</option>
              <option value="bottom-left">Rodapé Esquerdo</option>
            </select>
          </label>
        </div>

        {/* Size Slider */}
        <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
          Tamanho da Logo: <strong>{logo.size || 68}px</strong>
          <input
            type="range"
            min="36"
            max="180"
            step="2"
            value={logo.size || 68}
            onChange={(e) => {
              onChange((prev) => ({
                ...prev,
                logo: { ...(prev.logo || logo), size: Number(e.target.value) },
              }));
            }}
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>

        {/* Custom Logo Image & Upload */}
        <div>
          <input
            ref={logoFileRef}
            type="file"
            accept="image/*"
            onChange={handleUploadLogo}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => logoFileRef.current?.click()}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "11.5px" }}
            >
              <Upload size={13} />
              Enviar Logo Customizada
            </button>
            {logo.image && (
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={isProcessingLogo}
                onClick={handleRemoveLogoBg}
                title="Remover fundo branco da logo"
                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px" }}
              >
                <Wand2 size={13} style={{ color: "var(--skalee-purple-light, #c084fc)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Sector Label */}
        <div>
          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Texto do Setor / Subtítulo da Logo
            <input
              type="text"
              className="admin-input"
              value={logo.sectorText || ""}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  logo: { ...(prev.logo || logo), sectorText: e.target.value },
                }));
              }}
              placeholder="Ex: AÇOUGUE"
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
        </div>
      </div>

      {/* 2. BADGE & SELO PROMOCIONAL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--skalee-purple-light, #c084fc)",
          }}
        >
          Selo / Badge Promocional
        </span>

        {/* Badge Text */}
        <div>
          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Texto do Selo
            <input
              type="text"
              className="admin-input"
              value={badge.text || ""}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  badge: { ...(prev.badge || badge), text: e.target.value },
                }));
              }}
              placeholder="Ex: OFERTA, BLACK FRIDAY"
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
        </div>

        {/* Colors & Rotation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Cor do Selo
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <input
                type="color"
                value={badge.background || "#e21b2d"}
                onChange={(e) => {
                  onChange((prev) => ({
                    ...prev,
                    badge: { ...(prev.badge || badge), background: e.target.value },
                  }));
                }}
                style={{ width: "36px", height: "32px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
              />
              <input
                type="text"
                className="admin-input"
                value={badge.background || "#e21b2d"}
                onChange={(e) => {
                  onChange((prev) => ({
                    ...prev,
                    badge: { ...(prev.badge || badge), background: e.target.value },
                  }));
                }}
                style={{ flex: 1, fontSize: "11px" }}
              />
            </div>
          </label>

          <label style={{ fontSize: "11.5px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
            Inclinação: <strong>{badge.rotation || 0}°</strong>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={badge.rotation || 0}
              onChange={(e) => {
                onChange((prev) => ({
                  ...prev,
                  badge: { ...(prev.badge || badge), rotation: Number(e.target.value) },
                }));
              }}
              style={{ width: "100%", marginTop: "4px" }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
