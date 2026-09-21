import React, { useEffect } from "react";
import { AlertCircle, Check, X, Palette } from "lucide-react";
import type { ThemeDefinition } from "../../../themes/types";

export interface ThemeApplyConfirmationModalProps {
  theme: ThemeDefinition;
  sectorLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ThemeApplyConfirmationModal: React.FC<ThemeApplyConfirmationModalProps> = ({
  theme,
  sectorLabel,
  onConfirm,
  onClose,
}) => {
  const isBlackFriday = theme.slug === "black-friday";
  const friendlyName = isBlackFriday ? "Black Friday" : "Sol Premium";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
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
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="admin-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-confirm-title"
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--skalee-card-bg, #181424)",
          border: "1px solid var(--skalee-border, rgba(168, 85, 247, 0.3))",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
              <h3
                id="theme-confirm-title"
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--skalee-text-primary, #f8fafc)",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                Aplicar {friendlyName}?
              </h3>
              <span style={{ fontSize: "12px", color: "var(--skalee-text-secondary, #94a3b8)" }}>
                Confirmação de alteração na TV
              </span>
            </div>
          </div>

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
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              background: "rgba(168, 85, 247, 0.08)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              borderRadius: "10px",
              padding: "14px",
            }}
          >
            <AlertCircle
              size={20}
              style={{
                color: isBlackFriday ? "#f87171" : "var(--skalee-purple-light, #c084fc)",
                flexShrink: 0,
                marginTop: "2px",
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: "13.5px",
                lineHeight: 1.5,
                color: "var(--skalee-text-primary, #f8fafc)",
              }}
            >
              Este tema será aplicado <strong>imediatamente</strong> a todas as TVs conectadas ao setor{" "}
              <strong style={{ color: "var(--skalee-purple-light, #c084fc)" }}>{sectorLabel}</strong> em tempo real.
            </p>
          </div>

          <div
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "12.5px",
              color: "var(--skalee-text-secondary, #94a3b8)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Novo tema selecionado:</span>
            <strong style={{ color: "#fff" }}>{friendlyName}</strong>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
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
            Cancelar
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={onConfirm}
            style={{
              padding: "10px 22px",
              fontSize: "13px",
              fontWeight: 700,
              minHeight: "44px",
              background: isBlackFriday ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" : undefined,
              boxShadow: isBlackFriday ? "0 4px 14px rgba(239, 68, 68, 0.35)" : undefined,
            }}
          >
            <Check size={16} style={{ marginRight: "6px" }} />
            Aplicar Tema
          </button>
        </div>
      </div>
    </div>
  );
};

